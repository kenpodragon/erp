"""Validate math model produces correctly structured output."""

import math
import sys
import os

import pytest

# Ensure parent dir is on path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from math_model import run_simulation
from config import DEFAULT_CONFIGS


# ---------------------------------------------------------------------------
# Structure tests
# ---------------------------------------------------------------------------

def test_simulation_output_has_required_sections():
    result = run_simulation("casual", DEFAULT_CONFIGS)
    assert "zone_progression" in result
    assert "economy_flow" in result
    assert "xp_curve" in result
    assert "content_timeline" in result
    assert "wall_detection" in result
    assert "min_power_gates" in result
    assert "boss_dps_checks" in result
    assert "summary" in result


def test_zone_progression_has_entries():
    result = run_simulation("casual", DEFAULT_CONFIGS)
    zones = result["zone_progression"]
    assert len(zones) == 140
    first = zones[0]
    assert "zone" in first
    assert "hp" in first
    assert "gold_per_kill" in first
    assert "time_to_kill_seconds" in first
    assert "gold_per_minute" in first


def test_zone_progression_monotonic_hp():
    """HP should increase monotonically across zones."""
    result = run_simulation("casual", DEFAULT_CONFIGS)
    zones = result["zone_progression"]
    for i in range(1, len(zones)):
        assert zones[i]["hp"] >= zones[i - 1]["hp"], (
            f"HP decreased from zone {zones[i-1]['zone']} to {zones[i]['zone']}"
        )


def test_wall_detection_flags_hard_zones():
    result = run_simulation("no_autoskills", DEFAULT_CONFIGS)
    walls = result["wall_detection"]
    assert isinstance(walls, list)


def test_summary_has_completion_estimate():
    result = run_simulation("casual", DEFAULT_CONFIGS)
    summary = result["summary"]
    assert "total_hours_estimate" in summary
    assert "book_1_hours" in summary
    assert "book_2_hours" in summary
    assert "book_3_hours" in summary
    assert "walls_detected" in summary
    assert "hardest_boss" in summary


# ---------------------------------------------------------------------------
# Economy tests
# ---------------------------------------------------------------------------

def test_economy_flow_has_entries():
    result = run_simulation("casual", DEFAULT_CONFIGS)
    econ = result["economy_flow"]
    assert len(econ) == 140
    first = econ[0]
    assert "zone" in first
    assert "gold_per_minute" in first
    assert "essence_per_scene" in first
    assert "scenes_to_next_upgrade" in first


# ---------------------------------------------------------------------------
# XP curve tests
# ---------------------------------------------------------------------------

def test_xp_curve_has_all_modes():
    result = run_simulation("casual", DEFAULT_CONFIGS)
    xp = result["xp_curve"]
    assert "active_only" in xp
    assert "idle_only" in xp
    assert "mixed" in xp
    assert len(xp["active_only"]) > 0
    assert len(xp["mixed"]) > 0


def test_idle_only_profile_has_no_active_xp():
    """Idle-only profile should have infinite active XP times."""
    result = run_simulation("idle_only", DEFAULT_CONFIGS)
    active = result["xp_curve"]["active_only"]
    for entry in active:
        assert entry["hours"] == math.inf or entry["hours"] > 1e6


# ---------------------------------------------------------------------------
# Content timeline tests
# ---------------------------------------------------------------------------

def test_content_timeline_has_wpm_variants():
    result = run_simulation("casual", DEFAULT_CONFIGS)
    ct = result["content_timeline"]
    assert "wpm_150" in ct
    assert "wpm_200" in ct
    assert "wpm_300" in ct
    assert "wpm_600" in ct


def test_faster_wpm_means_less_reading():
    result = run_simulation("casual", DEFAULT_CONFIGS)
    ct = result["content_timeline"]
    assert ct["wpm_600"]["total_reading_hours"] < ct["wpm_150"]["total_reading_hours"]


# ---------------------------------------------------------------------------
# Boss tests
# ---------------------------------------------------------------------------

def test_boss_dps_checks_have_entries():
    result = run_simulation("casual", DEFAULT_CONFIGS)
    checks = result["boss_dps_checks"]
    assert len(checks) == 30  # 3 books x 10 chapters
    first = checks[0]
    assert "boss" in first
    assert "hp" in first
    assert "enrage_seconds" in first
    assert "min_dps" in first
    assert "min_cps_at_level" in first


def test_min_power_gates_have_entries():
    result = run_simulation("casual", DEFAULT_CONFIGS)
    gates = result["min_power_gates"]
    assert len(gates) == 30
    first = gates[0]
    assert "boss" in first
    assert "min_level" in first
    assert "min_dps" in first
    assert "required_skills" in first


# ---------------------------------------------------------------------------
# Profile variation tests
# ---------------------------------------------------------------------------

def test_power_gamer_fewer_ttk_walls_than_new_user():
    """Power gamer should encounter fewer/equal TTK walls than a new user."""
    pg = run_simulation("power_gamer", DEFAULT_CONFIGS)
    nu = run_simulation("new_user", DEFAULT_CONFIGS)
    pg_ttk = len([w for w in pg["wall_detection"] if w["type"] == "ttk_spike"])
    nu_ttk = len([w for w in nu["wall_detection"] if w["type"] == "ttk_spike"])
    assert pg_ttk <= nu_ttk


def test_all_profiles_run_without_error():
    """Smoke test: every profile produces valid output."""
    profiles = ["casual", "power_gamer", "new_user", "idle_only", "no_autoskills"]
    for p in profiles:
        result = run_simulation(p, DEFAULT_CONFIGS)
        assert result["profile"] == p
        assert len(result["zone_progression"]) == 140
        assert "summary" in result
