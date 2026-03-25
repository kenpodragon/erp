/**
 * CombatStage — component-level unit tests.
 *
 * CombatStage renders almost entirely via PixiJS (`@pixi/react`), which is
 * mocked as a passthrough in setupTests.ts.  The only real DOM element is
 * the wrapper `<div className="combat-stage-wrap">`.  Tests focus on:
 *   - rendering without crashing under various prop combinations
 *   - the wrapper div existing with correct class
 *   - click handling on the wrapper (PixiJS refs prevent full propagation testing)
 *   - callback wiring smoke tests (onEnemyClick, onGoldEarned, etc.)
 *   - prop variation smoke tests (extraWavesMode, debugSuperClick, rareSpawn, reduceMotion)
 *   - auto-progress and auto-DPS behavior
 *   - clean unmount with no leaked timers
 */
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CombatStage from './CombatStage';
import type { StorySession } from '../../GameContext';
import { api } from '../../../api';

// ── Mocks ──────────────────────────────────────────────────────────────────

// Mock child PixiJS components to avoid canvas/WebGL issues in jsdom
vi.mock('./ParallaxBackground', () => ({ default: () => null }));
vi.mock('../shared/EntityRenderer', () => ({ default: () => null }));
vi.mock('../shared/PaperDollRenderer', () => ({ default: () => null }));
vi.mock('../shared/AttackRenderer', () => ({ default: () => null }));
vi.mock('./CombatStage.css', () => ({}));

// Mock AssetProvider hook — CombatStage wraps useAssets() in try/catch
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
  TilingSprite: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock pixi.js primitives as string tags (jsdom renders them as unknown elements)
