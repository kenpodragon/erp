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

# Ensure repo root is on sys.path so `tools.generators.lib` resolves
_REPO_ROOT = str(Path(__file__).resolve().parent.parent.parent)
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from tools.generators.lib.base_generator import BaseGenerator
from tools.generators.lib.db_client import DBClient

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
        """Ensure music_definitions is a JSON string."""
        md = record.get("music_definitions")
        if md is not None and not isinstance(md, str):
            record["music_definitions"] = json.dumps(md)
        return record

    def build_prompt(self, batch: list[dict], context: dict) -> str:
        lines = [
            f'  - id={r["id"]} name="{r.get("name")}" archetype="{r.get("archetype")}"'
            f' current_sections={len((r.get("music_definitions") or {{}}).get("sections", [])) if isinstance(r.get("music_definitions"), dict) else 0}'
            for r in batch
        ]
        atmos_block = "\n".join(lines)

        return f"""You are a composer for a dark-fantasy MMORPG called "Towers of Elysium". The game uses Web Audio API synthesis — generate music loop definitions using the note/frequency/duration format below.

Each atmosphere needs a COMPLETE music_definitions object with at least 4 sections: intro, main, variation, and outro. Each section must feel distinct — different instrument mix, note density, or emotional tone.

WEB AUDIO SYNTHESIS FORMAT:
{{
  "bpm": <60-120 integer>,
  "key": <"minor" | "major" | "dorian" | "phrygian">,
  "loop_point": 1,
  "extended": true,
  "sections": [
    {{
      "name": "intro",
      "duration_beats": <4-8>,
      "volume_envelope": {{"attack": 2.0, "sustain": 0.7, "release": 0.5}},
      "tracks": [
        {{
          "instrument": <"bass" | "pad" | "lead" | "percussion" | "arp">,
          "notes": [
            {{"frequency": <Hz float>, "duration": <beats float>, "volume": <0.0-1.0>}},
            ...
          ]
        }}
      ]
    }},
    ...
  ]
}}

ARCHETYPE → MUSICAL IDENTITY GUIDE:
- dungeon: Slow minor key, bass-heavy, sparse notes, tension-building drones. BPM 55-65. Instruments: bass, pad.
- combat: Fast phrygian mode, aggressive percussion, driving bass, rapid arp. BPM 110-120. Instruments: bass, percussion, arp.
- exploration: Dorian mode, melodic lead, flowing arp patterns, open feel. BPM 70-85. Instruments: lead, arp, pad.
- boss: Intense, orchestral-inspired, minor key with chromatic tension. BPM 100-115. All instruments.
- boss_chapter: Grand but ominous, driving rhythm with sweeping lead. BPM 95-110.
- boss_book: Epic finale energy, all sections at high intensity, climactic. BPM 105-120.
- training: Motivational but dark, medium tempo, repetitive groove. BPM 85-100. Instruments: bass, arp.
- ambient: Very slow, pad-only, almost no rhythm, atmospheric. BPM 50-60. Instruments: pad only.
- idle: Gentle minor loop, sparse notes, comfortable for long listening. BPM 65-75.
- settlement: Slightly warmer than dungeon, folk-influenced, minor but not oppressive. BPM 70-80.

FREQUENCY REFERENCE (common dark fantasy note frequencies in Hz):
A2=110, B2=123, C3=131, D3=147, E3=165, F3=175, G3=196,
A3=220, B3=247, C4=262, D4=294, E4=330, F4=349, G4=392,
A4=440, Bb4=466, C5=523, D5=587, E5=659

For minor chords, use: root, minor 3rd (root×1.189), 5th (root×1.498)
For tension: tritone = root×1.414

Atmospheres to extend:
{atmos_block}

For each atmosphere, return a JSON object with:
  id (integer),
  music_definitions (a JSON STRING — the complete music definition object with bpm, key, loop_point, extended=true, and sections array containing intro + main + variation + outro, each with 1-3 tracks and 4-12 notes per track)

Return a JSON array. No explanation. No markdown.
"""

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
