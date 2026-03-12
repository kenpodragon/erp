import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FinanceDashboard from './FinanceDashboard'
import { api } from '../api'

/* ── Mock recharts (no canvas in jsdom) ── */
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}))

/* ── Mock api ── */
vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

/* ── Mock data ── */

function mockResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: () => Promise.resolve(data), statusText: ok ? 'OK' : 'Internal Server Error' }
}

const OVERVIEW_DATA = {
  revenue_today: 150000,
  revenue_this_week: 750000,
  revenue_this_month: 3000000,
  active_subscribers: 1200,
  shards_in_circulation: 5000000,
  marketplace_volume_7d: 250000,
}

const CHART_DATA = { data: [{ date: '2026-03-01', purchases: 5000, subscriptions: 3000, donations: 1000 }] }

const TRANSACTIONS_RESPONSE = {
  transactions: [
    {
      order_id: 101,
      player_id: 1,
      player_alias: 'TestPlayer',
      order_type: 'purchase',
      amount_cents: 9999,
      shards_amount: 1000,
      status: 'completed',
      stripe_charge_id: 'ch_abc123def456ghi789jkl',
      stripe_refund_id: null,
      package_key: 'starter_pack',
      created_at: '2026-03-10T10:00:00Z',
      updated_at: null,
    },
    {
      order_id: 102,
      player_id: 2,
      player_alias: 'Player2',
      order_type: 'subscription',
      amount_cents: 4999,
      shards_amount: 500,
      status: 'refunded',
      stripe_charge_id: 'ch_refunded123',
      stripe_refund_id: 're_xyz789',
      package_key: null,
      created_at: '2026-03-09T08:00:00Z',
      updated_at: '2026-03-09T09:00:00Z',
    },
  ],
  total: 2,
  page: 1,
  page_size: 25,
}

const SHARD_ECONOMY_DATA = {
  total_shards_in_circulation: 5000000,
  total_shards_granted: 8000000,
  total_shards_spent: 3000000,
  total_shards_purchased: 2000000,
  active_players_with_shards: 800,
  avg_shard_balance: 6250,
  median_shard_balance: 4000,
  top_holder_balance: 95000,
  top_holder_alias: 'WhalePlayer',
}

const SHARD_FLOW_DATA = { data: [] }

const SUBSCRIPTION_METRICS = {
  active_subscribers: 500,
  monthly_count: 350,
  annual_count: 150,
  past_due_count: 12,
  voluntary_churn_30d: 0.02,
  involuntary_churn_30d: 0.01,
  total_churn_30d: 0.03,
  conversion_rate: 0.15,
  mrr_cents: 450000,
}

const SUBSCRIBERS_RESPONSE = {
  items: [
    {
      id: 1,
      player_id: 10,
      player_name: 'SubPlayer',
      plan: 'monthly' as const,
      status: 'active',
      cancel_at_period_end: false,
      started_at: '2026-01-01T00:00:00Z',
      current_period_end: '2026-04-01T00:00:00Z',
      streak_months: 3,
      cumulative_months: 3,
      loyalty_tier: 'bronze',
    },
  ],
  total: 1,
  page: 1,
  page_size: 20,
}

const SHOP_ITEMS = [
  {
    id: 1,
    item_key: 'cool_skin',
    name: 'Cool Skin',
    description: 'A cool skin',
    category: 'skin',
    price_shards: 500,
    icon_path: '/icons/skin.png',
    class_restriction: null,
    is_active: true,
    is_featured: false,
    featured_from: null,
    featured_until: null,
    available_from: null,
    available_until: null,
    sort_order: 1,
    item_metadata: null,
  },
]

const SHOP_BUNDLES = [
  {
    id: 1,
    bundle_key: 'starter_bundle',
    name: 'Starter Bundle',
    description: 'Get started',
    price_shards: 800,
    original_price_shards: 1200,
    discount_pct: 33,
    icon_path: '/icons/bundle.png',
    is_active: true,
    sort_order: 1,
    item_ids: [1],
    items_count: 1,
  },
]

const SHOP_ANALYTICS = {
  total_items_sold: 5000,
  revenue_by_category: { skin: 250000 },
  top_selling_items: [{ name: 'Cool Skin', sold: 3000 }],
  active_boosters: 42,
}

