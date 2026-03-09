-- Migration 047: Achievement & Title System (2.7.0)
-- Creates titles, achievements, player_achievements, player_titles tables.
-- Seeds ~20 titles and 90+ achievements.

BEGIN;

-- =============================================================================
-- 1. Titles Table (created first to avoid circular FK)
-- =============================================================================

CREATE TABLE IF NOT EXISTS titles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_format VARCHAR(10) NOT NULL CHECK (display_format IN ('prefix', 'suffix')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 2. Achievements Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('combat', 'narrative', 'economics', 'idle', 'discovery')),
    icon_sprite_key VARCHAR(100) NOT NULL DEFAULT 'achievement_default',
    tracking_type VARCHAR(20) NOT NULL CHECK (tracking_type IN ('cumulative', 'threshold', 'boolean')),
    tracking_source VARCHAR(100) NOT NULL,
    threshold_value NUMERIC(15,2) NOT NULL DEFAULT 1,
    parent_achievement_id INTEGER REFERENCES achievements(id) ON DELETE SET NULL,
    reward_shards INTEGER NOT NULL DEFAULT 0,
    reward_essence INTEGER NOT NULL DEFAULT 0,
    reward_title_id INTEGER REFERENCES titles(id) ON DELETE SET NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_achievements_category ON achievements (category);
CREATE INDEX idx_achievements_parent ON achievements (parent_achievement_id);
CREATE INDEX idx_achievements_active ON achievements (is_active) WHERE is_active = TRUE;

CREATE OR REPLACE FUNCTION update_achievements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_achievements_updated_at
    BEFORE UPDATE ON achievements
    FOR EACH ROW EXECUTE FUNCTION update_achievements_updated_at();

-- =============================================================================
-- 3. Back-reference FK: titles.achievement_id
-- =============================================================================

ALTER TABLE titles ADD COLUMN IF NOT EXISTS achievement_id INTEGER REFERENCES achievements(id) ON DELETE SET NULL;

-- =============================================================================
-- 4. Player Achievements Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS player_achievements (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    progress_value NUMERIC(15,2) NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    is_new BOOLEAN NOT NULL DEFAULT TRUE,
    earned_at TIMESTAMPTZ,
    UNIQUE (player_id, achievement_id)
);

CREATE INDEX idx_player_achievements_player ON player_achievements (player_id);
CREATE INDEX idx_player_achievements_completed ON player_achievements (player_id) WHERE is_completed = TRUE;
CREATE INDEX idx_player_achievements_new ON player_achievements (player_id) WHERE is_new = TRUE;

-- =============================================================================
-- 5. Player Titles Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS player_titles (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    title_id INTEGER NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (player_id, title_id)
);

-- =============================================================================
-- 6. Column Addition: player_characters.equipped_title_id
-- =============================================================================

ALTER TABLE player_characters ADD COLUMN IF NOT EXISTS equipped_title_id INTEGER DEFAULT NULL REFERENCES titles(id) ON DELETE SET NULL;

-- =============================================================================
-- 7. Seed Titles (~20)
-- =============================================================================

INSERT INTO titles (name, display_format, sort_order) VALUES
('the Awakened',       'suffix',  10),
('the Ascending',      'suffix',  20),
('the Transcendent',   'suffix',  30),
('Grandmaster',        'prefix',  40),
('Scholar',            'prefix',  50),
('Void Walker',        'suffix',  60),
('Seer',               'prefix',  70),
('Warden',             'prefix',  80),
('the Relentless',     'suffix',  90),
('Cosmic',             'prefix',  100),
('the Flawless',       'suffix',  110),
('Speed Demon',        'prefix',  120),
('the Collector',      'suffix',  130),
('Loremaster',         'prefix',  140),
('the Undying',        'suffix',  150),
('Dark Ritualist',     'prefix',  160),
('the Swift',          'suffix',  170),
('Tower Climber',      'prefix',  180),
('the Enlightened',    'suffix',  190),
('Codex Master',       'prefix',  200)
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- 8. Seed Achievements (90+)
-- =============================================================================

-- Helper: get title IDs for reward assignment
-- We'll use subqueries to reference title IDs

