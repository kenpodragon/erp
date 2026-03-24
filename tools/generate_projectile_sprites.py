#!/usr/bin/env python3
"""
tools/generate_projectile_sprites.py

Generator for projectile sprites — assigns projectile_sprite_key to
attack_types rows where it is NULL (non-melee attacks only),
and creates a matching asset_registry entry.

Usage (from tools/ directory):
    python generate_projectile_sprites.py status
    python generate_projectile_sprites.py generate
    python generate_projectile_sprites.py generate --ai --batch-size 20
    python generate_projectile_sprites.py generate --estimate
    python generate_projectile_sprites.py insert
    python generate_projectile_sprites.py validate
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
# Template projectile configs per animation type
# ---------------------------------------------------------------------------

_PROJECTILE_TEMPLATES: dict[str, dict] = {
    "ranged_projectile": {
        "shape": "arrow",
        "trail": "spark",
        "default_color": "#ffaa00",
    },
    "magic_cast": {
        "shape": "orb",
        "trail": "magic",
        "default_color": "#7b68ee",
    },
    "elemental": {
        "shape": "wave",
        "trail": "elemental",
        "default_color": "#00ccff",
    },
    "aoe_burst": {
        "shape": "expanding_circle",
        "trail": None,
        "default_color": "#ff4400",
    },
}

_DEFAULT_TEMPLATE = {
    "shape": "orb",
    "trail": "spark",
    "default_color": "#ff6600",
}


# ---------------------------------------------------------------------------
# Generator
# ---------------------------------------------------------------------------

class ProjectileSpriteGenerator(BaseGenerator):
    name = "generate_projectile_sprites"
    table = "asset_registry"
    default_batch_size = 20

    # ------------------------------------------------------------------
    # get_missing_items
    # ------------------------------------------------------------------

    def get_missing_items(self, db: DBClient) -> list[dict]:
        sql = """
            SELECT
                id,
                name,
                attack_animation_type,
                projectile_color
            FROM attack_types
            WHERE projectile_sprite_key IS NULL
              AND (attack_animation_type IS NULL
                   OR attack_animation_type != 'melee_swing')
            ORDER BY id
        """
        return db.query(sql)

    # ------------------------------------------------------------------
    # get_group_key
    # ------------------------------------------------------------------

    def get_group_key(self, item: dict) -> str:
        return (item.get("attack_animation_type") or "magic_cast").lower()

    # ------------------------------------------------------------------
    # python_fallback
    # ------------------------------------------------------------------

    def python_fallback(self, batch: list[dict], context: dict) -> list[dict]:
        results = []
        for item in batch:
            attack_id = item["id"]
            anim_type = (item.get("attack_animation_type") or "magic_cast").lower()
            color = item.get("projectile_color")

            template = _PROJECTILE_TEMPLATES.get(anim_type, _DEFAULT_TEMPLATE)
            if not color:
                color = template["default_color"]

            sprite_key = f"projectile_{anim_type}_{attack_id}"

            config_json = json.dumps({
                "shape": template["shape"],
                "trail": template.get("trail"),
                "color": color,
                "animation_type": anim_type,
            })

            record = {
                "attack_type_id": attack_id,
                "sprite_key": sprite_key,
                "asset_key": sprite_key,
                "category": "projectile_sprite",
                "render_definition": config_json,
                "source": "generator",
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
        """Normalize AI output — ensure render_definition is a JSON string."""
        rd = record.get("render_definition")
        if rd is not None and not isinstance(rd, str):
            record["render_definition"] = json.dumps(rd)
        # Ensure asset_key mirrors sprite_key
        if record.get("sprite_key") and not record.get("asset_key"):
            record["asset_key"] = record["sprite_key"]
        return record

    # ------------------------------------------------------------------
    # build_prompt
    # ------------------------------------------------------------------

    def build_prompt(self, batch: list[dict], context: dict) -> str:
        anim_types = list(_PROJECTILE_TEMPLATES.keys())
        attack_lines = [
            f'  - id={item["id"]} name="{item.get("name")}"'
            f' animation_type="{item.get("attack_animation_type")}"'
            f' base_color="{item.get("projectile_color") or "derive from name"}"'
            for item in batch
        ]
        attacks_block = "\n".join(attack_lines)

        return f"""You are a VFX artist for a dark-fantasy MMORPG called "Towers of Elysium". Generate UNIQUE, DETAILED projectile sprite configurations for each attack type below.

