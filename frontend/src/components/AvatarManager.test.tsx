import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AvatarManager } from './AvatarManager';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    patch: vi.fn(),
    upload: vi.fn(),
  }
}));

describe('AvatarManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('highlights current preset', () => {
    render(
      <AvatarManager 
        currentPreset="warrior" 
        googleAvatarUrl={null}
        onUpdate={() => {}} 
      />
    );
    const warriorImg = screen.getByAltText('The Sentinel');
    expect(warriorImg.className).toContain('selected');
  });

  it('updates preset on click', async () => {
    const onUpdateSpy = vi.fn();
    (api.patch as any).mockResolvedValue({ ok: true });

    render(
      <AvatarManager 
        currentPreset="warrior" 
        googleAvatarUrl="http://google.com/photo.png"
        onUpdate={onUpdateSpy} 
      />
    );
    
    // Test selecting Google Profile (null)
    const googleProfile = screen.getByText(/Google Profile/i);
    fireEvent.click(googleProfile);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/api/players/me', { avatar_preset_key: null });
      expect(onUpdateSpy).toHaveBeenCalledWith({ preset: undefined });
    });

    // Test selecting a preset
    const mageImg = screen.getByAltText('The Arcanist');
    fireEvent.click(mageImg);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/api/players/me', { avatar_preset_key: 'mage' });
      expect(onUpdateSpy).toHaveBeenCalledWith({ preset: 'mage' });
    });
  });
});
