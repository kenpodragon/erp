import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SFXEngine, getSFXEngine, destroySFXEngine, type SFXConfig } from './SFXEngine';

// ── Mock Web Audio API ──────────────────────────────────────────────────────

const mockOscillator = {
  type: 'square' as OscillatorType,
  frequency: { value: 440, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
};

const mockGainNode = {
  gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
  connect: vi.fn(),
};

const mockPanner = {
  pan: { value: 0 },
  connect: vi.fn(),
};

const mockAudioContext = {
  state: 'running' as AudioContextState,
  currentTime: 0,
  destination: {},
  createOscillator: vi.fn(() => ({ ...mockOscillator })),
  createGain: vi.fn(() => ({ ...mockGainNode })),
  createStereoPanner: vi.fn(() => ({ ...mockPanner })),
  resume: vi.fn(() => Promise.resolve()),
  close: vi.fn(() => Promise.resolve()),
};

(globalThis as any).AudioContext = vi.fn(() => ({ ...mockAudioContext }));

// ── Test data ───────────────────────────────────────────────────────────────

const MOCK_CONFIGS: SFXConfig[] = [
  {
    config_key: 'sfx_click',
    category: 'combat',
    display_name: 'Player Click',
    preset_definition: {
      oscillator_type: 'square',
      frequency_start: 660,
      frequency_end: 440,
      duration_ms: 80,
      attack_ms: 2,
      decay_ms: 30,
      sustain_level: 0.2,
      release_ms: 48,
      noise_mix: 0.05,
    },
    base_volume: 0.6,
    pitch_variation: 0.08,
    spatial_enabled: true,
  },
  {
    config_key: 'sfx_crit',
    category: 'combat',
    display_name: 'Critical Hit',
    preset_definition: {
      oscillator_type: 'square',
      frequency_start: 1200,
      frequency_end: 600,
      duration_ms: 150,
    },
    base_volume: 0.8,
    pitch_variation: 0.05,
    spatial_enabled: true,
  },
  {
    config_key: 'sfx_skill_activate',
    category: 'combat',
    display_name: 'Skill Activation',
    preset_definition: [
      { oscillator_type: 'square', frequency_start: 440, frequency_end: 440, duration_ms: 60 },
      { oscillator_type: 'square', frequency_start: 554, frequency_end: 554, duration_ms: 60 },
      { oscillator_type: 'square', frequency_start: 660, frequency_end: 660, duration_ms: 80 },
    ],
    base_volume: 0.7,
    pitch_variation: 0.0,
    spatial_enabled: false,
  },
];

// ── Tests ───────────────────────────────────────────────────────────────────

describe('SFXEngine', () => {
  let engine: SFXEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new SFXEngine();
    engine.loadConfigs(MOCK_CONFIGS);
    engine.updateSettings({
      masterVolume: 80,
      musicVolume: 80,
      sfxVolume: 80,
      masterMuted: false,
    });
  });

  afterEach(() => {
    engine.destroy();
  });

  it('loads SFX configs', () => {
    // Engine should have 3 configs loaded
    // We can verify by playing a valid key (it should create an AudioContext)
    engine.play('sfx_click');
    expect(AudioContext).toHaveBeenCalledTimes(1);
  });

  it('plays a simple SFX preset', () => {
    engine.play('sfx_click');
    // Should create oscillator + gain nodes
    const ctx = (AudioContext as any).mock.results[0].value;
    expect(ctx.createOscillator).toHaveBeenCalled();
    expect(ctx.createGain).toHaveBeenCalled();
  });

  it('plays a sequential arpeggio preset', () => {
    engine.play('sfx_skill_activate');
    const ctx = (AudioContext as any).mock.results[0].value;
    // 3 steps = 3 oscillators
    expect(ctx.createOscillator).toHaveBeenCalledTimes(3);
  });

  it('does not play when muted', () => {
    engine.updateSettings({
      masterVolume: 80,
      musicVolume: 80,
      sfxVolume: 80,
      masterMuted: true,
    });
    engine.play('sfx_click');
    expect(AudioContext).not.toHaveBeenCalled();
  });

  it('does not play when sfxVolume is 0', () => {
    engine.updateSettings({
      masterVolume: 80,
      musicVolume: 80,
      sfxVolume: 0,
      masterMuted: false,
    });
    engine.play('sfx_click');
    expect(AudioContext).not.toHaveBeenCalled();
  });

  it('does not play unknown config keys', () => {
    engine.play('sfx_nonexistent');
    expect(AudioContext).not.toHaveBeenCalled();
  });

  it('throttles rapid plays of the same key', () => {
    engine.play('sfx_click');
    const ctx = (AudioContext as any).mock.results[0].value;
    const firstCallCount = ctx.createOscillator.mock.calls.length;
    engine.play('sfx_click'); // within 50ms - should be throttled
    // No additional oscillators created
    expect(ctx.createOscillator).toHaveBeenCalledTimes(firstCallCount);
  });

  it('allows different keys to play simultaneously', () => {
    engine.play('sfx_click');
    const ctx = (AudioContext as any).mock.results[0].value;
    const afterClick = ctx.createOscillator.mock.calls.length;
    engine.play('sfx_crit');
    // sfx_crit should add at least 1 more oscillator
    expect(ctx.createOscillator.mock.calls.length).toBeGreaterThan(afterClick);
  });

  it('creates StereoPannerNode for spatial-enabled SFX', () => {
    engine.play('sfx_click', { pan: 0.5 });
    const ctx = (AudioContext as any).mock.results[0].value;
    expect(ctx.createStereoPanner).toHaveBeenCalledTimes(1);
  });

  it('does not create StereoPannerNode for non-spatial SFX', () => {
    engine.play('sfx_skill_activate');
    const ctx = (AudioContext as any).mock.results[0].value;
    expect(ctx.createStereoPanner).not.toHaveBeenCalled();
  });

  it('clamps pan value to [-1, 1]', () => {
    engine.play('sfx_click', { pan: 5.0 });
    const ctx = (AudioContext as any).mock.results[0].value;
    const pannerResult = ctx.createStereoPanner.mock.results[0].value;
    expect(pannerResult.pan.value).toBeLessThanOrEqual(1);
  });

  it('applies volume multiplication', () => {
    engine.updateSettings({
      masterVolume: 50,
      musicVolume: 80,
      sfxVolume: 50,
      masterMuted: false,
    });
    engine.play('sfx_click');
    const ctx = (AudioContext as any).mock.results[0].value;
    const gainResult = ctx.createGain.mock.results[0].value;
    // Effective volume = (50/100) * (50/100) * 0.6 (base_volume) = 0.15
    expect(gainResult.gain.value).toBeCloseTo(0.15, 2);
  });

  it('creates noise oscillator when noise_mix > 0', () => {
    engine.play('sfx_click');
    const ctx = (AudioContext as any).mock.results[0].value;
    // sfx_click has noise_mix: 0.05, so 2 oscillators: main + noise
    expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
  });
});

describe('SFXEngine singleton', () => {
  afterEach(() => {
    destroySFXEngine();
  });

  it('returns the same instance', () => {
    const a = getSFXEngine();
    const b = getSFXEngine();
    expect(a).toBe(b);
  });

  it('destroySFXEngine resets the instance', () => {
    const a = getSFXEngine();
    destroySFXEngine();
    const b = getSFXEngine();
    expect(a).not.toBe(b);
  });
});
