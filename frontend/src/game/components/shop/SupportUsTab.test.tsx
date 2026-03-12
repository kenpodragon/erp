import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  }
}));

import { api } from '../../../api';
import SupportUsTab from './SupportUsTab';
import DonationConfirmModal from './DonationConfirmModal';
import PatronStatus from './PatronStatus';
import DonorLeaderboard from './DonorLeaderboard';
import RecentDonorsBanner from './RecentDonorsBanner';

const mockStatusData = {
  cumulative_cents: 2500,
  cumulative_display: "$25.00",
  patron_tier: "silver",
  diamond_stars: 0,
  diamond_stars_display: 0,
  donor_visibility: false,
  donation_count: 3,
  next_tier: "Gold Patron",
  next_threshold_cents: 10000,
  remaining_cents: 7500,
  remaining_display: "$75.00",
};

const mockLeaderboard = [
  { rank: 1, player_alias: "TopDonor", patron_tier: "diamond", diamond_stars: 2 },
  { rank: 2, player_alias: "SecondPlace", patron_tier: "gold", diamond_stars: 0 },
];

const mockRecentDonors = [
  { player_alias: "RecentPlayer", created_at: new Date().toISOString() },
];

function mockApiSuccess() {
  (api.get as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url.includes('/status')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStatusData) });
    if (url.includes('/recent')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockRecentDonors) });
    if (url.includes('/leaderboard')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockLeaderboard) });
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

describe('SupportUsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders heartfelt message, tier buttons, and custom input', async () => {
    mockApiSuccess();
    await act(async () => { render(<SupportUsTab />); });

    await waitFor(() => {
      expect(screen.getByText('Support Elysium Rising')).toBeDefined();
    });

    // Check tier buttons exist
    expect(screen.getByText('$1')).toBeDefined();
    expect(screen.getByText('$5')).toBeDefined();
    expect(screen.getByText('$10')).toBeDefined();
    expect(screen.getByText('$25')).toBeDefined();
    expect(screen.getByText('$50')).toBeDefined();
    expect(screen.getByText('$100')).toBeDefined();

    // Check custom input
    expect(screen.getByPlaceholderText('0.00')).toBeDefined();

    // Check opt-in checkbox
    expect(screen.getByText('Show my name on the donor leaderboard')).toBeDefined();
  });

  it('validates custom amount below minimum', async () => {
    mockApiSuccess();
    await act(async () => { render(<SupportUsTab />); });

    await waitFor(() => {
      expect(screen.getByText('Support Elysium Rising')).toBeDefined();
    });

    const input = screen.getByPlaceholderText('0.00');
    await act(async () => { fireEvent.change(input, { target: { value: '0.50' } }); });

    expect(screen.getByText('Minimum donation is $1.00')).toBeDefined();
  });
});

describe('DonationConfirmModal', () => {
  it('shows correct amount and no-shard disclaimer', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<DonationConfirmModal amountCents={2500} onConfirm={onConfirm} onCancel={onCancel} />);

    expect(screen.getByText(/\$25\.00/)).toBeDefined();
    expect(screen.getByText(/No shards or in-game currency will be granted/i)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Confirm Donation' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined();
  });

  it('calls onConfirm when confirmed', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<DonationConfirmModal amountCents={1000} onConfirm={onConfirm} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Donation' }));
    expect(onConfirm).toHaveBeenCalled();
  });
});

describe('PatronStatus', () => {
  it('shows current tier and progress to next', () => {
    render(<PatronStatus status={mockStatusData} />);

    expect(screen.getByText('Your Patron Status')).toBeDefined();
    expect(screen.getByText(/Silver Patron/)).toBeDefined();
    expect(screen.getByText(/\$25\.00 cumulative/)).toBeDefined();
    expect(screen.getByText(/Gold Patron/)).toBeDefined();
    expect(screen.getByText(/\$75\.00 to go/)).toBeDefined();
    expect(screen.getByText(/3 donations/)).toBeDefined();
  });
});

describe('DonorLeaderboard', () => {
  it('renders ranked entries with tier badges', () => {
    render(<DonorLeaderboard entries={mockLeaderboard} />);

    expect(screen.getByText('Donor Hall of Honor')).toBeDefined();
    expect(screen.getByText('TopDonor')).toBeDefined();
    expect(screen.getByText('SecondPlace')).toBeDefined();
    expect(screen.getByText('#1')).toBeDefined();
    expect(screen.getByText('#2')).toBeDefined();
  });
});

describe('RecentDonorsBanner', () => {
  it('rotates donor entries', () => {
    render(<RecentDonorsBanner donors={mockRecentDonors} />);
    expect(screen.getByText(/RecentPlayer just supported Elysium Rising!/)).toBeDefined();
  });
});
