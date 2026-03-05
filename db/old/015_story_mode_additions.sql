-- Migration 015: Story Mode Additions
-- Purpose: dev_content_audit logging, narrative progress tracking, character skill levels,
--          Auto-Strike skill, all 9 active Story Mode hotbar skills, and game config seeds.

BEGIN;

-- 1. Dev Content Audit Table
-- Automatically populated by the combat engine when entity data is missing.
CREATE TABLE IF NOT EXISTS dev_content_audit (
    id SERIAL PRIMARY KEY,
    audit_type VARCHAR(50) NOT NULL,      -- 'missing_sprite', 'missing_stat', 'missing_entity'
    entity_type VARCHAR(50),              -- 'enemy', 'location', 'scene'
    entity_id INTEGER,
    entity_name VARCHAR(255),
    missing_field VARCHAR(100),           -- e.g. 'base_hp', 'sprite_key'
    scene_id INTEGER REFERENCES scenes(id) ON DELETE SET NULL,
    zone_level INTEGER,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE
);

-- 2. Add narrative_progress_pct to player_story_sessions
-- Tracks WPM-based text display progress (0.0 to 100.0) separately from audio.
ALTER TABLE player_story_sessions
    ADD COLUMN IF NOT EXISTS narrative_progress_pct NUMERIC DEFAULT 0;

-- 3. Add narration_wpm to player_settings
-- Default 200 WPM; user-adjustable in settings.
ALTER TABLE player_settings
    ADD COLUMN IF NOT EXISTS narration_wpm INTEGER DEFAULT 200;

-- 4. Character Skill Levels Table
-- Bridges 2.2 Story Mode (auto-DPS calc) and 2.3 Idle Training (skill XP).
-- Default level 1 for all skills if no record exists.
CREATE TABLE IF NOT EXISTS character_skill_levels (
    id SERIAL PRIMARY KEY,
    character_id INTEGER NOT NULL REFERENCES player_characters(id) ON DELETE CASCADE,
    skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1,
    current_xp NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(character_id, skill_id)
);

-- 5. Add auto_dps_base to benefit_effect_data
-- Flat DPS-per-second contribution at skill level 1. Scales by level.
-- Multiple skills can have this benefit; the combat engine sums all contributions.
INSERT INTO benefit_effect_data (effect_key, display_name, description, value_type, category) VALUES
('auto_dps_base', 'Auto-DPS Base Damage', 'Base automatic damage per second at skill level 1. Scales with skill level.', 'flat_add', 'combat'),
('gold_drop_bonus', 'Gold Drop Bonus', 'Increases gold dropped by defeated enemies.', 'percentage_add', 'economy'),
('click_storm_cps', 'Clickstorm CPS', 'Clicks-per-second rate for the Clickstorm skill.', 'flat_add', 'combat')
ON CONFLICT (effect_key) DO NOTHING;

-- 6. Auto-Strike Idle Training Skill
-- Provides base auto-DPS in Story Mode. Level 1 = 5 DPS/s.
-- The combat engine sums auto_dps_base from all trained skills.
INSERT INTO skills (name, category, description, benefits_json, xp_curve_type,
                   cooldown_type, base_cooldown_seconds, base_cost_gold, cost_scaling_factor)
VALUES
('Auto-Strike', 'combat',
 'Automatically attacks enemies for base DPS each second. Each level adds +5 DPS/s. '
 'Contributes to Story Mode auto-attack alongside all other auto_dps_base skills.',
 '{"auto_dps_base": 5.0}', 'standard', 'individual', 0, 0, 1.0)
ON CONFLICT DO NOTHING;

-- 7. Active Story Mode Hotbar Skills (Session skills, purchased with gold during combat)
-- These are distinct from Idle Training skills. Each has a cost and cooldown.
INSERT INTO skills (name, category, description, benefits_json, xp_curve_type,
                   cooldown_type, base_cooldown_seconds, base_cost_gold, cost_scaling_factor)
VALUES
('Clickstorm', 'active',
 'Automatically clicks at 10 CPS for 30 seconds.',
 '{"click_storm_cps": 10, "duration_seconds": 30}',
 'standard', 'individual', 45, 50, 1.15),

('Powersurge', 'active',
 '+100% DPS multiplier for 30 seconds.',
 '{"auto_dps_bonus": 1.0, "duration_seconds": 30}',
 'standard', 'individual', 45, 75, 1.15),

('Lucky Strikes', 'active',
 '+50% critical hit chance for 30 seconds.',
 '{"crit_chance_bonus": 0.50, "duration_seconds": 30}',
 'standard', 'individual', 45, 100, 1.15),

('Metal Detector', 'active',
 '+100% gold drop multiplier for 30 seconds.',
 '{"gold_drop_bonus": 1.0, "duration_seconds": 30}',
 'standard', 'individual', 45, 60, 1.15),

('Golden Clicks', 'active',
 'Each click earns 5% of the current monster''s gold value directly.',
 '{"golden_click_pct": 0.05, "duration_seconds": 30}',
 'standard', 'individual', 60, 80, 1.15),

('The Dark Ritual', 'active',
 'Applies a +1.05x DPS multiplier that persists for the entire current Chapter. Resets on new Chapter.',
 '{"dark_ritual_multiplier": 1.05, "duration_seconds": -1}',
 'standard', 'individual', 90, 500, 1.20),

('Super Clicks', 'active',
 '+200% click damage for 30 seconds.',
 '{"click_damage_bonus": 2.0, "duration_seconds": 30}',
 'standard', 'individual', 45, 120, 1.15),

('Energize', 'active',
 'The next skill activated deals double its stated effect.',
 '{"energize_multiplier": 2.0, "duration_seconds": -1}',
 'standard', 'global', 60, 150, 1.15),

('Reload', 'active',
 'Reduces the cooldown of the last used skill by 50%.',
 '{"reload_pct": 0.50, "duration_seconds": -1}',
 'standard', 'global', 30, 100, 1.15)
ON CONFLICT DO NOTHING;

-- 8. Additional game_configs seeds
INSERT INTO game_configs (key, value_json, description) VALUES
('base_auto_dps_tick_ms', '500',
 'Interval in milliseconds at which auto-DPS is applied on the client. Server validates via batch tick.'),
('default_player_wpm', '200',
 'Default words-per-minute for narrative delay calculations when no user preference is set.'),
('boss_enrage_seconds', '30',
 'Seconds before a zone boss enrages and deals massive damage.'),
('primal_boss_chance', '0.25',
 'Probability (0.0-1.0) that a boss zone spawns a Primal Boss (extra Essence reward).')
ON CONFLICT (key) DO NOTHING;

COMMIT;
