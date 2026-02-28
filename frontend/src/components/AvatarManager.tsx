import React, { useState } from 'react';
import { api } from '../api';

interface AvatarManagerProps {
  currentPreset: string | null;
  googleAvatarUrl: string | null;
  onUpdate: (data: { preset?: string }) => void;
}

const PRESETS = [
  { key: 'warrior', name: 'The Sentinel', url: '/assets/avatars/preset_warrior.png' },
  { key: 'mage', name: 'The Arcanist', url: '/assets/avatars/preset_mage.png' },
  { key: 'rogue', name: 'The Shadow', url: '/assets/avatars/preset_rogue.png' },
  { key: 'cleric', name: 'The Warden', url: '/assets/avatars/preset_cleric.png' },
];

export const AvatarManager: React.FC<AvatarManagerProps> = ({ 
  currentPreset, 
  googleAvatarUrl,
  onUpdate 
}) => {
  const [selectedPreset, setSelectedPreset] = useState(currentPreset);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    setSelectedPreset(currentPreset);
  }, [currentPreset]);

  const handlePresetSelect = async (key: string | null) => {
    setSelectedPreset(key);
    try {
      const res = await api.patch('/api/players/me', { avatar_preset_key: key });
      if (res.ok) {
        onUpdate({ preset: key || undefined });
      } else {
        setError('Failed to update preset');
      }
    } catch {
      setError('Server error');
    }
  };

  return (
    <div className="profile-section">
      <h3>Avatar</h3>
      
      <div className="form-group">
        <label>Choose a Preset</label>
        <div className="avatar-grid">
          <div 
            className={`avatar-preset ${selectedPreset === null ? 'selected' : ''}`}
            onClick={() => handlePresetSelect(null)}
            style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center', 
              background: '#111',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {googleAvatarUrl ? (
              <img 
                src={googleAvatarUrl} 
                alt="Google Profile" 
                referrerPolicy="no-referrer"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ fontSize: '0.6rem', textAlign: 'center' }}>No Google Photo</div>
            )}
            <div style={{ 
              fontSize: '0.5rem', 
              background: 'rgba(0,0,0,0.7)', 
              width: '100%', 
              textAlign: 'center',
              position: 'absolute',
              bottom: 0
            }}>Google</div>
          </div>
          {PRESETS.map((p) => (
            <img
              key={p.key}
              src={p.url}
              alt={p.name}
              title={p.name}
              className={`avatar-preset ${selectedPreset === p.key ? 'selected' : ''}`}
              onClick={() => handlePresetSelect(p.key)}
              onError={(e) => {
                // Fallback for missing assets
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80/000000/b8860b?text=' + p.key[0].toUpperCase();
              }}
            />
          ))}
        </div>
        {error && <div className="validation-msg error">{error}</div>}
      </div>
    </div>
  );
};
