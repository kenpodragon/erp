import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RelicGallery from './RelicGallery';
import { api } from '../../api';

vi.mock('../../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

const mockGalleryData = {
  owned_artifacts: [
    {
      id: 1, type: 'curated', name: 'Void Shard', rarity: 'epic',
      icon_sprite_key: 'void_shard', stat_bonuses: { strength: 5, intelligence: 3 },
      acquired_from: 'Chapter Boss', acquired_at: '2026-03-09T12:00:00Z',
      is_new: true, curated_artifact_id: 10, source_hint: 'Defeat Ch1 Boss',
      lore_text: 'A fragment of the void itself.', description: 'Glowing purple crystal',
      artifact_code: undefined,
    },
    {
      id: 2, type: 'generated', name: 'Rusty Blade', rarity: 'common',
      icon_sprite_key: 'rusty_blade', stat_bonuses: { strength: 1 },
      acquired_from: 'Drop', acquired_at: '2026-03-08T10:00:00Z',
      is_new: false, source_hint: null, lore_text: null,
      description: 'A worn blade', artifact_code: 'GEN-001',
    },
    {
      id: 3, type: 'curated', name: 'Ether Fragment', rarity: 'rare',
      icon_sprite_key: 'ether', stat_bonuses: { intelligence: 2 },
      acquired_from: 'Hidden', acquired_at: '2026-03-07T08:00:00Z',
      is_new: false, curated_artifact_id: 12, source_hint: 'Find hidden area',
      lore_text: 'Pulsing with ethereal energy.', description: null,
      artifact_code: undefined,
    },
  ],
  curated_collection: {
    total: 5,
    owned: 2,
    undiscovered: [
      { curated_artifact_id: 11, name: '???', source_hint: 'Complete Book 1', source_type: 'mastery', silhouette: true },
      { curated_artifact_id: 13, name: '???', source_hint: 'Reach Floor 50', source_type: 'progression', silhouette: true },
      { curated_artifact_id: 14, name: '???', source_hint: 'Find all lore', source_type: 'hidden', silhouette: true },
    ],
  },
  generated_count: 1,
  stat_total: { strength: 6, intelligence: 5 },
};

describe('RelicGallery Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockGalleryData),
    });
    (api.post as any).mockResolvedValue({ ok: true });
  });

  it('renders gallery title and collection stats', async () => {
    render(<RelicGallery />);
    await waitFor(() => {
      expect(screen.getByText('Relic Gallery')).toBeDefined();
      expect(screen.getByText('2/5 Curated')).toBeDefined();
      expect(screen.getByText('1 Generated')).toBeDefined();
    });
  });

  it('shows new count badge', async () => {
    render(<RelicGallery />);
    await waitFor(() => {
      expect(screen.getByText('1 new')).toBeDefined();
    });
  });

  it('renders stat totals', async () => {
    render(<RelicGallery />);
    await waitFor(() => {
      expect(screen.getByText('+6 strength')).toBeDefined();
      expect(screen.getByText('+5 intelligence')).toBeDefined();
    });
  });

  it('renders owned artifact cards', async () => {
    render(<RelicGallery />);
    await waitFor(() => {
      expect(screen.getByText('Void Shard')).toBeDefined();
      expect(screen.getByText('Rusty Blade')).toBeDefined();
      expect(screen.getByText('Ether Fragment')).toBeDefined();
    });
  });

  it('shows NEW badge on new artifacts', async () => {
    render(<RelicGallery />);
    await waitFor(() => {
      expect(screen.getByText('NEW')).toBeDefined();
    });
  });

  it('renders undiscovered silhouettes', async () => {
    render(<RelicGallery />);
    await waitFor(() => {
      const silhouettes = screen.getAllByText('???');
      expect(silhouettes.length).toBe(3);
      expect(screen.getByText('Complete Book 1')).toBeDefined();
    });
  });

  it('opens inspection modal on artifact click', async () => {
    render(<RelicGallery />);
    await waitFor(() => {
      expect(screen.getByText('Void Shard')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Void Shard'));

    await waitFor(() => {
      expect(screen.getByText('A fragment of the void itself.')).toBeDefined();
      expect(screen.getByText('Glowing purple crystal')).toBeDefined();
      expect(screen.getByText('Stat Bonuses')).toBeDefined();
    });
  });

  it('closes modal on close button click', async () => {
    render(<RelicGallery />);
    await waitFor(() => expect(screen.getByText('Void Shard')).toBeDefined());

    fireEvent.click(screen.getByText('Void Shard'));
    await waitFor(() => expect(screen.getByText('A fragment of the void itself.')).toBeDefined());

    fireEvent.click(screen.getByText('\u00d7'));
    await waitFor(() => {
      expect(screen.queryByText('A fragment of the void itself.')).toBeNull();
    });
  });

  it('filters by type', async () => {
    render(<RelicGallery />);
    await waitFor(() => expect(screen.getByText('Void Shard')).toBeDefined());

    const typeSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(typeSelect, { target: { value: 'generated' } });

    await waitFor(() => {
      expect(screen.getByText('Rusty Blade')).toBeDefined();
      expect(screen.queryByText('Void Shard')).toBeNull();
    });
  });

  it('filters by rarity', async () => {
    render(<RelicGallery />);
    await waitFor(() => expect(screen.getByText('Void Shard')).toBeDefined());

    const raritySelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(raritySelect, { target: { value: 'epic' } });

    await waitFor(() => {
      expect(screen.getByText('Void Shard')).toBeDefined();
      expect(screen.queryByText('Rusty Blade')).toBeNull();
      expect(screen.queryByText('Ether Fragment')).toBeNull();
    });
  });

  it('toggles undiscovered visibility', async () => {
    render(<RelicGallery />);
    await waitFor(() => expect(screen.getAllByText('???').length).toBe(3));

    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(screen.queryByText('???')).toBeNull();
    });
  });

  it('calls mark-visited on load', async () => {
    render(<RelicGallery />);
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/game/home-base/artifacts/mark-visited');
    });
  });

  it('shows loading state', () => {
    (api.get as any).mockReturnValue(new Promise(() => {}));
    render(<RelicGallery />);
    expect(screen.getByText('Scanning artifact repository...')).toBeDefined();
  });

  it('shows error state on API failure', async () => {
    (api.get as any).mockResolvedValue({ ok: false });
    render(<RelicGallery />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load artifact data.')).toBeDefined();
    });
  });

  it('sorts by name', async () => {
    render(<RelicGallery />);
    await waitFor(() => expect(screen.getByText('Void Shard')).toBeDefined());

    const sortSelect = screen.getAllByRole('combobox')[2];
    fireEvent.change(sortSelect, { target: { value: 'name' } });

    // After sorting by name: Ether Fragment, Rusty Blade, Void Shard
    const cards = screen.getAllByRole('button').filter(
      btn => btn.classList.contains('relic-card')
    );
    expect(cards[0].textContent).toContain('Ether Fragment');
    expect(cards[1].textContent).toContain('Rusty Blade');
    expect(cards[2].textContent).toContain('Void Shard');
  });
});
