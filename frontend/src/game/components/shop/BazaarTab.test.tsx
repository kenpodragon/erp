import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../../api';
import BazaarTab from './BazaarTab';
import BrowseListings from './BrowseListings';
import ListingCard from './ListingCard';
import NPCVendor from './NPCVendor';
import TradeNotificationOverlay from './TradeNotificationOverlay';
import type { MarketplaceListing, TradeNotification } from './BazaarTab';

// Mock child components for BazaarTab isolation tests
vi.mock('./BrowseListings', () => ({
  default: () => <div data-testid="browse-listings">BrowseListings</div>,
}));
vi.mock('./MyListings', () => ({
  default: () => <div data-testid="my-listings">MyListings</div>,
}));
vi.mock('./NPCVendor', () => ({
  default: () => <div data-testid="npc-vendor">NPCVendor</div>,
}));
vi.mock('./TradeHistory', () => ({
  default: () => <div data-testid="trade-history">TradeHistory</div>,
}));
vi.mock('./TradeNotificationOverlay', () => ({
  default: ({ notifications, onDismiss }: any) => (
    <div data-testid="trade-notification-overlay">
      {notifications.map((n: any) => (
        <span key={n.id}>{n.item_name} — {n.type}</span>
      ))}
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  ),
}));
vi.mock('./ClaimModal', () => ({
  default: () => <div data-testid="claim-modal">ClaimModal</div>,
}));

const mockBalanceResponse = {
  shard_balance: 3500,
  pending_claim: null,
  inventory: [],
};

const mockNotifResponse = {
  notifications: [],
};

describe('BazaarTab', () => {
  const mockPlayerUpdate = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/api/marketplace/notifications') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockNotifResponse) });
      }
      if (url === '/api/marketplace/balance') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBalanceResponse) });
      }
      return Promise.resolve({ ok: false });
    });
  });

  it('renders BazaarTab with sub-tabs', async () => {
    render(<BazaarTab onPlayerUpdate={mockPlayerUpdate} />);
    await waitFor(() => {
      expect(screen.getByText('Browse')).toBeDefined();
      expect(screen.getByText('My Listings')).toBeDefined();
      expect(screen.getByText('NPC Vendor')).toBeDefined();
      expect(screen.getByText('Trade History')).toBeDefined();
    });
  });

  it('defaults to Browse Listings sub-tab', async () => {
    render(<BazaarTab onPlayerUpdate={mockPlayerUpdate} />);
    await waitFor(() => {
      expect(screen.getByTestId('browse-listings')).toBeDefined();
    });
    const browseBtn = screen.getByText('Browse');
    expect(browseBtn.className).toContain('active');
  });

  it('switches between sub-tabs', async () => {
    render(<BazaarTab onPlayerUpdate={mockPlayerUpdate} />);
    await waitFor(() => expect(screen.getByText('Browse')).toBeDefined());

    // Switch to My Listings
    fireEvent.click(screen.getByText('My Listings'));
    await waitFor(() => {
      expect(screen.getByTestId('my-listings')).toBeDefined();
    });
    expect(screen.getByText('My Listings').className).toContain('active');

    // Switch to NPC Vendor
    fireEvent.click(screen.getByText('NPC Vendor'));
    await waitFor(() => {
      expect(screen.getByTestId('npc-vendor')).toBeDefined();
    });

    // Switch to Trade History
    fireEvent.click(screen.getByText('Trade History'));
    await waitFor(() => {
      expect(screen.getByTestId('trade-history')).toBeDefined();
    });
  });
});

// Unmock child components for direct rendering tests
describe('BrowseListings — filter bar', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  it('renders filter bar with Type, Rarity, Sort dropdowns', async () => {
    const { default: ActualBrowse } = await vi.importActual('./BrowseListings') as any;

    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ listings: [], total_pages: 1 }),
    });

    render(<ActualBrowse shardBalance={1000} onBalanceChange={vi.fn()} />);

    await waitFor(() => {
      // Type dropdown
      expect(screen.getByDisplayValue('All Types')).toBeDefined();
      // Rarity dropdown
      expect(screen.getByDisplayValue('All Rarities')).toBeDefined();
      // Sort dropdown
      expect(screen.getByDisplayValue('Recently Listed')).toBeDefined();
    });
  });

  it('renders search input', async () => {
    const { default: ActualBrowse } = await vi.importActual('./BrowseListings') as any;

    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ listings: [], total_pages: 1 }),
    });

    render(<ActualBrowse shardBalance={1000} onBalanceChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search items...')).toBeDefined();
    });
  });

  it('renders pagination when listings are present', async () => {
    const { default: ActualBrowse } = await vi.importActual('./BrowseListings') as any;

    const mockListings: MarketplaceListing[] = [
      {
        id: 1, seller_id: 2, seller_alias: 'Seller1', item_type: 'artifact',
        item_name: 'Void Shard', item_rarity: 'rare', item_stats: { strength: 5 },
        gear_slot: null, price_shards: 500, comparable_min: 400, comparable_max: 600,
        listed_at: new Date().toISOString(), is_own: false,
      },
    ];

    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ listings: mockListings, total_pages: 3 }),
    });

    render(<ActualBrowse shardBalance={1000} onBalanceChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 3/)).toBeDefined();
    });
  });
});

