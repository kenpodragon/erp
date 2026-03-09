-- Migration 048: Leaderboard Cache & Home Base game_configs (2.7.0)

BEGIN;

-- =============================================================================
-- 1. Leaderboard Cache Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS leaderboard_cache (
    id SERIAL PRIMARY KEY,
    category VARCHAR(20) NOT NULL CHECK (category IN ('vanguard', 'alchemist', 'swift', 'scholar')),
    rank INTEGER NOT NULL,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    player_alias VARCHAR(100) NOT NULL,
    character_class VARCHAR(50),
    character_level INTEGER,
    equipped_title VARCHAR(100),
    metric_value NUMERIC(15,2) NOT NULL,
    badge_tier VARCHAR(10) CHECK (badge_tier IN ('cosmic', 'gold', 'silver', 'bronze')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (category, rank)
);

CREATE INDEX idx_leaderboard_category ON leaderboard_cache (category);
CREATE INDEX idx_leaderboard_player ON leaderboard_cache (player_id);

-- =============================================================================
-- 2. game_configs Seeds (13 keys)
-- =============================================================================

INSERT INTO game_configs (key, value_json, category, description) VALUES
-- Artifact generation
('artifact_gen_drop_chance_scene',    '0.05',  'artifacts',     'Base drop chance for generated artifact on scene complete'),
('artifact_gen_drop_chance_boss',     '0.15',  'artifacts',     'Base drop chance for generated artifact on boss kill'),
('artifact_gen_drop_chance_mastery',  '0.30',  'artifacts',     'Base drop chance for generated artifact on chapter mastery'),
('artifact_rarity_weight_book_1',     '{"common":70,"uncommon":20,"rare":8,"epic":1.8,"cosmic":0.2}',   'artifacts', 'Rarity weights for generated artifacts in Book 1'),
('artifact_rarity_weight_book_2',     '{"common":60,"uncommon":25,"rare":11,"epic":3.5,"cosmic":0.5}',  'artifacts', 'Rarity weights for generated artifacts in Book 2'),
('artifact_rarity_weight_book_3',     '{"common":50,"uncommon":27,"rare":15,"epic":6,"cosmic":2}',      'artifacts', 'Rarity weights for generated artifacts in Book 3'),
('artifact_rarity_stat_multiplier',   '{"common":1.0,"uncommon":1.2,"rare":1.5,"epic":2.0,"cosmic":3.0}', 'artifacts', 'Stat multiplier per rarity tier for generated artifacts'),
-- Leaderboard
('leaderboard_refresh_interval_min',  '5',     'leaderboard',   'Minutes between leaderboard cache refresh'),
('leaderboard_top_n',                 '100',   'leaderboard',   'Number of entries to cache per leaderboard category'),
-- Achievement milestone rewards
('achievement_milestone_essence_25',  '50',    'achievements',  'Essence reward for Level 25 idle training milestone'),
('achievement_milestone_essence_50',  '200',   'achievements',  'Essence reward for Level 50 idle training milestone'),
('achievement_milestone_essence_75',  '500',   'achievements',  'Essence reward for Level 75 idle training milestone'),
('achievement_milestone_essence_99',  '2000',  'achievements',  'Essence reward for Level 99 idle training milestone')
ON CONFLICT (key) DO UPDATE SET
    value_json = EXCLUDED.value_json,
    category = EXCLUDED.category,
    description = EXCLUDED.description;

COMMIT;
