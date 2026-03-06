-- Migration 041: Anti-Cheat game_configs seeds (2.6.0-2.6.1)

INSERT INTO game_configs (key, category, value_json, description) VALUES
('wave_validation_tolerance', 'anti-cheat', '2.0', 'Multiplier buffer on theoretical DPS ceiling for wave validation'),
('session_gold_tolerance', 'anti-cheat', '3.0', 'Multiplier buffer for session gold plausibility at /complete'),
('cps_warning_threshold_seconds', 'anti-cheat', '5', 'Seconds of sustained CPS violations before UI toast warning'),
('cps_warning_cooldown_seconds', 'anti-cheat', '10', 'Seconds of valid CPS before clearing warning state')
ON CONFLICT (key) DO NOTHING;
