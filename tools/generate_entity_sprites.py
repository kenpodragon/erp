#!/usr/bin/env python3
"""
tools/generate_entity_sprites.py

Generator for entity sprite keys — assigns a sprite_key to each entity_gameplay_data row.

Usage (from tools/ directory):
    python generate_entity_sprites.py status
    python generate_entity_sprites.py generate
    python generate_entity_sprites.py generate --ai --batch-size 20
    python generate_entity_sprites.py generate --estimate
    python generate_entity_sprites.py insert
    python generate_entity_sprites.py validate
"""
from __future__ import annotations

import sys
from pathlib import Path

_TOOLS_DIR = Path(__file__).resolve().parent
if str(_TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(_TOOLS_DIR))

from lib.base_generator import BaseGenerator
from lib.db_client import DBClient

# ---------------------------------------------------------------------------
# SVG silhouette template paths (one per silhouette_type)
# ---------------------------------------------------------------------------

_SILHOUETTE_PATHS: dict[str, str] = {
    "blob":      "M 0,-20 C 15,-25 25,-10 20,5 C 15,20 -15,20 -20,5 C -25,-10 -15,-25 0,-20 Z",
    "quadruped": "M -15,-10 L -10,-20 L 0,-15 L 10,-20 L 15,-10 L 20,0 L 15,10 L -15,10 L -20,0 Z",
    "biped":     "M 0,-25 L 8,-15 L 12,0 L 8,5 L 12,20 L 5,25 L 0,10 L -5,25 L -12,20 L -8,5 L -12,0 L -8,-15 Z",
    "orb":       "M 0,-15 C 15,-15 15,15 0,15 C -15,15 -15,-15 0,-15 Z",
    "winged":    "M 0,-20 L 25,-10 L 15,0 L 20,15 L 0,10 L -20,15 L -15,0 L -25,-10 Z",
    "cluster":   "M -10,-15 C -5,-20 5,-20 10,-15 M -15,-5 C -10,-10 -5,-8 0,-5 M 5,-5 C 10,-8 15,-5 12,0 M -8,5 C -3,0 3,0 8,5 M -5,10 C 0,8 5,10 3,15",
}

_SIZE_SCALE: dict[str, float] = {
    "tiny":   0.4,
    "small":  0.7,
    "medium": 1.0,
    "large":  1.5,
    "huge":   2.0,
}

_DEFAULT_SILHOUETTE = "biped"
_DEFAULT_SIZE_SCALE = 1.0


# ---------------------------------------------------------------------------
# Generator
# ---------------------------------------------------------------------------

