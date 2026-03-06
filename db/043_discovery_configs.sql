-- Migration 043: Discovery game_configs seeds (2.6.2)

INSERT INTO game_configs (key, category, value_json, description) VALUES
('codex_rank_e', 'discovery', '1', 'Kills required for Codex Rank E (name + image + basic lore)'),
('codex_rank_c', 'discovery', '25', 'Kills required for Codex Rank C (base HP + gold drops)'),
('codex_rank_a', 'discovery', '100', 'Kills required for Codex Rank A (full stat block)'),
('codex_rank_ss', 'discovery', '500', 'Kills required for Codex Rank SS (hidden lore + completion badge)'),
('rare_spawn_base_chance', 'discovery', '0.005', 'Base probability (0.5%) per wave for a rare entity spawn')
ON CONFLICT (key) DO NOTHING;
