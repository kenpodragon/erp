#!/usr/bin/env python3
"""
tools/scan_content_gaps.py

Standalone content gap scanner. Queries the DB for missing content across
all major game systems and prints a summary table.

Usage:
    python tools/scan_content_gaps.py
    python tools/scan_content_gaps.py --verbose
    python tools/scan_content_gaps.py --audit   # also write to dev_content_audit table
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

_TOOLS_DIR = Path(__file__).resolve().parent
if str(_TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(_TOOLS_DIR))

from lib.db_client import DBClient


# ---------------------------------------------------------------------------
# Gap definitions
# Each tuple: (label, count_sql, verbose_sql, category, entity_type, field_name, message)
# verbose_sql should return rows with at least an 'id' column
# ---------------------------------------------------------------------------

_GAPS = [
    (
        "Entities without entity_gameplay_data",
        """
        SELECT COUNT(*) AS cnt
        FROM entities e
        LEFT JOIN entity_gameplay_data eg ON eg.entity_id = e.id
        WHERE eg.id IS NULL
        """,
        """
        SELECT e.id, e.canonical_name AS name
        FROM entities e
        LEFT JOIN entity_gameplay_data eg ON eg.entity_id = e.id
        WHERE eg.id IS NULL
        ORDER BY e.id
        """,
        "entity_gameplay",
        "entity",
        "entity_gameplay_data",
        "Entity has no gameplay data row",
    ),
    (
        "Scenes without entity assignments",
        """
        SELECT COUNT(*) AS cnt
        FROM scenes s
        LEFT JOIN entity_scene_appearances esa ON esa.scene_id = s.id
        WHERE esa.id IS NULL
        """,
        """
        SELECT s.id, s.scene_number, s.scene_type
        FROM scenes s
        LEFT JOIN entity_scene_appearances esa ON esa.scene_id = s.id
        WHERE esa.id IS NULL
        ORDER BY s.id
        """,
        "scene_assignment",
        "scene",
        "entity_scene_appearances",
        "Scene has no entity assignments",
    ),
    (
        "Chapters without atmosphere_id",
        """
        SELECT COUNT(*) AS cnt
        FROM chapters
        WHERE atmosphere_id IS NULL
        """,
        """
        SELECT id, title AS name
        FROM chapters
        WHERE atmosphere_id IS NULL
        ORDER BY id
        """,
        "atmosphere",
        "chapter",
        "atmosphere_id",
        "Chapter has no atmosphere assigned",
    ),
    (
        "Chapters without transition_lore_text",
        """
        SELECT COUNT(*) AS cnt
        FROM chapters
        WHERE transition_lore_text IS NULL
        """,
        """
        SELECT id, title AS name
        FROM chapters
        WHERE transition_lore_text IS NULL
        ORDER BY id
        """,
        "boss_lore",
        "chapter",
        "transition_lore_text",
        "Chapter has no boss transition lore text",
    ),
    (
        "Books without transition_lore_text",
        """
        SELECT COUNT(*) AS cnt
        FROM books
        WHERE transition_lore_text IS NULL
        """,
        """
        SELECT id, title AS name
        FROM books
        WHERE transition_lore_text IS NULL
        ORDER BY id
        """,
        "boss_lore",
        "book",
        "transition_lore_text",
        "Book has no boss transition lore text",
    ),
    (
        "entity_gameplay_data without sprite_key",
        """
        SELECT COUNT(*) AS cnt
        FROM entity_gameplay_data
        WHERE sprite_key IS NULL OR sprite_key = ''
        """,
        """
        SELECT eg.id, e.canonical_name AS name
        FROM entity_gameplay_data eg
        LEFT JOIN entities e ON e.id = eg.entity_id
        WHERE eg.sprite_key IS NULL OR eg.sprite_key = ''
        ORDER BY eg.id
        """,
        "sprite",
        "entity_gameplay_data",
        "sprite_key",
        "entity_gameplay_data row has no sprite_key",
    ),
    (
        "entity_gameplay_data without death_sfx_key",
        """
        SELECT COUNT(*) AS cnt
        FROM entity_gameplay_data
        WHERE death_sfx_key IS NULL
        """,
        """
        SELECT eg.id, e.canonical_name AS name
        FROM entity_gameplay_data eg
        LEFT JOIN entities e ON e.id = eg.entity_id
        WHERE eg.death_sfx_key IS NULL
        ORDER BY eg.id
        """,
        "sfx",
        "entity_gameplay_data",
        "death_sfx_key",
        "entity_gameplay_data row has no death SFX key",
    ),
    (
        "Skills without SFX (idle_skill_definitions)",
        """
        SELECT COUNT(*) AS cnt
        FROM idle_skill_definitions
        WHERE sfx_key IS NULL OR sfx_key = ''
        """,
        """
        SELECT id, name
        FROM idle_skill_definitions
        WHERE sfx_key IS NULL OR sfx_key = ''
        ORDER BY id
        """,
        "sfx",
        "idle_skill_definition",
        "sfx_key",
        "Skill has no SFX key assigned",
    ),
]

# Fallback query for skills if idle_skill_definitions doesn't have sfx_key column
_SKILLS_FALLBACK_COUNT = "SELECT COUNT(*) AS cnt FROM idle_skill_definitions"
_SKILLS_FALLBACK_VERBOSE = "SELECT id, name FROM idle_skill_definitions ORDER BY id"


def _run_query_safe(db: DBClient, sql: str, fallback_count: int = 0) -> list[dict]:
    """Run a query, return empty list on error (table may not exist yet)."""
    try:
        return db.query(sql)
    except Exception:
        return []


def _count_safe(db: DBClient, sql: str) -> int:
    try:
        rows = db.query(sql)
        return rows[0]["cnt"] if rows else 0
    except Exception:
        return -1  # -1 = error / table not found


def _table_exists(db: DBClient, table_name: str) -> bool:
    try:
        rows = db.query("SELECT to_regclass($1) AS t", [table_name])
        return bool(rows and rows[0].get("t"))
    except Exception:
        return False


def _column_exists(db: DBClient, table_name: str, column_name: str) -> bool:
    try:
        rows = db.query(
            """
            SELECT column_name FROM information_schema.columns
            WHERE table_name = $1 AND column_name = $2
            """,
            [table_name, column_name],
        )
        return bool(rows)
    except Exception:
        return False


def _audit_insert(db: DBClient, category: str, entity_type: str, entity_id: int, field_name: str, message: str) -> None:
    """Best-effort insert into dev_content_audit."""
    try:
        db.insert_one("dev_content_audit", {
            "category": category,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "field_name": field_name,
            "message": message,
        })
    except Exception:
        pass  # Table may not support ON CONFLICT or may be absent


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="scan_content_gaps",
        description="Scan the DB for missing content and report gaps.",
    )
    parser.add_argument("--verbose", action="store_true", default=False,
                        help="Also list specific IDs with missing content.")
    parser.add_argument("--audit", action="store_true", default=False,
                        help="Write gap entries to dev_content_audit table.")
    args = parser.parse_args()

    db = DBClient()
    try:
        print("\n=== Content Gap Scanner ===\n")
        print(f"{'Gap':<50} {'Count':>8}  {'Status'}")
        print("-" * 75)

        total_gaps = 0

        for (label, count_sql, verbose_sql, category, entity_type, field_name, message) in _GAPS:
            # Special handling for skills SFX — sfx_key column may not exist
            if "idle_skill_definitions" in count_sql and "sfx_key" in count_sql:
                if not _table_exists(db, "idle_skill_definitions"):
                    count = -1
                    rows = []
                elif not _column_exists(db, "idle_skill_definitions", "sfx_key"):
                    # Best effort — count all skills as potentially missing
                    count = _count_safe(db, _SKILLS_FALLBACK_COUNT)
                    rows = _run_query_safe(db, _SKILLS_FALLBACK_VERBOSE) if args.verbose or args.audit else []
                    if count > 0:
                        label = f"{label} (sfx_key column absent — all skills flagged)"
                else:
                    count = _count_safe(db, count_sql)
                    rows = _run_query_safe(db, verbose_sql) if (args.verbose or args.audit) else []
            else:
                count = _count_safe(db, count_sql)
                rows = _run_query_safe(db, verbose_sql) if (args.verbose or args.audit) else []

            if count == -1:
                status = "N/A (table missing)"
                count_str = "  N/A"
            elif count == 0:
                status = "OK"
                count_str = f"{count:>8}"
            else:
                status = "MISSING"
                count_str = f"{count:>8}"
                total_gaps += count

            print(f"{label:<50} {count_str}  {status}")

            if args.verbose and rows:
                for row in rows[:20]:
                    row_id = row.get("id", "?")
                    row_name = row.get("name", "")
                    print(f"    → id={row_id} {row_name}")
                if len(rows) > 20:
                    print(f"    ... and {len(rows) - 20} more")

            if args.audit and rows and count > 0:
                for row in rows:
                    row_id = row.get("id")
                    if row_id is not None:
                        _audit_insert(db, category, entity_type, int(row_id), field_name, message)

        print("-" * 75)
        print(f"\nTotal gaps found: {total_gaps}")

        if total_gaps == 0:
            print("\nAll content gaps resolved.")
        else:
            print("\nRun the relevant generators to fill these gaps:")
            print("  python tools/generate_entity_gameplay.py generate")
            print("  python tools/generate_scene_data.py generate")
            print("  python tools/generate_lore_content.py generate")
            print("  python tools/generate_boss_lore.py generate")
            print("  python tools/generate_entity_sprites.py generate")

        print()

    finally:
        db.close()


if __name__ == "__main__":
    main()
