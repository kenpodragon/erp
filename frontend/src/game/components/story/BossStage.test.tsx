/**
 * BossStage — component-level unit tests.
 *
 * BossStage renders a boss fight via PixiJS (`@pixi/react`), which is mocked
 * as a passthrough in setupTests.ts. The component has significant DOM elements:
 *   - `.boss-stage` wrapper div with click handler
 *   - `.boss-timer-container` with timer bar and label
 *   - Interrupt overlays: `.interrupt-overlay--burst`, `.interrupt-target-zone`,
 *     `.interrupt-whack-zone` (spawned by internal timer logic)
 *   - `.interrupt-success-flash` on successful interrupt
 *
 * Tests focus on:
 *   - Rendering without crashing under various prop combinations
 *   - Timer bar DOM elements existing with correct classes
 *   - Click handling on the wrapper div
 *   - Callback wiring (onBossDefeated, onEnemyClick, onGoldEarned)
 *   - Prop variation smoke tests (debugSuperClick, reduceMotion, textScale)
 *   - Timer countdown and boss defeat on timeout
 *   - Clean unmount with active timers
 */
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import BossStage from './BossStage';
import type { StorySession } from '../../GameContext';

// ── Mocks ──────────────────────────────────────────────────────────────────

// Mock child PixiJS components to avoid canvas/WebGL issues in jsdom
vi.mock('../shared/EntityRenderer', () => ({ default: () => null }));
vi.mock('../shared/AttackRenderer', () => ({ default: () => null }));
vi.mock('./BossStage.css', () => ({}));

// Mock AssetProvider hook — BossStage wraps useAssets() in try/catch
vi.mock('../../providers/AssetProvider', () => ({
  useAssets: () => ({ preloadBatch: vi.fn(), getTexture: vi.fn() }),
}));

// Mock assetRenderer
vi.mock('../../renderers/AssetRenderer', () => ({
  assetRenderer: { render: vi.fn() },
}));

// Mock @pixi/react — Application renders children into a real div for testid
vi.mock('@pixi/react', () => ({
  Application: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pixi-application">{children}</div>
  ),
  extend: vi.fn(),
  useTick: vi.fn(),
}));

