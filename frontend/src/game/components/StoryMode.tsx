import React from 'react';
import GlobalHeader from './story/GlobalHeader';
import NarrativeBlock from './story/NarrativeBlock';
import CombatStage from './story/CombatStage';
import BossStage from './story/BossStage';
import NarrativeReveal from './story/NarrativeReveal';
import StoryModeDashboard from './story/StoryModeDashboard';
import { useStorySession } from './useStorySession';
import type { Player } from './useStorySession';
import './StoryMode.css';

interface StoryModeProps {
  player: Player | null;
  onPlayerUpdate: () => void;
  showSummaryExternal?: boolean;
  onShowSummaryChange?: (val: boolean) => void;
  externalFarmMode?: boolean;
  onFarmModeChange?: (val: boolean) => void;
}

const StoryMode: React.FC<StoryModeProps> = ({
  player, onPlayerUpdate,
  showSummaryExternal = false, onShowSummaryChange,
  externalFarmMode = false, onFarmModeChange,
}) => {
  const s = useStorySession({
    player, onPlayerUpdate,
    showSummaryExternal, onShowSummaryChange,
    externalFarmMode, onFarmModeChange,
  });

  if (s.isLoading || !s.storySession) {
    return (
      <div className="story-loading">
        <div className="story-loading-spinner" />
        <p>Entering the Tower...</p>
      </div>
    );
  }

  const session = s.storySession;

  // ── Boss Mode Layout ──────────────────────────────────────────────────
  if (session.isBossSession) {
    return (
      <div className="story-mode story-mode--boss">
        <GlobalHeader
          chapterId={session.chapterId}
          sceneId={session.sceneId}
          darkRitualMultiplier={session.darkRitualMultiplier}
          activeBuffs={s.state.activeBuffs}
          musicState={s.musicState}
          bossEntityId={null}
        />

        <div className="boss-mode-wrapper">
          {session.isReplay && (
            <div className="boss-replay-badge">REPLAY — No rewards on re-clear</div>
          )}
          <BossStage
            session={session}
            gameConfigs={s.gameConfigs}
            onEnemyClick={s.handleEnemyClick}
            onGoldEarned={s.handleGoldEarned}
            onBossDefeated={s.handleBossDefeated}
            textScale={player?.settings?.game_text_scale || 1.0}
            debugSuperClick={s.debugSuperClick}
            playSFX={s.playSFX}
            reduceMotion={s.reduceMotion}
          />
          {player?.is_game_admin && (
            <div className="story-controls-bar">
              <button
                className={`debug-toggle-btn ${s.debugSuperClick ? 'active' : ''}`}
                onClick={() => s.setDebugSuperClick(!s.debugSuperClick)}
                title="One-click kills (Admin Only)"
              >
                SUPER CLICK: {s.debugSuperClick ? 'ON' : 'OFF'}
              </button>
            </div>
          )}
        </div>

        <button className="story-exit-btn" onClick={s.handleExit} title="Retreat">RETREAT</button>

        {s.narrativeReveal && (
          <NarrativeReveal
            loreText={s.narrativeReveal.text}
            bossType={s.narrativeReveal.bossType}
            unlocks={s.narrativeReveal.unlocks}
            onContinue={() => {
              s.setNarrativeReveal(null);
              s.exitScene();
            }}
            reduceMotion={s.reduceMotion}
          />
        )}
      </div>
    );
  }

  // ── Normal Mode Layout ────────────────────────────────────────────────
  return (
    <div className="story-mode">
      <GlobalHeader
        chapterId={session.chapterId}
        sceneId={session.sceneId}
        darkRitualMultiplier={session.darkRitualMultiplier}
        activeBuffs={s.state.activeBuffs}
        musicState={s.musicState}
      />

      <div className="story-main">
        {/* Left Column: Narrative */}
        <div className="narrative-col">
          <NarrativeBlock
            sceneId={session.sceneId}
            onComplete={s.handleNarrativeComplete}
            wpm={s.userWpm}
            onWpmChange={s.handleWpmChange}
            fontSize={player?.settings?.narration_font_size || 14}
            onFontSizeChange={(newSize) => s.handleSettingsUpdate({ narration_font_size: newSize })}
            disabled={s.farmMode}
          />
        </div>

        {/* Center Column: Combat Area */}
        <div className="story-center">
          <CombatStage
            session={session}
            gameConfigs={s.gameConfigs}
            onEnemyClick={s.handleEnemyClick}
            onGoldEarned={s.handleGoldEarned}
            onEntityKill={s.handleEntityKill}
            onWavesComplete={s.handleWavesComplete}
            onZoneAdvance={s.handleZoneAdvance}
            textScale={player?.settings?.game_text_scale || 1.0}
            extraWavesMode={s.farmMode || (session.wavesComplete && session.narrativeProgressPct < 100)}
            autoProgress={s.autoProgress}
            onAutoProgressToggle={s.setAutoProgress}
            debugSuperClick={s.debugSuperClick}
            narrativeProgressPct={session.narrativeProgressPct}
            playSFX={s.playSFX}
            reduceMotion={s.reduceMotion}
            rareSpawn={s.rareSpawn}
          />

          <div className="story-controls-bar">
            <button
              className={`auto-prog-btn ${s.autoProgress ? 'auto-prog-btn--on' : 'auto-prog-btn--off'}`}
              onClick={() => s.setAutoProgress(!s.autoProgress)}
            >
              AUTO PROGRESS: {s.autoProgress ? 'ON' : 'OFF'}
            </button>
            {player?.is_game_admin && (
              <>
                <button
                  className={`debug-toggle-btn ${s.debugSuperClick ? 'active' : ''}`}
                  onClick={() => s.setDebugSuperClick(!s.debugSuperClick)}
                  title="One-click kills (Admin Only)"
                >
                  SUPER CLICK: {s.debugSuperClick ? 'ON' : 'OFF'}
                </button>
                <button className="debug-btn" onClick={s.handleResetLevel}>RESET SESSION (ADMIN)</button>
              </>
            )}
          </div>
        </div>
      </div>

      <button className="story-exit-btn" onClick={s.handleExit} title="Save and Exit">EXIT SCENE</button>

      <StoryModeDashboard
        session={session}
        gameConfigs={s.gameConfigs}
        skillTree={s.skillTree}
        onPlayerUpdate={onPlayerUpdate}
        uiScale={player?.settings?.ui_scale || 1.0}
        gameTextScale={player?.settings?.game_text_scale || 1.0}
        onSettingsChange={s.handleSettingsUpdate}
        cpsValid={s.cpsState === 'NORMAL' || s.cpsState === 'COOLDOWN'}
        reduceMotion={s.reduceMotion}
      />

      {s.showCpsToast && (
        <div className="cps-warning-toast">
          Excessive automated clicking detected. Max {s.gameConfigs['click_rate_cap'] ?? 20} CPS is recorded.
        </div>
      )}

      {s.bothComplete && !s.showSummary && !s.farmMode && (
        <div className="story-gate-ready" onClick={() => s.setShowSummary(true)}>
          &#9733; SCENE COMPLETE — Click to claim rewards &#9733;
        </div>
      )}
    </div>
  );
};

export default StoryMode;
