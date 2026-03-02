"""
Generate 4 placeholder 8-bit chiptune tracks as WAV files.

Tracks:
  1. exploration.wav  — upbeat arpeggios, C major, ~120 BPM
  2. combat.wav       — driving rhythm, E minor, ~140 BPM
  3. mystery.wav      — slow atmospheric, A minor, ~80 BPM
  4. boss.wav         — intense tension, diminished, ~160 BPM

Output: frontend/public/music/*.wav  (22050 Hz, mono, 16-bit PCM)
Duration: ~300 seconds (5 minutes) each via seamless looping of shorter phrases.

NOTE: ffmpeg is needed to convert to MP3 for production bandwidth savings.
  ffmpeg -i exploration.wav -b:a 128k exploration.mp3
"""

import wave
import struct
import math
import os

SAMPLE_RATE = 22050
DURATION_SECONDS = 300   # 5 minutes
AMPLITUDE = 24000        # 16-bit range ≈ ±32767; keep below to avoid clipping

OUTPUT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "frontend", "public", "music"
)
os.makedirs(OUTPUT_DIR, exist_ok=True)


def note_freq(name: str) -> float:
    """Return frequency (Hz) for a note name like 'C4', 'E3', 'A#5'."""
    notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    if len(name) == 2:
        pitch, octave = name[0], int(name[1])
        semitone = notes.index(pitch)
    else:
        pitch, sharp, octave = name[0], name[1], int(name[2])
        semitone = notes.index(pitch + sharp)
    midi = (octave + 1) * 12 + semitone
    return 440.0 * math.pow(2.0, (midi - 69) / 12.0)


def square_wave(freq: float, t: float, duty: float = 0.5) -> float:
    """Square wave oscillator — classic 8-bit sound."""
    if freq <= 0:
        return 0.0
    period = 1.0 / freq
    phase = (t % period) / period
    return 1.0 if phase < duty else -1.0


def triangle_wave(freq: float, t: float) -> float:
    """Triangle wave — softer 8-bit bass sound."""
    if freq <= 0:
        return 0.0
    period = 1.0 / freq
    phase = (t % period) / period
    return 4.0 * abs(phase - 0.5) - 1.0


def noise_burst(t: float, seed: float) -> float:
    """Pseudo-random noise for percussion."""
    v = math.sin(t * 1234.567 + seed * 999.1)
    return math.sin(v * 43758.5453)


def envelope(t: float, attack: float, decay: float, sustain: float,
             release: float, total: float) -> float:
    """ADSR envelope."""
    if t < attack:
        return t / attack
    elif t < attack + decay:
        return 1.0 - (1.0 - sustain) * ((t - attack) / decay)
    elif t < total - release:
        return sustain
    elif t < total:
        return sustain * (1.0 - (t - (total - release)) / release)
    return 0.0


def generate_track(
    name: str,
    bpm: float,
    melody_notes: list,   # list of (note_name_or_None, beat_duration)
    bass_notes: list,     # list of (note_name_or_None, beat_duration)
    has_drums: bool = True,
    melody_octave_shift: int = 0,
) -> None:
    """Synthesise a chiptune track from note sequences and write to WAV."""
    total_samples = SAMPLE_RATE * DURATION_SECONDS
    samples = []

    beat_s = 60.0 / bpm
    step_s = beat_s / 4  # 1/16th note base unit

    # Pre-compute note frequency pools
    def freq_for(entry):
        note, beats = entry
        if note is None:
            return 0.0, beats
        return note_freq(note), beats

    melody_pool = [freq_for(e) for e in melody_notes]
    bass_pool = [freq_for(e) for e in bass_notes]

    def get_freq_at(pool: list, t_in_loop: float) -> float:
        total_loop = sum(beats * step_s for _, beats in [(0, b) for _, b in pool])
        if total_loop <= 0:
            return 0.0
        t_pos = t_in_loop % total_loop
        cursor = 0.0
        for freq, beats in pool:
            dur = beats * step_s
            if t_pos < cursor + dur:
                # Relative position within this note
                return freq
            cursor += dur
        return 0.0

    total_loop_s = sum(beats * step_s for _, beats in melody_pool)
    if total_loop_s <= 0:
        total_loop_s = 1.0

    t = 0.0
    dt = 1.0 / SAMPLE_RATE

    # Drum pattern (16-step): kick, snare, hihat
    drum_pattern_kick =  [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]
    drum_pattern_snare = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]
    drum_pattern_hat =   [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]

    for i in range(total_samples):
        t = i * dt
        t_in_loop = t % total_loop_s

        # Melody (square wave, high register)
        m_freq = get_freq_at(melody_pool, t_in_loop)
        if melody_octave_shift:
            m_freq *= (2 ** melody_octave_shift)

        # Note envelope within a step
        step_pos = t_in_loop % step_s
        m_env = envelope(step_pos, 0.01, 0.05, 0.6, 0.05, step_s)
        melody_sample = square_wave(m_freq, t) * m_env * 0.45 if m_freq > 0 else 0.0

        # Bass (triangle wave, lower)
        b_freq = get_freq_at(bass_pool, t_in_loop)
        b_step_pos = t_in_loop % (step_s * 4)  # bass moves in quarter notes
        b_env = envelope(b_step_pos, 0.02, 0.1, 0.5, 0.05, step_s * 4)
        bass_sample = triangle_wave(b_freq, t) * b_env * 0.35 if b_freq > 0 else 0.0

        # Drums
        drum_sample = 0.0
        if has_drums:
            step_idx = int((t / step_s) % 16)
            kick_on = drum_pattern_kick[step_idx]
            snare_on = drum_pattern_snare[step_idx]
            hat_on = drum_pattern_hat[step_idx]
            drum_t = (t % step_s)  # relative time within step
            drum_env = max(0.0, 1.0 - drum_t / (step_s * 0.5))
            if kick_on:
                # Kick: low freq sine with pitch drop
                kick_freq = 120 * math.exp(-drum_t * 30)
                drum_sample += math.sin(2 * math.pi * kick_freq * drum_t) * drum_env * 0.6
            if snare_on:
                drum_sample += noise_burst(drum_t, float(i)) * drum_env * 0.25
            if hat_on:
                hat_env = max(0.0, 1.0 - drum_t / (step_s * 0.15))
                drum_sample += noise_burst(drum_t * 8, float(i)) * hat_env * 0.1

        # Mix
        mixed = melody_sample + bass_sample + drum_sample
        # Soft clip
        mixed = math.tanh(mixed)
        sample_int = int(mixed * AMPLITUDE)
        sample_int = max(-32767, min(32767, sample_int))
        samples.append(sample_int)

    # Write WAV
    path = os.path.join(OUTPUT_DIR, f"{name}.wav")
    with wave.open(path, "w") as wf:
        wf.setnchannels(1)       # mono
        wf.setsampwidth(2)       # 16-bit
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(struct.pack(f"<{len(samples)}h", *samples))

    mb = os.path.getsize(path) / (1024 * 1024)
    print(f"  OK {name}.wav  ({mb:.1f} MB, {DURATION_SECONDS}s)")


