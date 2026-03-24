#!/usr/bin/env python3
"""
tools/generate_achievement_icons.py

Generator for achievement icon sprite keys, per category.
Updates achievements with a category-specific icon_sprite_key and
inserts a corresponding asset_registry entry.

Usage (from tools/ directory):
    python generate_achievement_icons.py status
    python generate_achievement_icons.py generate
    python generate_achievement_icons.py generate --estimate
    python generate_achievement_icons.py insert
    python generate_achievement_icons.py validate
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


_CATEGORY_SPRITE_PREFIX: dict[str, str] = {
    "combat":      "achievement_combat",
    "exploration": "achievement_explore",
    "collection":  "achievement_collect",
    "social":      "achievement_social",
    "story":       "achievement_story",
    "training":    "achievement_train",
    "crafting":    "achievement_craft",
    "economy":     "achievement_economy",
}

_DEFAULT_SPRITE_PREFIX = "achievement_general"


class AchievementIconGenerator(BaseGenerator):
    name = "generate_achievement_icons"
    table = "achievements"
    default_batch_size = 20

    def get_missing_items(self, db: DBClient) -> list[dict]:
        sql = """
            SELECT id, name, category
            FROM achievements
            WHERE icon_sprite_key = 'achievement_default'
               OR icon_sprite_key IS NULL
            ORDER BY id
        """
        return db.query(sql)

    def get_group_key(self, item: dict) -> str:
        return (item.get("category") or "general").lower()

    def python_fallback(self, batch: list[dict], context: dict) -> list[dict]:
        results = []
        for item in batch:
            achievement_id = item["id"]
            category = (item.get("category") or "general").lower()
            prefix = _CATEGORY_SPRITE_PREFIX.get(category, _DEFAULT_SPRITE_PREFIX)
            sprite_key = f"{prefix}_{achievement_id}"

            asset_config = {
                "type": "sprite",
                "category": "achievement_icon",
                "achievement_category": category,
                "size": "64x64",
                "format": "png",
            }

            results.append({
                "id": achievement_id,
                "icon_sprite_key": sprite_key,
                "asset_key": sprite_key,
                "asset_config": json.dumps(asset_config),
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
        """Normalize AI output — ensure asset_config is a JSON string."""
        ac = record.get("asset_config")
        if ac is not None and not isinstance(ac, str):
            record["asset_config"] = json.dumps(ac)
        return record

    # ------------------------------------------------------------------
    # build_prompt
    # ------------------------------------------------------------------

    def build_prompt(self, batch: list[dict], context: dict) -> str:
        lines = [
            f'  - id={r["id"]} name="{r.get("name")}" category="{r.get("category")}"'
            f' description="{r.get("description", "")}"'
            for r in batch
        ]
        achievements_block = "\n".join(lines)

        return f"""You are an icon designer for a dark-fantasy MMORPG called "Towers of Elysium". Design DISTINCTIVE 64x64 pixel-art achievement icons for each achievement below.

DESIGN PHILOSOPHY:
- Each icon must be immediately recognizable at 64x64 pixels — simple silhouette, strong contrast
- Each icon must be UNIQUE — no two achievements share the same primary symbol combination
- Dark fantasy aesthetic: grim, detailed, evocative — not cartoonish
- Use the achievement NAME and CATEGORY to derive the primary symbol

CATEGORY DESIGN LANGUAGE:

combat: Weapons, blood, skulls, broken shields, battle damage
  - Primary symbols: crossed swords, dripping blade, shattered helm, bloodied fist, bone pile
  - Colors: crimson (#cc0000), iron gray (#4a4a4a), dark gold (#8b6914)

exploration: Maps, compasses, footprints, distant horizons, opened doors
  - Primary symbols: worn map scroll, compass rose, boot print, lantern, broken key
  - Colors: aged parchment (#c8a96e), forest green (#2d5a27), midnight blue (#1a1a3e)

collection: Artifacts, scrolls, gems, curated shelves, overflowing chests
  - Primary symbols: ornate box, stacked scrolls, multi-gem cluster, magnifying lens, trophy shelf
  - Colors: deep purple (#4a1a6e), gold (#ffd700), deep teal (#006060)

social: Handshakes, guild crests, messenger seals, alliance marks
  - Primary symbols: clasped gauntlets, guild seal, banner crest, messenger crow
  - Colors: royal blue (#1a1a8e), silver (#c0c0c0), crimson ribbon (#990000)

story: Chapter marks, book glyphs, narrative runes, tower silhouettes
  - Primary symbols: opened tome, tower silhouette, runic circle, ink quill
  - Colors: black (#0d0d0d), dark ink blue (#001a3e), old gold (#8b7536)

training: Weights, sparring dummies, stat bars, skill wheels
  - Primary symbols: iron dumbbell, practice dummy with cuts, rising stat bar, skill rune
  - Colors: steel blue (#2a4a6e), muscle red (#8b1a1a), energy cyan (#00cccc)

crafting: Hammer and anvil, forge fire, blueprint scrolls, ingredient vials
  - Primary symbols: crossed hammer/tongs, forge flame, ingredient cluster, completed gear
  - Colors: forge orange (#cc5500), iron gray (#3a3a3a), blueprint blue (#002266)

economy: Gold stacks, ledger books, merchant scales, coin waterfalls
  - Primary symbols: stacked gold coins, balance scale, merchant seal, overflowing pouch
  - Colors: gold (#ffd700), dark leather (#4a2800), ink green (#003300)

Achievements to generate:
{achievements_block}

For each achievement return a JSON object with:
  id (integer),
  icon_sprite_key (string, format: "{{category_prefix}}_{{id}}"),
  asset_key (same as icon_sprite_key),
  asset_config (a JSON STRING containing:
    primary_symbol (the main iconic element),
    secondary_symbol (optional accent, or null),
    primary_color (hex #RRGGBB),
    secondary_color (hex #RRGGBB),
    accent_color (hex #RRGGBB or null),
    glow_effect (hex color if the icon glows, or null — use sparingly for legendary achievements),
    pixel_art_description (1-2 sentences describing what a pixel artist would draw for this specific achievement),
    style_notes (specific detail like "jagged cracks in the shield", "three drops of blood on the blade tip")
  )

Return a JSON array. No explanation. No markdown.
"""

    def validate(self, record: dict, db: DBClient) -> list[str]:
        errors: list[str] = []
        if not record.get("id"):
            errors.append("id is required")
        if not record.get("icon_sprite_key"):
            errors.append("icon_sprite_key is required")
        return errors

    def _insert_results(self, db: DBClient, results: list[dict]) -> None:
        for record in results:
            achievement_id = record["id"]
            sprite_key = record["icon_sprite_key"]
            asset_config = record.get("asset_config", "{}")

            # Update achievement
            db.update("achievements", {"icon_sprite_key": sprite_key}, {"id": achievement_id})

            # Insert or skip asset_registry entry
            existing = db.query(
                "SELECT id FROM asset_registry WHERE asset_key = %s LIMIT 1",
                [sprite_key],
            )
            if not existing:
                db.insert_batch("asset_registry", [{
                    "asset_key": sprite_key,
                    "category": "achievement_icon",
                    "render_definition": asset_config,
                    "source": "generator",
                }])


if __name__ == "__main__":
    AchievementIconGenerator().run()
