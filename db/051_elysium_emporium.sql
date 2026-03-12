-- ============================================================
-- Migration 051: Elysium Emporium
-- Phase: 3.3.0
-- ============================================================

-- 1. Shared trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. New table: shop_items
CREATE TABLE shop_items (
    id SERIAL PRIMARY KEY,
    item_key VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('skin', 'flair', 'badge', 'avatar', 'booster')),
    price_shards INTEGER NOT NULL CHECK (price_shards > 0),
    icon_path VARCHAR(255) DEFAULT NULL,
    class_restriction INTEGER DEFAULT NULL REFERENCES character_classes(id) ON DELETE SET NULL,
    item_metadata JSONB DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    featured_from TIMESTAMPTZ DEFAULT NULL,
    featured_until TIMESTAMPTZ DEFAULT NULL,
    available_from TIMESTAMPTZ DEFAULT NULL,
    available_until TIMESTAMPTZ DEFAULT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shop_items_category_active ON shop_items (category, sort_order) WHERE is_active = TRUE;
CREATE INDEX idx_shop_items_featured ON shop_items (is_featured, featured_from, featured_until) WHERE is_featured = TRUE;
CREATE INDEX idx_shop_items_availability ON shop_items (available_from, available_until) WHERE available_until IS NOT NULL;

