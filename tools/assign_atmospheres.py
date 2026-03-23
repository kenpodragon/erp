"""
tools/assign_atmospheres.py

Assigns atmosphere_ids to chapters, books, and locations.

Must run BEFORE other generators since they depend on atmosphere assignments.

Usage:
  python tools/assign_atmospheres.py [--ai] [--dry-run]

Modes:
  default   Python round-robin by book + chapter position (no AI required)
  --ai      Use AI to pick best-matching atmosphere per entity
  --dry-run Print proposed assignments without modifying the database
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
import os
from collections import Counter

# ---------------------------------------------------------------------------
# Atmosphere archetype groupings for Python fallback mode
# ---------------------------------------------------------------------------

# Non-boss, non-training archetypes only (13 total)
BOOK_ATMOSPHERE_POOLS = {
    1: [
        "mundane_dread",
        "occult_sanctum",
        "liminal_purgatory",
        "body_horror_theatre",
        "domestic_trauma",
        "conspiracy_bunker",
        "glitch_reality",
    ],
    2: [
        "void_abyss",
        "glitch_reality",
        "conspiracy_bunker",
        "body_horror_theatre",
        "liminal_purgatory",
        "ancient_sanctuary",
        "cosmic_archive",
    ],
    3: [
        "tech_utopia",
        "alien_frontier",
        "cosmic_archive",
        "ancient_sanctuary",
        "void_abyss",
        "tech_utopia",
        "alien_frontier",
    ],
}

# Excluded archetypes (boss/training — never assigned via script)
EXCLUDED_ARCHETYPES = {"boss_battle", "training_grounds", "idle_training"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_atm_index(atmospheres: list[dict]) -> dict[str, int]:
    """Return {archetype: id} for non-excluded atmospheres."""
    return {
        a["archetype"]: a["id"]
        for a in atmospheres
        if a["archetype"] not in EXCLUDED_ARCHETYPES
    }


def _assign_chapters_python(
    chapters: list[dict],
    atm_index: dict[str, int],
) -> list[dict]:
    """Round-robin assignment within each book using the book's atmosphere pool."""
    # Group chapters by book_id, sorted by id (proxy for chapter order)
    by_book: dict[int, list[dict]] = {}
    for ch in chapters:
        by_book.setdefault(ch["book_id"], []).append(ch)
    for book_id in by_book:
        by_book[book_id].sort(key=lambda c: c["id"])

    assignments: list[dict] = []
    for book_id, book_chapters in by_book.items():
        pool = BOOK_ATMOSPHERE_POOLS.get(book_id, list(atm_index.keys()))
        # Filter pool to only archetypes actually present in the DB
        valid_pool = [a for a in pool if a in atm_index]
        if not valid_pool:
            valid_pool = [a for a in atm_index if a not in EXCLUDED_ARCHETYPES]

        for i, ch in enumerate(book_chapters):
            archetype = valid_pool[i % len(valid_pool)]
            assignments.append({
                "chapter_id": ch["id"],
                "atmosphere_id": atm_index[archetype],
                "archetype": archetype,
                "title": ch.get("title", f"Chapter {ch['id']}"),
            })
    return assignments


def _assign_books_python(
    books: list[dict],
    chapter_assignments: list[dict],
) -> list[dict]:
    """Pick the most common atmosphere among each book's assigned chapters."""
    # Build {book_id -> [atmosphere_id, ...]}
    ch_atm_by_book: dict[int, list[int]] = {}
    for ca in chapter_assignments:
        # chapter_assignments come from the current run — need book_id lookup
        # We'll cross-reference using chapter_id → book_id from caller context
        pass  # filled in main()

    return []  # placeholder; main() handles this with full context


def _assign_locations_python(
    locations: list[dict],
    chapter_atm_map: dict[int, int],
    atm_index: dict[str, int],
) -> list[dict]:
    """Assign the atmosphere of the location's first-appearance chapter."""
    assignments: list[dict] = []
    fallback_archetype = next(iter(atm_index))
    fallback_id = atm_index[fallback_archetype]

    for loc in locations:
        chapter_id = loc.get("chapter_id")
        atm_id = chapter_atm_map.get(chapter_id) or fallback_id
        assignments.append({
            "location_id": loc["id"],
            "atmosphere_id": atm_id,
            "name": loc.get("name", f"Location {loc['id']}"),
        })
    return assignments