const MARKETPLACE_ANALYTICS = {
  active_listings: 150,
  total_volume_all_time: 12000000,
  volume_7d: 350000,
  volume_30d: 1500000,
  average_sale_price: 2500,
  tax_burned: 150000,
  unique_traders_30d: 200,
  items_listed_30d: 450,
}

const MARKETPLACE_LISTINGS = {
  items: [
    {
      id: 1,
      seller_id: 10,
      seller_name: 'SellerGuy',
      item_name: 'Rare Sword',
      item_rarity: 'rare',
      price: 5000,
      status: 'active',
      listed_at: '2026-03-10T00:00:00Z',
      expires_at: '2026-03-17T00:00:00Z',
    },
  ],
  total: 1,
  page: 1,
  page_size: 20,
}

const MARKETPLACE_TRADES = {
  items: [
    {
      id: 1,
      buyer_id: 20,
      buyer_name: 'BuyerGal',
      seller_id: 10,
      seller_name: 'SellerGuy',
      item_name: 'Epic Shield',
      item_rarity: 'epic',
      price: 8000,
      tax: 400,
      seller_proceeds: 7600,
      traded_at: '2026-03-09T00:00:00Z',
    },
  ],
  total: 1,
  page: 1,
  page_size: 20,
}

const DONATION_ANALYTICS = {
  total_donations_all_time_cents: 500000,
  total_donors: 120,
  donations_30d_cents: 50000,
  average_donation_cents: 4166,
  repeat_donor_rate: 0.35,
  patron_tiers: { bronze: 80, silver: 25, gold: 10, diamond: 5 },
  top_donors: [{ player_name: 'BigDonor', total_cents: 50000, donation_count: 10 }],
}

const DONATIONS_RESPONSE = {
  items: [
    {
      id: 1,
      player_id: 5,
      player_name: 'DonorPlayer',
      amount_cents: 2500,
      tier: 'silver',
      shard_bonus: 50,
      patron_tier: 'silver',
      created_at: '2026-03-08T00:00:00Z',
    },
  ],
  total: 1,
  page: 1,
  page_size: 25,
}

const FLAGGED_ACCOUNTS = [
  {
    player_id: 99,
    player_name: 'SuspiciousPlayer',
    flag: 'chargeback',
    flagged_since: '2026-03-05T00:00:00Z',
    disputed_order_id: 500,
    total_spent: 20000,
    shard_balance: 15000,
  },
]

const INVESTIGATION_DATA = {
  purchase_history: [{ id: 1, amount: 19.99, currency: 'USD', status: 'completed', created_at: '2026-03-01T00:00:00Z', description: 'Shard Pack' }],
  shard_transactions: [{ id: 1, type: 'purchase', amount: 1000, balance_after: 1000, description: 'Shard purchase', created_at: '2026-03-01T00:00:00Z' }],
  spend_history: [],
  subscription_history: [],
  donation_history: [],
  activity_events: [],
}

/* ── Setup helper ── */

