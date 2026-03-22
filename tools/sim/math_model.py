"""Main math model simulation runner for ERP balance analysis.

Loads player profiles, game configs, and runs offline simulations covering
zone progression, economy flow, XP curves, content timeline, wall detection,
min-power gating, and boss DPS checks.

Usage:
    python math_model.py --profile casual
    python math_model.py --all
    python math_model.py --profile casual --config results/config_overrides.json
"""

import argparse
import csv
import json
import math
import os
import sys
from glob import glob as globfiles
from typing import Any

from config import (
    DEFAULT_CONFIGS,
    click_damage,
    essence_conversion,
    idle_xp_per_hour,
    load_config_overrides,
    load_profile,
    milestone_multiplier,
    time_to_kill,
    upgrade_cost,
    xp_to_level,
    zone_gold,
    zone_hp,
)

# ---------------------------------------------------------------------------
# Directory helpers
# ---------------------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
RESULTS_DIR = os.path.join(BASE_DIR, "results")
PROFILES_DIR = os.path.join(BASE_DIR, "profiles")

# ---------------------------------------------------------------------------
# Content snapshot / fallback data
# ---------------------------------------------------------------------------

HARDCODED_CONTENT = {
    "books": [
        {"book": 1, "chapters": 10, "scenes_per_chapter": 5, "avg_words_per_scene": 500},
        {"book": 2, "chapters": 10, "scenes_per_chapter": 5, "avg_words_per_scene": 500},
        {"book": 3, "chapters": 10, "scenes_per_chapter": 5, "avg_words_per_scene": 500},
    ],
    "total_scenes": 150,
    "total_words": 75000,
}

# Zones per book (rough mapping): Book 1 = zones 1-47, Book 2 = 48-93, Book 3 = 94-140
BOOK_ZONE_RANGES = [(1, 47), (48, 93), (94, 140)]


def _load_content_snapshot() -> dict:
    """Load content snapshot from data dir or return hardcoded fallback.

    Validates that the snapshot contains usable numeric data. If the file
    has placeholder/string values (schema-only template), falls back to
    hardcoded estimates.
    """
    path = os.path.join(DATA_DIR, "content_snapshot.json")
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            # Validate: books must have numeric chapter counts
            books = data.get("books", [])
            if books and isinstance(books[0].get("chapters"), (int, float)):
                return data
        except (json.JSONDecodeError, TypeError, ValueError):
            pass
    return HARDCODED_CONTENT


def _generate_placeholder_bosses(config: dict) -> list[dict]:
    """Generate placeholder boss data: 1 per chapter + 1 per book final boss."""
    bosses = []
    scaling = config.get("hp_scaling_factor", 1.55)
    total_chapters = 30  # 3 books x 10 chapters
    zones_per_chapter = 140 / total_chapters  # ~4.67 zones per chapter

    for book_idx, (z_start, z_end) in enumerate(BOOK_ZONE_RANGES, 1):
        chapters_in_book = 10
        for ch in range(1, chapters_in_book + 1):
            ch_zone = int(z_start + (ch / chapters_in_book) * (z_end - z_start))
            boss_hp = zone_hp(ch_zone, scaling) * 15  # bosses have 15x zone mob HP
            enrage = 120.0  # 2 minute enrage timer
            is_book_boss = ch == chapters_in_book
            if is_book_boss:
                boss_hp *= 3  # book bosses are 3x chapter bosses
                enrage = 180.0  # 3 minute enrage
            bosses.append({
                "name": f"Book{book_idx}_Ch{ch}_Boss",
                "book": book_idx,
                "chapter": ch,
                "zone": ch_zone,
                "hp": boss_hp,
                "enrage_seconds": enrage,
                "is_book_boss": is_book_boss,
            })
    return bosses


def _load_bosses(config: dict) -> list[dict]:
    """Load boss data from content snapshot or generate placeholders."""
    snapshot = _load_content_snapshot()
    bosses = snapshot.get("bosses", [])
    if bosses:
        return bosses
    return _generate_placeholder_bosses(config)


# ---------------------------------------------------------------------------
# Player DPS calculation
# ---------------------------------------------------------------------------

