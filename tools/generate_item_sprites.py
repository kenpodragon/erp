#!/usr/bin/env python3
"""
tools/generate_item_sprites.py

Generator for item sprites — creates asset_registry entries for each
armor_class × gear_slot combination that lacks one.

Usage (from tools/ directory):
    python generate_item_sprites.py status
    python generate_item_sprites.py generate
    python generate_item_sprites.py generate --ai --batch-size 10
    python generate_item_sprites.py generate --estimate
    python generate_item_sprites.py insert
    python generate_item_sprites.py validate
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
# Armor class palettes
# ---------------------------------------------------------------------------

_ARMOR_PALETTES: dict[str, str] = {
    "cloth":   "#4a3a6e",
    "leather": "#6b4423",
    "chain":   "#808080",
    "plate":   "#c0c0c0",
    "divine":  "#ffd700",
    "magic":   "#7b68ee",
    "bone":    "#d2b48c",
    "shadow":  "#2f2f4f",
}

# ---------------------------------------------------------------------------
# Gear slot template shapes
# ---------------------------------------------------------------------------

_SLOT_SHAPES: dict[str, str] = {
    "helmet":    "dome",
    "head":      "dome",
    "chest":     "rectangle",
    "body":      "rectangle",
    "legs":      "trapezoid",
    "boots":     "wedge",
    "feet":      "wedge",
    "gloves":    "mitten",
    "hands":     "mitten",
    "shoulders": "pauldron",
    "belt":      "strip",
    "waist":     "strip",
    "ring":      "circle",
    "necklace":  "oval",
    "neck":      "oval",
    "offhand":   "shield",
    "shield":    "shield",
    "mainhand":  "sword",
    "weapon":    "sword",
    "twohand":   "greatsword",
    "back":      "cape",
    "cloak":     "cape",
}

_DEFAULT_SHAPE = "rectangle"


# ---------------------------------------------------------------------------
# Generator
# ---------------------------------------------------------------------------

class ItemSpriteGenerator(BaseGenerator):
    name = "generate_item_sprites"
    table = "asset_registry"
    default_batch_size = 10

    # ------------------------------------------------------------------
    # get_missing_items
    # ------------------------------------------------------------------

    def get_missing_items(self, db: DBClient) -> list[dict]:
        """Return armor_class × gear_slot combos that lack an asset_registry entry."""
        sql = """
            SELECT DISTINCT
                ac.code AS armor_class,
                gs.name AS gear_slot
            FROM item_type_bases itb
            JOIN armor_classes ac ON ac.id = itb.armor_class_id
            JOIN gear_slots gs ON gs.id = itb.gear_slot_id
            WHERE itb.armor_class_id IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM asset_registry ar
                  WHERE ar.asset_key = 'item_' || ac.code || '_' || gs.name
                    AND ar.category = 'item_sprite'
              )
            ORDER BY ac.code, gs.name
        """
        return db.query(sql)

    # ------------------------------------------------------------------
    # get_group_key
    # ------------------------------------------------------------------

    def get_group_key(self, item: dict) -> str:
        return (item.get("armor_class") or "unknown").lower()

    # ------------------------------------------------------------------
    # python_fallback
    # ------------------------------------------------------------------

    def python_fallback(self, batch: list[dict], context: dict) -> list[dict]:
        results = []
        for item in batch:
            armor_class = (item.get("armor_class") or "cloth").lower()
            gear_slot = (item.get("gear_slot") or "body").lower()

            color = _ARMOR_PALETTES.get(armor_class, "#808080")
            shape = _SLOT_SHAPES.get(gear_slot, _DEFAULT_SHAPE)
            sprite_key = f"item_{armor_class}_{gear_slot}"

            render_def = {
                "shape": shape,
                "color": color,
                "armor_class": armor_class,
                "gear_slot": gear_slot,
            }

            record = {
                "asset_key": sprite_key,
                "category": "item_sprite",
                "display_name": f"{armor_class} {gear_slot}",
                "render_definition": json.dumps(render_def),
                "source": "generator",
            }
            results.append(record)
        return results

    # ------------------------------------------------------------------
    # build_prompt
    # ------------------------------------------------------------------

    def build_prompt(self, batch: list[dict], context: dict) -> str:
        combo_lines = [
            f'  - armor_class="{item.get("armor_class")}" gear_slot="{item.get("gear_slot")}"'
            for item in batch
        ]
        combos_block = "\n".join(combo_lines)

        armor_palettes = json.dumps(_ARMOR_PALETTES, indent=4)

        return f"""Generate item sprite configurations for a dark-fantasy MMORPG paper doll.

Combos to process:
{combos_block}

Armor class color palettes:
{armor_palettes}

For each combo return a JSON object with:
  asset_key ("item_{{armor_class}}_{{gear_slot}}"),
  category ("item_sprite"),
  render_definition (JSON string with shape, color, armor_class, gear_slot)

Return a JSON array. No explanation.
"""

    # ------------------------------------------------------------------
    # validate
    # ------------------------------------------------------------------

    def validate(self, record: dict, db: DBClient) -> list[str]:
        errors: list[str] = []
        if not record.get("asset_key"):
            errors.append("asset_key is required and must be non-empty")
        if not record.get("render_definition"):
            errors.append("render_definition is required")
        else:
            try:
                json.loads(record["render_definition"]) if isinstance(record["render_definition"], str) else record["render_definition"]
            except (ValueError, TypeError):
                errors.append("render_definition is not valid JSON")
        return errors

    # ------------------------------------------------------------------
    # _insert_results — INSERT into asset_registry
    # ------------------------------------------------------------------

    def _insert_results(self, db: DBClient, results: list[dict]) -> None:
        db.insert_batch(self.table, results)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    ItemSpriteGenerator().run()
