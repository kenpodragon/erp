"""Capture current game_configs as difficulty presets.

Usage:
    python tools/capture_difficulty_preset.py
    python tools/capture_difficulty_preset.py --dry-run
    python tools/capture_difficulty_preset.py --export-sql
"""
from __future__ import annotations

import argparse
import json
import os
import sys

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from tools.generators.lib.db_client import DBClient  # noqa: E402
from tools.sim.config import DEFAULT_CONFIGS  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fetch_live_snapshot(db: DBClient) -> dict:
    """Return {key: value_json} for every row in game_configs."""
    rows = db.query("SELECT key, value_json FROM game_configs ORDER BY key")
    return {r["key"]: r["value_json"] for r in rows}


def _build_original_snapshot() -> dict:
    """Return DEFAULT_CONFIGS as the 'Original' snapshot.

    Values are stored as plain Python scalars (same shape as value_json column).
    """
    return dict(DEFAULT_CONFIGS)


def _preset_exists(db: DBClient, name: str) -> bool:
    rows = db.query(
        "SELECT id FROM difficulty_presets WHERE name = %s",
        {"name": name},
    )
    return len(rows) > 0


def _build_insert_sql(preset: dict) -> str:
    """Return a single-row INSERT statement for --export-sql mode."""
    snapshot_json = json.dumps(preset["config_snapshot"])
    wave_preset = "NULL" if preset["wave_preset_id"] is None else str(preset["wave_preset_id"])
    is_active_sql = "TRUE" if preset["is_active"] else "FALSE"
    # Escape single quotes inside text fields
    name = preset["name"].replace("'", "''")
    description = preset["description"].replace("'", "''")
    snapshot_escaped = snapshot_json.replace("'", "''")
    return (
        "INSERT INTO difficulty_presets "
        "(name, description, difficulty_curve_id, wave_preset_id, config_snapshot, is_active) VALUES "
        f"('{name}', '{description}', {preset['difficulty_curve_id']}, "
        f"{wave_preset}, '{snapshot_escaped}'::jsonb, {is_active_sql});"
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Capture game_configs as difficulty presets in the database."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be inserted without writing to the database.",
    )
    parser.add_argument(
        "--export-sql",
        action="store_true",
        help="Print INSERT SQL statements instead of executing them.",
    )
    args = parser.parse_args()

    db = DBClient(env_file=os.path.join(_ROOT_DIR, "backend", ".env"))

    try:
        live_snapshot = _fetch_live_snapshot(db)
        print(f"[INFO] Fetched {len(live_snapshot)} keys from game_configs.")

        original_snapshot = _build_original_snapshot()
        print(f"[INFO] Built Original snapshot from DEFAULT_CONFIGS ({len(original_snapshot)} keys).")

        presets = [
            {
                "name": "Original",
                "description": (
                    "Baseline game configuration values from DEFAULT_CONFIGS "
                    "before any tuning or balancing was applied."
                ),
                "difficulty_curve_id": 1,
                "wave_preset_id": None,
                "config_snapshot": original_snapshot,
                "is_active": False,
            },
            {
                "name": "Balanced",
                "description": (
                    "Current live game configuration captured after simulation-based "
                    "balancing. Active preset used by the game."
                ),
                "difficulty_curve_id": 1,
                "wave_preset_id": None,
                "config_snapshot": live_snapshot,
                "is_active": True,
            },
        ]

        for preset in presets:
            name = preset["name"]

            if args.export_sql:
                print(_build_insert_sql(preset))
                continue

            if args.dry_run:
                print(f"\n[DRY-RUN] Would insert preset '{name}':")
                print(f"  difficulty_curve_id : {preset['difficulty_curve_id']}")
                print(f"  wave_preset_id      : {preset['wave_preset_id']}")
                print(f"  is_active           : {preset['is_active']}")
                print(f"  config_snapshot keys: {len(preset['config_snapshot'])}")
                continue

            # Live insert
            if _preset_exists(db, name):
                print(f"[SKIP] Preset '{name}' already exists — skipping.")
                continue

            row_data = {
                "name": preset["name"],
                "description": preset["description"],
                "difficulty_curve_id": preset["difficulty_curve_id"],
                "wave_preset_id": preset["wave_preset_id"],
                "config_snapshot": json.dumps(preset["config_snapshot"]),
                "is_active": preset["is_active"],
            }
            inserted_id = db.insert_one("difficulty_presets", row_data)
            print(f"[OK] Inserted preset '{name}' with id={inserted_id}.")

    finally:
        db.close()


if __name__ == "__main__":
    main()
