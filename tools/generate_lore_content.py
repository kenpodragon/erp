#!/usr/bin/env python3
"""
tools/generate_lore_content.py

Generator for entity lore content — base_description, base_emotional_state, base_sounds.
Populates entities that have NULL base_description using type-based templates.

Usage (from tools/ directory):
    python generate_lore_content.py status
    python generate_lore_content.py generate
    python generate_lore_content.py generate --estimate
    python generate_lore_content.py insert
    python generate_lore_content.py validate
"""
from __future__ import annotations

import sys
from pathlib import Path

_TOOLS_DIR = Path(__file__).resolve().parent
if str(_TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(_TOOLS_DIR))

from lib.base_generator import BaseGenerator
from lib.db_client import DBClient


_DESCRIPTION_TEMPLATES: dict[str, str] = {
    "creature":      "A fearsome {name} prowls the shadows, its presence sending chills through the air.",
    "manifestation": "An ethereal {name} flickers in and out of existence, pulsing with otherworldly energy.",
    "spirit":        "The spectral form of {name} drifts silently, its hollow gaze piercing the veil between worlds.",
    "humanoid":      "A dark figure known as {name} stands ready, armed and dangerous.",
    "beast":         "The massive {name} stalks its territory with primal fury.",
}

_EMOTIONAL_TEMPLATES: dict[str, str] = {
    "creature":      "aggressive",
    "manifestation": "erratic",
    "spirit":        "mournful",
    "humanoid":      "hostile",
    "beast":         "feral",
}

_SOUND_TEMPLATES: dict[str, str] = {
    "creature":      "A low, guttural growl echoes as {name} approaches.",
    "manifestation": "An eerie hum emanates from {name}, resonating at an unsettling frequency.",
    "spirit":        "Whispered lamentations surround {name}, barely audible above the silence.",
    "humanoid":      "{name} lets out a battle cry, steel ringing against stone.",
    "beast":         "The thunderous footfalls of {name} shake the ground.",
}

_DEFAULT_DESCRIPTION = "A mysterious entity known as {name} lurks in the darkness."
_DEFAULT_EMOTIONAL = "threatening"
_DEFAULT_SOUND = "An ominous presence surrounds {name}."


class LoreContentGenerator(BaseGenerator):
    name = "generate_lore_content"
    table = "entities"
    default_batch_size = 30

    def get_missing_items(self, db: DBClient) -> list[dict]:
        sql = """
            SELECT
                e.id,
                e.canonical_name,
                et.name AS entity_type_name
            FROM entities e
            LEFT JOIN entity_types et ON et.id = e.entity_type_id
            WHERE e.base_description IS NULL
            ORDER BY e.id
        """
        return db.query(sql)

    def get_group_key(self, item: dict) -> str:
        return (item.get("entity_type_name") or "unknown").lower()

    def python_fallback(self, batch: list[dict], context: dict) -> list[dict]:
        results = []
        for item in batch:
            entity_id = item["id"]
            name = item.get("canonical_name") or "unknown entity"
            type_name = (item.get("entity_type_name") or "").lower()

            desc_tmpl = _DESCRIPTION_TEMPLATES.get(type_name, _DEFAULT_DESCRIPTION)
            emo_tmpl = _EMOTIONAL_TEMPLATES.get(type_name, _DEFAULT_EMOTIONAL)
            snd_tmpl = _SOUND_TEMPLATES.get(type_name, _DEFAULT_SOUND)

            results.append({
                "id": entity_id,
                "base_description": desc_tmpl.format(name=name),
                "base_emotional_state": emo_tmpl,
                "base_sounds": snd_tmpl.format(name=name),
            })
        return results

    def build_prompt(self, batch: list[dict], context: dict) -> str:
        lines = [f"  - id={r['id']} name=\"{r.get('canonical_name')}\" type=\"{r.get('entity_type_name')}\"" for r in batch]
        return (
            "Generate lore descriptions for these dark-fantasy entities.\n"
            "Return JSON array with fields: id, base_description, base_emotional_state, base_sounds\n\n"
            + "\n".join(lines)
        )

    def validate(self, record: dict, db: DBClient) -> list[str]:
        errors: list[str] = []
        if not record.get("id"):
            errors.append("id is required")
        if not record.get("base_description"):
            errors.append("base_description is required")
        return errors

    def _insert_results(self, db: DBClient, results: list[dict]) -> None:
        for record in results:
            entity_id = record["id"]
            db.execute(
                """
                UPDATE entities
                SET base_description    = $1,
                    base_emotional_state = $2,
                    base_sounds         = $3
                WHERE id = $4
                """,
                [
                    record.get("base_description"),
                    record.get("base_emotional_state"),
                    record.get("base_sounds"),
                    entity_id,
                ],
            )


if __name__ == "__main__":
    LoreContentGenerator().run()
