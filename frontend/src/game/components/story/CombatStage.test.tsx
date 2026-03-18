import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CombatStage from './CombatStage';
import type { StorySession } from '../../GameContext';
import { api } from '../../../api';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  callback: any;
  constructor(callback: any) { this.callback = callback; }
  observe() { if (this.callback) this.callback(); }
  unobserve() {}
  disconnect() {}
};

// Aggressively mock getBoundingClientRect for JSDOM
Element.prototype.getBoundingClientRect = vi.fn(() => ({
  width: 600, height: 400, top: 0, left: 0, bottom: 400, right: 600, x: 0, y: 0, toJSON: () => {}
}));

// Mock @pixi/react and pixi.js
vi.mock('@pixi/react', () => ({
  Application: ({ children }: { children: React.ReactNode }) => <div data-testid="pixi-application">{children}</div>,
  extend: vi.fn(),
  useTick: vi.fn(),
  TilingSprite: ({ children }: { children: React.ReactNode }) => <div data-testid="pixi-tiling-sprite">{children}</div>,
}));

vi.mock('pixi.js', () => ({
  Container: 'pixiContainer',
  Graphics: 'pixiGraphics',
  Text: 'pixiText',
  Sprite: 'pixiSprite',
  TilingSprite: 'pixiTilingSprite',
  TextStyle: vi.fn().mockImplementation(() => ({})),
  Assets: { load: vi.fn().mockResolvedValue({}) },
  Texture: vi.fn(),
}));

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
  previouslyCompleted: false,
  characterStrength: 10,
  autoDpsPerSecond: 10,
  clickUpgradeLevel: 0,
  autoUpgradeLevel: 0,
  clickDmgMultiplier: 1.0,
  autoDpsMultiplier: 1.0,
  goldDropMultiplier: 1.0,
};

describe('CombatStage', () => {
  const onEnemyClick = vi.fn();
  const onGoldEarned = vi.fn();
  const onWavesComplete = vi.fn();
  const onZoneAdvance = vi.fn();
  const onAutoProgressToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('narrative')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total_estimated_seconds: 60 }),
        });
      }
      if (url.includes('enemies')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ enemies: [] }),
        });
      }
      return Promise.resolve({ ok: false });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders Pixi Application', async () => {
    await act(async () => {
      render(
        <CombatStage
          session={baseSession}
          gameConfigs={{}}
          onEnemyClick={onEnemyClick}
          onGoldEarned={onGoldEarned}
          onWavesComplete={onWavesComplete}
          onZoneAdvance={onZoneAdvance}
          autoProgress={true}
          onAutoProgressToggle={onAutoProgressToggle}
        />
      );
    });
    expect(screen.getByTestId('pixi-application')).toBeDefined();
  });

  it('handles clicks on the enemy', async () => {
    let container: HTMLElement;
    await act(async () => {
      const res = render(
        <CombatStage
          session={baseSession}
          gameConfigs={{}}
          onEnemyClick={onEnemyClick}
          onGoldEarned={onGoldEarned}
          onWavesComplete={onWavesComplete}
          onZoneAdvance={onZoneAdvance}
          autoProgress={true}
          onAutoProgressToggle={onAutoProgressToggle}
        />
      );
      container = res.container;
    });

    await act(async () => { await Promise.resolve(); });

    const stage = container!.querySelector('.combat-stage-wrap');
    await act(async () => {
      fireEvent.click(stage!, { clientX: 300, clientY: 170 });
    });

    expect(onEnemyClick).toHaveBeenCalled();
  });

  it('advances waves when enemy dies and shows countdown', async () => {
    vi.useFakeTimers();
    let container: HTMLElement;
    await act(async () => {
      const res = render(
        <CombatStage
          session={baseSession}
          gameConfigs={{}}
          onEnemyClick={onEnemyClick}
          onGoldEarned={onGoldEarned}
          onWavesComplete={onWavesComplete}
          onZoneAdvance={onZoneAdvance}
          autoProgress={true}
          onAutoProgressToggle={onAutoProgressToggle}
        />
      );
      container = res.container;
    });

    // Flush the setTimeout(fn, 0) that spawns the initial enemy
    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    const stage = container!.querySelector('.combat-stage-wrap');

    // Kill first mob (10 strength vs 10 HP = 1-hit kill)
    await act(async () => {
      fireEvent.click(stage!, { clientX: 300, clientY: 170 });
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(onGoldEarned).toHaveBeenCalled();
  });

  it('triggers auto-DPS damage', async () => {
    vi.useFakeTimers();
    let container: HTMLElement;
    await act(async () => {
      const res = render(
        <CombatStage
          session={baseSession}
          gameConfigs={{}}
          onEnemyClick={onEnemyClick}
          onGoldEarned={onGoldEarned}
          onWavesComplete={onWavesComplete}
          onZoneAdvance={onZoneAdvance}
          autoProgress={true}
          onAutoProgressToggle={onAutoProgressToggle}
        />
      );
      container = res.container;
    });

    await act(async () => { await Promise.resolve(); });

    // Wait for auto-DPS tick (500ms)
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    // Wait for spawn timer
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(onGoldEarned).toHaveBeenCalled();
  });
});
