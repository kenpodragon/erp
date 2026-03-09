import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomeBase from './HomeBase';
import { api } from '../../api';

// Mock the API
vi.mock('../../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({ ok: true }),
    patch: vi.fn().mockResolvedValue({ ok: true }),
  }
}));

describe('HomeBase Component', () => {
  const mockPlayer = { id: 1, alias: 'Test' };
  const mockCharacter = { character_name: 'Hero' };

  beforeEach(() => {
    vi.resetAllMocks();

    // Default mock responses
    (api.post as any).mockResolvedValue({ ok: true });
    (api.patch as any).mockResolvedValue({ ok: true });
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('home-base/artifacts')) return Promise.resolve({ ok: true, json: () => Promise.resolve({
        owned_artifacts: [
          { id: 1, type: 'curated', name: 'Core', rarity: 'rare', icon_sprite_key: 'core',
            stat_bonuses: { strength: 2 }, acquired_from: 'boss', acquired_at: '2026-03-09T12:00:00Z',
            is_new: false, curated_artifact_id: 1, source_hint: 'Defeat boss', lore_text: 'Lore A', description: 'A core relic' }
        ],
        curated_collection: { total: 3, owned: 1, undiscovered: [] },
        generated_count: 0,
        stat_total: { strength: 2 },
      })});
      if (url.includes('akashic-log')) return Promise.resolve({ ok: true, json: () => Promise.resolve({
        total_completion_pct: 50, total_unlocked: 6, total_beats: 12, books: []
      })});
      if (url.includes('leaderboard/')) return Promise.resolve({ ok: true, json: () => Promise.resolve({
        entries: [
          { rank: 1, player_id: 99, player_alias: 'Xenon', character_class: 'Sentinel',
            character_level: 50, equipped_title: null, metric_value: 10401, badge_tier: 'cosmic' }
        ],
        total: 1, page: 1, per_page: 25, player_rank: null,
      })});
      if (url.includes('achievements')) return Promise.resolve({ ok: true, json: () => Promise.resolve({
        achievements: [
          { id: 1, name: 'Slayer I', description: 'Kill 10.', category: 'combat',
            icon_sprite_key: 'ach', tracking_type: 'cumulative', threshold_value: 10,
            parent_achievement_id: null, reward_shards: 10, reward_essence: 0,
            reward_title_id: null, sort_order: 1, is_completed: true, is_new: false,
            progress_value: 10, earned_at: '2026-03-09T12:00:00Z' }
        ],
        total: 1, total_completed: 1,
        category_counts: { combat: { total: 1, completed: 1 } },
      })});
      if (url.includes('home-base/summary')) return Promise.resolve({ ok: true, json: () => Promise.resolve({
        badges: { akashic_log: 1, relic_gallery: 2, achievements: 0, total: 3 },
        progress: { achievements: { completed: 1, total: 5 }, curated_artifacts: { owned: 1, total: 3 }, total_artifacts: 2 },
      })});
      if (url.includes('registry/stats')) return Promise.resolve({ ok: true, json: () => Promise.resolve({
        total_entities: 10, discovered_entities: 3, entity_completion_pct: 30,
        total_skills: 8, discovered_skills: 2, skill_completion_pct: 25,
      })});
      return Promise.resolve({ ok: false });
    });
  });

  it('renders section headers and title', async () => {
    render(<HomeBase player={mockPlayer} character={mockCharacter} />);

    await waitFor(() => {
      expect(screen.getByText('Home Base')).toBeDefined();
      expect(screen.getByText('The Akashic Log')).toBeDefined();
      expect(screen.getByText('Relic Gallery')).toBeDefined();
      expect(screen.getByText('Hall of Echoes')).toBeDefined();
      expect(screen.getByText('Achievement Matrix')).toBeDefined();
    });
  });

  it('renders artifacts and handles click details', async () => {
    render(<HomeBase player={mockPlayer} character={mockCharacter} />);

    await waitFor(() => {
      const artifact = screen.getByText('Core');
      expect(artifact).toBeDefined();
      fireEvent.click(artifact);
    });

    await waitFor(() => {
      expect(screen.getByText('Lore A')).toBeDefined();
    });
  });

  it('renders leaderboard entries', async () => {
    render(<HomeBase player={mockPlayer} character={mockCharacter} />);

    await waitFor(() => {
      expect(screen.getByText('Xenon')).toBeDefined();
      expect(screen.getByText('#1')).toBeDefined();
    });
  });

  it('shows confirmation on progress wipe', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    render(<HomeBase player={mockPlayer} character={mockCharacter} />);

    const wipeBtn = await screen.findByText(/Wipe Character Data/);
    fireEvent.click(wipeBtn);

    expect(confirmSpy).toHaveBeenCalled();
    expect(api.post).toHaveBeenCalledWith('/api/players/me/reset');
  });
});
