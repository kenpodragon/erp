/**
 * SFXEngine — Web Audio API sound effects synthesis engine.
 *
 * Singleton service that loads SFX preset definitions from the backend
 * and plays them on demand via short-lived OscillatorNode chains.
 *
 * Features:
 *  - JSON preset -> oscillator synthesis (single notes + sequential arpeggios)
 *  - Spatial panning via StereoPannerNode
 *  - Pitch variation per preset
 *  - 50ms throttle per config_key to prevent overlap artifacts
 *  - Volume tied to audioSettings (masterVolume * sfxVolume)
 */

import type { AudioSettings } from './components/AudioSettingsModal';

// ── Types ───────────────────────────────────────────────────────────────────

export interface SFXPresetStep {
  oscillator_type: OscillatorType;
  frequency_start: number;
  frequency_end: number;
  duration_ms: number;
  attack_ms?: number;
  decay_ms?: number;
  sustain_level?: number;
  release_ms?: number;
  noise_mix?: number;
  pitch_variation?: number;
  volume?: number;
}

export interface SFXConfig {
  config_key: string;
  category: string;
  display_name: string;
  preset_definition: SFXPresetStep | SFXPresetStep[];
  base_volume: number;
  pitch_variation: number;
  spatial_enabled: boolean;
}

export interface SFXPlayOptions {
  pan?: number; // -1.0 (left) to +1.0 (right)
}

// ── Throttle constant ───────────────────────────────────────────────────────

const THROTTLE_MS = 50;

// ── SFXEngine Class ─────────────────────────────────────────────────────────

export class SFXEngine {
  private ctx: AudioContext | null = null;
  private configs: Map<string, SFXConfig> = new Map();
  private lastPlayTimes: Map<string, number> = new Map();
  private audioSettings: AudioSettings = {
    masterVolume: 80,
    musicVolume: 80,
    sfxVolume: 80,
    masterMuted: false,
  };

  /** Initialize with preloaded configs (avoids needing api import here). */
  loadConfigs(configs: SFXConfig[]) {
    this.configs.clear();
    for (const c of configs) {
      this.configs.set(c.config_key, c);
    }
  }

  /** Update volume settings from GameContext. */
  updateSettings(settings: AudioSettings) {
    this.audioSettings = settings;
  }

  /** Get or create AudioContext (lazy — created on first play). */
  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  /** Calculate effective SFX volume (0-1). */
  private getEffectiveVolume(): number {
    if (this.audioSettings.masterMuted) return 0;
    return (this.audioSettings.masterVolume / 100) * (this.audioSettings.sfxVolume / 100);
  }

  /** Play an SFX by config_key. */
  play(configKey: string, options?: SFXPlayOptions) {
    const effectiveVolume = this.getEffectiveVolume();
    if (effectiveVolume <= 0) return;

    const config = this.configs.get(configKey);
    if (!config) return;

    // Throttle check
    const now = performance.now();
    const lastPlay = this.lastPlayTimes.get(configKey) || 0;
    if (now - lastPlay < THROTTLE_MS) return;
    this.lastPlayTimes.set(configKey, now);

    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const steps = Array.isArray(config.preset_definition)
      ? config.preset_definition
      : [config.preset_definition];

    const volume = effectiveVolume * config.base_volume;

    // Master gain for this SFX instance
    const masterGain = ctx.createGain();
    masterGain.gain.value = volume;

    // Spatial panning
    let destination: AudioNode = ctx.destination;
    if (config.spatial_enabled && options?.pan !== undefined) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, options.pan));
      panner.connect(ctx.destination);
      destination = panner;
    }
    masterGain.connect(destination);

    // Schedule each step sequentially
    let cursor = ctx.currentTime + 0.005;

    for (const step of steps) {
      const durationS = (step.duration_ms || 100) / 1000;
      const attackS = (step.attack_ms ?? 5) / 1000;
      const decayS = (step.decay_ms ?? 30) / 1000;
      const sustainLevel = step.sustain_level ?? 0.3;
      const releaseS = (step.release_ms ?? (durationS * 1000 - (step.attack_ms ?? 5) - (step.decay_ms ?? 30))) / 1000;

      // Pitch variation
      const pitchVar = step.pitch_variation ?? config.pitch_variation ?? 0;
      const pitchMult = pitchVar > 0 ? 1 + (Math.random() * 2 - 1) * pitchVar : 1;

      const freqStart = step.frequency_start * pitchMult;
      const freqEnd = step.frequency_end * pitchMult;

      // Create oscillator
      const osc = ctx.createOscillator();
      osc.type = step.oscillator_type || 'square';
      osc.frequency.setValueAtTime(freqStart, cursor);
      if (freqEnd !== freqStart) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(20, freqEnd), cursor + durationS
        );
      }

      // ADSR envelope
      const env = ctx.createGain();
      const stepVol = step.volume ?? 1.0;
      env.gain.setValueAtTime(0, cursor);
      env.gain.linearRampToValueAtTime(stepVol, cursor + attackS);
      env.gain.linearRampToValueAtTime(stepVol * sustainLevel, cursor + attackS + decayS);
      env.gain.setValueAtTime(stepVol * sustainLevel, cursor + durationS - releaseS);
      env.gain.linearRampToValueAtTime(0, cursor + durationS);

      osc.connect(env);
      env.connect(masterGain);
      osc.start(cursor);
      osc.stop(cursor + durationS + 0.01);

      // Noise mix (optional — simulated via high-freq oscillator)
      const noiseMix = step.noise_mix ?? 0;
      if (noiseMix > 0) {
        const noise = ctx.createOscillator();
        noise.type = 'sawtooth';
        noise.frequency.value = 8000 + Math.random() * 4000;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0, cursor);
        noiseGain.gain.linearRampToValueAtTime(noiseMix * stepVol, cursor + attackS);
        noiseGain.gain.linearRampToValueAtTime(0, cursor + durationS);
        noise.connect(noiseGain);
        noiseGain.connect(masterGain);
        noise.start(cursor);
        noise.stop(cursor + durationS + 0.01);
      }

      cursor += durationS;
    }
  }

  /** Clean up AudioContext. */
  destroy() {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.configs.clear();
    this.lastPlayTimes.clear();
  }
}

// ── Singleton instance ──────────────────────────────────────────────────────

let _instance: SFXEngine | null = null;

export function getSFXEngine(): SFXEngine {
  if (!_instance) {
    _instance = new SFXEngine();
  }
  return _instance;
}

export function destroySFXEngine() {
  if (_instance) {
    _instance.destroy();
    _instance = null;
  }
}