-- ─────────────────────────────────────────────
-- 8a. COMBAT ACHIEVEMENTS (~30)
-- ─────────────────────────────────────────────

-- Enemy Slayer I-VII (tiered cumulative)
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order) VALUES
('Enemy Slayer I',   'Defeat 100 enemies.',       'combat', 'achievement_slayer_1', 'cumulative', 'total_enemies_killed',    100, 1, 0, 101),
('Enemy Slayer II',  'Defeat 500 enemies.',       'combat', 'achievement_slayer_2', 'cumulative', 'total_enemies_killed',    500, 2, 0, 102),
('Enemy Slayer III', 'Defeat 1,000 enemies.',     'combat', 'achievement_slayer_3', 'cumulative', 'total_enemies_killed',   1000, 3, 0, 103),
('Enemy Slayer IV',  'Defeat 5,000 enemies.',     'combat', 'achievement_slayer_4', 'cumulative', 'total_enemies_killed',   5000, 5, 0, 104),
('Enemy Slayer V',   'Defeat 10,000 enemies.',    'combat', 'achievement_slayer_5', 'cumulative', 'total_enemies_killed',  10000, 10, 0, 105),
('Enemy Slayer VI',  'Defeat 50,000 enemies.',    'combat', 'achievement_slayer_6', 'cumulative', 'total_enemies_killed',  50000, 20, 0, 106),
('Enemy Slayer VII', 'Defeat 100,000 enemies.',   'combat', 'achievement_slayer_7', 'cumulative', 'total_enemies_killed', 100000, 50, 0, 107)
ON CONFLICT DO NOTHING;

-- Set parent chain for Enemy Slayer tiers
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Enemy Slayer I') WHERE name = 'Enemy Slayer II';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Enemy Slayer II') WHERE name = 'Enemy Slayer III';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Enemy Slayer III') WHERE name = 'Enemy Slayer IV';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Enemy Slayer IV') WHERE name = 'Enemy Slayer V';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Enemy Slayer V') WHERE name = 'Enemy Slayer VI';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Enemy Slayer VI') WHERE name = 'Enemy Slayer VII';

-- Boss Slayer (boolean)
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order) VALUES
('Boss Slayer',  'Defeat your first boss.', 'combat', 'achievement_boss_slayer', 'boolean', 'has_boss_kill', 1, 5, 0, 110)
ON CONFLICT DO NOTHING;

-- Chapter Boss Hunter I-III
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order) VALUES
('Chapter Boss Hunter I',   'Defeat all chapter bosses in Book 1.',  'combat', 'achievement_boss_hunter_1', 'cumulative', 'book_1_bosses_killed', 90, 15, 0, 111),
('Chapter Boss Hunter II',  'Defeat all chapter bosses in Book 2.',  'combat', 'achievement_boss_hunter_2', 'cumulative', 'book_2_bosses_killed', 23, 20, 0, 112),
('Chapter Boss Hunter III', 'Defeat all chapter bosses in Book 3.',  'combat', 'achievement_boss_hunter_3', 'cumulative', 'book_3_bosses_killed', 25, 25, 0, 113)
ON CONFLICT DO NOTHING;

-- Damage Dealer I-IV
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order) VALUES
('Damage Dealer I',   'Deal 100,000 damage in a single session.',       'combat', 'achievement_damage_1', 'threshold', 'best_session_damage',    100000, 2, 0, 120),
('Damage Dealer II',  'Deal 1,000,000 damage in a single session.',     'combat', 'achievement_damage_2', 'threshold', 'best_session_damage',   1000000, 5, 0, 121),
('Damage Dealer III', 'Deal 10,000,000 damage in a single session.',    'combat', 'achievement_damage_3', 'threshold', 'best_session_damage',  10000000, 15, 0, 122),
('Damage Dealer IV',  'Deal 100,000,000 damage in a single session.',   'combat', 'achievement_damage_4', 'threshold', 'best_session_damage', 100000000, 30, 0, 123)
ON CONFLICT DO NOTHING;

UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Damage Dealer I') WHERE name = 'Damage Dealer II';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Damage Dealer II') WHERE name = 'Damage Dealer III';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Damage Dealer III') WHERE name = 'Damage Dealer IV';

