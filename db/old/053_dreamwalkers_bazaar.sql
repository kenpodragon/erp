-- Migration 053: Dreamwalker's Bazaar (Player Marketplace)
-- Part of 3.5 — Economy & Monetization
-- Creates marketplace_listings, marketplace_trades, marketplace_notifications, marketplace_price_history
-- Alters players, player_artifacts, player_inventory
-- Seeds Bazaar Permits, marketplace titles, achievements, game_configs

BEGIN;

-- =============================================================================
-- 1. New Tables
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1a. marketplace_listings
-- -----------------------------------------------------------------------------
CREATE TABLE marketplace_listings (
    id              SERIAL PRIMARY KEY,
    seller_id       INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    buyer_id        INTEGER REFERENCES players(id) ON DELETE SET NULL,
    item_type       VARCHAR(20) NOT NULL,
    item_ref_id     INTEGER NOT NULL,
    item_name       VARCHAR(150) NOT NULL,
    item_rarity     VARCHAR(50) NOT NULL,
    item_stats      JSONB NOT NULL DEFAULT '{}',
    item_icon_key   VARCHAR(100),
    item_gear_slot  INTEGER REFERENCES gear_slots(id) ON DELETE SET NULL,
    is_curated      BOOLEAN NOT NULL DEFAULT FALSE,
    price_shards    INTEGER NOT NULL CHECK (price_shards >= 1),
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    listed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    sold_at         TIMESTAMPTZ,
    cancelled_at    TIMESTAMPTZ,
    expired_at      TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT marketplace_listings_status_check CHECK (status IN ('active', 'sold', 'expired', 'cancelled')),
    CONSTRAINT marketplace_listings_item_type_check CHECK (item_type IN ('artifact', 'equipment'))
);

CREATE INDEX idx_mpl_seller ON marketplace_listings (seller_id);
CREATE INDEX idx_mpl_status_expires ON marketplace_listings (status, expires_at) WHERE status = 'active';
CREATE INDEX idx_mpl_item_name_rarity ON marketplace_listings (item_name, item_rarity) WHERE status = 'active';
CREATE INDEX idx_mpl_price ON marketplace_listings (price_shards) WHERE status = 'active';
CREATE INDEX idx_mpl_buyer ON marketplace_listings (buyer_id) WHERE buyer_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 1b. marketplace_trades
-- -----------------------------------------------------------------------------
CREATE TABLE marketplace_trades (
    id              SERIAL PRIMARY KEY,
    listing_id      INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    buyer_id        INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    seller_id       INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    item_type       VARCHAR(20) NOT NULL,
    item_ref_id     INTEGER NOT NULL,
    item_name       VARCHAR(150) NOT NULL,
    item_rarity     VARCHAR(50) NOT NULL,
    price_shards    INTEGER NOT NULL,
    tax_shards      INTEGER NOT NULL DEFAULT 0,
    seller_proceeds INTEGER NOT NULL,
    claim_status    VARCHAR(20) NOT NULL DEFAULT 'claimed',
    traded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT marketplace_trades_claim_status_check CHECK (claim_status IN ('claimed', 'pending', 'discarded', 'reversed')),
    CONSTRAINT marketplace_trades_item_type_check CHECK (item_type IN ('artifact', 'equipment'))
);

CREATE INDEX idx_mpt_buyer ON marketplace_trades (buyer_id);
CREATE INDEX idx_mpt_seller ON marketplace_trades (seller_id);
CREATE INDEX idx_mpt_listing ON marketplace_trades (listing_id);
CREATE INDEX idx_mpt_pending_claim ON marketplace_trades (claim_status) WHERE claim_status = 'pending';
CREATE INDEX idx_mpt_traded_at ON marketplace_trades (traded_at);