class EntitySpriteGenerator(BaseGenerator):
    name = "generate_entity_sprites"
    table = "entity_gameplay_data"
    default_batch_size = 20

    # ------------------------------------------------------------------
    # get_missing_items
    # ------------------------------------------------------------------

    def get_missing_items(self, db: DBClient) -> list[dict]:
        sql = """
            SELECT
                eg.id                               AS egdata_id,
                e.id                                AS entity_id,
                e.canonical_name                    AS entity_name,
                e.base_description,
                st.name                             AS silhouette_type_name,
                sc.name                             AS size_class_name,
                eg.color_primary,
                eg.color_secondary
            FROM entity_gameplay_data eg
            JOIN entities e
                ON e.id = eg.entity_id
            LEFT JOIN silhouette_types st
                ON st.id = eg.silhouette_type_id
            LEFT JOIN size_classes sc
                ON sc.id = eg.size_class_id
            WHERE eg.sprite_key IS NULL
            ORDER BY eg.id
        """
        return db.query(sql)

    # ------------------------------------------------------------------
    # get_context
    # ------------------------------------------------------------------

    def get_context(self, db: DBClient) -> dict:
        silhouette_types = db.get_lookup("silhouette_types")
        size_classes = db.get_lookup("size_classes")
        animation_styles = db.get_lookup("animation_styles")
        return {
            "silhouette_types": silhouette_types,
            "size_classes": size_classes,
            "animation_styles": animation_styles,
        }

    # ------------------------------------------------------------------
    # get_group_key
    # ------------------------------------------------------------------

    def get_group_key(self, item: dict) -> str:
        return (item.get("silhouette_type_name") or "unknown").lower()

    # ------------------------------------------------------------------
    # python_fallback
    # ------------------------------------------------------------------

    def python_fallback(self, batch: list[dict], context: dict) -> list[dict]:
        results = []
        for item in batch:
            egdata_id = item["egdata_id"]
            entity_id = item["entity_id"]
            silhouette = (item.get("silhouette_type_name") or _DEFAULT_SILHOUETTE).lower()
            size_name = (item.get("size_class_name") or "medium").lower()

            svg_path = _SILHOUETTE_PATHS.get(silhouette, _SILHOUETTE_PATHS[_DEFAULT_SILHOUETTE])
            scale = _SIZE_SCALE.get(size_name, _DEFAULT_SIZE_SCALE)
            color_primary = item.get("color_primary") or "#8B0000"
            color_secondary = item.get("color_secondary") or "#1A1A2E"

            sprite_key = f"entity_sprite_{entity_id}"

            record = {
                "id": egdata_id,
                "sprite_key": sprite_key,
                # Rendering config fields for reference (not stored in DB separately)
                "_svg_path": svg_path,
                "_scale": scale,
                "_color_primary": color_primary,
                "_color_secondary": color_secondary,
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
        """Map any name-based fields returned by the AI to FK IDs."""
        silhouette_types = context.get("silhouette_types", {})
        size_classes = context.get("size_classes", {})
        animation_styles = context.get("animation_styles", {})

        if "silhouette_type_name" in record:
            resolved = self._lookup_id(silhouette_types, record.pop("silhouette_type_name"))
            if resolved is not None:
                record["silhouette_type_id"] = resolved

        if "size_class_name" in record:
            resolved = self._lookup_id(size_classes, record.pop("size_class_name"))
            if resolved is not None:
                record["size_class_id"] = resolved

        if "animation_style_name" in record:
            resolved = self._lookup_id(animation_styles, record.pop("animation_style_name"))
            if resolved is not None:
                record["animation_style_id"] = resolved

        return record

    # ------------------------------------------------------------------
    # build_prompt
    # ------------------------------------------------------------------

    def build_prompt(self, batch: list[dict], context: dict) -> str:
        silhouette_names = list(context["silhouette_types"].keys())
        size_names = list(context["size_classes"].keys())
        animation_names = list(context.get("animation_styles", {}).keys())

        entity_lines = []
        for item in batch:
            desc = (item.get("base_description") or "").strip()[:200]
            entity_lines.append(
                f'  - egdata_id={item["egdata_id"]} entity_id={item["entity_id"]}'
                f' name="{item.get("entity_name")}"'
                f' family="{item.get("entity_family_name", "unknown")}"'
                f' silhouette="{item.get("silhouette_type_name")}"'
                f' size="{item.get("size_class_name")}"'
                f' animation="{item.get("animation_style_name")}"'
                f' color_primary="{item.get("color_primary", "#8B0000")}"'
                f' color_secondary="{item.get("color_secondary", "#1A1A2E")}"'
                f' desc="{desc}"'
            )
        entities_block = "\n".join(entity_lines)

        return f"""You are a visual artist for a dark-fantasy MMORPG called "Towers of Elysium". Generate UNIQUE, DETAILED SVG silhouette path data for each entity below.

CRITICAL RULES:
- Every entity MUST have a completely unique SVG path — no two entities share the same shape
- Use the entity's name, description, family, and size to inspire the shape
- Use curves (C, Q bezier commands), arcs (A), and organic shapes — NOT just straight lines (L)
- ViewBox is centered on 0,0; all shapes must fit within the -30 to 30 range
- Scale shapes to match the size class: tiny (-8 to 8), small (-15 to 15), medium (-22 to 22), large (-27 to 27), huge (-30 to 30)

SHAPE INSPIRATION EXAMPLES:
- "Sludge Stalker" → amorphous blob with dripping tendrils at bottom, irregular bumps on top
- "Rust Guardian" → angular mechanical torso with gear-like protrusions, rigid limbs
- "Void Wraith" → wispy ethereal tendrils radiating outward, hollow center, frayed edges
- "Shadow Bat" → wide wingspan silhouette, small body, pointed ears
- "Bone Colossus" → skeletal ribcage visible, jagged spine protrusions, hollow sockets
- "Crystal Elemental" → geometric faceted polygon with sharp crystalline spikes
- "Swamp Lurker" → wide low crouching quadruped shape with tail
- "Plague Specter" → hooded humanoid with tattered cloak edges trailing

Entities to generate:
{entities_block}

Valid silhouette_type_name values: {silhouette_names}
Valid size_class_name values: {size_names}
Valid animation_style_name values: {animation_names}

For each entity, return a JSON object with:
  id (egdata_id as integer),
  sprite_key ("entity_sprite_{{entity_id}}"),
  svg_path (the unique SVG "d" attribute string — MUST use C/Q/A curves, not just M/L/Z)

Return a JSON array, one object per entity. No explanation. No markdown.
"""

    # ------------------------------------------------------------------
    # validate
    # ------------------------------------------------------------------

    def validate(self, record: dict, db: DBClient) -> list[str]:
        errors: list[str] = []
        if not record.get("sprite_key"):
            errors.append("sprite_key is required and must be non-empty")
        if not record.get("id"):
            errors.append("id (egdata_id) is required")
        return errors

    # ------------------------------------------------------------------
    # _insert_results — UPDATE entity_gameplay_data SET sprite_key
    # ------------------------------------------------------------------

    def _insert_results(self, db: DBClient, results: list[dict]) -> None:
        for record in results:
            egdata_id = record["id"]
            sprite_key = record["sprite_key"]
            db.update("entity_gameplay_data", {"sprite_key": sprite_key}, {"id": egdata_id})


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    EntitySpriteGenerator().run()