-- Wave Surfer I-IV
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order) VALUES
('Wave Surfer I',   'Reach wave 50 in a single session.',   'combat', 'achievement_wave_1', 'threshold', 'max_wave_reached',   50, 2, 0, 130),
('Wave Surfer II',  'Reach wave 100 in a single session.',  'combat', 'achievement_wave_2', 'threshold', 'max_wave_reached',  100, 5, 0, 131),
('Wave Surfer III', 'Reach wave 250 in a single session.',  'combat', 'achievement_wave_3', 'threshold', 'max_wave_reached',  250, 10, 0, 132),
('Wave Surfer IV',  'Reach wave 500 in a single session.',  'combat', 'achievement_wave_4', 'threshold', 'max_wave_reached',  500, 20, 0, 133)
ON CONFLICT DO NOTHING;

UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Wave Surfer I') WHERE name = 'Wave Surfer II';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Wave Surfer II') WHERE name = 'Wave Surfer III';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Wave Surfer III') WHERE name = 'Wave Surfer IV';

-- Flawless Victory (boolean)
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, reward_title_id, sort_order) VALUES
('Flawless Victory', 'Complete a scene without dying.', 'combat', 'achievement_flawless', 'boolean', 'has_flawless_scene', 1, 10, 0, (SELECT id FROM titles WHERE name = 'the Flawless'), 140)
ON CONFLICT DO NOTHING;

-- Speed Demon I-III
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order) VALUES
('Speed Demon I',   'Defeat a chapter boss in under 120 seconds.',  'combat', 'achievement_speed_1', 'threshold', 'best_boss_time_under', 120, 5, 0, 150),
('Speed Demon II',  'Defeat a chapter boss in under 60 seconds.',   'combat', 'achievement_speed_2', 'threshold', 'best_boss_time_under',  60, 15, 0, 151),
('Speed Demon III', 'Defeat a chapter boss in under 30 seconds.',   'combat', 'achievement_speed_3', 'threshold', 'best_boss_time_under',  30, 30, 0, 152)
ON CONFLICT DO NOTHING;

UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Speed Demon I') WHERE name = 'Speed Demon II';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Speed Demon II') WHERE name = 'Speed Demon III';
UPDATE achievements SET reward_title_id = (SELECT id FROM titles WHERE name = 'Speed Demon') WHERE name = 'Speed Demon III';

-- Dark Ritual I-IV
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order) VALUES
('Dark Ritual I',   'Reach a Dark Ritual multiplier of 5x.',   'combat', 'achievement_ritual_1', 'threshold', 'max_dark_ritual',  5, 2, 0, 160),
('Dark Ritual II',  'Reach a Dark Ritual multiplier of 10x.',  'combat', 'achievement_ritual_2', 'threshold', 'max_dark_ritual', 10, 5, 0, 161),
('Dark Ritual III', 'Reach a Dark Ritual multiplier of 25x.',  'combat', 'achievement_ritual_3', 'threshold', 'max_dark_ritual', 25, 10, 0, 162),
('Dark Ritual IV',  'Reach a Dark Ritual multiplier of 50x.',  'combat', 'achievement_ritual_4', 'threshold', 'max_dark_ritual', 50, 25, 0, 163)
ON CONFLICT DO NOTHING;

UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Dark Ritual I') WHERE name = 'Dark Ritual II';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Dark Ritual II') WHERE name = 'Dark Ritual III';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Dark Ritual III') WHERE name = 'Dark Ritual IV';
UPDATE achievements SET reward_title_id = (SELECT id FROM titles WHERE name = 'Dark Ritualist') WHERE name = 'Dark Ritual IV';

-- ─────────────────────────────────────────────
-- 8b. NARRATIVE ACHIEVEMENTS (~20)
-- ─────────────────────────────────────────────