-- -----------------------------------------------------------------------------
-- 1c. marketplace_notifications
-- -----------------------------------------------------------------------------
CREATE TABLE marketplace_notifications (
    id                  SERIAL PRIMARY KEY,
    player_id           INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    notification_type   VARCHAR(30) NOT NULL,
    title               VARCHAR(200) NOT NULL,
    message             TEXT NOT NULL,
    related_listing_id  INTEGER REFERENCES marketplace_listings(id) ON DELETE SET NULL,
    is_read             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at             TIMESTAMPTZ,
    CONSTRAINT marketplace_notifications_type_check CHECK (notification_type IN ('item_sold', 'listing_expired', 'listing_removed'))
);

CREATE INDEX idx_mpn_player_unread ON marketplace_notifications (player_id) WHERE is_read = FALSE;
CREATE INDEX idx_mpn_created ON marketplace_notifications (created_at);

-- -----------------------------------------------------------------------------
-- 1d. marketplace_price_history
-- -----------------------------------------------------------------------------
CREATE TABLE marketplace_price_history (
    id          SERIAL PRIMARY KEY,
    listing_id  INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    price       INTEGER NOT NULL,
    old_price   INTEGER,
    action      VARCHAR(20) NOT NULL,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT marketplace_price_history_action_check CHECK (action IN ('listed', 'adjusted'))
);

CREATE INDEX idx_mph_listing ON marketplace_price_history (listing_id);

-- =============================================================================
-- 2. ALTER Tables
-- =============================================================================

-- players — add marketplace_slots_purchased
ALTER TABLE players ADD COLUMN marketplace_slots_purchased INTEGER NOT NULL DEFAULT 0;

-- player_artifacts — add marketplace_listing_id FK
ALTER TABLE player_artifacts ADD COLUMN marketplace_listing_id INTEGER REFERENCES marketplace_listings(id) ON DELETE SET NULL;
CREATE INDEX idx_pa_marketplace ON player_artifacts(marketplace_listing_id) WHERE marketplace_listing_id IS NOT NULL;

-- player_inventory — add marketplace_listing_id FK
ALTER TABLE player_inventory ADD COLUMN marketplace_listing_id INTEGER REFERENCES marketplace_listings(id) ON DELETE SET NULL;
CREATE INDEX idx_pi_marketplace ON player_inventory(marketplace_listing_id) WHERE marketplace_listing_id IS NOT NULL;

-- =============================================================================
-- 3. Modify Trigger: enforce_inventory_slot_cap()
-- =============================================================================

CREATE OR REPLACE FUNCTION enforce_inventory_slot_cap()
RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE stored_count INTEGER;
BEGIN
    IF NEW.is_equipped = FALSE OR NEW.is_equipped IS NULL THEN
        SELECT COUNT(*) INTO stored_count FROM player_inventory
        WHERE character_id = NEW.character_id
          AND (is_equipped = FALSE OR is_equipped IS NULL)
          AND marketplace_listing_id IS NULL;
        IF stored_count >= 10 THEN
            RAISE EXCEPTION 'Inventory full: maximum 10 stored items per character.' USING ERRCODE = 'check_violation';
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

-- =============================================================================
-- 4. Widen CHECK Constraints
-- =============================================================================

-- shard_transactions.source_type — add 'marketplace_purchase', 'marketplace_sale'
ALTER TABLE shard_transactions DROP CONSTRAINT IF EXISTS shard_transactions_source_type_check;
ALTER TABLE shard_transactions ADD CONSTRAINT shard_transactions_source_type_check
    CHECK (source_type IN ('purchase', 'reward', 'spend', 'refund', 'admin_grant', 'admin_deduct', 'subscription_stipend', 'subscription_refund', 'shop_purchase', 'admin_refund', 'donation', 'achievement', 'dispute', 'dispute_reversal', 'marketplace_purchase', 'marketplace_sale'));

-- shop_items.category — add 'marketplace_permit'
ALTER TABLE shop_items DROP CONSTRAINT IF EXISTS shop_items_category_check;
ALTER TABLE shop_items ADD CONSTRAINT shop_items_category_check
    CHECK (category IN ('skin', 'flair', 'badge', 'avatar', 'booster', 'patron_badge', 'patron_flair', 'patron_avatar', 'marketplace_permit'));

