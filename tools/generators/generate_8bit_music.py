"""
Generate 8-bit music JSON definitions for Web Audio API synthesis.

Outputs JSON definitions (not audio files) that the frontend MusicManager
renders in real-time via OscillatorNode chains.

Usage:
  python tools/generate_8bit_music.py --archetype "mundane_dread" --state explore --seed 42 --output json
  python tools/generate_8bit_music.py --archetype "occult_sanctum" --all-states --seed 100
  python tools/generate_8bit_music.py --list-archetypes
"""

import argparse
import json
import math
import random
import sys

# ---------------------------------------------------------------------------
# Archetype parameters
# ---------------------------------------------------------------------------

ARCHETYPES = {
    "mundane_dread": {
        "bpm_range": (90, 110), "key": "C", "scale": "major",
        "oscillator": "square", "bass_osc": "triangle",
        "drums": True, "character": "detuned, unsettling major",
    },
    "occult_sanctum": {
        "bpm_range": (70, 90), "key": "A", "scale": "minor",
        "oscillator": "square", "bass_osc": "triangle",
        "drums": False, "character": "minor arpeggios, slow builds",
    },
    "liminal_purgatory": {
        "bpm_range": (60, 80), "key": "E", "scale": "minor",
        "oscillator": "sine", "bass_osc": "sine",
        "drums": False, "character": "sparse, echoing pulses",
    },
    "body_horror_theatre": {
        "bpm_range": (100, 130), "key": "C", "scale": "chromatic",
        "oscillator": "sawtooth", "bass_osc": "square",
        "drums": True, "character": "chromatic runs, pitch-bending",
    },
    "ancient_sanctuary": {
        "bpm_range": (60, 80), "key": "D", "scale": "pentatonic",
        "oscillator": "triangle", "bass_osc": "triangle",
        "drums": False, "character": "warm, pentatonic, peaceful",
    },
    "cosmic_archive": {
        "bpm_range": (100, 120), "key": "F", "scale": "lydian",
        "oscillator": "square", "bass_osc": "triangle",
        "drums": True, "character": "layered arpeggios, shimmering",
    },
    "tech_utopia": {
        "bpm_range": (110, 130), "key": "G", "scale": "major",
        "oscillator": "square", "bass_osc": "square",
        "drums": True, "character": "clean pulses, major-key, sci-fi",
    },
    "alien_frontier": {
        "bpm_range": (90, 110), "key": "Eb", "scale": "whole_tone",
        "oscillator": "square", "bass_osc": "triangle",
        "drums": True, "character": "unusual scales, three-beat",
    },
    "void_abyss": {
        "bpm_range": (50, 70), "key": "C", "scale": "chromatic",
        "oscillator": "sawtooth", "bass_osc": "sawtooth",
        "drums": False, "character": "sub-bass drones, descending",
    },
    "domestic_trauma": {
        "bpm_range": (70, 90), "key": "F", "scale": "minor",
        "oscillator": "square", "bass_osc": "triangle",
        "drums": True, "character": "distorted lullaby, irregular",
    },
    "glitch_reality": {
        "bpm_range": (120, 150), "key": "D", "scale": "chromatic",
        "oscillator": "square", "bass_osc": "square",
        "drums": True, "character": "bit-crushed, stutter, random",
    },
    "conspiracy_bunker": {
        "bpm_range": (100, 120), "key": "B", "scale": "minor",
        "oscillator": "square", "bass_osc": "triangle",
        "drums": True, "character": "nervous staccato, paranoid",
    },
    "training_grounds": {
        "bpm_range": (110, 130), "key": "A", "scale": "minor",
        "oscillator": "square", "bass_osc": "triangle",
        "drums": True, "character": "steady, focused, metronomic",
    },
}

# ---------------------------------------------------------------------------
# Scale definitions (semitone intervals from root)
# ---------------------------------------------------------------------------

SCALES = {
    "major":      [0, 2, 4, 5, 7, 9, 11],
    "minor":      [0, 2, 3, 5, 7, 8, 10],
    "pentatonic": [0, 2, 4, 7, 9],
    "chromatic":  list(range(12)),
    "lydian":     [0, 2, 4, 6, 7, 9, 11],
    "whole_tone": [0, 2, 4, 6, 8, 10],
}

NOTE_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"]

def key_to_semitone(key: str) -> int:
    aliases = {"Db": "C#", "D#": "Eb", "Gb": "F#", "Ab": "G#", "A#": "Bb"}
    k = aliases.get(key, key)
    return NOTE_NAMES.index(k)


def build_note_pool(key: str, scale_name: str, octave: int, count: int, rng: random.Random) -> list:
    """Build a pool of note names in the given key/scale/octave range."""
    root = key_to_semitone(key)
    intervals = SCALES.get(scale_name, SCALES["minor"])
    notes = []
    for oct in range(octave, octave + 2):
        for interval in intervals:
            semitone = (root + interval) % 12
            note_name = NOTE_NAMES[semitone]
            notes.append(f"{note_name}{oct}")
    return notes[:count] if count else notes


def generate_sequence(notes: list, length: int, rng: random.Random, rest_chance: float = 0.1) -> list:
    """Generate a random note sequence."""
    seq = []
    beat_options = [1, 2, 2, 4, 4, 4, 8]
    total_beats = 0
    while total_beats < length:
        beats = rng.choice(beat_options)
        if total_beats + beats > length:
            beats = length - total_beats
        if rng.random() < rest_chance:
            seq.append({"note": None, "beats": beats})
        else:
            seq.append({"note": rng.choice(notes), "beats": beats})
        total_beats += beats
    return seq


