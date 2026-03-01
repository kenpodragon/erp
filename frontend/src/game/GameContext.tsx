import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface GameState {
  essence: number;
  gold: number;
  activeTrainingId: string | null;
  activeSceneId: string | null;
  // stats could be expanded here
}

interface GameContextType {
  state: GameState;
  updateEssence: (amount: number) => void;
  updateGold: (amount: number) => void;
  startTraining: (skillId: string) => void;
  enterScene: (sceneId: string) => void;
  exitScene: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode; initialEssence?: number }> = ({ children, initialEssence }) => {
  const [state, setState] = useState<GameState>({
    essence: initialEssence || 0,
    gold: 0,
    activeTrainingId: null,
    activeSceneId: null,
  });

  // Sync state if initialEssence changes (e.g. after fresh fetch)
  useEffect(() => {
    if (initialEssence !== undefined) {
      setState(prev => ({ ...prev, essence: initialEssence }));
    }
  }, [initialEssence]);

  const updateEssence = (amount: number) => {
    setState(prev => ({ ...prev, essence: prev.essence + amount }));
  };

  const updateGold = (amount: number) => {
    setState(prev => ({ ...prev, gold: prev.gold + amount }));
  };

  const startTraining = (skillId: string) => {
    setState(prev => ({ ...prev, activeTrainingId: skillId }));
    // Future: Sync with backend
  };

  const enterScene = (sceneId: string) => {
    setState(prev => ({ ...prev, activeSceneId: sceneId, gold: 0 })); // Gold resets on entry
  };

  const exitScene = () => {
    setState(prev => ({ ...prev, activeSceneId: null }));
    // Future: Calculate Essence rewards based on session performance
  };

  return (
    <GameContext.Provider value={{ state, updateEssence, updateGold, startTraining, enterScene, exitScene }}>
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
