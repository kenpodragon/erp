import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HeroStats from './HeroStats';
import type { StorySession } from '../../GameContext';

const baseSession: StorySession = {
  sessionId: 'test-session',
  sceneId: 1,
  chapterId: 1,
  currentZone: 1,
  currentWave: 0,
  sessionGold: 0,
  darkRitualMultiplier: 1.0,
  narrativeProgressPct: 0,
  wavesComplete: false,
  characterStrength: 100,
  autoDpsPerSecond: 50,
  clickDmgMultiplier: 1.0,
  autoDpsMultiplier: 1.0,
  goldDropMultiplier: 1.5,
};

describe('HeroStats', () => {
  it('renders the HERO STATS title', () => {
    render(<HeroStats session={baseSession} />);
    expect(screen.getByText('HERO STATS')).toBeDefined();
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
    const session = { ...baseSession, characterStrength: 10, clickDmgMultiplier: 2, darkRitualMultiplier: 1 };
    render(<HeroStats session={session} />);
    // 10 * 2 * 1 = 20
    expect(screen.getByText('20')).toBeDefined();
  });
});
