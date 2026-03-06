"""
Generate 8-bit SFX preset JSON definitions for the Web Audio API SFXEngine.

Each category has parameterized variations generated with different seeds.
Output is JSON that maps directly to the audio_configs.preset_definition column.

Usage:
  python tools/generate_8bit_sfx.py --category hit --variations 5
  python tools/generate_8bit_sfx.py --category all --output json
  python tools/generate_8bit_sfx.py --list-categories
"""

import argparse
import json
import random

# ---------------------------------------------------------------------------
# SFX Category Templates
# ---------------------------------------------------------------------------

CATEGORIES = {
    "hit": {
        "description": "Player click / attack hit",
        "template": {
            "oscillator_type": "square",
            "frequency_start": (400, 800),
            "frequency_end": (200, 500),
            "duration_ms": (60, 120),
            "attack_ms": (1, 5),
            "decay_ms": (20, 50),
            "sustain_level": (0.1, 0.3),
            "release_ms": (30, 60),
            "noise_mix": (0.0, 0.1),
        },
    },
    "crit": {
        "description": "Critical hit",
        "template": {
            "oscillator_type": "square",
            "frequency_start": (900, 1400),
            "frequency_end": (400, 700),
            "duration_ms": (100, 200),
            "attack_ms": (1, 3),
            "decay_ms": (30, 60),
            "sustain_level": (0.2, 0.4),
            "release_ms": (50, 100),
            "noise_mix": (0.05, 0.2),
        },
    },
    "death": {
        "description": "Enemy death",
        "template": {
            "oscillator_type": "sawtooth",
            "frequency_start": (600, 1000),
            "frequency_end": (80, 200),
            "duration_ms": (150, 300),
            "attack_ms": (1, 5),
            "decay_ms": (40, 80),
            "sustain_level": (0.2, 0.4),
            "release_ms": (60, 150),
            "noise_mix": (0.1, 0.3),
        },
    },
    "powerup": {
        "description": "Level up / power gain",
        "is_arpeggio": True,
        "steps": 3,
        "step_template": {
            "oscillator_type": "square",
            "frequency_start": (300, 500),
            "frequency_end_same": True,
            "duration_ms": (80, 120),
            "attack_ms": (2, 5),
            "decay_ms": (20, 40),
            "sustain_level": (0.3, 0.5),
            "release_ms": (30, 50),
        },
        "pitch_step": (1.25, 1.5),
    },
    "blip": {
        "description": "UI click / navigation",
        "template": {
            "oscillator_type": "square",
            "frequency_start": (800, 1200),
            "frequency_end": (600, 1000),
            "duration_ms": (30, 60),
            "attack_ms": (1, 2),
            "decay_ms": (10, 20),
            "sustain_level": (0.1, 0.2),
            "release_ms": (15, 30),
            "noise_mix": (0.0, 0.0),
        },
    },
    "fanfare": {
        "description": "Achievement / boss defeat",
        "is_arpeggio": True,
        "steps": 4,
        "step_template": {
            "oscillator_type": "square",
            "frequency_start": (400, 600),
            "frequency_end_same": True,
            "duration_ms": (100, 150),
            "attack_ms": (3, 8),
            "decay_ms": (30, 50),
            "sustain_level": (0.4, 0.6),
            "release_ms": (40, 80),
        },
        "pitch_step": (1.15, 1.35),
    },
    "drop": {
        "description": "Item drop",
        "template": {
            "oscillator_type": "triangle",
            "frequency_start": (1000, 1500),
            "frequency_end": (500, 800),
            "duration_ms": (100, 180),
            "attack_ms": (2, 5),
            "decay_ms": (30, 50),
            "sustain_level": (0.2, 0.4),
            "release_ms": (40, 80),
            "noise_mix": (0.0, 0.05),
        },
    },
    "error": {
        "description": "Error / fail sound",
        "template": {
            "oscillator_type": "sawtooth",
            "frequency_start": (200, 400),
            "frequency_end": (100, 200),
            "duration_ms": (150, 250),
            "attack_ms": (2, 5),
            "decay_ms": (40, 70),
            "sustain_level": (0.3, 0.5),
            "release_ms": (50, 100),
            "noise_mix": (0.1, 0.2),
        },
    },
}


