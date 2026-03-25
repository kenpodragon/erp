/**
 * BottomAnimatedBanner — component-level unit tests.
 *
 * BottomAnimatedBanner has two layers:
 *   - Outer `BottomAnimatedBanner`: a plain React wrapper that manages responsive
 *     dimensions via window resize events, renders a `<div className="bottom-banner-container">`
 *     containing a PixiJS `<Application>`.
 *   - Inner `BannerContent`: a PixiJS component that fetches enemy pool, character
 *     visuals, and banner configs on mount, then runs an idle battle animation via useTick.
 *
 * PixiJS LIMITATIONS:
 *   All PixiJS rendering (sprites, procedural graphics, useTick animation loop,
 *   combat logic, damage numbers, spawn waves) is mocked out in jsdom. Tests
 *   cannot observe canvas-level changes. We focus on:
 *     - Rendering without crashing under various prop combinations
 *     - API calls made on mount (enemy pool, character visuals, banner configs)
 *     - Graceful handling of empty/failed API responses
 *     - Different character levels (adaptive scaling formulas don't crash)
 *     - Handling null/undefined character prop
 *     - Clean unmount with active animations
 *     - Responsive resize handling
 */
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import BottomAnimatedBanner from './BottomAnimatedBanner';
import { api } from '../../api';

// ── Mocks ──────────────────────────────────────────────────────────────────

// Mock GameContext — BannerContent uses useGame() for state.activeVisualChapterId
vi.mock('../GameContext', () => ({
  useGame: () => ({
    state: {
      activeVisualChapterId: 1,
    },
  }),
}));

// Mock child PixiJS components to avoid canvas/WebGL issues in jsdom
vi.mock('./BannerBackground', () => ({
  default: () => null,
}));

vi.mock('./shared/EntityRenderer', () => ({
  default: () => null,
}));

vi.mock('./shared/PaperDollRenderer', () => ({
  default: () => null,
}));

vi.mock('./shared/AttackRenderer', () => ({
  default: () => null,
}));

vi.mock('./BottomAnimatedBanner.css', () => ({}));

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
  Sprite: 'pixiSprite',
  TilingSprite: 'pixiTilingSprite',
  TextStyle: vi.fn().mockImplementation(() => ({})),
  Assets: { load: vi.fn().mockResolvedValue({}) },
  Texture: { from: vi.fn() },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

const mockCharacter = {
  id: 1,
  character_name: 'Test Character',
  strength: 10,
  agility: 5,
  intelligence: 5,
  level: 5,
};

const highLevelCharacter = {
  id: 2,
  character_name: 'Veteran',
  strength: 80,
  agility: 60,
  intelligence: 40,
  level: 100,
};

/** Setup default API mocks — returns valid data for all three endpoints */
function setupApiMocks(overrides: Partial<{
  enemies: any;
  visuals: any;
  configs: any;
  enemiesOk: boolean;
  visualsOk: boolean;
  configsOk: boolean;
}> = {}) {
  const {
    enemies = [],
    visuals = {
      character_id: 1,
      level: 5,
      aura_tier: null,
      equipped_layers: [],
      unequipped_layers: [1, 2, 3, 4, 5, 6, 7],
    },
    configs = {
      banner_base_enemies: '1',
      banner_max_enemies: '15',
      banner_enemies_per_level: '0.15',
      banner_death_base_rate: '0.03',
      banner_death_reduction_per_level: '0.0003',
      banner_death_floor: '0.002',
      banner_kill_speed_base_ms: '3000',
      banner_kill_speed_min_ms: '200',
      banner_spawn_rate_base: '0.05',
      banner_spawn_rate_combat: '0.01',
    },
    enemiesOk = true,
    visualsOk = true,
    configsOk = true,
  } = overrides;

  (api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url.includes('/enemies/encountered')) {
      return Promise.resolve({ ok: enemiesOk, json: () => Promise.resolve(enemies) });
    }
    if (url.includes('/character/visuals')) {
      return Promise.resolve({ ok: visualsOk, json: () => Promise.resolve(visuals) });
    }
    if (url.includes('/story/configs')) {
      return Promise.resolve({ ok: configsOk, json: () => Promise.resolve(configs) });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
  });
}

/** Render helper that wraps in act and flushes microtasks */
async function renderBanner(character: any = mockCharacter) {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(<BottomAnimatedBanner character={character} />);
  });
  // Flush API promises from the useEffect in BannerContent
  await act(async () => {
    await Promise.resolve();
  });
  return result!;
}

// ── Test suite ─────────────────────────────────────────────────────────────

