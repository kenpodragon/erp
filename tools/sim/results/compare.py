#!/usr/bin/env python3
"""
Compare two simulation run result JSON files and report differences.

Usage:
    python results/compare.py <file1.json> <file2.json>
    python results/compare.py --baseline results/math_model_run_001.json --candidate results/api_bot_casual_001.json
"""

import argparse
import json
import sys
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

# ── Design targets ───────────────────────────────────────────────────────────
TARGETS = {
    "casual_total_hours": 60.0,
    "power_gamer_total_hours_min": 168.0,
    "power_gamer_total_hours_max": 240.0,
    "power_gamer_active_hours_min": 56.0,
    "power_gamer_active_hours_max": 80.0,
    "idle_speed_ratio_min": 0.20,
    "idle_speed_ratio_max": 0.30,
}

# Fields where lower-is-better toward target (hours for casual)
LOWER_IS_CLOSER = {"total_hours_estimate", "book_1_hours", "book_2_hours", "book_3_hours"}

# ── ANSI colors ──────────────────────────────────────────────────────────────
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"


def load_json(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def pct_change(old: float, new: float) -> Optional[float]:
    if old == 0:
        return None
    return ((new - old) / abs(old)) * 100.0


def severity(pct: Optional[float]) -> str:
    if pct is None:
        return ""
    absp = abs(pct)
    if absp > 10:
        return "MAJOR"
    elif absp > 5:
        return "significant"
    return ""


def direction_color(field: str, old_val: float, new_val: float, profile: str) -> str:
    """Return ANSI color based on whether the change moves toward design targets."""
    target = None
    if profile == "casual" and field == "total_hours_estimate":
        target = TARGETS["casual_total_hours"]
    elif profile in ("power", "power_gamer") and field == "total_hours_estimate":
        # midpoint of range
        target = (TARGETS["power_gamer_total_hours_min"] + TARGETS["power_gamer_total_hours_max"]) / 2.0

    if target is not None:
        old_dist = abs(old_val - target)
        new_dist = abs(new_val - target)
        return GREEN if new_dist < old_dist else RED

    # For hour fields on casual, closer to 60 is better
    if profile == "casual" and field in LOWER_IS_CLOSER:
        # Rough heuristic: hours should be proportional to 60hr total
        return GREEN if new_val <= old_val else RED

    # Generic: more gold/xp/essence = generally positive
    if field in ("total_gold", "total_essence", "total_xp", "scenes_completed", "max_zone_reached"):
        return GREEN if new_val >= old_val else RED

    return RESET


# ── Config diff ──────────────────────────────────────────────────────────────
def diff_configs(cfg1: dict, cfg2: dict) -> List[dict]:
    all_keys = sorted(set(list(cfg1.keys()) + list(cfg2.keys())))
    diffs = []
    for k in all_keys:
        v1 = cfg1.get(k)
        v2 = cfg2.get(k)
        if v1 != v2:
            diffs.append({"key": k, "baseline": v1, "candidate": v2})
    return diffs


def print_config_diff(diffs: List[dict]) -> None:
    if not diffs:
        print(f"\n{CYAN}Config Diff:{RESET} No differences.\n")
        return
    print(f"\n{BOLD}{CYAN}Config Diff ({len(diffs)} changed keys):{RESET}")
    print(f"  {'Key':<40} {'Baseline':>15} {'Candidate':>15}")
    print(f"  {'─' * 40} {'─' * 15} {'─' * 15}")
    for d in diffs:
        bv = str(d["baseline"]) if d["baseline"] is not None else "(missing)"
        cv = str(d["candidate"]) if d["candidate"] is not None else "(missing)"
        print(f"  {d['key']:<40} {bv:>15} {cv:>15}")
    print()


# ── Summary diff ─────────────────────────────────────────────────────────────
def diff_summaries(s1: dict, s2: dict, profile: str) -> List[dict]:
    all_keys = sorted(set(list(s1.keys()) + list(s2.keys())))
    diffs = []
    for k in all_keys:
        v1 = s1.get(k)
        v2 = s2.get(k)
        # Only compare numeric values
        if not isinstance(v1, (int, float)) and not isinstance(v2, (int, float)):
            continue
        v1 = v1 if isinstance(v1, (int, float)) else 0
        v2 = v2 if isinstance(v2, (int, float)) else 0
        delta = v2 - v1
        pct = pct_change(v1, v2)
        sev = severity(pct)
        color = direction_color(k, v1, v2, profile)
        diffs.append({
            "field": k,
            "baseline": v1,
            "candidate": v2,
            "delta": delta,
            "pct_change": pct,
            "severity": sev,
            "color": color,
        })
    return diffs


def print_summary_diff(diffs: List[dict]) -> None:
    if not diffs:
        print(f"\n{CYAN}Summary Diff:{RESET} No numeric fields to compare.\n")
        return
    print(f"\n{BOLD}{CYAN}Summary Diff:{RESET}")
    header = f"  {'Field':<30} {'Baseline':>12} {'Candidate':>12} {'Delta':>12} {'% Change':>10} {'Severity':>12}"
    print(header)
    print(f"  {'─' * 30} {'─' * 12} {'─' * 12} {'─' * 12} {'─' * 10} {'─' * 12}")
    for d in diffs:
        pct_str = f"{d['pct_change']:+.1f}%" if d['pct_change'] is not None else "N/A"
        sev_str = d["severity"]
        color = d.get("color", RESET)
        sev_color = RED if sev_str == "MAJOR" else (YELLOW if sev_str == "significant" else RESET)
        delta_str = f"{d['delta']:+.2f}" if isinstance(d['delta'], float) else f"{d['delta']:+d}"
        base_str = f"{d['baseline']:.2f}" if isinstance(d['baseline'], float) else str(d['baseline'])
        cand_str = f"{d['candidate']:.2f}" if isinstance(d['candidate'], float) else str(d['candidate'])
        print(
            f"  {d['field']:<30} {base_str:>12} {color}{cand_str:>12}{RESET}"
            f" {color}{delta_str:>12}{RESET} {color}{pct_str:>10}{RESET}"
            f" {sev_color}{sev_str:>12}{RESET}"
        )
    print()


# ── Zone progression diff ───────────────────────────────────────────────────
def diff_zone_progression(z1: list, z2: list) -> List[dict]:
    diffs = []
    max_len = max(len(z1), len(z2))
    for i in range(max_len):
        zone_b = z1[i] if i < len(z1) else {}
        zone_c = z2[i] if i < len(z2) else {}
        zone_id = zone_b.get("zone", zone_c.get("zone", i + 1))
        entry = {"zone": zone_id, "changes": {}}
        all_keys = sorted(set(list(zone_b.keys()) + list(zone_c.keys())))
        for k in all_keys:
            vb = zone_b.get(k)
            vc = zone_c.get(k)
            if isinstance(vb, (int, float)) and isinstance(vc, (int, float)) and vb != vc:
                entry["changes"][k] = {
                    "baseline": vb,
                    "candidate": vc,
                    "delta": vc - vb,
                    "pct_change": pct_change(vb, vc),
                }
        if entry["changes"]:
            diffs.append(entry)
    return diffs


def print_zone_diff(diffs: List[dict]) -> None:
    if not diffs:
        print(f"{CYAN}Zone Progression Diff:{RESET} No differences.\n")
        return
    print(f"{BOLD}{CYAN}Zone Progression Diff ({len(diffs)} zones changed):{RESET}")
    for zd in diffs[:20]:  # cap at 20 for readability
        zone_label = f"  Zone {zd['zone']}: "
        parts = []
        for k, v in zd["changes"].items():
            pct_str = f"{v['pct_change']:+.1f}%" if v["pct_change"] is not None else "N/A"
            parts.append(f"{k}: {v['baseline']}->{v['candidate']} ({pct_str})")
        print(zone_label + ", ".join(parts))
    if len(diffs) > 20:
        print(f"  ... and {len(diffs) - 20} more zones")
    print()


# ── Wall detection diff ─────────────────────────────────────────────────────
def diff_walls(w1: list, w2: list) -> dict:
    set1 = set()
    set2 = set()
    for w in w1:
        label = w.get("zone", w.get("scene", str(w)))
        set1.add(str(label))
    for w in w2:
        label = w.get("zone", w.get("scene", str(w)))
        set2.add(str(label))
    return {
        "removed": sorted(set1 - set2),
        "added": sorted(set2 - set1),
        "unchanged": sorted(set1 & set2),
    }


def print_wall_diff(walls: dict) -> None:
    print(f"{BOLD}{CYAN}Wall Detection Diff:{RESET}")
    if walls["removed"]:
        print(f"  {GREEN}Walls REMOVED (good):{RESET} {', '.join(walls['removed'])}")
    if walls["added"]:
        print(f"  {RED}Walls ADDED (bad):{RESET} {', '.join(walls['added'])}")
    if walls["unchanged"]:
        print(f"  Unchanged: {', '.join(walls['unchanged'])}")
    if not walls["removed"] and not walls["added"] and not walls["unchanged"]:
        print("  No wall data in either file.")
    print()


# ── Verdict ──────────────────────────────────────────────────────────────────
def compute_verdict(s1: dict, s2: dict, profile: str) -> dict:
    verdict = {"profile": profile, "assessments": [], "overall": "neutral"}
    improvements = 0
    regressions = 0

    total_b = s1.get("total_hours_estimate", 0)
    total_c = s2.get("total_hours_estimate", 0)

    if profile == "casual":
        target = TARGETS["casual_total_hours"]
        dist_b = abs(total_b - target)
        dist_c = abs(total_c - target)
        if dist_c < dist_b:
            verdict["assessments"].append(
                f"Total hours moved TOWARD 60hr target ({total_b:.1f}h -> {total_c:.1f}h, target {target}h)"
            )
            improvements += 1
        elif dist_c > dist_b:
            verdict["assessments"].append(
                f"Total hours moved AWAY from 60hr target ({total_b:.1f}h -> {total_c:.1f}h, target {target}h)"
            )
            regressions += 1
        else:
            verdict["assessments"].append(f"Total hours unchanged at {total_c:.1f}h (target {target}h)")
    elif profile in ("power", "power_gamer"):
        t_min = TARGETS["power_gamer_total_hours_min"]
        t_max = TARGETS["power_gamer_total_hours_max"]
        in_range_b = t_min <= total_b <= t_max
        in_range_c = t_min <= total_c <= t_max
        if in_range_c and not in_range_b:
            verdict["assessments"].append(
                f"Total hours now IN target range [{t_min}-{t_max}h] ({total_b:.1f}h -> {total_c:.1f}h)"
            )
            improvements += 1
        elif not in_range_c and in_range_b:
            verdict["assessments"].append(
                f"Total hours fell OUT of target range [{t_min}-{t_max}h] ({total_b:.1f}h -> {total_c:.1f}h)"
            )
            regressions += 1
        else:
            midpoint = (t_min + t_max) / 2.0
            dist_b = abs(total_b - midpoint)
            dist_c = abs(total_c - midpoint)
            direction = "toward" if dist_c < dist_b else "away from"
            verdict["assessments"].append(
                f"Total hours moved {direction} power gamer range ({total_b:.1f}h -> {total_c:.1f}h)"
            )
            if dist_c < dist_b:
                improvements += 1
            elif dist_c > dist_b:
                regressions += 1

    # Check walls
    walls_b = len(s1.get("wall_count", []) if isinstance(s1.get("wall_count"), list) else [])
    walls_c = len(s2.get("wall_count", []) if isinstance(s2.get("wall_count"), list) else [])
    # Try numeric wall_count if present
    if isinstance(s1.get("wall_count"), (int, float)):
        walls_b = int(s1["wall_count"])
    if isinstance(s2.get("wall_count"), (int, float)):
        walls_c = int(s2["wall_count"])
    if walls_b > 0 or walls_c > 0:
        if walls_c < walls_b:
            verdict["assessments"].append(f"Fewer walls detected ({walls_b} -> {walls_c})")
            improvements += 1
        elif walls_c > walls_b:
            verdict["assessments"].append(f"More walls detected ({walls_b} -> {walls_c})")
            regressions += 1

    if improvements > regressions:
        verdict["overall"] = "improved"
    elif regressions > improvements:
        verdict["overall"] = "regressed"
    else:
        verdict["overall"] = "neutral"

    return verdict


def print_verdict(verdict: dict) -> None:
    overall = verdict["overall"]
    color = GREEN if overall == "improved" else (RED if overall == "regressed" else YELLOW)
    print(f"{BOLD}{CYAN}Verdict ({verdict['profile']} profile):{RESET}")
    for a in verdict["assessments"]:
        print(f"  - {a}")
    print(f"  {BOLD}Overall: {color}{overall.upper()}{RESET}")
    print()


# ── Main ─────────────────────────────────────────────────────────────────────
def compare(baseline_path: str, candidate_path: str) -> dict:
    baseline = load_json(baseline_path)
    candidate = load_json(candidate_path)

    profile = baseline.get("profile", candidate.get("profile", "unknown"))

    # Config diff
    cfg1 = baseline.get("config", {})
    cfg2 = candidate.get("config", {})
    config_diffs = diff_configs(cfg1, cfg2)

    # Summary diff
    sum1 = baseline.get("summary", {})
    sum2 = candidate.get("summary", {})
    summary_diffs = diff_summaries(sum1, sum2, profile)

    # Zone progression diff
    zone_diffs = []
    if baseline.get("zone_progression") and candidate.get("zone_progression"):
        zone_diffs = diff_zone_progression(
            baseline["zone_progression"], candidate["zone_progression"]
        )

    # Wall detection diff
    wall_diff = diff_walls(
        baseline.get("wall_detection", []),
        candidate.get("wall_detection", []),
    )

    # Verdict
    verdict = compute_verdict(sum1, sum2, profile)

    # ── Print ────────────────────────────────────────────────────────────
    print(f"\n{BOLD}{'=' * 80}{RESET}")
    print(f"{BOLD}  Simulation Comparison Report{RESET}")
    print(f"{'=' * 80}")
    print(f"  Baseline:  {os.path.basename(baseline_path)}")
    print(f"  Candidate: {os.path.basename(candidate_path)}")
    print(f"  Profile:   {profile}")
    ts_b = baseline.get("timestamp", "N/A")
    ts_c = candidate.get("timestamp", "N/A")
    print(f"  Timestamps: {ts_b}  vs  {ts_c}")
    print(f"{'=' * 80}")

    print_config_diff(config_diffs)
    print_summary_diff(summary_diffs)
    print_zone_diff(zone_diffs)
    print_wall_diff(wall_diff)
    print_verdict(verdict)

    # ── Build output JSON ────────────────────────────────────────────────
    result = {
        "comparison_timestamp": datetime.now(timezone.utc).isoformat(),
        "baseline_file": os.path.basename(baseline_path),
        "candidate_file": os.path.basename(candidate_path),
        "profile": profile,
        "config_diff": config_diffs,
        "summary_diff": [
            {
                "field": d["field"],
                "baseline": d["baseline"],
                "candidate": d["candidate"],
                "delta": d["delta"],
                "pct_change": d["pct_change"],
                "severity": d["severity"],
            }
            for d in summary_diffs
        ],
        "zone_progression_diff": zone_diffs,
        "wall_diff": wall_diff,
        "verdict": verdict,
    }

    return result


def write_result(result: dict) -> str:
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    out_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(out_dir, f"comparison_{ts}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, default=str)
    return out_path


def main():
    parser = argparse.ArgumentParser(
        description="Compare two simulation run result JSON files."
    )
    parser.add_argument("files", nargs="*", help="Two JSON files to compare (positional)")
    parser.add_argument("--baseline", "-b", help="Baseline result JSON file")
    parser.add_argument("--candidate", "-c", help="Candidate result JSON file")

    args = parser.parse_args()

    # Resolve file paths
    if args.baseline and args.candidate:
        baseline_path = args.baseline
        candidate_path = args.candidate
    elif len(args.files) == 2:
        baseline_path = args.files[0]
        candidate_path = args.files[1]
    else:
        parser.error(
            "Provide two JSON files either as positional args or via --baseline/--candidate"
        )
        return

    if not os.path.isfile(baseline_path):
        print(f"Error: baseline file not found: {baseline_path}", file=sys.stderr)
        sys.exit(1)
    if not os.path.isfile(candidate_path):
        print(f"Error: candidate file not found: {candidate_path}", file=sys.stderr)
        sys.exit(1)

    result = compare(baseline_path, candidate_path)
    out_path = write_result(result)
    print(f"{CYAN}Detailed comparison written to:{RESET} {out_path}\n")


if __name__ == "__main__":
    main()