def _calc_player_dps(level: int, profile: dict, config: dict) -> float:
    """Calculate effective player DPS at a given level.

    DPS = click_damage(level) * avg_cps * (1 + crit_chance*(crit_mult-1)) + auto_dps
    """
    cps_lo, cps_hi = profile.get("cps_range", [0, 0])
    avg_cps = (cps_lo + cps_hi) / 2.0

    base_click = click_damage(level, config.get("click_dmg_mult_per_level", 0.05))
    mile_mult = milestone_multiplier(
        level,
        config.get("milestone_start", 200),
        config.get("milestone_interval", 25),
    )
    effective_click = base_click * mile_mult

    crit_chance = config.get("crit_chance", 0.02)
    crit_mult = config.get("crit_multiplier", 2.0)
    crit_factor = 1.0 + crit_chance * (crit_mult - 1.0)

    click_dps = effective_click * avg_cps * crit_factor

    # Auto DPS from skills (simplified: scales with level if skills are used)
    auto_dps = 0.0
    if profile.get("use_skills", False):
        auto_mult = config.get("auto_dps_mult_per_level", 0.05)
        auto_dps = level * auto_mult * mile_mult * 0.5  # auto hits at ~50% of click efficiency

    return click_dps + auto_dps


# ---------------------------------------------------------------------------
# Simulation sections
# ---------------------------------------------------------------------------

def _sim_zone_progression(config: dict, profile: dict) -> list[dict]:
    """5.3.1 — Zone progression: HP, gold/kill, TTK for zones 1-140."""
    scaling = config.get("hp_scaling_factor", 1.55)
    results = []
    # Estimate player level at each zone (rough: level ~ zone * 1.5 for casual)
    for z in range(1, 141):
        hp = zone_hp(z, scaling)
        gpk = zone_gold(z)
        # Estimate level at this zone based on progression
        est_level = max(1, int(z * 1.5))
        dps = _calc_player_dps(est_level, profile, config)
        ttk = time_to_kill(hp, dps) if dps > 0 else math.inf
        monsters = config.get("monsters_per_zone", 10)
        gpm = (gpk * monsters) / max(ttk * monsters / 60.0, 0.001) if ttk != math.inf else 0.0
        results.append({
            "zone": z,
            "hp": round(hp, 2),
            "gold_per_kill": round(gpk, 2),
            "time_to_kill_seconds": round(ttk, 4),
            "gold_per_minute": round(gpm, 2),
        })
    return results