def rand_range(rng: random.Random, lo: float, hi: float) -> float:
    return round(rng.uniform(lo, hi), 2)


def rand_int_range(rng: random.Random, lo: int, hi: int) -> int:
    return rng.randint(lo, hi)


def generate_preset(category_name: str, seed: int) -> dict:
    """Generate a single SFX preset definition."""
    cat = CATEGORIES[category_name]
    rng = random.Random(seed)

    if cat.get("is_arpeggio"):
        steps = []
        tmpl = cat["step_template"]
        base_freq = rand_range(rng, *tmpl["frequency_start"])
        pitch_mult = rand_range(rng, *cat["pitch_step"])

        for i in range(cat["steps"]):
            freq = round(base_freq * (pitch_mult ** i))
            step = {
                "oscillator_type": tmpl["oscillator_type"],
                "frequency_start": freq,
                "frequency_end": freq,
                "duration_ms": rand_int_range(rng, *tmpl["duration_ms"]),
                "attack_ms": rand_int_range(rng, *tmpl["attack_ms"]),
                "decay_ms": rand_int_range(rng, *tmpl["decay_ms"]),
                "sustain_level": rand_range(rng, *tmpl["sustain_level"]),
                "release_ms": rand_int_range(rng, *tmpl["release_ms"]),
            }
            steps.append(step)
        return steps
    else:
        tmpl = cat["template"]
        preset = {
            "oscillator_type": tmpl["oscillator_type"],
            "frequency_start": rand_int_range(rng, *tmpl["frequency_start"]),
            "frequency_end": rand_int_range(rng, *tmpl["frequency_end"]),
            "duration_ms": rand_int_range(rng, *tmpl["duration_ms"]),
            "attack_ms": rand_int_range(rng, *tmpl["attack_ms"]),
            "decay_ms": rand_int_range(rng, *tmpl["decay_ms"]),
            "sustain_level": rand_range(rng, *tmpl["sustain_level"]),
            "release_ms": rand_int_range(rng, *tmpl["release_ms"]),
        }
        if "noise_mix" in tmpl:
            preset["noise_mix"] = rand_range(rng, *tmpl["noise_mix"])
        return preset


def main():
    parser = argparse.ArgumentParser(description="Generate 8-bit SFX preset JSON definitions")
    parser.add_argument("--category", type=str, help="SFX category (or 'all')")
    parser.add_argument("--variations", type=int, default=3, help="Number of variations per category")
    parser.add_argument("--seed", type=int, default=42, help="Base random seed")
    parser.add_argument("--output", type=str, choices=["json", "pretty"], default="pretty")
    parser.add_argument("--list-categories", action="store_true")
    parser.add_argument("--file", type=str, help="Write output to file")

    args = parser.parse_args()

    if args.list_categories:
        for name, cat in CATEGORIES.items():
            arp = " (arpeggio)" if cat.get("is_arpeggio") else ""
            print(f"  {name:12s}  {cat['description']}{arp}")
        return

    if not args.category:
        parser.error("--category required (use --list-categories or 'all')")

    categories = list(CATEGORIES.keys()) if args.category == "all" else [args.category]

    for cat_name in categories:
        if cat_name not in CATEGORIES:
            print(f"Unknown category: {cat_name}", file=__import__("sys").stderr)
            continue

    results = {}
    for cat_name in categories:
        if cat_name not in CATEGORIES:
            continue
        variations = []
        for i in range(args.variations):
            preset = generate_preset(cat_name, args.seed + i * 100)
            variations.append(preset)
        results[cat_name] = variations

    indent = 2 if args.output == "pretty" else None
    output = json.dumps(results, indent=indent)

    if args.file:
        with open(args.file, "w") as f:
            f.write(output)
        print(f"Written to {args.file}")
    else:
        print(output)


if __name__ == "__main__":
    main()
