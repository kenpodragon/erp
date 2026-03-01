import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './TopBar.css';
import { useGame } from '../GameContext';

interface Character {
  id: number;
  character_name: string;
  level: number;
  class: {
    sprite_key: string | null;
  } | null;
}

interface Player {
  alias: string | null;
  google_display_name: string | null;
  google_avatar_url: string | null;
  avatar_preset_key: string | null;
}

interface TopBarProps {
  player: Player | null;
  character: Character | null;
}

const TopBar: React.FC<TopBarProps> = ({ player, character }) => {
  const { state } = useGame();
  const navigate = useNavigate();

  const avatarUrl = useMemo(() => {
    // 1. If we have a character, use their class-based sprite (matches profile card)
    if (character?.class?.sprite_key) {
      const presetKey = character.class.sprite_key.replace('class_', '');
      return `/assets/avatars/preset_${presetKey}.png`;
    }
    // 2. Fallback to player profile preset
    if (player?.avatar_preset_key) {
      return `/assets/avatars/preset_${player.avatar_preset_key}.png`;
    }
    // 3. Fallback to Google avatar
    return player?.google_avatar_url || 'https://via.placeholder.com/32/000000/b8860b?text=ERP';
  }, [player, character]);

  return (
    <header className="game-top-bar">
      <div className="top-bar-left">
        <img 
          src={avatarUrl} 
          alt="Avatar" 
          className="player-avatar-mini"
          onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32/000000/b8860b?text=ERP'}
        />
        <div className="player-stats-mini">
          <span className="player-name">{character?.character_name || player?.alias || player?.google_display_name || 'Ascendant'}</span>
          <span className="player-level">Lv. {character?.level || 1}</span>
        </div>
      </div>
      
      <div className="top-bar-center currencies">
        <div className="currency-item gold">
          <span className="icon">💰</span>
          <span className="value">{state.gold.toLocaleString()}</span>
        </div>
        <div className="currency-item essence">
          <span className="icon">✨</span>
          <span className="value">{state.essence.toLocaleString()}</span>
        </div>
        <div className="currency-item shards">
          <span className="icon">💎</span>
          <span className="value">10</span>
        </div>
      </div>

      <div className="top-bar-right">
        <button className="settings-btn" title="Settings">⚙️</button>
        <button className="exit-btn" title="Exit to Profile" onClick={() => navigate('/profile')}>🚪</button>
      </div>
    </header>
  );
};

export default TopBar;
