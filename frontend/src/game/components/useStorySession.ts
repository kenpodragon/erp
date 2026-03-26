/**
 * useStorySession — session lifecycle hook for StoryMode.
 * Manages session initialization, batch tick loop, CPS state machine,
 * and all combat/narrative event handlers.
 */
import { useEffect, useCallback, useRef, useState } from 'react';
import { useGame } from '../GameContext';
import { api } from '../../api';
import type { StorySession } from '../GameContext';
import { applyClassVisuals } from '../utils/classVisuals';

const TICK_INTERVAL_MS = 2000;

interface Player {
  id: number;
  is_game_admin?: boolean;
  settings?: {
    narration_wpm: number;
    narration_font_size: number;
    narration_block_height: number;
    ui_scale: number;
    game_text_scale: number;
  };
}

interface UseStorySessionParams {
  player: Player | null;
  onPlayerUpdate: () => void;
  showSummaryExternal?: boolean;
  onShowSummaryChange?: (val: boolean) => void;
  externalFarmMode?: boolean;
  onFarmModeChange?: (val: boolean) => void;
}

export function useStorySession(params: UseStorySessionParams) {
  const {
    player, onPlayerUpdate,
    showSummaryExternal = false, onShowSummaryChange,
    externalFarmMode = false, onFarmModeChange,
  } = params;

  const { state, exitScene, setStorySession, updateStorySession, setEssence, setGold, playSFX } = useGame();
  const { activeSceneId, storySession, reduceMotion } = state;

  // ── Refs ────────────────────────────────────────────────────────────────
  const pendingClicks = useRef(0);
  const pendingGold = useRef(0);
  const pendingWavesComplete = useRef(0);
  const pendingEntityEncounters = useRef<Map<number, { encounters: number; kills: number }>>(new Map());
  const lastTickAt = useRef(Date.now());
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── State ──────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [gameConfigs, setGameConfigs] = useState<Record<string, unknown>>({});
  const [forceOdometerUpdate, setForceOdometerUpdate] = useState(false);
  const [autoProgress, setAutoProgress] = useState(true);
  const [debugSuperClick, setDebugSuperClick] = useState(false);
  const [userWpm, setUserWpm] = useState(200);
  const [skillTree, setSkillTree] = useState<any[]>([]);
  // 2.6.1: CPS state machine
  const [cpsState, setCpsState] = useState<'NORMAL' | 'FLASHING' | 'WARNING' | 'COOLDOWN'>('NORMAL');
  const cpsViolationStart = useRef<number | null>(null);
  const cpsValidSince = useRef<number | null>(null);
  const [showCpsToast, setShowCpsToast] = useState(false);
  // 2.6.2: Rare spawn
  const [rareSpawn, setRareSpawn] = useState<{
    entity_id: number; canonical_name: string; entity_type_id: number;
    entity_family_id: number | null; base_hp: number; base_gold: number;
    sprite_key: string | null;
  } | null>(null);
  // Boss narrative reveal
  const [narrativeReveal, setNarrativeReveal] = useState<{
    text: string;
    bossType: 'chapter_boss' | 'book_boss';
    chapterTitle?: string;
    unlocks: string[];
  } | null>(null);

  // farmMode / showSummary controlled by parent
  const farmMode = externalFarmMode;
  const setFarmMode = (val: boolean) => onFarmModeChange?.(val);
  const showSummary = showSummaryExternal;
  const setShowSummary = (val: boolean) => onShowSummaryChange?.(val);

  // ── Session Initialisation ────────────────────────────────────────────
  useEffect(() => {
    if (!activeSceneId) return;

    const start = async () => {
      setIsLoading(true);
      try {
        const [sessionRes, configRes] = await Promise.all([
          api.post('/api/game/story/session/start', { scene_id: Number(activeSceneId) }),
          api.get('/api/game/story/configs'),
        ]);

        if (sessionRes.ok && configRes.ok) {
          const sessionData = await sessionRes.json();
          const configs = await configRes.json();
          setGameConfigs(configs);

          const session: StorySession = {
            sessionId: sessionData.session_id,
            sceneId: Number(activeSceneId),
            chapterId: sessionData.chapter_id,
            currentZone: sessionData.current_zone,
            currentWave: sessionData.current_wave,
            sessionGold: sessionData.session_gold,
            darkRitualMultiplier: sessionData.dark_ritual_multiplier,
            narrativeProgressPct: sessionData.narrative_progress_pct ?? 0,
            wavesComplete: sessionData.required_waves_finished ?? false,
            previouslyCompleted: sessionData.previously_completed ?? false,
            characterStrength: sessionData.character_strength ?? 10,
            autoDpsPerSecond: sessionData.auto_dps_per_second ?? 0,
            clickUpgradeLevel: sessionData.click_upgrade_level ?? 1,
            autoUpgradeLevel: sessionData.auto_upgrade_level ?? 1,
            clickDmgMultiplier: sessionData.click_dmg_multiplier ?? 1,
            autoDpsMultiplier: sessionData.auto_dps_multiplier ?? 1,
            goldDropMultiplier: sessionData.gold_drop_multiplier ?? 1,
            isBossSession: sessionData.is_boss_session ?? false,
            bossType: sessionData.boss_type ?? null,
            bossName: sessionData.boss_name ?? 'Guardian',
            bossConfig: sessionData.boss_config ?? null,
            isReplay: sessionData.is_replay ?? false,
          };
          setStorySession(session);
          setSkillTree(sessionData.skill_tree || []);
          applyClassVisuals(sessionData.visual_config);
          setUserWpm(player?.settings?.narration_wpm || 200);

          if (session.wavesComplete && session.narrativeProgressPct >= 100 && !session.isReplay && !session.isBossSession) {
            setFarmMode(true);
          }
        } else {
          console.warn('StoryMode: session start returned', sessionRes.status, '— returning to overworld');
          exitScene();
        }
      } catch (err) {
        console.error('StoryMode: failed to start session', err);
        exitScene();
      } finally {
        setIsLoading(false);
      }
    };

    start();
    return () => {
      if (tickTimer.current) clearInterval(tickTimer.current);
      applyClassVisuals(null);
    };
  }, [activeSceneId, player]);

  // ── Batch Tick Loop ───────────────────────────────────────────────────
  const flushTick = useCallback(async () => {
    if (!storySession) return;
    const now = Date.now();
    const elapsed = now - lastTickAt.current;
    const clicks = pendingClicks.current;
    const goldDelta = pendingGold.current;
    const wavesCompletedDelta = pendingWavesComplete.current;

    const encounterMap = pendingEntityEncounters.current;
    const entityEncounters = Array.from(encounterMap.entries()).map(
      ([entity_id, data]) => ({ entity_id, encounters: data.encounters, kills: data.kills })
    );

    pendingClicks.current = 0;
    pendingGold.current = 0;
    pendingWavesComplete.current = 0;
    pendingEntityEncounters.current = new Map();
    lastTickAt.current = now;

    try {
      const tickPayload: Record<string, unknown> = {
        clicks,
        elapsed_ms: elapsed,
        zone: storySession.currentZone,
        wave: storySession.currentWave,
        gold_delta: goldDelta,
        waves_completed_delta: wavesCompletedDelta,
      };
      if (entityEncounters.length > 0) {
        tickPayload.entity_encounters = entityEncounters;
      }
      const res = await api.post(
        `/api/game/story/session/${storySession.sessionId}/tick`,
        tickPayload
      );
      if (res.ok) {
        const data = await res.json();

        const drift = Math.abs(storySession.sessionGold - data.session_gold);
        if (drift > data.session_gold * 0.01 && data.session_gold > 0) {
          setForceOdometerUpdate(true);
          setTimeout(() => setForceOdometerUpdate(false), 500);
        }

        updateStorySession({
          sessionGold: data.session_gold,
          currentZone: data.current_zone,
          currentWave: data.current_wave,
        });

        // 2.6.1: CPS state machine
        const warnThreshold = Number(gameConfigs['cps_warning_threshold_seconds'] ?? 5) * 1000;
        const cooldownDuration = Number(gameConfigs['cps_warning_cooldown_seconds'] ?? 10) * 1000;
        if (!data.cps_valid) {
          cpsValidSince.current = null;
          if (!cpsViolationStart.current) cpsViolationStart.current = now;
          if (now - cpsViolationStart.current >= warnThreshold) {
            setCpsState('WARNING');
            setShowCpsToast(true);
          } else {
            setCpsState('FLASHING');
          }
        } else {
          cpsViolationStart.current = null;
          if (cpsState === 'WARNING' || cpsState === 'FLASHING') {
            if (!cpsValidSince.current) cpsValidSince.current = now;
            if (now - cpsValidSince.current >= cooldownDuration) {
              setCpsState('NORMAL');
              setShowCpsToast(false);
              cpsValidSince.current = null;
            } else {
              setCpsState('COOLDOWN');
            }
          } else if (cpsState === 'COOLDOWN') {
            if (cpsValidSince.current && now - cpsValidSince.current >= cooldownDuration) {
              setCpsState('NORMAL');
              setShowCpsToast(false);
              cpsValidSince.current = null;
            }
          }
        }

        if (data.rare_spawn) setRareSpawn(data.rare_spawn);
      }
    } catch { /* network errors non-fatal */ }
  }, [storySession, updateStorySession]);

  useEffect(() => {
    if (!storySession) return;
    tickTimer.current = setInterval(flushTick, TICK_INTERVAL_MS);
    return () => { if (tickTimer.current) clearInterval(tickTimer.current); };
  }, [storySession, flushTick]);

  // ── Event Handlers ────────────────────────────────────────────────────
  const handleEnemyClick = useCallback(() => {
    const cap = Number(gameConfigs['click_rate_cap'] ?? 20);
    const maxPendingPerTick = cap * (TICK_INTERVAL_MS / 1000);
    if (pendingClicks.current < maxPendingPerTick) {
      pendingClicks.current += 1;
    }
  }, [gameConfigs]);

  // Narrative completion auto-trigger
  useEffect(() => {
    if (!storySession || farmMode || showSummary) return;
    const narrativeDone = storySession.narrativeProgressPct >= 100 || storySession.previouslyCompleted;
    const wavesDone = storySession.wavesComplete;
    if (narrativeDone && wavesDone) setShowSummary(true);
  }, [storySession?.narrativeProgressPct, storySession?.wavesComplete, storySession?.previouslyCompleted, farmMode, showSummary, storySession]);

  const handleNarrativeComplete = useCallback(async () => {
    if (!storySession || farmMode) return;
    updateStorySession({ narrativeProgressPct: 100 });
    try {
      await api.post(`/api/game/story/session/${storySession.sessionId}/narrative`,
        { progress_pct: 100 });
    } catch { /* non-fatal */ }
  }, [storySession, updateStorySession, farmMode]);

  const handleWavesComplete = useCallback(() => {
    if (farmMode) return;
    updateStorySession({ wavesComplete: true });
    pendingWavesComplete.current = 1;
    flushTick();
  }, [updateStorySession, farmMode, flushTick]);

  const handleBossDefeated = useCallback(async (success: boolean) => {
    if (!storySession) return;
    if (!success) {
      try {
        await api.post(`/api/game/story/session/${storySession.sessionId}/complete`);
      } catch { /* non-fatal */ }
      exitScene();
      return;
    }
    try {
      const res = await api.post(`/api/game/story/session/${storySession.sessionId}/complete`);
      if (res.ok) {
        const data = await res.json();
        if (data.total_character_essence !== undefined) setEssence(data.total_character_essence);
        onPlayerUpdate();
        if (data.transition_lore_text) {
          setNarrativeReveal({
            text: data.transition_lore_text,
            bossType: data.boss_type,
            unlocks: data.unlocks ?? [],
          });
        } else {
          exitScene();
        }
      }
    } catch (err) {
      console.error('Failed to complete boss session', err);
      exitScene();
    }
  }, [storySession, exitScene, onPlayerUpdate, setEssence]);

  const handleGoldEarned = useCallback((amount: number) => {
    pendingGold.current += amount;
    updateStorySession(prev => ({ sessionGold: prev.sessionGold + amount }));
  }, [updateStorySession]);

  const handleEntityKill = useCallback((entityId: number) => {
    const map = pendingEntityEncounters.current;
    const existing = map.get(entityId);
    if (existing) {
      existing.encounters += 1;
      existing.kills += 1;
    } else {
      map.set(entityId, { encounters: 1, kills: 1 });
    }
  }, []);

  const handleZoneAdvance = useCallback((newZone: number) => {
    updateStorySession({ currentZone: newZone, currentWave: 0 });
  }, [updateStorySession]);

  const handleResetLevel = useCallback(async () => {
    if (!storySession) return;
    if (!window.confirm("DEBUG: Full Reset? (Resets level, gold, and upgrades)")) return;
    try {
      await api.post(`/api/game/story/session/${storySession.sessionId}/complete`);
      window.location.reload();
    } catch {}
  }, [storySession]);

  const handleSettingsUpdate = (newSettings: any) => {
    api.patch('/api/players/me/settings', newSettings).then(() => {
      onPlayerUpdate();
    });
  };

  const handleWpmChange = (newWpm: number) => {
    setUserWpm(newWpm);
    handleSettingsUpdate({ narration_wpm: newWpm });
  };

  const handleExit = async () => {
    await flushTick();
    if (farmMode && !storySession?.isBossSession) {
      setShowSummary(true);
    } else {
      exitScene();
    }
  };

  // ── Derived values ────────────────────────────────────────────────────
  const bothComplete = storySession
    ? (storySession.narrativeProgressPct >= 100 || storySession.previouslyCompleted) && storySession.wavesComplete
    : false;

  const musicState: 'explore' | 'combat' | 'boss' | 'mystery' = (() => {
    if (!storySession) return 'combat';
    if (storySession.isBossSession) return 'boss';
    if (showSummary || narrativeReveal) return 'mystery';
    if (storySession.wavesComplete && !farmMode) return 'explore';
    return 'combat';
  })();

  return {
    // Context state
    state, storySession, reduceMotion, playSFX, exitScene,
    // Local state
    isLoading, gameConfigs, forceOdometerUpdate,
    autoProgress, setAutoProgress,
    debugSuperClick, setDebugSuperClick,
    userWpm, skillTree,
    cpsState, showCpsToast,
    rareSpawn,
    narrativeReveal, setNarrativeReveal,
    farmMode, setFarmMode,
    showSummary, setShowSummary,
    // Handlers
    handleEnemyClick, handleGoldEarned, handleEntityKill,
    handleWavesComplete, handleZoneAdvance,
    handleBossDefeated, handleNarrativeComplete,
    handleResetLevel, handleWpmChange, handleSettingsUpdate, handleExit,
    // Derived
    bothComplete, musicState,
  };
}

export type { Player };
