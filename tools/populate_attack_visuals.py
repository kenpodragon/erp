#!/usr/bin/env python3
"""
tools/populate_attack_visuals.py

Generator that populates projectile_color, trail_type, and impact_effect on
attack_types rows where any of these fields are NULL.

Usage (from tools/ directory):
    python populate_attack_visuals.py status
    python populate_attack_visuals.py generate
    python populate_attack_visuals.py generate --ai --batch-size 20
    python populate_attack_visuals.py generate --estimate
    python populate_attack_visuals.py insert
    python populate_attack_visuals.py validate
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

_TOOLS_DIR = Path(__file__).resolve().parent
if str(_TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(_TOOLS_DIR))

from lib.base_generator import BaseGenerator
from lib.db_client import DBClient

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------

_PHYSICAL_DEFAULTS = {
    "projectile_color": "#ff6600",
    "trail_type": "spark",
    "impact_effect": "flash",
}

_MAGICAL_DEFAULTS = {
    "projectile_color": "#7b68ee",
    "trail_type": "magic",
    "impact_effect": "burst",
}

# Keyword overrides — checked against attack name (case-insensitive)
_KEYWORD_OVERRIDES: list[tuple[str, dict]] = [
    ("fire",  {"projectile_color": "#ff4400", "trail_type": "fire",  "impact_effect": "explosion"}),
    ("ice",   {"projectile_color": "#00ccff", "trail_type": "ice",   "impact_effect": "freeze"}),
    ("frost", {"projectile_color": "#00ccff", "trail_type": "ice",   "impact_effect": "freeze"}),
    ("void",  {"projectile_color": "#6600cc", "trail_type": "void",  "impact_effect": "implode"}),
    ("holy",  {"projectile_color": "#ffd700", "trail_type": "spark", "impact_effect": "radiate"}),
    ("light", {"projectile_color": "#ffd700", "trail_type": "spark", "impact_effect": "radiate"}),
    ("dark",  {"projectile_color": "#330033", "trail_type": "void",  "impact_effect": "implode"}),
    ("shadow",{"projectile_color": "#2f2f4f", "trail_type": "void",  "impact_effect": "implode"}),
    ("poison",{"projectile_color": "#228b22", "trail_type": "poison","impact_effect": "corrode"}),
    ("acid",  {"projectile_color": "#9acd32", "trail_type": "poison","impact_effect": "corrode"}),
    ("storm", {"projectile_color": "#87ceeb", "trail_type": "lightning","impact_effect": "shock"}),
    ("thunder",{"projectile_color": "#87ceeb","trail_type": "lightning","impact_effect": "shock"}),
    ("earth", {"projectile_color": "#8b4513", "trail_type": "dust",  "impact_effect": "shatter"}),
]

_VALID_TRAIL_TYPES = {
    "spark", "magic", "fire", "ice", "void", "poison", "lightning", "dust",
    "elemental", "none",
}


# ---------------------------------------------------------------------------
# Generator
# ---------------------------------------------------------------------------

class AttackVisualsGenerator(BaseGenerator):
    name = "populate_attack_visuals"
    table = "attack_types"
    default_batch_size = 20

    # ------------------------------------------------------------------
    # get_missing_items
    # ------------------------------------------------------------------

    def get_missing_items(self, db: DBClient) -> list[dict]:
        sql = """
            SELECT
                id,
                name,
                is_physical
            FROM attack_types
            WHERE projectile_color IS NULL
               OR trail_type IS NULL
               OR impact_effect IS NULL
            ORDER BY id
        """
        return db.query(sql)

    # ------------------------------------------------------------------
    # get_group_key
    # ------------------------------------------------------------------

    def get_group_key(self, item: dict) -> str:
        return "physical" if item.get("is_physical") else "magical"

    # ------------------------------------------------------------------
    # python_fallback
    # ------------------------------------------------------------------

    def python_fallback(self, batch: list[dict], context: dict) -> list[dict]:
        results = []
        for item in batch:
            attack_id = item["id"]
            name = (item.get("name") or "").lower()
            is_physical = bool(item.get("is_physical"))

            defaults = dict(_PHYSICAL_DEFAULTS if is_physical else _MAGICAL_DEFAULTS)

            # Apply keyword overrides — first match wins
            for keyword, overrides in _KEYWORD_OVERRIDES:
                if re.search(r"\b" + re.escape(keyword) + r"\b", name):
                    defaults.update(overrides)
                    break

            record = {
                "id": attack_id,
                "projectile_color": defaults["projectile_color"],
                "trail_type": defaults["trail_type"],
                "impact_effect": defaults["impact_effect"],
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
        """Validate and normalize AI-returned color/trail/impact fields."""
        import re
        hex_re = re.compile(r"^#[0-9A-Fa-f]{6}$")
        color = record.get("projectile_color") or ""
        if color and not hex_re.match(color):
            # Try to fix missing hash
            if re.match(r"^[0-9A-Fa-f]{6}$", color):
                record["projectile_color"] = f"#{color}"
        trail = record.get("trail_type") or ""
        if trail and trail not in _VALID_TRAIL_TYPES:
            # Best-effort fallback
            record["trail_type"] = "magic"
        return record

    # ------------------------------------------------------------------
    # build_prompt
    # ------------------------------------------------------------------

    def build_prompt(self, batch: list[dict], context: dict) -> str:
        attack_lines = [
            f'  - id={item["id"]} name="{item.get("name")}" is_physical={item.get("is_physical")}'
            for item in batch
        ]
        attacks_block = "\n".join(attack_lines)

        return f"""You are a VFX designer for a dark-fantasy MMORPG called "Towers of Elysium". Assign UNIQUE visual signatures to each attack type below. Every attack must feel visually distinct — do not reuse the same color/trail/impact combination.

