import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { apiEvents } from '../api';

// ── Active skill buff (tracks client-side state for hotbar display) ──────────
// ... (rest of file remains same, adding listeners in GameProvider)
export interface ActiveBuff {
  skillId: number;
  skillName: string;
  benefits: Record<string, number>;
  expiresAt: number;   // Date.now() + duration_ms
  cooldownEndsAt: number;
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
}

type SessionPatch = Partial<StorySession> | ((prev: StorySession) => Partial<StorySession>);

interface GameContextType {
  state: GameState;
  updateEssence: (amount: number) => void;
  updateGold: (amount: number) => void;
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
    activeSceneId: null,
    activeVisualChapterId: 1,
    storySession: null,
    activeBuffs: [],
    isOffline: false,
  });

  useEffect(() => {
    if (initialEssence !== undefined) {
      setState(prev => ({ ...prev, essence: initialEssence }));
    }
  }, [initialEssence]);

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

  const updateEssence = (amount: number) =>
    setState(prev => ({ ...prev, essence: prev.essence + amount }));

  const updateGold = (amount: number) =>
    setState(prev => ({ ...prev, gold: prev.gold + amount }));

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

  return (
    <GameContext.Provider
      value={{
        state,
        updateEssence,
        updateGold,
        startTraining,
        enterScene,
        exitScene,
        setVisualChapter,
        setStorySession,
        updateStorySession,
        clearStorySession,
        addBuff,
        removeBuff,
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
