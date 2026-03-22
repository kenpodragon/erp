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
    # Scene-based HP scaling (current server implementation)
    'scene_hp_scaling_base': 1.012,       # HP multiplier per scene position
    'avg_entity_base_hp': 20.0,           # Average entity base HP (range: 5-80)
    'max_scene_base_hp': 500.0,           # Safety cap on scene base HP
    # Legacy zone HP formula (kept for reference, NOT used by server)
    'hp_scaling_factor': 1.55,
    'monsters_per_zone': 10,
    # Gold & economy
    'scene_gold_scaling_base': 1.008,     # Gold multiplier per scene position
    'avg_entity_base_gold': 8.0,          # Average entity base gold (range: 2-32)
    'gold_to_essence_base_rate': 1000,
    'gold_to_essence_growth_factor': 1.07,
    'upgrade_cost_scaling': 1.07,
    'session_gold_multiplier': 1.0,
    'first_clear_multiplier': 1.5,
    # Combat
    'click_dmg_mult_per_level': 0.05,
    'auto_dps_mult_per_level': 0.05,
    'crit_chance': 0.02,
    'crit_multiplier': 2.0,
    'click_rate_cap': 20,
    'milestone_start': 200,
    'milestone_interval': 25,
    # Progression
    'char_level_xp_factor': 1000,
    'char_xp_per_scene_base': 50,
    # Idle training
    'idle_essence_drain_per_minute': 1,
    'idle_offline_cap_hours': 24,
    # Narrative
    'default_player_wpm': 200,
    'wave_duration_seconds': 30,
}

# ---------------------------------------------------------------------------
# Config loading helpers
# ---------------------------------------------------------------------------

def load_config_overrides(path: str) -> dict:
    """Load JSON overrides from path and merge with DEFAULT_CONFIGS.

    Supports two JSON formats:
    - Flat: {"hp_scaling_factor": 1.45, ...}
    - Nested: {"description": "...", "overrides": {"hp_scaling_factor": 1.45}}

    Returns a new dict with defaults overridden by the values in the file.
    """
    config = dict(DEFAULT_CONFIGS)
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    # Support nested format (from migration generator / toolkit guide)
    overrides = data.get('overrides', data) if isinstance(data, dict) else data
    # Only apply known config keys (skip metadata like description, run_ids)
    for key, value in overrides.items():
        if key in DEFAULT_CONFIGS or key.startswith(('scene_', 'avg_', 'max_')):
            config[key] = value
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
    """Monster HP for a given zone (LEGACY formula).

    Formula: 10 * (scaling_factor^(zone-1) + zone - 1)
    NOTE: Server now uses scene_hp() instead. Kept for backwards compat.
    """
    return 10 * (scaling_factor ** (zone - 1) + zone - 1)


def scene_hp(scene_pos: int, base_hp: float = 20.0,
             scaling_base: float = 1.012, cap: float = 500.0) -> float:
    """Monster HP for a given scene position (CURRENT server formula).

    Formula: min(base_hp * scaling_base^(scene_pos-1), cap)
    This matches the /enemies endpoint implementation.
    """
    hp = base_hp * (scaling_base ** (scene_pos - 1))
    return min(hp, cap)


def zone_gold(zone: int) -> float:
    """Gold per kill for a given zone (LEGACY formula).

    Formula: 5 * (1.1^(zone-1) + zone - 1)
    NOTE: Server now uses scene_gold() instead. Kept for backwards compat.
    """
    return 5 * (1.1 ** (zone - 1) + zone - 1)


def scene_gold(scene_pos: int, base_gold: float = 8.0,
               scaling_base: float = 1.008) -> float:
    """Gold per kill for a given scene position (CURRENT server formula).

    Formula: base_gold * scaling_base^(scene_pos-1)
    """
    return base_gold * (scaling_base ** (scene_pos - 1))


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
