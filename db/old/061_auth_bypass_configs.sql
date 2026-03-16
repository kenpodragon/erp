-- 061: Auth Bypass Configuration Keys
-- Adds server_config entries for the auth bypass (testing/dev) system.
-- Double-gated: requires ALLOW_AUTH_BYPASS=true in .env AND this DB toggle.

INSERT INTO server_config (key, value, value_type, category, description, default_value)
VALUES
  ('ops.auth_bypass_enabled', 'false', 'boolean', 'ops', 'Enable auth bypass for testing (also requires ALLOW_AUTH_BYPASS=true in .env)', 'false'),
  ('ops.auth_bypass_player_id', '', 'string', 'ops', 'Player ID to spoof when auth bypass is active (leave empty to require X-Spoof-Player-Id header)', '')
ON CONFLICT (key) DO NOTHING;
