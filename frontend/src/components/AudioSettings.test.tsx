import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioSettings } from './AudioSettings';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    patch: vi.fn(),
  }
}));

describe('AudioSettings', () => {
  const initialSettings = {
    audio_enabled: true,
    music_volume: 50,
    sfx_volume: 75,
    narration_speed: 1.0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial settings correctly', () => {
    render(<AudioSettings settings={initialSettings} onUpdate={() => {}} />);
    
    const masterCheckbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(masterCheckbox.checked).toBe(true);
    
    expect(screen.getByText(/Music Volume \(50%\)/i)).toBeTruthy();
    expect(screen.getByText(/SFX Volume \(75%\)/i)).toBeTruthy();
  });

  it('toggles master audio', async () => {
    const onUpdateSpy = vi.fn();
    vi.mocked(api.patch).mockResolvedValue({ ok: true } as Response);

    render(<AudioSettings settings={initialSettings} onUpdate={onUpdateSpy} />);
    
    const masterCheckbox = screen.getByRole('checkbox');
    fireEvent.click(masterCheckbox);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/api/players/me/settings', { audio_enabled: false });
      expect(onUpdateSpy).toHaveBeenCalled();
    });
  });

  it('updates music volume on mouse up', async () => {
    const onUpdateSpy = vi.fn();
    vi.mocked(api.patch).mockResolvedValue({ ok: true } as Response);

    render(<AudioSettings settings={initialSettings} onUpdate={onUpdateSpy} />);
    
    const sliders = screen.getAllByRole('slider');
    const musicSlider = sliders[0]; // music is first

    fireEvent.change(musicSlider, { target: { value: '80' } });
    fireEvent.mouseUp(musicSlider);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/api/players/me/settings', { music_volume: 80 });
      expect(onUpdateSpy).toHaveBeenCalled();
    });
  });
});
