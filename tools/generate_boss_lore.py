#!/usr/bin/env python3
"""
tools/generate_boss_lore.py

Generator for boss transition lore text on chapters and books.
Populates transition_lore_text for any chapter or book missing it.

Usage (from tools/ directory):
    python generate_boss_lore.py status
    python generate_boss_lore.py generate
    python generate_boss_lore.py generate --estimate
    python generate_boss_lore.py insert
    python generate_boss_lore.py validate
"""
from __future__ import annotations

import sys
from pathlib import Path

_TOOLS_DIR = Path(__file__).resolve().parent
if str(_TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(_TOOLS_DIR))

from lib.base_generator import BaseGenerator
from lib.db_client import DBClient


_CHAPTER_TEMPLATE = (
    "You have conquered the trials of {title}. "
    "The shadows that once loomed over this passage have been vanquished. "
    "Press onward, for greater challenges await."
)

_BOOK_TEMPLATE = (
    "The final guardian of {title} has fallen. "
    "You have proven yourself worthy of the trials that lie ahead. "
    "A new chapter in your journey begins."
)


class BossLoreGenerator(BaseGenerator):
    name = "generate_boss_lore"
    table = "chapters"
    default_batch_size = 20

    def get_missing_items(self, db: DBClient) -> list[dict]:
        chapters = db.query(
            """
            SELECT id, title, 'chapter' AS target_type
            FROM chapters
            WHERE transition_lore_text IS NULL
            ORDER BY id
            """
        )
        books = db.query(
            """
            SELECT id, title, 'book' AS target_type
            FROM books
            WHERE transition_lore_text IS NULL
            ORDER BY id
            """
        )
        return chapters + books

    def get_group_key(self, item: dict) -> str:
        return item.get("target_type", "chapter")

    def python_fallback(self, batch: list[dict], context: dict) -> list[dict]:
        results = []
        for item in batch:
            target_type = item.get("target_type", "chapter")
            title = item.get("title") or "this realm"
            template = _CHAPTER_TEMPLATE if target_type == "chapter" else _BOOK_TEMPLATE
            results.append({
                "id": item["id"],
                "target_type": target_type,
                "transition_lore_text": template.format(title=title),
            })
        return results

    # ------------------------------------------------------------------
    # _lookup_id helper
    # ------------------------------------------------------------------

    def _lookup_id(self, lookup: dict, name: str) -> "int | None":
        if not name or name == "null":
            return None
        if name in lookup:
            return lookup[name]
        lower = name.lower()
        for k, v in lookup.items():
            if k.lower() == lower:
                return v
        return None

    # ------------------------------------------------------------------
    # resolve_ai_record
    # ------------------------------------------------------------------

    def resolve_ai_record(self, record: dict, context: dict) -> dict:
        """Pass-through — transition_lore_text is a plain string."""
        return record

    # ------------------------------------------------------------------
    # build_prompt
    # ------------------------------------------------------------------

    def build_prompt(self, batch: list[dict], context: dict) -> str:
        chapter_items = [r for r in batch if r.get("target_type") == "chapter"]
        book_items = [r for r in batch if r.get("target_type") == "book"]

        chapter_lines = [
            f'  - id={r["id"]} title="{r.get("title")}"'
            f' chapter_number={r.get("chapter_number", "?")}'
            f' book="{r.get("book_title", "unknown")}"'
            f' atmosphere="{r.get("atmosphere_name", "unknown")}"'
            for r in chapter_items
        ]
        book_lines = [
            f'  - id={r["id"]} title="{r.get("title")}"'
            f' chapter_count={r.get("chapter_count", "?")}'
            for r in book_items
        ]

        chapters_block = "\n".join(chapter_lines) if chapter_lines else "  (none)"
        books_block = "\n".join(book_lines) if book_lines else "  (none)"

        return f"""You are the narrator of "Towers of Elysium", a dark-fantasy MMORPG. Write EPIC, UNIQUE transition lore text that appears on-screen after the player defeats a boss in a cinematic reveal.

VOICE & STYLE:
- Narrator voice: Ancient, grave, omniscient — like a chronicler who has witnessed countless heroes fall
- Register: Literary, weighty, never melodramatic — earned gravitas, not cheap dramatics
- Tone shifts: Chapter bosses = pyrrhic relief (won, but at what cost?). Book bosses = genuine triumph tempered by what awaits.
- Each piece of text must be COMPLETELY UNIQUE — reference the specific chapter/book title and theme

STRUCTURE (3-5 sentences total):
1. Opening: Name the specific trial overcome — what darkness was conquered or horror faced in THIS chapter/book
2. Middle: The cost or revelation — what truth was revealed, what changed in the world or the player
3. Transition: A hint at what waits beyond — ominous, hopeful, or simply vast

EXAMPLES OF TONE:

Chapter boss (NOT a book finale):
"The Ashwardens have fallen silent at last, their pyre-songs extinguished in the Char Barrens. What you have taken from this place is not glory — it is the weight of knowing that something worse than them built those walls. The Barrens quiet now, but the quiet is the kind that precedes a held breath. Move deeper. The dark does not mourn its servants long."

Book boss (final chapter of a full book):
"The Throne of Whispers is empty. You have done what three armies and a god's servant could not — you have made it so. The Towers do not celebrate. They do not weep. They simply note your name in the long accounting and turn a new page. The second Spire calls. It has been watching since before you drew your first blade, and it is not afraid."

Chapters needing transition lore:
{chapters_block}

Books needing transition lore:
{books_block}

For each item, return a JSON object with:
  id (integer),
  target_type ("chapter" or "book"),
  transition_lore_text (string, 3-5 sentences, UNIQUE per item — do NOT use the same opening for two items)

Return a JSON array. No explanation. No markdown.
"""

    def validate(self, record: dict, db: DBClient) -> list[str]:
        errors: list[str] = []
        if not record.get("id"):
            errors.append("id is required")
        if not record.get("transition_lore_text"):
            errors.append("transition_lore_text is required")
        if record.get("target_type") not in ("chapter", "book"):
            errors.append(f"target_type must be 'chapter' or 'book', got: {record.get('target_type')}")
        return errors

    def _insert_results(self, db: DBClient, results: list[dict]) -> None:
        for record in results:
            target_type = record.get("target_type", "chapter")
            table = "chapters" if target_type == "chapter" else "books"
            db.update(table, {"transition_lore_text": record["transition_lore_text"]}, {"id": record["id"]})


if __name__ == "__main__":
    BossLoreGenerator().run()
