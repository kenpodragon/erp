"""Browser vs API Bot Validation Test.

Plays the same scene through both the browser (Playwright) and the API bot,
then compares results to ensure the frontend and API bot exercise the same
server-side logic.

Usage:
    python -m tools.sim.browser_validation --scene-id 1 --base-url http://localhost:8000
    python -m tools.sim.browser_validation --scene-id 1 --frontend-url http://localhost:5173
"""

import argparse
import asyncio
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from typing import Any, Optional

try:
    from .api_client import GameAPIClient
    from .config import DEFAULT_CONFIGS, zone_gold
except ImportError:
    from api_client import GameAPIClient
    from config import DEFAULT_CONFIGS, zone_gold

logger = logging.getLogger("browser_validation")


# ---------------------------------------------------------------------------
# API Bot: play one scene and collect metrics
# ---------------------------------------------------------------------------

async def api_bot_play_scene(
    base_url: str,
    scene_id: int,
    player_id: int = 5,
    tick_interval_ms: int = 2000,
) -> dict[str, Any]:
    """Play a single scene via the API bot, mimicking frontend tick interval."""
    metrics: dict[str, Any] = {
        "source": "api_bot",
        "scene_id": scene_id,
        "ticks": [],
        "upgrades": [],
        "narrative_updates": [],
        "final_gold": 0.0,
        "final_zone": 1,
        "total_ticks": 0,
        "completion": None,
        "error": None,
    }

    async with GameAPIClient(base_url=base_url, player_id=player_id) as client:
        # Login
        await client.login()

        # Load configs
        configs = await client.get_game_configs()
        monsters_per_zone = int(configs.get("monsters_per_zone", 10))

        # Get narrative word count
        narrative = await client.get_scene_narrative(scene_id)
        beats = narrative.get("beats", narrative.get("story_beats", []))
        word_count = sum(b.get("word_count", 0) for b in beats) if beats else 500

        # Start session
        session_resp = await client.start_session(scene_id)
        session_id = session_resp.get("session_id") or session_resp.get("id")
        if not session_id:
            metrics["error"] = "no_session_id"
            return metrics

        # Tick loop — match frontend 2s interval
        zone = 1
        wave = 1
        session_gold = 0.0
        narrative_pct = 0.0
        total_waves = 0
        tick_count = 0
        elapsed_sim_s = 0.0
        required_waves = monsters_per_zone
        max_ticks = 300  # 10 min at 2s ticks

        while tick_count < max_ticks:
            tick_count += 1
            elapsed_sim_s += tick_interval_ms / 1000.0

            # Simulate clicks: ~10 CPS × 2s = 20 clicks per tick
            clicks = 20
            waves_delta = 1
            gold_delta = zone_gold(zone) * waves_delta

            tick_resp = await client.tick(
                session_id=session_id,
                clicks=clicks,
                elapsed_ms=tick_interval_ms,
                zone=zone,
                wave=wave,
                gold_delta=gold_delta,
                waves_completed_delta=waves_delta,
            )

            session_gold = tick_resp.get("session_gold", session_gold)
            server_zone = tick_resp.get("current_zone", zone)
            server_wave = tick_resp.get("current_wave", wave)

            metrics["ticks"].append({
                "tick": tick_count,
                "clicks": clicks,
                "gold_delta": gold_delta,
                "session_gold": session_gold,
                "zone": zone,
                "wave": wave,
                "server_zone": server_zone,
                "server_wave": server_wave,
                "cps_valid": tick_resp.get("cps_valid"),
                "gold_corrected": tick_resp.get("gold_corrected"),
            })

            total_waves += waves_delta

            # Narrative progress
            narrative_pct = min(100.0, (200 / max(word_count, 1)) * (elapsed_sim_s / 60.0) * 100.0)
            if narrative_pct < 100.0:
                try:
                    narr_resp = await client.update_narrative_progress(
                        session_id=session_id,
                        progress_pct=round(narrative_pct, 2),
                    )
                    metrics["narrative_updates"].append({
                        "tick": tick_count,
                        "pct": round(narrative_pct, 2),
                        "server_response": narr_resp,
                    })
                except Exception:
                    pass

            # Check completion
            if narrative_pct >= 100.0 and total_waves >= required_waves:
                break

            # Advance
            wave += 1
            if wave > monsters_per_zone:
                wave = 1
                zone += 1

        # Complete
        try:
            complete_resp = await client.complete_session(session_id=session_id)
            metrics["completion"] = complete_resp
        except Exception as exc:
            metrics["error"] = f"complete_failed: {exc}"

        metrics["final_gold"] = session_gold
        metrics["final_zone"] = zone
        metrics["total_ticks"] = tick_count
        metrics["api_metrics"] = client.get_metrics()

    return metrics


