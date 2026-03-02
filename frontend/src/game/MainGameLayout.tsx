import React, { useState } from 'react';
import './MainGameLayout.css';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import OverworldMap from './components/OverworldMap';
import BottomAnimatedBanner from './components/BottomAnimatedBanner';
import StoryMode from './components/StoryMode';
import HomeBase from './components/HomeBase';
import { GameProvider, useGame } from './GameContext';
import { CharacterCreator } from '../components/CharacterCreator';

interface Character {
  id: number;
  character_name: string;
  level: number;
  strength: number | null;
  agility: number | null;
  intelligence: number | null;
  created_at: string;
  class: { id: number; name: string; lore_blurb: string | null; base_strength: number; base_agility: number; base_intelligence: number; sprite_key: string | null; is_available: boolean } | null;
  essence?: { current_balance: number };
  progress?: { book_number: number; chapter_number: number; scene_number: number };
}

interface Player {
  id: number;
  firebase_uid: string;
  email: string;
  alias: string | null;
  google_display_name: string | null;
  google_avatar_url: string | null;
  custom_avatar_url: string | null;
  avatar_preset_key: string | null;
  created_at: string;
}

interface MainGameLayoutProps {
  player: Player | null;
  character: Character | null;
  onCharacterCreated: (char: Character) => void;
}

const GameContent: React.FC<MainGameLayoutProps> = ({ player, character, onCharacterCreated }) => {
  const { state } = useGame();
  const [activeTab, setActiveTab] = useState('map');

  const renderContent = () => {
    // If no character, don't show tabs, just the creator
    if (!character) {
      return (
        <div className="onboarding-overlay" style={{ position: 'relative', background: 'none' }}>
          <div className="onboarding-card" style={{ maxWidth: '600px' }}>
            <h2>Awaken Your Vessel</h2>
            <p>You have not yet manifested a form in the Tower. Choose your class to begin.</p>
            <CharacterCreator onCharacterCreated={onCharacterCreated} />
          </div>
        </div>
      );
    }

    // Story Mode supercedes tabs if active
    if (state.activeSceneId) {
      return <StoryMode />;
    }

    switch (activeTab) {
      case 'map':
        return <OverworldMap />;
      case 'skills':
        return <div className="placeholder-view">Idle Training View (Coming Soon)</div>;
      case 'shop':
        return <div className="placeholder-view">Overworld Shop View (Coming Soon)</div>;
      case 'home':
        return <HomeBase player={player} character={character} />;
      default:
        return <OverworldMap />;
    }
  };

  return (
    <div className="game-layout">
      <TopBar player={player} character={character} />
      <div className="game-middle-container">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="game-content-area">
          <div className="game-main-view">
            {renderContent()}
          </div>
          {activeTab === 'map' && !state.activeSceneId && character && (
            <div style={{ flexShrink: 0 }}>
              <BottomAnimatedBanner character={character} />
            </div>
          )}
        </main>
      </div>
    </div>
  );

};

const MainGameLayout: React.FC<MainGameLayoutProps> = (props) => {
  return (
    <GameProvider initialEssence={props.character?.essence?.current_balance || 0}>
      <GameContent {...props} />
    </GameProvider>
  );
};

export default MainGameLayout;
