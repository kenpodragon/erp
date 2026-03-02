import React, { useEffect, useCallback, useRef } from 'react';
import { useGame } from '../GameContext';
import { api } from '../../api';
import GlobalHeader from './story/GlobalHeader';
import NarrativeBlock from './story/NarrativeBlock';
import CombatStage from './story/CombatStage';
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
}

const StoryMode: React.FC<StoryModeProps> = ({ player }) => {
  const { state, exitScene, setStorySession, updateStorySession } = useGame();
  const { activeSceneId, storySession } = state;

  const pendingClicks = useRef(0);
  const pendingGold = useRef(0);
  const lastTickAt = useRef(Date.now());
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const [isLoading, setIsLoading] = React.useState(true);
  const [showSummary, setShowSummary] = React.useState(false);
  const [farmMode, setFarmMode] = React.useState(false);
  const [gameConfigs, setGameConfigs] = React.useState<Record<string, unknown>>({});
  const [forceOdometerUpdate, setForceOdometerUpdate] = React.useState(false);

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
          };
          setStorySession(session);
          
          if (session.wavesComplete && (session.narrativeProgressPct >= 100 || session.previouslyCompleted)) {
            setFarmMode(true);
          }
        }
      } catch (err) {
        console.error('StoryMode: failed to start session', err);
      } finally {
        setIsLoading(false);
      }
    };

    start();
    return () => {
      if (tickTimer.current) clearInterval(tickTimer.current);
    };
  }, [activeSceneId]);

  // ── Batch Tick Loop ─────────────────────────────────────────────────────
  const flushTick = useCallback(async () => {
    if (!storySession) return;
    const now = Date.now();
    const elapsed = now - lastTickAt.current;
    const clicks = pendingClicks.current;
    const goldDelta = pendingGold.current;
    pendingClicks.current = 0;
    pendingGold.current = 0;
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
          waves_completed_delta: 0,
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
  const checkDualCondition = useCallback((narrativeDone: boolean, wavesDone: boolean) => {
    if (farmMode) return;
    const narrativeEffective = narrativeDone || storySession?.previouslyCompleted;
    if (narrativeEffective && wavesDone) {
      setShowSummary(true);
    }
  }, [farmMode, storySession?.previouslyCompleted]);

  const handleNarrativeComplete = useCallback(async () => {
    if (!storySession || farmMode) return;
    updateStorySession({ narrativeProgressPct: 100 });
    try {
      await api.post(`/api/game/story/session/${storySession.sessionId}/narrative`,
        { progress_pct: 100 });
    } catch { /* non-fatal */ }
    checkDualCondition(true, storySession.wavesComplete);
  }, [storySession, updateStorySession, farmMode, checkDualCondition]);

  const handleWavesComplete = useCallback(() => {
    if (farmMode) return;
    updateStorySession({ wavesComplete: true });
    checkDualCondition(storySession?.narrativeProgressPct === 100, true);
  }, [storySession, updateStorySession, farmMode, checkDualCondition]);

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
        exitScene();
      }
    } catch (err) {
      console.error('Failed to complete session', err);
    }
  }, [storySession, exitScene]);

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
    if (!window.confirm("DEBUG: Reset current session to start? (No essence/gold lost)")) return;
    updateStorySession({ currentZone: 1, currentWave: 0 });
    try {
      await api.post(`/api/game/story/session/${storySession.sessionId}/tick`, {
        clicks: 0, elapsed_ms: 100, zone: 1, wave: 0, gold_delta: 0, waves_completed_delta: 0
      });
    } catch {}
  }, [storySession, updateStorySession]);

  const handleExit = async () => {
    await flushTick();
    exitScene();
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
            wpm={player?.settings?.narration_wpm || 200}
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
          />
          
          <div className="story-debug-controls">
            <button className="debug-btn" onClick={handleResetLevel}>RESET LEVEL (DEBUG)</button>
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
