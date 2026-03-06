import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MusicManager from './MusicManager';
import { api } from '../../../api';

// ── Mock GameContext ────────────────────────────────────────────────────────
vi.mock('../../GameContext', () => ({
  useGame: () => ({
    state: {
      audioSettings: {
        masterVolume: 80,
        musicVolume: 80,
        sfxVolume: 80,
        masterMuted: false,
      },
    },
  }),
}));

// ── Mock Web Audio API ──────────────────────────────────────────────────────
const mockGainNode = {
  gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() },
  connect: vi.fn(),
  disconnect: vi.fn(),
  context: { currentTime: 0 },
};

const mockOscillator = {
  type: 'square',
  frequency: { value: 440, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  connect: vi.fn(),
  disconnect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
};

const mockBiquadFilter = {
  type: 'lowpass',
  frequency: { value: 1000 },
  connect: vi.fn(),
  disconnect: vi.fn(),
};

const mockAudioContext = {
  state: 'suspended',
  currentTime: 0,
  destination: {},
  createGain: vi.fn(() => ({ ...mockGainNode })),
  createOscillator: vi.fn(() => ({ ...mockOscillator })),
  createBiquadFilter: vi.fn(() => ({ ...mockBiquadFilter })),
  resume: vi.fn(() => Promise.resolve()),
  suspend: vi.fn(() => Promise.resolve()),
  close: vi.fn(() => Promise.resolve()),
};

(globalThis as any).AudioContext = vi.fn(() => ({ ...mockAudioContext }));

describe('MusicManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        atmosphere_id: 1,
        archetype: 'mundane_dread',
        name: 'Mundane Dread',
        music_definitions: {
          explore: { bpm: 90, melody: { oscillator: 'square', volume: 0.3, sequence: [{ note: 'C4', beats: 4 }] } },
          combat: { bpm: 140, melody: { oscillator: 'square', volume: 0.4, sequence: [{ note: 'E4', beats: 2 }] } },
          boss: null,
          mystery: null,
        },
        resolution_source: 'scene',
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders waveform bars and state label', async () => {
    await act(async () => {
      render(<MusicManager musicState="explore" sceneId={1} />);
    });
    // Waveform container exists
    const bars = document.querySelectorAll('.music-wave-bar');
    expect(bars.length).toBe(3);
  });

  it('fetches atmosphere on mount when sceneId is provided', async () => {
    await act(async () => {
      render(<MusicManager musicState="explore" sceneId={42} />);
    });
    await act(async () => { await Promise.resolve(); });

    expect(api.get).toHaveBeenCalledWith(
      expect.stringContaining('/api/game/audio/atmosphere?scene_id=42')
    );
  });

  it('includes boss_entity_id in atmosphere request when provided', async () => {
    await act(async () => {
      render(<MusicManager musicState="boss" sceneId={5} bossEntityId={99} />);
    });
    await act(async () => { await Promise.resolve(); });

    expect(api.get).toHaveBeenCalledWith(
      expect.stringContaining('boss_entity_id=99')
    );
  });

  it('does not fetch atmosphere when sceneId is null', async () => {
    await act(async () => {
      render(<MusicManager musicState="explore" sceneId={null} />);
    });
    await act(async () => { await Promise.resolve(); });

    expect(api.get).not.toHaveBeenCalled();
  });

  it('creates AudioContext on mount', async () => {
    await act(async () => {
      render(<MusicManager musicState="explore" sceneId={1} />);
    });

    expect(AudioContext).toHaveBeenCalledTimes(1);
  });

  it('renders with music-manager class', async () => {
    const { container } = await act(async () => {
      return render(<MusicManager musicState="combat" sceneId={1} />);
    });

    expect(container.querySelector('.music-manager')).toBeTruthy();
  });

  it('shows loading text when no atmosphere loaded yet', async () => {
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => new Promise(() => {}), // never resolves
    });

    await act(async () => {
      render(<MusicManager musicState="explore" sceneId={1} />);
    });

    expect(screen.getByText('Loading...')).toBeDefined();
  });
});
