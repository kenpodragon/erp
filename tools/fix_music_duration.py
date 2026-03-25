"""Extend all music track variants under 180s to >= 180s each."""
import os, json, sys, random
from dotenv import load_dotenv
load_dotenv('backend/.env')
import psycopg2

url = os.getenv('DATABASE_URL').replace('host.docker.internal', 'localhost') + '?sslmode=disable'
conn = psycopg2.connect(url)
cur = conn.cursor()

# Section templates per mood
MOOD_SECTIONS = {
    'boss': {
        'names': ['buildup', 'climax', 'tension', 'assault', 'onslaught', 'devastation', 'wrath', 'annihilation'],
        'intensity_range': (0.7, 1.0),
        'instruments': ['bass_synth', 'lead_synth', 'drum_kit', 'power_pad'],
    },
    'combat': {
        'names': ['skirmish', 'clash', 'rally', 'pursuit', 'charge', 'barrage', 'offensive', 'blitz'],
        'intensity_range': (0.5, 0.85),
        'instruments': ['bass_synth', 'lead_synth', 'drum_kit', 'rhythm_synth'],
    },
    'explore': {
        'names': ['wander', 'discovery', 'reflection', 'vista', 'horizon', 'meadow', 'pathway', 'solitude'],
        'intensity_range': (0.15, 0.5),
        'instruments': ['pad_synth', 'bell_synth', 'ambient_pad', 'soft_lead'],
    },
    'mystery': {
        'names': ['whisper', 'revelation', 'shadows', 'enigma', 'riddle', 'veil', 'omen', 'cipher'],
        'intensity_range': (0.3, 0.65),
        'instruments': ['pad_synth', 'bell_synth', 'ambient_pad', 'whisper_synth'],
    },
}

# Note pools per scale
SCALE_NOTES = {
    'minor': {
        'C': ['C3','D3','Eb3','F3','G3','Ab3','Bb3','C4','D4','Eb4','F4','G4','Ab4','Bb4','C5'],
        'D': ['D3','E3','F3','G3','A3','Bb3','C4','D4','E4','F4','G4','A4','Bb4','C5','D5'],
        'E': ['E3','F#3','G3','A3','B3','C4','D4','E4','F#4','G4','A4','B4','C5','D5','E5'],
        'F': ['F3','G3','Ab3','Bb3','C4','Db4','Eb4','F4','G4','Ab4','Bb4','C5','Db5','Eb5','F5'],
        'G': ['G3','A3','Bb3','C4','D4','Eb4','F4','G4','A4','Bb4','C5','D5','Eb5','F5','G5'],
        'A': ['A3','B3','C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','F5','G5','A5'],
        'B': ['B3','C#4','D4','E4','F#4','G4','A4','B4','C#5','D5','E5','F#5','G5','A5','B5'],
    },
    'major': {
        'C': ['C3','D3','E3','F3','G3','A3','B3','C4','D4','E4','F4','G4','A4','B4','C5'],
        'D': ['D3','E3','F#3','G3','A3','B3','C#4','D4','E4','F#4','G4','A4','B4','C#5','D5'],
        'E': ['E3','F#3','G#3','A3','B3','C#4','D#4','E4','F#4','G#4','A4','B4','C#5','D#5','E5'],
        'F': ['F3','G3','A3','Bb3','C4','D4','E4','F4','G4','A4','Bb4','C5','D5','E5','F5'],
        'G': ['G3','A3','B3','C4','D4','E4','F#4','G4','A4','B4','C5','D5','E5','F#5','G5'],
        'A': ['A3','B3','C#4','D4','E4','F#4','G#4','A4','B4','C#5','D5','E5','F#5','G#5','A5'],
        'B': ['B3','C#4','D#4','E4','F#4','G#4','A#4','B4','C#5','D#5','E5','F#5','G#5','A#5','B5'],
    },
    'dorian': {
        'C': ['C3','D3','Eb3','F3','G3','A3','Bb3','C4','D4','Eb4','F4','G4','A4','Bb4','C5'],
        'D': ['D3','E3','F3','G3','A3','B3','C4','D4','E4','F4','G4','A4','B4','C5','D5'],
        'E': ['E3','F#3','G3','A3','B3','C#4','D4','E4','F#4','G4','A4','B4','C#5','D5','E5'],
    },
    'phrygian': {
        'C': ['C3','Db3','Eb3','F3','G3','Ab3','Bb3','C4','Db4','Eb4','F4','G4','Ab4','Bb4','C5'],
        'E': ['E3','F3','G3','A3','B3','C4','D4','E4','F4','G4','A4','B4','C5','D5','E5'],
    },
    'mixolydian': {
        'G': ['G3','A3','B3','C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','F5','G5'],
    },
    'pentatonic': {
        'C': ['C3','D3','E3','G3','A3','C4','D4','E4','G4','A4','C5','D5','E5','G5','A5'],
        'A': ['A3','C4','D4','E4','G4','A4','C5','D5','E5','G5','A5','C6','D6','E6','G6'],
    },
}

def get_notes_for(key, scale):
    """Get note pool, falling back to closest match."""
    if scale in SCALE_NOTES and key in SCALE_NOTES[scale]:
        return SCALE_NOTES[scale][key]
    # Fallback: try minor
    if key in SCALE_NOTES.get('minor', {}):
        return SCALE_NOTES['minor'][key]
    # Ultimate fallback: C minor
    return SCALE_NOTES['minor']['C']

