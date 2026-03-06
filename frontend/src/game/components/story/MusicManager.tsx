/**
 * MusicManager — Web Audio API synthesis engine for Story Mode.
 *
 * Reads JSON music definitions from the atmosphere system and renders
 * them in real-time using OscillatorNode chains. Replaces the old
 * AudioPlayer/AudioPlayerCompact file-based player.
 *
 * Features:
 *  - Real-time 8-bit chiptune synthesis from JSON definitions
 *  - 4 music states: explore, combat, boss, mystery
 *  - 2s cross-fade between music states
 *  - 0.5s fade on atmosphere change (scene transition)
 *  - Tab visibility: suspend/resume AudioContext
 *  - Volume tied to GameContext audioSettings
 *  - Visual waveform indicator (CSS bars)
 */
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useGame } from '../../GameContext';
import { api } from '../../../api';
import './MusicManager.css';

// ── Types ───────────────────────────────────────────────────────────────────

type MusicState = 'explore' | 'combat' | 'boss' | 'mystery';

interface NoteEntry {
  note: string | null;
  beats: number;
}

interface VoiceDef {
  oscillator: OscillatorType;
  duty_cycle?: number;
  volume: number;
  sequence: NoteEntry[];
}

interface DrumsDef {
  enabled: boolean;
  pattern_length: number;
  kick: number[];
  snare: number[];
  hihat: number[];
}

interface EffectsDef {
  reverb?: number;
  filter_type?: BiquadFilterType;
  filter_freq?: number;
}

interface MusicDef {
  bpm: number;
  time_signature?: [number, number];
  key?: string;
  scale?: string;
  melody?: VoiceDef;
  bass?: VoiceDef;
  drums?: DrumsDef;
  effects?: EffectsDef;
}

interface AtmosphereData {
  atmosphere_id: number;
  archetype: string;
  name: string;
  music_definitions: Record<MusicState, MusicDef | null>;
  resolution_source: string;
}

export interface MusicManagerProps {
  musicState: MusicState;
  sceneId: number | null;
  bossEntityId?: number | null;
  /** Direct archetype lookup (e.g. 'training_grounds' for Idle Training). Overrides sceneId. */
  archetype?: string;
}

// ── Note Frequency Helper ───────────────────────────────────────────────────

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function noteToFreq(name: string): number {
  if (!name) return 0;
  let pitch: string;
  let octave: number;
  if (name.length === 2) {
    pitch = name[0];
    octave = parseInt(name[1]);
  } else if (name.length === 3) {
    pitch = name.substring(0, 2);
    octave = parseInt(name[2]);
  } else {
    return 0;
  }
  const semitone = NOTE_NAMES.indexOf(pitch);
  if (semitone < 0) return 0;
  const midi = (octave + 1) * 12 + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ── Cross-fade duration constants ───────────────────────────────────────────

const CROSSFADE_DURATION = 2.0;  // seconds for music state transition
const SCENE_FADE_DURATION = 0.5; // seconds for scene/atmosphere change

// ── Voice Scheduler ─────────────────────────────────────────────────────────

interface ScheduledVoice {
  oscillators: OscillatorNode[];
  gainNode: GainNode;
  filterNode?: BiquadFilterNode;
}

function scheduleVoice(
  ctx: AudioContext,
  dest: GainNode,
  voice: VoiceDef,
  bpm: number,
  startTime: number,
  effects?: EffectsDef,
): ScheduledVoice {
  const gainNode = ctx.createGain();
  gainNode.gain.value = voice.volume;

  let target: AudioNode = dest;

  // Optional filter
  let filterNode: BiquadFilterNode | undefined;
  if (effects?.filter_type && effects?.filter_freq) {
    filterNode = ctx.createBiquadFilter();
    filterNode.type = effects.filter_type;
    filterNode.frequency.value = effects.filter_freq;
    filterNode.connect(dest);
    target = filterNode;
  }

  gainNode.connect(target);

  const beatDuration = 60 / bpm / 4; // 1/16th note base unit
  const oscillators: OscillatorNode[] = [];

  // Calculate total loop length
  const totalBeats = voice.sequence.reduce((sum, n) => sum + n.beats, 0);
  const loopDuration = totalBeats * beatDuration;
  if (loopDuration <= 0) return { oscillators, gainNode, filterNode };

  // Schedule ~10 minutes worth of loops
  const targetDuration = 600;
  const loopCount = Math.ceil(targetDuration / loopDuration);

  for (let loop = 0; loop < loopCount; loop++) {
    let cursor = startTime + loop * loopDuration;
    for (const entry of voice.sequence) {
      const dur = entry.beats * beatDuration;
      if (entry.note) {
        const freq = noteToFreq(entry.note);
        if (freq > 0) {
          const osc = ctx.createOscillator();
          osc.type = voice.oscillator || 'square';
          osc.frequency.value = freq;

          // Per-note envelope
          const noteGain = ctx.createGain();
          noteGain.gain.setValueAtTime(0, cursor);
          noteGain.gain.linearRampToValueAtTime(1, cursor + 0.01);
          noteGain.gain.setValueAtTime(1, cursor + dur * 0.6);
          noteGain.gain.linearRampToValueAtTime(0, cursor + dur - 0.005);

          osc.connect(noteGain);
          noteGain.connect(gainNode);
          osc.start(cursor);
          osc.stop(cursor + dur);
          oscillators.push(osc);
        }
      }
      cursor += dur;
    }
  }

  return { oscillators, gainNode, filterNode };
}

// ── Drum Scheduler ──────────────────────────────────────────────────────────

function scheduleDrums(
  ctx: AudioContext,
  dest: GainNode,
  drums: DrumsDef,
  bpm: number,
  startTime: number,
): ScheduledVoice {
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0.4;
  gainNode.connect(dest);

  const oscillators: OscillatorNode[] = [];
  const stepDuration = 60 / bpm / 4;
  const patternDuration = drums.pattern_length * stepDuration;
  const targetDuration = 600;
  const loopCount = Math.ceil(targetDuration / patternDuration);

  for (let loop = 0; loop < loopCount; loop++) {
    for (let step = 0; step < drums.pattern_length; step++) {
      const t = startTime + loop * patternDuration + step * stepDuration;

      // Kick — low frequency sine with pitch drop
      if (drums.kick[step]) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.6, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.connect(env);
        env.connect(gainNode);
        osc.start(t);
        osc.stop(t + 0.1);
        oscillators.push(osc);
      }

      // Snare — noise burst via high-frequency oscillator
      if (drums.snare[step]) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 300;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.3, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.connect(env);
        env.connect(gainNode);
        osc.start(t);
        osc.stop(t + 0.08);
        oscillators.push(osc);
      }

      // Hihat — high-frequency square
      if (drums.hihat[step]) {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = 6000;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.08, t);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
        osc.connect(env);
        env.connect(gainNode);
        osc.start(t);
        osc.stop(t + 0.03);
        oscillators.push(osc);
      }
    }
  }

  return { oscillators, gainNode };
}

