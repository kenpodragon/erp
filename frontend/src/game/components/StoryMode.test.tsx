/**
 * StoryMode — component-level unit tests.
 *
 * StoryMode is an orchestrator component that manages session state, API calls,
 * and conditionally renders child components (CombatStage, BossStage, NarrativeBlock,
 * GlobalHeader, StoryModeDashboard, NarrativeReveal). Unlike CombatStage/BossStage,
 * it is NOT primarily PixiJS — most of its behavior IS testable via RTL:
 *   - API calls on mount (session/start, configs)
 *   - Conditional rendering of child components based on session state
 *   - Loading/error states
 *   - Timer-based batch ticking (flushTick every 2s)
 *   - CPS violation state machine (NORMAL → FLASHING → WARNING → COOLDOWN)
 *   - Farm mode and summary prop handling
 *   - Clean unmount with active timers
 */
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import StoryMode from './StoryMode';
import { api } from '../../api';

// ── Mock refs ──────────────────────────────────────────────────────────────

const mockExitScene = vi.fn();
const mockSetStorySession = vi.fn();
const mockUpdateStorySession = vi.fn();
const mockSetEssence = vi.fn();
const mockSetGold = vi.fn();
const mockPlaySFX = vi.fn();

// ── useGame mock — default: normal (non-boss) session ──────────────────────

let mockGameState: Record<string, any> = {};

function buildDefaultGameState(overrides: Record<string, any> = {}) {
  return {
    activeSceneId: '1',
    storySession: null, // StoryMode sets this itself via setStorySession
    activeBuffs: [],
    reduceMotion: false,
    ...overrides,
  };
}

vi.mock('../GameContext', () => ({
  useGame: () => ({
    state: mockGameState,
    exitScene: mockExitScene,
    setStorySession: mockSetStorySession,
    updateStorySession: mockUpdateStorySession,
    setEssence: mockSetEssence,
    setGold: mockSetGold,
    playSFX: mockPlaySFX,
  }),
}));

// Mock all sub-components to isolate StoryMode logic
vi.mock('./story/GlobalHeader', () => ({ default: (props: any) => <div data-testid="global-header" /> }));
vi.mock('./story/NarrativeBlock', () => ({ default: (props: any) => <div data-testid="narrative-block" /> }));
vi.mock('./story/CombatStage', () => ({ default: (props: any) => <div data-testid="combat-stage" /> }));
vi.mock('./story/BossStage', () => ({ default: (props: any) => <div data-testid="boss-stage" /> }));
vi.mock('./story/NarrativeReveal', () => ({ default: (props: any) => <div data-testid="narrative-reveal" /> }));
vi.mock('./story/StoryModeDashboard', () => ({ default: (props: any) => <div data-testid="story-dashboard" /> }));
vi.mock('../utils/classVisuals', () => ({ applyClassVisuals: vi.fn() }));
vi.mock('./StoryMode.css', () => ({}));

// ── Helpers ────────────────────────────────────────────────────────────────

const mockPlayer = {
  id: 1,
  is_game_admin: false,
  settings: {
    narration_wpm: 200,
    narration_font_size: 14,
    narration_block_height: 300,
    ui_scale: 1.0,
    game_text_scale: 1.0,
  },
};

const mockSessionResponse = {
  session_id: 'test-session-123',
  chapter_id: 1,
  current_zone: 1,
  current_wave: 0,
  session_gold: 0,
  dark_ritual_multiplier: 1.0,
  narrative_progress_pct: 0,
  required_waves_finished: false,
  previously_completed: false,
  character_strength: 10,
  auto_dps_per_second: 0,
  click_upgrade_level: 1,
  auto_upgrade_level: 1,
  click_dmg_multiplier: 1.0,
  auto_dps_multiplier: 1.0,
  gold_drop_multiplier: 1.0,
  is_boss_session: false,
  boss_type: null,
  boss_name: 'Guardian',
  boss_config: null,
  is_replay: false,
  skill_tree: [],
  visual_config: null,
};

const mockConfigsResponse = { click_rate_cap: 20, cps_warning_threshold_seconds: 5, cps_warning_cooldown_seconds: 10 };

function setupApiMocks(sessionResponse = mockSessionResponse, configsResponse = mockConfigsResponse) {
  (api.post as any).mockImplementation((url: string) => {
    if (url.includes('session/start')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(sessionResponse),
      });
    }
    // tick endpoint
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ session_gold: 0, current_zone: 1, current_wave: 0, cps_valid: true }),
    });
  });
  (api.get as any).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(configsResponse),
  });
}