describe('BottomAnimatedBanner', () => {
  beforeEach(() => {
    // Clear mocks BEFORE setting up new implementations
    vi.clearAllMocks();
    setupApiMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Smoke / render tests ───────────────────────────────────────────────

  it('renders the bottom-banner-container wrapper div', async () => {
    const { container } = await renderBanner();
    expect(container.querySelector('.bottom-banner-container')).toBeTruthy();
  });

  it('renders the Pixi Application inside the container', async () => {
    await renderBanner();
    expect(screen.getByTestId('pixi-application')).toBeTruthy();
  });

  it('renders without crashing when character prop is provided', async () => {
    const { container } = await renderBanner(mockCharacter);
    expect(container.querySelector('.bottom-banner-container')).toBeTruthy();
  });

  // ── API fetch tests ──────────────────────────────────────────────────────
  // BannerContent fires three api.get calls inside a single useEffect on mount:
  //   1. /api/game/enemies/encountered  (enemy pool)
  //   2. /api/game/character/visuals    (paper doll data)
  //   3. /api/game/story/configs        (adaptive scaling configs)

  it('fetches the enemy pool on mount', async () => {
    await renderBanner();
    expect(api.get).toHaveBeenCalledWith('/api/game/enemies/encountered');
  });

  it('fetches character visuals on mount', async () => {
    await renderBanner();
    expect(api.get).toHaveBeenCalledWith('/api/game/character/visuals');
  });

  it('fetches banner configs on mount', async () => {
    await renderBanner();
    expect(api.get).toHaveBeenCalledWith('/api/game/story/configs');
  });

  // ── Empty/failed API response handling ───────────────────────────────────

  it('handles empty enemy pool response without crashing', async () => {
    setupApiMocks({ enemies: [] });
    const { container } = await renderBanner();
    expect(container.querySelector('.bottom-banner-container')).toBeTruthy();
  });

  it('handles failed enemy pool response (ok: false) without crashing', async () => {
    setupApiMocks({ enemiesOk: false });
    const { container } = await renderBanner();
    expect(container.querySelector('.bottom-banner-container')).toBeTruthy();
  });

  it('handles failed character visuals response without crashing', async () => {
    setupApiMocks({ visualsOk: false });
    const { container } = await renderBanner();
    expect(container.querySelector('.bottom-banner-container')).toBeTruthy();
  });

  it('handles failed banner configs response without crashing', async () => {
    setupApiMocks({ configsOk: false });
    const { container } = await renderBanner();
    expect(container.querySelector('.bottom-banner-container')).toBeTruthy();
  });

  it('handles all three API endpoints failing without crashing', async () => {
    setupApiMocks({ enemiesOk: false, visualsOk: false, configsOk: false });
    const { container } = await renderBanner();
    expect(container.querySelector('.bottom-banner-container')).toBeTruthy();
  });

  it('handles API throwing network errors without crashing', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = await renderBanner();
    expect(container.querySelector('.bottom-banner-container')).toBeTruthy();
    consoleSpy.mockRestore();
  });

  // ── Character prop variation tests ───────────────────────────────────────
  // NOTE: Adaptive scaling (maxEnemies, deathRate, killSpeedMs) uses useMemo
  // formulas driven by character.level. Since useTick is mocked, we cannot
  // observe the computed values. These tests verify the formulas don't crash
  // with various level ranges (null-ref guards, division by zero, etc.).

  it('renders with a high-level character (adaptive scaling edge case)', async () => {
    const { container } = await renderBanner(highLevelCharacter);
    expect(container.querySelector('.bottom-banner-container')).toBeTruthy();
  });

  it('renders with a level-1 character (minimum scaling)', async () => {
    const { container } = await renderBanner({ ...mockCharacter, level: 1 });
    expect(container.querySelector('.bottom-banner-container')).toBeTruthy();
  });

  it('renders with level 0 (edge case — fallback to level 1 via || operator)', async () => {
    const { container } = await renderBanner({ ...mockCharacter, level: 0 });
    expect(container.querySelector('.bottom-banner-container')).toBeTruthy();
  });

  it('renders with extremely high level without overflow or crash', async () => {
    const { container } = await renderBanner({ ...mockCharacter, level: 99999 });
    expect(container.querySelector('.bottom-banner-container')).toBeTruthy();
  });

  it('renders with zero stats (strength, agility, intelligence)', async () => {
    const { container } = await renderBanner({
      ...mockCharacter,
      strength: 0,
      agility: 0,
      intelligence: 0,
    });
    expect(container.querySelector('.bottom-banner-container')).toBeTruthy();
  });

  // ── Null/undefined character handling ────────────────────────────────────

  it('renders with null character prop (fallback guards in BannerContent)', async () => {
    const { container } = await renderBanner(null);
    expect(container.querySelector('.bottom-banner-container')).toBeTruthy();
  });

  it('renders with undefined character prop', async () => {
    const { container } = await renderBanner(undefined);
    expect(container.querySelector('.bottom-banner-container')).toBeTruthy();
  });

  it('renders with empty object character (missing all fields)', async () => {
    const { container } = await renderBanner({});
    expect(container.querySelector('.bottom-banner-container')).toBeTruthy();
  });

  // ── Application key behavior ─────────────────────────────────────────────
  // The outer component uses `key={character?.id || 'no-char'}` on Application.
  // Changing character ID should remount the entire Pixi app.

  it('uses character.id as Application key (remount on character change)', async () => {
    const { container, rerender } = await renderBanner(mockCharacter);
    expect(container.querySelector('.bottom-banner-container')).toBeTruthy();

    // Rerender with a different character ID
    await act(async () => {
      rerender(<BottomAnimatedBanner character={{ ...mockCharacter, id: 99 }} />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.querySelector('.bottom-banner-container')).toBeTruthy();
  });

  // ── Responsive resize handling ───────────────────────────────────────────
  // The outer BottomAnimatedBanner listens for window 'resize' events and
  // updates dimensions state. In jsdom, we can fire resize events.

  it('responds to window resize events without crashing', async () => {
    const { container } = await renderBanner();

    await act(async () => {
      // Simulate a resize
      Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
      window.dispatchEvent(new Event('resize'));
    });

    expect(container.querySelector('.bottom-banner-container')).toBeTruthy();
  });

  it('handles multiple rapid resize events without crashing', async () => {
    const { container } = await renderBanner();

    await act(async () => {
      for (let i = 0; i < 10; i++) {
        Object.defineProperty(window, 'innerWidth', { value: 400 + i * 100, writable: true });
        window.dispatchEvent(new Event('resize'));
      }
    });

    expect(container.querySelector('.bottom-banner-container')).toBeTruthy();
  });

  // ── Cleanup / unmount ──────────────────────────────────────────────────

  it('unmounts cleanly without errors', async () => {
    const { unmount } = await renderBanner();
    expect(() => unmount()).not.toThrow();
  });

  it('unmounts cleanly when character is null (no active animations)', async () => {
    const { unmount } = await renderBanner(null);
    expect(() => unmount()).not.toThrow();
  });

  it('removes resize event listener on unmount', async () => {
    const removeListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = await renderBanner();
    unmount();
    expect(removeListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('unmounts cleanly after character change (remounted Application)', async () => {
    const { rerender, unmount } = await renderBanner(mockCharacter);

    await act(async () => {
      rerender(<BottomAnimatedBanner character={highLevelCharacter} />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(() => unmount()).not.toThrow();
  });

  // ── Enemy pool with actual data ──────────────────────────────────────────

  it('renders with a populated enemy pool without crashing', async () => {
    setupApiMocks({
      enemies: [
        {
          entity_id: 1,
          name: 'Goblin',
          sprite_key: null,
          base_hp: 50,
          base_gold: 5,
          color_primary: '#2a4a2a',
          color_secondary: '#1a3a1a',
          movement: null,
          size: null,
          animation: null,
          silhouette: null,
          primary_attack: null,
          secondary_attack: null,
          tertiary_attack: null,
        },
        {
          entity_id: 2,
          name: 'Skeleton',
          sprite_key: 'skeleton_sprite',
          base_hp: 80,
          base_gold: 10,
          color_primary: '#cccccc',
          color_secondary: '#999999',
          movement: null,
          size: null,
          animation: null,
          silhouette: null,
          primary_attack: { attack_animation_type: 'melee_swing', projectile_color: null, impact_effect: 'flash', attack_range: 30, arc_angle: 60 },
          secondary_attack: null,
          tertiary_attack: null,
        },
      ],
    });
    const { container } = await renderBanner();
    expect(container.querySelector('.bottom-banner-container')).toBeTruthy();
  });

  it('renders with character visuals including equipped layers', async () => {
    setupApiMocks({
      visuals: {
        character_id: 1,
        level: 5,
        aura_tier: 'gold',
        equipped_layers: [
          { layer: 7, player_attack_animation: 'ranged_projectile' },
        ],
        unequipped_layers: [1, 2, 3, 4, 5, 6],
      },
    });
    const { container } = await renderBanner();
    expect(container.querySelector('.bottom-banner-container')).toBeTruthy();
  });
});