def _sim_economy_flow(config: dict, profile: dict, zone_prog: list[dict]) -> list[dict]:
    """5.3.2 — Economy flow: gold/min, essence conversion, scenes to next upgrade."""
    results = []
    for entry in zone_prog:
        z = entry["zone"]
        gpm = entry["gold_per_minute"]
        # Essence per scene: gold earned during a ~30s wave converted
        wave_dur = config.get("wave_duration_seconds", 30)
        gold_per_wave = gpm * (wave_dur / 60.0)
        ess = essence_conversion(gold_per_wave, z)

        # Scenes to afford next upgrade tier (upgrade every 10 zones)
        upgrade_tier = (z // 10) + 1
        cost = upgrade_cost(100.0, upgrade_tier, config.get("upgrade_cost_scaling", 1.07))
        scenes_needed = cost / max(ess, 0.0001)

        results.append({
            "zone": z,
            "gold_per_minute": round(gpm, 2),
            "essence_per_scene": round(ess, 4),
            "scenes_to_next_upgrade": round(scenes_needed, 1),
        })
    return results


def _sim_xp_curve(config: dict, profile: dict) -> dict:
    """5.3.3 — XP & leveling curves: active, idle, mixed to milestone levels."""
    milestones = [10, 20, 35, 50, 70, 80]
    xp_factor = config.get("char_level_xp_factor", 1000)
    xp_per_scene = config.get("char_xp_per_scene_base", 50)

    cps_lo, cps_hi = profile.get("cps_range", [0, 0])
    avg_cps = (cps_lo + cps_hi) / 2.0
    session_min = profile.get("session_length_minutes", 0)
    sessions_day = profile.get("sessions_per_day", 0)
    idle_hrs = profile.get("idle_hours_per_day", 0)

    # Active XP per minute: scenes cleared per minute * xp_per_scene
    # Assume ~2 scenes per minute of active play (fast clicker) scaled by CPS
    scenes_per_min = max(0.5, avg_cps / 5.0)
    active_xp_per_min = scenes_per_min * xp_per_scene

    # Idle XP per hour (simplified: 1 tick per 10 seconds, xp_per_tick scales with level)
    idle_xp_base = idle_xp_per_hour(10.0, xp_per_scene * 0.1) if idle_hrs > 0 else 0.0

    def _time_to_milestone(level: int, mode: str) -> float:
        """Hours to reach milestone level in given mode."""
        total_xp = xp_to_level(level, xp_factor)
        if mode == "active":
            if active_xp_per_min <= 0:
                return math.inf
            active_min_day = session_min * sessions_day
            if active_min_day <= 0:
                return math.inf
            xp_per_day = active_xp_per_min * active_min_day
            days = total_xp / max(xp_per_day, 0.001)
            return round(days * 24.0, 2)
        elif mode == "idle":
            if idle_xp_base <= 0 or idle_hrs <= 0:
                return math.inf
            xp_per_day = idle_xp_base * idle_hrs
            days = total_xp / max(xp_per_day, 0.001)
            return round(days * 24.0, 2)
        else:  # mixed
            active_min_day = session_min * sessions_day
            active_xp_day = active_xp_per_min * active_min_day
            idle_xp_day = idle_xp_base * idle_hrs if profile.get("idle_training") else 0.0
            total_xp_day = active_xp_day + idle_xp_day
            if total_xp_day <= 0:
                return math.inf
            days = total_xp / max(total_xp_day, 0.001)
            return round(days * 24.0, 2)

    active_curve = [{"level": m, "hours": _time_to_milestone(m, "active")} for m in milestones]
    idle_curve = [{"level": m, "hours": _time_to_milestone(m, "idle")} for m in milestones]
    mixed_curve = [{"level": m, "hours": _time_to_milestone(m, "mixed")} for m in milestones]

    return {
        "active_only": active_curve,
        "idle_only": idle_curve,
        "mixed": mixed_curve,
    }


def _sim_content_timeline(config: dict, profile: dict) -> dict:
    """5.3.4 — Content timeline at various WPM readings.

    Handles two snapshot formats:
    - Real snapshot: books have book_id/chapters/scenes, plus a top-level
      'scenes' array with word_count per scene.
    - Hardcoded fallback: books have chapters/scenes_per_chapter/avg_words_per_scene.
    """
    snapshot = _load_content_snapshot()
    books = snapshot.get("books", HARDCODED_CONTENT["books"])
    all_scenes = snapshot.get("scenes", [])

    # Build per-book word counts and scene counts
    book_stats: list[dict] = []
    for idx, b in enumerate(books):
        book_num = b.get("book", b.get("book_id", idx + 1))
        if "scenes_per_chapter" in b:
            # Hardcoded fallback format
            scene_count = b["chapters"] * b["scenes_per_chapter"]
            words = scene_count * b["avg_words_per_scene"]
        else:
            # Real snapshot format — sum word counts from scenes array
            scene_count = b.get("scenes", 0)
            bid = b.get("book_id", book_num)
            words = sum(
                s.get("word_count", 0)
                for s in all_scenes
                if s.get("book_id") == bid
            )
            # If no scenes matched or words is 0, estimate
            if words == 0 and scene_count > 0:
                words = scene_count * 500  # fallback avg
        book_stats.append({
            "book": book_num,
            "scenes": scene_count,
            "words": words,
        })

    total_words = sum(bs["words"] for bs in book_stats) or 75000

    wpm_values = [150, 200, 300, 600]
    result = {}

    for wpm in wpm_values:
        reading_minutes = total_words / wpm
        reading_hours = reading_minutes / 60.0

        book_details = []
        for bs in book_stats:
            bk_read_min = bs["words"] / wpm if wpm > 0 else 0
            combat_min = bs["scenes"] * (config.get("wave_duration_seconds", 30) / 60.0)
            book_details.append({
                "book": bs["book"],
                "reading_minutes": round(bk_read_min, 1),
                "combat_minutes": round(combat_min, 1),
                "total_minutes": round(bk_read_min + combat_min, 1),
            })

        result[f"wpm_{wpm}"] = {
            "wpm": wpm,
            "total_reading_hours": round(reading_hours, 2),
            "per_book": book_details,
        }

    return result


def _sim_wall_detection(
    zone_prog: list[dict],
    econ_flow: list[dict],
    xp_curve: dict,
    config: dict,
) -> list[dict]:
    """5.3.6 — Flag progression walls."""
    walls = []

    # TTK > 5 minutes (300 seconds) for a single zone
    for entry in zone_prog:
        if entry["time_to_kill_seconds"] > 300:
            walls.append({
                "zone": entry["zone"],
                "type": "ttk_spike",
                "detail": f"TTK {entry['time_to_kill_seconds']:.1f}s exceeds 5-minute threshold",
            })

    # Gold income can't afford next upgrade within 10 minutes
    for entry in econ_flow:
        if entry["gold_per_minute"] > 0:
            mins_to_upgrade = entry["scenes_to_next_upgrade"] * 0.5  # ~30s per scene
            if mins_to_upgrade > 10:
                walls.append({
                    "zone": entry["zone"],
                    "type": "gold_wall",
                    "detail": f"Need {mins_to_upgrade:.1f} min to afford next upgrade (>10 min threshold)",
                })

    # XP stall: time between levels > 2 hours active play
    mixed = xp_curve.get("mixed", [])
    for i in range(1, len(mixed)):
        gap = mixed[i]["hours"] - mixed[i - 1]["hours"]
        if gap > 2.0 and mixed[i]["hours"] != math.inf:
            walls.append({
                "zone": 0,  # XP walls aren't zone-specific
                "type": "xp_stall",
                "detail": (
                    f"Level {mixed[i-1]['level']}->{mixed[i]['level']}: "
                    f"{gap:.1f}h gap exceeds 2h threshold"
                ),
            })

    return walls


def _sim_min_power_gates(config: dict, profile: dict) -> list[dict]:
    """5.3.7 — Min power gating for each boss."""
    bosses = _load_bosses(config)
    results = []

    for boss in bosses:
        hp = boss["hp"]
        enrage = boss["enrage_seconds"]
        min_dps = hp / enrage

        # Binary search for minimum level to produce required DPS
        lo, hi = 1, 500
        while lo < hi:
            mid = (lo + hi) // 2
            dps = _calc_player_dps(mid, profile, config)
            if dps >= min_dps:
                hi = mid
            else:
                lo = mid + 1

        required_skills = []
        if lo > boss["zone"] * 2:
            required_skills.append("overgeared_warning")
        if not profile.get("use_skills") and lo > 200:
            required_skills.append("skills_recommended")

        results.append({
            "boss": boss["name"],
            "min_level": lo,
            "min_dps": round(min_dps, 2),
            "required_skills": required_skills,
        })

    return results


def _sim_boss_dps_checks(config: dict, profile: dict) -> list[dict]:
    """5.3.8 — Boss DPS checks: HP, enrage, min DPS, min CPS at level."""
    bosses = _load_bosses(config)
    results = []

    for boss in bosses:
        hp = boss["hp"]
        enrage = boss["enrage_seconds"]
        min_dps = hp / enrage

        # Find minimum CPS needed at various levels
        test_levels = [boss["zone"], int(boss["zone"] * 1.5), boss["zone"] * 2]
        cps_at_level = {}
        for lvl in test_levels:
            lvl = max(1, lvl)
            base_click = click_damage(lvl, config.get("click_dmg_mult_per_level", 0.05))
            mile = milestone_multiplier(
                lvl,
                config.get("milestone_start", 200),
                config.get("milestone_interval", 25),
            )
            eff_click = base_click * mile
            crit_factor = 1.0 + config.get("crit_chance", 0.02) * (
                config.get("crit_multiplier", 2.0) - 1.0
            )
            dps_per_cps = eff_click * crit_factor
            auto_dps = 0.0
            if profile.get("use_skills"):
                auto_dps = lvl * config.get("auto_dps_mult_per_level", 0.05) * mile * 0.5
            needed_cps = max(0, (min_dps - auto_dps) / max(dps_per_cps, 0.001))
            cps_at_level[str(lvl)] = round(needed_cps, 2)

        results.append({
            "boss": boss["name"],
            "hp": round(hp, 2),
            "enrage_seconds": enrage,
            "min_dps": round(min_dps, 2),
            "min_cps_at_level": cps_at_level,
        })

    return results


def _calc_summary(
    zone_prog: list[dict],
    xp_curve: dict,
    content_timeline: dict,
    walls: list[dict],
    boss_checks: list[dict],
    profile: dict,
    config: dict,
) -> dict:
    """Calculate summary with day-by-day progression modeling."""
    # Day-by-day simulation for total hours estimate
    session_min = profile.get("session_length_minutes", 0)
    sessions_day = profile.get("sessions_per_day", 0)
    idle_hrs = profile.get("idle_hours_per_day", 0)
    active_hours_per_day = (session_min * sessions_day) / 60.0

    # Total play hours from mixed XP curve (use level 80 target)
    mixed = xp_curve.get("mixed", [])
    total_hours = 60.0  # default target
    if mixed:
        last = mixed[-1]
        if last["hours"] != math.inf:
            total_hours = last["hours"]

    # Book hours from content timeline at profile WPM
    wpm = profile.get("wpm", 200)
    wpm_key = f"wpm_{wpm}"
    ct = content_timeline.get(wpm_key, content_timeline.get("wpm_200", {}))

    book_hours = [0.0, 0.0, 0.0]
    per_book = ct.get("per_book", [])
    for b in per_book:
        idx = b.get("book", 1) - 1
        if 0 <= idx < 3:
            book_hours[idx] = round(b["total_minutes"] / 60.0, 2)

    # If book hours seem too low (just reading), add combat progression time
    zones_per_book = [
        (BOOK_ZONE_RANGES[i][1] - BOOK_ZONE_RANGES[i][0] + 1) for i in range(3)
    ]
    for i in range(3):
        z_start, z_end = BOOK_ZONE_RANGES[i]
        combat_time = 0.0
        for entry in zone_prog:
            if z_start <= entry["zone"] <= z_end:
                monsters = config.get("monsters_per_zone", 10)
                combat_time += entry["time_to_kill_seconds"] * monsters
        combat_hours = combat_time / 3600.0
        book_hours[i] = round(book_hours[i] + combat_hours, 2)

    total_from_books = sum(book_hours)
    total_hours = max(total_hours, total_from_books)

    # Find hardest boss (highest min_dps)
    hardest = "None"
    max_dps = 0.0
    for bc in boss_checks:
        if bc["min_dps"] > max_dps:
            max_dps = bc["min_dps"]
            hardest = bc["boss"]

    return {
        "total_hours_estimate": round(total_hours, 2),
        "book_1_hours": book_hours[0],
        "book_2_hours": book_hours[1],
        "book_3_hours": book_hours[2],
        "walls_detected": len(walls),
        "hardest_boss": hardest,
    }


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def run_simulation(profile_name: str, config: dict) -> dict:
    """Run the full math model simulation for a given profile.

    Args:
        profile_name: Name of the profile (e.g., 'casual') or a profile dict.
        config: Game config dict (DEFAULT_CONFIGS or merged overrides).

    Returns:
        Full simulation results dict.
    """
    if isinstance(profile_name, dict):
        profile = profile_name
        name = profile.get("name", "unknown")
    else:
        profile = load_profile(profile_name)
        name = profile_name

    # Run all simulation sections
    zone_prog = _sim_zone_progression(config, profile)
    econ_flow = _sim_economy_flow(config, profile, zone_prog)
    xp_curve = _sim_xp_curve(config, profile)
    content_timeline = _sim_content_timeline(config, profile)
    walls = _sim_wall_detection(zone_prog, econ_flow, xp_curve, config)
    min_power = _sim_min_power_gates(config, profile)
    boss_checks = _sim_boss_dps_checks(config, profile)
    summary = _calc_summary(
        zone_prog, xp_curve, content_timeline, walls, boss_checks, profile, config
    )

    return {
        "profile": name,
        "config_snapshot": config,
        "zone_progression": zone_prog,
        "economy_flow": econ_flow,
        "xp_curve": xp_curve,
        "content_timeline": content_timeline,
        "wall_detection": walls,
        "min_power_gates": min_power,
        "boss_dps_checks": boss_checks,
        "summary": summary,
    }


# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------

def _next_run_number() -> int:
    """Find next auto-incrementing run number in results dir."""
    os.makedirs(RESULTS_DIR, exist_ok=True)
    existing = globfiles(os.path.join(RESULTS_DIR, "math_model_run_*.json"))
    nums = []
    for p in existing:
        base = os.path.basename(p)
        try:
            n = int(base.replace("math_model_run_", "").replace(".json", ""))
            nums.append(n)
        except ValueError:
            pass
    return max(nums, default=0) + 1


def _write_json(result: dict, run_num: int) -> str:
    """Write full JSON results."""
    path = os.path.join(RESULTS_DIR, f"math_model_run_{run_num:03d}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, default=str)
    return path


def _write_csv(result: dict, run_num: int) -> str:
    """Write spreadsheet-importable CSV summary."""
    path = os.path.join(RESULTS_DIR, f"math_model_run_{run_num:03d}.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)

        # Zone progression table
        writer.writerow(["=== Zone Progression ==="])
        writer.writerow(["Zone", "HP", "Gold/Kill", "TTK (s)", "Gold/Min"])
        for z in result["zone_progression"]:
            writer.writerow([z["zone"], z["hp"], z["gold_per_kill"],
                             z["time_to_kill_seconds"], z["gold_per_minute"]])

        writer.writerow([])

        # Economy flow
        writer.writerow(["=== Economy Flow ==="])
        writer.writerow(["Zone", "Gold/Min", "Essence/Scene", "Scenes to Upgrade"])
        for e in result["economy_flow"]:
            writer.writerow([e["zone"], e["gold_per_minute"],
                             e["essence_per_scene"], e["scenes_to_next_upgrade"]])

        writer.writerow([])

        # XP curve
        writer.writerow(["=== XP Curve ==="])
        for mode in ["active_only", "idle_only", "mixed"]:
            writer.writerow([f"--- {mode} ---"])
            writer.writerow(["Level", "Hours"])
            for entry in result["xp_curve"][mode]:
                writer.writerow([entry["level"], entry["hours"]])

        writer.writerow([])

        # Wall detection
        writer.writerow(["=== Wall Detection ==="])
        writer.writerow(["Zone", "Type", "Detail"])
        for w in result["wall_detection"]:
            writer.writerow([w["zone"], w["type"], w["detail"]])

        writer.writerow([])

        # Summary
        writer.writerow(["=== Summary ==="])
        for k, v in result["summary"].items():
            writer.writerow([k, v])

    return path


def _append_results_md(result: dict, run_num: int) -> str:
    """Append summary to RESULTS.md."""
    path = os.path.join(RESULTS_DIR, "RESULTS.md")
    s = result["summary"]
    with open(path, "a", encoding="utf-8") as f:
        f.write(f"\n## Run {run_num:03d} — Profile: {result['profile']}\n\n")
        f.write(f"| Metric | Value |\n|--------|-------|\n")
        f.write(f"| Total Hours | {s['total_hours_estimate']} |\n")
        f.write(f"| Book 1 | {s['book_1_hours']}h |\n")
        f.write(f"| Book 2 | {s['book_2_hours']}h |\n")
        f.write(f"| Book 3 | {s['book_3_hours']}h |\n")
        f.write(f"| Walls Detected | {s['walls_detected']} |\n")
        f.write(f"| Hardest Boss | {s['hardest_boss']} |\n")
        f.write("\n")
    return path


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="ERP Math Model Simulation Runner")
    parser.add_argument("--profile", type=str, help="Profile name to simulate")
    parser.add_argument("--all", action="store_true", help="Run all profiles")
    parser.add_argument("--config", type=str, help="Path to config overrides JSON")
    args = parser.parse_args()

    if not args.profile and not args.all:
        parser.error("Specify --profile <name> or --all")

    # Load config
    config = dict(DEFAULT_CONFIGS)
    if args.config:
        config = load_config_overrides(args.config)

    # Determine profiles to run
    if args.all:
        profile_files = globfiles(os.path.join(PROFILES_DIR, "*.json"))
        profile_names = [
            os.path.basename(p).replace(".json", "") for p in profile_files
        ]
    else:
        profile_names = [args.profile]

    # Run simulations
    for pname in profile_names:
        print(f"Running simulation for profile: {pname}")
        result = run_simulation(pname, config)

        run_num = _next_run_number()
        json_path = _write_json(result, run_num)
        csv_path = _write_csv(result, run_num)
        md_path = _append_results_md(result, run_num)

        s = result["summary"]
        print(f"  Run #{run_num:03d}")
        print(f"  Total hours: {s['total_hours_estimate']}")
        print(f"  Walls: {s['walls_detected']}")
        print(f"  Hardest boss: {s['hardest_boss']}")
        print(f"  Output: {json_path}")
        print(f"  CSV:    {csv_path}")
        print(f"  MD:     {md_path}")
        print()


if __name__ == "__main__":
    main()
