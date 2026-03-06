/**
 * AudioSettingsModal — 3 volume sliders (Master, Music, SFX) + mute toggle.
 *
 * Persists to localStorage immediately; debounced server sync via PATCH /api/players/me/settings.
 */
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api';
import './AudioSettingsModal.css';

export interface AudioSettings {
  masterVolume: number;   // 0-100
  musicVolume: number;    // 0-100
  sfxVolume: number;      // 0-100
  masterMuted: boolean;
}

const LS_KEY = 'erp_audio_settings';

export function loadAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { masterVolume: 80, musicVolume: 80, sfxVolume: 80, masterMuted: false };
}

export function saveAudioSettingsLocal(settings: AudioSettings): void {
  localStorage.setItem(LS_KEY, JSON.stringify(settings));
}

interface Props {
  open: boolean;
  onClose: () => void;
  settings: AudioSettings;
  onChange: (settings: AudioSettings) => void;
}

const AudioSettingsModal: React.FC<Props> = ({ open, onClose, settings, onChange }) => {
  const [local, setLocal] = useState<AudioSettings>(settings);
  const syncTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setLocal(settings);
  }, [settings]);

  const update = (patch: Partial<AudioSettings>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next);
    saveAudioSettingsLocal(next);

    // Debounced server sync (500ms)
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      api.patch('/api/players/me/settings', {
        master_volume: next.masterVolume,
        music_volume: next.musicVolume,
        sfx_volume: next.sfxVolume,
        master_muted: next.masterMuted,
      }).catch(() => {});
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, []);

  if (!open) return null;

  return (
    <div className="audio-settings-overlay" onClick={onClose}>
      <div className="audio-settings-modal" onClick={e => e.stopPropagation()}>
        <h3>Audio Settings</h3>

        <div className="audio-settings-group">
          <label>
            <span className="audio-label-text">
              Master Volume: {local.masterVolume}%
            </span>
            <input
              type="range"
              min={0} max={100} step={1}
              value={local.masterVolume}
              onChange={e => update({ masterVolume: Number(e.target.value) })}
            />
          </label>
        </div>

        <div className="audio-settings-group">
          <label>
            <span className="audio-label-text">
              Music Volume: {local.musicVolume}%
            </span>
            <input
              type="range"
              min={0} max={100} step={1}
              value={local.musicVolume}
              onChange={e => update({ musicVolume: Number(e.target.value) })}
            />
          </label>
        </div>

        <div className="audio-settings-group">
          <label>
            <span className="audio-label-text">
              SFX Volume: {local.sfxVolume}%
            </span>
            <input
              type="range"
              min={0} max={100} step={1}
              value={local.sfxVolume}
              onChange={e => update({ sfxVolume: Number(e.target.value) })}
            />
          </label>
        </div>

        <div className="audio-settings-group">
          <label className="audio-mute-label">
            <input
              type="checkbox"
              checked={local.masterMuted}
              onChange={e => update({ masterMuted: e.target.checked })}
            />
            <span className="audio-label-text">Mute All Audio</span>
          </label>
        </div>

        <div className="audio-settings-actions">
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default AudioSettingsModal;
