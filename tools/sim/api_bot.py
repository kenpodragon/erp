"""API Bot — simulates player behavior against the real running backend.

Loads a player profile and drives the Story Mode loop via HTTP calls:
login → map → start session → tick loop (click/upgrade/skill/narrative) → complete → repeat.

Usage:
    python api_bot.py --profile casual --base-url http://localhost:8000
    python api_bot.py --all --base-url http://localhost:8000
    python api_bot.py --profile casual --max-scenes 5 --verbose
"""

import argparse
import asyncio
import json
import logging
import os
import random
import sys
import time
from datetime import datetime, timezone
from typing import Any, Optional

# ---------------------------------------------------------------------------
# Flexible imports: support both package (tools.sim.*) and direct script runs
# ---------------------------------------------------------------------------
try:
    from .api_client import GameAPIClient
    from .config import DEFAULT_CONFIGS, load_profile
except ImportError:
    from api_client import GameAPIClient
    from config import DEFAULT_CONFIGS, load_profile

logger = logging.getLogger("api_bot")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RESULTS_DIR = os.path.join(BASE_DIR, "results")
PROFILES_DIR = os.path.join(BASE_DIR, "profiles")

# ---------------------------------------------------------------------------
# Upgrade strategy helpers
# ---------------------------------------------------------------------------

UPGRADE_TYPES = ["click_dmg", "auto_dps"]


def _pick_upgrade_buy_when_affordable(
    session_gold: float,
    upgrades: dict[str, int],
    config: dict,
) -> Optional[str]:
    """Buy the cheapest available upgrade when gold allows."""
    scaling = config.get("upgrade_cost_scaling", 1.07)
    base_costs = {"click_dmg": 10.0, "auto_dps": 25.0}
    cheapest_type: Optional[str] = None
    cheapest_cost = float("inf")
    for utype in UPGRADE_TYPES:
        level = upgrades.get(utype, 0)
        base = base_costs.get(utype, 10.0)
        cost = base * (scaling ** level)
        if cost <= session_gold and cost < cheapest_cost:
            cheapest_cost = cost
            cheapest_type = utype
    return cheapest_type


def _pick_upgrade_optimal(
    session_gold: float,
    upgrades: dict[str, int],
    config: dict,
) -> Optional[str]:
    """Buy the upgrade with the best DPS-per-gold ratio."""
    scaling = config.get("upgrade_cost_scaling", 1.07)
    base_costs = {"click_dmg": 10.0, "auto_dps": 25.0}
    # Approximate DPS gain per level
    dps_gains = {
        "click_dmg": config.get("click_dmg_mult_per_level", 0.05),
        "auto_dps": config.get("auto_dps_mult_per_level", 0.05),
    }
    best_type: Optional[str] = None
    best_ratio = 0.0
    for utype in UPGRADE_TYPES:
        level = upgrades.get(utype, 0)
        base = base_costs.get(utype, 10.0)
        cost = base * (scaling ** level)
        if cost > session_gold:
            continue
        ratio = dps_gains.get(utype, 0.05) / cost
        if ratio > best_ratio:
            best_ratio = ratio
            best_type = utype
    return best_type


def _pick_upgrade_random(
    session_gold: float,
    upgrades: dict[str, int],
    config: dict,
) -> Optional[str]:
    """Buy a random affordable upgrade."""
    scaling = config.get("upgrade_cost_scaling", 1.07)
    base_costs = {"click_dmg": 10.0, "auto_dps": 25.0}
    affordable = []
    for utype in UPGRADE_TYPES:
        level = upgrades.get(utype, 0)
        base = base_costs.get(utype, 10.0)
        cost = base * (scaling ** level)
        if cost <= session_gold:
            affordable.append(utype)
    if not affordable:
        return None
    return random.choice(affordable)


STRATEGY_MAP = {
    "buy_when_affordable": _pick_upgrade_buy_when_affordable,
    "optimal": _pick_upgrade_optimal,
    "random": _pick_upgrade_random,
    "none": lambda *_: None,
}


# ---------------------------------------------------------------------------
# Public helper functions (for testing)
# ---------------------------------------------------------------------------

