import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HeroStats from './HeroStats';
import type { StorySession } from '../../GameContext';
import { api } from '../../../api';

// Mock the sub-components to isolate HeroStats tests
vi.mock('./CharacterStatPanel', () => ({
  default: () => <div data-testid="stat-panel">StatPanel</div>,
}));
vi.mock('./CharacterLevelBar', () => ({
  default: () => <div data-testid="level-bar">LevelBar</div>,
}));

const baseSession: StorySession = {
  sessionId: 'test',
  sceneId: 1,
  chapterId: 1,
  currentZone: 1,
  currentWave: 0,
  sessionGold: 0,
  darkRitualMultiplier: 1.0,
  narrativeProgressPct: 0,
  wavesComplete: false,
  previouslyCompleted: false,
  characterStrength: 10,
  autoDpsPerSecond: 10,
  clickUpgradeLevel: 0,
  autoUpgradeLevel: 0,
  clickDmgMultiplier: 1.0,
  autoDpsMultiplier: 1.0,
  goldDropMultiplier: 1.5,
  isBossSession: false,
  bossType: null,
  bossConfig: null,
  isReplay: false,
};

describe('HeroStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ stat_total: { strength: 0 }, owned_artifacts: [], curated_collection: { total: 0, owned: 0, undiscovered: [] }, generated_count: 0 }),
    });
  });

  it('renders the COMBAT STATS title', () => {
    render(<HeroStats session={baseSession} />);
    expect(screen.getByText('COMBAT STATS')).toBeDefined();
  });

  it('displays click damage label', () => {
    render(<HeroStats session={baseSession} />);
    expect(screen.getByText('Click Dmg')).toBeDefined();
  });

  it('displays auto DPS label', () => {
    render(<HeroStats session={baseSession} />);
    expect(screen.getByText('Auto DPS')).toBeDefined();
  });

  it('shows gold rate multiplier', () => {
    render(<HeroStats session={baseSession} />);
    expect(screen.getByText('×1.50')).toBeDefined();
  });

  it('highlights dark ritual row when multiplier > 1', () => {
    const session = { ...baseSession, darkRitualMultiplier: 1.05 };
    const { container } = render(<HeroStats session={session} />);
    expect(container.querySelector('.hero-stats-row--highlight')).not.toBeNull();
  });

  it('does not highlight dark ritual row at baseline multiplier', () => {
    const { container } = render(<HeroStats session={baseSession} />);
    expect(container.querySelector('.hero-stats-row--highlight')).toBeNull();
  });

  it('calculates click damage with all multipliers', () => {
    // 10 strength + 10 level = 20 base. 20 * 2 mult = 40.
    const session = { ...baseSession, characterStrength: 10, clickUpgradeLevel: 10, clickDmgMultiplier: 2, darkRitualMultiplier: 1 };
    render(<HeroStats session={session} />);
    expect(screen.getByText('40')).toBeDefined();
  });

  it('renders CharacterLevelBar and CharacterStatPanel', () => {
    render(<HeroStats session={baseSession} />);
    expect(screen.getByTestId('level-bar')).toBeDefined();
    expect(screen.getByTestId('stat-panel')).toBeDefined();
  });
});
