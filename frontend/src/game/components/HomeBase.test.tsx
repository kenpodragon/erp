import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomeBase from './HomeBase';
import { api } from '../../api';

// Mock child tab components
vi.mock('./AkashicLog', () => ({
  default: () => <div data-testid="akashic-log">AkashicLog</div>,
}));
vi.mock('./RelicGallery', () => ({
  default: () => <div data-testid="relic-gallery">RelicGallery</div>,
}));
vi.mock('./HallOfEchoes', () => ({
  default: () => <div data-testid="hall-of-echoes">HallOfEchoes</div>,
}));
vi.mock('./AchievementMatrix', () => ({
  default: () => <div data-testid="achievement-matrix">AchievementMatrix</div>,
}));
vi.mock('./story/EthericRegistry', () => ({
  default: () => <div data-testid="etheric-registry">EthericRegistry</div>,
}));
vi.mock('./story/DiscoveryLibrary', () => ({
  default: () => <div data-testid="discovery-library">DiscoveryLibrary</div>,
}));

describe('HomeBase Component', () => {
  const mockPlayer = { id: 1, alias: 'Test' };
  const mockCharacter = { character_name: 'Hero' };

  beforeEach(() => {
    vi.clearAllMocks();

    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('home-base/summary')) return Promise.resolve({ ok: true, json: () => Promise.resolve({
        badges: { akashic_log: 1, relic_gallery: 2, achievements: 0, total: 3 },
        progress: { achievements: { completed: 1, total: 5 }, curated_artifacts: { owned: 1, total: 3 }, total_artifacts: 2 },
      })});
      return Promise.resolve({ ok: false });
    });
  });

  it('renders title and tab navigation', async () => {
    render(<HomeBase player={mockPlayer} character={mockCharacter} />);

    await waitFor(() => {
      expect(screen.getByText('Home Base')).toBeDefined();
    });

    // Tab buttons should be visible
    expect(screen.getByText('Akashic Log')).toBeDefined();
    expect(screen.getByText('Relic Gallery')).toBeDefined();
    expect(screen.getByText('Hall of Echoes')).toBeDefined();
    expect(screen.getByText('Achievements')).toBeDefined();
  });

  it('renders Akashic Log tab by default', async () => {
    render(<HomeBase player={mockPlayer} character={mockCharacter} />);

    await waitFor(() => {
      expect(screen.getByTestId('akashic-log')).toBeDefined();
    });
  });

  it('switches tabs when clicking tab buttons', async () => {
    render(<HomeBase player={mockPlayer} character={mockCharacter} />);

    await waitFor(() => {
      expect(screen.getByText('Home Base')).toBeDefined();
    });

    // Click Relic Gallery tab
    fireEvent.click(screen.getByText('Relic Gallery'));
    expect(screen.getByTestId('relic-gallery')).toBeDefined();

    // Click Hall of Echoes tab
    fireEvent.click(screen.getByText('Hall of Echoes'));
    expect(screen.getByTestId('hall-of-echoes')).toBeDefined();
  });

  it('shows badge counts on tabs', async () => {
    render(<HomeBase player={mockPlayer} character={mockCharacter} />);

    await waitFor(() => {
      expect(screen.getByText('Home Base')).toBeDefined();
    });

    // Badge total "3 new" should be shown
    expect(screen.getByText('3 new')).toBeDefined();
  });
});
