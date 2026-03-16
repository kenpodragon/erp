import React, { useEffect, useCallback, useRef } from 'react';
import { useGame } from '../GameContext';
import { api } from '../../api';
import GlobalHeader from './story/GlobalHeader';
import NarrativeBlock from './story/NarrativeBlock';
import CombatStage from './story/CombatStage';
import BossStage from './story/BossStage';
import NarrativeReveal from './story/NarrativeReveal';
import StoryModeDashboard from './story/StoryModeDashboard';
import type { StorySession } from '../GameContext';
import { applyClassVisuals } from '../utils/classVisuals';
import './StoryMode.css';

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

interface StoryModeProps {
  player: Player | null;
  onPlayerUpdate: () => void;
  showSummaryExternal?: boolean;
  onShowSummaryChange?: (val: boolean) => void;
  externalFarmMode?: boolean;
  onFarmModeChange?: (val: boolean) => void;
}

const StoryMode: React.FC<StoryModeProps> = ({ 
  player, 
  onPlayerUpdate,
  showSummaryExternal = false,
  onShowSummaryChange,
  externalFarmMode = false,
  onFarmModeChange
}) => {
  const { state, exitScene, setStorySession, updateStorySession, setEssence, setGold, playSFX } = useGame();
  const { activeSceneId, storySession, reduceMotion } = state;

  const pendingClicks = useRef(0);
  const pendingGold = useRef(0);
  const pendingWavesComplete = useRef(0);
  const pendingEntityEncounters = useRef<Map<number, { encounters: number; kills: number }>>(new Map());
  const lastTickAt = useRef(Date.now());
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const [isLoading, setIsLoading] = React.useState(true);
  const [farmMode, setFarmMode] = React.useState(false);
  const [gameConfigs, setGameConfigs] = React.useState<Record<string, unknown>>({});
  const [forceOdometerUpdate, setForceOdometerUpdate] = React.useState(false);
  const [autoProgress, setAutoProgress] = React.useState(true);
  const [debugSuperClick, setDebugSuperClick] = React.useState(false);
  const [userWpm, setUserWpm] = React.useState(200);
  const [skillTree, setSkillTree] = React.useState<any[]>([]);
  // 2.6.1: CPS state machine (NORMAL→FLASHING→WARNING→COOLDOWN)
  const [cpsState, setCpsState] = React.useState<'NORMAL' | 'FLASHING' | 'WARNING' | 'COOLDOWN'>('NORMAL');
  const cpsViolationStart = useRef<number | null>(null);
  const cpsValidSince = useRef<number | null>(null);
  const [showCpsToast, setShowCpsToast] = React.useState(false);
  // 2.6.2: Rare spawn from tick
  const [rareSpawn, setRareSpawn] = React.useState<{
    entity_id: number; canonical_name: string; entity_type_id: number;
    entity_family_id: number | null; base_hp: number; base_gold: number;
    sprite_key: string | null;
  } | null>(null);
  // Boss session state
  const [narrativeReveal, setNarrativeReveal] = React.useState<{
    text: string;
    bossType: 'chapter_boss' | 'book_boss';
    chapterTitle?: string;
    unlocks: string[];
  } | null>(null);

  // Sync farmMode with external if needed
  useEffect(() => {
    if (externalFarmMode !== farmMode) {
      setFarmMode(externalFarmMode);
    }
  }, [externalFarmMode]);

  const setShowSummary = (val: boolean) => {
    onShowSummaryChange?.(val);
  };
  const showSummary = showSummaryExternal;

  // ── Session Initialisation ──────────────────────────────────────────────
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

          // If it was already completed, we can start in farmMode ONLY if 
          // we don't want the user to go through the 'Scene Complete' flow again.
          // BUT the user wants the popup to show even on replays.
          // So we only set farmMode if it's a resume of an ALREADY farming session.
          if (session.wavesComplete && session.narrativeProgressPct >= 100 && !session.isReplay && !session.isBossSession) {
            setFarmMode(true);
          }
        } else {
          // Session start failed (e.g. stale localStorage scene from a deleted character).
          // Exit cleanly back to the overworld so the user isn't stuck.
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
      applyClassVisuals(null); // Clear class CSS vars on unmount
    };
  }, [activeSceneId, player]);

  // ── Batch Tick Loop ─────────────────────────────────────────────────────
  const flushTick = useCallback(async () => {
    if (!storySession) return;
    const now = Date.now();
    const elapsed = now - lastTickAt.current;
    const clicks = pendingClicks.current;
    const goldDelta = pendingGold.current;
    const wavesCompletedDelta = pendingWavesComplete.current;

    // 2.6.2: Flush entity encounters
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

        // 2.6.2: Handle rare spawn from tick
        if (data.rare_spawn) {
          setRareSpawn(data.rare_spawn);
        }
      }
    } catch { /* network errors non-fatal */ }
  }, [storySession, updateStorySession]);

  useEffect(() => {
    if (!storySession) return;
    tickTimer.current = setInterval(flushTick, TICK_INTERVAL_MS);
    return () => { if (tickTimer.current) clearInterval(tickTimer.current); };
  }, [storySession, flushTick]);

  // ── Click Handler ───────────────────────────────────────────────────────
  const handleEnemyClick = useCallback(() => {
    const cap = Number(gameConfigs['click_rate_cap'] ?? 20);
    const maxPendingPerTick = cap * (TICK_INTERVAL_MS / 1000);
    if (pendingClicks.current < maxPendingPerTick) {
      pendingClicks.current += 1;
    }
  }, [gameConfigs]);

  // ── Narrative Complete ──────────────────────────────────────────────────
  useEffect(() => {
    if (!storySession || farmMode || showSummary) return;
    
    // On replays, narrative is technically already "done" for the sake of the completion gate.
    const narrativeDone = storySession.narrativeProgressPct >= 100 || storySession.previouslyCompleted;
    const wavesDone = storySession.wavesComplete;
    
    // Show the summary automatically once both conditions are met.
    if (narrativeDone && wavesDone) {
      setShowSummary(true);
    }
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

  // ── Boss Defeated ───────────────────────────────────────────────────────
  const handleBossDefeated = useCallback(async (success: boolean) => {
    if (!storySession) return;
    if (!success) {
      // Timer expired — return to overworld silently
      try {
        await api.post(`/api/game/story/session/${storySession.sessionId}/complete`);
      } catch { /* non-fatal */ }
      exitScene();
      return;
    }
    // Boss killed — complete session and show narrative reveal
    try {
      const res = await api.post(`/api/game/story/session/${storySession.sessionId}/complete`);
      if (res.ok) {
        const data = await res.json();
        if (data.total_character_essence !== undefined) {
          setEssence(data.total_character_essence);
        }
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

  // ── Gold Award from Kills ───────────────────────────────────────────────
  const handleGoldEarned = useCallback((amount: number) => {
    pendingGold.current += amount;
    updateStorySession(prev => ({ sessionGold: prev.sessionGold + amount }));
  }, [updateStorySession]);

  // ── 2.6.2: Entity Kill Tracking ──────────────────────────────────────────
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

  const handleSettingsUpdate = (newSettings: any) => {
    api.patch('/api/players/me/settings', newSettings).then(() => {
      onPlayerUpdate();
    });
  };

  if (isLoading || !storySession) {
    return (
      <div className="story-loading">
        <div className="story-loading-spinner" />
        <p>Entering the Tower...</p>
      </div>
    );
  }

  const bothComplete = (storySession.narrativeProgressPct >= 100 || storySession.previouslyCompleted) && storySession.wavesComplete;

  // Derive music state for MusicManager
  const musicState: 'explore' | 'combat' | 'boss' | 'mystery' = (() => {
    if (storySession.isBossSession) return 'boss';
    if (showSummary || narrativeReveal) return 'mystery';
    if (storySession.wavesComplete && !farmMode) return 'explore';
    return 'combat';
  })();

  // ── Boss Mode Layout ────────────────────────────────────────────────────
  if (storySession.isBossSession) {
    return (
      <div className="story-mode story-mode--boss">
        <GlobalHeader
          chapterId={storySession.chapterId}
          sceneId={storySession.sceneId}
          darkRitualMultiplier={storySession.darkRitualMultiplier}
          activeBuffs={state.activeBuffs}
          musicState={musicState}
          bossEntityId={null}
        />

        <div className="boss-mode-wrapper">
          {storySession.isReplay && (
            <div className="boss-replay-badge">REPLAY — No rewards on re-clear</div>
          )}
          <BossStage
            session={storySession}
            gameConfigs={gameConfigs}
            onEnemyClick={handleEnemyClick}
            onGoldEarned={handleGoldEarned}
            onBossDefeated={handleBossDefeated}
            textScale={player?.settings?.game_text_scale || 1.0}
            debugSuperClick={debugSuperClick}
            playSFX={playSFX}
            reduceMotion={reduceMotion}
          />
          {player?.is_game_admin && (
            <div className="story-controls-bar">
              <button
                className={`debug-toggle-btn ${debugSuperClick ? 'active' : ''}`}
                onClick={() => setDebugSuperClick(!debugSuperClick)}
                title="One-click kills (Admin Only)"
              >
                SUPER CLICK: {debugSuperClick ? 'ON' : 'OFF'}
              </button>
            </div>
          )}
        </div>

        <button className="story-exit-btn" onClick={handleExit} title="Retreat">RETREAT</button>

        {narrativeReveal && (
          <NarrativeReveal
            loreText={narrativeReveal.text}
            bossType={narrativeReveal.bossType}
            unlocks={narrativeReveal.unlocks}
            onContinue={() => {
              setNarrativeReveal(null);
              exitScene();
            }}
            reduceMotion={reduceMotion}
          />
        )}
      </div>
    );
  }

  // ── Normal Mode Layout ──────────────────────────────────────────────────
  return (
    <div className="story-mode">
      <GlobalHeader
        chapterId={storySession.chapterId}
        sceneId={storySession.sceneId}
        darkRitualMultiplier={storySession.darkRitualMultiplier}
        activeBuffs={state.activeBuffs}
        musicState={musicState}
      />

      <div className="story-main">
        {/* 1. Left Column: Narrative */}
        <div className="narrative-col">
          <NarrativeBlock
            sceneId={storySession.sceneId}
            onComplete={handleNarrativeComplete}
            wpm={userWpm}
            onWpmChange={handleWpmChange}
            fontSize={player?.settings?.narration_font_size || 14}
            onFontSizeChange={(newSize) => handleSettingsUpdate({ narration_font_size: newSize })}
            disabled={farmMode}
          />
        </div>

        {/* 2. Center Column: Combat Area */}
        <div className="story-center">
          <CombatStage
            session={storySession}
            gameConfigs={gameConfigs}
            onEnemyClick={handleEnemyClick}
            onGoldEarned={handleGoldEarned}
            onEntityKill={handleEntityKill}
            onWavesComplete={handleWavesComplete}
            onZoneAdvance={handleZoneAdvance}
            textScale={player?.settings?.game_text_scale || 1.0}
            extraWavesMode={farmMode || (storySession.wavesComplete && storySession.narrativeProgressPct < 100)}
            autoProgress={autoProgress}
            onAutoProgressToggle={setAutoProgress}
            debugSuperClick={debugSuperClick}
            narrativeProgressPct={storySession.narrativeProgressPct}
            playSFX={playSFX}
            reduceMotion={reduceMotion}
            rareSpawn={rareSpawn}
          />

          <div className="story-controls-bar">
            <button
              className={`auto-prog-btn ${autoProgress ? 'auto-prog-btn--on' : 'auto-prog-btn--off'}`}
              onClick={() => setAutoProgress(!autoProgress)}
            >
              AUTO PROGRESS: {autoProgress ? 'ON' : 'OFF'}
            </button>
            {player?.is_game_admin && (
              <>
                <button
                  className={`debug-toggle-btn ${debugSuperClick ? 'active' : ''}`}
                  onClick={() => setDebugSuperClick(!debugSuperClick)}
                  title="One-click kills (Admin Only)"
                >
                  SUPER CLICK: {debugSuperClick ? 'ON' : 'OFF'}
                </button>
                <button className="debug-btn" onClick={handleResetLevel}>RESET SESSION (ADMIN)</button>
              </>
            )}
          </div>
        </div>
      </div>

      <button className="story-exit-btn" onClick={handleExit} title="Save and Exit">EXIT SCENE</button>

      <StoryModeDashboard
        session={storySession}
        gameConfigs={gameConfigs}
        skillTree={skillTree}
        onPlayerUpdate={onPlayerUpdate}
        uiScale={player?.settings?.ui_scale || 1.0}
        gameTextScale={player?.settings?.game_text_scale || 1.0}
        onSettingsChange={handleSettingsUpdate}
        cpsValid={cpsState === 'NORMAL' || cpsState === 'COOLDOWN'}
        reduceMotion={reduceMotion}
      />

      {/* 2.6.1: CPS Warning Toast */}
      {showCpsToast && (
        <div className="cps-warning-toast">
          Excessive automated clicking detected. Max {gameConfigs['click_rate_cap'] ?? 20} CPS is recorded.
        </div>
      )}

      {/* Dual-condition gate indicator */}
      {bothComplete && !showSummary && !farmMode && (
        <div className="story-gate-ready" onClick={() => setShowSummary(true)}>
          &#9733; SCENE COMPLETE — Click to claim rewards &#9733;
        </div>
      )}
    </div>
  );
};

export default StoryMode;
