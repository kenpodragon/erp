-- 012_standardize_scene_durations.sql
-- Ensure all scenes have a standardized 300-second duration and update defaults.

BEGIN;

-- 1. Update the default value for future records
ALTER TABLE scene_gameplay_data ALTER COLUMN required_time_seconds SET DEFAULT 300;

-- 2. Ensure every existing scene has a gameplay data record
INSERT INTO scene_gameplay_data (scene_id, required_time_seconds, background_sprite_key)
SELECT id, 300, 'bg_default'
FROM scenes
ON CONFLICT (scene_id) DO NOTHING;

-- 3. Update all existing records to 300 seconds
UPDATE scene_gameplay_data SET required_time_seconds = 300;

COMMIT;
