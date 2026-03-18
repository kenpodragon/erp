import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { api } from '../../api';
import { useGame } from '../GameContext';
import { AvatarPreset } from '../../components/AvatarPreset';
import AudioSettingsModal, {
  loadAudioSettings,
  saveAudioSettingsLocal,
  type AudioSettings,
} from './AudioSettingsModal';
import './TopBar.css';

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
  id: number;
  alias: string | null;
  google_display_name: string | null;
  google_avatar_url: string | null;
  avatar_preset_key: string | null;
  settings?: {
    ui_scale: number;
    game_text_scale: number;
    narration_wpm: number;
    narration_font_size: number;
    music_volume: number;
    sfx_volume: number;
  };
}

interface TopBarProps {
  player: Player | null;
  character: Character | null;
  onPlayerUpdate: () => void;
}

// Map database sprite_keys to avatar preset keys
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

const BOOST_ICONS: Record<string, string> = {
  xp: '\u2B50',
  essence: '\u2728',
  drop_rate: '\uD83C\uDFAF',
};

function formatBoosterTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatBoosterTimeShort(seconds: number): string {
  if (seconds <= 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

const TopBar: React.FC<TopBarProps> = ({ player, character, onPlayerUpdate }) => {
  const { state, playSFX, setReduceMotion, updateAudioSettings } = useGame();
  const [showSettings, setShowSettings] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(loadAudioSettings);
  const [shardBalance, setShardBalance] = useState(0);

  // Fetch shard balance from packages endpoint
  useEffect(() => {
    if (!player?.id) return;
    api.get('/api/payments/packages')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.current_balance !== undefined) setShardBalance(data.current_balance); })
      .catch(() => {});
  }, [player?.id]);

  // Sync server audio settings on login (server is source of truth)
  useEffect(() => {
    if (player?.settings) {
      const serverSettings: AudioSettings = {
        masterVolume: (player.settings as any).master_volume ?? audioSettings.masterVolume,
        musicVolume: player.settings.music_volume ?? audioSettings.musicVolume,
        sfxVolume: player.settings.sfx_volume ?? audioSettings.sfxVolume,
        masterMuted: (player.settings as any).master_muted ?? audioSettings.masterMuted,
      };
      setAudioSettings(serverSettings);
      saveAudioSettingsLocal(serverSettings);
    }
  }, [player?.settings]);

  const handleMuteToggle = useCallback(() => {
    const next = { ...audioSettings, masterMuted: !audioSettings.masterMuted };
    setAudioSettings(next);
    updateAudioSettings(next);
    api.patch('/api/players/me/settings', { master_muted: next.masterMuted }).catch(() => {});
  }, [audioSettings, updateAudioSettings]);

  // Local state for sliders during editing
  const [localSettings, setLocalSettings] = useState({
    ui_scale: player?.settings?.ui_scale || 1.0,
    game_text_scale: player?.settings?.game_text_scale || 1.0,
    narration_wpm: player?.settings?.narration_wpm || 200,
    narration_font_size: player?.settings?.narration_font_size || 14
  });

  useEffect(() => {
    if (player?.settings) {
      setLocalSettings({
        ui_scale: player.settings.ui_scale,
        game_text_scale: player.settings.game_text_scale,
        narration_wpm: player.settings.narration_wpm,
        narration_font_size: player.settings.narration_font_size
      });
    }
  }, [player?.settings]);

  // Determine which avatar preset key to use
  const avatarPresetKey = useMemo(() => {
    const charClass = character?.class || character?.character_class;
    const spriteKey = charClass?.sprite_key;

    if (spriteKey && CLASS_TO_PRESET[spriteKey]) {
      return CLASS_TO_PRESET[spriteKey];
    }

    if (player?.avatar_preset_key) {
      return player.avatar_preset_key;
    }
    return null;
  }, [player, character]);

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await api.patch('/api/players/me/settings', localSettings);
      setShowSettings(false);
      onPlayerUpdate(); // Refresh parent state to apply globally
    } catch (err) {
      console.error("Failed to save settings", err);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalSettings(prev => ({
      ...prev,
      [name]: name.includes('scale') ? parseFloat(value) : parseInt(value)
    }));
  };

  return (
    <header className="game-top-bar">
      <div className="top-bar-left">
        <div className="avatar-wrapper-mini">
          {avatarPresetKey ? (
            <AvatarPreset
              presetKey={avatarPresetKey}
              size={32}
              className="player-avatar-mini"
              alt="Avatar"
            />
          ) : player?.google_avatar_url ? (
            <img
              src={player.google_avatar_url}
              alt="Avatar"
              className="player-avatar-mini"
              referrerPolicy="no-referrer"
            />
          ) : (
            <AvatarPreset
              presetKey="default"
              size={32}
              className="player-avatar-mini"
              alt="Avatar"
            />
          )}
        </div>
        <div className="player-stats-mini">
          <span className="player-name">{character?.character_name || player?.alias || player?.google_display_name || 'Ascendant'}</span>
          <span className="player-level">Lv. {character?.level || 1}</span>
        </div>
      </div>
      
      <div className="top-bar-center currencies">
        <div className="currency-item essence" title="ELYSIUM ESSENCE: Permanent resource earned from clearing stages. Used for character progression and Idle Training.">
          <span className="icon">✨</span>
          <span className="value">{state.essence.toLocaleString()}</span>
        </div>
        <div className="currency-item shards" title="SHARDS: Rare premium crystals used for special unlocks and cosmetics.">
          <span className="icon">💎</span>
          <span className="value">{shardBalance.toLocaleString()}</span>
        </div>
        {state.activeBoosters.length > 0 && (
          <div className="topbar-boosters">
            {state.activeBoosters.map(b => (
              <div
                key={b.boostType}
                className="topbar-booster-pip"
                title={`${b.boostType.toUpperCase()} ${b.magnitude}x — ${formatBoosterTime(b.remainingSeconds)}`}
              >
                <span className="booster-pip-icon">{BOOST_ICONS[b.boostType] || '\u26A1'}</span>
                <span className="booster-pip-time">{formatBoosterTimeShort(b.remainingSeconds)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="top-bar-right">
        <button
          className={`mute-toggle-btn ${audioSettings.masterMuted ? 'muted' : ''}`}
          title={audioSettings.masterMuted ? 'Unmute Audio' : 'Mute Audio'}
          onClick={() => { playSFX('sfx_ui_click'); handleMuteToggle(); }}
        >
          {audioSettings.masterMuted ? '\u{1F507}' : '\u{1F50A}'}
        </button>
        <button className="settings-btn" title="Audio Settings" onClick={() => { playSFX('sfx_ui_click'); setShowAudioSettings(true); }}>
          {'\u{1F3B5}'}
        </button>
        <button className="settings-btn" title="Game Settings" onClick={() => { playSFX('sfx_ui_click'); setShowSettings(true); }}>
          {'\u2699\uFE0F'}
        </button>
        <a href="/guide" target="_blank" rel="noopener noreferrer" className="settings-btn" title="Player Guide" style={{ textDecoration: 'none' }}>
          {'?'}
        </a>
      </div>

      {showSettings && (
        <div className="settings-modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()}>
            <h3>Game Settings</h3>
            <form onSubmit={handleSaveSettings}>
              <div className="settings-group">
                <label>Combat Text Scale: {localSettings.game_text_scale.toFixed(1)}x
                  <input type="range" name="game_text_scale" min="1.0" max="5.0" step="0.1" value={localSettings.game_text_scale} onChange={handleSliderChange} />
                </label>
              </div>
              <div className="settings-group">
                <label>Narration WPM: {localSettings.narration_wpm}
                  <input type="range" name="narration_wpm" min="150" max="600" step="10" value={localSettings.narration_wpm} onChange={handleSliderChange} />
                </label>
              </div>
              <div className="settings-group">
                <label>Narration Font Size: {localSettings.narration_font_size}px
                  <input type="range" name="narration_font_size" min="8" max="28" step="1" value={localSettings.narration_font_size} onChange={handleSliderChange} />
                </label>
              </div>
              <div className="settings-group">
                <label className="reduce-motion-toggle">
                  <input
                    type="checkbox"
                    checked={state.reduceMotion}
                    onChange={(e) => setReduceMotion(e.target.checked)}
                  />
                  Reduce Motion
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginTop: '2px' }}>
                    Disables animations and transitions
                  </span>
                </label>
              </div>
              <div className="settings-actions">
                <button type="button" onClick={() => setShowSettings(false)}>Cancel</button>
                <button type="submit" className="save-btn">Save & Apply</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AudioSettingsModal
        open={showAudioSettings}
        onClose={() => setShowAudioSettings(false)}
        settings={audioSettings}
        onChange={(s: AudioSettings) => { setAudioSettings(s); updateAudioSettings(s); }}
      />
    </header>
  );
};

export default TopBar;