// ── Active Track — all scheduled nodes for one music state ──────────────────

interface ActiveTrack {
  masterGain: GainNode;
  voices: ScheduledVoice[];
}

function buildTrack(
  ctx: AudioContext,
  def: MusicDef,
  destination: AudioNode,
): ActiveTrack {
  const masterGain = ctx.createGain();
  masterGain.gain.value = 1.0;
  masterGain.connect(destination);

  const voices: ScheduledVoice[] = [];
  const startTime = ctx.currentTime + 0.05;

  if (def.melody) {
    voices.push(scheduleVoice(ctx, masterGain, def.melody, def.bpm, startTime, def.effects));
  }
  if (def.bass) {
    voices.push(scheduleVoice(ctx, masterGain, def.bass, def.bpm, startTime, def.effects));
  }
  if (def.drums?.enabled) {
    voices.push(scheduleDrums(ctx, masterGain, def.drums, def.bpm, startTime));
  }

  return { masterGain, voices };
}

function teardownTrack(track: ActiveTrack | null) {
  if (!track) return;
  for (const voice of track.voices) {
    for (const osc of voice.oscillators) {
      try { osc.stop(); } catch { /* already stopped */ }
      try { osc.disconnect(); } catch { /* ok */ }
    }
    try { voice.gainNode.disconnect(); } catch { /* ok */ }
    if (voice.filterNode) {
      try { voice.filterNode.disconnect(); } catch { /* ok */ }
    }
  }
  try { track.masterGain.disconnect(); } catch { /* ok */ }
}

// ── Placeholder fallback definition ─────────────────────────────────────────

const FALLBACK_DEF: MusicDef = {
  bpm: 100,
  melody: {
    oscillator: 'square',
    volume: 0.3,
    sequence: [
      { note: 'C4', beats: 4 }, { note: 'E4', beats: 4 },
      { note: 'G4', beats: 4 }, { note: 'C5', beats: 4 },
    ],
  },
  bass: {
    oscillator: 'triangle',
    volume: 0.2,
    sequence: [
      { note: 'C3', beats: 8 }, { note: 'G3', beats: 8 },
    ],
  },
};

// ── Component ───────────────────────────────────────────────────────────────

