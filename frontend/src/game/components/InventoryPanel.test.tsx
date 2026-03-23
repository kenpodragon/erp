/**
 * InventoryPanel — Smoke tests.
 * Verifies basic rendering: loading state, empty state, equipped slots grid,
 * bag grid, and paper doll canvas presence.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// Mock @pixi/react and pixi.js to avoid WebGL in tests
vi.mock('@pixi/react', () => ({
  Application: ({ children }: any) => <div data-testid="pixi-app">{children}</div>,
  extend: vi.fn(),
  useTick: vi.fn(),
}));

vi.mock('pixi.js', () => ({
  Container: class {},
  Graphics: class {},
  Text: class {},
  TextStyle: class {
    constructor() { return {}; }
  },
}));

// Mock PaperDollRenderer
vi.mock('./shared/PaperDollRenderer', () => ({
  default: ({ character }: any) => <div data-testid="paper-doll">PaperDoll</div>,
}));

// Mock ItemCard
vi.mock('./story/ItemCard', () => ({
  default: ({ item, compact, selected, onClick }: any) => (
    <div data-testid={`item-card-${item.inventory_id}`} onClick={onClick}>
      {item.name || 'Item'}
    </div>
  ),
}));

// Mock api
const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
};
vi.mock('../../api', () => ({
  api: {
    get: (...args: any[]) => mockApi.get(...args),
    post: (...args: any[]) => mockApi.post(...args),
    delete: (...args: any[]) => mockApi.delete(...args),
  },
}));

import InventoryPanel from './InventoryPanel';

const makeGearSlot = (id: number, name: string, display: string, order: number) => ({
  id, name, display_name: display, sort_order: order,
});

const MOCK_GEAR_SLOTS = [
  makeGearSlot(1, 'head', 'Head', 1),
  makeGearSlot(2, 'chest', 'Chest', 2),
  makeGearSlot(3, 'legs', 'Legs', 3),
  makeGearSlot(4, 'feet', 'Feet', 4),
  makeGearSlot(5, 'hands', 'Hands', 5),
  makeGearSlot(6, 'shoulders', 'Shoulders', 6),
  makeGearSlot(7, 'back', 'Back', 7),
  makeGearSlot(8, 'waist', 'Waist', 8),
  makeGearSlot(9, 'main_hand', 'Main Hand', 9),
  makeGearSlot(10, 'off_hand', 'Off Hand', 10),
  makeGearSlot(11, 'ring_1', 'Ring 1', 11),
  makeGearSlot(12, 'ring_2', 'Ring 2', 12),
  makeGearSlot(13, 'neck', 'Neck', 13),
  makeGearSlot(14, 'trinket_1', 'Trinket 1', 14),
  makeGearSlot(15, 'trinket_2', 'Trinket 2', 15),
  makeGearSlot(16, 'earring', 'Earring', 16),
];

const MOCK_INVENTORY = {
  equipped: [
    { inventory_id: 100, name: 'Iron Helm', equipped_slot: 'head', gear_slot_id: 1, is_equipped: true },
  ],
  stored: [
    { inventory_id: 200, name: 'Bronze Shield', equipped_slot: null, gear_slot_id: 10, is_equipped: false },
  ],
  gear_slots: MOCK_GEAR_SLOTS,
  bag_capacity: 10,
  bag_used: 1,
};

const MOCK_CHARACTER_VISUAL = {
  character_id: 1,
  level: 5,
  aura_tier: null,
  equipped_layers: [],
  unequipped_layers: [],
};

describe('InventoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    // Never resolve the API call
    mockApi.get.mockReturnValue(new Promise(() => {}));
    render(<InventoryPanel />);
    expect(screen.getByText('Loading inventory...')).toBeTruthy();
  });

  it('renders all 16 gear slots after loading', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url.includes('inventory')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_INVENTORY) });
      }
      if (url.includes('visuals')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_CHARACTER_VISUAL) });
      }
      return Promise.resolve({ ok: false });
    });

    render(<InventoryPanel />);

    await waitFor(() => {
      expect(screen.getByText('EQUIPPED (16 SLOTS)')).toBeTruthy();
    });

    // All 16 slot labels should be present
    for (const slot of MOCK_GEAR_SLOTS) {
      expect(screen.getByText(slot.display_name)).toBeTruthy();
    }
  });

  it('renders paper doll preview', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url.includes('inventory')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_INVENTORY) });
      }
      if (url.includes('visuals')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_CHARACTER_VISUAL) });
      }
      return Promise.resolve({ ok: false });
    });

    render(<InventoryPanel />);

    await waitFor(() => {
      expect(screen.getByText('CHARACTER PREVIEW')).toBeTruthy();
    });

    expect(screen.getByTestId('paper-doll')).toBeTruthy();
  });

  it('renders equipped item in correct slot', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url.includes('inventory')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_INVENTORY) });
      }
      if (url.includes('visuals')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_CHARACTER_VISUAL) });
      }
      return Promise.resolve({ ok: false });
    });

    render(<InventoryPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('item-card-100')).toBeTruthy();
    });
  });

  it('renders bag items', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url.includes('inventory')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_INVENTORY) });
      }
      if (url.includes('visuals')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_CHARACTER_VISUAL) });
      }
      return Promise.resolve({ ok: false });
    });

    render(<InventoryPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('item-card-200')).toBeTruthy();
    });
  });

  it('shows empty state when API fails', async () => {
    mockApi.get.mockResolvedValue({ ok: false });
    render(<InventoryPanel />);

    await waitFor(() => {
      expect(screen.getByText('No inventory data.')).toBeTruthy();
    });
  });
});