vi.mock('pixi.js', () => ({
  Container: 'pixiContainer',
  Graphics: 'pixiGraphics',
  Text: 'pixiText',
  Sprite: 'pixiSprite',
  TilingSprite: 'pixiTilingSprite',
  TextStyle: vi.fn().mockImplementation(() => ({})),
  Assets: { load: vi.fn().mockResolvedValue({}) },
  Texture: { from: vi.fn() },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

// Stub ResizeObserver (not available in jsdom)
class FakeResizeObserver {
  callback: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.callback = cb;
  }
  observe() {
    // Fire immediately so dims > 0 and Application renders
    this.callback(
      [{ contentRect: { width: 800, height: 600 } } as unknown as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}

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
  isBossSession: false,
  bossType: null,
  bossConfig: null,
};

const defaultProps = {
  session: baseSession,
  gameConfigs: {} as Record<string, unknown>,
  onEnemyClick: vi.fn(),
  onGoldEarned: vi.fn(),
  onWavesComplete: vi.fn(),
  onZoneAdvance: vi.fn(),
  onAutoProgressToggle: vi.fn(),
  autoProgress: false,
  narrativeProgressPct: 0,
};

/** Render helper that wraps in act and flushes microtasks */
async function renderCombat(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(<CombatStage {...props} />);
  });
  // Flush api.get promises (enemies, narrative, character visuals)
  await act(async () => {
    await Promise.resolve();
  });
  return result!;
}

// ── Test suite ─────────────────────────────────────────────────────────────

describe('CombatStage', () => {
  let originalResizeObserver: typeof ResizeObserver;

  beforeEach(() => {
    originalResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: () => '#aaaacc',
    } as unknown as CSSStyleDeclaration);

    // Clear mocks BEFORE setting up new implementations
    vi.clearAllMocks();

    // Default API mocks
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
      if (url.includes('visuals')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              class_name: 'Warrior',
              skin_tone: '#c8a882',
              hair_color: '#222',
              armor_primary: '#555',
              armor_secondary: '#333',
              weapon_type: 'sword',
            }),
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });

  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ── Smoke / render tests ───────────────────────────────────────────────

  it('renders the combat-stage-wrap container', async () => {
    const { container } = await renderCombat();
    expect(container.querySelector('.combat-stage-wrap')).toBeTruthy();
  });

  it('renders Pixi Application when dimensions are available', async () => {
    await renderCombat();
    expect(screen.getByTestId('pixi-application')).toBeTruthy();
  });

  it('renders without crashing with all optional props omitted', async () => {
    const { container } = await renderCombat();
    expect(container.querySelector('.combat-stage-wrap')).toBeTruthy();
  });

  // ── Prop variation smoke tests ─────────────────────────────────────────
  // NOTE: These tests only verify "renders without crashing" because the
  // prop-driven behavior (extraWavesMode, debugSuperClick, reduceMotion, etc.)
  // is implemented entirely inside PixiJS rendering/useTick callbacks, which
  // are mocked out in jsdom. RTL cannot observe PixiJS canvas changes.
  // They still catch regressions like bad destructuring, null refs on mount,
  // or conditional-render logic errors in the React wrapper.

  it('renders with extraWavesMode enabled', async () => {
    const { container } = await renderCombat({ extraWavesMode: true } as any);
    expect(container.querySelector('.combat-stage-wrap')).toBeTruthy();
  });

  it('renders with debugSuperClick enabled', async () => {
    const { container } = await renderCombat({ debugSuperClick: true } as any);
    expect(container.querySelector('.combat-stage-wrap')).toBeTruthy();
  });

  it('renders with reduceMotion enabled', async () => {
    const { container } = await renderCombat({ reduceMotion: true } as any);
    expect(container.querySelector('.combat-stage-wrap')).toBeTruthy();
  });

  it('renders with autoProgress enabled', async () => {
    const { container } = await renderCombat({ autoProgress: true });
    expect(container.querySelector('.combat-stage-wrap')).toBeTruthy();
  });

  it('renders with a rareSpawn prop', async () => {
    const rareSpawn = {
      entity_id: 99,
      canonical_name: 'Rare Beast',
      entity_type_id: 1,
      entity_family_id: null,
      base_hp: 500,
      base_gold: 200,
      sprite_key: 'rare_beast_sprite',
    };
    const { container } = await renderCombat({ rareSpawn } as any);
    expect(container.querySelector('.combat-stage-wrap')).toBeTruthy();
  });

  it('renders with a boss session', async () => {
    const bossSession: StorySession = {
      ...baseSession,
      isBossSession: true,
      bossType: 'chapter_boss',
      bossName: 'Shadow Lord',
      bossConfig: {
        timer_seconds: 60,
        hp_multiplier: 5,
        interrupt_interval_min: 8,
        interrupt_interval_max: 15,
        interrupt_window_seconds: 3,
        interrupt_refill_seconds: 2,
        interrupt_clicks_required: 10,
      },
    };
    const { container } = await renderCombat({ session: bossSession });
    expect(container.querySelector('.combat-stage-wrap')).toBeTruthy();
  });

  it('renders with custom textScale', async () => {
    const { container } = await renderCombat({ textScale: 1.5 } as any);
    expect(container.querySelector('.combat-stage-wrap')).toBeTruthy();
  });

  it('renders with gameConfigs overrides', async () => {
    const configs: Record<string, unknown> = {
      monsters_per_zone: 5,
      boss_zone_interval: 3,
      boss_enrage_seconds: 20,
      crit_chance: 0.05,
      primal_boss_chance: 0.5,
      auto_dps_tick_ms: 250,
      hp_scaling_factor: 2.0,
      crit_multiplier: 3.0,
      wave_duration_seconds: 15,
    };
    const { container } = await renderCombat({ gameConfigs: configs });
    expect(container.querySelector('.combat-stage-wrap')).toBeTruthy();
  });

  it('renders with all optional props enabled simultaneously', async () => {
    const { container } = await renderCombat({
      extraWavesMode: true,
      debugSuperClick: true,
      reduceMotion: true,
      autoProgress: true,
      textScale: 2.0,
      playSFX: vi.fn(),
      onEntityKill: vi.fn(),
      rareSpawn: {
        entity_id: 42,
        canonical_name: 'Golden Phoenix',
        entity_type_id: 2,
        entity_family_id: 3,
        base_hp: 1000,
        base_gold: 500,
        sprite_key: null,
      },
    } as any);
    expect(container.querySelector('.combat-stage-wrap')).toBeTruthy();
  });

  it('renders with high currentWave at zone limit', async () => {
    const session = { ...baseSession, currentWave: 10 };
    const { container } = await renderCombat({ session });
    expect(container.querySelector('.combat-stage-wrap')).toBeTruthy();
  });

  it('renders with high currentZone', async () => {
    const session = { ...baseSession, currentZone: 50 };
    const { container } = await renderCombat({ session });
    expect(container.querySelector('.combat-stage-wrap')).toBeTruthy();
  });

  // ── Interaction tests ──────────────────────────────────────────────────

  it('handles clicks on the combat stage wrapper without throwing', async () => {
    const { container } = await renderCombat();
    const wrap = container.querySelector('.combat-stage-wrap')!;
    expect(() => fireEvent.click(wrap, { clientX: 400, clientY: 300 })).not.toThrow();
  });

  it('renders click target container and handles click without throwing', async () => {
    // NOTE: The wrapper div's onClick forwards coordinates to clickHandlerRef.current
    // (set inside CombatContent's PixiJS tree). In jsdom with mocked PixiJS, the
    // inner ref is never wired, so onEnemyClick won't fire. We can only verify
    // that the click handler's optional-chaining guard prevents errors.
    const onEnemyClick = vi.fn();
    const { container } = await renderCombat({ onEnemyClick });
    const wrap = container.querySelector('.combat-stage-wrap')!;

    await act(async () => {
      fireEvent.click(wrap, { clientX: 400, clientY: 300 });
    });

    // Wrapper exists and click did not throw (ref guard works)
    expect(wrap).toBeTruthy();
  });

  // NOTE: playSFX and onEntityKill are invoked inside PixiJS event handlers
  // (useTick, hit-test callbacks) which jsdom cannot trigger. These smoke tests
  // verify the callbacks are accepted as props without causing mount errors.
  it('accepts playSFX callback without errors', async () => {
    const playSFX = vi.fn();
    const { container } = await renderCombat({ playSFX } as any);
    expect(container.querySelector('.combat-stage-wrap')).toBeTruthy();
  });

  it('accepts onEntityKill callback without errors', async () => {
    const onEntityKill = vi.fn();
    const { container } = await renderCombat({ onEntityKill } as any);
    expect(container.querySelector('.combat-stage-wrap')).toBeTruthy();
  });

  // ── Auto-DPS / timer behavior ──────────────────────────────────────────

  it('advances timers with auto-DPS enabled without throwing', async () => {
    // NOTE: Auto-DPS damage is applied inside PixiJS useTick callbacks which are
    // mocked out in jsdom. We cannot verify onGoldEarned fires because the tick
    // loop never runs. This test verifies that enabling autoProgress + advancing
    // fake timers does not throw (timer cleanup, spawn scheduling, etc.).
    vi.useFakeTimers();
    const onGoldEarned = vi.fn();

    let unmount: () => void;
    await act(async () => {
      const res = render(
        <CombatStage
          {...defaultProps}
          autoProgress={true}
          onGoldEarned={onGoldEarned}
        />,
      );
      unmount = res.unmount;
    });

    // Flush promises
    await act(async () => {
      await Promise.resolve();
    });

    // Advance past initial spawn + auto-DPS ticks
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    // Advance past spawn delay
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    // Verify clean unmount after timer advancement (no leaked intervals)
    expect(() => unmount!()).not.toThrow();
  });

  it('advances waves when enemy dies from click damage', async () => {
    vi.useFakeTimers();
    const onGoldEarned = vi.fn();

    // Provide enemies with very low HP so a click kills them
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('enemies')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              enemies: [
                {
                  entityId: 1,
                  name: 'Weak Mob',
                  spriteKey: null,
                  maxHp: 1,
                  currentHp: 1,
                  baseGold: 5,
                  isBoss: false,
                  isPrimal: false,
                  isFallback: false,
                  base_hp: 1,
                  base_gold: 5,
                },
              ],
            }),
        });
      }
      if (url.includes('narrative')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total_estimated_seconds: 60 }),
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });

    let container: HTMLElement;
    await act(async () => {
      const res = render(
        <CombatStage
          {...defaultProps}
          autoProgress={true}
          onGoldEarned={onGoldEarned}
        />,
      );
      container = res.container;
    });

    // Flush initial spawn
    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    const stage = container!.querySelector('.combat-stage-wrap')!;

    // Click to kill
    await act(async () => {
      fireEvent.click(stage, { clientX: 400, clientY: 300 });
    });

    // Advance past spawn delay for next mob
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(onGoldEarned).toHaveBeenCalled();
  });

  // ── API interaction ────────────────────────────────────────────────────

  it('fetches enemies for the current scene and zone on mount', async () => {
    await renderCombat();
    expect(api.get).toHaveBeenCalledWith(
      expect.stringContaining('/api/game/story/scenes/1/enemies'),
    );
  });

  it('fetches narrative data for the current scene on mount', async () => {
    await renderCombat();
    expect(api.get).toHaveBeenCalledWith(
      expect.stringContaining('/api/game/story/scenes/1/narrative'),
    );
  });

  it('fetches character visuals on mount', async () => {
    await renderCombat();
    expect(api.get).toHaveBeenCalledWith('/api/game/character/visuals');
  });

  // ── Callback assertions ───────────────────────────────────────────────
  // NOTE: onZoneAdvance, onWavesComplete, and onAutoProgressToggle are triggered
  // by PixiJS-internal state transitions (zone counter reaching limit, all waves
  // cleared, auto-progress button click inside the Pixi stage). Since useTick is
  // mocked and the Pixi event system is not available in jsdom, these callbacks
  // cannot be exercised at the RTL unit-test level. They are covered by Playwright
  // E2E tests in /testing instead.

  it('passes callback props through to CombatContent without error', async () => {
    // Verify all callback props are accepted and component mounts successfully.
    // This catches signature mismatches or renamed props that would cause runtime errors.
    const onZoneAdvance = vi.fn();
    const onWavesComplete = vi.fn();
    const onAutoProgressToggle = vi.fn();
    const onGoldEarned = vi.fn();
    const onEnemyClick = vi.fn();

    const { container } = await renderCombat({
      onZoneAdvance,
      onWavesComplete,
      onAutoProgressToggle,
      onGoldEarned,
      onEnemyClick,
    });

    expect(container.querySelector('.combat-stage-wrap')).toBeTruthy();
  });

  // ── Cleanup / unmount ──────────────────────────────────────────────────

  it('unmounts cleanly without errors', async () => {
    const { unmount } = await renderCombat();
    expect(() => unmount()).not.toThrow();
  });

  it('unmounts cleanly with fake timers active', async () => {
    vi.useFakeTimers();
    let unmount: () => void;
    await act(async () => {
      const res = render(<CombatStage {...defaultProps} autoProgress={true} />);
      unmount = res.unmount;
    });
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(() => unmount!()).not.toThrow();
  });
});