-- Chapter Milestones I-V (tiered)
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order) VALUES
('Chapter Milestone I',   'Complete 10 chapters.',   'narrative', 'achievement_chapter_1', 'cumulative', 'total_chapters_completed',   10, 2, 0, 201),
('Chapter Milestone II',  'Complete 25 chapters.',   'narrative', 'achievement_chapter_2', 'cumulative', 'total_chapters_completed',   25, 5, 0, 202),
('Chapter Milestone III', 'Complete 50 chapters.',   'narrative', 'achievement_chapter_3', 'cumulative', 'total_chapters_completed',   50, 10, 0, 203),
('Chapter Milestone IV',  'Complete 100 chapters.',  'narrative', 'achievement_chapter_4', 'cumulative', 'total_chapters_completed',  100, 20, 0, 204),
('Chapter Milestone V',   'Complete all 138 chapters.', 'narrative', 'achievement_chapter_5', 'cumulative', 'total_chapters_completed', 138, 50, 0, 205)
ON CONFLICT DO NOTHING;

UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Chapter Milestone I') WHERE name = 'Chapter Milestone II';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Chapter Milestone II') WHERE name = 'Chapter Milestone III';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Chapter Milestone III') WHERE name = 'Chapter Milestone IV';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Chapter Milestone IV') WHERE name = 'Chapter Milestone V';
UPDATE achievements SET reward_title_id = (SELECT id FROM titles WHERE name = 'Tower Climber') WHERE name = 'Chapter Milestone V';

-- Book Complete I-III (boolean per book)
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, reward_title_id, sort_order) VALUES
('Book Complete I',   'Complete Book 1: The Pallid Mask.',   'narrative', 'achievement_book_1', 'boolean', 'book_1_completed', 1, 15, 0, (SELECT id FROM titles WHERE name = 'the Awakened'),     210),
('Book Complete II',  'Complete Book 2: The Ascending.',     'narrative', 'achievement_book_2', 'boolean', 'book_2_completed', 1, 25, 0, (SELECT id FROM titles WHERE name = 'the Ascending'),     211),
('Book Complete III', 'Complete Book 3: The Transcendent.',  'narrative', 'achievement_book_3', 'boolean', 'book_3_completed', 1, 50, 0, (SELECT id FROM titles WHERE name = 'the Transcendent'),  212)
ON CONFLICT DO NOTHING;

-- Lore Scholar I-IV
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order) VALUES
('Lore Scholar I',   'Unlock 25% of all story beats.',   'narrative', 'achievement_lore_1', 'cumulative', 'total_beats_unlocked_pct',  25, 3, 0, 220),
('Lore Scholar II',  'Unlock 50% of all story beats.',   'narrative', 'achievement_lore_2', 'cumulative', 'total_beats_unlocked_pct',  50, 10, 0, 221),
('Lore Scholar III', 'Unlock 75% of all story beats.',   'narrative', 'achievement_lore_3', 'cumulative', 'total_beats_unlocked_pct',  75, 20, 0, 222),
('Lore Scholar IV',  'Unlock 100% of all story beats.',  'narrative', 'achievement_lore_4', 'cumulative', 'total_beats_unlocked_pct', 100, 50, 0, 223)
ON CONFLICT DO NOTHING;

UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Lore Scholar I') WHERE name = 'Lore Scholar II';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Lore Scholar II') WHERE name = 'Lore Scholar III';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Lore Scholar III') WHERE name = 'Lore Scholar IV';
UPDATE achievements SET reward_title_id = (SELECT id FROM titles WHERE name = 'Scholar') WHERE name = 'Lore Scholar IV';

-- Hidden Knowledge I-IV
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order) VALUES
('Hidden Knowledge I',   'Unlock 5 hidden lore entries.',    'narrative', 'achievement_hidden_1', 'cumulative', 'hidden_lore_unlocked',  5, 3, 0, 230),
('Hidden Knowledge II',  'Unlock 15 hidden lore entries.',   'narrative', 'achievement_hidden_2', 'cumulative', 'hidden_lore_unlocked', 15, 10, 0, 231),
('Hidden Knowledge III', 'Unlock 30 hidden lore entries.',   'narrative', 'achievement_hidden_3', 'cumulative', 'hidden_lore_unlocked', 30, 20, 0, 232),
('Hidden Knowledge IV',  'Unlock all hidden lore entries.',  'narrative', 'achievement_hidden_4', 'cumulative', 'hidden_lore_unlocked', 999, 50, 0, 233)
ON CONFLICT DO NOTHING;

UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Hidden Knowledge I') WHERE name = 'Hidden Knowledge II';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Hidden Knowledge II') WHERE name = 'Hidden Knowledge III';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Hidden Knowledge III') WHERE name = 'Hidden Knowledge IV';
UPDATE achievements SET reward_title_id = (SELECT id FROM titles WHERE name = 'Loremaster') WHERE name = 'Hidden Knowledge IV';

-- Completionist (boolean)
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order) VALUES
('Completionist', 'Achieve 100% narrative completion across all books.', 'narrative', 'achievement_completionist', 'boolean', 'full_narrative_completion', 1, 100, 0, 240)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- 8c. ECONOMICS ACHIEVEMENTS (~15)
-- ─────────────────────────────────────────────

-- Gold Hoarder I-IV
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order) VALUES
('Gold Hoarder I',   'Accumulate 10,000 gold in a single run.',        'economics', 'achievement_gold_1', 'threshold', 'max_session_gold',      10000, 2, 0, 301),
('Gold Hoarder II',  'Accumulate 100,000 gold in a single run.',       'economics', 'achievement_gold_2', 'threshold', 'max_session_gold',     100000, 5, 0, 302),
('Gold Hoarder III', 'Accumulate 1,000,000 gold in a single run.',     'economics', 'achievement_gold_3', 'threshold', 'max_session_gold',    1000000, 10, 0, 303),
('Gold Hoarder IV',  'Accumulate 10,000,000 gold in a single run.',    'economics', 'achievement_gold_4', 'threshold', 'max_session_gold',   10000000, 25, 0, 304)
ON CONFLICT DO NOTHING;

UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Gold Hoarder I') WHERE name = 'Gold Hoarder II';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Gold Hoarder II') WHERE name = 'Gold Hoarder III';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Gold Hoarder III') WHERE name = 'Gold Hoarder IV';

-- Essence Collector I-IV
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order) VALUES
('Essence Collector I',   'Accumulate 100 total lifetime Essence.',      'economics', 'achievement_essence_1', 'cumulative', 'total_essence_earned',     100, 2, 0, 310),
('Essence Collector II',  'Accumulate 1,000 total lifetime Essence.',    'economics', 'achievement_essence_2', 'cumulative', 'total_essence_earned',    1000, 5, 0, 311),
('Essence Collector III', 'Accumulate 10,000 total lifetime Essence.',   'economics', 'achievement_essence_3', 'cumulative', 'total_essence_earned',   10000, 15, 0, 312),
('Essence Collector IV',  'Accumulate 100,000 total lifetime Essence.',  'economics', 'achievement_essence_4', 'cumulative', 'total_essence_earned',  100000, 30, 0, 313)
ON CONFLICT DO NOTHING;

UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Essence Collector I') WHERE name = 'Essence Collector II';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Essence Collector II') WHERE name = 'Essence Collector III';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Essence Collector III') WHERE name = 'Essence Collector IV';

-- Collector I-IV (artifacts)
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order) VALUES
('Collector I',   'Own 5 unique artifacts.',    'economics', 'achievement_collector_1', 'cumulative', 'total_artifacts_owned',  5, 2, 0, 320),
('Collector II',  'Own 15 unique artifacts.',   'economics', 'achievement_collector_2', 'cumulative', 'total_artifacts_owned', 15, 5, 0, 321),
('Collector III', 'Own 30 unique artifacts.',   'economics', 'achievement_collector_3', 'cumulative', 'total_artifacts_owned', 30, 15, 0, 322),
('Collector IV',  'Own 50 unique artifacts.',   'economics', 'achievement_collector_4', 'cumulative', 'total_artifacts_owned', 50, 30, 0, 323)
ON CONFLICT DO NOTHING;

UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Collector I') WHERE name = 'Collector II';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Collector II') WHERE name = 'Collector III';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Collector III') WHERE name = 'Collector IV';
UPDATE achievements SET reward_title_id = (SELECT id FROM titles WHERE name = 'the Collector') WHERE name = 'Collector IV';

-- Full Set (placeholder, inactive)
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, is_active, sort_order) VALUES
('Full Set', 'Complete an artifact synergy set.', 'economics', 'achievement_full_set', 'boolean', 'has_complete_synergy_set', 1, 25, 0, FALSE, 330)
ON CONFLICT DO NOTHING;

