import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './TopBar.css';
import { useGame } from '../GameContext';

interface Character {
  id: number;
  character_name: string;
  level: number;
  class?: {
    sprite_key: string | null;
  } | null;
  character_class?: {
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

const FALLBACK_AVATAR = 'https://via.placeholder.com/32/000000/b8860b?text=ERP';

// Map database sprite_keys to available PNG filenames in /assets/avatars/preset_*.png
const CLASS_TO_PRESET: Record<string, string> = {
  class_sentinel: 'engineer',
  class_engineer: 'engineer',
  class_arcanist: 'conduit',
  class_conduit:  'conduit',
  class_wanderer: 'drifter',
  class_drifter:  'drifter',
  class_invoker:  'vessel',
  class_vessel:   'vessel',
  class_cleric:   'cleric',
  class_mage:     'mage',
  class_rogue:    'rogue',
  class_warrior:  'warrior',
};

const TopBar: React.FC<TopBarProps> = ({ player, character }) => {
  const { state } = useGame();
  
  // Calculate the intended URL
  const targetUrl = useMemo(() => {
    const charClass = character?.class || character?.character_class;
    const spriteKey = charClass?.sprite_key;
    
    if (spriteKey && CLASS_TO_PRESET[spriteKey]) {
      return `/assets/avatars/preset_${CLASS_TO_PRESET[spriteKey]}.png`;
    }
    
    if (player?.avatar_preset_key) {
      return `/assets/avatars/preset_${player.avatar_preset_key}.png`;
    }
    return player?.google_avatar_url || FALLBACK_AVATAR;
  }, [player, character]);

  // Persistent state for the current valid image source
  const [imgSrc, setImgSrc] = React.useState(targetUrl);
  const [failedUrls] = React.useState<Set<string>>(new Set());

  // Only update imgSrc if the targetUrl is new and hasn't failed before
  React.useEffect(() => {
    if (targetUrl !== imgSrc) {
      if (failedUrls.has(targetUrl)) {
        setImgSrc(FALLBACK_AVATAR);
      } else {
        setImgSrc(targetUrl);
      }
    }
  }, [targetUrl, failedUrls, imgSrc]);

  const handleImgError = () => {
    if (imgSrc !== FALLBACK_AVATAR) {
      failedUrls.add(imgSrc);
      setImgSrc(FALLBACK_AVATAR);
    }
  };

  return (
    <header className="game-top-bar">
      <div className="top-bar-left">
        <div className="avatar-wrapper-mini">
          <img 
            src={imgSrc} 
            alt="Avatar" 
            className="player-avatar-mini"
            onError={handleImgError}
          />
        </div>
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
      </div>
    </header>
  );
};

export default TopBar;
