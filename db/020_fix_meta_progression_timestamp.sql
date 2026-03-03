-- Migration 020: Fix Meta Progression Timestamp
-- Purpose: Rename last_updated_at to updated_at to match the generic update_timestamp_column() trigger.

BEGIN;

-- 1. Rename the column
ALTER TABLE player_meta_progression RENAME COLUMN last_updated_at TO updated_at;

-- 2. Ensure the trigger is correctly mapped (already done in 013, but good to be safe)
DROP TRIGGER IF EXISTS update_player_meta_progression_modtime ON player_meta_progression;
CREATE TRIGGER update_player_meta_progression_modtime 
    BEFORE UPDATE ON player_meta_progression 
    FOR EACH ROW 
    EXECUTE PROCEDURE update_timestamp_column();

COMMIT;