Each projectile must have a visual identity that reflects the attack name and damage type. Think about what the attack LOOKS and FEELS like in motion.

PROJECTILE DESIGN VOCABULARY:

Shape options (pick what suits the attack):
- orb: Glowing sphere with inner light pulse
- arrow: Slim aerodynamic projectile with feather tail
- bolt: Short thick energy discharge
- wave: Spreading arc of energy
- lance: Long piercing beam
- spiral: Corkscrew rotating shape
- expanding_circle: Radiating ring that grows outward
- shard: Angular crystalline fragment
- tendril: Writhing organic thread
- vortex: Swirling inward spiral

Trail effects (what the projectile leaves behind):
- spark: Brief bright sparks
- fire: Trailing flame wisps with heat distortion
- ice: Frost crystal fragments floating
- void: Distorting space-tear with darkness
- poison: Dripping green-black globules
- lightning: Branching electric tendrils
- dust: Crumbling earth particles
- magic: Twinkling arcane motes
- smoke: Dark billowing cloud remnants
- blood: Red droplet spray

Impact effects (what happens on hit):
- explosion: Expanding fireball with debris
- freeze: Ice crystal formation radiating outward
- implode: Reality collapse inward with void pull
- radiate: Holy light pulse expanding
- corrode: Spreading acid eat-away
- shock: Lightning discharge arcs
- shatter: Crystalline fragmentation burst
- flash: Bright white-yellow starburst
- burst: Magical energy bloom
- crush: Impact crater with shockwave

EXAMPLE MAPPINGS (use as inspiration, generate your own for each):
- "Void Bolt" → vortex shape, #6600cc color, void trail, implode impact — "a swirling dark purple vortex with reality-distortion tendrils"
- "Thermal Lance" → lance shape, #ff4400 color, fire trail, explosion impact — "a blazing white-hot lance leaving an ember and smoke trail"
- "Corruption Spore" → orb shape, #33cc00 color, poison trail, corrode impact — "a pulsing sickly green spore trailing decay motes"
- "Psychic Pulse" → wave shape, #00ffcc color, magic trail, burst impact — "a cyan shockwave of mental energy with iridescent ripple rings"
- "Gravitic Pull" → vortex shape, #000044 color, void trail, crush impact — "a dense indigo singularity warping light around it"
- "Stone Shard" → shard shape, #8b4513 color, dust trail, shatter impact — "jagged granite fragment trailing dust and pebbles"

Attack types to generate:
{attacks_block}

Valid animation_type values: {anim_types}

For each attack type, return a JSON object with:
  attack_type_id (integer),
  sprite_key ("projectile_{{animation_type}}_{{id}}"),
  asset_key (same as sprite_key),
  category ("projectile_sprite"),
  render_definition (a JSON STRING containing: shape, color (#RRGGBB), trail, impact_effect, particle_count (10-50 integer), speed_multiplier (0.5-2.0 float), size_scale (0.5-2.0 float), visual_description (1 sentence evocative description))

Return a JSON array. No explanation. No markdown.
"""

    # ------------------------------------------------------------------
    # validate
    # ------------------------------------------------------------------

    def validate(self, record: dict, db: DBClient) -> list[str]:
        errors: list[str] = []
        if not record.get("sprite_key"):
            errors.append("sprite_key is required and must be non-empty")
        if not record.get("asset_key"):
            errors.append("asset_key is required")
        return errors

    # ------------------------------------------------------------------
    # _insert_results — UPDATE attack_types + INSERT asset_registry
    # ------------------------------------------------------------------

    def _insert_results(self, db: DBClient, results: list[dict]) -> None:
        for record in results:
            attack_type_id = record["attack_type_id"]
            sprite_key = record["sprite_key"]

            # Update attack_types
            db.update("attack_types", {"projectile_sprite_key": sprite_key}, {"id": attack_type_id})

            # Insert into asset_registry
            asset_row = {
                "asset_key": record["asset_key"],
                "category": record["category"],
                "render_definition": record["render_definition"],
                "source": record["source"],
            }
            db.insert_batch(self.table, [asset_row])


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    ProjectileSpriteGenerator().run()
