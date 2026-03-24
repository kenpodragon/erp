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

# Ensure repo root is on sys.path so `tools.generators.lib` resolves
_REPO_ROOT = str(Path(__file__).resolve().parent.parent.parent)
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from tools.generators.lib.base_generator import BaseGenerator
from tools.generators.lib.db_client import DBClient


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
        """Pass-through — all fields are plain strings, no FK resolution needed."""
        return record

    # ------------------------------------------------------------------
    # build_prompt
    # ------------------------------------------------------------------

    def build_prompt(self, batch: list[dict], context: dict) -> str:
        lines = [
            f'  - id={r["id"]} name="{r.get("canonical_name")}"'
            f' type="{r.get("entity_type_name")}"'
            f' family="{r.get("entity_family_name", "unknown")}"'
            f' chapter="{r.get("chapter_title", "unknown")}"'
            f' book="{r.get("book_title", "unknown")}"'
            for r in batch
        ]
        entities_block = "\n".join(lines)

        return f"""You are a lore writer for "Towers of Elysium", a dark-fantasy MMORPG based on a gothic horror book trilogy. Write IMMERSIVE, EVOCATIVE lore content for each entity below.

WRITING STYLE:
- Voice: Grim, literary, atmospheric — like flavour text in Darkest Dungeon or Dark Souls
- Tone: Dread, awe, and weary familiarity with horror
- Length: base_description = exactly 2-3 sentences. base_sounds = exactly 1 sentence.
- NO clichés: do not write "its eyes glowed red" or "it exuded menace" — be specific and visceral

CONTENT FIELDS TO GENERATE:

1. base_description (2-3 sentences):
   - Sentence 1: What the entity looks like — specific physical details, how it moves
   - Sentence 2: Its behavior or hunting pattern, what makes it dangerous or unsettling
   - Sentence 3 (optional): Its relationship to the world — what curse or force created it

2. base_emotional_state (single word or short phrase):
   - The psychological state the entity projects onto those nearby
   - Examples: "hollow despair", "frenzied hunger", "cold calculating malice", "mournful longing", "infectious madness"
   - Must be UNIQUE per entity — do not repeat the same state

3. base_sounds (1 sentence):
   - What the entity sounds like when encountered — be specific about the quality and source
   - Examples: "A wet clicking rhythm like cracking joints precedes it from three rooms away." / "It communicates only in the scrape of keratin on stone." / "Silence itself seems to deepen in its presence, swallowing ambient sound."

4. base_smells (1 sentence, optional but encouraged):
   - What olfactory signature it leaves — ozone, rot, copper, sulfur, ancient dust, etc.

EXAMPLES OF GOOD vs BAD DESCRIPTIONS:

BAD: "A fearsome creature prowls the shadows. It is very dangerous and scary."
GOOD: "The Marrow Stalker moves in a slow lateral gait, its spine articulating backwards at the hip like a broken marionette. It targets warmth — pressing its hollow face against stone walls where heat bleeds through — and waits for prey to pass within arm's reach. They say it was once a tax collector, cursed for every lie he told until his face forgot how to hold expression."

Entities to generate:
{entities_block}

For each entity, return a JSON object with:
  id (integer),
  base_description (string, 2-3 sentences),
  base_emotional_state (string, short phrase),
  base_sounds (string, 1 sentence),
  base_smells (string, 1 sentence — or null if you cannot derive one)

Return a JSON array. No explanation. No markdown.
"""

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
            db.update(
                "entities",
                {
                    "base_description": record.get("base_description"),
                    "base_emotional_state": record.get("base_emotional_state"),
                    "base_sounds": record.get("base_sounds"),
                },
                {"id": entity_id},
            )


if __name__ == "__main__":
    LoreContentGenerator().run()
