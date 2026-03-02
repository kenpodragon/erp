import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AliasEditor } from './AliasEditor';
import { AvatarManager } from './AvatarManager';
import { AudioSettings } from './AudioSettings';
import { CharacterCreator } from './CharacterCreator';
import './Profile.css';

interface Character {
  id: number;
  character_name: string;
  level: number;
  strength: number | null;
  agility: number | null;
  intelligence: number | null;
  created_at: string;
  class: {
    id: number; name: string; lore_blurb: string | null;
    base_strength: number; base_agility: number; base_intelligence: number;
    sprite_key: string | null; is_available: boolean;
  } | null;
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
  terms_accepted_at: string | null;
  created_at: string;
  is_banned?: boolean;
  is_game_admin?: boolean;
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

interface ProfileDashboardProps {
  player: Player;
  character: Character | null;
  onRefresh: () => void;
  onCharacterCreated: (character: Character) => void;
  onCharacterDeleted: () => void;
  onLogout: () => void;
}

export const ProfileDashboard: React.FC<ProfileDashboardProps> = ({
  player,
  character,
  onRefresh,
  onCharacterCreated,
  onCharacterDeleted,
  onLogout,
}) => {
  const [toast, setToast] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAliasSave = (newAlias: string) => {
    showToast(`Alias updated to "${newAlias}"`);
    onRefresh();
  };

  const handleAvatarUpdate = () => {
    showToast('Avatar updated');
    onRefresh();
  };

  const handleAudioUpdate = () => {
    showToast('Audio settings saved');
    onRefresh();
  };

  useEffect(() => {
    setImgError(false);
  }, [player.avatar_preset_key, player.google_avatar_url, player.custom_avatar_url]);

  const avatarUrl = useMemo(() => {
    if (imgError) return 'https://via.placeholder.com/128/000000/b8860b?text=ERP';
    if (player.avatar_preset_key) return `/assets/avatars/preset_${player.avatar_preset_key}.png`;
    // Note: implementation of custom_avatar_url would go here if used
    return player.google_avatar_url || 'https://via.placeholder.com/128/000000/b8860b?text=ERP';
  }, [player.avatar_preset_key, player.google_avatar_url, imgError]);

  return (
    <div className="profile-container">

      {/* ── Top bar: logout ────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <button
          onClick={onLogout}
          style={{ background: '#3a0000', color: '#ff8888', border: '1px solid #7a0000', borderRadius: '4px', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.85rem' }}
        >
          Logout
        </button>
      </div>

      {/* ── Avatar picker modal ────────────────────────────────────────── */}
      {showAvatarModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAvatarModal(false); }}
        >
          <div style={{ background: '#1a1a1a', border: '1px solid #444', borderRadius: '8px', padding: '1.5rem', width: '100%', maxWidth: '420px', position: 'relative', boxShadow: '0 8px 32px rgba(0,0,0,0.8)' }}>
            <button
              onClick={() => setShowAvatarModal(false)}
              style={{ position: 'absolute', top: '0.6rem', right: '0.75rem', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}
              aria-label="Close avatar picker"
            >
              ×
            </button>
            <AvatarManager
              currentPreset={player.avatar_preset_key}
              googleAvatarUrl={player.google_avatar_url}
              onUpdate={() => { setShowAvatarModal(false); handleAvatarUpdate(); }}
            />
          </div>
        </div>
      )}

      {/* ── Profile header ────────────────────────────────────────────── */}
      <div className="profile-header">
        <div style={{ position: 'relative', width: '128px', height: '128px', flexShrink: 0 }}>
          <img
            src={avatarUrl}
            alt="Profile Avatar"
            className="profile-avatar-large"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
          {/* Camera button — bottom-left of avatar */}
          <button
            onClick={() => setShowAvatarModal(true)}
            title="Change avatar"
            style={{
              position: 'absolute', bottom: '4px', left: '4px',
              background: 'rgba(0,0,0,0.65)', border: 'none',
              borderRadius: '50%', width: '26px', height: '26px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1,
            }}
          >
            📷
          </button>
        </div>
        <div>
          <AliasEditor
            currentAlias={player.alias}
            displayName={player.google_display_name}
            onSave={handleAliasSave}
          />
          <p style={{ margin: '0.4rem 0 0.25rem', opacity: 0.6, fontSize: '0.9rem' }}>{player.email}</p>
          <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>
            Member since {new Date(player.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* ── Character (right after account info) ──────────────────────── */}
      <CharacterCreator
        existingCharacter={character}
        onCharacterCreated={onCharacterCreated}
        onCharacterDeleted={onCharacterDeleted}
      />

      {/* ── Start Game Button ────────────────────────────────────────── */}
      {character && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}>
          <Link 
            to="/game" 
            className="btn-primary" 
            style={{ 
              fontSize: '1.25rem', 
              padding: '0.8rem 2.5rem', 
              textDecoration: 'none',
              background: 'linear-gradient(to bottom, #b8860b, #8b6508)',
              border: '2px solid #daa520',
              boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              display: 'inline-block'
            }}
          >
            Enter the Tower
          </Link>
        </div>
      )}

      {/* ── Account status ────────────────────────────────────────────── */}
      <div className="profile-section">
        <h3>Account Status</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ margin: 0 }}>
            Status: {' '}
            {player.is_banned ? (
              <span style={{ color: '#ff4444', fontWeight: 'bold' }}>BANNED</span>
            ) : (
              <span style={{ color: '#4caf50', fontWeight: 'bold' }}>ACTIVE</span>
            )}
            {player.is_game_admin && (
              <span style={{ marginLeft: '0.5rem', color: '#60a5fa', fontSize: '0.8rem', border: '1px solid #60a5fa', padding: '1px 4px', borderRadius: '3px' }}>ADMIN</span>
            )}
          </p>
          <p style={{ margin: 0 }}>
            Terms:{' '}
            {player.terms_accepted_at
              ? <span style={{ color: '#4caf50' }}>Accepted {new Date(player.terms_accepted_at).toLocaleDateString()}</span>
              : <span style={{ color: '#ff8888' }}>Not yet accepted</span>}
          </p>
          {!player.terms_accepted_at && (
            <button className="btn-primary" style={{ marginTop: '0.5rem', width: 'fit-content' }} onClick={async () => {
              const { api } = await import('../api');
              await api.post('/api/players/me/accept-terms');
              onRefresh();
            }}>
              Accept Terms of Service
            </button>
          )}
        </div>
      </div>

      {/* ── Footer / Legal Links ──────────────────────────────────────── */}
      <footer style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #333', textAlign: 'center', fontSize: '0.8rem', color: '#666' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
          <Link to="/terms" style={{ color: '#888', textDecoration: 'none' }}>Terms of Service</Link>
          <Link to="/privacy" style={{ color: '#888', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link to="/license" style={{ color: '#888', textDecoration: 'none' }}>License</Link>
        </div>
        <p>&copy; {new Date().getFullYear()} Stephen Salaka. All rights reserved.</p>
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};
