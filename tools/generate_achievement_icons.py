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

    def build_prompt(self, batch: list[dict], context: dict) -> str:
        lines = [
            f"  - id={r['id']} name=\"{r.get('name')}\" category=\"{r.get('category')}\""
            for r in batch
        ]
        return (
            "Generate icon sprite keys for these achievements.\n"
            "Return JSON array with fields: id, icon_sprite_key\n\n"
            + "\n".join(lines)
        )

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
