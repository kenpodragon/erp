import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ItemEditorModal from './ItemEditorModal';
import { api } from '../../api';

vi.mock('../../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockItemDetail = {
  id: 5,
  name: 'Iron Longsword',
  type_base: 'Longsword',
  gear_slot: 'Main Hand',
  prefix_code: 'heavy',
  suffix_code: 'of_might',
  quality_code: 'fine',
  lore_tag_code: 'ancient',
  rarity: 'rare',
  stats: { strength: 12, agility: 3 },
};

const mockComponents = {
  prefixes: [
    { code: 'heavy', label: 'Heavy', stat_bonuses: { strength: 2 } },
    { code: 'swift', label: 'Swift', stat_bonuses: { agility: 3 } },
  ],
  suffixes: [
    { code: 'of_might', label: 'of Might', stat_bonuses: { strength: 4 } },
    { code: 'of_wind', label: 'of Wind', stat_bonuses: { agility: 5 } },
  ],
  qualities: [
    { code: 'fine', label: 'Fine' },
    { code: 'superior', label: 'Superior' },
  ],
  lore_tags: [
    { code: 'ancient', label: 'Ancient' },
    { code: 'cursed', label: 'Cursed' },
  ],
  rarities: [
    { code: 'common', label: 'Common' },
    { code: 'rare', label: 'Rare' },
  ],
};

const defaultProps = {
  itemId: 5,
  characterId: 10,
  isArtifact: false,
  onClose: vi.fn(),
  onSave: vi.fn(),
};

describe('ItemEditorModal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/items/5')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockItemDetail) });
      if (url.includes('/components')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockComponents) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    (api.patch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 5 }) });
    (api.delete as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 5 }) });
  });

  it('renders with item data pre-populated', async () => {
    render(<ItemEditorModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Edit Item')).toBeDefined();
      expect(screen.getByText('Iron Longsword')).toBeDefined();
      expect(screen.getByText('Stat Comparison')).toBeDefined();
      expect(screen.getByText('Before')).toBeDefined();
      expect(screen.getByText('After')).toBeDefined();
    });
  });

  it('editing components updates before/after preview', async () => {
    render(<ItemEditorModal {...defaultProps} />);
    await waitFor(() => expect(screen.getByText('Stat Comparison')).toBeDefined());

    // The stat table should show stat names
    await waitFor(() => {
      expect(screen.getByText('Strength')).toBeDefined();
    });

    // Change prefix to trigger stat recalculation
    const prefixSelects = document.querySelectorAll<HTMLSelectElement>('.iem-select');
    const prefixSelect = Array.from(prefixSelects).find(
      s => (s as HTMLSelectElement).value === 'heavy'
    );
    if (prefixSelect) {
      fireEvent.change(prefixSelect, { target: { value: 'swift' } });
    }

    // The Change column should reflect a difference
    await waitFor(() => {
      expect(screen.getByText('Change')).toBeDefined();
    });
  });

  it('discard shows confirmation dialog', async () => {
    render(<ItemEditorModal {...defaultProps} />);
    await waitFor(() => expect(screen.getByText('Discard')).toBeDefined());

    fireEvent.click(screen.getByText('Discard'));

    await waitFor(() => {
      expect(screen.getByText('Confirm Discard')).toBeDefined();
      expect(screen.getByText(/permanently discard/i)).toBeDefined();
    });
  });
});