function setupDefaultMocks() {
  vi.mocked(api.get).mockImplementation((url: string) => {
    // Overview tab
    if (url.includes('/finance/overview')) return Promise.resolve(mockResponse(OVERVIEW_DATA) as Response)
    if (url.includes('/revenue-chart')) return Promise.resolve(mockResponse(CHART_DATA) as Response)
    // Transactions tab
    if (url.includes('/finance/transactions')) return Promise.resolve(mockResponse(TRANSACTIONS_RESPONSE) as Response)
    if (url.includes('/webhook-events')) return Promise.resolve(mockResponse({ events: [] }) as Response)
    // Shard Economy tab
    if (url.includes('/finance/shard-economy')) return Promise.resolve(mockResponse(SHARD_ECONOMY_DATA) as Response)
    if (url.includes('/shard-flow-chart')) return Promise.resolve(mockResponse(SHARD_FLOW_DATA) as Response)
    // Subscriptions tab
    if (url.includes('/subscription-metrics')) return Promise.resolve(mockResponse(SUBSCRIPTION_METRICS) as Response)
    if (url.includes('/admin/subscriptions/')) return Promise.resolve(mockResponse(SUBSCRIBERS_RESPONSE) as Response)
    // Shop Management tab
    if (url.includes('/admin/shop/items')) return Promise.resolve(mockResponse(SHOP_ITEMS) as Response)
    if (url.includes('/admin/shop/bundles')) return Promise.resolve(mockResponse(SHOP_BUNDLES) as Response)
    if (url.includes('/shop-analytics')) return Promise.resolve(mockResponse(SHOP_ANALYTICS) as Response)
    // Marketplace tab
    if (url.includes('/marketplace-analytics')) return Promise.resolve(mockResponse(MARKETPLACE_ANALYTICS) as Response)
    if (url.includes('/marketplace/listings')) return Promise.resolve(mockResponse(MARKETPLACE_LISTINGS) as Response)
    if (url.includes('/marketplace/trades')) return Promise.resolve(mockResponse(MARKETPLACE_TRADES) as Response)
    if (url.includes('/marketplace-anomalies')) return Promise.resolve(mockResponse([]) as Response)
    // Donations tab
    if (url.includes('/donation-analytics')) return Promise.resolve(mockResponse(DONATION_ANALYTICS) as Response)
    if (url.includes('/admin/donations/')) return Promise.resolve(mockResponse(DONATIONS_RESPONSE) as Response)
    // Dispute Queue tab
    if (url.includes('/finance/disputes/') && url.includes('/investigate')) return Promise.resolve(mockResponse(INVESTIGATION_DATA) as Response)
    if (url.includes('/finance/disputes')) return Promise.resolve(mockResponse(FLAGGED_ACCOUNTS) as Response)
    // Player lookup
    if (url.includes('/player-lookup')) return Promise.resolve(mockResponse({ player_id: 1, alias: 'TestPlayer', shard_balance: 5000, recent_transactions: [] }) as Response)
    // Default
    return Promise.resolve(mockResponse({}) as Response)
  })

  vi.mocked(api.post).mockImplementation(() => Promise.resolve(mockResponse({ message: 'Success' }) as Response))
  vi.mocked(api.put).mockImplementation(() => Promise.resolve(mockResponse({ message: 'Updated' }) as Response))
  vi.mocked(api.patch).mockImplementation(() => Promise.resolve(mockResponse({ message: 'Patched' }) as Response))
  vi.mocked(api.delete).mockImplementation(() => Promise.resolve(mockResponse({ message: 'Deleted' }) as Response))
}

/* ── Helper to switch tab ── */

async function switchTab(tabName: string) {
  const tabs = screen.getAllByRole('button')
  const tabBtn = tabs.find(btn => btn.textContent === tabName && btn.classList.contains('finance-tab'))
  if (tabBtn) fireEvent.click(tabBtn)
}

/* ── Tests ── */

