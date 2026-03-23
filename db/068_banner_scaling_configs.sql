-- 068_banner_scaling_configs.sql
-- Banner wave scaling game_configs for BottomAnimatedBanner adaptive enemy counts

INSERT INTO game_configs (key, value, category, description) VALUES
('banner_base_enemies', '1', 'banner', 'Minimum enemies on screen in banner'),
('banner_max_enemies', '15', 'banner', 'Maximum enemies on screen in banner'),
('banner_enemies_per_level', '0.15', 'banner', 'Additional enemies per character level'),
('banner_death_base_rate', '0.03', 'banner', 'Base death probability per combat cycle'),
('banner_death_reduction_per_level', '0.0003', 'banner', 'Death rate reduction per character level'),
('banner_death_floor', '0.002', 'banner', 'Minimum death rate (never zero)'),
('banner_kill_speed_base_ms', '3000', 'banner', 'Base time to kill at level 1 (ms)'),
('banner_kill_speed_min_ms', '200', 'banner', 'Minimum kill time floor (ms)'),
('banner_spawn_rate_base', '0.05', 'banner', 'Spawn probability per tick (walking)'),
('banner_spawn_rate_combat', '0.01', 'banner', 'Spawn probability per tick (fighting)')
ON CONFLICT (key) DO NOTHING;
