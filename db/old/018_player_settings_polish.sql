-- Migration 018: Player Settings Polish
-- Purpose: Adds granular UI/Narration scaling settings and first-clear bonus config.

BEGIN;

-- 1. Add new columns to player_settings
ALTER TABLE player_settings ADD COLUMN IF NOT EXISTS narration_font_size INTEGER DEFAULT 14;
ALTER TABLE player_settings ADD COLUMN IF NOT EXISTS narration_block_height INTEGER DEFAULT 50;
ALTER TABLE player_settings ADD COLUMN IF NOT EXISTS ui_scale FLOAT DEFAULT 1.0;
ALTER TABLE player_settings ADD COLUMN IF NOT EXISTS game_text_scale FLOAT DEFAULT 1.0;

-- 2. Add first_clear_multiplier to game_configs
INSERT INTO game_configs (key, value_json, description) VALUES
('first_clear_multiplier', '1.5', 'Multiplier applied to Essence rewards for the first time a scene is completed.')
ON CONFLICT (key) DO NOTHING;

COMMIT;
