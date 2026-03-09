import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AchievementEditor from './AchievementEditor';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockAchievementList = [
  {
    id: 1, name: 'Enemy Slayer I', description: 'Kill 10 enemies.',
    category: 'combat', tracking_type: 'cumulative', tracking_source: 'total_enemies_killed',
    threshold_value: 10, parent_achievement_id: null,
    reward_shards: 10, reward_essence: 50, reward_title_id: null,
    sort_order: 1, is_active: true, completed_count: 42, total_tracked: 100,
  },
  {
    id: 2, name: 'Lore Seeker', description: 'Unlock 20 story beats.',
    category: 'narrative', tracking_type: 'cumulative', tracking_source: 'total_beats_unlocked',
    threshold_value: 20, parent_achievement_id: null,
    reward_shards: 0, reward_essence: 100, reward_title_id: 5,
    sort_order: 1, is_active: true, completed_count: 8, total_tracked: 30,
  },
];

const mockAchievementDetail = {
  ...mockAchievementList[0],
  icon_sprite_key: 'ach_slayer',
  reward_title_name: null,
  in_progress_count: 58,
  children: [
    { id: 3, name: 'Enemy Slayer II', threshold_value: 50 },
  ],
};

const mockAnalytics = {
  total_achievements: 50,
  total_completions: 200,
  category_stats: {
    combat: { total: 20, total_completions: 80 },
    narrative: { total: 15, total_completions: 40 },
  },
  most_completed: [
    { id: 1, name: 'Enemy Slayer I', completions: 42 },
  ],
};

describe('AchievementEditor', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/achievements/analytics')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAnalytics) });
      if (url.includes('/achievements/')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAchievementDetail) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAchievementList) });
    });
    (api.post as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 10, name: 'New Ach' }) });
    (api.put as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 1, name: 'Enemy Slayer I', updated_fields: ['name'] }) });
    (api.delete as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 1, deactivated: true }) });
  });

  it('renders title and list', async () => {
    render(<AchievementEditor />);
    await waitFor(() => {
      expect(screen.getByText('Achievement Editor')).toBeDefined();
      expect(screen.getByText('Enemy Slayer I')).toBeDefined();
      expect(screen.getByText('Lore Seeker')).toBeDefined();
    });
  });

  it('shows reward badges in list', async () => {
    render(<AchievementEditor />);
    await waitFor(() => {
      expect(screen.getByText('10S')).toBeDefined();
      expect(screen.getByText('100E')).toBeDefined();
      expect(screen.getByText('T')).toBeDefined();
    });
  });

  it('shows completed count', async () => {
    render(<AchievementEditor />);
    await waitFor(() => {
      expect(screen.getByText('42')).toBeDefined();
      expect(screen.getByText('8')).toBeDefined();
    });
  });

  it('loads detail on row click', async () => {
    render(<AchievementEditor />);
    await waitFor(() => expect(screen.getByText('Enemy Slayer I')).toBeDefined());

    fireEvent.click(screen.getByText('Enemy Slayer I'));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/admin/achievements/1');
      expect(screen.getByText('Kill 10 enemies.')).toBeDefined();
    });
  });

  it('shows children in detail', async () => {
    render(<AchievementEditor />);
    await waitFor(() => expect(screen.getByText('Enemy Slayer I')).toBeDefined());
    fireEvent.click(screen.getByText('Enemy Slayer I'));

    await waitFor(() => {
      expect(screen.getByText('Child Achievements')).toBeDefined();
      expect(screen.getByText('Enemy Slayer II')).toBeDefined();
    });
  });

  it('shows player override section', async () => {
    render(<AchievementEditor />);
    await waitFor(() => expect(screen.getByText('Enemy Slayer I')).toBeDefined());
    fireEvent.click(screen.getByText('Enemy Slayer I'));

    await waitFor(() => {
      expect(screen.getByText('Player Override')).toBeDefined();
      expect(screen.getByText('Apply')).toBeDefined();
    });
  });

  it('enters edit mode', async () => {
    render(<AchievementEditor />);
    await waitFor(() => expect(screen.getByText('Enemy Slayer I')).toBeDefined());
    fireEvent.click(screen.getByText('Enemy Slayer I'));

    await waitFor(() => expect(screen.getByText('Edit')).toBeDefined());
    fireEvent.click(screen.getByText('Edit'));

    await waitFor(() => {
      expect(screen.getByText('Editing: Enemy Slayer I')).toBeDefined();
      expect(screen.getByText('Save')).toBeDefined();
    });
  });

  it('opens create form', async () => {
    render(<AchievementEditor />);
    await waitFor(() => expect(screen.getByText('+ New Achievement')).toBeDefined());

    fireEvent.click(screen.getByText('+ New Achievement'));

    await waitFor(() => {
      expect(screen.getByText('New Achievement')).toBeDefined();
      expect(screen.getByText('Create')).toBeDefined();
    });
  });

  it('filters by category', async () => {
    render(<AchievementEditor />);
    await waitFor(() => expect(screen.getByText('Enemy Slayer I')).toBeDefined());

    const select = screen.getByDisplayValue('All Categories');
    fireEvent.change(select, { target: { value: 'narrative' } });

    await waitFor(() => {
      expect(screen.getByText('Lore Seeker')).toBeDefined();
      expect(screen.queryByText('Enemy Slayer I')).toBeNull();
    });
  });

  it('shows analytics panel', async () => {
    render(<AchievementEditor />);
    await waitFor(() => expect(screen.getByText('Analytics')).toBeDefined());

    fireEvent.click(screen.getByText('Analytics'));

    await waitFor(() => {
      expect(screen.getByText('50')).toBeDefined();
      expect(screen.getByText('200')).toBeDefined();
    });
  });

  it('calls deactivate on delete', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<AchievementEditor />);
    await waitFor(() => expect(screen.getByText('Enemy Slayer I')).toBeDefined());
    fireEvent.click(screen.getByText('Enemy Slayer I'));

    await waitFor(() => expect(screen.getByText('Deactivate')).toBeDefined());
    fireEvent.click(screen.getByText('Deactivate'));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/admin/achievements/1');
    });
  });

  it('performs player override', async () => {
    render(<AchievementEditor />);
    await waitFor(() => expect(screen.getByText('Enemy Slayer I')).toBeDefined());
    fireEvent.click(screen.getByText('Enemy Slayer I'));

    await waitFor(() => expect(screen.getByPlaceholderText('Player ID')).toBeDefined());

    fireEvent.change(screen.getByPlaceholderText('Player ID'), { target: { value: '42' } });
    fireEvent.click(screen.getByText('Apply'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/admin/achievements/player-override', {
        player_id: 42, achievement_id: 1, action: 'grant',
      });
    });
  });

  it('shows loading state', () => {
    (api.get as any).mockReturnValue(new Promise(() => {}));
    render(<AchievementEditor />);
    expect(screen.getByText('Loading achievements...')).toBeDefined();
  });

  it('shows empty detail placeholder', async () => {
    render(<AchievementEditor />);
    await waitFor(() => {
      expect(screen.getByText('Select an achievement or create a new one.')).toBeDefined();
    });
  });
});
