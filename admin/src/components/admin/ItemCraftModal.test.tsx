import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ItemCraftModal from './ItemCraftModal';
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

vi.mock('./ItemComponentPicker', () => ({
  default: ({ onGearSlotChange, onTypeBaseChange, onPrefixChange, onQualityChange, onLoreTagChange, onSuffixChange }: any) => (
    <div data-testid="item-component-picker">
      <button onClick={() => { onGearSlotChange(1); onTypeBaseChange(1); onPrefixChange(1); onQualityChange(1); onLoreTagChange(1); onSuffixChange(1); }}>
        Select All Components
      </button>
    </div>
  ),
}));

const mockComponents = {
  gear_slots: [
    { id: 1, display_name: 'Head' },
    { id: 2, display_name: 'Chest' },
  ],
  type_bases: [
    { id: 1, display_name: 'Helm', gear_slot_id: 1, base_stat_range: { strength: [5, 10] } },
  ],
  prefixes: [{ id: 1, display_name: 'Mighty', stat_bonuses: { strength: 3 } }],
  qualities: [{ id: 1, display_name: 'Superior' }],
  lore_tags: [{ id: 1, display_name: 'Ancient' }],
  suffixes: [{ id: 1, display_name: 'of Power', stat_bonuses: { strength: 2 } }],
  rarities: ['common', 'uncommon', 'rare', 'epic', 'cosmic'],
};

const defaultProps = {
  characterId: 10,
  characterLevel: 25,
  onClose: vi.fn(),
  onSave: vi.fn(),
};

describe('ItemCraftModal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/components')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockComponents) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    (api.post as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        item: { id: 99, name: 'Mighty Helm of Power', rarity: 'rare', base_stats: { strength: 15 }, item_level: 25, min_char_level: 23, stat_requirements: {} },
        inventory_id: 100,
        bag_warning: false,
      }),
    });
  });

  it('renders with manual and random tabs', async () => {
    render(<ItemCraftModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Craft Item')).toBeDefined();
      expect(screen.getByText('Manual')).toBeDefined();
      expect(screen.getByText('Random')).toBeDefined();
    });
  });

  it('manual mode shows component picker', async () => {
    render(<ItemCraftModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByTestId('item-component-picker')).toBeDefined();
      expect(screen.getByText('Live Preview')).toBeDefined();
    });
  });

  it('random mode shows optional constraint dropdowns', async () => {
    render(<ItemCraftModal {...defaultProps} />);
    await waitFor(() => expect(screen.getByText('Random')).toBeDefined());

    fireEvent.click(screen.getByText('Random'));

    await waitFor(() => {
      expect(screen.getByText('Gear Slot (optional)')).toBeDefined();
      expect(screen.getByText('Rarity (optional)')).toBeDefined();
      expect(screen.getByText('Generate')).toBeDefined();
    });
  });

  it('random generate calls POST endpoint', async () => {
    render(<ItemCraftModal {...defaultProps} />);
    await waitFor(() => expect(screen.getByText('Random')).toBeDefined());

    fireEvent.click(screen.getByText('Random'));
    await waitFor(() => expect(screen.getByText('Generate')).toBeDefined());

    fireEvent.click(screen.getByText('Generate'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/admin/characters/10/items/craft',
        expect.objectContaining({ mode: 'random' }),
      );
    });
  });
});
