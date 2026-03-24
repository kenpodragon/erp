#!/usr/bin/env python3
"""
tools/generate_backgrounds.py

Generator for background parallax layers — creates backgrounds rows for
chapters whose scenes lack a background_id assignment.

Usage (from tools/ directory):
    python generate_backgrounds.py status
    python generate_backgrounds.py generate
    python generate_backgrounds.py generate --ai --batch-size 10
    python generate_backgrounds.py generate --estimate
    python generate_backgrounds.py insert
    python generate_backgrounds.py validate
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

_TOOLS_DIR = Path(__file__).resolve().parent
if str(_TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(_TOOLS_DIR))

from lib.base_generator import BaseGenerator
from lib.db_client import DBClient

# ---------------------------------------------------------------------------
# Book-based colour palettes (3 layers per background)
# ---------------------------------------------------------------------------

_BOOK_PALETTES: dict[int, dict] = {
    1: {
        "far":  {"sky_top": "#1a1a2e", "sky_bottom": "#16213e"},
        "mid":  {"silhouette": "#0f3460", "highlight": "#16213e"},
        "near": {"ground": "#1a1a2e",  "texture": "#0f3460"},
    },
    2: {
        "far":  {"sky_top": "#0d0d0d", "sky_bottom": "#3d0000"},
        "mid":  {"silhouette": "#5c1a00", "highlight": "#3d0000"},
        "near": {"ground": "#0d0d0d",  "texture": "#3d0000"},
    },
    3: {
        "far":  {"sky_top": "#e0e0e0", "sky_bottom": "#004040"},
        "mid":  {"silhouette": "#2d2600", "highlight": "#004040"},
        "near": {"ground": "#2d2600",  "texture": "#e0e0e0"},
    },
}

_DEFAULT_PALETTE = {
    "far":  {"sky_top": "#1a1a2e", "sky_bottom": "#16213e"},
    "mid":  {"silhouette": "#0f3460", "highlight": "#16213e"},
    "near": {"ground": "#1a1a2e",  "texture": "#0f3460"},
}


# ---------------------------------------------------------------------------
# Generator
# ---------------------------------------------------------------------------

class BackgroundGenerator(BaseGenerator):
    name = "generate_backgrounds"
    table = "backgrounds"
    default_batch_size = 10

    # ------------------------------------------------------------------
    # get_missing_items
    # ------------------------------------------------------------------

    def get_missing_items(self, db: DBClient) -> list[dict]:
        """Return chapters whose scenes all lack background_id assignment."""
        sql = """
            SELECT
                c.id            AS chapter_id,
                c.title         AS chapter_title,
                c.chapter_number,
                b.id            AS book_id,
                b.title         AS book_title
            FROM chapters c
            JOIN books b
                ON b.id = c.book_id
            WHERE EXISTS (
                SELECT 1 FROM scenes s WHERE s.chapter_id = c.id
            )
              AND NOT EXISTS (
                SELECT 1 FROM backgrounds bg
                WHERE bg.background_key = 'bg_chapter_' || c.id
            )
            ORDER BY b.id, c.chapter_number
        """
        return db.query(sql)

    # ------------------------------------------------------------------
    # get_group_key
    # ------------------------------------------------------------------

    def get_group_key(self, item: dict) -> str:
        book_id = item.get("book_id")
        return f"book_{book_id}" if book_id else "book_unknown"

    # ------------------------------------------------------------------
    # python_fallback
    # ------------------------------------------------------------------

    def python_fallback(self, batch: list[dict], context: dict) -> list[dict]:
        results = []
        for item in batch:
            chapter_id = item["chapter_id"]
            chapter_title = item.get("chapter_title") or f"Chapter {chapter_id}"
            book_id = item.get("book_id") or 1

            palette = _BOOK_PALETTES.get(book_id, _DEFAULT_PALETTE)

            parallax_layers = {
                "far": {
                    "type": "gradient",
                    "colors": [palette["far"]["sky_top"], palette["far"]["sky_bottom"]],
                    "scroll_speed": 0.1,
                },
                "mid": {
                    "type": "silhouette",
                    "colors": [palette["mid"]["silhouette"], palette["mid"]["highlight"]],
                    "scroll_speed": 0.4,
                },
                "near": {
                    "type": "ground",
                    "colors": [palette["near"]["ground"], palette["near"]["texture"]],
                    "scroll_speed": 1.0,
                },
            }

            color_palette = {
                "primary": palette["far"]["sky_top"],
                "secondary": palette["mid"]["silhouette"],
                "accent": palette["near"]["ground"],
            }

            # Derive a mood from the palette
            mood_map = {1: "dark", 2: "ominous", 3: "ethereal"}
            mood = mood_map.get(book_id, "dark")

            record = {
                "chapter_id": chapter_id,
                "name": f"bg_chapter_{chapter_id}",
                "background_key": f"bg_chapter_{chapter_id}",
                "description": f"Background for {chapter_title}",
                "parallax_config": json.dumps(parallax_layers),
                "mood": mood,
                "color_palette": json.dumps(color_palette),
            }
            results.append(record)
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
        """Normalize AI output — ensure parallax_config and color_palette are JSON strings."""
        for field in ("parallax_config", "color_palette"):
            val = record.get(field)
            if val is not None and not isinstance(val, str):
                record[field] = json.dumps(val)
        return record

    # ------------------------------------------------------------------
    # build_prompt
    # ------------------------------------------------------------------

    def build_prompt(self, batch: list[dict], context: dict) -> str:
        chapter_lines = [
            f'  - chapter_id={item["chapter_id"]} title="{item.get("chapter_title")}"'
            f' chapter_number={item.get("chapter_number", "?")}'
            f' book_id={item.get("book_id")} book="{item.get("book_title")}"'
            f' atmosphere="{item.get("atmosphere_name", "unknown")}"'
            f' atmosphere_desc="{item.get("atmosphere_description", "")}"'
            for item in batch
        ]
        chapters_block = "\n".join(chapter_lines)

        palettes_block = json.dumps(_BOOK_PALETTES, indent=4)

        return f"""You are an environmental artist for a dark-fantasy MMORPG called "Towers of Elysium". Generate UNIQUE 3-layer parallax background configs for each chapter below.

