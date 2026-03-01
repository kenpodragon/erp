-- Add granular roles to the players table
-- is_owner: Full system and game powers. Only settable via direct DB access.
-- is_system_admin: Access to Admin Panel (config, users, support).
-- is_game_admin: Special in-game powers (e.g. teleport, moderate chat). No admin panel access.

ALTER TABLE players ADD COLUMN IF NOT EXISTS is_owner BOOLEAN DEFAULT FALSE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_system_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_game_admin BOOLEAN DEFAULT FALSE;

-- Optional: Create an index for faster lookups during auth
CREATE INDEX IF NOT EXISTS idx_players_roles ON players (is_owner, is_system_admin, is_game_admin);
