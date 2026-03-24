#!/usr/bin/env python3
"""
tools/generate_extended_music.py

Generator for extended music loop definitions on atmospheres.
Extends music_definitions that are NULL or have fewer than 3 sections
by adding variation, intro, bridge, and outro sections.

Usage (from tools/ directory):
    python generate_extended_music.py status
    python generate_extended_music.py generate
    python generate_extended_music.py generate --estimate
    python generate_extended_music.py insert
    python generate_extended_music.py validate
"""
from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

_TOOLS_DIR = Path(__file__).resolve().parent
if str(_TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(_TOOLS_DIR))

from lib.base_generator import BaseGenerator
from lib.db_client import DBClient

# Minimum number of sections to consider "extended"
_MIN_SECTIONS = 3


def _transpose_notes(notes: list, semitones: int) -> list:
    """Transpose a list of note dicts by shifting frequency by semitones (approx)."""
    ratio = 2 ** (semitones / 12)
    result = []
    for note in notes:
        if isinstance(note, dict) and "frequency" in note:
            new_note = dict(note)
            new_note["frequency"] = round(note["frequency"] * ratio, 2)
            result.append(new_note)
        else:
            result.append(note)
    return result


def _extend_music_definitions(music_def: dict) -> dict:
    """
    Given an existing music_definitions dict, add variation/intro/bridge/outro sections.
    Works with the Web Audio synthesis format used by MusicManager.
    """
    extended = copy.deepcopy(music_def)
    sections = extended.get("sections", [])

    # Build intro from first section (half tempo)
    if sections and not any(s.get("name") == "intro" for s in sections):
        intro = copy.deepcopy(sections[0])
        intro["name"] = "intro"
        intro["duration_beats"] = max(4, intro.get("duration_beats", 8) // 2)
        intro["volume_envelope"] = {"attack": 2.0, "sustain": 0.7, "release": 0.5}
        sections.insert(0, intro)

    # Add variation of main theme (transposed up 2 semitones with counter-melody)
    main_sections = [s for s in sections if s.get("name") not in ("intro", "bridge", "outro", "variation")]
    if main_sections and not any(s.get("name") == "variation" for s in sections):
        variation = copy.deepcopy(main_sections[0])
        variation["name"] = "variation"
        # Transpose notes if present
        for track in variation.get("tracks", []):
            if "notes" in track:
                track["notes"] = _transpose_notes(track["notes"], 2)
            if "counter_melody" not in track:
                track["counter_melody"] = True
        # Extend note sequences to 2x
        existing_notes = variation.get("notes", [])
        if existing_notes:
            variation["notes"] = existing_notes + _transpose_notes(existing_notes, 4)
        sections.append(variation)

    # Add bridge (quiet, half volume)
    if not any(s.get("name") == "bridge" for s in sections):
        bridge_base = copy.deepcopy(main_sections[0]) if main_sections else {"name": "bridge", "tracks": []}
        bridge_base["name"] = "bridge"
        bridge_base["volume_multiplier"] = 0.5
        bridge_base["duration_beats"] = bridge_base.get("duration_beats", 8)
        sections.append(bridge_base)

    # Add outro (fade out)
    if not any(s.get("name") == "outro" for s in sections):
        outro = copy.deepcopy(sections[-1]) if sections else {"name": "outro", "tracks": []}
        outro["name"] = "outro"
        outro["volume_envelope"] = {"attack": 0.1, "sustain": 0.5, "release": 3.0}
        outro["fade_out"] = True
        sections.append(outro)

    extended["sections"] = sections
    extended["loop_point"] = extended.get("loop_point", 1)  # loop back to section index 1 (skip intro)
    extended["extended"] = True

    return extended


class ExtendedMusicGenerator(BaseGenerator):
    name = "generate_extended_music"
    table = "atmospheres"
    default_batch_size = 5

    def get_missing_items(self, db: DBClient) -> list[dict]:
        """Atmospheres where music_definitions is NULL or has fewer than _MIN_SECTIONS sections."""
        all_atmos = db.query(
            "SELECT id, name, archetype, music_definitions FROM atmospheres ORDER BY id"
        )
        missing = []
        for row in all_atmos:
            md = row.get("music_definitions")
            if md is None:
                missing.append(row)
                continue
            if isinstance(md, str):
                try:
                    md = json.loads(md)
                except (json.JSONDecodeError, TypeError):
                    missing.append(row)
                    continue
            sections = md.get("sections", []) if isinstance(md, dict) else []
            if len(sections) < _MIN_SECTIONS:
                missing.append(row)
        return missing

    def get_group_key(self, item: dict) -> str:
        return (item.get("archetype") or "unknown").lower()

    def python_fallback(self, batch: list[dict], context: dict) -> list[dict]:
        results = []
        for item in batch:
            atmosphere_id = item["id"]
            md = item.get("music_definitions")

            if md is None:
                # Build a minimal base structure
                base_def = {
                    "bpm": 80,
                    "key": "minor",
                    "sections": [
                        {
                            "name": "main",
                            "duration_beats": 16,
                            "tracks": [
                                {
                                    "instrument": "bass",
                                    "notes": [
                                        {"frequency": 110, "duration": 0.5, "volume": 0.6},
                                        {"frequency": 123, "duration": 0.5, "volume": 0.6},
                                        {"frequency": 98,  "duration": 1.0, "volume": 0.5},
                                    ],
                                }
                            ],
                        }
                    ],
                }
            else:
                if isinstance(md, str):
                    try:
                        base_def = json.loads(md)
                    except (json.JSONDecodeError, TypeError):
                        base_def = {"sections": []}
                else:
                    base_def = md

            extended = _extend_music_definitions(base_def)

            results.append({
                "id": atmosphere_id,
                "music_definitions": json.dumps(extended),
            })
        return results

    def build_prompt(self, batch: list[dict], context: dict) -> str:
        lines = [
            f"  - id={r['id']} name=\"{r.get('name')}\" archetype=\"{r.get('archetype')}\""
            for r in batch
        ]
        return (
            "Extend music loop definitions for these atmospheres.\n"
            "Return JSON array with fields: id, music_definitions\n\n"
            + "\n".join(lines)
        )

    def validate(self, record: dict, db: DBClient) -> list[str]:
        errors: list[str] = []
        if not record.get("id"):
            errors.append("id is required")
        md = record.get("music_definitions")
        if md is None:
            errors.append("music_definitions is required")
        else:
            if isinstance(md, str):
                try:
                    parsed = json.loads(md)
                    if not isinstance(parsed, dict):
                        errors.append("music_definitions must be a JSON object")
                except (json.JSONDecodeError, TypeError):
                    errors.append("music_definitions is not valid JSON")
        return errors

    def _insert_results(self, db: DBClient, results: list[dict]) -> None:
        for record in results:
            db.update("atmospheres", {"music_definitions": record["music_definitions"]}, {"id": record["id"]})


if __name__ == "__main__":
    ExtendedMusicGenerator().run()