def generate_drum_pattern(rng: random.Random, density: float = 0.5) -> dict:
    """Generate a random 16-step drum pattern."""
    length = 16
    kick = [0] * length
    snare = [0] * length
    hihat = [0] * length

    # Kick on beats 1 and 3 (indices 0, 8)
    kick[0] = 1
    kick[8] = 1
    for i in range(length):
        if rng.random() < density * 0.3:
            kick[i] = 1

    # Snare on beats 2 and 4 (indices 4, 12)
    snare[4] = 1
    snare[12] = 1
    for i in range(length):
        if rng.random() < density * 0.15:
            snare[i] = 1

    # Hi-hat
    for i in range(length):
        hihat[i] = 1 if rng.random() < density else 0

    return {
        "enabled": True,
        "pattern_length": length,
        "kick": kick,
        "snare": snare,
        "hihat": hihat,
    }


def generate_state(archetype_params: dict, state: str, seed: int) -> dict:
    """Generate a music definition for a single state."""
    rng = random.Random(seed)

    bpm_low, bpm_high = archetype_params["bpm_range"]
    base_bpm = rng.randint(bpm_low, bpm_high)
    key = archetype_params["key"]
    scale = archetype_params["scale"]

    # State modifiers
    if state == "combat":
        base_bpm = int(base_bpm * 1.3)
    elif state == "boss":
        base_bpm = int(base_bpm * 1.5)
    elif state == "mystery":
        base_bpm = int(base_bpm * 0.7)

    melody_octave = 4
    bass_octave = 2
    melody_length = 32
    bass_length = 16

    melody_notes = build_note_pool(key, scale, melody_octave, 12, rng)
    bass_notes = build_note_pool(key, scale, bass_octave, 6, rng)

    rest_chance = 0.05 if state == "combat" else 0.15 if state == "mystery" else 0.1

    definition = {
        "bpm": base_bpm,
        "time_signature": [4, 4],
        "key": key,
        "scale": scale,
        "melody": {
            "oscillator": archetype_params["oscillator"],
            "volume": 0.35 if state == "mystery" else 0.4,
            "sequence": generate_sequence(melody_notes, melody_length, rng, rest_chance),
        },
        "bass": {
            "oscillator": archetype_params["bass_osc"],
            "volume": 0.25 if state == "mystery" else 0.3,
            "sequence": generate_sequence(bass_notes, bass_length, rng, 0.05),
        },
    }

    # Drums
    use_drums = archetype_params["drums"]
    if state == "mystery":
        use_drums = False
    elif state == "combat" or state == "boss":
        use_drums = True

    if use_drums:
        density = 0.4 if state == "explore" else 0.6 if state == "combat" else 0.7
        definition["drums"] = generate_drum_pattern(rng, density)

    # Effects
    definition["effects"] = {
        "reverb": 0.3 if state == "mystery" else 0.15,
        "filter_type": "lowpass",
        "filter_freq": 1500 if state == "mystery" else 3000,
    }

    return definition


def generate_all_states(archetype_name: str, seed: int) -> dict:
    """Generate all 4 music states for an archetype."""
    params = ARCHETYPES[archetype_name]
    return {
        "explore": generate_state(params, "explore", seed),
        "combat": generate_state(params, "combat", seed + 1000),
        "boss": generate_state(params, "boss", seed + 2000),
        "mystery": generate_state(params, "mystery", seed + 3000),
    }


def main():
    parser = argparse.ArgumentParser(description="Generate 8-bit music JSON definitions")
    parser.add_argument("--archetype", type=str, help="Archetype name")
    parser.add_argument("--state", type=str, choices=["explore", "combat", "boss", "mystery"],
                        help="Music state to generate")
    parser.add_argument("--all-states", action="store_true", help="Generate all 4 states")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for deterministic output")
    parser.add_argument("--output", type=str, choices=["json", "pretty"], default="pretty",
                        help="Output format")
    parser.add_argument("--list-archetypes", action="store_true", help="List available archetypes")
    parser.add_argument("--file", type=str, help="Write output to file instead of stdout")

    args = parser.parse_args()

    if args.list_archetypes:
        for name, params in ARCHETYPES.items():
            bpm = f"{params['bpm_range'][0]}-{params['bpm_range'][1]}"
            print(f"  {name:25s}  BPM: {bpm:8s}  Key: {params['key']:3s}  Scale: {params['scale']:12s}  {params['character']}")
        return

    if not args.archetype:
        parser.error("--archetype is required (use --list-archetypes to see options)")

    archetype = args.archetype.lower().replace(" ", "_")
    if archetype not in ARCHETYPES:
        parser.error(f"Unknown archetype '{archetype}'. Use --list-archetypes to see options.")

    if args.all_states:
        result = generate_all_states(archetype, args.seed)
    elif args.state:
        result = generate_state(ARCHETYPES[archetype], args.state, args.seed)
    else:
        result = generate_all_states(archetype, args.seed)

    indent = 2 if args.output == "pretty" else None
    output = json.dumps(result, indent=indent)

    if args.file:
        with open(args.file, "w") as f:
            f.write(output)
        print(f"Written to {args.file}")
    else:
        print(output)


if __name__ == "__main__":
    main()
