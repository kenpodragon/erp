import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TopBar from './TopBar';
import { GameProvider } from '../GameContext';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../../api', () => ({
  api: {
    get: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })),
    post: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
    patch: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
  },
  apiEvents: new EventTarget(),
}));

// Mock the useGame hook or wrap in GameProvider
const renderTopBar = (props: any) => {
  return render(
    <BrowserRouter>
      <GameProvider initialEssence={props.character?.essence?.current_balance || 0}>
        <TopBar {...props} />
      </GameProvider>
    </BrowserRouter>
  );
};

describe('TopBar Component', () => {
  const mockPlayer = {
    alias: 'Test Player',
    google_display_name: 'Google User',
    google_avatar_url: null,
    avatar_preset_key: 'engineer'
  };

  const mockCharacter = {
    id: 1,
    character_name: 'Vessel One',
    level: 10,
    class: { sprite_key: 'class_vessel' },
    essence: { current_balance: 5000 }
  };

  it('renders character name and level correctly', () => {
    renderTopBar({ player: mockPlayer, character: mockCharacter });
    expect(screen.getByText('Vessel One')).toBeDefined();
    expect(screen.getByText('Lv. 10')).toBeDefined();
  });

  it('renders essence balance from character data', () => {
    renderTopBar({ player: mockPlayer, character: mockCharacter });
    expect(screen.getByText('5,000')).toBeDefined();
  });

  it('falls back to player alias if character name is missing', () => {
    renderTopBar({ player: mockPlayer, character: null });
    expect(screen.getByText('Test Player')).toBeDefined();
  });

  it('uses AvatarPreset canvas for avatar if class sprite is available', () => {
    renderTopBar({ player: mockPlayer, character: mockCharacter });
    // AvatarPreset renders a <canvas> element with the title set to the preset key
    const canvas = document.querySelector('.player-avatar-mini');
    expect(canvas).toBeDefined();
    expect(canvas?.tagName.toLowerCase()).toBe('canvas');
  });

  it('does not render booster section when no boosters active', () => {
    renderTopBar({ player: mockPlayer, character: mockCharacter });
    const boosters = document.querySelector('.topbar-boosters');
    expect(boosters).toBeNull();
  });
});