def generate_sequence_notes(notes_pool, start_time, duration_seconds, bpm, mood, intensity):
    """Generate sequence notes for a time range."""
    new_notes = []
    beat_dur = 60.0 / bpm

    # Determine note density based on mood
    if mood == 'boss':
        notes_per_beat = random.uniform(1.5, 3.0)
    elif mood == 'combat':
        notes_per_beat = random.uniform(1.0, 2.5)
    elif mood == 'explore':
        notes_per_beat = random.uniform(0.3, 1.0)
    else:  # mystery
        notes_per_beat = random.uniform(0.5, 1.5)

    time_step = beat_dur / notes_per_beat
    t = start_time
    end_time = start_time + duration_seconds

    while t < end_time:
        note = random.choice(notes_pool)
        dur_choices = [0.25, 0.5, 0.75, 1.0] if mood in ('boss', 'combat') else [0.5, 1.0, 1.5, 2.0]
        dur = random.choice(dur_choices)
        vel = random.uniform(intensity * 0.6, min(1.0, intensity * 1.2))
        vel = round(min(1.0, max(0.1, vel)), 2)

        new_notes.append({
            "note": note,
            "duration": dur,
            "velocity": vel,
            "time": round(t, 3)
        })
        t += time_step + random.uniform(-0.05, 0.1)

    return new_notes

def fix_variant(variant, mood):
    """Fix a single mood variant to be >= 180s. Returns True if modified."""
    if not variant or not isinstance(variant, dict):
        return False

    bpm = variant.get('bpm', 120)
    sections = variant.get('sections', [])
    sequence = variant.get('sequence', [])
    key = variant.get('generator_key', 'C')
    scale = variant.get('generator_scale', 'minor')

    total_beats = sum(s.get('duration_beats', 0) for s in sections)
    current_dur = total_beats * (60.0 / bpm)

    if current_dur >= 180:
        return False

    # Calculate how many beats we need to add
    deficit_seconds = 180 - current_dur
    beats_needed = deficit_seconds * (bpm / 60.0) + 8  # 8 beat buffer

    template = MOOD_SECTIONS[mood]
    notes_pool = get_notes_for(key, scale)

    # Find max existing time in sequence
    max_time = 0
    if sequence:
        max_time = max(n.get('time', 0) + n.get('duration', 0) for n in sequence)
    # Also use section-based time as fallback
    section_end_time = current_dur
    start_time = max(max_time, section_end_time)

    section_idx = 0
    beats_added = 0

    while beats_added < beats_needed:
        section_name = template['names'][section_idx % len(template['names'])]
        # Vary section length
        section_beats = random.choice([32, 48, 64])
        if beats_needed - beats_added < 40:
            section_beats = int(beats_needed - beats_added) + 8

        lo, hi = template['intensity_range']
        intensity = round(random.uniform(lo, hi), 2)

        # Pick 2-3 instruments from template
        n_inst = random.randint(2, min(3, len(template['instruments'])))
        instruments = random.sample(template['instruments'], n_inst)

        new_section = {
            "name": f"{section_name}_{section_idx + 1}",
            "duration_beats": section_beats,
            "intensity": intensity,
            "instruments": instruments,
        }
        sections.append(new_section)

        # Generate sequence notes for this section
        section_dur_seconds = section_beats * (60.0 / bpm)
        new_notes = generate_sequence_notes(notes_pool, start_time, section_dur_seconds, bpm, mood, intensity)
        sequence.extend(new_notes)

        start_time += section_dur_seconds
        beats_added += section_beats
        section_idx += 1

    variant['sections'] = sections
    variant['sequence'] = sorted(sequence, key=lambda n: n.get('time', 0))
    return True

# Main execution
random.seed(42)  # Reproducible

cur.execute('SELECT name, music_definitions FROM atmospheres ORDER BY name;')
rows = cur.fetchall()

fixed_count = 0
total_variants = 0

for name, md in rows:
    if not md:
        continue
    if isinstance(md, str):
        md = json.loads(md)

    modified = False
    for mood in ['boss', 'combat', 'explore', 'mystery']:
        variant = md.get(mood)
        if variant:
            total_variants += 1
            if fix_variant(variant, mood):
                modified = True
                fixed_count += 1

    if modified:
        cur.execute('UPDATE atmospheres SET music_definitions = %s::jsonb WHERE name = %s;',
                    (json.dumps(md), name))

conn.commit()
print(f'Fixed {fixed_count} variants out of {total_variants} total')

# Verification
print('\n--- VERIFICATION ---')
cur.execute('SELECT name, music_definitions FROM atmospheres ORDER BY name;')
fail_count = 0
for r in cur.fetchall():
    md = r[1] if isinstance(r[1], dict) else json.loads(r[1])
    for mood in ['boss', 'combat', 'explore', 'mystery']:
        v = md.get(mood, {})
        if not v:
            continue
        bpm = v.get('bpm', 120)
        total_beats = sum(s.get('duration_beats', 0) for s in v.get('sections', []))
        dur = total_beats * (60.0 / bpm)
        if dur < 180:
            print(f'STILL FAILING: {r[0]}/{mood} = {dur:.0f}s')
            fail_count += 1

if fail_count == 0:
    print('ALL VARIANTS >= 180s. DONE.')
else:
    print(f'{fail_count} variants still failing!')

cur.close()
conn.close()
