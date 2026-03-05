-- Add sessions_invalid_before column to players table for Force Logout functionality
ALTER TABLE players ADD COLUMN IF NOT EXISTS sessions_invalid_before TIMESTAMPTZ;
