import React, { useEffect, useCallback, useRef } from 'react';
import { useGame } from '../GameContext';
import { api } from '../../api';
import GlobalHeader from './story/GlobalHeader';
import NarrativeBlock from './story/NarrativeBlock';
import CombatStage from './story/CombatStage';
import BossStage from './story/BossStage';
import NarrativeReveal from './story/NarrativeReveal';
import AudioPlayer from './story/AudioPlayer';
import HeroStats from './story/HeroStats';
import GoldOdometer from './story/GoldOdometer';
import SkillsHotbar from './story/SkillsHotbar';
import UpgradeMenu from './story/UpgradeMenu';
import PostBattleSummary from './story/PostBattleSummary';
import type { StorySession } from '../GameContext';
import './StoryMode.css';

const TICK_INTERVAL_MS = 2000;

interface Player {
  id: number;
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
}

const StoryMode: React.FC<StoryModeProps> = ({ player, onPlayerUpdate }) => {
  const { state, exitScene, setStorySession, updateStorySession } = useGame();
  const { activeSceneId, storySession } = state;

  const pendingClicks = useRef(0);
  const pendingGold = useRef(0);
  const pendingWavesComplete = useRef(0);
  const lastTickAt = useRef(Date.now());
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const [isLoading, setIsLoading] = React.useState(true);
  const [showSummary, setShowSummary] = React.useState(false);
  const [farmMode, setFarmMode] = React.useState(false);
  const [gameConfigs, setGameConfigs] = React.useState<Record<string, unknown>>({});
  const [forceOdometerUpdate, setForceOdometerUpdate] = React.useState(false);
  const [autoProgress, setAutoProgress] = React.useState(true);
  const [debugSuperClick, setDebugSuperClick] = React.useState(false);
  const [userWpm, setUserWpm] = React.useState(200);
  // Boss session state
  const [narrativeReveal, setNarrativeReveal] = React.useState<{
    text: string;
    bossType: 'chapter_boss' | 'book_boss';
    chapterTitle?: string;
    unlocks: string[];
  } | null>(null);

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
            bossConfig: sessionData.boss_config ?? null,
            isReplay: sessionData.is_replay ?? false,
          };
          setStorySession(session);
          setUserWpm(player?.settings?.narration_wpm || 200);

          if (session.wavesComplete && (session.narrativeProgressPct >= 100 || session.previouslyCompleted)) {
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

    pendingClicks.current = 0;
    pendingGold.current = 0;
    pendingWavesComplete.current = 0;
    lastTickAt.current = now;

    try {
      const res = await api.post(
        `/api/game/story/session/${storySession.sessionId}/tick`,
        {
          clicks,
          elapsed_ms: elapsed,
          zone: storySession.currentZone,
          wave: storySession.currentWave,
          gold_delta: goldDelta,
          waves_completed_delta: wavesCompletedDelta,
        }
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
    
    const narrativeDone = storySession.narrativeProgressPct >= 100;
    const wavesDone = storySession.wavesComplete;
    
    // Only show the summary automatically if it's NOT previously completed
    // and both conditions are met.
    if (!storySession.previouslyCompleted && narrativeDone && wavesDone) {
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

  // ── Session Complete ────────────────────────────────────────────────────
  const handleComplete = useCallback(async (continueFarming: boolean) => {
    if (!storySession) return;
    setShowSummary(false);
    if (continueFarming) {
      setFarmMode(true);
      return;
    }
    try {
      const res = await api.post(`/api/game/story/session/${storySession.sessionId}/complete`);
      if (res.ok) {
        onPlayerUpdate(); // Refresh global balance and next level
        exitScene();
      }
    } catch (err) {
      console.error('Failed to complete session', err);
    }
  }, [storySession, exitScene, onPlayerUpdate]);

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
  }, [storySession, exitScene, onPlayerUpdate]);

  // ── Gold Award from Kills ───────────────────────────────────────────────
  const handleGoldEarned = useCallback((amount: number) => {
    pendingGold.current += amount;
    updateStorySession(prev => ({ sessionGold: prev.sessionGold + amount }));
  }, [updateStorySession]);

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
    api.patch('/api/players/me/settings', { narration_wpm: newWpm }).catch(() => {});
  };

  const handleExit = async () => {
    await flushTick();
    if (farmMode) {
      setShowSummary(true);
    } else {
      exitScene();
    }
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

  // ── Boss Mode Layout ────────────────────────────────────────────────────
  if (storySession.isBossSession) {
    return (
      <div className="story-mode story-mode--boss">
        <GlobalHeader
          chapterId={storySession.chapterId}
          sceneId={storySession.sceneId}
          darkRitualMultiplier={storySession.darkRitualMultiplier}
          activeBuffs={state.activeBuffs}
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
          />
          <div className="story-controls-bar">
            <button
              className={`debug-toggle-btn ${debugSuperClick ? 'active' : ''}`}
              onClick={() => setDebugSuperClick(!debugSuperClick)}
              title="One-click kills (Debug Only)"
            >
              SUPER CLICK: {debugSuperClick ? 'ON' : 'OFF'}
            </button>
          </div>
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
            onWavesComplete={handleWavesComplete}
            onZoneAdvance={handleZoneAdvance}
            textScale={player?.settings?.game_text_scale || 1.0}
            extraWavesMode={farmMode}
            autoProgress={autoProgress}
            onAutoProgressToggle={setAutoProgress}
            debugSuperClick={debugSuperClick}
            narrativeProgressPct={storySession.narrativeProgressPct}
          />

          <div className="story-controls-bar">
            <button
              className={`auto-prog-btn ${autoProgress ? 'auto-prog-btn--on' : 'auto-prog-btn--off'}`}
              onClick={() => setAutoProgress(!autoProgress)}
            >
              AUTO PROGRESS: {autoProgress ? 'ON' : 'OFF'}
            </button>
            <button
              className={`debug-toggle-btn ${debugSuperClick ? 'active' : ''}`}
              onClick={() => setDebugSuperClick(!debugSuperClick)}
              title="One-click kills (Debug Only)"
            >
              SUPER CLICK: {debugSuperClick ? 'ON' : 'OFF'}
            </button>
            <button className="debug-btn" onClick={handleResetLevel}>RESET SESSION (DEBUG)</button>
          </div>
        </div>

        {/* 3. Right Column: Hero Dashboard */}
        <div className="story-right-panel">
          <GoldOdometer gold={storySession.sessionGold} forceUpdate={forceOdometerUpdate} />
          <HeroStats session={storySession} />
          <UpgradeMenu session={storySession} gameConfigs={gameConfigs} />
          <SkillsHotbar session={storySession} gameConfigs={gameConfigs} />
        </div>
      </div>

      <AudioPlayer chapterId={storySession.chapterId} />

      <button className="story-exit-btn" onClick={handleExit} title="Save and Exit">EXIT SCENE</button>

      {showSummary && (
        <PostBattleSummary
          session={storySession}
          onContinue={() => handleComplete(true)}
          onReturnToHub={() => handleComplete(false)}
        />
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
