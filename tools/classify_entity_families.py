#!/usr/bin/env python3
"""
Entity Family Classifier (REC 2.6.2)

Analyzes entity canonical_names and assigns entity_family values
based on pattern matching. Outputs SQL UPDATE statements for review.

Usage:
    python tools/classify_entity_families.py [--apply]
"""

import os
import re
import sys
import argparse
from pathlib import Path

# Load .env from backend
env_path = Path(__file__).parent.parent / "backend" / ".env"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, val = line.partition("=")
            os.environ.setdefault(key.strip(), val.strip())

DATABASE_URL = os.environ.get("DATABASE_URL", "")

# Family classification patterns (order matters — first match wins)
FAMILY_PATTERNS = [
    (r"wraith|specter|phantom|ghost|spirit", "Wraith"),
    (r"golem|construct|automaton|sentinel", "Golem"),
    (r"shade|shadow|dark", "Shade"),
    (r"dragon|drake|wyrm|wyvern", "Dragon"),
    (r"demon|fiend|imp|devil", "Demon"),
    (r"undead|skeleton|zombie|lich|necro", "Undead"),
    (r"beast|wolf|bear|boar|lion|serpent|spider|scorpion", "Beast"),
    (r"elemental|flame|frost|storm|earth|water|fire|ice|lightning", "Elemental"),
    (r"slime|ooze|blob|jelly", "Slime"),
    (r"goblin|orc|troll|ogre", "Greenskin"),
    (r"knight|warrior|soldier|guard|paladin", "Humanoid"),
    (r"mage|wizard|sorcerer|witch|warlock", "Caster"),
    (r"angel|celestial|seraph", "Celestial"),
    (r"plant|vine|treant|mushroom|spore", "Flora"),
    (r"insect|beetle|ant|wasp|moth", "Insect"),
]


def classify_name(name: str) -> str | None:
    """Return entity_family for a given canonical_name, or None."""
    lower = name.lower()
    for pattern, family in FAMILY_PATTERNS:
        if re.search(pattern, lower):
            return family
    return None


def main():
    parser = argparse.ArgumentParser(description="Classify entity families")
    parser.add_argument("--apply", action="store_true", help="Apply changes directly to DB")
    parser.add_argument("--dry-run", action="store_true", default=True, help="Output SQL only (default)")
    args = parser.parse_args()

    if not DATABASE_URL:
        print("ERROR: DATABASE_URL not found in environment or backend/.env")
        sys.exit(1)

    try:
        import psycopg2
    except ImportError:
        print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
        sys.exit(1)

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Fetch all entities
    cur.execute("SELECT id, canonical_name, entity_family FROM entities ORDER BY id")
    entities = cur.fetchall()

    updates = []
    unclassified = []

    for eid, name, current_family in entities:
        if current_family:
            continue  # Already classified
        family = classify_name(name)
        if family:
            updates.append((eid, name, family))
        else:
            unclassified.append((eid, name))

    # Output results
    print(f"\n=== Entity Family Classification ===")
    print(f"Total entities: {len(entities)}")
    print(f"Already classified: {sum(1 for _, _, f in entities if f)}")
    print(f"Newly classified: {len(updates)}")
    print(f"Unclassified: {len(unclassified)}")

    if updates:
        print(f"\n--- SQL Updates ({len(updates)}) ---")
        for eid, name, family in updates:
            sql = f"UPDATE entities SET entity_family = '{family}' WHERE id = {eid}; -- {name}"
            print(sql)

            if args.apply:
                cur.execute(
                    "UPDATE entities SET entity_family = %s WHERE id = %s",
                    (family, eid)
                )

    if unclassified:
        print(f"\n--- Unclassified ({len(unclassified)}) ---")
        for eid, name in unclassified:
            print(f"  [{eid}] {name}")

    if args.apply and updates:
        conn.commit()
        print(f"\nApplied {len(updates)} updates to database.")
    else:
        print("\n(Dry run — use --apply to commit changes)")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
