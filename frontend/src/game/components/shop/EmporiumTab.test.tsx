import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EmporiumTab from './EmporiumTab';
import { api } from '../../../api';

// Mock GameContext
vi.mock('../../GameContext', () => ({
  useGame: () => ({
    state: {
      activeBoosters: [],
      essence: 1000,
      gold: 0,
      activeTrainingId: null,
      activeSceneId: null,
      activeVisualChapterId: 1,
      storySession: null,
      activeBuffs: [],
      isOffline: false,
      audioSettings: { masterVolume: 1, musicVolume: 0.5, sfxVolume: 0.5, masterMuted: false },
      reduceMotion: false,
    },
    refreshBoosters: vi.fn(),
  }),
}));

const mockCatalog = {
  balance: 5000,
  items: [
    {
      id: 1, item_key: 'skin_void', name: 'Void Walker', description: 'A dark skin.',
      category: 'skin', price_shards: 250, icon_asset_key: null, class_restriction: null,
      class_restriction_name: null, is_featured: false, is_limited_time: false,
      available_until: null, owned: false, equipped: false, item_metadata: null,
    },
    {
      id: 2, item_key: 'flair_glow', name: 'Celestial Glow', description: 'Glowing flair.',
      category: 'flair', price_shards: 100, icon_asset_key: null, class_restriction: null,
      class_restriction_name: null, is_featured: true, is_limited_time: false,
      available_until: null, owned: true, equipped: false, item_metadata: null,
    },
    {
      id: 3, item_key: 'booster_xp_1hr', name: 'XP Boost (1hr)', description: 'Boosts XP.',
      category: 'booster', price_shards: 75, icon_asset_key: null, class_restriction: null,
      class_restriction_name: null, is_featured: false, is_limited_time: false,
      available_until: null, owned: false, equipped: false,
      item_metadata: { boost_type: 'xp', magnitude: 1.25, duration_seconds: 3600 },
    },
    {
      id: 4, item_key: 'badge_limited', name: 'Limited Badge', description: 'Time-limited!',
      category: 'badge', price_shards: 200, icon_asset_key: null, class_restriction: null,
      class_restriction_name: null, is_featured: false, is_limited_time: true,
      available_until: new Date(Date.now() + 86400000).toISOString(), owned: false,
      equipped: false, item_metadata: null,
    },
  ],
  bundles: [
    {
      id: 1, bundle_key: 'bundle_starter', name: 'Starter Bundle',
      description: 'Great value!', price_shards: 300, original_price_shards: 400,
      discount_pct: 25, icon_asset_key: null, is_featured: false, is_limited_time: false,
      available_until: null, owned: false, all_items_owned: false,
      items: [
        { id: 1, name: 'Void Walker', category: 'skin', owned: false },
        { id: 2, name: 'Celestial Glow', category: 'flair', owned: true },
      ],
    },
  ],
  active_boosters: [],
};

