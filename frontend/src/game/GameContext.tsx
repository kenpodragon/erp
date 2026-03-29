import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { api, apiEvents } from '../api';
import { loadAudioSettings, saveAudioSettingsLocal, type AudioSettings } from './components/AudioSettingsModal';
import { getSFXEngine, destroySFXEngine, type SFXPlayOptions } from './SFXEngine';
export type { AudioSettings };

// ── 3.3: Active booster state ────────────────────────────────────────────────
export interface ActiveBooster {
  boostType: 'xp' | 'essence' | 'drop_rate';
  magnitude: number;
  remainingSeconds: number;
  durationSeconds: number;
  activatedAt: string;
}

// ── Active skill buff (tracks client-side state for hotbar display) ──────────
// ... (rest of file remains same, adding listeners in GameProvider)
export interface ActiveBuff {
  skillId: number;
  skillName: string;
  benefits: Record<string, number>;
  expiresAt: number;   // Date.now() + duration_ms
  cooldownEndsAt: number;
}

// ── Boss config received from session/start ──────────────────────────────────
export interface BossConfig {
  timer_seconds: number;
  hp_multiplier: number;
  interrupt_interval_min: number;
  interrupt_interval_max: number;
  interrupt_window_seconds: number;
  interrupt_refill_seconds: number;
  interrupt_clicks_required: number;
}

// ── Full story session state (mirrors server session + client combat state) ──
export interface StorySession {
  sessionId: string;
  sceneId: number;
  chapterId: number;
  currentZone: number;
  currentWave: number;
  sessionGold: number;
  darkRitualMultiplier: number;
  narrativeProgressPct: number;
  wavesComplete: boolean;
  previouslyCompleted: boolean;
  // Character combat stats (received from session/start)
  characterStrength: number;
  autoDpsPerSecond: number;
  // Levels for flat damage contribution
  clickUpgradeLevel: number;
  autoUpgradeLevel: number;
  // Client-side upgrade multipliers (accumulated locally, synced on tick)
  clickDmgMultiplier: number;
  autoDpsMultiplier: number;
  goldDropMultiplier: number;
  // Boss session fields
  isBossSession: boolean;
  bossType: 'chapter_boss' | 'book_boss' | null;
  bossName?: string;
  bossConfig: BossConfig | null;
  bossVisualData?: import('./components/shared/EntityRenderer').EnemyVisualData;
  isReplay: boolean;
  idle_bonuses?: {
    attack_lvl: number;
    magic_lvl: number;
    lore_lvl: number;
    precision_lvl: number;
    click_damage_floor: number;
    auto_dps_multiplier: number;
    gate_reduction_pct: number;
    essence_multiplier: number;
    crit_chance_bonus: number;
    crit_multiplier_total: number;
  };
}

// ── Overall game state ────────────────────────────────────────────────────────
interface GameState {
  essence: number;
  gold: number;
  activeTrainingId: string | null;
  activeSceneId: string | null;
  activeVisualChapterId: number;
  // Story Mode session (null when not in a session)
  storySession: StorySession | null;
  activeBuffs: ActiveBuff[];
  isOffline: boolean;
  // Audio settings (2.5)
  audioSettings: AudioSettings;
  // Animation toggle (2.6)
  reduceMotion: boolean;
  // 3.3: Active boosters
  activeBoosters: ActiveBooster[];
}

type SessionPatch = Partial<StorySession> | ((prev: StorySession) => Partial<StorySession>);