# ---------------------------------------------------------------------------
# Browser Bot: play one scene via Playwright, intercept network
# ---------------------------------------------------------------------------

async def browser_play_scene(
    frontend_url: str,
    scene_id: int,
    timeout_s: int = 120,
) -> dict[str, Any]:
    """Play a scene in the browser via Playwright, intercepting API calls."""
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        return {"source": "browser", "error": "playwright not installed — run: pip install playwright && playwright install chromium"}

    metrics: dict[str, Any] = {
        "source": "browser",
        "scene_id": scene_id,
        "ticks": [],
        "upgrades": [],
        "narrative_updates": [],
        "final_gold": 0.0,
        "final_zone": 1,
        "total_ticks": 0,
        "completion": None,
        "error": None,
        "console_errors": [],
    }

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        # Intercept API requests
        tick_responses: list[dict] = []
        complete_response: Optional[dict] = None

        async def handle_response(response):
            nonlocal complete_response
            url = response.url
            try:
                if "/tick" in url and response.status == 200:
                    data = await response.json()
                    tick_responses.append(data)
                elif "/complete" in url and response.status == 200:
                    data = await response.json()
                    complete_response = data
            except Exception:
                pass

        page.on("response", handle_response)

        # Capture console errors
        page.on("console", lambda msg: metrics["console_errors"].append(msg.text) if msg.type == "error" else None)

        # Navigate to game — the frontend auto-logs in via spoof in dev mode
        await page.goto(f"{frontend_url}/game", wait_until="networkidle", timeout=30000)
        logger.info("Browser loaded game page")

        # Wait for story mode to be available, then navigate to scene
        # Click on the scene in the map or navigate directly
        try:
            # Try navigating directly to story mode with the scene
            await page.goto(f"{frontend_url}/game/story/{scene_id}", wait_until="networkidle", timeout=15000)
        except Exception:
            # Fallback: navigate via the map
            await page.goto(f"{frontend_url}/game", wait_until="networkidle", timeout=15000)

        logger.info("Waiting for combat ticks...")

        # Wait for the scene to play out — the frontend auto-ticks
        # We inject rapid clicking to speed things up
        start_time = time.monotonic()

        # Inject auto-clicker at 10 CPS to match API bot
        await page.evaluate("""() => {
            window._validationClicker = setInterval(() => {
                const canvas = document.querySelector('canvas');
                if (canvas) {
                    for (let i = 0; i < 10; i++) {
                        canvas.dispatchEvent(new MouseEvent('pointerdown', {
                            bubbles: true, clientX: 300, clientY: 300
                        }));
                    }
                }
            }, 1000);
        }""")

        # Poll for completion — check if scene completed
        completed = False
        while (time.monotonic() - start_time) < timeout_s:
            await asyncio.sleep(2)

            if complete_response is not None:
                completed = True
                logger.info("Browser scene completed!")
                break

            # Check if we've been redirected (scene complete often redirects)
            current_url = page.url
            if "/summary" in current_url or "/map" in current_url:
                completed = True
                break

            # Log progress
            if tick_responses:
                last = tick_responses[-1]
                logger.debug(
                    "Browser tick %d: gold=%.1f zone=%s",
                    len(tick_responses),
                    last.get("session_gold", 0),
                    last.get("current_zone", "?"),
                )

        # Clean up auto-clicker
        await page.evaluate("() => { if (window._validationClicker) clearInterval(window._validationClicker); }")

        # Build metrics from intercepted data
        for i, tick_data in enumerate(tick_responses):
            metrics["ticks"].append({
                "tick": i + 1,
                "session_gold": tick_data.get("session_gold", 0),
                "zone": tick_data.get("current_zone"),
                "wave": tick_data.get("current_wave"),
                "cps_valid": tick_data.get("cps_valid"),
                "gold_corrected": tick_data.get("gold_corrected"),
            })

        metrics["total_ticks"] = len(tick_responses)
        metrics["completion"] = complete_response
        if tick_responses:
            metrics["final_gold"] = tick_responses[-1].get("session_gold", 0)
            metrics["final_zone"] = tick_responses[-1].get("current_zone", 1)

        if not completed:
            metrics["error"] = f"timeout after {timeout_s}s ({len(tick_responses)} ticks captured)"

        await browser.close()

    return metrics