-- Geared Up
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order) VALUES
('Geared Up', 'Fill all 16 gear slots with equipment.', 'economics', 'achievement_geared_up', 'boolean', 'all_gear_slots_filled', 1, 15, 0, 331)
ON CONFLICT DO NOTHING;

-- Cosmic Touch
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, reward_title_id, sort_order) VALUES
('Cosmic Touch', 'Obtain a Cosmic rarity item.', 'economics', 'achievement_cosmic_touch', 'boolean', 'has_cosmic_item', 1, 20, 0, (SELECT id FROM titles WHERE name = 'Cosmic'), 332)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────
-- 8d. IDLE TRAINING ACHIEVEMENTS (~22)
-- ─────────────────────────────────────────────

-- Per-skill milestones: Attack (4), Magic (4), Lore (4), Precision (4)
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order) VALUES
-- Attack milestones
('Attack Training L25',  'Reach Level 25 in Attack Training.',   'idle', 'achievement_idle_attack_25',  'threshold', 'skill_level_attack',  25, 2, 50,  401),
('Attack Training L50',  'Reach Level 50 in Attack Training.',   'idle', 'achievement_idle_attack_50',  'threshold', 'skill_level_attack',  50, 5, 200, 402),
('Attack Training L75',  'Reach Level 75 in Attack Training.',   'idle', 'achievement_idle_attack_75',  'threshold', 'skill_level_attack',  75, 10, 500, 403),
('Attack Training L99',  'Reach Level 99 in Attack Training.',   'idle', 'achievement_idle_attack_99',  'threshold', 'skill_level_attack',  99, 25, 2000, 404),
-- Magic milestones
('Magic Training L25',   'Reach Level 25 in Magic Training.',    'idle', 'achievement_idle_magic_25',   'threshold', 'skill_level_magic',   25, 2, 50,  411),
('Magic Training L50',   'Reach Level 50 in Magic Training.',    'idle', 'achievement_idle_magic_50',   'threshold', 'skill_level_magic',   50, 5, 200, 412),
('Magic Training L75',   'Reach Level 75 in Magic Training.',    'idle', 'achievement_idle_magic_75',   'threshold', 'skill_level_magic',   75, 10, 500, 413),
('Magic Training L99',   'Reach Level 99 in Magic Training.',    'idle', 'achievement_idle_magic_99',   'threshold', 'skill_level_magic',   99, 25, 2000, 414),
-- Lore milestones
('Lore Training L25',    'Reach Level 25 in Lore Training.',     'idle', 'achievement_idle_lore_25',    'threshold', 'skill_level_lore',    25, 2, 50,  421),
('Lore Training L50',    'Reach Level 50 in Lore Training.',     'idle', 'achievement_idle_lore_50',    'threshold', 'skill_level_lore',    50, 5, 200, 422),
('Lore Training L75',    'Reach Level 75 in Lore Training.',     'idle', 'achievement_idle_lore_75',    'threshold', 'skill_level_lore',    75, 10, 500, 423),
('Lore Training L99',    'Reach Level 99 in Lore Training.',     'idle', 'achievement_idle_lore_99',    'threshold', 'skill_level_lore',    99, 25, 2000, 424),
-- Precision milestones
('Precision Training L25', 'Reach Level 25 in Precision Training.', 'idle', 'achievement_idle_precision_25', 'threshold', 'skill_level_precision', 25, 2, 50,  431),
('Precision Training L50', 'Reach Level 50 in Precision Training.', 'idle', 'achievement_idle_precision_50', 'threshold', 'skill_level_precision', 50, 5, 200, 432),
('Precision Training L75', 'Reach Level 75 in Precision Training.', 'idle', 'achievement_idle_precision_75', 'threshold', 'skill_level_precision', 75, 10, 500, 433),
('Precision Training L99', 'Reach Level 99 in Precision Training.', 'idle', 'achievement_idle_precision_99', 'threshold', 'skill_level_precision', 99, 25, 2000, 434)
ON CONFLICT DO NOTHING;

-- Set parent chains for idle tiers
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Attack Training L25') WHERE name = 'Attack Training L50';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Attack Training L50') WHERE name = 'Attack Training L75';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Attack Training L75') WHERE name = 'Attack Training L99';

UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Magic Training L25') WHERE name = 'Magic Training L50';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Magic Training L50') WHERE name = 'Magic Training L75';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Magic Training L75') WHERE name = 'Magic Training L99';

UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Lore Training L25') WHERE name = 'Lore Training L50';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Lore Training L50') WHERE name = 'Lore Training L75';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Lore Training L75') WHERE name = 'Lore Training L99';

UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Precision Training L25') WHERE name = 'Precision Training L50';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Precision Training L50') WHERE name = 'Precision Training L75';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Precision Training L75') WHERE name = 'Precision Training L99';

-- Assign titles to L75+ milestones
UPDATE achievements SET reward_title_id = (SELECT id FROM titles WHERE name = 'Seer') WHERE name = 'Lore Training L75';
UPDATE achievements SET reward_title_id = (SELECT id FROM titles WHERE name = 'Warden') WHERE name = 'Attack Training L75';

-- Cross-skill achievements
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order) VALUES
('Jack of All Trades',  'Reach Level 25 in all idle skills.',  'idle', 'achievement_jack', 'boolean', 'all_idle_skills_25', 1, 10, 0, 440),
('Master of All',       'Reach Level 50 in all idle skills.',  'idle', 'achievement_master', 'boolean', 'all_idle_skills_50', 1, 25, 0, 441),
('Grandmaster',         'Reach Level 99 in all idle skills.',  'idle', 'achievement_grandmaster', 'boolean', 'all_idle_skills_99', 1, 100, 0, 442)
ON CONFLICT DO NOTHING;

UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Jack of All Trades') WHERE name = 'Master of All';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Master of All') WHERE name = 'Grandmaster';
UPDATE achievements SET reward_title_id = (SELECT id FROM titles WHERE name = 'Grandmaster') WHERE name = 'Grandmaster';
UPDATE achievements SET reward_title_id = (SELECT id FROM titles WHERE name = 'the Enlightened') WHERE name = 'Master of All';

-- Active Trainer I-III
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order) VALUES
('Active Trainer I',   'Complete 10 active training click sessions.',   'idle', 'achievement_trainer_1', 'cumulative', 'active_training_sessions',  10, 2, 0, 450),
('Active Trainer II',  'Complete 50 active training click sessions.',   'idle', 'achievement_trainer_2', 'cumulative', 'active_training_sessions',  50, 5, 0, 451),
('Active Trainer III', 'Complete 100 active training click sessions.',  'idle', 'achievement_trainer_3', 'cumulative', 'active_training_sessions', 100, 15, 0, 452)
ON CONFLICT DO NOTHING;

UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Active Trainer I') WHERE name = 'Active Trainer II';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Active Trainer II') WHERE name = 'Active Trainer III';
UPDATE achievements SET reward_title_id = (SELECT id FROM titles WHERE name = 'the Relentless') WHERE name = 'Active Trainer III';

-- ─────────────────────────────────────────────
-- 8e. DISCOVERY ACHIEVEMENTS (~10)
-- ─────────────────────────────────────────────

-- Entity Hunter I-IV
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order) VALUES
('Entity Hunter I',   'Discover 10 unique entities.',     'discovery', 'achievement_entity_1', 'cumulative', 'entity_discoveries',  10, 2, 0, 501),
('Entity Hunter II',  'Discover 25 unique entities.',     'discovery', 'achievement_entity_2', 'cumulative', 'entity_discoveries',  25, 5, 0, 502),
('Entity Hunter III', 'Discover 50 unique entities.',     'discovery', 'achievement_entity_3', 'cumulative', 'entity_discoveries',  50, 10, 0, 503),
('Entity Hunter IV',  'Discover all unique entities.',    'discovery', 'achievement_entity_4', 'cumulative', 'entity_discoveries', 999, 30, 0, 504)
ON CONFLICT DO NOTHING;

UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Entity Hunter I') WHERE name = 'Entity Hunter II';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Entity Hunter II') WHERE name = 'Entity Hunter III';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Entity Hunter III') WHERE name = 'Entity Hunter IV';

-- Rare Find (boolean)
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order) VALUES
('Rare Find', 'Encounter a rare spawn entity.', 'discovery', 'achievement_rare_find', 'boolean', 'has_rare_spawn_encounter', 1, 5, 0, 510)
ON CONFLICT DO NOTHING;