-- =============================================================================
-- 5. Seed Data
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 5a. Bazaar Permit shop items (7 permits, doubling prices)
-- -----------------------------------------------------------------------------
INSERT INTO shop_items (item_key, name, description, category, price_shards, is_active, sort_order) VALUES
('bazaar_permit_1', 'Bazaar Permit — Slot 4',  'Unlock a 4th concurrent listing slot in the Dreamwalker''s Bazaar.',   'marketplace_permit', 200,   TRUE, 1000),
('bazaar_permit_2', 'Bazaar Permit — Slot 5',  'Unlock a 5th concurrent listing slot in the Dreamwalker''s Bazaar.',   'marketplace_permit', 400,   TRUE, 1001),
('bazaar_permit_3', 'Bazaar Permit — Slot 6',  'Unlock a 6th concurrent listing slot in the Dreamwalker''s Bazaar.',   'marketplace_permit', 800,   TRUE, 1002),
('bazaar_permit_4', 'Bazaar Permit — Slot 7',  'Unlock a 7th concurrent listing slot in the Dreamwalker''s Bazaar.',   'marketplace_permit', 1600,  TRUE, 1003),
('bazaar_permit_5', 'Bazaar Permit — Slot 8',  'Unlock an 8th concurrent listing slot in the Dreamwalker''s Bazaar.',  'marketplace_permit', 3200,  TRUE, 1004),
('bazaar_permit_6', 'Bazaar Permit — Slot 9',  'Unlock a 9th concurrent listing slot in the Dreamwalker''s Bazaar.',   'marketplace_permit', 6400,  TRUE, 1005),
('bazaar_permit_7', 'Bazaar Permit — Slot 10', 'Unlock the maximum 10th listing slot in the Dreamwalker''s Bazaar.',   'marketplace_permit', 12800, TRUE, 1006);

-- -----------------------------------------------------------------------------
-- 5b. Marketplace Titles (4)
-- -----------------------------------------------------------------------------
INSERT INTO titles (name, display_format, sort_order) VALUES
('Merchant',    'prefix', 300),
('Collector',   'suffix', 301),
('Dreamwalker', 'prefix', 302),
('Baron',       'suffix', 303);

-- -----------------------------------------------------------------------------
-- 5c. Marketplace Achievements (9, with parent chains)
-- -----------------------------------------------------------------------------

-- First: achievements without parent references
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order, is_active) VALUES
('Open for Business',   'List your first item on the Dreamwalker''s Bazaar.',                'economics', 'achievement_bazaar_list',     'cumulative', 'marketplace_listings',        1,     5,   0, 600, TRUE),
('Deal Sealed',         'Sell your first item on the Dreamwalker''s Bazaar.',                'economics', 'achievement_bazaar_sell',     'cumulative', 'marketplace_sales',           1,    10,   0, 601, TRUE),
('Bazaar Regular',      'Purchase your first item from the Dreamwalker''s Bazaar.',          'economics', 'achievement_bazaar_buy',      'cumulative', 'marketplace_purchases',       1,     5,   0, 602, TRUE),
('The Scrapper',        'Salvage 100 items at the NPC Vendor.',                               'economics', 'achievement_bazaar_salvage', 'cumulative', 'marketplace_salvages',      100,     0,  25, 605, TRUE),
('Jackpot',             'Sell a single item for 5,000 Shards or more.',                       'economics', 'achievement_bazaar_jackpot', 'threshold',  'marketplace_single_sale_max', 5000,   0,   0, 607, TRUE);

-- Parent chain: Deal Sealed → Merchant of Elysium → Master Merchant
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, parent_achievement_id, sort_order, is_active) VALUES
('Merchant of Elysium', 'Sell 10 items on the Dreamwalker''s Bazaar.',   'economics', 'achievement_bazaar_merchant',   'cumulative', 'marketplace_sales',     10,  0, 0,
    (SELECT id FROM achievements WHERE name = 'Deal Sealed'),           603, TRUE),
