import React, { useState, useEffect, useMemo } from 'react';
import { AliasEditor } from './AliasEditor';
import { AvatarManager } from './AvatarManager';
import { AudioSettings } from './AudioSettings';
import './Profile.css';

interface ProfileDashboardProps {
  player: any;
  onRefresh: () => void;
}

export const ProfileDashboard: React.FC<ProfileDashboardProps> = ({ player, onRefresh }) => {
  const [toast, setToast] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAliasSave = (newAlias: string) => {
    showToast(`Alias updated to ${newAlias}`);
    onRefresh();
  };

  const handleAvatarUpdate = (data: any) => {
    showToast('Avatar updated successfully');
    onRefresh();
  };

  const handleAudioUpdate = () => {
    showToast('Audio settings saved');
    onRefresh();
  };

  // Reset image error state if the player's avatar data changes
  useEffect(() => {
    setImgError(false);
  }, [player.avatar_preset_key, player.google_avatar_url, player.custom_avatar_url]);

  const avatarUrl = useMemo(() => {
    if (imgError) {
      return 'https://via.placeholder.com/128/000000/b8860b?text=ERP';
    }
    if (player.avatar_preset_key) {
      return `/assets/avatars/preset_${player.avatar_preset_key}.png`;
    }
    return player.google_avatar_url || 'https://via.placeholder.com/128/000000/b8860b?text=ERP';
  }, [player.avatar_preset_key, player.google_avatar_url, player.custom_avatar_url, imgError]);

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div style={{ position: 'relative', width: '128px', height: '128px' }}>
          <img 
            src={avatarUrl} 
            alt="Profile Avatar" 
            className="profile-avatar-large"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        </div>
        <div>
          <h2 style={{ margin: 0, color: '#b8860b' }}>{player.alias || player.google_display_name || 'Ascendant'}</h2>
          <p style={{ margin: '0.5rem 0', opacity: 0.7 }}>{player.email}</p>
          <div style={{ fontSize: '0.85rem' }}>
            Registered: {new Date(player.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      <AliasEditor currentAlias={player.alias} onSave={handleAliasSave} />

      <AvatarManager 
        currentPreset={player.avatar_preset_key} 
        googleAvatarUrl={player.google_avatar_url}
        onUpdate={handleAvatarUpdate} 
      />

      {player.settings && (
        <AudioSettings settings={player.settings} onUpdate={handleAudioUpdate} />
      )}

      <div className="profile-section">
        <h3>Account Status</h3>
        <p>Terms Accepted: {player.terms_accepted_at ? new Date(player.terms_accepted_at).toLocaleString() : 'Not yet accepted'}</p>
        {!player.terms_accepted_at && (
          <button className="btn-primary" onClick={async () => {
             const { api } = await import('../api');
             await api.post('/api/players/me/accept-terms');
             onRefresh();
          }}>
            Accept Terms of Service
          </button>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};