def pick_upgrade(
    strategy: str,
    upgrades: dict,
    gold: float,
    config: Optional[dict] = None,
) -> Optional[dict]:
    """Public wrapper for upgrade strategy selection.

    Args:
        strategy: One of 'buy_when_affordable', 'optimal', 'random', 'none'.
        upgrades: Dict of upgrade_type -> {"level": int, "cost": float, ...}.
        gold: Current gold amount.
        config: Game config dict (uses DEFAULT_CONFIGS if None).

    Returns:
        {"upgrade_type": str} if an upgrade should be purchased, else None.
    """
    if strategy == "none":
        return None
    cfg = config or DEFAULT_CONFIGS
    # Convert test-style upgrades dict to internal format
    levels = {k: v.get("level", 0) if isinstance(v, dict) else v for k, v in upgrades.items()}
    fn = STRATEGY_MAP.get(strategy, lambda *_: None)
    result = fn(gold, levels, cfg)
    if result:
        return {"upgrade_type": result}
    return None


def calc_narrative_progress(wpm: int, word_count: int, elapsed_seconds: float) -> float:
    """Calculate narrative progress percentage.

    Formula: (wpm / word_count) * (elapsed_seconds / 60) * 100
    """
    if word_count <= 0:
        return 100.0
    return (wpm / word_count) * (elapsed_seconds / 60.0) * 100.0


def calc_clicks_for_tick(cps_range: list[int], tick_ms: int = 1000) -> int:
    """Calculate number of clicks for a single tick based on CPS range.

    Returns random int in [cps_min, cps_max] scaled by tick duration.
    """
    cps_min, cps_max = cps_range[0], cps_range[1]
    if cps_max <= 0:
        return 0
    tick_s = tick_ms / 1000.0
    clicks_min = max(0, int(cps_min * tick_s))
    clicks_max = max(clicks_min, int(cps_max * tick_s))
    return random.randint(clicks_min, clicks_max)


# ---------------------------------------------------------------------------
# Scene extraction from map data
# ---------------------------------------------------------------------------

def _extract_scenes(map_data: list[dict]) -> list[dict]:
    """Flatten the book→chapter→scene hierarchy into an ordered scene list.

    Each returned dict has at minimum: id, scene_type, status, book_number,
    chapter_number, scene_number.
    """
    scenes: list[dict] = []
    for book in map_data:
        book_num = book.get("book_number", 0)
        for chapter in book.get("chapters", []):
            chap_num = chapter.get("chapter_number", 0)
            for scene in chapter.get("scenes", []):
                scene["_book_number"] = book_num
                scene["_chapter_number"] = chap_num
                scenes.append(scene)
        # Book boss (appended separately in map response)
        if book.get("book_boss"):
            bb = book["book_boss"]
            bb["_book_number"] = book_num
            bb["_chapter_number"] = 99
            scenes.append(bb)
    return scenes


def _find_next_scene(scenes: list[dict]) -> Optional[dict]:
    """Return the first scene whose status is not 'mastered'.

    Priority: 'in_progress' first, then 'available', then first 'locked'
    (which means the player has reached the frontier).
    """
    in_progress = [s for s in scenes if s.get("status") == "in_progress"]
    if in_progress:
        return in_progress[0]
    available = [s for s in scenes if s.get("status") == "available"]
    if available:
        return available[0]
    return None


# ---------------------------------------------------------------------------
# Bot runner
# ---------------------------------------------------------------------------