describe('FinanceDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  // 1. Finance Dashboard renders with all 8 tabs
  it('renders with all 8 tabs', async () => {
    render(<FinanceDashboard />)

    const expectedTabs = ['Overview', 'Transactions', 'Shard Economy', 'Subscriptions', 'Shop Management', 'Marketplace', 'Donations', 'Dispute Queue']
    for (const tab of expectedTabs) {
      expect(screen.getByRole('button', { name: tab })).toBeInTheDocument()
    }
    expect(screen.getByText('Finance Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Revenue, transactions, and shard economy management')).toBeInTheDocument()
  })

  // 2. Tab switching loads correct content
  it('switches tabs and loads correct content', async () => {
    render(<FinanceDashboard />)

    // Default is Overview
    await waitFor(() => {
      expect(screen.getByText('Revenue Today')).toBeInTheDocument()
    })

    // Switch to Transactions
    await switchTab('Transactions')
    await waitFor(() => {
      expect(screen.getByText('Filters')).toBeInTheDocument()
    })

    // Switch to Shard Economy
    await switchTab('Shard Economy')
    await waitFor(() => {
      expect(screen.getByText('Total in Circulation')).toBeInTheDocument()
    })
  })

  // 3. Overview tab: revenue cards display, quick action buttons work
  it('Overview tab displays revenue cards and quick actions', async () => {
    render(<FinanceDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Revenue Today')).toBeInTheDocument()
      expect(screen.getByText('$1500.00')).toBeInTheDocument()
      expect(screen.getByText('Revenue This Week')).toBeInTheDocument()
      expect(screen.getByText('$7500.00')).toBeInTheDocument()
      expect(screen.getByText('Revenue This Month')).toBeInTheDocument()
      expect(screen.getByText('$30000.00')).toBeInTheDocument()
    })

    // Quick action buttons present
    expect(screen.getByText('Run Reconciliation')).toBeInTheDocument()
    expect(screen.getByText('Poll Refunds/Disputes')).toBeInTheDocument()
    expect(screen.getByText('Check Balance Integrity')).toBeInTheDocument()

    // Click quick action
    fireEvent.click(screen.getByText('Run Reconciliation'))
    await waitFor(() => {
      expect(vi.mocked(api.post)).toHaveBeenCalledWith('/api/admin/payments/reconcile')
    })
  })

  // 4. Transactions tab: table renders with filters, search, pagination
  it('Transactions tab renders table with filters and pagination', async () => {
    render(<FinanceDashboard />)
    await switchTab('Transactions')

    await waitFor(() => {
      expect(screen.getByText('Payment Orders (2)')).toBeInTheDocument()
    })

    // Table headers
    expect(screen.getByText('Order ID')).toBeInTheDocument()
    expect(screen.getAllByText('Player').length).toBeGreaterThanOrEqual(1)
    // 'Type' appears as filter label and column header
    expect(screen.getAllByText('Type').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Amount').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Status').length).toBeGreaterThanOrEqual(1)

    // Transaction data
    expect(screen.getByText('#101')).toBeInTheDocument()
    expect(screen.getByText('TestPlayer')).toBeInTheDocument()
    expect(screen.getByText('#102')).toBeInTheDocument()

    // Filters present
    expect(screen.getByPlaceholderText('Player name or order ID...')).toBeInTheDocument()

    // Pagination present
    expect(screen.getByText(/Page 1 of/)).toBeInTheDocument()
  })

  // 5. Transaction detail expandable row shows refund history
  it('Transaction expandable row shows detail data', async () => {
    render(<FinanceDashboard />)
    await switchTab('Transactions')

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument()
    })

    // Click the row to expand
    fireEvent.click(screen.getByText('#101'))

    await waitFor(() => {
      expect(screen.getByText('Full Stripe Charge ID')).toBeInTheDocument()
      expect(screen.getByText('ch_abc123def456ghi789jkl')).toBeInTheDocument()
      expect(screen.getByText('Stripe Refund ID')).toBeInTheDocument()
      expect(screen.getByText('starter_pack')).toBeInTheDocument()
      expect(screen.getByText('Initiate Refund')).toBeInTheDocument()
    })
  })

  // 6. Refund modal: full/partial selection, reason required, confirmation
  it('Refund modal validates reason is required', async () => {
    render(<FinanceDashboard />)
    await switchTab('Transactions')

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument()
    })

    // Expand row and click refund
    fireEvent.click(screen.getByText('#101'))
    await waitFor(() => {
      expect(screen.getByText('Initiate Refund')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Initiate Refund'))

    await waitFor(() => {
      expect(screen.getByText('Refund Type')).toBeInTheDocument()
      expect(screen.getByText(/Full Refund/)).toBeInTheDocument()
      expect(screen.getByText('Partial Refund')).toBeInTheDocument()
      expect(screen.getByText('Reason (required)')).toBeInTheDocument()
    })

    // Submit without reason
    const submitBtn = screen.getByRole('button', { name: /Refund \$/ })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Reason is required.')).toBeInTheDocument()
    })
  })

  // 7. Shard Economy tab: metrics display, shard adjustment modal
  it('Shard Economy tab displays metrics and opens adjustment modal', async () => {
    render(<FinanceDashboard />)
    await switchTab('Shard Economy')

    await waitFor(() => {
      expect(screen.getByText('Total in Circulation')).toBeInTheDocument()
      expect(screen.getByText('Total Granted')).toBeInTheDocument()
      expect(screen.getByText('Total Spent')).toBeInTheDocument()
      expect(screen.getByText('Total Purchased')).toBeInTheDocument()
      expect(screen.getByText('Players w/ Shards')).toBeInTheDocument()
      expect(screen.getByText('Avg Balance')).toBeInTheDocument()
      expect(screen.getByText('Top Holder')).toBeInTheDocument()
      expect(screen.getByText('WhalePlayer')).toBeInTheDocument()
    })

    // Open shard adjustment modal
    fireEvent.click(screen.getByText('Manual Shard Adjustment'))
    await waitFor(() => {
      expect(screen.getByText('Search Player (ID or Name)')).toBeInTheDocument()
    })
  })

  // 8. Shard adjustment: grant/debit toggle, amount input, reason required
  it('Shard adjustment modal has grant/debit toggle and validates reason', async () => {
    render(<FinanceDashboard />)
    await switchTab('Shard Economy')

    await waitFor(() => {
      expect(screen.getByText('Manual Shard Adjustment')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Manual Shard Adjustment'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Player ID or alias...')).toBeInTheDocument()
    })

    // Search for a player
    const searchInput = screen.getByPlaceholderText('Player ID or alias...')
    await userEvent.type(searchInput, 'TestPlayer')
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => {
      expect(screen.getByText('Grant Shards')).toBeInTheDocument()
      expect(screen.getByText('Debit Shards')).toBeInTheDocument()
      expect(screen.getByText('Action')).toBeInTheDocument()
    })
  })

  // 9. Shard adjustment: negative balance warning on debit
  it('Shard adjustment shows negative balance warning on large debit', async () => {
    render(<FinanceDashboard />)
    await switchTab('Shard Economy')

    await waitFor(() => {
      expect(screen.getByText('Manual Shard Adjustment')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Manual Shard Adjustment'))

    // Search for player
    const searchInput = screen.getByPlaceholderText('Player ID or alias...')
    await userEvent.type(searchInput, 'TestPlayer')
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => {
      expect(screen.getByText('Grant Shards')).toBeInTheDocument()
    })

    // Switch to Debit mode
    fireEvent.click(screen.getByLabelText('Debit Shards'))

    // Enter amount greater than balance (balance is 5000)
    const amountInput = screen.getByPlaceholderText('e.g. 500')
    await userEvent.type(amountInput, '10000')

    await waitFor(() => {
      expect(screen.getByText(/negative shard balance/)).toBeInTheDocument()
    })
  })

  // 10. Subscriptions tab: table renders with actions, gift modal
  it('Subscriptions tab renders table with actions and gift form', async () => {
    render(<FinanceDashboard />)
    await switchTab('Subscriptions')

    await waitFor(() => {
      // 'Subscriptions' appears in both tab button and h2 heading
      expect(screen.getAllByText('Subscriptions').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Active Subscribers')).toBeInTheDocument()
    })

    // Table renders
    await waitFor(() => {
      expect(screen.getByText('SubPlayer')).toBeInTheDocument()
    })

    // Subscription actions present
    expect(screen.getByText('Extend')).toBeInTheDocument()
    // 'Cancel' button in row actions
    expect(screen.getAllByRole('button', { name: 'Cancel' }).length).toBeGreaterThanOrEqual(1)
    // 'Streak' appears as both column header and action button
    expect(screen.getAllByText('Streak').length).toBeGreaterThanOrEqual(1)

    // Gift subscription form present
    expect(screen.getByText('Gift Subscription')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Player ID')).toBeInTheDocument()

    // CSV export button present
    expect(screen.getByText('Export CSV')).toBeInTheDocument()
  })

  // 11. Shop Management tab: item list, create/edit modal, bundle management
  it('Shop Management tab shows items, bundles, and create button', async () => {
    render(<FinanceDashboard />)
    await switchTab('Shop Management')

    await waitFor(() => {
      // 'Shop Management' appears in both tab button and h2 heading
      expect(screen.getAllByText('Shop Management').length).toBeGreaterThanOrEqual(1)
    })

    // Items table (Cool Skin appears in item catalog + possibly top selling)
    await waitFor(() => {
      expect(screen.getAllByText('Cool Skin').length).toBeGreaterThanOrEqual(1)
    })

    // Create item button
    expect(screen.getByText('Create Item')).toBeInTheDocument()

    // Category filter present
    expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument()

    // Bundle management section (collapsed by default, click to open)
    const bundleHeader = screen.getByText('Bundle Management')
    expect(bundleHeader).toBeInTheDocument()
  })

  // 12. Marketplace tab: listings table, force remove confirmation, reverse trade confirmation
  it('Marketplace tab shows analytics and listings with actions', async () => {
    render(<FinanceDashboard />)
    await switchTab('Marketplace')

    await waitFor(() => {
      // 'Active Listings' appears in both analytics card and sub-tab button
      expect(screen.getAllByText('Active Listings').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Total Volume (All Time)')).toBeInTheDocument()
    })

    // Listings are loaded (default sub-tab)
    await waitFor(() => {
      expect(screen.getByText('Rare Sword')).toBeInTheDocument()
      expect(screen.getByText('SellerGuy')).toBeInTheDocument()
    })

    // Force Remove button
    expect(screen.getByText('Force Remove')).toBeInTheDocument()

    // Click Force Remove opens modal
    fireEvent.click(screen.getByText('Force Remove'))
    await waitFor(() => {
      expect(screen.getByText(/Force Remove Listing/)).toBeInTheDocument()
      expect(screen.getByText('Confirm Remove')).toBeInTheDocument()
    })
  })

  // 13. Donations tab: table renders with stats cards
  it('Donations tab renders analytics and table', async () => {
    render(<FinanceDashboard />)
    await switchTab('Donations')

    await waitFor(() => {
      // 'Donations' appears in both tab button and h2 heading
      expect(screen.getAllByText('Donations').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Total Donations (All Time)')).toBeInTheDocument()
      expect(screen.getByText('Total Donors')).toBeInTheDocument()
      expect(screen.getByText('Average Donation')).toBeInTheDocument()
    })

    // Patron tier distribution (tier names may appear in both tier cards and table)
    await waitFor(() => {
      expect(screen.getAllByText('Bronze').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Silver').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Gold').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Diamond').length).toBeGreaterThanOrEqual(1)
    })

    // Table renders
    await waitFor(() => {
      expect(screen.getByText('DonorPlayer')).toBeInTheDocument()
    })
  })

  // 14. Dispute Queue tab: flagged accounts list, investigation panel expands
  it('Dispute Queue tab shows flagged accounts and expands investigation', async () => {
    render(<FinanceDashboard />)
    await switchTab('Dispute Queue')

    await waitFor(() => {
      expect(screen.getByText('SuspiciousPlayer')).toBeInTheDocument()
      expect(screen.getByText('chargeback')).toBeInTheDocument()
      expect(screen.getByText('#500')).toBeInTheDocument()
    })

    // Click Investigate
    fireEvent.click(screen.getByText('Investigate'))

    await waitFor(() => {
      expect(screen.getByText('Purchases')).toBeInTheDocument()
      expect(screen.getByText('Shard Transactions')).toBeInTheDocument()
      expect(screen.getByText('Spend History')).toBeInTheDocument()
    })

    // Investigation data loads
    await waitFor(() => {
      expect(screen.getByText('Shard Pack')).toBeInTheDocument()
    })
  })

  // 15. Dispute resolution actions: clear/warn/ban with confirmation modals
  it('Dispute resolution shows clear/warn/ban actions with modals', async () => {
    render(<FinanceDashboard />)
    await switchTab('Dispute Queue')

    await waitFor(() => {
      expect(screen.getByText('SuspiciousPlayer')).toBeInTheDocument()
    })

    // Clear/Warn/Ban buttons present
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Warn' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ban' })).toBeInTheDocument()

    // Click Clear opens modal
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    await waitFor(() => {
      expect(screen.getByText(/Clear Flag/)).toBeInTheDocument()
      expect(screen.getByText('Reason (required):')).toBeInTheDocument()
      expect(screen.getByText('Confirm Clear')).toBeInTheDocument()
    })
  })

  // 16. Manual refresh button triggers data reload
  it('Refresh button triggers data reload', async () => {
    render(<FinanceDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Revenue Today')).toBeInTheDocument()
    })

    const initialCallCount = vi.mocked(api.get).mock.calls.length

    // Click Refresh
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))

    await waitFor(() => {
      // After refresh, new API calls should be made (overview + chart refetched)
      expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThan(initialCallCount)
    })
  })

  // 17. CSV export button generates download for filtered transaction list
  it('CSV export button is present on Transactions tab', async () => {
    render(<FinanceDashboard />)
    await switchTab('Transactions')

    await waitFor(() => {
      expect(screen.getByText('Payment Orders (2)')).toBeInTheDocument()
    })

    // CSV export button should be present
    const exportBtns = screen.getAllByText('Export CSV')
    expect(exportBtns.length).toBeGreaterThanOrEqual(1)

    // The button should be enabled since there's data
    const exportBtn = exportBtns[0]
    expect(exportBtn).not.toBeDisabled()
  })

  // 18. CSV export button generates download for filtered subscription list
  it('CSV export button is present on Subscriptions tab', async () => {
    render(<FinanceDashboard />)
    await switchTab('Subscriptions')

    await waitFor(() => {
      expect(screen.getByText('SubPlayer')).toBeInTheDocument()
    })

    // CSV export button should be present
    const exportBtns = screen.getAllByText('Export CSV')
    expect(exportBtns.length).toBeGreaterThanOrEqual(1)

    // The button should be enabled since there's data
    const exportBtn = exportBtns[0]
    expect(exportBtn).not.toBeDisabled()
  })
})
