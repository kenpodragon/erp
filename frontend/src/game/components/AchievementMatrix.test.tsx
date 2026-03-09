import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AchievementMatrix from './AchievementMatrix';
import { api } from '../../api';

vi.mock('../../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

const mockAchievementData = {
  achievements: [
    {
      id: 1, name: 'Enemy Slayer I', description: 'Kill 10 enemies.',
      category: 'combat', icon_sprite_key: 'ach_slayer', tracking_type: 'cumulative',
      threshold_value: 10, parent_achievement_id: null, reward_shards: 10,
      reward_essence: 50, reward_title_id: null, sort_order: 1,
      is_completed: true, is_new: true, progress_value: 10, earned_at: '2026-03-09T12:00:00Z',
    },
    {
      id: 2, name: 'Enemy Slayer II', description: 'Kill 50 enemies.',
      category: 'combat', icon_sprite_key: 'ach_slayer', tracking_type: 'cumulative',
      threshold_value: 50, parent_achievement_id: 1, reward_shards: 20,
      reward_essence: 100, reward_title_id: null, sort_order: 2,
      is_completed: false, is_new: false, progress_value: 25, earned_at: null,
    },
    {
      id: 3, name: 'Lore Seeker', description: 'Unlock 20 story beats.',
      category: 'narrative', icon_sprite_key: 'ach_lore', tracking_type: 'cumulative',
      threshold_value: 20, parent_achievement_id: null, reward_shards: 0,
      reward_essence: 100, reward_title_id: 5, sort_order: 1,
      is_completed: false, is_new: false, progress_value: 8, earned_at: null,
    },
  ],
  total: 3,
  total_completed: 1,
  category_counts: {
    combat: { total: 2, completed: 1 },
    narrative: { total: 1, completed: 0 },
  },
};

describe('AchievementMatrix Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAchievementData),
    });
    (api.post as any).mockResolvedValue({ ok: true });
  });

  it('renders title and summary', async () => {
    render(<AchievementMatrix />);
    await waitFor(() => {
      expect(screen.getByText('Achievement Matrix')).toBeDefined();
      expect(screen.getByText('/ 3 completed')).toBeDefined();
    });
  });

  it('renders category tabs', async () => {
    render(<AchievementMatrix />);
    await waitFor(() => {
      expect(screen.getByText('All')).toBeDefined();
      expect(screen.getByText('Combat')).toBeDefined();
      expect(screen.getByText('Narrative')).toBeDefined();
    });
  });

  it('renders achievement cards', async () => {
    render(<AchievementMatrix />);
    await waitFor(() => {
      expect(screen.getByText('Enemy Slayer I')).toBeDefined();
      expect(screen.getByText('Enemy Slayer II')).toBeDefined();
      expect(screen.getByText('Lore Seeker')).toBeDefined();
    });
  });

  it('shows NEW badge on new achievements', async () => {
    render(<AchievementMatrix />);
    await waitFor(() => {
      expect(screen.getByText('NEW')).toBeDefined();
      expect(screen.getByText('1 new')).toBeDefined();
    });
  });

  it('shows progress bar for incomplete achievements', async () => {
    render(<AchievementMatrix />);
    await waitFor(() => {
      // Enemy Slayer II: 25/50
      expect(screen.getByText('25/50')).toBeDefined();
      // Lore Seeker: 8/20
      expect(screen.getByText('8/20')).toBeDefined();
    });
  });

  it('shows complete for completed achievements', async () => {
    render(<AchievementMatrix />);
    await waitFor(() => {
      expect(screen.getByText('Complete')).toBeDefined();
    });
  });

  it('shows reward badges', async () => {
    render(<AchievementMatrix />);
    await waitFor(() => {
      expect(screen.getByText('10 Shards')).toBeDefined();
      expect(screen.getByText('50 Essence')).toBeDefined();
      expect(screen.getByText('Title')).toBeDefined();
    });
  });

  it('shows earned date', async () => {
    render(<AchievementMatrix />);
    await waitFor(() => {
      const dateText = screen.getByText(/Earned/);
      expect(dateText).toBeDefined();
    });
  });

  it('filters by category', async () => {
    render(<AchievementMatrix />);
    await waitFor(() => expect(screen.getByText('Enemy Slayer I')).toBeDefined());

    fireEvent.click(screen.getByText('Narrative'));

    await waitFor(() => {
      expect(screen.getByText('Lore Seeker')).toBeDefined();
      expect(screen.queryByText('Enemy Slayer I')).toBeNull();
    });
  });

  it('shows category progress bar when filtered', async () => {
    render(<AchievementMatrix />);
    await waitFor(() => expect(screen.getByText('Enemy Slayer I')).toBeDefined());

    fireEvent.click(screen.getByText('Combat'));

    await waitFor(() => {
      // Combat: 1/2 = 50%
      expect(screen.getByText('50%')).toBeDefined();
    });
  });

  it('calls mark-visited on load', async () => {
    render(<AchievementMatrix />);
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/game/home-base/achievements/mark-visited');
    });
  });

  it('shows loading state', () => {
    (api.get as any).mockReturnValue(new Promise(() => {}));
    render(<AchievementMatrix />);
    expect(screen.getByText('Scanning achievement archive...')).toBeDefined();
  });

  it('shows error state', async () => {
    (api.get as any).mockResolvedValue({ ok: false });
    render(<AchievementMatrix />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load achievement data.')).toBeDefined();
    });
  });

  it('shows tab counts', async () => {
    render(<AchievementMatrix />);
    await waitFor(() => {
      expect(screen.getByText('1/3')).toBeDefined();  // All tab
      expect(screen.getByText('1/2')).toBeDefined();   // Combat tab
      expect(screen.getByText('0/1')).toBeDefined();   // Narrative tab
    });
  });
});
