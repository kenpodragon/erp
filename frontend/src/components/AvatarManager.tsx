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
  const [isUploading, setIsUploading] = useState(false);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB');
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.upload('/api/players/me/avatar', formData);
      if (res.ok) {
        setSelectedPreset(null);
        onUpdate({});
      } else {
        setError('Upload failed');
      }
    } catch {
      setError('Server error during upload');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="profile-section">
      <h3>Avatar</h3>
      
      <div className="form-group">
        <label>Upload Custom Photo</label>
        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
            id="avatar-upload-input"
            disabled={isUploading}
          />
          <label 
            htmlFor="avatar-upload-input" 
            className="btn-secondary" 
            style={{ cursor: isUploading ? 'not-allowed' : 'pointer', fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}
          >
            {isUploading ? 'Uploading...' : 'Choose File'}
          </label>
          <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Max 2MB</span>
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '1.5rem' }}>
        <label>Or Choose a Preset</label>
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
