import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MainGameLayout from './MainGameLayout';
import { BrowserRouter } from 'react-router-dom';

// Mock child components to focus on layout logic
vi.mock('./components/TopBar', () => ({ default: () => <div data-testid="top-bar" /> }));
vi.mock('./components/Sidebar', () => ({ default: () => <div data-testid="sidebar" /> }));
vi.mock('./components/OverworldMap', () => ({ default: () => <div data-testid="overworld-map" /> }));
vi.mock('./components/BottomAnimatedBanner', () => ({ default: () => <div data-testid="bottom-banner" /> }));
vi.mock('./components/StoryMode', () => ({ default: () => <div data-testid="story-mode" /> }));
vi.mock('./components/SkillsTab', () => ({ default: () => <div data-testid="skills-tab" /> }));
vi.mock('./components/ChatTab', () => ({ default: () => <div data-testid="chat-tab" /> }));
vi.mock('./components/HomeBase', () => ({ default: () => <div data-testid="home-base" /> }));
vi.mock('./components/shop/ShopTab', () => ({ default: () => <div data-testid="shop-tab" /> }));
vi.mock('./components/subscription/SubscriptionPage', () => ({ SubscriptionPage: () => <div data-testid="subscription" /> }));
vi.mock('./components/story/PostBattleSummary', () => ({ default: () => <div data-testid="post-battle-summary" /> }));
vi.mock('./components/story/WelcomeModal', () => ({ default: ({ onClose }: any) => <div data-testid="welcome-modal"><button onClick={onClose}>Close</button></div> }));
vi.mock('./components/story/TutorialOverlay', () => ({ default: () => <div data-testid="tutorial-overlay" /> }));

describe('MainGameLayout Component', () => {
  const mockOnCharacterCreated = vi.fn();
  const mockOnPlayerUpdate = vi.fn();

  it('renders the game layout with map, top bar, and sidebar', () => {
    const mockCharacter = { id: 1, character_name: 'Test', level: 1, class: null, strength: 10, agility: 10, intelligence: 10, created_at: '' };
    render(
      <BrowserRouter>
        <MainGameLayout player={null} character={mockCharacter} onCharacterCreated={mockOnCharacterCreated} onPlayerUpdate={mockOnPlayerUpdate} />
      </BrowserRouter>
    );
    expect(screen.getByTestId('overworld-map')).toBeDefined();
    expect(screen.getByTestId('top-bar')).toBeDefined();
    expect(screen.getByTestId('sidebar')).toBeDefined();
  });

  it('renders the game layout even when character is null', () => {
    render(
      <BrowserRouter>
        <MainGameLayout player={null} character={null} onCharacterCreated={mockOnCharacterCreated} onPlayerUpdate={mockOnPlayerUpdate} />
      </BrowserRouter>
    );
    // Layout still renders with map as default tab
    expect(screen.getByTestId('overworld-map')).toBeDefined();
    expect(screen.getByTestId('top-bar')).toBeDefined();
  });
});