CREATE TRIGGER trg_shop_items_updated_at
    BEFORE UPDATE ON shop_items
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- 3. New table: shop_bundles
CREATE TABLE shop_bundles (
    id SERIAL PRIMARY KEY,
    bundle_key VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    price_shards INTEGER NOT NULL CHECK (price_shards > 0),
    original_price_shards INTEGER NOT NULL CHECK (original_price_shards > 0),
    discount_pct INTEGER NOT NULL DEFAULT 20 CHECK (discount_pct >= 0 AND discount_pct <= 100),
    icon_path VARCHAR(255) DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    featured_from TIMESTAMPTZ DEFAULT NULL,
    featured_until TIMESTAMPTZ DEFAULT NULL,
    available_from TIMESTAMPTZ DEFAULT NULL,
    available_until TIMESTAMPTZ DEFAULT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shop_bundles_active ON shop_bundles (is_active, sort_order) WHERE is_active = TRUE;

CREATE TRIGGER trg_shop_bundles_updated_at
    BEFORE UPDATE ON shop_bundles
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- 4. New table: shop_bundle_items (junction)
CREATE TABLE shop_bundle_items (
    id SERIAL PRIMARY KEY,
    bundle_id INTEGER NOT NULL REFERENCES shop_bundles(id) ON DELETE CASCADE,
    shop_item_id INTEGER NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE (bundle_id, shop_item_id)
);

CREATE INDEX idx_bundle_items_bundle ON shop_bundle_items (bundle_id, sort_order);

-- 5. New table: player_shop_items (ownership)
CREATE TABLE player_shop_items (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    shop_item_id INTEGER DEFAULT NULL REFERENCES shop_items(id) ON DELETE SET NULL,
    source_bundle_id INTEGER DEFAULT NULL REFERENCES shop_bundles(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'owned' CHECK (status IN ('owned', 'refunded')),
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    refunded_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_psi_player_status ON player_shop_items (player_id, status) WHERE status = 'owned';
CREATE INDEX idx_psi_player_item ON player_shop_items (player_id, shop_item_id) WHERE status = 'owned';
CREATE INDEX idx_psi_player_bundle ON player_shop_items (player_id, source_bundle_id) WHERE source_bundle_id IS NOT NULL;
CREATE UNIQUE INDEX idx_psi_unique_ownership ON player_shop_items (player_id, shop_item_id) WHERE status = 'owned' AND shop_item_id IS NOT NULL;

-- 6. New table: player_active_boosters
CREATE TABLE player_active_boosters (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    boost_type VARCHAR(20) NOT NULL CHECK (boost_type IN ('xp', 'essence', 'drop_rate')),
    magnitude NUMERIC(5,2) NOT NULL CHECK (magnitude > 1.0),
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
    elapsed_seconds INTEGER NOT NULL DEFAULT 0 CHECK (elapsed_seconds >= 0),
    shop_item_id INTEGER DEFAULT NULL REFERENCES shop_items(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
    activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expired_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pab_player_active ON player_active_boosters (player_id, boost_type) WHERE status = 'active';
CREATE INDEX idx_pab_player_history ON player_active_boosters (player_id, activated_at DESC);

CREATE TRIGGER trg_player_active_boosters_updated_at
    BEFORE UPDATE ON player_active_boosters
    FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- 7. Alter players: add cosmetic equip columns
ALTER TABLE players
    ADD COLUMN IF NOT EXISTS equipped_flair_id INTEGER DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS equipped_badge_id INTEGER DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS equipped_avatar_id INTEGER DEFAULT NULL;

-- 8. Alter player_characters: add skin equip column
ALTER TABLE player_characters
    ADD COLUMN IF NOT EXISTS equipped_skin_id INTEGER DEFAULT NULL;

-- 9. Widen shard_transactions CHECK constraint
-- Drop existing constraint (named by PostgreSQL convention from migration 046)
ALTER TABLE shard_transactions DROP CONSTRAINT IF EXISTS shard_transactions_source_type_check;

-- Re-add with all known source types (046 + 050 + 051)
ALTER TABLE shard_transactions ADD CONSTRAINT shard_transactions_source_type_check
    CHECK (source_type IN (
        'achievement', 'purchase', 'refund', 'admin_grant', 'admin_deduct', 'spend',
        'subscription_stipend', 'subscription_refund',
        'shop_purchase', 'admin_refund'
    ));

-- 10. Seed shop items: Skins (6 items)
INSERT INTO shop_items (item_key, name, description, category, price_shards, icon_path, class_restriction, item_metadata, sort_order) VALUES
('skin_universal_void',
 'Void Wanderer', 'A dark silhouette wreathed in void energy. Universal — any class.',
 'skin', 500, '/assets/game/cosmetics/skins/universal_void/thumb.png', NULL,
 '{"portrait":"/assets/game/cosmetics/skins/universal_void/portrait.png","avatar_config":{"primary_color":"#2D1B4E","secondary_color":"#8B00FF","particle":"void_wisps"},"battle_bar":"/assets/game/cosmetics/skins/universal_void/bar.png"}',
 1),
('skin_universal_celestial',
 'Celestial Ascendant', 'Radiant golden armor emanating divine light. Universal — any class.',
 'skin', 500, '/assets/game/cosmetics/skins/universal_celestial/thumb.png', NULL,
 '{"portrait":"/assets/game/cosmetics/skins/universal_celestial/portrait.png","avatar_config":{"primary_color":"#FFD700","secondary_color":"#FFF8DC","particle":"celestial_motes"},"battle_bar":"/assets/game/cosmetics/skins/universal_celestial/bar.png"}',
 2),
('skin_engineer_spire',
 'Spire Architect', 'Mechanical exoskeleton with glowing blueprint overlays. Engineer only.',
 'skin', 350, '/assets/game/cosmetics/skins/engineer_spire/thumb.png',
 (SELECT id FROM character_classes WHERE name = 'Engineer'),
 '{"portrait":"/assets/game/cosmetics/skins/engineer_spire/portrait.png","avatar_config":{"primary_color":"#4A90D9","secondary_color":"#C0C0C0","particle":"gear_sparks"},"battle_bar":"/assets/game/cosmetics/skins/engineer_spire/bar.png"}',
 3),
('skin_conduit_akashic',
 'Akashic Conduit', 'Flowing energy channels with data-stream aura. Conduit only.',
 'skin', 350, '/assets/game/cosmetics/skins/conduit_akashic/thumb.png',
 (SELECT id FROM character_classes WHERE name = 'Conduit'),
 '{"portrait":"/assets/game/cosmetics/skins/conduit_akashic/portrait.png","avatar_config":{"primary_color":"#00CED1","secondary_color":"#E0FFFF","particle":"data_streams"},"battle_bar":"/assets/game/cosmetics/skins/conduit_akashic/bar.png"}',
 4),
('skin_drifter_phase',
 'Phase Drifter', 'Semi-transparent form flickering between dimensions. Drifter only.',
 'skin', 350, '/assets/game/cosmetics/skins/drifter_phase/thumb.png',
 (SELECT id FROM character_classes WHERE name = 'Drifter'),
 '{"portrait":"/assets/game/cosmetics/skins/drifter_phase/portrait.png","avatar_config":{"primary_color":"#9B59B6","secondary_color":"#D7BDE2","particle":"phase_flicker"},"battle_bar":"/assets/game/cosmetics/skins/drifter_phase/bar.png"}',
 5),
('skin_vessel_divine',
 'Divine Vessel', 'Luminous vessel form radiating holy energy. Vessel only.',
 'skin', 350, '/assets/game/cosmetics/skins/vessel_divine/thumb.png',
 (SELECT id FROM character_classes WHERE name = 'Vessel'),
 '{"portrait":"/assets/game/cosmetics/skins/vessel_divine/portrait.png","avatar_config":{"primary_color":"#FFD700","secondary_color":"#FFFAF0","particle":"divine_rays"},"battle_bar":"/assets/game/cosmetics/skins/vessel_divine/bar.png"}',
 6);

-- 10b. Seed shop items: Flair (5 items)
INSERT INTO shop_items (item_key, name, description, category, price_shards, icon_path, item_metadata, sort_order) VALUES
('flair_void_whisper',
 'Void Whisper', 'Deep purple glow with void spiral icon.',
 'flair', 150, '/assets/game/cosmetics/flair/void_whisper.png',
 '{"border_color":"#8B00FF","border_style":"glow","icon":"void_spiral"}',
 10),
('flair_celestial_radiance',
 'Celestial Radiance', 'Golden shimmer with star burst icon.',
 'flair', 150, '/assets/game/cosmetics/flair/celestial_radiance.png',
 '{"border_color":"#FFD700","border_style":"shimmer","icon":"star_burst"}',
 11),
('flair_infernal_ember',
 'Infernal Ember', 'Crimson pulse with flame icon.',
 'flair', 150, '/assets/game/cosmetics/flair/infernal_ember.png',
 '{"border_color":"#DC143C","border_style":"pulse","icon":"flame"}',
 12),
('flair_akashic_flow',
 'Akashic Flow', 'Teal gradient with flow drop icon.',
 'flair', 150, '/assets/game/cosmetics/flair/akashic_flow.png',
 '{"border_color":"#008B8B","border_style":"gradient","icon":"flow_drop"}',
 13),
('flair_spire_walker',
 'Spire Walker', 'Silver metallic with gear icon.',
 'flair', 150, '/assets/game/cosmetics/flair/spire_walker.png',
 '{"border_color":"#C0C0C0","border_style":"metallic","icon":"gear"}',
 14);

-- 10c. Seed shop items: Badges (4 items)
INSERT INTO shop_items (item_key, name, description, category, price_shards, icon_path, item_metadata, sort_order) VALUES
('badge_arcane',
 'Arcane Frame', 'Glowing runic border in blue-purple tones.',
 'badge', 200, '/assets/game/cosmetics/badges/arcane.png',
 '{"frame_style":"runic","primary_color":"#6A0DAD","secondary_color":"#4169E1"}',
 20),
('badge_void',
 'Void Frame', 'Dark swirling edges with particle effects.',
 'badge', 200, '/assets/game/cosmetics/badges/void.png',
 '{"frame_style":"swirl","primary_color":"#1C1C2E","secondary_color":"#8B00FF"}',
 21),
('badge_celestial',
 'Celestial Frame', 'Radiant golden border with star accents.',
 'badge', 200, '/assets/game/cosmetics/badges/celestial.png',
 '{"frame_style":"radiant","primary_color":"#FFD700","secondary_color":"#FFF8DC"}',
 22),
('badge_infernal',
 'Infernal Frame', 'Smoldering ember border with flame wisps.',
 'badge', 200, '/assets/game/cosmetics/badges/infernal.png',
 '{"frame_style":"ember","primary_color":"#DC143C","secondary_color":"#FF4500"}',
 23);

-- 10d. Seed shop items: Avatars (8 items)
INSERT INTO shop_items (item_key, name, description, category, price_shards, icon_path, item_metadata, sort_order) VALUES
('avatar_pallid_mask',
 'The Pallid Mask', 'Iconic antagonist — pale porcelain mask emerging from shadow.',
 'avatar', 250, '/assets/game/cosmetics/avatars/pallid_mask.png',
 '{"theme":"antagonist","rarity":"premium"}',
 30),
('avatar_spire_sentinel',
 'Spire Sentinel', 'Tower guardian silhouette against a cosmic backdrop.',
 'avatar', 200, '/assets/game/cosmetics/avatars/spire_sentinel.png',
 '{"theme":"guardian","rarity":"standard"}',
 31),
('avatar_akashic_dreamer',
 'Akashic Dreamer', 'Floating figure surrounded by flowing data streams.',
 'avatar', 200, '/assets/game/cosmetics/avatars/akashic_dreamer.png',
 '{"theme":"mystic","rarity":"standard"}',
 32),
('avatar_void_gazer',
 'Void Gazer', 'A single eye peering from a rift in reality.',
 'avatar', 200, '/assets/game/cosmetics/avatars/void_gazer.png',
 '{"theme":"cosmic_horror","rarity":"standard"}',
 33),
('avatar_the_architect',
 'The Architect', 'Cloaked figure with blueprint overlays and mechanical wings.',
 'avatar', 250, '/assets/game/cosmetics/avatars/the_architect.png',
 '{"theme":"creator","rarity":"premium"}',
 34),
('avatar_etheris_dawn',
 'Etheris Dawn', 'Sunrise over the prison-world landscape of Etheris.',
 'avatar', 150, '/assets/game/cosmetics/avatars/etheris_dawn.png',
 '{"theme":"landscape","rarity":"common"}',
 35),
('avatar_cosmic_remnant',
 'Cosmic Remnant', 'Shattered entity fragments slowly reassembling in void space.',
 'avatar', 200, '/assets/game/cosmetics/avatars/cosmic_remnant.png',
 '{"theme":"cosmic","rarity":"standard"}',
 36),
('avatar_tower_ascendant',
 'Tower Ascendant', 'Silhouette climbing an infinite spiral staircase toward light.',
 'avatar', 150, '/assets/game/cosmetics/avatars/tower_ascendant.png',
 '{"theme":"journey","rarity":"common"}',
 37);

-- 10e. Seed shop items: Boosters (9 items)
INSERT INTO shop_items (item_key, name, description, category, price_shards, icon_path, item_metadata, sort_order) VALUES
-- XP Boosters
('booster_xp_1hr',
 'XP Boost (1 Hour)', 'Multiply all XP earned by 1.25x for 1 hour of active play.',
 'booster', 75, NULL,
 '{"boost_type":"xp","magnitude":1.25,"duration_seconds":3600}',
 40),
('booster_xp_8hr',
 'XP Boost (8 Hours)', 'Multiply all XP earned by 1.5x for 8 hours of active play.',
 'booster', 400, NULL,
 '{"boost_type":"xp","magnitude":1.5,"duration_seconds":28800}',
 41),
('booster_xp_24hr',
 'XP Boost (24 Hours)', 'Multiply all XP earned by 2.0x for 24 hours of active play.',
 'booster', 900, NULL,
 '{"boost_type":"xp","magnitude":2.0,"duration_seconds":86400}',
 42),
-- Essence Boosters
('booster_essence_1hr',
 'Essence Boost (1 Hour)', 'Multiply all Essence earned by 1.25x for 1 hour of active play.',
 'booster', 75, NULL,
 '{"boost_type":"essence","magnitude":1.25,"duration_seconds":3600}',
 43),
('booster_essence_8hr',
 'Essence Boost (8 Hours)', 'Multiply all Essence earned by 1.5x for 8 hours of active play.',
 'booster', 400, NULL,
 '{"boost_type":"essence","magnitude":1.5,"duration_seconds":28800}',
 44),
('booster_essence_24hr',
 'Essence Boost (24 Hours)', 'Multiply all Essence earned by 2.0x for 24 hours of active play.',
 'booster', 900, NULL,
 '{"boost_type":"essence","magnitude":2.0,"duration_seconds":86400}',
 45),
-- Drop Rate Boosters
('booster_drop_1hr',
 'Drop Rate Boost (1 Hour)', 'Multiply artifact drop chance by 1.25x for 1 hour of active play.',
 'booster', 75, NULL,
 '{"boost_type":"drop_rate","magnitude":1.25,"duration_seconds":3600}',
 46),
('booster_drop_8hr',
 'Drop Rate Boost (8 Hours)', 'Multiply artifact drop chance by 1.5x for 8 hours of active play.',
 'booster', 400, NULL,
 '{"boost_type":"drop_rate","magnitude":1.5,"duration_seconds":28800}',
 47),
('booster_drop_24hr',
 'Drop Rate Boost (24 Hours)', 'Multiply artifact drop chance by 2.0x for 24 hours of active play.',
 'booster', 900, NULL,
 '{"boost_type":"drop_rate","magnitude":2.0,"duration_seconds":86400}',
 48);

-- 11. Seed bundles (3 bundle definitions)
INSERT INTO shop_bundles (bundle_key, name, description, price_shards, original_price_shards, discount_pct, sort_order) VALUES
('adventurers_starter_pack',
 'Adventurer''s Starter Pack',
 'A universal skin, chat flair, and a 1-hour XP boost to start your journey.',
 580, 725, 20, 1),
('void_collectors_set',
 'Void Collector''s Set',
 'Complete void-themed cosmetic collection: flair, badge, and avatar.',
 440, 550, 20, 2),
('power_hour_bundle',
 'Power Hour Bundle',
 'One hour of boosted everything — XP, Essence, and Drop Rate.',
 180, 225, 20, 3);

-- 11b. Seed bundle contents: Adventurer's Starter Pack
INSERT INTO shop_bundle_items (bundle_id, shop_item_id, sort_order) VALUES
((SELECT id FROM shop_bundles WHERE bundle_key = 'adventurers_starter_pack'),
 (SELECT id FROM shop_items WHERE item_key = 'skin_universal_void'), 1),
((SELECT id FROM shop_bundles WHERE bundle_key = 'adventurers_starter_pack'),
 (SELECT id FROM shop_items WHERE item_key = 'flair_celestial_radiance'), 2),
((SELECT id FROM shop_bundles WHERE bundle_key = 'adventurers_starter_pack'),
 (SELECT id FROM shop_items WHERE item_key = 'booster_xp_1hr'), 3);

-- 11c. Seed bundle contents: Void Collector's Set
INSERT INTO shop_bundle_items (bundle_id, shop_item_id, sort_order) VALUES
((SELECT id FROM shop_bundles WHERE bundle_key = 'void_collectors_set'),
 (SELECT id FROM shop_items WHERE item_key = 'flair_void_whisper'), 1),
((SELECT id FROM shop_bundles WHERE bundle_key = 'void_collectors_set'),
 (SELECT id FROM shop_items WHERE item_key = 'badge_void'), 2),
((SELECT id FROM shop_bundles WHERE bundle_key = 'void_collectors_set'),
 (SELECT id FROM shop_items WHERE item_key = 'avatar_void_gazer'), 3);

-- 11d. Seed bundle contents: Power Hour Bundle
INSERT INTO shop_bundle_items (bundle_id, shop_item_id, sort_order) VALUES
((SELECT id FROM shop_bundles WHERE bundle_key = 'power_hour_bundle'),
 (SELECT id FROM shop_items WHERE item_key = 'booster_xp_1hr'), 1),
((SELECT id FROM shop_bundles WHERE bundle_key = 'power_hour_bundle'),
 (SELECT id FROM shop_items WHERE item_key = 'booster_essence_1hr'), 2),
((SELECT id FROM shop_bundles WHERE bundle_key = 'power_hour_bundle'),
 (SELECT id FROM shop_items WHERE item_key = 'booster_drop_1hr'), 3);

-- 12. Seed game_configs (9 rows, category: economy)
INSERT INTO game_configs (key, value_json, category, description) VALUES
('shop_booster_1hr_price',              '75',     'economy', 'Default price in shards for 1-hour boosters'),
('shop_booster_8hr_price',              '400',    'economy', 'Default price in shards for 8-hour boosters'),
('shop_booster_24hr_price',             '900',    'economy', 'Default price in shards for 24-hour boosters'),
('shop_booster_1hr_magnitude',          '1.25',   'economy', 'Multiplier value for 1-hour boosters'),
('shop_booster_8hr_magnitude',          '1.5',    'economy', 'Multiplier value for 8-hour boosters'),
('shop_booster_24hr_magnitude',         '2.0',    'economy', 'Multiplier value for 24-hour boosters'),
('shop_bundle_default_discount',        '20',     'economy', 'Default bundle discount percentage'),
('shop_booster_ping_interval_s',        '30',     'economy', 'Frontend booster ping interval in seconds'),
('shop_booster_max_elapsed_per_ping',   '60',     'economy', 'Max elapsed seconds accepted per ping (anti-cheat clamp)');
