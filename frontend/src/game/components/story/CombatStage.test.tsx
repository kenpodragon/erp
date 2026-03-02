import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CombatStage from './CombatStage';
import type { StorySession } from '../../GameContext';
import { api } from '../../../api';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

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
  characterStrength: 10,
  autoDpsPerSecond: 10,
  clickDmgMultiplier: 1.0,
  autoDpsMultiplier: 1.0,
  goldDropMultiplier: 1.0,
};

describe('CombatStage', () => {
  const onEnemyClick = vi.fn();
  const onGoldEarned = vi.fn();
  const onWavesComplete = vi.fn();

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
        />
      );
      container = res.container;
    });

    // Flush microtasks
    await act(async () => { await Promise.resolve(); });

    const stage = container!.querySelector('.combat-stage-wrap');
    stage!.getBoundingClientRect = vi.fn(() => ({
      left: 0, top: 0, width: 600, height: 340,
      bottom: 340, right: 600, x: 0, y: 0, toJSON: () => {}
    }));

    await act(async () => {
      fireEvent.click(stage!, { clientX: 300, clientY: 170 });
    });

    expect(onEnemyClick).toHaveBeenCalled();
  });

  it('advances waves when enemy dies', async () => {
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
        />
      );
      container = res.container;
    });

    await act(async () => { await Promise.resolve(); });

    const stage = container!.querySelector('.combat-stage-wrap');
    stage!.getBoundingClientRect = vi.fn(() => ({
      left: 0, top: 0, width: 600, height: 340,
      bottom: 340, right: 600, x: 0, y: 0, toJSON: () => {}
    }));

    await act(async () => {
      fireEvent.click(stage!, { clientX: 300, clientY: 170 });
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(onGoldEarned).toHaveBeenCalled();
    expect(container!.querySelector('pixitext[text*="Wave 2/10"]')).not.toBeNull();
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
        />
      );
      container = res.container;
    });

    await act(async () => { await Promise.resolve(); });

    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(onGoldEarned).toHaveBeenCalled();
    expect(container!.querySelector('pixitext[text*="Wave 2/10"]')).not.toBeNull();
  });
});