class APIBot:
    """Drives a simulated player through Story Mode via the real backend API."""

    def __init__(
        self,
        client: GameAPIClient,
        profile: dict,
        config: dict,
        max_scenes: int = 0,
        verbose: bool = False,
    ):
        self.client = client
        self.profile = profile
        self.config = config
        self.max_scenes = max_scenes
        self.verbose = verbose

        # Tracking
        self.scene_results: list[dict] = []
        self.total_gold = 0.0
        self.total_essence = 0.0
        self.total_xp = 0.0
        self.artifacts_found: list[dict] = []
        self.errors: list[dict] = []
        self.wall_clock_start = 0.0

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------

    async def run(self) -> dict:
        """Execute the full bot loop and return aggregated results."""
        self.wall_clock_start = time.monotonic()
        profile_name = self.profile.get("name", "unknown")
        logger.info("Bot starting — profile=%s, max_scenes=%s", profile_name, self.max_scenes or "unlimited")

        # Step 1: Login (spoof as player_id=5)
        try:
            await self.client.login()
        except Exception as exc:
            logger.error("Login failed: %s", exc)
            self.errors.append({"phase": "login", "error": str(exc)})
            return self._build_report()

        # Step 2: Fetch game configs from server (override local defaults)
        try:
            server_configs = await self.client.get_game_configs()
            if isinstance(server_configs, dict):
                self.config.update(server_configs)
                logger.info("Loaded %d game configs from server", len(server_configs))
        except Exception as exc:
            logger.warning("Could not load server configs, using defaults: %s", exc)

        # Step 3: Get map and iterate scenes
        scenes_completed = 0
        while True:
            if self.max_scenes and scenes_completed >= self.max_scenes:
                logger.info("Reached max_scenes limit (%d)", self.max_scenes)
                break

            try:
                map_data = await self.client.get_map()
            except Exception as exc:
                logger.error("Map fetch failed: %s", exc)
                self.errors.append({"phase": "map", "error": str(exc)})
                break

            # get_map returns a dict with "books" key or directly a list
            books = map_data.get("books", map_data) if isinstance(map_data, dict) else map_data
            all_scenes = _extract_scenes(books if isinstance(books, list) else [])
            next_scene = _find_next_scene(all_scenes)
            if not next_scene:
                logger.info("No more available scenes — bot finished")
                break

            scene_id = next_scene.get("id")
            scene_type = next_scene.get("scene_type", "normal")
            logger.info(
                "Scene %d (type=%s, book=%s, ch=%s) — status=%s",
                scene_id,
                scene_type,
                next_scene.get("_book_number"),
                next_scene.get("_chapter_number"),
                next_scene.get("status"),
            )

            result = await self._play_scene(scene_id, scene_type)
            self.scene_results.append(result)
            if result.get("success"):
                scenes_completed += 1
            else:
                logger.warning("Scene %d failed — moving on", scene_id)

            # Optional idle training between scenes
            if self.profile.get("idle_training"):
                logger.debug("Idle training placeholder (no idle endpoint called)")

        return self._build_report()

    # ------------------------------------------------------------------
    # Play a single scene
    # ------------------------------------------------------------------

    async def _play_scene(self, scene_id: int, scene_type: str) -> dict:
        """Play through one scene: narrative fetch → start → tick loop → complete."""
        scene_start = time.monotonic()
        result: dict[str, Any] = {
            "scene_id": scene_id,
            "scene_type": scene_type,
            "success": False,
            "ticks": 0,
            "gold": 0.0,
            "essence": 0.0,
            "xp": 0.0,
            "zone_reached": 1,
            "wall_seconds": 0.0,
            "artifacts": [],
            "error": None,
        }

        # 1. Fetch narrative word count
        word_count = 500  # fallback
        try:
            narrative = await self.client.get_scene_narrative(scene_id)
            if isinstance(narrative, dict):
                # Sum word counts across story beats
                beats = narrative.get("beats", narrative.get("story_beats", []))
                if beats:
                    word_count = sum(b.get("word_count", 0) for b in beats) or 500
                elif narrative.get("word_count"):
                    word_count = narrative["word_count"]
            logger.debug("Scene %d narrative: %d words", scene_id, word_count)
        except Exception as exc:
            logger.warning("Narrative fetch failed for scene %d: %s", scene_id, exc)

        # 2. Fetch enemies (informational)
        try:
            await self.client.get_scene_enemies(scene_id)
        except Exception as exc:
            logger.debug("Enemies fetch failed for scene %d: %s", scene_id, exc)

        # 3. Start session
        try:
            session_resp = await self.client.start_session(scene_id)
        except Exception as exc:
            logger.error("Session start failed for scene %d: %s", scene_id, exc)
            result["error"] = str(exc)
            result["wall_seconds"] = time.monotonic() - scene_start
            self.errors.append({"phase": "start", "scene_id": scene_id, "error": str(exc)})
            return result

        session_id = session_resp.get("id") or session_resp.get("session_id")
        if not session_id:
            logger.error("No session_id in start response for scene %d", scene_id)
            result["error"] = "no_session_id"
            result["wall_seconds"] = time.monotonic() - scene_start
            return result

        logger.debug("Session started: %s", session_id)

        # 4. Tick loop
        zone = 1
        wave = 1
        session_gold = 0.0
        narrative_pct = 0.0
        total_waves_cleared = 0
        tick_count = 0
        elapsed_sim_s = 0.0
        upgrades: dict[str, int] = {}  # track purchased upgrade levels
        skill_cooldowns: dict[int, float] = {}  # skill_id → next_available_time
        tick_interval_ms = 1000
        max_ticks = 600  # safety cap: 10 minutes of simulated time

        monsters_per_zone = int(self.config.get("monsters_per_zone", 10))
        # Required waves = monsters_per_zone * required_zones (1 zone for simple scenes)
        required_waves = monsters_per_zone
        cps_lo, cps_hi = self.profile.get("cps_range", [8, 12])
        if cps_hi <= 0:
            cps_lo, cps_hi = 0, 0
        wpm = self.profile.get("wpm", 200)
        strategy_name = self.profile.get("upgrade_strategy", "none")
        strategy_fn = STRATEGY_MAP.get(strategy_name, STRATEGY_MAP["none"])

        while tick_count < max_ticks:
            tick_count += 1
            elapsed_sim_s += tick_interval_ms / 1000.0

            # Calculate clicks for this tick
            clicks = random.randint(cps_lo, cps_hi) if cps_hi > 0 else 0

            # Waves completed this tick: 1 per tick as baseline
            waves_delta = 1

            # Gold estimate: use zone gold formula
            from .config import zone_gold as _zone_gold
            gold_delta = _zone_gold(zone) * waves_delta

            try:
                tick_resp = await self.client.tick(
                    session_id=session_id,
                    clicks=clicks,
                    elapsed_ms=tick_interval_ms,
                    zone=zone,
                    wave=wave,
                    gold_delta=gold_delta,
                    waves_completed_delta=waves_delta,
                )
            except Exception as exc:
                logger.warning("Tick %d failed for session %s: %s", tick_count, session_id, exc)
                result["error"] = f"tick_{tick_count}: {exc}"
                break

            # Update state from server response
            session_gold = tick_resp.get("session_gold", session_gold)
            # Server may correct zone/wave; use server values if available
            server_zone = tick_resp.get("current_zone")
            server_wave = tick_resp.get("current_wave")
            if server_zone is not None:
                zone = server_zone
            if server_wave is not None:
                wave = server_wave

            # Track total waves cleared locally
            total_waves_cleared += waves_delta
            waves_complete = total_waves_cleared >= required_waves

            # Update narrative progress based on WPM
            if narrative_pct < 100.0:
                narrative_pct = min(100.0, (wpm / max(word_count, 1)) * (elapsed_sim_s / 60.0) * 100.0)
                try:
                    await self.client.update_narrative_progress(
                        session_id=session_id,
                        progress_pct=round(narrative_pct, 2),
                    )
                except Exception as exc:
                    logger.debug("Narrative update failed: %s", exc)

            # Upgrades (only try every 5 ticks to reduce 400s)
            if strategy_name != "none" and tick_count % 5 == 0:
                upgrade_type = strategy_fn(session_gold, upgrades, self.config)
                if upgrade_type:
                    try:
                        upgrade_resp = await self.client.upgrade(
                            session_id=session_id,
                            upgrade_type=upgrade_type,
                            quantity=1,
                        )
                        if upgrade_resp.get("new_level") is not None:
                            upgrades[upgrade_type] = upgrade_resp["new_level"]
                            session_gold = upgrade_resp.get("remaining_gold", session_gold)
                            logger.debug("Upgraded %s to level %d", upgrade_type, upgrades[upgrade_type])
                    except Exception as exc:
                        logger.debug("Upgrade failed: %s", exc)

            # Skills
            if self.profile.get("use_skills") and self.profile.get("skill_timing") != "none":
                for skill_id, next_time in list(skill_cooldowns.items()):
                    if elapsed_sim_s >= next_time:
                        try:
                            skill_resp = await self.client.activate_skill(
                                session_id=session_id,
                                skill_id=skill_id,
                            )
                            if skill_resp.get("activated"):
                                skill_cooldowns[skill_id] = elapsed_sim_s + 30.0
                                logger.debug("Activated skill %d", skill_id)
                        except Exception:
                            pass

            # Check completion condition: narrative done AND enough waves cleared
            if narrative_pct >= 100.0 and waves_complete:
                logger.info(
                    "Scene %d complete after %d ticks (%.1fs sim, zone=%d, waves=%d)",
                    scene_id, tick_count, elapsed_sim_s, zone, total_waves_cleared,
                )
                break

            # Advance wave/zone counters for next tick
            wave += 1
            if wave > monsters_per_zone:
                wave = 1
                zone += 1

        # 5. Complete session
        try:
            complete_resp = await self.client.complete_session(session_id=session_id)
            result["success"] = True
            result["gold"] = complete_resp.get("session_gold", session_gold)
            result["essence"] = complete_resp.get("essence_earned", 0.0)
            result["xp"] = complete_resp.get("xp_earned", 0.0)
            result["artifacts"] = complete_resp.get("artifacts", [])

            self.total_gold += result["gold"]
            self.total_essence += result["essence"]
            self.total_xp += result["xp"]
            self.artifacts_found.extend(result["artifacts"])

        except Exception as exc:
            logger.error("Session complete failed for %s: %s", session_id, exc)
            result["error"] = f"complete: {exc}"
            self.errors.append({"phase": "complete", "session_id": str(session_id), "error": str(exc)})

        result["ticks"] = tick_count
        result["zone_reached"] = zone
        result["wall_seconds"] = round(time.monotonic() - scene_start, 3)
        return result

    # ------------------------------------------------------------------
    # Report
    # ------------------------------------------------------------------

    def _build_report(self) -> dict:
        """Build the final aggregated report."""
        wall_total = round(time.monotonic() - self.wall_clock_start, 3)
        return {
            "profile": self.profile,
            "config_snapshot": {k: v for k, v in self.config.items() if not str(k).startswith("_")},
            "scenes_attempted": len(self.scene_results),
            "scenes_succeeded": sum(1 for s in self.scene_results if s.get("success")),
            "per_scene": self.scene_results,
            "totals": {
                "gold": round(self.total_gold, 2),
                "essence": round(self.total_essence, 4),
                "xp": round(self.total_xp, 2),
                "artifacts_found": len(self.artifacts_found),
            },
            "artifacts": self.artifacts_found,
            "errors": self.errors,
            "wall_seconds": wall_total,
            "api_metrics": self.client.metrics() if hasattr(self.client, "metrics") else {},
        }


# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------

def _write_results(report: dict, profile_name: str) -> str:
    """Write report JSON to results directory and return the file path."""
    os.makedirs(RESULTS_DIR, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"api_bot_{profile_name}_{ts}.json"
    path = os.path.join(RESULTS_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, default=str)
    return path


def _print_summary(report: dict) -> None:
    """Print a compact summary to stdout."""
    name = report["profile"].get("name", "unknown")
    totals = report["totals"]
    print(f"\n{'='*60}")
    print(f"  API Bot Results — {name}")
    print(f"{'='*60}")
    print(f"  Scenes attempted: {report['scenes_attempted']}")
    print(f"  Scenes succeeded: {report['scenes_succeeded']}")
    print(f"  Total gold:       {totals['gold']}")
    print(f"  Total essence:    {totals['essence']}")
    print(f"  Total XP:         {totals['xp']}")
    print(f"  Artifacts found:  {totals['artifacts_found']}")
    print(f"  Errors:           {len(report['errors'])}")
    print(f"  Wall time:        {report['wall_seconds']:.1f}s")
    if report.get("api_metrics"):
        m = report["api_metrics"]
        print(f"  API calls:        {m.get('total_requests', '?')}")
        print(f"  Avg latency:      {m.get('avg_latency_ms', '?')}ms")
    print(f"{'='*60}\n")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

async def run_bot(
    profile_name: str,
    base_url: str,
    max_scenes: int = 0,
    verbose: bool = False,
) -> dict:
    """Instantiate and run the bot for a single profile."""
    profile = load_profile(profile_name)
    config = dict(DEFAULT_CONFIGS)
    client = GameAPIClient(base_url=base_url)

    bot = APIBot(
        client=client,
        profile=profile,
        config=config,
        max_scenes=max_scenes,
        verbose=verbose,
    )

    try:
        report = await bot.run()
    finally:
        await client.close()

    return report


async def main_async(args: argparse.Namespace) -> None:
    """Async main — runs one or all profiles."""
    if args.all:
        from glob import glob as globfiles
        profile_files = globfiles(os.path.join(PROFILES_DIR, "*.json"))
        profile_names = [
            os.path.basename(p).replace(".json", "") for p in sorted(profile_files)
        ]
    else:
        profile_names = [args.profile]

    for pname in profile_names:
        logger.info("=" * 40)
        logger.info("Running profile: %s", pname)
        logger.info("=" * 40)

        try:
            report = await run_bot(
                profile_name=pname,
                base_url=args.base_url,
                max_scenes=args.max_scenes,
                verbose=args.verbose,
            )

            path = _write_results(report, pname)
            _print_summary(report)
            print(f"  Results: {path}")
        except Exception as exc:
            logger.error("Profile %s failed: %s", pname, exc, exc_info=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="ERP API Bot — simulates player behavior")
    parser.add_argument("--profile", type=str, help="Profile name to simulate (e.g. casual)")
    parser.add_argument("--all", action="store_true", help="Run all profiles in profiles/")
    parser.add_argument("--base-url", type=str, default="http://localhost:8000",
                        help="Backend base URL (default: http://localhost:8000)")
    parser.add_argument("--max-scenes", type=int, default=0,
                        help="Max scenes to play (0 = unlimited)")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging")
    args = parser.parse_args()

    if not args.profile and not args.all:
        parser.error("Specify --profile <name> or --all")

    log_level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
        datefmt="%H:%M:%S",
    )

    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