('Master Merchant',     'Sell 50 items on the Dreamwalker''s Bazaar.',   'economics', 'achievement_bazaar_master',     'cumulative', 'marketplace_sales',     50, 50, 0,
    (SELECT id FROM achievements WHERE name = 'Merchant of Elysium'),   604, TRUE);

-- Parent chain: Bazaar Regular → Avid Collector
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, parent_achievement_id, sort_order, is_active) VALUES
('Avid Collector', 'Purchase 25 items from the Dreamwalker''s Bazaar.', 'economics', 'achievement_bazaar_collector', 'cumulative', 'marketplace_purchases', 25, 0, 0,
    (SELECT id FROM achievements WHERE name = 'Bazaar Regular'),        606, TRUE);

-- Trade Baron (standalone, high-value)
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order, is_active) VALUES
('Trade Baron', 'Earn a cumulative 10,000 Shards from marketplace sales.', 'economics', 'achievement_bazaar_baron', 'cumulative', 'marketplace_total_earned', 10000, 100, 0, 608, TRUE);

-- Link title rewards
UPDATE achievements SET reward_title_id = (SELECT id FROM titles WHERE name = 'Merchant')
    WHERE name = 'Merchant of Elysium';
UPDATE achievements SET reward_title_id = (SELECT id FROM titles WHERE name = 'Collector')
    WHERE name = 'Avid Collector';
UPDATE achievements SET reward_title_id = (SELECT id FROM titles WHERE name = 'Dreamwalker')
    WHERE name = 'Jackpot';
UPDATE achievements SET reward_title_id = (SELECT id FROM titles WHERE name = 'Baron')
    WHERE name = 'Trade Baron';

-- -----------------------------------------------------------------------------
-- 5d. game_configs keys (15: marketplace + salvage)
-- -----------------------------------------------------------------------------
INSERT INTO game_configs (key, value_json, category, description) VALUES
('marketplace_tax_rate',                    '"0.05"',  'marketplace', 'Transaction tax rate (5%), deducted from seller proceeds, burned'),
('marketplace_listing_duration_hours',      '"24"',    'marketplace', 'Listing duration in hours before expiry'),
('marketplace_base_listing_slots',          '"3"',     'marketplace', 'Default listing slots per player'),
('marketplace_max_listing_slots',           '"10"',    'marketplace', 'Hard cap on listing slots (3 base + 7 permits)'),
('marketplace_min_listing_price',           '"1"',     'marketplace', 'Minimum listing price in Shards'),
('marketplace_notification_retention_days', '"30"',    'marketplace', 'Days to retain read marketplace notifications before purge'),
('bazaar_permit_base_price',                '"200"',   'marketplace', 'Price of first Bazaar Permit (Shard) — doubles per tier'),
('bazaar_permit_price_multiplier',          '"2.0"',   'marketplace', 'Price multiplier per subsequent permit purchase'),
('salvage_equipment_common_essence',        '"5"',     'salvage',     'Base Essence for salvaging Common equipment'),
('salvage_equipment_uncommon_essence',      '"15"',    'salvage',     'Base Essence for salvaging Uncommon equipment'),
('salvage_equipment_rare_essence',          '"50"',    'salvage',     'Base Essence for salvaging Rare equipment'),
('salvage_equipment_epic_essence',          '"150"',   'salvage',     'Base Essence for salvaging Epic equipment'),
('salvage_equipment_legendary_essence',     '"500"',   'salvage',     'Base Essence for salvaging Legendary/Cosmic equipment/artifacts'),
('salvage_artifact_multiplier',             '"2.0"',   'salvage',     'Multiplier for artifact salvage vs equipment base rate'),
('salvage_curated_bonus_multiplier',        '"1.15"',  'salvage',     'Additional bonus multiplier for curated artifact salvage');

COMMIT;
