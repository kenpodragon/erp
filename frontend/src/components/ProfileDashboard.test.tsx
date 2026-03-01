import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ProfileDashboard } from './ProfileDashboard';

vi.mock('./AliasEditor', () => ({
  AliasEditor: () => <div data-testid="alias-editor">Alias Editor</div>
}));
vi.mock('./AvatarManager', () => ({
  AvatarManager: () => <div data-testid="avatar-manager">Avatar Manager</div>
}));
vi.mock('./AudioSettings', () => ({
  AudioSettings: () => <div data-testid="audio-settings">Audio Settings</div>
}));
vi.mock('./CharacterCreator', () => ({
  CharacterCreator: () => <div data-testid="character-creator">Character Creator</div>
}));

const defaultProps = {
  onRefresh: vi.fn(),
  onCharacterCreated: vi.fn(),
  onCharacterDeleted: vi.fn(),
  onLogout: vi.fn(),
  character: null,
};

describe('ProfileDashboard', () => {
  const mockPlayer = {
    id: 1,
    firebase_uid: 'test_firebase_uid',
    alias: 'TestHero',
    email: 'test@example.com',
    google_display_name: 'Test Google Name',
    google_avatar_url: null,
    custom_avatar_url: null,
    avatar_preset_key: 'warrior',
    created_at: new Date().toISOString(),
    terms_accepted_at: new Date().toISOString(),
    settings: {
      audio_enabled: true,
      music_volume: 50,
      sfx_volume: 50,
      narration_speed: 1.0
    }
  };

  it('renders core profile sections', () => {
    render(
      <MemoryRouter>
        <ProfileDashboard player={mockPlayer} {...defaultProps} />
      </MemoryRouter>
    );

    expect(screen.getByText('test@example.com')).toBeTruthy();
    expect(screen.getByTestId('alias-editor')).toBeTruthy();
    expect(screen.getByTestId('character-creator')).toBeTruthy();
    // AvatarManager and AudioSettings are behind modals (not rendered until opened)
  });

  it('shows logout button at the top', () => {
    render(
      <MemoryRouter>
        <ProfileDashboard player={mockPlayer} {...defaultProps} />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /Logout/i })).toBeTruthy();
  });

  it('shows terms of service button if not accepted', () => {
    const playerNoTerms = { ...mockPlayer, terms_accepted_at: null };
    render(
      <MemoryRouter>
        <ProfileDashboard player={playerNoTerms} {...defaultProps} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Accept Terms of Service/i)).toBeTruthy();
  });
});