CRITICAL: Each chapter MUST have DIFFERENT colors and descriptions — even within the same book. The chapter title, number, and atmosphere should drive the visual identity. Chapter 1 might be desolate ruins; Chapter 3 might be a cursed swamp; Chapter 7 might be an obsidian fortress.

LAYER STRUCTURE:
- far (sky/atmosphere layer, scroll_speed=0.1): gradient sky colors — what fills the distant horizon
- mid (landscape silhouette layer, scroll_speed=0.4): distinct landforms silhouetted against the sky — describe SPECIFIC shapes
- near (ground texture layer, scroll_speed=1.0): immediate terrain texture underfoot

MID-LAYER SILHOUETTE SHAPE EXAMPLES (use these as inspiration, invent your own per chapter):
- Twisted dead trees with reaching branches
- Crumbling stone towers and collapsed arches
- Jagged mountain peaks with cascading rock slides
- Floating obsidian shards suspended in void
- Giant petrified bone structures like ribs of a buried titan
- Ruined temple columns half-submerged in fog
- Fungal spires glowing faintly with bioluminescence
- Ice formations like shattered mirror shards
- Molten fissures with rising heat columns

MOOD COLOR GUIDE:
- dark: Deep navy/black palettes (#0d0d1a, #1a0a2e)
- ominous: Blood-red shadows (#3d0000, #1a0000, #5c1a00)
- ethereal: Pale ghost-white and teal (#e8e8f0, #2d8080, #004455)
- mysterious: Twilight purple and amber (#2d1b4e, #4a2800, #7b3f00)
- serene: Cold silver and ice-blue (#d0d8e8, #004070, #001830)

Base book palettes (use as tonal guide but VARY per chapter):
{palettes_block}

Chapters to generate:
{chapters_block}

For each chapter return a JSON object with:
  chapter_id (integer),
  name ("bg_chapter_{{chapter_id}}"),
  background_key ("bg_chapter_{{chapter_id}}"),
  description (1 sentence describing THIS chapter's specific visual environment),
  parallax_config (a JSON STRING with keys "far", "mid", "near" — each containing: type, colors (array of 2 hex strings), scroll_speed, and "description" (what the layer looks like)),
  mood (one of: dark, ominous, ethereal, mysterious, serene),
  color_palette (a JSON STRING with "primary", "secondary", "accent" hex strings unique to this chapter)

Return a JSON array. No explanation. No markdown.
"""

    # ------------------------------------------------------------------
    # validate
    # ------------------------------------------------------------------

    def validate(self, record: dict, db: DBClient) -> list[str]:
        errors: list[str] = []
        if not record.get("name"):
            errors.append("name is required and must be non-empty")
        if not record.get("background_key"):
            errors.append("background_key is required and must be non-empty")

        parallax_raw = record.get("parallax_config")
        if not parallax_raw:
            errors.append("parallax_config is required")
        else:
            try:
                parallax = json.loads(parallax_raw) if isinstance(parallax_raw, str) else parallax_raw
                if "far" not in parallax:
                    errors.append("parallax_config must contain 'far' key")
                if "mid" not in parallax:
                    errors.append("parallax_config must contain 'mid' key")
            except (ValueError, TypeError):
                errors.append("parallax_config is not valid JSON")

        return errors

    # ------------------------------------------------------------------
    # _insert_results — INSERT into backgrounds
    # ------------------------------------------------------------------

    def _insert_results(self, db: DBClient, results: list[dict]) -> None:
        # Strip chapter_id (not a column on backgrounds) before inserting
        rows = []
        for record in results:
            row = {k: v for k, v in record.items() if k != "chapter_id"}
            rows.append(row)
        db.insert_batch(self.table, rows)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    BackgroundGenerator().run()
