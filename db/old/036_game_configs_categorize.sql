-- ============================================================================
-- 036: Categorize uncategorized game_configs + insert missing economy configs
-- ============================================================================

-- Insert missing economy configs
INSERT INTO game_configs (key, value_json, description, category, game_impact) VALUES
('gold_to_essence_base_rate', '1000', 'The initial amount of gold required to earn 1 unit of Essence at Zone 1.', 'economy', 'Economy conversion rate. Affects post-run Essence rewards.'),
('gold_to_essence_growth_factor', '1.07', 'The exponential growth of the conversion rate per zone.', 'economy', 'Economy scaling. Higher values make Essence harder to earn in later zones.')
ON CONFLICT (key) DO NOTHING;

-- Categorize combat configs
UPDATE game_configs SET category = 'combat', game_impact = 'Combat timing and feel.'
WHERE key IN (
    'click_rate_cap', 'crit_chance', 'crit_multiplier', 'gcd_ms',
    'wave_duration_seconds', 'boss_enrage_seconds', 'boss_zone_interval',
    'monsters_per_zone', 'primal_boss_chance', 'hp_scaling_factor',
    'auto_dps_tick_ms', 'base_auto_dps_tick_ms'
) AND category IS NULL;

-- Categorize economy configs
UPDATE game_configs SET category = 'economy', game_impact = 'Session reward scaling.'
WHERE key IN ('session_gold_multiplier', 'first_clear_multiplier')
AND category IS NULL;

-- Categorize upgrade configs
UPDATE game_configs SET category = 'upgrades', game_impact = 'In-session upgrade cost and power scaling.'
WHERE key IN (
    'upgrade_cost_scaling', 'base_click_upgrade_cost', 'base_auto_dps_upgrade_cost',
    'base_skill_unlock_cost', 'base_skill_level_upgrade_cost',
    'click_dmg_mult_per_level', 'auto_dps_mult_per_level',
    'milestone_interval', 'milestone_start',
    'cd_reduction_per_level', 'max_cd_reduction'
) AND category IS NULL;

-- Categorize training config
UPDATE game_configs SET category = 'training', game_impact = 'Idle training tuning.'
WHERE key = 'idle_essence_capacity' AND category IS NULL;

-- Categorize UI config
UPDATE game_configs SET category = 'ui', game_impact = 'Player experience / UI defaults.'
WHERE key = 'default_player_wpm' AND category IS NULL;