# ---------------------------------------------------------------------------
# AI mode helpers
# ---------------------------------------------------------------------------

def _build_chapter_prompt(atmospheres: list[dict], chapters: list[dict]) -> str:
    atm_list = "\n".join(
        f"  id={a['id']} archetype={a['archetype']!r} name={a['name']!r}: {a.get('description','')}"
        for a in atmospheres
    )
    ch_list = "\n".join(
        f"  id={c['id']} book_id={c['book_id']} title={c.get('title','?')!r}"
        for c in chapters
    )
    return (
        f"You are assigning atmosphere moods to chapters of a dark fantasy MMORPG.\n\n"
        f"Available atmospheres (non-boss, non-training only):\n{atm_list}\n\n"
        f"Chapters needing assignment:\n{ch_list}\n\n"
        f"Return ONLY a JSON array like:\n"
        f'[{{"chapter_id": 1, "atmosphere_id": 3}}, ...]\n'
        f"Match mood, setting, and narrative tone. One entry per chapter."
    )


def _build_book_prompt(atmospheres: list[dict], books: list[dict]) -> str:
    atm_list = "\n".join(
        f"  id={a['id']} archetype={a['archetype']!r} name={a['name']!r}: {a.get('description','')}"
        for a in atmospheres
    )
    bk_list = "\n".join(
        f"  id={b['id']} title={b.get('title','?')!r}"
        for b in books
    )
    return (
        f"You are assigning atmosphere moods to books of a dark fantasy MMORPG.\n\n"
        f"Available atmospheres:\n{atm_list}\n\n"
        f"Books needing assignment:\n{bk_list}\n\n"
        f"Return ONLY a JSON array like:\n"
        f'[{{"book_id": 1, "atmosphere_id": 3}}, ...]\n'
        f"Consider the overall arc and tone of each book."
    )


def _build_location_prompt(atmospheres: list[dict], locations: list[dict]) -> str:
    atm_list = "\n".join(
        f"  id={a['id']} archetype={a['archetype']!r} name={a['name']!r}: {a.get('description','')}"
        for a in atmospheres
    )
    loc_list = "\n".join(
        f"  id={l['id']} name={l.get('name','?')!r}"
        for l in locations
    )
    return (
        f"You are assigning atmosphere moods to locations of a dark fantasy MMORPG.\n\n"
        f"Available atmospheres:\n{atm_list}\n\n"
        f"Locations needing assignment:\n{loc_list}\n\n"
        f"Return ONLY a JSON array like:\n"
        f'[{{"location_id": 1, "atmosphere_id": 3}}, ...]\n'
        f"Match the location name and implied setting to the best atmosphere."
    )


