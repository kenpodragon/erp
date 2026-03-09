import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ArtifactEditor from './ArtifactEditor';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockArtifactList = [
  {
    id: 1, name: 'Blade of Dawn', description: 'A radiant blade.',
    icon_sprite_key: 'blade_dawn', source_type: 'boss', source_id: 5,
    source_hint: 'Dropped by the Dawn Sentinel', base_drop_chance: 0.05,
    is_active: true, tier_count: 3, owner_count: 12,
  },
  {
    id: 2, name: 'Shadow Core', description: 'Dark essence.',
    icon_sprite_key: 'shadow_core', source_type: 'chapter', source_id: 2,
    source_hint: 'Complete Chapter 2', base_drop_chance: 0.1,
    is_active: true, tier_count: 2, owner_count: 5,
  },
];

const mockArtifactDetail = {
  ...mockArtifactList[0],
  lore_text: 'Forged in the first dawn.',
  synergy_set_id: null,
  tiers: [
    { id: 1, rarity: 'common', stat_bonuses: { strength: 2 }, unique_effect_text: null, drop_chance_multiplier: 1.0 },
    { id: 2, rarity: 'rare', stat_bonuses: { strength: 5 }, unique_effect_text: 'Glows in combat', drop_chance_multiplier: 0.5 },
    { id: 3, rarity: 'epic', stat_bonuses: { strength: 10 }, unique_effect_text: 'Dawn Strike', drop_chance_multiplier: 0.1 },
  ],
};

describe('ArtifactEditor', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/artifacts/')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockArtifactDetail) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockArtifactList) });
    });
    (api.post as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 3, name: 'New Artifact' }) });
    (api.put as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 1, name: 'Blade of Dawn', updated_fields: ['name'] }) });
    (api.delete as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 1, deactivated: true }) });
  });

  it('renders title and list', async () => {
    render(<ArtifactEditor />);
    await waitFor(() => {
      expect(screen.getByText('Artifact Editor')).toBeDefined();
      expect(screen.getByText('Blade of Dawn')).toBeDefined();
      expect(screen.getByText('Shadow Core')).toBeDefined();
    });
  });

  it('shows column headers', async () => {
    render(<ArtifactEditor />);
    await waitFor(() => {
      expect(screen.getByText('Name')).toBeDefined();
      expect(screen.getByText('Source')).toBeDefined();
      expect(screen.getByText('Drop %')).toBeDefined();
      expect(screen.getByText('Tiers')).toBeDefined();
      expect(screen.getByText('Owners')).toBeDefined();
    });
  });

  it('displays drop chance as percentage', async () => {
    render(<ArtifactEditor />);
    await waitFor(() => {
      expect(screen.getByText('5.0%')).toBeDefined();
      expect(screen.getByText('10.0%')).toBeDefined();
    });
  });

  it('loads detail on row click', async () => {
    render(<ArtifactEditor />);
    await waitFor(() => expect(screen.getByText('Blade of Dawn')).toBeDefined());

    fireEvent.click(screen.getByText('Blade of Dawn'));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/admin/artifacts/1');
      expect(screen.getByText('Forged in the first dawn.')).toBeDefined();
    });
  });

  it('shows tiers in detail view', async () => {
    render(<ArtifactEditor />);
    await waitFor(() => expect(screen.getByText('Blade of Dawn')).toBeDefined());
    fireEvent.click(screen.getByText('Blade of Dawn'));

    await waitFor(() => {
      expect(screen.getByText('common')).toBeDefined();
      expect(screen.getByText('rare')).toBeDefined();
      expect(screen.getByText('epic')).toBeDefined();
      expect(screen.getByText('Glows in combat')).toBeDefined();
    });
  });

  it('enters edit mode', async () => {
    render(<ArtifactEditor />);
    await waitFor(() => expect(screen.getByText('Blade of Dawn')).toBeDefined());
    fireEvent.click(screen.getByText('Blade of Dawn'));

    await waitFor(() => expect(screen.getByText('Edit')).toBeDefined());
    fireEvent.click(screen.getByText('Edit'));

    await waitFor(() => {
      expect(screen.getByText('Editing: Blade of Dawn')).toBeDefined();
      expect(screen.getByText('Save')).toBeDefined();
      expect(screen.getByText('Cancel')).toBeDefined();
    });
  });

  it('opens create form', async () => {
    render(<ArtifactEditor />);
    await waitFor(() => expect(screen.getByText('+ New Artifact')).toBeDefined());

    fireEvent.click(screen.getByText('+ New Artifact'));

    await waitFor(() => {
      expect(screen.getByText('New Artifact')).toBeDefined();
      expect(screen.getByText('Create')).toBeDefined();
    });
  });

  it('creates artifact via API', async () => {
    render(<ArtifactEditor />);
    await waitFor(() => expect(screen.getByText('+ New Artifact')).toBeDefined());
    fireEvent.click(screen.getByText('+ New Artifact'));

    await waitFor(() => expect(screen.getByText('Create')).toBeDefined());

    // Fill name field using the first empty text input
    const allInputs = document.querySelectorAll<HTMLInputElement>('input[type="text"], input:not([type])');
    const nameInput = Array.from(allInputs).find(i => i.value === '' && i.type !== 'checkbox' && i.type !== 'number');
    fireEvent.change(nameInput!, { target: { value: 'Test Artifact' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/admin/artifacts', expect.objectContaining({ name: 'Test Artifact' }));
    });
  });

  it('filters by source type', async () => {
    render(<ArtifactEditor />);
    await waitFor(() => expect(screen.getByText('Blade of Dawn')).toBeDefined());

    const select = screen.getByDisplayValue('All Sources');
    fireEvent.change(select, { target: { value: 'chapter' } });

    await waitFor(() => {
      expect(screen.getByText('Shadow Core')).toBeDefined();
      expect(screen.queryByText('Blade of Dawn')).toBeNull();
    });
  });

  it('calls deactivate on delete', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ArtifactEditor />);
    await waitFor(() => expect(screen.getByText('Blade of Dawn')).toBeDefined());
    fireEvent.click(screen.getByText('Blade of Dawn'));

    await waitFor(() => expect(screen.getByText('Deactivate')).toBeDefined());
    fireEvent.click(screen.getByText('Deactivate'));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/admin/artifacts/1');
    });
  });

  it('shows loading state', () => {
    (api.get as any).mockReturnValue(new Promise(() => {}));
    render(<ArtifactEditor />);
    expect(screen.getByText('Loading artifacts...')).toBeDefined();
  });

  it('shows empty detail placeholder', async () => {
    render(<ArtifactEditor />);
    await waitFor(() => {
      expect(screen.getByText('Select an artifact or create a new one.')).toBeDefined();
    });
  });
});
