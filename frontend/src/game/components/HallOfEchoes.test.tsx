import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HallOfEchoes from './HallOfEchoes';
import { api } from '../../api';

vi.mock('../../api', () => ({
  api: {
    get: vi.fn(),
  },
}));

const mockLeaderboardData = {
  entries: [
    {
      rank: 1, player_id: 101, player_alias: 'AlphaOne',
      character_class: 'Sentinel', character_level: 50,
      equipped_title: 'The Conqueror', metric_value: 10401, badge_tier: 'cosmic',
    },
    {
      rank: 2, player_id: 102, player_alias: 'BetaTwo',
      character_class: 'Arcanist', character_level: 45,
      equipped_title: null, metric_value: 10301, badge_tier: 'gold',
    },
    {
      rank: 3, player_id: 103, player_alias: 'GammaTri',
      character_class: 'Warden', character_level: 30,
      equipped_title: null, metric_value: 10201, badge_tier: 'silver',
    },
  ],
  total: 3,
  page: 1,
  per_page: 25,
  player_rank: null,
};

describe('HallOfEchoes Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockLeaderboardData),
    });
  });

  it('renders title', async () => {
    render(<HallOfEchoes />);
    await waitFor(() => {
      expect(screen.getByText('Hall of Echoes')).toBeDefined();
    });
  });

  it('renders category tabs', async () => {
    render(<HallOfEchoes />);
    await waitFor(() => {
      expect(screen.getByText('Vanguard')).toBeDefined();
      expect(screen.getByText('Alchemist')).toBeDefined();
      expect(screen.getByText('Swift')).toBeDefined();
      expect(screen.getByText('Scholar')).toBeDefined();
    });
  });

  it('renders rank entries', async () => {
    render(<HallOfEchoes />);
    await waitFor(() => {
      expect(screen.getByText('AlphaOne')).toBeDefined();
      expect(screen.getByText('BetaTwo')).toBeDefined();
      expect(screen.getByText('GammaTri')).toBeDefined();
    });
  });

  it('shows rank numbers', async () => {
    render(<HallOfEchoes />);
    await waitFor(() => {
      expect(screen.getByText('#1')).toBeDefined();
      expect(screen.getByText('#2')).toBeDefined();
      expect(screen.getByText('#3')).toBeDefined();
    });
  });

  it('shows level and class', async () => {
    render(<HallOfEchoes />);
    await waitFor(() => {
      expect(screen.getByText('Lv.50')).toBeDefined();
      expect(screen.getByText('The Conqueror')).toBeDefined();
    });
  });

  it('formats vanguard metric correctly', async () => {
    render(<HallOfEchoes />);
    await waitFor(() => {
      // metric 10401 = B1 Ch4 S1
      expect(screen.getByText('B1 Ch4 S1')).toBeDefined();
    });
  });

  it('switches categories', async () => {
    render(<HallOfEchoes />);
    await waitFor(() => expect(screen.getByText('AlphaOne')).toBeDefined());

    fireEvent.click(screen.getByText('Alchemist'));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('/leaderboard/alchemist')
      );
    });
  });

  it('highlights current player', async () => {
    render(<HallOfEchoes currentPlayerId={102} />);
    await waitFor(() => {
      const rows = document.querySelectorAll('.hoe-row');
      const selfRow = document.querySelector('.hoe-row.self');
      expect(selfRow).toBeDefined();
      expect(selfRow?.textContent).toContain('BetaTwo');
    });
  });

  it('shows player own rank when not in page', async () => {
    const dataWithPlayerRank = {
      ...mockLeaderboardData,
      player_rank: {
        rank: 42, player_id: 999, player_alias: 'MySelf',
        character_class: 'Sentinel', character_level: 20,
        equipped_title: null, metric_value: 10101, badge_tier: null,
      },
    };
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(dataWithPlayerRank),
    });

    render(<HallOfEchoes currentPlayerId={999} />);
    await waitFor(() => {
      expect(screen.getByText('Your Rank')).toBeDefined();
      expect(screen.getByText('#42')).toBeDefined();
      expect(screen.getByText('MySelf')).toBeDefined();
    });
  });

  it('shows loading state', () => {
    (api.get as any).mockReturnValue(new Promise(() => {}));
    render(<HallOfEchoes />);
    expect(screen.getByText('Synchronizing tower records...')).toBeDefined();
  });

  it('shows error state', async () => {
    (api.get as any).mockResolvedValue({ ok: false });
    render(<HallOfEchoes />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load leaderboard data.')).toBeDefined();
    });
  });

  it('shows empty state', async () => {
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        entries: [], total: 0, page: 1, per_page: 25, player_rank: null,
      }),
    });
    render(<HallOfEchoes />);
    await waitFor(() => {
      expect(screen.getByText('No rankings recorded yet.')).toBeDefined();
    });
  });

  it('shows category description', async () => {
    render(<HallOfEchoes />);
    await waitFor(() => {
      expect(screen.getByText('Furthest narrative progression')).toBeDefined();
    });
  });
});
