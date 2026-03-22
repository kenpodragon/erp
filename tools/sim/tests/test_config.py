"""Validate scaling formulas match expected values from SIM_PROC_BAL_SESSION_STATE.md"""
import pytest
from config import (
    zone_hp, zone_gold, scene_hp, scene_gold, essence_conversion, click_damage,
    xp_to_level, DEFAULT_CONFIGS
)

def test_zone_hp_known_values():
    """Zone HP: 10 * (1.55^(zone-1) + zone - 1)

    NOTE: SIM_PROC_BAL_SESSION_STATE.md lists approximate values of 143/2063/253K
    for zones 5/10/20, but those are inconsistent with the stated formula.
    These tests use values derived directly from the formula, which is authoritative.
    """
    assert zone_hp(1) == 10        # 10 * (1.55^0 + 0) = 10 * 1 = 10
    assert abs(zone_hp(5) - 97.72) < 0.01   # 10 * (1.55^4 + 4) ≈ 97.72
    assert abs(zone_hp(10) - 606.4) < 0.1   # 10 * (1.55^9 + 9) ≈ 606.4
    assert abs(zone_hp(20) - 41523.5) < 1   # 10 * (1.55^19 + 19) ≈ 41523.5

def test_zone_gold_known_values():
    """Gold per kill: 5 * (1.1^(zone-1) + zone - 1)"""
    assert zone_gold(1) == 5  # 5 * (1 + 0)

def test_xp_to_level():
    """XP to level N = 1000 * N^2"""
    assert xp_to_level(10) == 100_000
    assert xp_to_level(50) == 2_500_000
    assert xp_to_level(99) == 9_801_000

def test_click_damage_base():
    """base_mult = 1 + (level * 0.05)"""
    assert click_damage(level=0) == 1.0
    assert click_damage(level=20) == 2.0
    assert click_damage(level=100) == 6.0

def test_scene_hp_known_values():
    """Scene HP: base_hp * scaling_base^(scene_pos-1), capped at max."""
    assert scene_hp(1) == 20.0          # 20 * 1.012^0 = 20
    assert abs(scene_hp(50) - 35.8) < 0.5  # 20 * 1.012^49 ≈ 35.8
    assert abs(scene_hp(100) - 65.1) < 0.5  # 20 * 1.012^99 ≈ 65.1
    assert scene_hp(1, base_hp=600, cap=500) == 500.0  # capped

def test_scene_gold_known_values():
    """Scene gold: base_gold * scaling_base^(scene_pos-1)."""
    assert scene_gold(1) == 8.0
    assert abs(scene_gold(100) - 17.5) < 0.5  # 8 * 1.008^99 ≈ 17.5

def test_default_configs_present():
    """All config keys from SIM_PROC_BAL_SESSION_STATE exist"""
    required = [
        'hp_scaling_factor', 'monsters_per_zone', 'gold_to_essence_base_rate',
        'gold_to_essence_growth_factor', 'upgrade_cost_scaling',
        'click_dmg_mult_per_level', 'crit_chance', 'crit_multiplier',
        'char_level_xp_factor', 'char_xp_per_scene_base',
        'idle_essence_drain_per_minute', 'idle_offline_cap_hours',
        'wave_duration_seconds', 'milestone_start', 'milestone_interval',
        'scene_hp_scaling_base', 'avg_entity_base_hp', 'max_scene_base_hp',
        'scene_gold_scaling_base', 'avg_entity_base_gold',
    ]
    for key in required:
        assert key in DEFAULT_CONFIGS, f"Missing config: {key}"
