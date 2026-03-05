-- Migration 013: Story Mode Session and Configuration State
-- Purpose: Supports Loop B active gameplay, session persistence, and dynamic game configuration.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Global Game Configuration Table
-- Stores admin-tunable settings like click caps, HP scaling factors, and drop rates.
CREATE TABLE IF NOT EXISTS game_configs (
    key VARCHAR(100) PRIMARY KEY,
    value_json JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial critical configurations
INSERT INTO game_configs (key, value_json, description) VALUES
('click_rate_cap', '20', 'Maximum allowed clicks per second before flagging/throttling.'),
('hp_scaling_factor', '1.55', 'The exponential base for monster HP scaling across zones.'),
('session_gold_multiplier', '1.0', 'Global multiplier for session gold drops.'),
('primal_boss_chance', '0.25', 'Probability (0.0-1.0) of a boss being Primal (Essence reward).')
ON CONFLICT (key) DO NOTHING;

-- 2. Player Story Session Table
-- Tracks active progress in a story scene, allowing for "Continue" functionality.
CREATE TABLE IF NOT EXISTS player_story_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    scene_id INTEGER REFERENCES scenes(id),
    chapter_id INTEGER, -- Denormalized for easy Dark Ritual lookup
    current_zone INT DEFAULT 1,
    current_wave INT DEFAULT 1,
    session_gold NUMERIC DEFAULT 0,
    dark_ritual_multiplier NUMERIC DEFAULT 1.0, -- Persists across chapter
    audio_progress_pct NUMERIC DEFAULT 0, -- 0.0 to 100.0
    required_waves_finished BOOLEAN DEFAULT FALSE,
    audio_finished BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Session-Specific Upgrades
-- Tracks temporary click damage and auto-dps upgrades purchased with session gold.
CREATE TABLE IF NOT EXISTS session_upgrades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES player_story_sessions(id) ON DELETE CASCADE,
    upgrade_type VARCHAR(50) NOT NULL, -- 'click_dmg', 'auto_dps', 'skill_unlock', 'skill_level'
    target_id INTEGER, -- If skill_level, reference to the skills.id (INTEGER)
    level INT DEFAULT 0,
    total_cost_paid NUMERIC DEFAULT 0,
    current_multiplier NUMERIC DEFAULT 1.0
);

-- 4. Meta-Progression (Elysium Essence)
-- Stores permanent meta-currency earned from Story Mode.
CREATE TABLE IF NOT EXISTS player_meta_progression (
    player_id INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    elysium_essence NUMERIC DEFAULT 0,
    total_essence_earned NUMERIC DEFAULT 0,
    spent_essence NUMERIC DEFAULT 0,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop triggers if they exist to allow re-runs
DROP TRIGGER IF EXISTS update_game_configs_modtime ON game_configs;
CREATE TRIGGER update_game_configs_modtime BEFORE UPDATE ON game_configs FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

DROP TRIGGER IF EXISTS update_player_story_sessions_modtime ON player_story_sessions;
CREATE TRIGGER update_player_story_sessions_modtime BEFORE UPDATE ON player_story_sessions FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

DROP TRIGGER IF EXISTS update_player_meta_progression_modtime ON player_meta_progression;
CREATE TRIGGER update_player_meta_progression_modtime BEFORE UPDATE ON player_meta_progression FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();

-- 6. View for Chapter-Wide Multipliers
-- Helper view to fetch the current Dark Ritual state for a player in a specific chapter.
CREATE OR REPLACE VIEW chapter_active_multipliers AS
SELECT 
    player_id, 
    chapter_id, 
    MAX(dark_ritual_multiplier) as max_ritual
FROM player_story_sessions
WHERE is_active = TRUE
GROUP BY player_id, chapter_id;
