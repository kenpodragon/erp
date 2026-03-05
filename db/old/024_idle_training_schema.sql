-- Migration 024: Core Idle Training Schema
-- Covers changes to support 2.3 Idle Training

-- 1. New Table: skill_actions
CREATE TABLE IF NOT EXISTS skill_actions (
    id                  SERIAL PRIMARY KEY,
    skill_id            INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    name                VARCHAR(100) NOT NULL,            -- snake_case key (e.g., 'shadowboxing_garage')
    display_name        VARCHAR(150) NOT NULL,            -- Human-readable (e.g., 'Shadowboxing in the Garage')
    lore_description    TEXT NOT NULL,                    -- Flavor text shown on hover/tap
    level_required      INTEGER NOT NULL DEFAULT 1,       -- Minimum skill level to train this action
    interval_ms         INTEGER NOT NULL DEFAULT 3000,    -- Base time per action in milliseconds
    xp_per_action       INTEGER NOT NULL DEFAULT 10,      -- XP granted per completed action
    sort_order          INTEGER NOT NULL DEFAULT 0,       -- Display order within the skill (ascending)
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(skill_id, name)
);

-- 2. Modify character_skill_levels
ALTER TABLE character_skill_levels
    ADD COLUMN IF NOT EXISTS active_action_id       INTEGER REFERENCES skill_actions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS action_started_at      TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS is_active_training     BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_in_active_mode      BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS active_mode_started_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS last_offline_calc_at   TIMESTAMP WITH TIME ZONE;

-- Constraint to enforce one-at-a-time training
CREATE UNIQUE INDEX IF NOT EXISTS uix_character_one_active_training
    ON character_skill_levels (character_id)
    WHERE is_active_training = TRUE;

-- 3. Modify skills
ALTER TABLE skills
    ADD COLUMN IF NOT EXISTS unlock_scene_id        INTEGER REFERENCES scenes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS unlock_display_text    TEXT,
    ADD COLUMN IF NOT EXISTS idle_flavor_title      VARCHAR(100);

-- 4. New Game Config Seeds
INSERT INTO game_configs (key, value_json, description) VALUES
    ('idle_offline_cap_hours',
     '24',
     'Maximum offline training hours calculated on player return. Progress beyond this cap is discarded.'),

    ('idle_essence_drain_per_minute',
     '1',
     'Elysium Essence drained per minute of active idle training. Configurable for economy balance.'),

    ('idle_essence_xp_full_threshold',
     '0.75',
     'Essence % (0.0-1.0) above which XP is earned at 100% rate.'),

    ('idle_essence_xp_mid_threshold',
     '0.40',
     'Essence % (0.0-1.0) above which XP is earned at 75% rate (below full threshold).'),

    ('idle_essence_xp_low_threshold',
     '0.15',
     'Essence % (0.0-1.0) above which XP is earned at 50% rate (below mid threshold).'),

    ('idle_essence_xp_critical_threshold',
     '0.01',
     'Essence % (0.0-1.0) above which XP is earned at 25% rate (below low threshold). Below this = 10% floor.'),

    ('idle_essence_xp_floor_rate',
     '0.10',
     'Minimum XP rate multiplier when Essence is at 0%. Training never fully halts.'),

    ('idle_active_mode_boss_interval',
     '10',
     'Number of waves between boss spawns in the Idle Training Active Mode mini-game.')
ON CONFLICT (key) DO NOTHING;