describe('EmporiumTab', () => {
  const mockPlayerUpdate = vi.fn();
  const mockSwitchToBuy = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/api/shop/catalog') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCatalog) });
      }
      if (url === '/api/shop/collection') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [], equipped: { skin: null, flair: null, badge: null, avatar: null } }),
        });
      }
      return Promise.resolve({ ok: false });
    });
    (api.post as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) });
  });

  it('renders catalog with category filters', async () => {
    render(<EmporiumTab onPlayerUpdate={mockPlayerUpdate} onSwitchToBuy={mockSwitchToBuy} />);
    await waitFor(() => {
      expect(screen.getByText('5,000')).toBeDefined();
      expect(screen.getByText('All')).toBeDefined();
      expect(screen.getByText('Skins')).toBeDefined();
      expect(screen.getByText('Boosters')).toBeDefined();
      expect(screen.getByText('Bundles')).toBeDefined();
    });
  });

  it('displays item cards with correct status', async () => {
    render(<EmporiumTab onPlayerUpdate={mockPlayerUpdate} onSwitchToBuy={mockSwitchToBuy} />);
    await waitFor(() => {
      // "Void Walker" appears in both item grid and bundle contents tag
      expect(screen.getAllByText('Void Walker').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Celestial Glow').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows purchase confirmation modal on item click', async () => {
    render(<EmporiumTab onPlayerUpdate={mockPlayerUpdate} onSwitchToBuy={mockSwitchToBuy} />);
    await waitFor(() => expect(screen.getAllByText('Void Walker').length).toBeGreaterThanOrEqual(1));
    // Click the item card (has class sic-name), not the bundle tag
    const voidItems = screen.getAllByText('Void Walker');
    const itemCard = voidItems.find(el => el.classList.contains('sic-name')) || voidItems[0];
    fireEvent.click(itemCard.closest('[role="button"]') || itemCard);
    await waitFor(() => {
      expect(screen.getByText('Confirm Purchase')).toBeDefined();
      expect(screen.getByText('Purchase')).toBeDefined();
    });
  });

  it('shows booster activation warning in modal', async () => {
    render(<EmporiumTab onPlayerUpdate={mockPlayerUpdate} onSwitchToBuy={mockSwitchToBuy} />);
    // BoosterPanel renders boost_type labels (e.g. "XP Boost"), not item names
    await waitFor(() => expect(screen.getByText('XP Boost')).toBeDefined());
    // Click the booster option button in BoosterPanel
    const boosterBtns = screen.getAllByText(/1\.25x/);
    fireEvent.click(boosterBtns[0]);
    await waitFor(() => {
      expect(screen.getByText(/activates immediately/)).toBeDefined();
    });
  });

  it('disables purchase button when insufficient balance', async () => {
    const lowBalanceCatalog = { ...mockCatalog, balance: 10 };
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/api/shop/catalog')
        return Promise.resolve({ ok: true, json: () => Promise.resolve(lowBalanceCatalog) });
      return Promise.resolve({ ok: false });
    });
    render(<EmporiumTab onPlayerUpdate={mockPlayerUpdate} onSwitchToBuy={mockSwitchToBuy} />);
    await waitFor(() => expect(screen.getAllByText('Void Walker').length).toBeGreaterThanOrEqual(1));
    const voidItems = screen.getAllByText('Void Walker');
    const itemCard = voidItems.find(el => el.classList.contains('sic-name')) || voidItems[0];
    fireEvent.click(itemCard.closest('[role="button"]') || itemCard);
    await waitFor(() => {
      const btn = screen.getByText('Insufficient Shards');
      expect(btn).toBeDefined();
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it('renders limited-time countdown timer', async () => {
    render(<EmporiumTab onPlayerUpdate={mockPlayerUpdate} onSwitchToBuy={mockSwitchToBuy} />);
    await waitFor(() => {
      // Limited Badge appears in both featured section and item grid
      expect(screen.getAllByText('Limited Badge').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/left/)).toBeDefined();
    });
  });

  it('renders bundle card with discount badge and contents', async () => {
    render(<EmporiumTab onPlayerUpdate={mockPlayerUpdate} onSwitchToBuy={mockSwitchToBuy} />);
    await waitFor(() => {
      expect(screen.getByText('Starter Bundle')).toBeDefined();
      expect(screen.getByText('-25%')).toBeDefined();
    });
  });

  it('shows bundle partial ownership in modal', async () => {
    render(<EmporiumTab onPlayerUpdate={mockPlayerUpdate} onSwitchToBuy={mockSwitchToBuy} />);
    await waitFor(() => expect(screen.getByText('Starter Bundle')).toBeDefined());
    fireEvent.click(screen.getByText('Starter Bundle'));
    await waitFor(() => {
      expect(screen.getByText(/already own some items/)).toBeDefined();
    });
  });

  it('switches to My Collection view', async () => {
    render(<EmporiumTab onPlayerUpdate={mockPlayerUpdate} onSwitchToBuy={mockSwitchToBuy} />);
    await waitFor(() => expect(screen.getByText('My Collection')).toBeDefined());
    fireEvent.click(screen.getByText('My Collection'));
    await waitFor(() => {
      expect(screen.getByText("You don't own any cosmetics yet.")).toBeDefined();
    });
  });

  it('calls onSwitchToBuy when Buy More Shards clicked', async () => {
    render(<EmporiumTab onPlayerUpdate={mockPlayerUpdate} onSwitchToBuy={mockSwitchToBuy} />);
    await waitFor(() => expect(screen.getByText('Buy More Shards')).toBeDefined());
    fireEvent.click(screen.getByText('Buy More Shards'));
    expect(mockSwitchToBuy).toHaveBeenCalledOnce();
  });
});
