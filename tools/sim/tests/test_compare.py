"""Validate comparison tool logic."""
import json
import os
import tempfile
import pytest


def test_compare_module_imports():
    from tools.sim.results import compare


def test_config_diff_detects_changes():
    from tools.sim.results.compare import diff_configs

    config_a = {"hp_scaling_factor": 1.55, "crit_chance": 0.02, "crit_multiplier": 2.0}
    config_b = {"hp_scaling_factor": 1.60, "crit_chance": 0.02, "crit_multiplier": 2.5}

    diffs = diff_configs(config_a, config_b)
    assert len(diffs) == 2  # hp_scaling_factor and crit_multiplier changed
    changed_keys = {d["key"] for d in diffs}
    assert "hp_scaling_factor" in changed_keys
    assert "crit_multiplier" in changed_keys
    assert "crit_chance" not in changed_keys


def test_summary_diff_calculates_deltas():
    from tools.sim.results.compare import diff_summaries

    summary_a = {"total_hours_estimate": 80.0, "book_1_hours": 20.0, "total_gold": 10000}
    summary_b = {"total_hours_estimate": 65.0, "book_1_hours": 18.0, "total_gold": 12000}

    diffs = diff_summaries(summary_a, summary_b, profile="casual")
    assert len(diffs) == 3

    hours_diff = next(d for d in diffs if d["field"] == "total_hours_estimate")
    assert hours_diff["baseline"] == 80.0
    assert hours_diff["candidate"] == 65.0
    assert hours_diff["delta"] == -15.0
    assert abs(hours_diff["pct_change"] - (-18.75)) < 0.01


def test_severity_flags():
    from tools.sim.results.compare import severity

    # > 10% = MAJOR
    assert severity(12.0) == "MAJOR"
    assert severity(-12.0) == "MAJOR"
    # 5-10% = significant
    assert severity(7.0) == "significant"
    # < 5% = empty string
    assert severity(3.0) == ""
    assert severity(0.0) == ""


def test_pct_change():
    from tools.sim.results.compare import pct_change

    assert abs(pct_change(80.0, 65.0) - (-18.75)) < 0.01
    assert pct_change(0, 10) is None  # division by zero


def test_verdict_toward_target():
    """Moving total_hours closer to 60 is an improvement for casual."""
    from tools.sim.results.compare import compute_verdict

    # 80 → 65: closer to 60 = improved
    verdict = compute_verdict(
        {"total_hours_estimate": 80.0},
        {"total_hours_estimate": 65.0},
        profile="casual",
    )
    assert verdict["overall"] == "improved"

    # 50 → 45: further from 60 = regressed
    verdict = compute_verdict(
        {"total_hours_estimate": 50.0},
        {"total_hours_estimate": 45.0},
        profile="casual",
    )
    assert verdict["overall"] == "regressed"


def test_compare_full_files():
    """End-to-end: compare two mock result files written to temp."""
    from tools.sim.results.compare import compare

    run_a = {
        "profile": "casual",
        "config": {"hp_scaling_factor": 1.55},
        "summary": {"total_hours_estimate": 80.0, "book_1_hours": 20.0},
    }
    run_b = {
        "profile": "casual",
        "config": {"hp_scaling_factor": 1.50},
        "summary": {"total_hours_estimate": 62.0, "book_1_hours": 16.0},
    }

    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f1:
        json.dump(run_a, f1)
        path_a = f1.name
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f2:
        json.dump(run_b, f2)
        path_b = f2.name

    try:
        result = compare(path_a, path_b)
        assert "config_diff" in result
        assert "summary_diff" in result
        assert "verdict" in result
        # config should show hp_scaling_factor changed
        config_keys = {d["key"] for d in result["config_diff"]}
        assert "hp_scaling_factor" in config_keys
    finally:
        os.unlink(path_a)
        os.unlink(path_b)