def main():
    print(f"\nGenerating 8-bit placeholder tracks -> {OUTPUT_DIR}\n")

    # ── Track 1: Exploration ──────────────────────────────────────────────
    # C major pentatonic arpeggios, upbeat, 120 BPM
    print("Track 1: exploration (C major, 120 BPM, upbeat)")
    melody_exp = [
        ("C4", 2), ("E4", 2), ("G4", 2), ("C5", 4),
        ("G4", 2), ("E4", 2), ("C4", 4),
        ("D4", 2), ("F4", 2), ("A4", 2), ("D5", 4),
        ("A4", 2), ("G4", 4), ("E4", 2),
    ]
    bass_exp = [
        ("C3", 8), ("G3", 8),
        ("F3", 8), ("C3", 8),
    ]
    generate_track("exploration", 120, melody_exp, bass_exp, has_drums=True)

    # ── Track 2: Combat ───────────────────────────────────────────────────
    # E minor, driving, 140 BPM — power chord feel
    print("Track 2: combat (E minor, 140 BPM, driving)")
    melody_cbt = [
        ("E4", 2), ("G4", 2), ("B4", 2), ("E5", 2),
        ("B4", 2), ("G4", 2), ("E4", 4),
        ("D4", 2), ("F4", 2), ("A4", 2), ("D5", 2),
        ("C4", 2), ("E4", 2), ("G4", 4),
        ("E4", 1), ("E4", 1), ("G4", 2), ("B4", 2), ("E5", 2), ("D5", 2), ("B4", 2),
        ("E4", 8),
    ]
    bass_cbt = [
        ("E2", 4), ("E2", 4),
        ("D2", 4), ("C2", 4),
        ("B2", 4), ("G2", 4),
        ("A2", 4), ("E2", 4),
    ]
    generate_track("combat", 140, melody_cbt, bass_cbt, has_drums=True)

    # ── Track 3: Mystery ──────────────────────────────────────────────────
    # A minor, slow atmospheric, 80 BPM
    print("Track 3: mystery (A minor, 80 BPM, atmospheric)")
    melody_mys = [
        ("A4", 6), ("C5", 6), ("E5", 4),
        ("G4", 6), ("B4", 6), ("D5", 4),
        ("F4", 4), ("A4", 4), ("C5", 8),
        ("E4", 4), ("A4", 4), ("G4", 4), (None, 4),
    ]
    bass_mys = [
        ("A2", 16), ("E2", 16),
        ("F2", 16), ("C2", 16),
    ]
    generate_track("mystery", 80, melody_mys, bass_mys, has_drums=False)

    # ── Track 4: Boss ─────────────────────────────────────────────────────
    # Diminished / chromatic tension, 160 BPM, intense
    print("Track 4: boss (diminished, 160 BPM, intense)")
    melody_boss = [
        ("E4", 2), ("A#4", 2), ("E5", 2), ("A#5", 2),
        ("E5", 2), ("A#4", 2), ("E4", 4),
        ("D4", 2), ("G#4", 2), ("D5", 2), ("G#5", 2),
        ("D5", 2), ("G#4", 2), ("D4", 4),
        ("C4", 2), ("F#4", 2), ("C5", 2), ("F#5", 2),
        ("C5", 2), ("F#4", 2), ("C4", 2), (None, 2),
        ("E4", 1), ("F4", 1), ("F#4", 1), ("G4", 1),
        ("G#4", 1), ("A4", 1), ("A#4", 1), ("B4", 1),
    ]
    bass_boss = [
        ("E2", 4), ("A#2", 4),
        ("D2", 4), ("G#2", 4),
        ("C2", 4), ("F#2", 4),
        ("B2", 4), ("E2", 4),
    ]
    generate_track("boss", 160, melody_boss, bass_boss, has_drums=True)

    print("\nDone! To convert to MP3 for production bandwidth savings:")
    print("  ffmpeg -i exploration.wav -b:a 128k exploration.mp3")
    print("  (repeat for each track)\n")


if __name__ == "__main__":
    main()