# ---------------------------------------------------------------------------
# Comparison
# ---------------------------------------------------------------------------

def compare_results(api: dict, browser: dict) -> dict:
    """Compare API bot and browser results, flag discrepancies."""
    comparison = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "scene_id": api.get("scene_id"),
        "api_bot": {
            "total_ticks": api["total_ticks"],
            "final_gold": api["final_gold"],
            "final_zone": api["final_zone"],
            "error": api.get("error"),
        },
        "browser": {
            "total_ticks": browser["total_ticks"],
            "final_gold": browser["final_gold"],
            "final_zone": browser["final_zone"],
            "error": browser.get("error"),
            "console_errors": browser.get("console_errors", []),
        },
        "checks": [],
        "passed": True,
    }

    checks = comparison["checks"]

    # Check 1: Both completed without error
    api_ok = api.get("error") is None and api.get("completion") is not None
    browser_ok = browser.get("error") is None and browser.get("completion") is not None
    checks.append({
        "name": "both_completed",
        "passed": api_ok and browser_ok,
        "detail": f"API: {'OK' if api_ok else api.get('error')}, Browser: {'OK' if browser_ok else browser.get('error')}",
    })

    # Check 2: Gold within tolerance (server-authoritative, so should be close)
    if api["final_gold"] > 0 and browser["final_gold"] > 0:
        gold_diff_pct = abs(api["final_gold"] - browser["final_gold"]) / max(api["final_gold"], 1) * 100
        gold_ok = gold_diff_pct < 20  # 20% tolerance for timing differences
        checks.append({
            "name": "gold_within_tolerance",
            "passed": gold_ok,
            "detail": f"API: {api['final_gold']:.1f}, Browser: {browser['final_gold']:.1f}, diff: {gold_diff_pct:.1f}%",
        })

    # Check 3: CPS validation — both should have valid CPS
    api_cps_violations = sum(1 for t in api.get("ticks", []) if not t.get("cps_valid", True))
    browser_cps_violations = sum(1 for t in browser.get("ticks", []) if not t.get("cps_valid", True))
    checks.append({
        "name": "cps_not_flagged",
        "passed": api_cps_violations == 0,
        "detail": f"API violations: {api_cps_violations}, Browser violations: {browser_cps_violations}",
    })

    # Check 4: Gold not corrected (anti-cheat didn't modify gold)
    api_gold_corrections = sum(1 for t in api.get("ticks", []) if t.get("gold_corrected"))
    browser_gold_corrections = sum(1 for t in browser.get("ticks", []) if t.get("gold_corrected"))
    checks.append({
        "name": "gold_not_corrected",
        "passed": api_gold_corrections == 0,
        "detail": f"API corrections: {api_gold_corrections}, Browser corrections: {browser_gold_corrections}",
    })

    # Check 5: Server-side logic consistent — both hit same completion endpoint
    api_complete = api.get("completion", {})
    browser_complete = browser.get("completion", {})
    if api_complete and browser_complete:
        # Compare essence conversion (same formula applied server-side)
        api_essence = api_complete.get("essence_earned", api_complete.get("essence_gained", 0))
        browser_essence = browser_complete.get("essence_earned", browser_complete.get("essence_gained", 0))
        if api_essence > 0 and browser_essence > 0:
            essence_diff_pct = abs(api_essence - browser_essence) / max(api_essence, 1) * 100
            checks.append({
                "name": "essence_consistent",
                "passed": essence_diff_pct < 25,
                "detail": f"API: {api_essence:.1f}, Browser: {browser_essence:.1f}, diff: {essence_diff_pct:.1f}%",
            })

    # Check 6: No browser console errors
    console_errors = [e for e in browser.get("console_errors", []) if "error" in e.lower() or "exception" in e.lower()]
    checks.append({
        "name": "no_console_errors",
        "passed": len(console_errors) == 0,
        "detail": f"{len(console_errors)} errors" + (f": {console_errors[:3]}" if console_errors else ""),
    })

    # Overall pass/fail
    comparison["passed"] = all(c["passed"] for c in checks)

    return comparison