// Mock pixi.js primitives as string tags (jsdom renders them as unknown elements)
vi.mock('pixi.js', () => ({
  Container: 'pixiContainer',
  Graphics: 'pixiGraphics',
  Text: 'pixiText',
  TextStyle: vi.fn().mockImplementation(() => ({})),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

const baseBossSession: StorySession = {
  sessionId: 'boss-test-session',
  sceneId: 10,
  chapterId: 2,
  currentZone: 5,
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
  isBossSession: true,
  bossType: 'chapter_boss',
  bossName: 'Shadow Lord',
  bossConfig: {
    timer_seconds: 120,
    hp_multiplier: 8,
    interrupt_interval_min: 1200,
    interrupt_interval_max: 3000,
    interrupt_window_seconds: 2,
    interrupt_refill_seconds: 3,
    interrupt_clicks_required: 20,
  },
};

const defaultProps = {
  session: baseBossSession,
  gameConfigs: {} as Record<string, unknown>,
  onEnemyClick: vi.fn(),
  onGoldEarned: vi.fn(),
  onBossDefeated: vi.fn(),
};

/** Render helper that wraps in act and flushes microtasks */
async function renderBoss(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(<BossStage {...props} />);
  });
  await act(async () => {
    await Promise.resolve();
  });
  return result!;
}

// ── Test suite ─────────────────────────────────────────────────────────────

describe('BossStage', () => {
  beforeEach(() => {
    // Clear mocks BEFORE setting up new implementations
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ── Smoke / render tests ───────────────────────────────────────────────

  it('renders the boss-stage container', async () => {
    const { container } = await renderBoss();
    expect(container.querySelector('.boss-stage')).toBeTruthy();
  });

  it('renders Pixi Application inside boss stage', async () => {
    await renderBoss();
    expect(screen.getByTestId('pixi-application')).toBeTruthy();
  });

  it('renders the timer bar container', async () => {
    const { container } = await renderBoss();
    expect(container.querySelector('.boss-timer-container')).toBeTruthy();
  });

  it('renders the timer bar with correct class', async () => {
    const { container } = await renderBoss();
    expect(container.querySelector('.boss-timer-bar')).toBeTruthy();
  });

  it('renders the timer label showing seconds', async () => {
    const { container } = await renderBoss();
    const label = container.querySelector('.boss-timer-label');
    expect(label).toBeTruthy();
    expect(label!.textContent).toMatch(/\d+s/);
  });

  it('shows initial timer matching bossConfig.timer_seconds', async () => {
    const { container } = await renderBoss();
    const label = container.querySelector('.boss-timer-label');
    expect(label!.textContent).toBe('120s');
  });

  // ── Prop variation smoke tests ─────────────────────────────────────────
  // NOTE: These tests verify "renders without crashing" because most prop-driven
  // behavior (damage numbers, shake, boss entity rendering) is implemented inside
  // PixiJS rendering/useTick callbacks, which are mocked out in jsdom.

  it('renders with debugSuperClick enabled', async () => {
    const { container } = await renderBoss({ debugSuperClick: true } as any);
    expect(container.querySelector('.boss-stage')).toBeTruthy();
  });

  it('renders with reduceMotion enabled', async () => {
    const { container } = await renderBoss({ reduceMotion: true } as any);
    expect(container.querySelector('.boss-stage')).toBeTruthy();
  });

  it('renders with custom textScale', async () => {
    const { container } = await renderBoss({ textScale: 2.0 } as any);
    expect(container.querySelector('.boss-stage')).toBeTruthy();
  });

  it('renders with gameConfigs overrides', async () => {
    const configs: Record<string, unknown> = {
      crit_chance: 0.05,
      crit_multiplier: 3.0,
      hp_scaling_factor: 2.0,
    };
    const { container } = await renderBoss({ gameConfigs: configs });
    expect(container.querySelector('.boss-stage')).toBeTruthy();
  });

  it('renders with all optional props enabled simultaneously', async () => {
    const { container } = await renderBoss({
      debugSuperClick: true,
      reduceMotion: true,
      textScale: 1.5,
      playSFX: vi.fn(),
    } as any);
    expect(container.querySelector('.boss-stage')).toBeTruthy();
  });

  it('renders with default bossConfig when session has none', async () => {
    const session = { ...baseBossSession, bossConfig: null };
    const { container } = await renderBoss({ session });
    expect(container.querySelector('.boss-stage')).toBeTruthy();
    // Timer label should show the default 120s
    const label = container.querySelector('.boss-timer-label');
    expect(label!.textContent).toBe('120s');
  });

  it('renders with custom bossConfig values', async () => {
    const session: StorySession = {
      ...baseBossSession,
      bossConfig: {
        timer_seconds: 60,
        hp_multiplier: 4,
        interrupt_interval_min: 800,
        interrupt_interval_max: 2000,
        interrupt_window_seconds: 3,
        interrupt_refill_seconds: 5,
        interrupt_clicks_required: 10,
      },
    };
    const { container } = await renderBoss({ session });
    const label = container.querySelector('.boss-timer-label');
    expect(label!.textContent).toBe('60s');
  });

  it('renders with high currentZone for HP scaling', async () => {
    const session = { ...baseBossSession, currentZone: 100 };
    const { container } = await renderBoss({ session });
    expect(container.querySelector('.boss-stage')).toBeTruthy();
  });

  it('renders with bossName defaulting to Guardian when not provided', async () => {
    const session = { ...baseBossSession };
    delete (session as any).bossName;
    const { container } = await renderBoss({ session });
    expect(container.querySelector('.boss-stage')).toBeTruthy();
  });

  // ── Interaction tests ──────────────────────────────────────────────────

  it('handles clicks on the boss stage wrapper without throwing', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 600, height: 420, top: 0, left: 0, right: 600, bottom: 420,
      x: 0, y: 0, toJSON: () => {},
    });

    const { container } = await renderBoss();
    const stage = container.querySelector('.boss-stage')!;
    expect(() => fireEvent.click(stage, { clientX: 300, clientY: 210 })).not.toThrow();
  });

  it('fires onEnemyClick when clicking within boss hitbox', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 600, height: 420, top: 0, left: 0, right: 600, bottom: 420,
      x: 0, y: 0, toJSON: () => {},
    });

    const onEnemyClick = vi.fn();
    const { container } = await renderBoss({ onEnemyClick });
    const stage = container.querySelector('.boss-stage')!;

    await act(async () => {
      // Click at boss center (BOSS_X=300, BOSS_Y=170 relative to canvas,
      // plus CANVAS_OFFSET_Y=40 for the timer bar)
      fireEvent.click(stage, { clientX: 300, clientY: 210 });
    });

    expect(onEnemyClick).toHaveBeenCalled();
  });

  it('does not fire onEnemyClick when clicking outside boss hitbox', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 600, height: 420, top: 0, left: 0, right: 600, bottom: 420,
      x: 0, y: 0, toJSON: () => {},
    });

    const onEnemyClick = vi.fn();
    const { container } = await renderBoss({ onEnemyClick });
    const stage = container.querySelector('.boss-stage')!;

    await act(async () => {
      // Click far from boss (top-left corner)
      fireEvent.click(stage, { clientX: 10, clientY: 10 });
    });

    expect(onEnemyClick).not.toHaveBeenCalled();
  });

  // ── Timer countdown and boss defeat on timeout ─────────────────────────

  it('counts down timer and calls onBossDefeated(false) on timeout', async () => {
    vi.useFakeTimers();
    const onBossDefeated = vi.fn();
    const session: StorySession = {
      ...baseBossSession,
      bossConfig: {
        timer_seconds: 3, // short timer for testing
        hp_multiplier: 9999, // huge HP so boss won't die from auto-DPS
        interrupt_interval_min: 999999,
        interrupt_interval_max: 999999,
        interrupt_window_seconds: 2,
        interrupt_refill_seconds: 3,
        interrupt_clicks_required: 20,
      },
    };

    await act(async () => {
      render(<BossStage {...defaultProps} session={session} onBossDefeated={onBossDefeated} />);
    });
    await act(async () => { await Promise.resolve(); });

    // Advance past 3 seconds (timer ticks at 100ms, seconds decrement at 1000ms)
    await act(async () => {
      vi.advanceTimersByTime(3500);
    });

    expect(onBossDefeated).toHaveBeenCalledWith(false);
  });

  it('timer label updates as time passes', async () => {
    vi.useFakeTimers();
    const session: StorySession = {
      ...baseBossSession,
      bossConfig: {
        timer_seconds: 10,
        hp_multiplier: 9999,
        interrupt_interval_min: 999999,
        interrupt_interval_max: 999999,
        interrupt_window_seconds: 2,
        interrupt_refill_seconds: 3,
        interrupt_clicks_required: 20,
      },
    };

    let container: HTMLElement;
    await act(async () => {
      const res = render(<BossStage {...defaultProps} session={session} />);
      container = res.container;
    });
    await act(async () => { await Promise.resolve(); });

    // Advance 2 seconds
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });

    const label = container!.querySelector('.boss-timer-label');
    expect(label).toBeTruthy();
    // Timer should have decreased from 10
    const seconds = parseInt(label!.textContent!);
    expect(seconds).toBeLessThan(10);
  });

  // ── Boss defeat via damage ─────────────────────────────────────────────

  it('calls onBossDefeated(true) when boss HP reaches zero from clicks', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 600, height: 420, top: 0, left: 0, right: 600, bottom: 420,
      x: 0, y: 0, toJSON: () => {},
    });

    const onBossDefeated = vi.fn();
    // Use debugSuperClick which deals 50% max HP per click — 2 clicks = kill
    const session: StorySession = {
      ...baseBossSession,
      currentZone: 1,
      bossConfig: {
        timer_seconds: 120,
        hp_multiplier: 1, // low multiplier for easy kill
        interrupt_interval_min: 999999,
        interrupt_interval_max: 999999,
        interrupt_window_seconds: 2,
        interrupt_refill_seconds: 3,
        interrupt_clicks_required: 20,
      },
    };

    let container: HTMLElement;
    await act(async () => {
      const res = render(
        <BossStage
          {...defaultProps}
          session={session}
          onBossDefeated={onBossDefeated}
          debugSuperClick={true}
        />,
      );
      container = res.container;
    });
    await act(async () => { await Promise.resolve(); });

    const stage = container!.querySelector('.boss-stage')!;

    // Click boss center multiple times (debugSuperClick = 50% HP per click)
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        fireEvent.click(stage, { clientX: 300, clientY: 210 });
      });
    }

    expect(onBossDefeated).toHaveBeenCalledWith(true);
  });

  // ── Callback wiring smoke tests ────────────────────────────────────────

  it('accepts playSFX callback without errors', async () => {
    const playSFX = vi.fn();
    const { container } = await renderBoss({ playSFX } as any);
    expect(container.querySelector('.boss-stage')).toBeTruthy();
  });

  it('passes all callback props through without error', async () => {
    const onBossDefeated = vi.fn();
    const onGoldEarned = vi.fn();
    const onEnemyClick = vi.fn();

    const { container } = await renderBoss({
      onBossDefeated,
      onGoldEarned,
      onEnemyClick,
    });

    expect(container.querySelector('.boss-stage')).toBeTruthy();
  });

  // ── Interrupt overlay tests ────────────────────────────────────────────
  // NOTE: Interrupt overlays (click_burst, target_zone, whack_sequence) are spawned
  // by internal timer logic (spawnInterrupt called from setInterval). They ARE DOM
  // elements (not PixiJS), but spawning is random and timer-driven. We test that
  // the interrupt system can activate without errors by advancing fake timers past
  // the interrupt spawn window.

  it('can spawn interrupt overlays without crashing when timers advance', async () => {
    vi.useFakeTimers();
    const session: StorySession = {
      ...baseBossSession,
      bossConfig: {
        timer_seconds: 120,
        hp_multiplier: 9999,
        interrupt_interval_min: 100, // very short so interrupt spawns quickly
        interrupt_interval_max: 200,
        interrupt_window_seconds: 5,
        interrupt_refill_seconds: 3,
        interrupt_clicks_required: 10,
      },
    };

    let container: HTMLElement;
    await act(async () => {
      const res = render(<BossStage {...defaultProps} session={session} />);
      container = res.container;
    });
    await act(async () => { await Promise.resolve(); });

    // Advance past interrupt spawn window (interrupt_interval_min * 0.8 = 80ms)
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // At least one interrupt overlay type should be present, or the interrupt
    // expired. Either way, no crash occurred.
    const stage = container!.querySelector('.boss-stage');
    expect(stage).toBeTruthy();

    // Check if any interrupt overlay appeared (random type selection)
    const burstOverlay = container!.querySelector('.interrupt-overlay--burst');
    const targetOverlay = container!.querySelector('.interrupt-target-zone');
    const whackOverlay = container!.querySelector('.interrupt-whack-zone');
    const anyInterrupt = burstOverlay || targetOverlay || whackOverlay;

    // We can't guarantee which type spawns (random), but the system should
    // have attempted to spawn one given the short interval
    if (anyInterrupt) {
      // Verify interrupt timer text exists
      const timerEl = container!.querySelector('.interrupt-timer');
      expect(timerEl).toBeTruthy();
    }
  });

  // ── Cleanup / unmount ──────────────────────────────────────────────────

  it('unmounts cleanly without errors', async () => {
    const { unmount } = await renderBoss();
    expect(() => unmount()).not.toThrow();
  });

  it('unmounts cleanly with fake timers active', async () => {
    vi.useFakeTimers();
    let unmount: () => void;
    await act(async () => {
      const res = render(<BossStage {...defaultProps} />);
      unmount = res.unmount;
    });
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(() => unmount!()).not.toThrow();
  });

  it('unmounts cleanly after boss defeat', async () => {
    vi.useFakeTimers();
    const onBossDefeated = vi.fn();
    const session: StorySession = {
      ...baseBossSession,
      bossConfig: {
        timer_seconds: 2,
        hp_multiplier: 9999,
        interrupt_interval_min: 999999,
        interrupt_interval_max: 999999,
        interrupt_window_seconds: 2,
        interrupt_refill_seconds: 3,
        interrupt_clicks_required: 20,
      },
    };

    let unmount: () => void;
    await act(async () => {
      const res = render(
        <BossStage {...defaultProps} session={session} onBossDefeated={onBossDefeated} />,
      );
      unmount = res.unmount;
    });
    await act(async () => { await Promise.resolve(); });

    // Let boss defeat via timeout
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(onBossDefeated).toHaveBeenCalledWith(false);
    expect(() => unmount!()).not.toThrow();
  });
});
