-- 052_donations.sql: Donations system — table, player columns, patron seed data, game_configs

-- 1. New table: donations
CREATE TABLE IF NOT EXISTS donations (
    id                      SERIAL PRIMARY KEY,
    player_id               INTEGER NOT NULL REFERENCES players(id),
    payment_order_id        INTEGER NOT NULL REFERENCES payment_orders(id) UNIQUE,
    amount_cents            INTEGER NOT NULL CHECK (amount_cents >= 100),
    cumulative_total_cents  INTEGER NOT NULL DEFAULT 0,
    patron_tier             VARCHAR(20) DEFAULT NULL,
    diamond_stars           INTEGER DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donations_player ON donations(player_id);
CREATE INDEX IF NOT EXISTS idx_donations_created ON donations(created_at DESC);

-- 2. ALTER players: add donation columns (IF NOT EXISTS for re-runnability)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'cumulative_donation_cents') THEN
        ALTER TABLE players ADD COLUMN cumulative_donation_cents INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'patron_tier') THEN
        ALTER TABLE players ADD COLUMN patron_tier VARCHAR(20) DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'patron_diamond_stars') THEN
        ALTER TABLE players ADD COLUMN patron_diamond_stars INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'donor_visibility') THEN
        ALTER TABLE players ADD COLUMN donor_visibility BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END $$;

-- 3. Update shard_transactions source_type CHECK to include 'donation'
ALTER TABLE shard_transactions
    DROP CONSTRAINT IF EXISTS shard_transactions_source_type_check;

ALTER TABLE shard_transactions
    ADD CONSTRAINT shard_transactions_source_type_check
    CHECK (source_type IN (
        'purchase', 'reward', 'spend', 'refund', 'admin_grant',
        'admin_deduct', 'subscription_stipend', 'subscription_refund',
        'shop_purchase', 'admin_refund', 'donation', 'achievement',
        'dispute', 'dispute_reversal'
    ));

-- 4. Widen shop_items constraints to allow patron items
--    category CHECK: add patron_badge, patron_flair, patron_avatar
ALTER TABLE shop_items DROP CONSTRAINT IF EXISTS shop_items_category_check;
ALTER TABLE shop_items ADD CONSTRAINT shop_items_category_check
    CHECK (category::text = ANY (ARRAY[
        'skin', 'flair', 'badge', 'avatar', 'booster',
        'patron_badge', 'patron_flair', 'patron_avatar'
    ]::text[]));

--    price_shards CHECK: allow 0 for patron items (was > 0)
ALTER TABLE shop_items DROP CONSTRAINT IF EXISTS shop_items_price_shards_check;
ALTER TABLE shop_items ADD CONSTRAINT shop_items_price_shards_check
    CHECK (price_shards >= 0);

-- 5. Patron cosmetic items in shop_items
INSERT INTO shop_items (item_key, name, description, category, price_shards, is_active, sort_order) VALUES
('patron_badge_bronze',  'Bronze Patron Badge',  'A warm copper shield with a heart emblem. Awarded to Bronze Patrons.', 'patron_badge', 0, TRUE, 900),
('patron_badge_silver',  'Silver Patron Badge',  'A polished silver shield with feathered wings. Awarded to Silver Patrons.', 'patron_badge', 0, TRUE, 901),
('patron_badge_gold',    'Gold Patron Badge',    'An ornate golden shield wrapped in laurel. Awarded to Gold Patrons.', 'patron_badge', 0, TRUE, 902),
('patron_badge_diamond', 'Diamond Patron Badge', 'A crystalline diamond shield with prismatic shimmer. Awarded to Diamond Patrons.', 'patron_badge', 0, TRUE, 903)
ON CONFLICT (item_key) DO NOTHING;

INSERT INTO shop_items (item_key, name, description, category, price_shards, is_active, sort_order) VALUES
('patron_flair_golden', 'Golden Benefactor', 'A radiant golden name border with a heart icon. Exclusive to Gold and Diamond Patrons.', 'patron_flair', 0, TRUE, 910)
ON CONFLICT (item_key) DO NOTHING;

INSERT INTO shop_items (item_key, name, description, category, price_shards, is_active, sort_order) VALUES
('patron_avatar_benefactor', 'The Benefactor', 'A luminous figure extending a hand from a golden portal. Exclusive to Diamond Patrons.', 'patron_avatar', 0, TRUE, 920)
ON CONFLICT (item_key) DO NOTHING;

-- 6. Patron titles
INSERT INTO titles (name, display_format, sort_order) VALUES
('Bronze Patron',      'prefix', 200),
('Silver Patron',      'prefix', 201),
('Gold Patron',        'prefix', 202),
('Diamond Patron',     'prefix', 203),
('Patron of Elysium',  'suffix', 204)
ON CONFLICT (name) DO NOTHING;

-- 7. Patron achievement
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order, is_active) VALUES
('Patron of Elysium', 'Make your first donation to support the development of Elysium Rising.', 'economics', 'achievement_patron', 'cumulative', 'donations_count', 1, 0, 0, 500, TRUE)
ON CONFLICT DO NOTHING;

-- Link achievement to title
UPDATE achievements SET reward_title_id = (SELECT id FROM titles WHERE name = 'Patron of Elysium')
WHERE name = 'Patron of Elysium' AND reward_title_id IS NULL;

-- 8. game_configs seeds (actual columns: key, value_json, category, description)
INSERT INTO game_configs (key, value_json, category, description) VALUES
('donation_min_cents',             '100',   'donations', 'Minimum donation amount in cents'),
('patron_tier_bronze_cents',       '500',   'donations', 'Cumulative cents for Bronze Patron'),
('patron_tier_silver_cents',       '2500',  'donations', 'Cumulative cents for Silver Patron'),
('patron_tier_gold_cents',         '10000', 'donations', 'Cumulative cents for Gold Patron'),
('patron_tier_diamond_cents',      '50000', 'donations', 'Cumulative cents for Diamond Patron'),
('patron_diamond_star_increment',  '50000', 'donations', 'Additional cents per Diamond star'),
('patron_diamond_star_display_cap','5',     'donations', 'Maximum stars shown in UI'),
('donor_leaderboard_size',         '50',    'donations', 'Maximum entries on donor leaderboard'),
('recent_donors_count',            '5',     'donations', 'Number of recent donors in rotating banner'),
('recent_donors_window_days',      '7',     'donations', 'Days to look back for recent donors')
ON CONFLICT (key) DO NOTHING;
