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

    def build_prompt(self, batch: list[dict], context: dict) -> str:
        lines = [
            f"  - id={r['id']} target_type=\"{r.get('target_type')}\" title=\"{r.get('title')}\""
            for r in batch
        ]
        return (
            "Generate transition lore text for these chapters/books in a dark-fantasy MMORPG.\n"
            "Return JSON array with fields: id, target_type, transition_lore_text\n\n"
            + "\n".join(lines)
        )

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
            db.execute(
                f"UPDATE {table} SET transition_lore_text = $1 WHERE id = $2",
                [record["transition_lore_text"], record["id"]],
            )


if __name__ == "__main__":
    BossLoreGenerator().run()