describe('ListingCard', () => {
  const baseListing: MarketplaceListing = {
    id: 10,
    seller_id: 5,
    seller_alias: 'TestSeller',
    item_type: 'artifact',
    item_name: 'Luminous Prism of the Void',
    item_rarity: 'epic',
    item_stats: { strength: 10, agility: 5 },
    gear_slot: null,
    price_shards: 800,
    comparable_min: 700,
    comparable_max: 900,
    listed_at: new Date().toISOString(),
    is_own: false,
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  it('shows price and rarity', async () => {
    const { default: ActualListingCard } = await vi.importActual('./ListingCard') as any;

    render(
      <ActualListingCard listing={baseListing} shardBalance={1000} isOwn={false} onBuy={vi.fn()} />
    );

    expect(screen.getByText('800')).toBeDefined();
    expect(screen.getByText('epic')).toBeDefined();
  });

  it('shows "Your Listing" for own items', async () => {
    const { default: ActualListingCard } = await vi.importActual('./ListingCard') as any;

    render(
      <ActualListingCard listing={baseListing} shardBalance={1000} isOwn={true} onBuy={vi.fn()} />
    );

    expect(screen.getByText('Your Listing')).toBeDefined();
    // Buy button should not be present for own listings
    expect(screen.queryByText('Buy Now')).toBeNull();
  });

  it('disables Buy when insufficient balance', async () => {
    const { default: ActualListingCard } = await vi.importActual('./ListingCard') as any;

    render(
      <ActualListingCard listing={baseListing} shardBalance={100} isOwn={false} onBuy={vi.fn()} />
    );

    const buyBtn = screen.getByText('Insufficient Shards');
    expect(buyBtn).toBeDefined();
    expect((buyBtn as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('NPCVendor — mode toggle and quick-select', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  it('renders mode toggle (Single / Bulk)', async () => {
    const { default: ActualNPCVendor } = await vi.importActual('./NPCVendor') as any;

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/api/game/artifacts') return Promise.resolve({ ok: true, json: () => Promise.resolve({ artifacts: [] }) });
      if (url === '/api/game/inventory') return Promise.resolve({ ok: true, json: () => Promise.resolve({ equipment: [] }) });
      if (url === '/api/marketplace/essence-balance') return Promise.resolve({ ok: true, json: () => Promise.resolve({ essence_balance: 100 }) });
      return Promise.resolve({ ok: false });
    });

    render(<ActualNPCVendor shardBalance={500} onBalanceChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Single')).toBeDefined();
      expect(screen.getByText('Bulk Salvage')).toBeDefined();
    });
  });

  it('renders quick-select buttons in bulk mode', async () => {
    const { default: ActualNPCVendor } = await vi.importActual('./NPCVendor') as any;

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/api/game/artifacts') return Promise.resolve({ ok: true, json: () => Promise.resolve({ artifacts: [] }) });
      if (url === '/api/game/inventory') return Promise.resolve({ ok: true, json: () => Promise.resolve({ equipment: [] }) });
      if (url === '/api/marketplace/essence-balance') return Promise.resolve({ ok: true, json: () => Promise.resolve({ essence_balance: 100 }) });
      return Promise.resolve({ ok: false });
    });

    render(<ActualNPCVendor shardBalance={500} onBalanceChange={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Single')).toBeDefined());

    // Switch to Bulk mode
    fireEvent.click(screen.getByText('Bulk Salvage'));

    await waitFor(() => {
      expect(screen.getByText('All Common')).toBeDefined();
      expect(screen.getByText('All Uncommon')).toBeDefined();
      expect(screen.getByText('All Rare')).toBeDefined();
      expect(screen.getByText('All Equipment')).toBeDefined();
      expect(screen.getByText('All Artifacts')).toBeDefined();
      expect(screen.getByText('None')).toBeDefined();
    });
  });
});

describe('TradeNotificationOverlay', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  it('renders notifications with dismiss button', async () => {
    const { default: ActualOverlay } = await vi.importActual('./TradeNotificationOverlay') as any;

    const notifications: TradeNotification[] = [
      {
        id: 1, type: 'sold', item_name: 'Void Shard', item_rarity: 'rare',
        price_shards: 500, buyer_alias: 'Buyer1', created_at: new Date().toISOString(),
      },
      {
        id: 2, type: 'expired', item_name: 'Iron Blade', item_rarity: 'common',
        price_shards: null, buyer_alias: null, created_at: new Date().toISOString(),
      },
    ];

    const onDismiss = vi.fn();
    render(<ActualOverlay notifications={notifications} onDismiss={onDismiss} />);

    expect(screen.getByText('Marketplace Notifications')).toBeDefined();
    expect(screen.getByText('Void Shard')).toBeDefined();
    expect(screen.getByText('Iron Blade')).toBeDefined();
    expect(screen.getByText('Dismiss')).toBeDefined();

    fireEvent.click(screen.getByText('Dismiss'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
