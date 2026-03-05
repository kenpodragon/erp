-- Migration 014: Skill and Configuration Refinement
-- Purpose: Supports global/individual cooldowns, narrative sync, and additional game balancing.

BEGIN;

-- 1. Add cooldown and cost columns to skills table
ALTER TABLE skills ADD COLUMN IF NOT EXISTS cooldown_type VARCHAR(20) DEFAULT 'individual'; -- 'global' or 'individual'
ALTER TABLE skills ADD COLUMN IF NOT EXISTS base_cooldown_seconds INTEGER DEFAULT 30;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS base_cost_gold NUMERIC DEFAULT 100;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS cost_scaling_factor NUMERIC DEFAULT 1.15;

-- 2. Create Scene Audio Sync Table
-- Maps audio timestamps to specific text assets (PNGs) and paragraphs.
CREATE TABLE IF NOT EXISTS scene_audio_sync (
    id SERIAL PRIMARY KEY,
    scene_id INTEGER NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    timestamp_seconds INTEGER NOT NULL,
    asset_key VARCHAR(255) NOT NULL, -- The PNG filename/key
    paragraph_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(scene_id, timestamp_seconds)
);

-- 3. Seed additional game configurations
INSERT INTO game_configs (key, value_json, description) VALUES
('crit_multiplier', '2.0', 'Default damage multiplier for critical hits.'),
('wave_duration_seconds', '30', 'Seconds of audio duration required per monster wave.')
ON CONFLICT (key) DO NOTHING;

COMMIT;