def _parse_ai_json(raw) -> list[dict]:
    """Extract JSON list from AI response (handles string or already-parsed)."""
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        # Claude CLI wraps output in {"result": "..."} or similar
        for key in ("result", "content", "output", "text"):
            if key in raw:
                val = raw[key]
                if isinstance(val, list):
                    return val
                if isinstance(val, str):
                    return json.loads(val)
    if isinstance(raw, str):
        return json.loads(raw)
    raise ValueError(f"Cannot parse AI response: {type(raw)}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Assign atmosphere_ids to chapters, books, and locations."
    )
    parser.add_argument(
        "--ai",
        action="store_true",
        help="Use AI (claude/gemini) to pick atmospheres (default: Python round-robin)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print proposed assignments without writing to the database",
    )
    args = parser.parse_args()

    # ------------------------------------------------------------------
    # DB connection
    # ------------------------------------------------------------------
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from lib.db_client import DBClient
    except ImportError as exc:
        print(f"ERROR: Could not import DBClient: {exc}", file=sys.stderr)
        sys.exit(1)

    try:
        db = DBClient(env_file="backend/.env")
    except Exception as exc:
        print(f"ERROR: DB connection failed: {exc}", file=sys.stderr)
        sys.exit(1)

    # ------------------------------------------------------------------
    # Load data
    # ------------------------------------------------------------------
    atmospheres = db.query(
        "SELECT id, name, archetype, description FROM atmospheres ORDER BY id"
    )
    if not atmospheres:
        print("ERROR: No atmospheres found in DB. Run migrations first.")
        db.close()
        sys.exit(1)

    # Filter to non-excluded atmospheres for assignment
    eligible_atm = [a for a in atmospheres if a["archetype"] not in EXCLUDED_ARCHETYPES]
    atm_index = _build_atm_index(atmospheres)

    chapters_null = db.query(
        "SELECT id, book_id, title FROM chapters WHERE atmosphere_id IS NULL ORDER BY book_id, id"
    )
    books_null = db.query(
        "SELECT id, title FROM books WHERE atmosphere_id IS NULL ORDER BY id"
    )
    # Locations: join to scenes to find chapter_id via first_appearance_scene_id
    locations_null = db.query(
        """
        SELECT l.id, l.name, s.chapter_id
        FROM locations l
        LEFT JOIN scenes s ON s.id = l.first_appearance_scene_id
        WHERE l.archetype_id IS NULL
        ORDER BY l.id
        """
    )

    total_work = len(chapters_null) + len(books_null) + len(locations_null)
    if total_work == 0:
        print("Nothing to do — all atmospheres already assigned.")
        db.close()
        return

    print(f"Found: {len(chapters_null)} chapters, {len(books_null)} books, "
          f"{len(locations_null)} locations needing atmosphere assignment.")
    if args.dry_run:
        print("[DRY RUN] No changes will be written to the database.\n")

    # ------------------------------------------------------------------
    # Build assignments
    # ------------------------------------------------------------------

    ch_assignments: list[dict] = []
    bk_assignments: list[dict] = []
    loc_assignments: list[dict] = []

    if args.ai:
        # ---- AI mode ----
        try:
            from lib.ai_provider import AIProvider
        except ImportError as exc:
            print(f"ERROR: Could not import AIProvider: {exc}", file=sys.stderr)
            db.close()
            sys.exit(1)

        ai = AIProvider()

        async def run_ai():
            nonlocal ch_assignments, bk_assignments, loc_assignments

            if chapters_null:
                print(f"Asking AI to assign {len(chapters_null)} chapters...")
                # Batch in groups of 50 to stay within prompt limits
                for batch_start in range(0, len(chapters_null), 50):
                    batch = chapters_null[batch_start:batch_start + 50]
                    prompt = _build_chapter_prompt(eligible_atm, batch)
                    raw = await ai.generate(prompt, schema={})
                    parsed = _parse_ai_json(raw)
                    # Build title lookup for display
                    ch_title_map = {c["id"]: c.get("title", f"Chapter {c['id']}") for c in batch}
                    atm_name_map = {a["id"]: a["archetype"] for a in atmospheres}
                    for entry in parsed:
                        ch_assignments.append({
                            "chapter_id": entry["chapter_id"],
                            "atmosphere_id": entry["atmosphere_id"],
                            "archetype": atm_name_map.get(entry["atmosphere_id"], "?"),
                            "title": ch_title_map.get(entry["chapter_id"], "?"),
                        })

            if books_null:
                print(f"Asking AI to assign {len(books_null)} books...")
                prompt = _build_book_prompt(eligible_atm, books_null)
                raw = await ai.generate(prompt, schema={})
                parsed = _parse_ai_json(raw)
                bk_title_map = {b["id"]: b.get("title", f"Book {b['id']}") for b in books_null}
                atm_name_map = {a["id"]: a["archetype"] for a in atmospheres}
                for entry in parsed:
                    bk_assignments.append({
                        "book_id": entry["book_id"],
                        "atmosphere_id": entry["atmosphere_id"],
                        "archetype": atm_name_map.get(entry["atmosphere_id"], "?"),
                        "title": bk_title_map.get(entry["book_id"], "?"),
                    })

            if locations_null:
                print(f"Asking AI to assign {len(locations_null)} locations...")
                for batch_start in range(0, len(locations_null), 50):
                    batch = locations_null[batch_start:batch_start + 50]
                    prompt = _build_location_prompt(eligible_atm, batch)
                    raw = await ai.generate(prompt, schema={})
                    parsed = _parse_ai_json(raw)
                    loc_name_map = {l["id"]: l.get("name", f"Location {l['id']}") for l in batch}
                    atm_name_map = {a["id"]: a["archetype"] for a in atmospheres}
                    for entry in parsed:
                        loc_assignments.append({
                            "location_id": entry["location_id"],
                            "atmosphere_id": entry["atmosphere_id"],
                            "archetype": atm_name_map.get(entry["atmosphere_id"], "?"),
                            "name": loc_name_map.get(entry["location_id"], "?"),
                        })

        asyncio.run(run_ai())

    else:
        # ---- Python fallback mode ----

        # Chapters: round-robin per book
        ch_assignments = _assign_chapters_python(chapters_null, atm_index)

        # Books: most common atmosphere among their chapters
        # Build full chapter→atmosphere map (existing + newly assigned)
        existing_ch_atm = db.query(
            "SELECT id, atmosphere_id FROM chapters WHERE atmosphere_id IS NOT NULL"
        )
        ch_atm_map: dict[int, int] = {r["id"]: r["atmosphere_id"] for r in existing_ch_atm}
        for ca in ch_assignments:
            ch_atm_map[ca["chapter_id"]] = ca["atmosphere_id"]

        # Need book_id for each chapter to group them
        all_chapters = db.query("SELECT id, book_id FROM chapters")
        ch_book_map: dict[int, int] = {c["id"]: c["book_id"] for c in all_chapters}

        # Group chapter atmospheres by book
        book_atm_counts: dict[int, Counter] = {}
        for ch_id, atm_id in ch_atm_map.items():
            book_id = ch_book_map.get(ch_id)
            if book_id is None:
                continue
            book_atm_counts.setdefault(book_id, Counter())[atm_id] += 1

        atm_name_map = {a["id"]: a["archetype"] for a in atmospheres}
        for bk in books_null:
            counter = book_atm_counts.get(bk["id"])
            if counter:
                best_atm_id = counter.most_common(1)[0][0]
            else:
                # Fallback: first archetype for this book's pool
                pool = BOOK_ATMOSPHERE_POOLS.get(bk["id"], list(atm_index.keys()))
                valid = [a for a in pool if a in atm_index]
                best_atm_id = atm_index[valid[0]] if valid else next(iter(atm_index.values()))
            bk_assignments.append({
                "book_id": bk["id"],
                "atmosphere_id": best_atm_id,
                "archetype": atm_name_map.get(best_atm_id, "?"),
                "title": bk.get("title", f"Book {bk['id']}"),
            })

        # Locations: chapter's atmosphere via first_appearance_scene_id → chapter_id
        loc_assignments = _assign_locations_python(locations_null, ch_atm_map, atm_index)
        # Add archetype name for display
        for la in loc_assignments:
            la["archetype"] = atm_name_map.get(la["atmosphere_id"], "?")

    # ------------------------------------------------------------------
    # Print summary
    # ------------------------------------------------------------------

    if ch_assignments:
        print(f"\nChapter assignments ({len(ch_assignments)}):")
        for ca in ch_assignments:
            print(f"  Chapter #{ca['chapter_id']} {ca['title']!r} -> {ca['archetype']}")

    if bk_assignments:
        print(f"\nBook assignments ({len(bk_assignments)}):")
        for ba in bk_assignments:
            print(f"  Book #{ba['book_id']} {ba['title']!r} -> {ba['archetype']}")

    if loc_assignments:
        print(f"\nLocation assignments ({len(loc_assignments)}):")
        # Show first 20 to keep output manageable
        for la in loc_assignments[:20]:
            print(f"  Location #{la['location_id']} {la['name']!r} -> {la['archetype']}")
        if len(loc_assignments) > 20:
            print(f"  ... and {len(loc_assignments) - 20} more")

    # ------------------------------------------------------------------
    # Apply to DB
    # ------------------------------------------------------------------

    if args.dry_run:
        print(f"\n[DRY RUN] Would update: {len(ch_assignments)} chapters, "
              f"{len(bk_assignments)} books, {len(loc_assignments)} locations.")
        db.close()
        return

    ch_updated = bk_updated = loc_updated = 0

    for ca in ch_assignments:
        n = db.update(
            "chapters",
            {"atmosphere_id": ca["atmosphere_id"]},
            {"id": ca["chapter_id"]},
        )
        ch_updated += n

    for ba in bk_assignments:
        n = db.update(
            "books",
            {"atmosphere_id": ba["atmosphere_id"]},
            {"id": ba["book_id"]},
        )
        bk_updated += n

    for la in loc_assignments:
        n = db.update(
            "locations",
            {"archetype_id": la["atmosphere_id"]},
            {"id": la["location_id"]},
        )
        loc_updated += n

    db.close()

    print(f"\nDone. Updated: {ch_updated} chapters, {bk_updated} books, {loc_updated} locations.")


if __name__ == "__main__":
    main()
