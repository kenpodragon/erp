import React, { useState } from 'react';
import { api } from '../api';

interface AudioSettingsData {
  audio_enabled: boolean;
  music_volume: number;
  sfx_volume: number;
  narration_speed: number;
  narration_wpm: number;
  narration_font_size: number;
  narration_block_height: number;
  ui_scale: number;
  game_text_scale: number;
}

interface AudioSettingsProps {
  settings: AudioSettingsData;
  onUpdate: (newSettings: AudioSettingsData) => void;
}

export const AudioSettings: React.FC<AudioSettingsProps> = ({ settings, onUpdate }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleToggle = async () => {
    const newVal = !localSettings.audio_enabled;
    updateSetting('audio_enabled', newVal);
  };

  const updateSetting = async (key: keyof AudioSettingsData, value: string | number | boolean) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    
    setIsSaving(true);
    try {
      const res = await api.patch('/api/players/me/settings', { [key]: value });
      if (res.ok) {
        onUpdate({ ...localSettings, [key]: value } as AudioSettingsData);
      }
    } catch (err) {
      console.error("Failed to save audio setting:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-section">
      <h3>Audio & Narration Settings</h3>
      
      <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <label style={{ margin: 0 }}>Master Audio</label>
        <input 
          type="checkbox" 
          checked={localSettings.audio_enabled} 
          onChange={handleToggle}
          style={{ width: '20px', height: '20px' }}
        />
      </div>

      <div className="form-group">
        <label>Music Volume ({localSettings.music_volume}%)</label>
        <div className="slider-group">
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={localSettings.music_volume} 
            onChange={(e) => setLocalSettings(p => ({...p, music_volume: parseInt(e.target.value)}))}
            onMouseUp={(e: React.MouseEvent<HTMLInputElement>) => updateSetting('music_volume', parseInt((e.target as HTMLInputElement).value))}
          />
        </div>
      </div>

      <div className="form-group">
        <label>SFX Volume ({localSettings.sfx_volume}%)</label>
        <div className="slider-group">
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={localSettings.sfx_volume} 
            onChange={(e) => setLocalSettings(p => ({...p, sfx_volume: parseInt(e.target.value)}))}
            onMouseUp={(e: React.MouseEvent<HTMLInputElement>) => updateSetting('sfx_volume', parseInt((e.target as HTMLInputElement).value))}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Narration Speed ({localSettings.narration_speed}x)</label>
        <div className="slider-group">
          <input 
            type="range" 
            min="0.5" 
            max="2.0" 
            step="0.1"
            value={localSettings.narration_speed} 
            onChange={(e) => setLocalSettings(p => ({...p, narration_speed: parseFloat(e.target.value)}))}
            onMouseUp={(e: React.MouseEvent<HTMLInputElement>) => updateSetting('narration_speed', parseFloat((e.target as HTMLInputElement).value))}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Narration WPM ({localSettings.narration_wpm})</label>
        <div className="slider-group">
          <input 
            type="range" 
            min="50" 
            max="500" 
            step="10"
            value={localSettings.narration_wpm} 
            onChange={(e) => setLocalSettings(p => ({...p, narration_wpm: parseInt(e.target.value)}))}
            onMouseUp={(e: React.MouseEvent<HTMLInputElement>) => updateSetting('narration_wpm', parseInt((e.target as HTMLInputElement).value))}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Narration Font Size ({localSettings.narration_font_size}px)</label>
        <div className="slider-group">
          <input 
            type="range" 
            min="8" 
            max="32" 
            step="1"
            value={localSettings.narration_font_size} 
            onChange={(e) => setLocalSettings(p => ({...p, narration_font_size: parseInt(e.target.value)}))}
            onMouseUp={(e: React.MouseEvent<HTMLInputElement>) => updateSetting('narration_font_size', parseInt((e.target as HTMLInputElement).value))}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Text Block Height ({localSettings.narration_block_height}%)</label>
        <div className="slider-group">
          <input 
            type="range" 
            min="10" 
            max="100" 
            step="5"
            value={localSettings.narration_block_height} 
            onChange={(e) => setLocalSettings(p => ({...p, narration_block_height: parseInt(e.target.value)}))}
            onMouseUp={(e: React.MouseEvent<HTMLInputElement>) => updateSetting('narration_block_height', parseInt((e.target as HTMLInputElement).value))}
          />
        </div>
      </div>

      <div className="form-group">
        <label>UI Interface Scale ({localSettings.ui_scale}x)</label>
        <div className="slider-group">
          <input 
            type="range" 
            min="0.5" 
            max="2.0" 
            step="0.1"
            value={localSettings.ui_scale} 
            onChange={(e) => setLocalSettings(p => ({...p, ui_scale: parseFloat(e.target.value)}))}
            onMouseUp={(e: React.MouseEvent<HTMLInputElement>) => updateSetting('ui_scale', parseFloat((e.target as HTMLInputElement).value))}
          />
        </div>
      </div>

      <div className="form-group">
        <label>Game Combat Text Scale ({localSettings.game_text_scale}x)</label>
        <div className="slider-group">
          <input 
            type="range" 
            min="0.5" 
            max="2.5" 
            step="0.1"
            value={localSettings.game_text_scale} 
            onChange={(e) => setLocalSettings(p => ({...p, game_text_scale: parseFloat(e.target.value)}))}
            onMouseUp={(e: React.MouseEvent<HTMLInputElement>) => updateSetting('game_text_scale', parseFloat((e.target as HTMLInputElement).value))}
          />
        </div>
      </div>

      {isSaving && <div className="validation-msg" style={{ opacity: 0.5 }}>Saving settings...</div>}
    </div>
  );
};
