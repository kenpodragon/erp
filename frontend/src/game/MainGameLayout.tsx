import React, { useState } from 'react';
import './MainGameLayout.css';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import OverworldMap from './components/OverworldMap';
import BottomAnimatedBanner from './components/BottomAnimatedBanner';
import StoryMode from './components/StoryMode';
import { GameProvider, useGame } from './GameContext';

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
  settings?: {
    audio_enabled: boolean;
    music_volume: number;
    sfx_volume: number;
    narration_speed: number;
    narration_wpm: number;
    narration_font_size: number;
    narration_block_height: number;
    ui_scale: number;
    game_text_scale: number;
  };
}

interface MainGameLayoutProps {
  player: Player | null;
  character: any;
  onCharacterUpdate?: () => void;
  onPlayerUpdate: () => void;
}

const GameContent: React.FC<MainGameLayoutProps> = (props) => {
  const { state, exitScene } = useGame();
  // Align IDs with Sidebar.tsx: map, skills, home, shop, chat, board
  const [activeTab, setActiveTab] = useState<string>('map');

  const { player, character, onPlayerUpdate } = props;

  return (
    <div className={`game-layout ${state.activeSceneId ? 'game-layout--story-active' : ''}`}>
      <TopBar 
        player={player}
        character={character}
        onPlayerUpdate={onPlayerUpdate}
      />

      <div className="game-body">
        {/* Only show sidebar if NOT in a story scene */}
        {!state.activeSceneId && (
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        )}

        <main className="game-main-content">
          {state.activeSceneId ? (
            <StoryMode 
              player={player} 
              onPlayerUpdate={onPlayerUpdate} 
            />
          ) : (
            <>
              {activeTab === 'map' && <OverworldMap />}

              {activeTab !== 'map' && (
                <div className="placeholder-view">
                  <h2>{activeTab.toUpperCase()} TERMINAL</h2>
                  <p style={{ opacity: 0.5 }}>Module under construction...</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Hide bottom banner during active story scenes for more focus */}
      {!state.activeSceneId && <BottomAnimatedBanner character={character} />}

      {/* Global Connectivity Overlay */}
      {state.isOffline && (
        <div className="connectivity-overlay">
          <div className="connectivity-modal">
            <div className="connectivity-spinner"></div>
            <h2>CONNECTION LOST</h2>
            <p>The Tower is flickering. Attempting to reconnect...</p>
            <div className="connectivity-actions">
              <button onClick={() => window.location.reload()}>RETRY NOW</button>
              {state.activeSceneId && (
                <button className="exit-btn" onClick={() => exitScene()}>EXIT TO HUB</button>
              )}
            </div>
          </div>
        </div>
      )}
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
