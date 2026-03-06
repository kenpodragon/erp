import React, { useState } from 'react';
import './MainGameLayout.css';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import OverworldMap from './components/OverworldMap';
import BottomAnimatedBanner from './components/BottomAnimatedBanner';
import StoryMode from './components/StoryMode';
import SkillsTab from './components/SkillsTab';
import ChatTab from './components/ChatTab';
import EthericRegistry from './components/story/EthericRegistry';
import DiscoveryLibrary from './components/story/DiscoveryLibrary';
import PostBattleSummary from './components/story/PostBattleSummary';
import WelcomeModal from './components/story/WelcomeModal';
import TutorialOverlay from './components/story/TutorialOverlay';
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
  const { state, exitScene, setStorySession, setEssence, playSFX } = useGame();
  // Align IDs with Sidebar.tsx: map, skills, home, shop, chat, board
  const [activeTab, setActiveTab] = useState<string>('map');
  const [summaryData, setSummaryData] = useState<{ show: boolean; farmMode: boolean }>({ show: false, farmMode: false });
  const [showWelcome, setShowWelcome] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [homeSubTab, setHomeSubTab] = useState<'registry' | 'library'>('registry');

  const { player, character, onPlayerUpdate } = props;

  const handleContinueFarming = () => {
    setSummaryData({ show: false, farmMode: true });
  };

  const handleReturnToHub = (completeData?: any) => {
    setSummaryData({ show: false, farmMode: false });
    // PostBattleSummary already called /complete and handled loot
    if (completeData?.total_character_essence !== undefined) {
      setEssence(completeData.total_character_essence);
    }
    onPlayerUpdate();
    exitScene();
  };

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
              showSummaryExternal={summaryData.show}
              onShowSummaryChange={(val) => setSummaryData(prev => ({ ...prev, show: val }))}
              externalFarmMode={summaryData.farmMode}
              onFarmModeChange={(val) => setSummaryData(prev => ({ ...prev, farmMode: val }))}
            />
          ) : (
            <>
              {activeTab === 'map' && <OverworldMap />}
              {activeTab === 'skills' && <SkillsTab />}
              {activeTab === 'chat' && <ChatTab />}
              {activeTab === 'home' && (
                <div className="home-base-view">
                  <div className="home-sub-tabs">
                    <button className={homeSubTab === 'registry' ? 'active' : ''} onClick={() => setHomeSubTab('registry')}>Etheric Registry</button>
                    <button className={homeSubTab === 'library' ? 'active' : ''} onClick={() => setHomeSubTab('library')}>Discovery Library</button>
                  </div>
                  {homeSubTab === 'registry' ? <EthericRegistry /> : <DiscoveryLibrary />}
                </div>
              )}

              {activeTab !== 'map' && activeTab !== 'skills' && activeTab !== 'chat' && activeTab !== 'home' && (
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
      {!state.activeSceneId && (
        state.reduceMotion
          ? <div className="static-bottom-bar">{character?.character_name || 'Adventurer'} Lv.{character?.level || 1}</div>
          : <BottomAnimatedBanner character={character} />
      )}

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

      {/* Global Summary Modal — Rendered at the root to avoid jumping */}
      {summaryData.show && state.storySession && (
        <PostBattleSummary
          session={state.storySession}
          onContinue={handleContinueFarming}
          onReturnToHub={handleReturnToHub}
          playSFX={playSFX}
          reduceMotion={state.reduceMotion}
        />
      )}

      {/* 2.6.3: Welcome/Changelog Modal */}
      {showWelcome && (
        <WelcomeModal
          onClose={() => setShowWelcome(false)}
          onStartTutorial={() => { setShowWelcome(false); setShowTutorial(true); }}
        />
      )}

      {/* 2.6.3: Interactive Tutorial Overlay */}
      {showTutorial && (
        <TutorialOverlay onComplete={() => setShowTutorial(false)} />
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
