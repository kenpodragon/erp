import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../../api';
import ShopTab from './ShopTab';

// Mock child components to isolate ShopTab logic
vi.mock('./BuyShards', () => ({
  default: () => <div data-testid="buy-shards">BuyShards</div>,
}));
vi.mock('./TransactionHistory', () => ({
  default: () => <div data-testid="transaction-history">TransactionHistory</div>,
}));
vi.mock('./PaymentStatus', () => ({
  default: () => <div data-testid="payment-status">PaymentStatus</div>,
}));

const mockPlayer = { id: 1, alias: 'TestHero', google_display_name: 'Test User' };

const mockPackagesResponse = {
  packages: [
    {
      id: 1,
      tier_key: 'starter',
      name: 'Starter Pack',
      price_cents: 499,
      price_display: '$4.99',
      base_shards: 500,
      bonus_pct: 0,
      total_shards: 500,
      is_best_value: false,
      max_purchases: null,
      purchases_remaining: null,
    },
  ],
  current_balance: 1250,
  first_purchase_available: false,
  has_active_dispute: false,
};

describe('ShopTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders shop header with balance after loading', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPackagesResponse),
    } as Response);

    render(<ShopTab player={mockPlayer} onPlayerUpdate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Elysium Shop')).toBeTruthy();
    });

    expect(screen.getByText('1,250')).toBeTruthy();
    const balanceDiv = screen.getByText(/Current Balance/);
    expect(balanceDiv.textContent).toContain('Shards');
  });

  it('shows "Buy Shards" tab active by default', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPackagesResponse),
    } as Response);

    render(<ShopTab player={mockPlayer} onPlayerUpdate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Buy Shards')).toBeTruthy();
    });

    const buyBtn = screen.getByText('Buy Shards');
    expect(buyBtn.className).toContain('active');
  });

  it('shows "Elysium Emporium" tab after loading', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPackagesResponse),
    } as Response);

    render(<ShopTab player={mockPlayer} onPlayerUpdate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Elysium Emporium/)).toBeTruthy();
    });

    const emporiumBtn = screen.getByText(/Elysium Emporium/);
    expect(emporiumBtn.className).toContain('shop-tab-btn');
  });

  it('handles loading state', () => {
    vi.mocked(api.get).mockReturnValueOnce(new Promise(() => {})); // never resolves

    render(<ShopTab player={mockPlayer} onPlayerUpdate={vi.fn()} />);

    expect(screen.getByText('Loading shop...')).toBeTruthy();
  });

  it('handles error state', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

    render(<ShopTab player={mockPlayer} onPlayerUpdate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load the shop. Please try again.')).toBeTruthy();
    });

    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('does not fetch packages when player is null', () => {
    render(<ShopTab player={null} onPlayerUpdate={vi.fn()} />);

    expect(api.get).not.toHaveBeenCalled();
  });
});
