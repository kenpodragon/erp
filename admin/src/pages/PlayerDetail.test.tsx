import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PlayerDetail from './PlayerDetail';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../components/admin/CharacterEditorModal', () => ({
  default: () => <div data-testid="char-editor-modal">CharacterEditorModal</div>,
}));
vi.mock('../components/admin/ItemCraftModal', () => ({
  default: () => <div data-testid="item-craft-modal">ItemCraftModal</div>,
}));
vi.mock('../components/admin/ItemEditorModal', () => ({
  default: () => <div data-testid="item-editor-modal">ItemEditorModal</div>,
}));
vi.mock('../components/admin/EssenceAdjustModal', () => ({
  default: () => <div data-testid="essence-modal">EssenceAdjustModal</div>,
}));
vi.mock('../components/admin/ProgressionEditorModal', () => ({
  default: () => <div data-testid="progression-modal">ProgressionEditorModal</div>,
}));
vi.mock('../components/admin/SkillEditorModal', () => ({
  default: () => <div data-testid="skill-modal">SkillEditorModal</div>,
}));
vi.mock('../components/admin/ActivityTimelineModal', () => ({
  default: () => <div data-testid="timeline-modal">ActivityTimelineModal</div>,
}));
vi.mock('./finance/PlayerFinanceWidget', () => ({
  default: () => <div data-testid="finance-widget">PlayerFinanceWidget</div>,
}));

const mockPlayerDetail = {
  player: {
    id: 10,
    firebase_uid: 'abc123',
    email: 'player@test.com',
    alias: 'TestPlayer',
    google_display_name: 'Test Player',
    google_avatar_url: null,
    custom_avatar_url: null,
    avatar_preset_key: null,
    is_banned: false,
    banned_at: null,
    banned_by: null,
    ban_reason: null,
    sessions_invalid_before: null,
    created_at: '2026-01-01T00:00:00Z',
    last_login_at: '2026-03-14T12:00:00Z',
    terms_accepted_at: '2026-01-02T00:00:00Z',
    is_owner: false,
    is_system_admin: false,
    is_game_admin: false,
  },
  characters: [
    {
      id: 20,
      character_name: 'Arion',
      level: 25,
      character_xp: 48000,
      class_id: 1,
      class: { name: 'Warrior', sprite_key: 'warrior_m' },
      strength: 50,
      agility: 30,
      intelligence: 20,
      created_at: '2026-01-05T00:00:00Z',
      last_played_at: '2026-03-14T10:00:00Z',
    },
  ],
  recent_tickets: [],
};

const mockMeResponse = {
  email: 'admin@test.com',
  is_owner: true,
};

const mockEssenceResponse = {
  current_balance: 5000,
  adjustments: [],
};

const mockInventoryResponse = {
  equipped: [
    {
      inventory_id: 1,
      item_id: 100,
      name: 'Iron Sword',
      item_type: 'weapon',
      rarity: 'common',
      base_stats: { strength: 5 },
      item_level: 10,
      item_code: 'iron_sword',
      gear_slot_id: 1,
      is_equipped: true,
      equipped_slot: 'Main Hand',
    },
  ],
  bag: [
    {
      inventory_id: 2,
      item_id: 101,
      name: 'Healing Potion',
      item_type: 'consumable',
      rarity: 'uncommon',
      base_stats: {},
      item_level: 1,
      item_code: 'healing_pot',
      gear_slot_id: 0,
      is_equipped: false,
      equipped_slot: null,
    },
  ],
  bag_count: 1,
  bag_capacity: 20,
  artifacts: [],
};

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/players/10']}>
      <Routes>
        <Route path="/players/:id" element={<PlayerDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PlayerDetail', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/admin/me')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMeResponse) });
      if (url.includes('/players/10') && !url.includes('/timeline')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPlayerDetail) });
      if (url.includes('/essence/history')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockEssenceResponse) });
      if (url.includes('/inventory')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockInventoryResponse) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('renders character action buttons', async () => {
    renderWithRouter();
    await waitFor(() => expect(screen.getByText('Arion')).toBeDefined());

    expect(screen.getByText('Edit Character')).toBeDefined();
    expect(screen.getByText('Craft Item')).toBeDefined();
    expect(screen.getByText('Adjust Essence')).toBeDefined();
    expect(screen.getByText('Edit Progression')).toBeDefined();
    expect(screen.getByText('Edit Skills')).toBeDefined();
    expect(screen.getByText('Activity Timeline')).toBeDefined();
  });

  it('inventory section expands on click', async () => {
    renderWithRouter();
    await waitFor(() => expect(screen.getByText('Arion')).toBeDefined());

    // Find inventory toggle and click it
    const toggles = document.querySelectorAll('.char-inventory-toggle');
    expect(toggles.length).toBe(1);

    fireEvent.click(toggles[0]);

    await waitFor(() => {
      expect(screen.getByText('Equipped')).toBeDefined();
      expect(screen.getByText('Iron Sword')).toBeDefined();
      expect(screen.getByText('Healing Potion')).toBeDefined();
    });
  });
});
