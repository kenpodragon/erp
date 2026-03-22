"""Validate API bot behavior logic (decision-making, not API calls)."""
import json
import pytest


def test_bot_module_imports():
    """Bot module should be importable."""
    from tools.sim import api_bot


def test_bot_has_run_function():
    """Bot should expose an async run function."""
    import inspect
    from tools.sim.api_bot import run_bot
    assert inspect.iscoroutinefunction(run_bot)


def test_upgrade_strategy_buy_when_affordable():
    """buy_when_affordable: buys cheapest affordable upgrade.

    Internal cost = base * scaling^level.
    click_dmg base=10, level=0 → cost=10.0
    auto_dps base=25, level=0 → cost=25.0
    """
    from tools.sim.api_bot import pick_upgrade

    upgrades = {
        "click_dmg": {"level": 0},
        "auto_dps": {"level": 0},
    }
    # With 15 gold: click_dmg costs 10, auto_dps costs 25 → buy click_dmg
    result = pick_upgrade("buy_when_affordable", upgrades, gold=15)
    assert result is not None
    assert result["upgrade_type"] == "click_dmg"

    # With 5 gold, can't afford anything (cheapest is 10)
    result = pick_upgrade("buy_when_affordable", upgrades, gold=5)
    assert result is None


def test_upgrade_strategy_optimal():
    """optimal: buys best DPS-per-gold upgrade.

    Both use same dps_gain (0.05), so it picks the cheaper one (click_dmg).
    At level 0: click_dmg=10, auto_dps=25 → click_dmg has higher ratio.
    """
    from tools.sim.api_bot import pick_upgrade

    upgrades = {
        "click_dmg": {"level": 0},
        "auto_dps": {"level": 0},
    }
    result = pick_upgrade("optimal", upgrades, gold=500)
    assert result is not None
    # click_dmg is cheaper with same dps gain → higher ratio
    assert result["upgrade_type"] == "click_dmg"


def test_upgrade_strategy_none():
    """none: never buys upgrades."""
    from tools.sim.api_bot import pick_upgrade

    upgrades = {
        "click_dmg": {"level": 1, "cost": 10},
    }
    result = pick_upgrade("none", upgrades, gold=99999)
    assert result is None


def test_narrative_progress_calculation():
    """Narrative progress should increase based on WPM and elapsed time."""
    from tools.sim.api_bot import calc_narrative_progress

    # 200 WPM, 1000 words, 60 seconds elapsed = (200/1000) * (60/60) * 100 = 20%
    progress = calc_narrative_progress(wpm=200, word_count=1000, elapsed_seconds=60)
    assert abs(progress - 20.0) < 0.1

    # 600 WPM, 1000 words, 60 seconds = (600/1000) * (60/60) * 100 = 60%
    progress = calc_narrative_progress(wpm=600, word_count=1000, elapsed_seconds=60)
    assert abs(progress - 60.0) < 0.1


def test_clicks_in_cps_range():
    """Clicks per tick should be within profile CPS range."""
    from tools.sim.api_bot import calc_clicks_for_tick

    import random
    random.seed(42)
    for _ in range(100):
        clicks = calc_clicks_for_tick(cps_range=[8, 12], tick_ms=1000)
        assert 8 <= clicks <= 12

    # Zero CPS (idle-only profile)
    clicks = calc_clicks_for_tick(cps_range=[0, 0], tick_ms=1000)
    assert clicks == 0
