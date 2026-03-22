"""Game config constants and scaling formula functions.

All formulas sourced from docs/SIM_PROC_BAL_SESSION_STATE.md.
"""
import json
import math
import os

# ---------------------------------------------------------------------------
# Default game_configs table values
# ---------------------------------------------------------------------------

DEFAULT_CONFIGS = {
    'hp_scaling_factor': 1.55,
    'monsters_per_zone': 10,
    'gold_to_essence_base_rate': 1000,
    'gold_to_essence_growth_factor': 1.07,
    'upgrade_cost_scaling': 1.07,
    'click_dmg_mult_per_level': 0.05,
    'auto_dps_mult_per_level': 0.05,
    'crit_chance': 0.02,
    'crit_multiplier': 2.0,
    'char_level_xp_factor': 1000,
    'char_xp_per_scene_base': 50,
    'idle_essence_drain_per_minute': 1,
    'idle_offline_cap_hours': 24,
    'session_gold_multiplier': 1.0,
    'first_clear_multiplier': 1.5,
    'default_player_wpm': 200,
    'wave_duration_seconds': 30,
    'milestone_start': 200,
    'milestone_interval': 25,
    'click_rate_cap': 20,
}

# ---------------------------------------------------------------------------
# Config loading helpers
# ---------------------------------------------------------------------------

def load_config_overrides(path: str) -> dict:
    """Load JSON overrides from path and merge with DEFAULT_CONFIGS.

    Returns a new dict with defaults overridden by the values in the file.
    """
    config = dict(DEFAULT_CONFIGS)
    with open(path, 'r', encoding='utf-8') as f:
        overrides = json.load(f)
    config.update(overrides)
    return config


def load_profile(name: str) -> dict:
    """Load a player profile JSON from profiles/<name>.json.

    Resolves relative to this file's directory.
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    profile_path = os.path.join(base_dir, 'profiles', f'{name}.json')
    with open(profile_path, 'r', encoding='utf-8') as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Scaling formula functions
# ---------------------------------------------------------------------------

def zone_hp(zone: int, scaling_factor: float = 1.55) -> float:
    """Monster HP for a given zone.

    Formula: 10 * (scaling_factor^(zone-1) + zone - 1)
    """
    return 10 * (scaling_factor ** (zone - 1) + zone - 1)


def zone_gold(zone: int) -> float:
    """Gold per kill for a given zone.

    Formula: 5 * (1.1^(zone-1) + zone - 1)
    """
    return 5 * (1.1 ** (zone - 1) + zone - 1)


def essence_conversion(session_gold: float, zone: int) -> float:
    """Convert session gold to essence for a given zone.

    Formula: session_gold / (1000 * 1.07^(zone-1))
    """
    return session_gold / (1000 * (1.07 ** (zone - 1)))


def click_damage(level: int, base_mult_per_level: float = 0.05) -> float:
    """Click damage multiplier for a given character level.

    Formula: 1 + (level * base_mult_per_level)
    """
    return 1.0 + (level * base_mult_per_level)


def milestone_multiplier(level: int, start: int = 200, interval: int = 25) -> float:
    """Milestone damage multiplier.

    Returns 4^((level-start)//interval + 1) if level >= start,
    multiplied by 10^(level//1000) if level >= 1000.
    Returns 1.0 below milestone start.
    """
    if level < start:
        return 1.0
    base = 4 ** ((level - start) // interval + 1)
    tier_bonus = 10 ** (level // 1000) if level >= 1000 else 1
    return float(base * tier_bonus)


def upgrade_cost(base_cost: float, level: int, scaling: float = 1.07) -> float:
    """Cost for the next upgrade at the given level.

    Formula: base_cost * scaling^(level-1)
    """
    return base_cost * (scaling ** (level - 1))


def xp_to_level(n: int, factor: int = 1000) -> int:
    """XP required to reach level N.

    Formula: factor * N^2
    """
    return factor * n * n


def idle_xp_per_hour(tick_interval_s: float, xp_per_tick: float) -> float:
    """Idle XP accumulated per hour.

    Formula: (3600 / tick_interval_s) * xp_per_tick
    """
    return (3600 / tick_interval_s) * xp_per_tick


def time_to_kill(hp: float, dps: float) -> float:
    """Time in seconds to kill a monster.

    Formula: hp / dps. Returns math.inf if dps <= 0.
    """
    if dps <= 0:
        return math.inf
    return hp / dps