/** Factory for storySession objects — reduces boilerplate across tests */
function buildStorySession(overrides: Record<string, any> = {}) {
  return {
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
    autoDpsPerSecond: 0,
    clickUpgradeLevel: 1,
    autoUpgradeLevel: 1,
    clickDmgMultiplier: 1.0,
    autoDpsMultiplier: 1.0,
    goldDropMultiplier: 1.0,
    isBossSession: false,
    bossType: null,
    bossConfig: null,
    isReplay: false,
    ...overrides,
  };
}

const defaultProps = {
  player: mockPlayer,
  onPlayerUpdate: vi.fn(),
};

/** Render helper that wraps in act and flushes API promises */
async function renderStoryMode(overrides: Partial<typeof defaultProps> & Record<string, any> = {}) {
  const props = { ...defaultProps, ...overrides };
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(<StoryMode {...(props as any)} />);
  });
  // Flush session/start and configs promises
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return result!;
}

// ── Test suite ─────────────────────────────────────────────────────────────

describe('StoryMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGameState = buildDefaultGameState();
    setupApiMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ── Loading state ────────────────────────────────────────────────────────

  it('shows loading state during session initialization', async () => {
    // With storySession = null in state and isLoading = true, the loading div renders
    // Since session/start hasn't resolved yet, the component shows loading
    mockGameState = buildDefaultGameState();

    let result: ReturnType<typeof render>;
    await act(async () => {
      result = render(<StoryMode {...(defaultProps as any)} />);
    });

    // Before API resolves, loading should be visible
    // After the session/start call, setStorySession is called — but since we mock
    // useGame to always return storySession: null, the loading guard catches it
    expect(result!.container.querySelector('.story-loading')).toBeTruthy();
  });

  // ── API calls on mount ───────────────────────────────────────────────────

  it('calls session/start API with correct scene_id on mount', async () => {
    await renderStoryMode();

    expect(api.post).toHaveBeenCalledWith('/api/game/story/session/start', { scene_id: 1 });
  });

  it('fetches game configs on mount', async () => {
    await renderStoryMode();

    expect(api.get).toHaveBeenCalledWith('/api/game/story/configs');
  });

  it('calls setStorySession with parsed session data on successful init', async () => {
    await renderStoryMode();

    expect(mockSetStorySession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'test-session-123',
        sceneId: 1,
        chapterId: 1,
        isBossSession: false,
      })
    );
  });

  it('calls exitScene when session start returns non-ok response', async () => {
    (api.post as any).mockResolvedValue({ ok: false, status: 404 });

    await renderStoryMode();

    expect(mockExitScene).toHaveBeenCalled();
  });

  it('calls exitScene when session start throws an error', async () => {
    (api.post as any).mockRejectedValue(new Error('Network error'));

    await renderStoryMode();

    expect(mockExitScene).toHaveBeenCalled();
  });

  it('does not start session when activeSceneId is null', async () => {
    mockGameState = buildDefaultGameState({ activeSceneId: null });

    await renderStoryMode();

    expect(api.post).not.toHaveBeenCalled();
  });

  // ── Rendering child components (normal session) ──────────────────────────

  it('renders CombatStage for normal (non-boss) sessions', async () => {
    // We need storySession in state for the non-loading path to render
    mockGameState = buildDefaultGameState({
      storySession: buildStorySession({ sessionId: 'test-session-123' }),
    });

    await renderStoryMode();

    expect(screen.getByTestId('combat-stage')).toBeTruthy();
    expect(screen.getByTestId('narrative-block')).toBeTruthy();
    expect(screen.getByTestId('global-header')).toBeTruthy();
    expect(screen.getByTestId('story-dashboard')).toBeTruthy();
    expect(screen.queryByTestId('boss-stage')).toBeNull();
  });

  it('renders BossStage for boss sessions', async () => {
    mockGameState = buildDefaultGameState({
      storySession: buildStorySession({
        sessionId: 'boss-session',
        sceneId: 10,
        chapterId: 2,
        currentZone: 5,
        autoDpsPerSecond: 10,
        isBossSession: true,
        bossType: 'chapter_boss',
        bossName: 'Shadow Lord',
        bossConfig: { timer_seconds: 120, hp_multiplier: 8 },
      }),
    });

    await renderStoryMode();

    expect(screen.getByTestId('boss-stage')).toBeTruthy();
    expect(screen.getByTestId('global-header')).toBeTruthy();
    expect(screen.queryByTestId('combat-stage')).toBeNull();
    expect(screen.queryByTestId('narrative-block')).toBeNull();
  });

  // ── Prop variations ──────────────────────────────────────────────────────

  it('renders without crashing with null player prop', async () => {
    mockGameState = buildDefaultGameState({
      storySession: buildStorySession({ sessionId: 'null-player-test' }),
    });

    const { container } = await renderStoryMode({ player: null });
    expect(container.querySelector('.story-mode')).toBeTruthy();
  });

  // NOTE: showSummaryExternal, externalFarmMode, and onPlayerUpdate props are
  // passed down to mocked child components (StoryModeDashboard, CombatStage,
  // NarrativeBlock) or used in async callbacks (handleBossDefeated). Because
  // child components are stubbed, the props don't produce observable DOM
  // differences in StoryMode itself. These tests verify the component accepts
  // the props without crashing — similar to the PixiJS limitation documented
  // in CombatStage tests. Full integration is covered by Playwright E2E.

  it('accepts showSummaryExternal prop without crashing', async () => {
    mockGameState = buildDefaultGameState({
      storySession: buildStorySession({ sessionId: 'summary-test' }),
    });

    const onShowSummaryChange = vi.fn();
    const { container } = await renderStoryMode({
      showSummaryExternal: true,
      onShowSummaryChange,
    });
    expect(container.querySelector('.story-mode')).toBeTruthy();
  });

  it('accepts externalFarmMode prop without crashing', async () => {
    mockGameState = buildDefaultGameState({
      storySession: buildStorySession({ sessionId: 'farm-test' }),
    });

    const onFarmModeChange = vi.fn();
    const { container } = await renderStoryMode({
      externalFarmMode: true,
      onFarmModeChange,
    });
    expect(container.querySelector('.story-mode')).toBeTruthy();
  });

  it('accepts onPlayerUpdate callback without crashing', async () => {
    mockGameState = buildDefaultGameState({
      storySession: buildStorySession({ sessionId: 'callback-test' }),
    });

    const onPlayerUpdate = vi.fn();
    const { container } = await renderStoryMode({ onPlayerUpdate });
    expect(container.querySelector('.story-mode')).toBeTruthy();
  });

  // ── Batch tick loop ──────────────────────────────────────────────────────

  it('starts tick loop when session is active and sends tick API call', async () => {
    vi.useFakeTimers();

    mockGameState = buildDefaultGameState({
      storySession: buildStorySession({ sessionId: 'tick-session', sessionGold: 100 }),
    });

    const tickResponse = {
      session_gold: 150,
      current_zone: 1,
      current_wave: 1,
      cps_valid: true,
    };

    (api.post as any).mockImplementation((url: string) => {
      if (url.includes('/tick')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(tickResponse) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSessionResponse) });
    });

    await act(async () => {
      render(<StoryMode {...(defaultProps as any)} />);
    });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    // Advance past TICK_INTERVAL_MS (2000ms)
    await act(async () => {
      vi.advanceTimersByTime(2100);
    });
    // Flush tick promise
    await act(async () => { await Promise.resolve(); });

    expect(api.post).toHaveBeenCalledWith(
      '/api/game/story/session/tick-session/tick',
      expect.objectContaining({ clicks: 0, zone: 1, wave: 0 })
    );

    expect(mockUpdateStorySession).toHaveBeenCalledWith({
      sessionGold: 150,
      currentZone: 1,
      currentWave: 1,
    });
  });

  // ── CPS state machine ───────────────────────────────────────────────────

  it('CPS state starts at NORMAL (no CPS toast visible)', async () => {
    mockGameState = buildDefaultGameState({
      storySession: buildStorySession({ sessionId: 'cps-test' }),
    });

    const { container } = await renderStoryMode();

    // CPS warning toast should not be visible initially
    expect(container.querySelector('.cps-warning-toast')).toBeNull();
  });

  it('shows CPS warning toast after sustained cps_valid=false ticks past threshold', async () => {
    vi.useFakeTimers();

    const cpsSession = buildStorySession({ sessionId: 'cps-warn' });
    mockGameState = buildDefaultGameState({ storySession: cpsSession });

    // Config: 5s threshold = 3 ticks at 2s interval
    const configs = { click_rate_cap: 20, cps_warning_threshold_seconds: 5, cps_warning_cooldown_seconds: 10 };
    setupApiMocks(mockSessionResponse, configs);

    // Tick always returns cps_valid: false
    (api.post as any).mockImplementation((url: string) => {
      if (url.includes('/tick')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ session_gold: 0, current_zone: 1, current_wave: 0, cps_valid: false }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSessionResponse) });
    });

    let container: HTMLElement;
    await act(async () => {
      const res = render(<StoryMode {...(defaultProps as any)} />);
      container = res.container;
    });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    // Advance through multiple tick intervals to exceed 5s threshold.
    // Ticks fire every 2s. cpsViolationStart is set on first cps_valid=false.
    // WARNING triggers when (now - cpsViolationStart) >= 5000ms, so we need
    // at least 4 ticks: tick1 sets start, tick4 at ~6s exceeds threshold.
    for (let i = 0; i < 4; i++) {
      await act(async () => { vi.advanceTimersByTime(2100); });
      await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    }

    expect(container!.querySelector('.cps-warning-toast')).toBeTruthy();
  });

  // ── Boss replay badge ────────────────────────────────────────────────────

  it('shows REPLAY badge for boss replay sessions', async () => {
    mockGameState = buildDefaultGameState({
      storySession: buildStorySession({
        sessionId: 'replay-boss',
        sceneId: 10,
        chapterId: 2,
        currentZone: 5,
        autoDpsPerSecond: 10,
        isBossSession: true,
        bossType: 'chapter_boss',
        bossName: 'Shadow Lord',
        bossConfig: { timer_seconds: 120, hp_multiplier: 8 },
        isReplay: true,
      }),
    });

    const { container } = await renderStoryMode();

    expect(container.querySelector('.boss-replay-badge')).toBeTruthy();
    expect(container.querySelector('.boss-replay-badge')!.textContent).toContain('REPLAY');
  });

  // ── Admin controls ───────────────────────────────────────────────────────

  it('shows admin debug controls for game admin players', async () => {
    mockGameState = buildDefaultGameState({
      storySession: buildStorySession({ sessionId: 'admin-test' }),
    });

    const adminPlayer = { ...mockPlayer, is_game_admin: true };
    const { container } = await renderStoryMode({ player: adminPlayer });

    expect(container.querySelector('.debug-toggle-btn')).toBeTruthy();
  });

  it('hides admin debug controls for non-admin players', async () => {
    mockGameState = buildDefaultGameState({
      storySession: buildStorySession({ sessionId: 'non-admin-test' }),
    });

    const { container } = await renderStoryMode();

    expect(container.querySelector('.debug-toggle-btn')).toBeNull();
  });

  // ── EXIT button ──────────────────────────────────────────────────────────

  it('renders EXIT SCENE button in normal mode', async () => {
    mockGameState = buildDefaultGameState({
      storySession: buildStorySession({ sessionId: 'exit-test' }),
    });

    await renderStoryMode();
    expect(screen.getByText('EXIT SCENE')).toBeTruthy();
  });

  it('renders RETREAT button in boss mode', async () => {
    mockGameState = buildDefaultGameState({
      storySession: buildStorySession({
        sessionId: 'boss-exit',
        sceneId: 10,
        chapterId: 2,
        currentZone: 5,
        autoDpsPerSecond: 10,
        isBossSession: true,
        bossType: 'chapter_boss',
        bossName: 'Shadow Lord',
        bossConfig: { timer_seconds: 120, hp_multiplier: 8 },
      }),
    });

    await renderStoryMode();
    expect(screen.getByText('RETREAT')).toBeTruthy();
  });

  // ── Auto progress button ─────────────────────────────────────────────────

  it('renders auto progress toggle button in normal mode', async () => {
    mockGameState = buildDefaultGameState({
      storySession: buildStorySession({ sessionId: 'auto-test' }),
    });

    await renderStoryMode();
    // Default autoProgress is true, so button shows ON
    expect(screen.getByText('AUTO PROGRESS: ON')).toBeTruthy();
  });

  // ── Cleanup / unmount ──────────────────────────────────────────────────

  it('unmounts cleanly without errors', async () => {
    mockGameState = buildDefaultGameState({
      storySession: buildStorySession({ sessionId: 'unmount-test' }),
    });

    const { unmount } = await renderStoryMode();
    expect(() => unmount()).not.toThrow();
  });

  it('unmounts cleanly with fake timers active', async () => {
    vi.useFakeTimers();

    mockGameState = buildDefaultGameState({
      storySession: buildStorySession({ sessionId: 'timer-unmount' }),
    });

    let unmount: () => void;
    await act(async () => {
      const res = render(<StoryMode {...(defaultProps as any)} />);
      unmount = res.unmount;
    });
    await act(async () => { await Promise.resolve(); });

    // Advance timers past one tick interval
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(() => unmount!()).not.toThrow();
  });

  it('renders with all optional props simultaneously', async () => {
    mockGameState = buildDefaultGameState({
      storySession: buildStorySession({ sessionId: 'all-props' }),
    });

    const { container } = await renderStoryMode({
      showSummaryExternal: false,
      onShowSummaryChange: vi.fn(),
      externalFarmMode: true,
      onFarmModeChange: vi.fn(),
    });

    expect(container.querySelector('.story-mode')).toBeTruthy();
  });
});