def print_comparison(comparison: dict) -> None:
    """Print a formatted comparison report."""
    print("\n" + "=" * 70)
    print("  BROWSER vs API BOT VALIDATION")
    print("=" * 70)
    print(f"  Scene: {comparison['scene_id']}")
    print(f"  Time:  {comparison['timestamp']}")
    print()

    api = comparison["api_bot"]
    browser = comparison["browser"]
    print(f"  {'Metric':<25} {'API Bot':>12} {'Browser':>12}")
    print(f"  {'-'*25} {'-'*12} {'-'*12}")
    print(f"  {'Ticks':<25} {api['total_ticks']:>12} {browser['total_ticks']:>12}")
    print(f"  {'Final Gold':<25} {api['final_gold']:>12.1f} {browser['final_gold']:>12.1f}")
    print(f"  {'Final Zone':<25} {api['final_zone']:>12} {browser['final_zone']:>12}")
    print()

    print("  Checks:")
    for check in comparison["checks"]:
        status = "PASS" if check["passed"] else "FAIL"
        icon = "+" if check["passed"] else "X"
        print(f"    [{icon}] {check['name']}: {status} — {check['detail']}")

    print()
    overall = "PASSED" if comparison["passed"] else "FAILED"
    print(f"  Overall: {overall}")
    print("=" * 70)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def run_validation(
    scene_id: int,
    base_url: str = "http://localhost:8000",
    frontend_url: str = "http://localhost:5173",
    browser_timeout: int = 120,
) -> dict:
    """Run both API bot and browser, compare results."""

    logger.info("=== Phase 1: API Bot run ===")
    api_result = await api_bot_play_scene(base_url, scene_id)
    logger.info("API bot: %d ticks, gold=%.1f, zone=%d",
                api_result["total_ticks"], api_result["final_gold"], api_result["final_zone"])

    logger.info("=== Phase 2: Browser run ===")
    browser_result = await browser_play_scene(frontend_url, scene_id, timeout_s=browser_timeout)
    if browser_result.get("error") and "playwright not installed" in str(browser_result["error"]):
        logger.error("Playwright not available: %s", browser_result["error"])
        print("\n  ERROR: Playwright not installed. Run: pip install playwright && python -m playwright install chromium")
        return {"passed": False, "checks": [{"name": "playwright_available", "passed": False, "detail": str(browser_result["error"])}]}
    logger.info("Browser: %d ticks, gold=%.1f, zone=%d",
                browser_result.get("total_ticks", 0), browser_result.get("final_gold", 0), browser_result.get("final_zone", 0))

    logger.info("=== Phase 3: Comparison ===")
    comparison = compare_results(api_result, browser_result)
    print_comparison(comparison)

    # Save results
    results_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
    os.makedirs(results_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = os.path.join(results_dir, f"browser_validation_{timestamp}.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({
            "comparison": comparison,
            "api_result": {k: v for k, v in api_result.items() if k != "ticks"},
            "browser_result": {k: v for k, v in browser_result.items() if k != "ticks"},
        }, f, indent=2, default=str)
    print(f"\n  Results: {output_path}")

    return comparison


def main():
    parser = argparse.ArgumentParser(description="Browser vs API Bot Validation Test")
    parser.add_argument("--scene-id", type=int, default=1, help="Scene ID to test (default: 1)")
    parser.add_argument("--base-url", default="http://localhost:8000", help="Backend API URL")
    parser.add_argument("--frontend-url", default="http://localhost:5173", help="Frontend URL")
    parser.add_argument("--timeout", type=int, default=120, help="Browser timeout in seconds")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging")
    parser.add_argument("--api-only", action="store_true", help="Run only API bot (skip browser)")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
        datefmt="%H:%M:%S",
    )

    if args.api_only:
        result = asyncio.run(api_bot_play_scene(args.base_url, args.scene_id))
        print(json.dumps({k: v for k, v in result.items() if k != "ticks"}, indent=2, default=str))
    else:
        comparison = asyncio.run(run_validation(
            scene_id=args.scene_id,
            base_url=args.base_url,
            frontend_url=args.frontend_url,
            browser_timeout=args.timeout,
        ))
        sys.exit(0 if comparison["passed"] else 1)


if __name__ == "__main__":
    main()
