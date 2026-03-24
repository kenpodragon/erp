#!/usr/bin/env python3
"""
tools/generate_entity_gameplay.py

Generator for entity_gameplay_data — visual and combat attributes for all entities.
Populates sprite_key, colors, FK references to lookup tables, and stat defaults.

Usage (from tools/ directory):
    python generate_entity_gameplay.py status
    python generate_entity_gameplay.py generate
    python generate_entity_gameplay.py generate --ai --batch-size 30
    python generate_entity_gameplay.py generate --estimate
    python generate_entity_gameplay.py insert
    python generate_entity_gameplay.py validate
"""
from __future__ import annotations

import json
import random
import re
import sys
from pathlib import Path

# Allow running from repo root or tools/ directory
_TOOLS_DIR = Path(__file__).resolve().parent
if str(_TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(_TOOLS_DIR))

from lib.base_generator import BaseGenerator
from lib.db_client import DBClient


# ---------------------------------------------------------------------------
# Type-based visual defaults
# ---------------------------------------------------------------------------

_TYPE_DEFAULTS: dict[str, dict] = {
    "creature":      {"movement": "ground",  "animation": "stalk",  "silhouette": "quadruped", "size": "medium"},
    "manifestation": {"movement": "hover",   "animation": "pulse",  "silhouette": "orb",       "size": "small"},
    "spirit":        {"movement": "hover",   "animation": "pulse",  "silhouette": "orb",       "size": "small"},
    "humanoid":      {"movement": "ground",  "animation": "aggro",  "silhouette": "biped",     "size": "medium"},
    "beast":         {"movement": "ground",  "animation": "stalk",  "silhouette": "quadruped", "size": "large"},
    "construct":     {"movement": "ground",  "animation": "aggro",  "silhouette": "biped",     "size": "large"},
    "undead":        {"movement": "ground",  "animation": "ooze",   "silhouette": "biped",     "size": "medium"},
}

_FALLBACK_DEFAULTS: dict = {
    "movement": "ground", "animation": "stalk", "silhouette": "quadruped", "size": "medium"
}

# Dark-fantasy primary colour palette (deep reds / blacks)
_PRIMARY_COLOURS = [
    "#2F0000", "#3D0000", "#4A0000", "#5C0000", "#6B0000",
    "#7A0000", "#8B0000", "#3B0A0A", "#4A1010", "#5C1818",
]

# Secondary accent colours (deep blues / purples)
_SECONDARY_COLOURS = [
    "#1A1A2E", "#16213E", "#0F3460", "#1B1464", "#2C2C54",
    "#2E1760", "#3B2070", "#4A2080", "#3A3A5C", "#4A4A6E",
]


def _random_primary() -> str:
    return random.choice(_PRIMARY_COLOURS)


def _random_secondary() -> str:
    return random.choice(_SECONDARY_COLOURS)


def _is_boss(entity_type_name: str, entity_name: str) -> bool:
    """Heuristic: treat 'boss' type or name containing 'boss'/'lord'/'king'/'queen' as boss."""
    if entity_type_name and "boss" in entity_type_name.lower():
        return True
    if entity_name and re.search(r"\b(boss|lord|king|queen|elder|ancient|tyrant)\b",
                                  entity_name, re.IGNORECASE):
        return True
    return False


# ---------------------------------------------------------------------------
# Generator
# ---------------------------------------------------------------------------

