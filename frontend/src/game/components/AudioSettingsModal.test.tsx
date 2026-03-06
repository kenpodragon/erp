import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AudioSettingsModal, { loadAudioSettings, saveAudioSettingsLocal } from './AudioSettingsModal';

// Mock the api module
vi.mock('../../api', () => ({
  api: {
    patch: vi.fn(() => Promise.resolve({ ok: true })),
  },
}));

describe('AudioSettingsModal', () => {
  const defaultSettings = {
    masterVolume: 80,
    musicVolume: 80,
    sfxVolume: 80,
    masterMuted: false,
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <AudioSettingsModal
        open={false}
        onClose={() => {}}
        settings={defaultSettings}
        onChange={() => {}}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders modal when open', () => {
    render(
      <AudioSettingsModal
        open={true}
        onClose={() => {}}
        settings={defaultSettings}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Audio Settings')).toBeDefined();
    expect(screen.getByText(/Master Volume/)).toBeDefined();
    expect(screen.getByText(/Music Volume/)).toBeDefined();
    expect(screen.getByText(/SFX Volume/)).toBeDefined();
    expect(screen.getByText('Mute All Audio')).toBeDefined();
  });

  it('displays current volume values', () => {
    render(
      <AudioSettingsModal
        open={true}
        onClose={() => {}}
        settings={{ ...defaultSettings, masterVolume: 60 }}
        onChange={() => {}}
      />
    );
    expect(screen.getByText(/60%/)).toBeDefined();
  });

  it('calls onChange when slider changes', () => {
    const onChange = vi.fn();
    render(
      <AudioSettingsModal
        open={true}
        onClose={() => {}}
        settings={defaultSettings}
        onChange={onChange}
      />
    );
    const sliders = screen.getAllByRole('slider');
    // First slider is master volume
    fireEvent.change(sliders[0], { target: { value: '50' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ masterVolume: 50 })
    );
  });

  it('calls onChange when mute checkbox toggled', () => {
    const onChange = vi.fn();
    render(
      <AudioSettingsModal
        open={true}
        onClose={() => {}}
        settings={defaultSettings}
        onChange={onChange}
      />
    );
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ masterMuted: true })
    );
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <AudioSettingsModal
        open={true}
        onClose={onClose}
        settings={defaultSettings}
        onChange={() => {}}
      />
    );
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when overlay clicked', () => {
    const onClose = vi.fn();
    render(
      <AudioSettingsModal
        open={true}
        onClose={onClose}
        settings={defaultSettings}
        onChange={() => {}}
      />
    );
    // Click the overlay (first child)
    const overlay = document.querySelector('.audio-settings-overlay');
    if (overlay) fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });
});

describe('loadAudioSettings / saveAudioSettingsLocal', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when nothing stored', () => {
    const settings = loadAudioSettings();
    expect(settings.masterVolume).toBe(80);
    expect(settings.musicVolume).toBe(80);
    expect(settings.sfxVolume).toBe(80);
    expect(settings.masterMuted).toBe(false);
  });

  it('round-trips through localStorage', () => {
    const custom = { masterVolume: 42, musicVolume: 60, sfxVolume: 30, masterMuted: true };
    saveAudioSettingsLocal(custom);
    const loaded = loadAudioSettings();
    expect(loaded).toEqual(custom);
  });
});