-- Codex Master I-III
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order) VALUES
('Codex Master I',   'Achieve SS rank on 1 entity.',    'discovery', 'achievement_codex_1', 'cumulative', 'ss_rank_count',  1, 5, 0, 520),
('Codex Master II',  'Achieve SS rank on 5 entities.',  'discovery', 'achievement_codex_2', 'cumulative', 'ss_rank_count',  5, 15, 0, 521),
('Codex Master III', 'Achieve SS rank on 15 entities.', 'discovery', 'achievement_codex_3', 'cumulative', 'ss_rank_count', 15, 30, 0, 522)
ON CONFLICT DO NOTHING;

UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Codex Master I') WHERE name = 'Codex Master II';
UPDATE achievements SET parent_achievement_id = (SELECT id FROM achievements WHERE name = 'Codex Master II') WHERE name = 'Codex Master III';
UPDATE achievements SET reward_title_id = (SELECT id FROM titles WHERE name = 'Codex Master') WHERE name = 'Codex Master III';

-- Full Library
INSERT INTO achievements (name, description, category, icon_sprite_key, tracking_type, tracking_source, threshold_value, reward_shards, reward_essence, sort_order) VALUES
('Full Library', 'Discover all skills in the Skill Library.', 'discovery', 'achievement_full_library', 'boolean', 'all_skills_discovered', 1, 20, 0, 530)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 9. Update titles with back-references to achievements
-- =============================================================================

UPDATE titles SET achievement_id = (SELECT id FROM achievements WHERE name = 'Book Complete I') WHERE name = 'the Awakened';
UPDATE titles SET achievement_id = (SELECT id FROM achievements WHERE name = 'Book Complete II') WHERE name = 'the Ascending';
UPDATE titles SET achievement_id = (SELECT id FROM achievements WHERE name = 'Book Complete III') WHERE name = 'the Transcendent';
UPDATE titles SET achievement_id = (SELECT id FROM achievements WHERE name = 'Grandmaster') WHERE name = 'Grandmaster';
UPDATE titles SET achievement_id = (SELECT id FROM achievements WHERE name = 'Lore Scholar IV') WHERE name = 'Scholar';
UPDATE titles SET achievement_id = (SELECT id FROM achievements WHERE name = 'Chapter Boss Hunter II') WHERE name = 'Void Walker';
UPDATE titles SET achievement_id = (SELECT id FROM achievements WHERE name = 'Lore Training L75') WHERE name = 'Seer';
UPDATE titles SET achievement_id = (SELECT id FROM achievements WHERE name = 'Attack Training L75') WHERE name = 'Warden';
UPDATE titles SET achievement_id = (SELECT id FROM achievements WHERE name = 'Active Trainer III') WHERE name = 'the Relentless';
UPDATE titles SET achievement_id = (SELECT id FROM achievements WHERE name = 'Cosmic Touch') WHERE name = 'Cosmic';
UPDATE titles SET achievement_id = (SELECT id FROM achievements WHERE name = 'Flawless Victory') WHERE name = 'the Flawless';
UPDATE titles SET achievement_id = (SELECT id FROM achievements WHERE name = 'Speed Demon III') WHERE name = 'Speed Demon';
UPDATE titles SET achievement_id = (SELECT id FROM achievements WHERE name = 'Collector IV') WHERE name = 'the Collector';
UPDATE titles SET achievement_id = (SELECT id FROM achievements WHERE name = 'Hidden Knowledge IV') WHERE name = 'Loremaster';
UPDATE titles SET achievement_id = (SELECT id FROM achievements WHERE name = 'Dark Ritual IV') WHERE name = 'Dark Ritualist';
UPDATE titles SET achievement_id = (SELECT id FROM achievements WHERE name = 'Chapter Milestone V') WHERE name = 'Tower Climber';
UPDATE titles SET achievement_id = (SELECT id FROM achievements WHERE name = 'Master of All') WHERE name = 'the Enlightened';
UPDATE titles SET achievement_id = (SELECT id FROM achievements WHERE name = 'Codex Master III') WHERE name = 'Codex Master';

COMMIT;
