-- 068_banner_scaling_configs.sql
-- Banner wave scaling game_configs for BottomAnimatedBanner adaptive enemy counts

INSERT INTO game_configs (key, value_json, category, description) VALUES
('banner_base_enemies', '1'::jsonb, 'banner', 'Minimum enemies on screen in banner'),
('banner_max_enemies', '15'::jsonb, 'banner', 'Maximum enemies on screen in banner'),
('banner_enemies_per_level', '0.15'::jsonb, 'banner', 'Additional enemies per character level'),
('banner_death_base_rate', '0.03'::jsonb, 'banner', 'Base death probability per combat cycle'),
('banner_death_reduction_per_level', '0.0003'::jsonb, 'banner', 'Death rate reduction per character level'),
('banner_death_floor', '0.002'::jsonb, 'banner', 'Minimum death rate (never zero)'),
('banner_kill_speed_base_ms', '3000'::jsonb, 'banner', 'Base time to kill at level 1 (ms)'),
('banner_kill_speed_min_ms', '200'::jsonb, 'banner', 'Minimum kill time floor (ms)'),
('banner_spawn_rate_base', '0.05'::jsonb, 'banner', 'Spawn probability per tick (walking)'),
('banner_spawn_rate_combat', '0.01'::jsonb, 'banner', 'Spawn probability per tick (fighting)')
ON CONFLICT (key) DO NOTHING;