UNIQUE VISUAL SIGNATURE GUIDE (use these as anchors, then be creative for variations):

By attack theme (infer from name):
- void / null / abyssal → #6600cc deep purple, void trail, implode impact
- corruption / rot / decay → #33cc00 sickly green, poison trail, corrode impact
- psychic / mind / mental → #00ffcc bright cyan, magic trail, burst impact
- gravitic / gravity / crush → #000066 dark navy, void trail, crush impact
- thermal / fire / flame / blaze → #ff4400 orange-red, fire trail, explosion impact
- frost / ice / cryo / freeze → #00ccff pale blue, ice trail, freeze impact
- lightning / storm / thunder / arc → #87ceeb electric blue, lightning trail, shock impact
- holy / divine / sacred / light → #ffd700 gold, spark trail, radiate impact
- shadow / dark / night / umbra → #2f2f4f near-black, void trail, implode impact
- poison / acid / venom / toxic → #9acd32 yellow-green, poison trail, corrode impact
- earth / stone / rock / seismic → #8b4513 brown, dust trail, shatter impact
- blood / life / vitality → #cc0000 deep red, spark trail, flash impact
- arcane / mystic / rune → #7b68ee medium purple, magic trail, burst impact
- bone / death / necrotic → #d2b48c tan-bone, dust trail, shatter impact
- wind / air / gust / storm → #c0e0ff pale sky, spark trail, flash impact

Physical attacks (is_physical=True): Default to #ff6600 orange, spark trail, flash impact — but OVERRIDE based on name keywords above.
Magical attacks (is_physical=False): Default to #7b68ee purple, magic trail, burst impact — but OVERRIDE based on name keywords above.

Valid trail_type values: {sorted(_VALID_TRAIL_TYPES)}

IMPORTANT: Each attack must have a projectile_color that EXACTLY matches its thematic identity. Don't default to generic orange or purple if the name implies something more specific.

Attack types to process:
{attacks_block}

For each attack type, return a JSON object with:
  id (integer),
  projectile_color (hex #RRGGBB — MUST be unique and thematically appropriate),
  trail_type (from valid list above),
  impact_effect (one of: explosion, freeze, implode, radiate, corrode, shock, shatter, flash, burst, crush)

Return a JSON array. No explanation. No markdown.
"""

    # ------------------------------------------------------------------
    # validate
    # ------------------------------------------------------------------

    def validate(self, record: dict, db: DBClient) -> list[str]:
        errors: list[str] = []

        for field in ("projectile_color", "trail_type", "impact_effect"):
            if not record.get(field):
                errors.append(f"{field} is required and must be non-empty")

        hex_re = re.compile(r"^#[0-9A-Fa-f]{6}$")
        color = record.get("projectile_color") or ""
        if color and not hex_re.match(color):
            errors.append(f"projectile_color='{color}' is not a valid #RRGGBB hex color")

        trail = record.get("trail_type") or ""
        if trail and trail not in _VALID_TRAIL_TYPES:
            # Warn but don't hard-fail — new trail types may be added
            pass

        return errors

    # ------------------------------------------------------------------
    # _insert_results — UPDATE attack_types
    # ------------------------------------------------------------------

    def _insert_results(self, db: DBClient, results: list[dict]) -> None:
        for record in results:
            db.update(
                "attack_types",
                {
                    "projectile_color": record["projectile_color"],
                    "trail_type": record["trail_type"],
                    "impact_effect": record["impact_effect"],
                },
                {"id": record["id"]},
            )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    AttackVisualsGenerator().run()