class EntityGameplayGenerator(BaseGenerator):
    name = "generate_entity_gameplay"
    table = "entity_gameplay_data"
    default_batch_size = 30

    # ------------------------------------------------------------------
    # get_missing_items
    # ------------------------------------------------------------------

    def get_missing_items(self, db: DBClient) -> list[dict]:
        sql = """
            SELECT
                e.id,
                e.canonical_name                    AS entity_name,
                e.base_description,
                et.name                             AS entity_type_name,
                c.title                             AS chapter_title
            FROM entities e
            LEFT JOIN entity_types et
                ON e.entity_type_id = et.id
            LEFT JOIN entity_gameplay_data eg
                ON eg.entity_id = e.id
            LEFT JOIN scenes s
                ON s.id = e.first_appearance_scene_id
            LEFT JOIN chapters c
                ON c.id = s.chapter_id
            WHERE eg.id IS NULL
               OR eg.movement_type_id IS NULL
               OR eg.color_primary IS NULL
            ORDER BY e.id
        """
        return db.query(sql)

    # ------------------------------------------------------------------
    # get_group_key
    # ------------------------------------------------------------------

    def get_group_key(self, item: dict) -> str:
        return (item.get("entity_type_name") or "unknown").lower()

    # ------------------------------------------------------------------
    # get_context
    # ------------------------------------------------------------------

    def get_context(self, db: DBClient) -> dict:
        """Load all lookup tables as {name: id} dicts plus first 5 attack_type ids."""
        movement_types    = db.get_lookup("movement_types")
        size_classes      = db.get_lookup("size_classes")
        animation_styles  = db.get_lookup("animation_styles")
        silhouette_types  = db.get_lookup("silhouette_types")
        attack_types      = db.get_lookup("attack_types")

        # First 5 attack types (by id) for primary assignment
        rows = db.query("SELECT id, name FROM attack_types ORDER BY id LIMIT 5")
        primary_attack_ids = [r["id"] for r in rows]

        return {
            "movement_types":    movement_types,
            "size_classes":      size_classes,
            "animation_styles":  animation_styles,
            "silhouette_types":  silhouette_types,
            "attack_types":      attack_types,
            "primary_attack_ids": primary_attack_ids,
        }

    # ------------------------------------------------------------------
    # python_fallback
    # ------------------------------------------------------------------

    def python_fallback(self, batch: list[dict], context: dict) -> list[dict]:
        movement_types   = context["movement_types"]
        size_classes     = context["size_classes"]
        animation_styles = context["animation_styles"]
        silhouette_types = context["silhouette_types"]
        primary_attack_ids = context["primary_attack_ids"]

        results = []
        for item in batch:
            entity_id   = item["id"]
            entity_name = item.get("entity_name") or ""
            type_name   = (item.get("entity_type_name") or "").lower()

            defaults = _TYPE_DEFAULTS.get(type_name, _FALLBACK_DEFAULTS)

            movement_id   = movement_types.get(defaults["movement"])
            size_id       = size_classes.get(defaults["size"])
            animation_id  = animation_styles.get(defaults["animation"])
            silhouette_id = silhouette_types.get(defaults["silhouette"])

            # Primary attack type — random from first 5
            primary_attack_id = random.choice(primary_attack_ids) if primary_attack_ids else None

            # Secondary / tertiary only for bosses
            is_boss = _is_boss(type_name, entity_name)
            secondary_attack_id = None
            tertiary_attack_id  = None
            if is_boss and len(primary_attack_ids) >= 3:
                secondary_attack_id = random.choice(primary_attack_ids)
                tertiary_attack_id  = random.choice(primary_attack_ids)

            # sprite_key: snake_case canonical name, strip non-alphanumeric
            sprite_key = re.sub(r"[^a-z0-9]+", "_", entity_name.lower()).strip("_")

            record = {
                "entity_id":              entity_id,
                "sprite_key":             sprite_key,
                "base_hp":                20,
                "base_gold":              8,
                "appearance_chance":      1.0,
                "difficulty_modifier":    1.0,
                "stat_block":             json.dumps({}),
                "movement_type_id":       movement_id,
                "size_class_id":          size_id,
                "animation_style_id":     animation_id,
                "silhouette_type_id":     silhouette_id,
                "color_primary":          _random_primary(),
                "color_secondary":        _random_secondary(),
                "primary_attack_type_id": primary_attack_id,
                "secondary_attack_type_id": secondary_attack_id,
                "tertiary_attack_type_id":  tertiary_attack_id,
                "death_sfx_key":          None,
                "unique_boss_theme_id":   None,
            }
            results.append(record)

        return results

    # ------------------------------------------------------------------
    # build_prompt
    # ------------------------------------------------------------------

    def build_prompt(self, batch: list[dict], context: dict) -> str:
        movement_names   = list(context["movement_types"].keys())
        size_names       = list(context["size_classes"].keys())
        animation_names  = list(context["animation_styles"].keys())
        silhouette_names = list(context["silhouette_types"].keys())
        attack_names     = list(context["attack_types"].keys())

        entity_lines = []
        for item in batch:
            desc = (item.get("base_description") or "").strip()[:120]
            chapter = item.get("chapter_title") or "unknown chapter"
            entity_lines.append(
                f'  - id={item["id"]} name="{item.get("entity_name")}" '
                f'type="{item.get("entity_type_name")}" chapter="{chapter}" desc="{desc}"'
            )
        entities_block = "\n".join(entity_lines)

        prompt = f"""You are generating visual and combat attributes for dark-fantasy MMORPG entities.

Entities to process:
{entities_block}

Lookup options:
  movement_types:   {movement_names}
  size_classes:     {size_names}
  animation_styles: {animation_names}
  silhouette_types: {silhouette_names}
  attack_types:     {attack_names}

Rules:
- color_primary: dark hex color in range #2F0000–#8B0000 (deep dark red/black tones)
- color_secondary: accent hex in range #1a1a2e–#4a4a6e (deep blue/purple tones)
- sprite_key: snake_case version of entity name, lowercase, alphanumeric + underscores only
- base_hp: integer (typical range 10–80; bosses 100–500)
- base_gold: integer (typical range 4–20)
- appearance_chance: float 0.0–1.0
- difficulty_modifier: float 0.5–3.0 (bosses higher)
- stat_block: empty JSON object {{}}
- primary_attack_type_id: REQUIRED — use the NAME of an attack_type from the list
- secondary_attack_type_id: null for most; non-null for bosses
- tertiary_attack_type_id: null for most; non-null for bosses
- death_sfx_key: null
- unique_boss_theme_id: null

Return a JSON array (one object per entity) with these fields:
  entity_id, sprite_key, base_hp, base_gold, appearance_chance, difficulty_modifier,
  stat_block, movement_type_name, size_class_name, animation_style_name,
  silhouette_type_name, color_primary, color_secondary,
  primary_attack_type_name, secondary_attack_type_name, tertiary_attack_type_name,
  death_sfx_key, unique_boss_theme_id

Return ONLY the JSON array, no explanation.
"""
        return prompt

    # ------------------------------------------------------------------
    # validate
    # ------------------------------------------------------------------

    def validate(self, record: dict, db: DBClient) -> list[str]:
        errors: list[str] = []

        # Required FK fields
        fk_checks = [
            ("movement_type_id",   "movement_types"),
            ("size_class_id",      "size_classes"),
            ("animation_style_id", "animation_styles"),
            ("silhouette_type_id", "silhouette_types"),
        ]
        context = self.get_context(db)

        for field, table in fk_checks:
            val = record.get(field)
            if val is None:
                errors.append(f"{field} is required")
            elif val not in context[table].values():
                errors.append(f"{field}={val} not found in {table}")

        # primary_attack_type_id required
        pat_id = record.get("primary_attack_type_id")
        if pat_id is None:
            errors.append("primary_attack_type_id is required")
        elif pat_id not in context["attack_types"].values():
            errors.append(f"primary_attack_type_id={pat_id} not found in attack_types")

        # Optional FK: secondary / tertiary attack types
        for field in ("secondary_attack_type_id", "tertiary_attack_type_id"):
            val = record.get(field)
            if val is not None and val not in context["attack_types"].values():
                errors.append(f"{field}={val} not found in attack_types")

        # Colour validation
        hex_re = re.compile(r"^#[0-9A-Fa-f]{6}$")
        for colour_field in ("color_primary", "color_secondary"):
            val = record.get(colour_field) or ""
            if not hex_re.match(val):
                errors.append(f"{colour_field}='{val}' is not a valid #RRGGBB hex colour")

        # entity_id required
        if not record.get("entity_id"):
            errors.append("entity_id is required")

        return errors

    # ------------------------------------------------------------------
    # _insert_results  (INSERT — these are always new rows)
    # ------------------------------------------------------------------

    def _insert_results(self, db: DBClient, results: list[dict]) -> None:
        """INSERT new rows or UPDATE existing rows with visual data."""
        for record in results:
            entity_id = record["entity_id"]
            # Check if row already exists
            existing = db.query(
                "SELECT id FROM entity_gameplay_data WHERE entity_id = %s",
                [entity_id],
            )
            if existing:
                # UPDATE visual columns on existing row
                visual_fields = {
                    k: v for k, v in record.items()
                    if k not in ("entity_id", "base_hp", "base_gold",
                                 "appearance_chance", "difficulty_modifier",
                                 "stat_block")
                    and v is not None
                }
                if visual_fields:
                    db.update("entity_gameplay_data", visual_fields,
                              {"entity_id": entity_id})
            else:
                db.insert_one("entity_gameplay_data", record)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    EntityGameplayGenerator().run()