const MusicManager: React.FC<MusicManagerProps> = ({ musicState, sceneId, bossEntityId, archetype }) => {
  const { state } = useGame();
  const { audioSettings } = state;

  const ctxRef = useRef<AudioContext | null>(null);
  const currentTrackRef = useRef<ActiveTrack | null>(null);
  const atmosphereRef = useRef<AtmosphereData | null>(null);
  const currentStateRef = useRef<MusicState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const volumeGainRef = useRef<GainNode | null>(null);

  // Create AudioContext on mount (in suspended state per spec 1.1)
  useEffect(() => {
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const volumeGain = ctx.createGain();
    volumeGain.connect(ctx.destination);
    volumeGainRef.current = volumeGain;

    // Resume on first user click (spec 1.1)
    const resumeOnClick = () => {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          document.removeEventListener('click', resumeOnClick);
          document.removeEventListener('touchstart', resumeOnClick);
        });
      }
    };
    document.addEventListener('click', resumeOnClick);
    document.addEventListener('touchstart', resumeOnClick);

    return () => {
      document.removeEventListener('click', resumeOnClick);
      document.removeEventListener('touchstart', resumeOnClick);
      teardownTrack(currentTrackRef.current);
      currentTrackRef.current = null;
      ctx.close();
    };
  }, []);

  // Tab visibility handling (spec 1.2) — suspend/resume AudioContext
  useEffect(() => {
    const onVisibility = () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      if (document.hidden) {
        ctx.suspend();
      } else if (currentTrackRef.current) {
        ctx.resume();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Apply volume changes from audioSettings
  useEffect(() => {
    const gain = volumeGainRef.current;
    if (!gain) return;
    const effective = audioSettings.masterMuted
      ? 0
      : (audioSettings.masterVolume / 100) * (audioSettings.musicVolume / 100);
    gain.gain.setTargetAtTime(effective, gain.context.currentTime, 0.05);
  }, [audioSettings.masterVolume, audioSettings.musicVolume, audioSettings.masterMuted]);

  // Fetch atmosphere data when scene or archetype changes
  useEffect(() => {
    // Build query params: either archetype (direct lookup) or scene_id (hierarchy)
    const params = new URLSearchParams();
    if (archetype) {
      params.set('archetype', archetype);
    } else if (sceneId) {
      params.set('scene_id', String(sceneId));
      if (bossEntityId) params.set('boss_entity_id', String(bossEntityId));
    } else {
      return; // nothing to fetch
    }

    let cancelled = false;

    api.get(`/api/game/audio/atmosphere?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: AtmosphereData | null) => {
        if (cancelled || !data) return;
        const prev = atmosphereRef.current;
        atmosphereRef.current = data;

        // If atmosphere changed, do a quick fade and rebuild
        if (prev && prev.atmosphere_id !== data.atmosphere_id) {
          crossFadeToState(musicState, data, SCENE_FADE_DURATION);
        } else if (!prev) {
          // First load — just build
          crossFadeToState(musicState, data, 0.1);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [sceneId, bossEntityId, archetype]);

  // Handle music state changes (explore -> combat, etc.)
  const crossFadeToState = useCallback((
    newState: MusicState,
    atmo: AtmosphereData | null,
    fadeDuration: number,
  ) => {
    const ctx = ctxRef.current;
    const volumeGain = volumeGainRef.current;
    if (!ctx || !volumeGain) return;
    if (!atmo) return;

    const def = atmo.music_definitions?.[newState] || FALLBACK_DEF;
    const oldTrack = currentTrackRef.current;

    // Build new track
    const newTrack = buildTrack(ctx, def, volumeGain);
    currentTrackRef.current = newTrack;
    currentStateRef.current = newState;

    if (oldTrack && fadeDuration > 0.05) {
      // Cross-fade: fade out old, fade in new
      const now = ctx.currentTime;
      newTrack.masterGain.gain.setValueAtTime(0, now);
      newTrack.masterGain.gain.linearRampToValueAtTime(1, now + fadeDuration);
      oldTrack.masterGain.gain.setValueAtTime(oldTrack.masterGain.gain.value, now);
      oldTrack.masterGain.gain.linearRampToValueAtTime(0, now + fadeDuration);

      // Clean up old track after fade
      setTimeout(() => teardownTrack(oldTrack), fadeDuration * 1000 + 100);
    } else {
      // No fade — just tear down old
      teardownTrack(oldTrack);
    }

    setIsPlaying(true);

    // Ensure context is running
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }, []);

  // React to musicState prop changes
  useEffect(() => {
    if (currentStateRef.current === musicState) return;
    if (!atmosphereRef.current) return;
    crossFadeToState(musicState, atmosphereRef.current, CROSSFADE_DURATION);
  }, [musicState, crossFadeToState]);

  return (
    <div className="music-manager">
      <div className={`music-wave-mini ${isPlaying ? 'music-wave-mini--active' : ''}`}>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="music-wave-bar" style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
      <span className="music-state-label">
        {atmosphereRef.current?.name || 'Loading...'}
      </span>
    </div>
  );
};

export default MusicManager;
