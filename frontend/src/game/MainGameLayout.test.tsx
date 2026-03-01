import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MainGameLayout from './MainGameLayout';
import { BrowserRouter } from 'react-router-dom';

// Mock child components to focus on layout logic
vi.mock('./components/TopBar', () => ({ default: () => <div data-testid="top-bar" /> }));
vi.mock('./components/Sidebar', () => ({ default: () => <div data-testid="sidebar" /> }));
vi.mock('./components/OverworldMap', () => ({ default: () => <div data-testid="overworld-map" /> }));
vi.mock('./components/BottomAnimatedBanner', () => ({ default: () => <div data-testid="bottom-banner" /> }));

describe('MainGameLayout Component', () => {
  const mockOnCharacterCreated = vi.fn();
  
  it('renders character creator if no character is provided', () => {
    render(
      <BrowserRouter>
        <MainGameLayout player={null} character={null} onCharacterCreated={mockOnCharacterCreated} />
      </BrowserRouter>
    );
    expect(screen.getByText('Awaken Your Vessel')).toBeDefined();
  });

  it('renders the game map if character exists', () => {
    const mockCharacter = { id: 1, character_name: 'Test', level: 1, class: null, strength: 10, agility: 10, intelligence: 10, created_at: '' };
    render(
      <BrowserRouter>
        <MainGameLayout player={null} character={mockCharacter} onCharacterCreated={mockOnCharacterCreated} />
      </BrowserRouter>
    );
    expect(screen.getByTestId('overworld-map')).toBeDefined();
    expect(screen.getByTestId('top-bar')).toBeDefined();
    expect(screen.getByTestId('sidebar')).toBeDefined();
  });
});
