-- Migration 019: Game Configs Expansion
-- Purpose: Move hardcoded combat and upgrade constants to the database.

BEGIN;

INSERT INTO game_configs (key, value_json, description) VALUES
('monsters_per_zone', '10', 'Number of minions to defeat before a boss or zone completion.'),
('boss_zone_interval', '5', 'Every Nth zone is a boss zone.'),
('crit_chance', '0.02', 'Base probability (0.0-1.0) of a critical hit.'),
('auto_dps_tick_ms', '500', 'Interval in milliseconds between auto-damage applications.'),
('gcd_ms', '1000', 'Global Cooldown in milliseconds after using any active skill.'),
('upgrade_cost_scaling', '1.07', 'Exponential cost multiplier per upgrade level (1.07^L).'),
('cd_reduction_per_level', '0.05', 'Cooldown reduction percentage per skill level.'),
('max_cd_reduction', '0.7', 'Maximum possible cooldown reduction (e.g. 0.7 = 70% off).'),
('base_click_upgrade_cost', '10.0', 'Base gold cost for Click Damage level 1.'),
('base_auto_dps_upgrade_cost', '25.0', 'Base gold cost for Auto-DPS level 1.'),
('base_skill_unlock_cost', '50.0', 'Base gold cost to unlock a skill (multiplied by skill base cost).'),
('base_skill_level_upgrade_cost', '100.0', 'Base gold cost to upgrade an unlocked skill.'),
('milestone_interval', '25', 'Levels between big damage multiplier spikes.'),
('milestone_start', '200', 'Level at which damage multiplier spikes begin.'),
('click_dmg_mult_per_level', '0.05', 'Base multiplier added per Click Damage level (e.g. 0.05 = +5%).'),
('auto_dps_mult_per_level', '0.05', 'Base multiplier added per Auto-DPS level (e.g. 0.05 = +5%).')
ON CONFLICT (key) DO UPDATE SET 
    value_json = EXCLUDED.value_json,
    description = EXCLUDED.description;

COMMIT;