interface GameContextType {
  state: GameState;
  setEssence: (amount: number) => void;
  setGold: (amount: number) => void;
  startTraining: (skillId: string) => void;
  enterScene: (sceneId: string) => void;
  exitScene: () => void;
  setVisualChapter: (chapterId: number) => void;
  setOffline: (offline: boolean) => void;
  // Story Mode
  setStorySession: (session: StorySession) => void;
  updateStorySession: (patch: SessionPatch) => void;
  clearStorySession: () => void;
  addBuff: (buff: ActiveBuff) => void;
  removeBuff: (skillId: number) => void;
  // Audio (2.5)
  updateAudioSettings: (settings: AudioSettings) => void;
  playSFX: (configKey: string, options?: SFXPlayOptions) => void;
  // Animation toggle (2.6)
  setReduceMotion: (val: boolean) => void;
  // 3.3: Boosters
  setActiveBoosters: (boosters: ActiveBooster[]) => void;
  refreshBoosters: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode; initialEssence?: number }> = ({
  children,
  initialEssence,
}) => {
  const [state, setState] = useState<GameState>({
    essence: initialEssence || 0,
    gold: 0,
    activeTrainingId: null,
    activeSceneId: localStorage.getItem('erp_active_scene_id'),
    activeVisualChapterId: 1,
    storySession: null,
    activeBuffs: [],
    isOffline: false,
    audioSettings: loadAudioSettings(),
    reduceMotion: localStorage.getItem('erp_reduce_motion') === 'true',
    activeBoosters: [],
  });

  useEffect(() => {
    if (initialEssence !== undefined) {
      setState(prev => ({ ...prev, essence: initialEssence }));
    }
  }, [initialEssence]);

  useEffect(() => {
    if (state.activeSceneId) {
      localStorage.setItem('erp_active_scene_id', state.activeSceneId);
    } else {
      localStorage.removeItem('erp_active_scene_id');
    }
  }, [state.activeSceneId]);

  // Prune expired buffs every second
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setState(prev => {
        const filtered = prev.activeBuffs.filter(b => b.expiresAt < 0 || b.expiresAt > now);
        if (filtered.length === prev.activeBuffs.length) return prev;
        return { ...prev, activeBuffs: filtered };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handleOffline = () => setState(prev => ({ ...prev, isOffline: true }));
    const handleOnline = () => setState(prev => ({ ...prev, isOffline: false }));

    apiEvents.addEventListener('api-offline', handleOffline);
    apiEvents.addEventListener('api-online', handleOnline);

    return () => {
      apiEvents.removeEventListener('api-offline', handleOffline);
      apiEvents.removeEventListener('api-online', handleOnline);
    };
  }, []);

  // 2.6.0: Set initial body class for reduce-motion on mount
  useEffect(() => {
    if (state.reduceMotion) {
      document.body.classList.add('reduce-motion');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setReduceMotion = useCallback((val: boolean) => {
    setState(prev => ({ ...prev, reduceMotion: val }));
    localStorage.setItem('erp_reduce_motion', String(val));
    if (val) {
      document.body.classList.add('reduce-motion');
    } else {
      document.body.classList.remove('reduce-motion');
    }
  }, []);

  const setEssence = (amount: number) =>
    setState(prev => ({ ...prev, essence: amount }));

  const setGold = (amount: number) =>
    setState(prev => ({ ...prev, gold: amount }));

  const startTraining = (skillId: string) =>
    setState(prev => ({ ...prev, activeTrainingId: skillId }));

  const enterScene = (sceneId: string) =>
    setState(prev => ({ ...prev, activeSceneId: sceneId, gold: 0 }));

  const exitScene = () =>
    setState(prev => ({ ...prev, activeSceneId: null, storySession: null, activeBuffs: [] }));

  const setVisualChapter = (chapterId: number) =>
    setState(prev => ({ ...prev, activeVisualChapterId: chapterId }));

  const setOffline = (offline: boolean) =>
    setState(prev => ({ ...prev, isOffline: offline }));

  const setStorySession = (session: StorySession) =>
    setState(prev => ({ ...prev, storySession: session }));

  const updateStorySession = (patch: SessionPatch) =>
    setState(prev => {
      if (!prev.storySession) return prev;
      const resolved = typeof patch === 'function' ? patch(prev.storySession) : patch;
      return { ...prev, storySession: { ...prev.storySession, ...resolved } };
    });

  const clearStorySession = () =>
    setState(prev => ({ ...prev, storySession: null, activeBuffs: [] }));

  const addBuff = (buff: ActiveBuff) =>
    setState(prev => ({
      ...prev,
      activeBuffs: [
        ...prev.activeBuffs.filter(b => b.skillId !== buff.skillId),
        buff,
      ],
    }));

  const removeBuff = (skillId: number) =>
    setState(prev => ({
      ...prev,
      activeBuffs: prev.activeBuffs.filter(b => b.skillId !== skillId),
    }));

  const updateAudioSettings = useCallback((settings: AudioSettings) => {
    setState(prev => ({ ...prev, audioSettings: settings }));
    saveAudioSettingsLocal(settings);
    getSFXEngine().updateSettings(settings);
  }, []);

  // Initialize SFXEngine: load configs from API + sync settings
  const sfxInitRef = useRef(false);
  useEffect(() => {
    if (sfxInitRef.current) return;
    sfxInitRef.current = true;
    const engine = getSFXEngine();
    engine.updateSettings(state.audioSettings);
    api.get('/api/game/audio/sfx-configs')
      .then(r => r.ok ? r.json() : null)
      .then(configs => { if (configs) engine.loadConfigs(configs); })
      .catch(() => {});
    return () => { destroySFXEngine(); };
  }, []);

  // Keep SFX engine in sync with audio settings changes
  useEffect(() => {
    getSFXEngine().updateSettings(state.audioSettings);
  }, [state.audioSettings]);

  const playSFX = useCallback((configKey: string, options?: SFXPlayOptions) => {
    getSFXEngine().play(configKey, options);
  }, []);

  // 3.3: Booster state management
  const setActiveBoosters = useCallback((boosters: ActiveBooster[]) => {
    setState(prev => ({ ...prev, activeBoosters: boosters }));
  }, []);

  const refreshBoosters = useCallback(() => {
    api.get('/api/shop/boosters')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data)) {
          const mapped: ActiveBooster[] = data.map((b: any) => ({
            boostType: b.boost_type,
            magnitude: b.magnitude,
            remainingSeconds: b.remaining_seconds,
            durationSeconds: b.duration_seconds,
            activatedAt: b.activated_at || '',
          }));
          setState(prev => ({ ...prev, activeBoosters: mapped }));
        }
      })
      .catch(() => {});
  }, []);

  // 3.3: Booster ping polling — sends elapsed time every 30s during active sessions
  useEffect(() => {
    const hasActiveSession = state.activeSceneId || state.activeTrainingId;
    const hasBoosters = state.activeBoosters.length > 0;
    if (!hasActiveSession || !hasBoosters) return;

    const PING_INTERVAL = 30000; // 30 seconds
    const id = setInterval(() => {
      api.post('/api/shop/booster-ping', { elapsed_seconds: 30 }).catch(() => {});
    }, PING_INTERVAL);

    return () => clearInterval(id);
  }, [state.activeSceneId, state.activeTrainingId, state.activeBoosters.length]);

  // 3.3: Client-side countdown for booster display (cosmetic, not source of truth)
  useEffect(() => {
    if (state.activeBoosters.length === 0) return;
    const id = setInterval(() => {
      setState(prev => {
        const updated = prev.activeBoosters
          .map(b => ({ ...b, remainingSeconds: b.remainingSeconds - 1 }))
          .filter(b => b.remainingSeconds > 0);
        if (updated.length === prev.activeBoosters.length &&
            updated.every((b, i) => b.remainingSeconds === prev.activeBoosters[i].remainingSeconds - 1)) {
          // Normal tick
        }
        return { ...prev, activeBoosters: updated };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state.activeBoosters.length]);

  return (
    <GameContext.Provider
      value={{
        state,
        setEssence,
        setGold,
        startTraining,
        enterScene,
        exitScene,
        setVisualChapter,
        setStorySession,
        updateStorySession,
        clearStorySession,
        addBuff,
        removeBuff,
        updateAudioSettings,
        playSFX,
        setReduceMotion,
        setActiveBoosters,
        refreshBoosters,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
