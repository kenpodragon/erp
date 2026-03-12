import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import './MarketplaceDisputes.css'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MarketplaceAnalytics {
  active_listings: number
  total_volume_all_time: number
  volume_7d: number
  volume_30d: number
  average_sale_price: number
  tax_burned: number
  unique_traders_30d: number
  items_listed_30d: number
}

interface Listing {
  id: number
  seller_id: number
  seller_name: string
  item_name: string
  item_rarity: string
  price: number
  status: string
  listed_at: string
  expires_at: string | null
}

interface Trade {
  id: number
  buyer_id: number
  buyer_name: string
  seller_id: number
  seller_name: string
  item_name: string
  item_rarity: string
  price: number
  tax: number
  seller_proceeds: number
  traded_at: string
}

interface Anomaly {
  type: string
  details: string
  player_ids: number[]
  player_names: string[]
  timestamp: string
}

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

type SubTab = 'listings' | 'trades' | 'anomalies'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatShards(n: number): string {
  return n.toLocaleString('en-US')
}

function rarityClass(rarity: string): string {
  const r = rarity?.toLowerCase() || 'common'
  if (r === 'uncommon') return 'rarity-uncommon'
  if (r === 'rare') return 'rarity-rare'
  if (r === 'epic') return 'rarity-epic'
  if (r === 'legendary') return 'rarity-legendary'
  return 'rarity-common'
}

function timeUntil(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ${hours % 24}h`
  return `${hours}h`
}

function toCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  return [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MarketplaceTab() {
  const [analytics, setAnalytics] = useState<MarketplaceAnalytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)

  const [subTab, setSubTab] = useState<SubTab>('listings')

  // Listings state
  const [listings, setListings] = useState<Listing[]>([])
  const [listingsTotal, setListingsTotal] = useState(0)
  const [listingsPage, setListingsPage] = useState(1)
  const [listingsLoading, setListingsLoading] = useState(false)
  const [listingsFilter, setListingsFilter] = useState({
    status: '',
    player_id: '',
    search: '',
  })

  // Trades state
  const [trades, setTrades] = useState<Trade[]>([])
  const [tradesTotal, setTradesTotal] = useState(0)
  const [tradesPage, setTradesPage] = useState(1)
  const [tradesLoading, setTradesLoading] = useState(false)
  const [tradesFilter, setTradesFilter] = useState({
    player_id: '',
    min_amount: '',
    max_amount: '',
  })

  // Anomalies state
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [anomaliesLoading, setAnomaliesLoading] = useState(false)

  // Modal state
  const [removeModal, setRemoveModal] = useState<{ listing: Listing } | null>(null)
  const [removeReason, setRemoveReason] = useState('')
  const [reverseModal, setReverseModal] = useState<{ trade: Trade } | null>(null)
  const [reverseReason, setReverseReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const PAGE_SIZE = 20

  /* -- Analytics fetch -------------------------------------------- */
  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true)
    try {
      const res = await api.get('/api/admin/finance/marketplace-analytics')
      if (!res.ok) throw new Error('Failed to load marketplace analytics')
      setAnalytics(await res.json())
      setAnalyticsError(null)
    } catch (err) {
      setAnalyticsError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setAnalyticsLoading(false)
    }
  }, [])

  /* -- Listings fetch --------------------------------------------- */
  const fetchListings = useCallback(async () => {
    setListingsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(listingsPage),
        page_size: String(PAGE_SIZE),
      })
      if (listingsFilter.status) params.set('status', listingsFilter.status)
      if (listingsFilter.player_id) params.set('player_id', listingsFilter.player_id)
      if (listingsFilter.search) params.set('search', listingsFilter.search)

      const res = await api.get(`/api/admin/marketplace/listings?${params}`)
      if (!res.ok) throw new Error('Failed to load listings')
      const data: PaginatedResponse<Listing> = await res.json()
      setListings(data.items)
      setListingsTotal(data.total)
    } catch {
      setListings([])
    } finally {
      setListingsLoading(false)
    }
  }, [listingsPage, listingsFilter])

  /* -- Trades fetch ----------------------------------------------- */
  const fetchTrades = useCallback(async () => {
    setTradesLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(tradesPage),
        page_size: String(PAGE_SIZE),
      })
      if (tradesFilter.player_id) params.set('player_id', tradesFilter.player_id)
      if (tradesFilter.min_amount) params.set('min_amount', tradesFilter.min_amount)
      if (tradesFilter.max_amount) params.set('max_amount', tradesFilter.max_amount)

      const res = await api.get(`/api/admin/marketplace/trades?${params}`)
      if (!res.ok) throw new Error('Failed to load trades')
      const data: PaginatedResponse<Trade> = await res.json()
      setTrades(data.items)
      setTradesTotal(data.total)
    } catch {
      setTrades([])
    } finally {
      setTradesLoading(false)
    }
  }, [tradesPage, tradesFilter])

  /* -- Anomalies fetch -------------------------------------------- */
  const fetchAnomalies = useCallback(async () => {
    setAnomaliesLoading(true)
    try {
      const res = await api.get('/api/admin/finance/marketplace-anomalies')
      if (!res.ok) throw new Error('Failed to load anomalies')
      setAnomalies(await res.json())
    } catch {
      setAnomalies([])
    } finally {
      setAnomaliesLoading(false)
    }
  }, [])

  /* -- Effects ---------------------------------------------------- */
  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  useEffect(() => {
    if (subTab === 'listings') fetchListings()
    else if (subTab === 'trades') fetchTrades()
    else if (subTab === 'anomalies') fetchAnomalies()
  }, [subTab, fetchListings, fetchTrades, fetchAnomalies])

  /* -- Actions ---------------------------------------------------- */
  const handleForceRemove = async () => {
    if (!removeModal || !removeReason.trim()) return
    setActionLoading(true)
    try {
      const res = await api.delete(`/api/admin/marketplace/listings/${removeModal.listing.id}`)
      if (!res.ok) throw new Error('Failed to remove listing')
      setRemoveModal(null)
      setRemoveReason('')
      fetchListings()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove listing')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReverseTrade = async () => {
    if (!reverseModal || !reverseReason.trim()) return
    setActionLoading(true)
    try {
      const res = await api.post(`/api/admin/marketplace/reverse-trade/${reverseModal.trade.id}`, {
        reason: reverseReason,
      })
      if (!res.ok) throw new Error('Failed to reverse trade')
      setReverseModal(null)
      setReverseReason('')
      fetchTrades()
      fetchAnalytics()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reverse trade')
    } finally {
      setActionLoading(false)
    }
  }

  /* -- CSV exports ------------------------------------------------ */
  const exportListingsCsv = () => {
    const headers = ['ID', 'Seller', 'Seller ID', 'Item', 'Rarity', 'Price', 'Status', 'Listed At', 'Expires At']
    const rows = listings.map(l => [
      String(l.id), l.seller_name, String(l.seller_id), l.item_name, l.item_rarity,
      String(l.price), l.status, l.listed_at, l.expires_at || '',
    ])
    downloadCsv('marketplace_listings.csv', toCsv(headers, rows))
  }

  const exportTradesCsv = () => {
    const headers = ['ID', 'Buyer', 'Buyer ID', 'Seller', 'Seller ID', 'Item', 'Rarity', 'Price', 'Tax', 'Seller Proceeds', 'Date']
    const rows = trades.map(t => [
      String(t.id), t.buyer_name, String(t.buyer_id), t.seller_name, String(t.seller_id),
      t.item_name, t.item_rarity, String(t.price), String(t.tax), String(t.seller_proceeds), t.traded_at,
    ])
    downloadCsv('marketplace_trades.csv', toCsv(headers, rows))
  }

  /* -- Pagination helpers ----------------------------------------- */
  const listingsPages = Math.max(1, Math.ceil(listingsTotal / PAGE_SIZE))
  const tradesPages = Math.max(1, Math.ceil(tradesTotal / PAGE_SIZE))

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="mkt-tab">
      {/* Analytics cards */}
      <div className="mkt-stats-grid">
        {analyticsLoading ? (
          <p className="mkt-loading">Loading analytics...</p>
        ) : analyticsError ? (
          <p className="mkt-error">{analyticsError}</p>
        ) : analytics ? (
          <>
            <div className="mkt-stat-card">
              <span className="mkt-stat-label">Active Listings</span>
              <span className="mkt-stat-value">{formatShards(analytics.active_listings)}</span>
            </div>
            <div className="mkt-stat-card">
              <span className="mkt-stat-label">Total Volume (All Time)</span>
              <span className="mkt-stat-value">{formatShards(analytics.total_volume_all_time)}</span>
            </div>
            <div className="mkt-stat-card">
              <span className="mkt-stat-label">Volume (7d)</span>
              <span className="mkt-stat-value">{formatShards(analytics.volume_7d)}</span>
            </div>
            <div className="mkt-stat-card">
              <span className="mkt-stat-label">Volume (30d)</span>
              <span className="mkt-stat-value">{formatShards(analytics.volume_30d)}</span>
            </div>
            <div className="mkt-stat-card">
              <span className="mkt-stat-label">Avg Sale Price</span>
              <span className="mkt-stat-value">{formatShards(analytics.average_sale_price)}</span>
            </div>
            <div className="mkt-stat-card">
              <span className="mkt-stat-label">Tax Burned</span>
              <span className="mkt-stat-value">{formatShards(analytics.tax_burned)}</span>
            </div>
            <div className="mkt-stat-card">
              <span className="mkt-stat-label">Unique Traders (30d)</span>
              <span className="mkt-stat-value">{formatShards(analytics.unique_traders_30d)}</span>
            </div>
            <div className="mkt-stat-card">
              <span className="mkt-stat-label">Items Listed (30d)</span>
              <span className="mkt-stat-value">{formatShards(analytics.items_listed_30d)}</span>
            </div>
          </>
        ) : null}
      </div>

      {/* Sub-tabs */}
      <div className="mkt-subtabs">
        <button className={`mkt-subtab ${subTab === 'listings' ? 'active' : ''}`} onClick={() => { setSubTab('listings'); setListingsPage(1) }}>
          Active Listings
        </button>
        <button className={`mkt-subtab ${subTab === 'trades' ? 'active' : ''}`} onClick={() => { setSubTab('trades'); setTradesPage(1) }}>
          Trade History
        </button>
        <button className={`mkt-subtab ${subTab === 'anomalies' ? 'active' : ''}`} onClick={() => setSubTab('anomalies')}>
          Anomaly Log
        </button>
      </div>

      {/* ---- Active Listings ---- */}
      {subTab === 'listings' && (
        <div className="mkt-section">
          <div className="mkt-filters">
            <select value={listingsFilter.status} onChange={e => { setListingsFilter(f => ({ ...f, status: e.target.value })); setListingsPage(1) }}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="sold">Sold</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
              <option value="removed">Removed</option>
            </select>
            <input
              type="text"
              placeholder="Player ID"
              value={listingsFilter.player_id}
              onChange={e => { setListingsFilter(f => ({ ...f, player_id: e.target.value })); setListingsPage(1) }}
            />
            <input
              type="text"
              placeholder="Search item..."
              value={listingsFilter.search}
              onChange={e => { setListingsFilter(f => ({ ...f, search: e.target.value })); setListingsPage(1) }}
            />
            <button className="mkt-btn mkt-btn-sm" onClick={exportListingsCsv}>Export CSV</button>
          </div>

          {listingsLoading ? (
            <p className="mkt-loading">Loading listings...</p>
          ) : listings.length === 0 ? (
            <p className="mkt-empty">No listings found.</p>
          ) : (
            <>
              <div className="mkt-table-wrap">
                <table className="mkt-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Seller</th>
                      <th>Item</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Listed</th>
                      <th>Expires In</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map(l => (
                      <tr key={l.id}>
                        <td className="mono">{l.id}</td>
                        <td>{l.seller_name} <span className="id-tag">#{l.seller_id}</span></td>
                        <td><span className={`rarity-badge ${rarityClass(l.item_rarity)}`}>{l.item_rarity}</span> {l.item_name}</td>
                        <td className="mono">{formatShards(l.price)}</td>
                        <td><span className={`listing-status ${l.status}`}>{l.status}</span></td>
                        <td>{new Date(l.listed_at).toLocaleDateString()}</td>
                        <td>{timeUntil(l.expires_at)}</td>
                        <td>
                          {l.status === 'active' && (
                            <button className="mkt-btn mkt-btn-danger mkt-btn-sm" onClick={() => { setRemoveModal({ listing: l }); setRemoveReason('') }}>
                              Force Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mkt-pagination">
                <button disabled={listingsPage <= 1} onClick={() => setListingsPage(p => p - 1)}>Prev</button>
                <span>Page {listingsPage} of {listingsPages}</span>
                <button disabled={listingsPage >= listingsPages} onClick={() => setListingsPage(p => p + 1)}>Next</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ---- Trade History ---- */}
      {subTab === 'trades' && (
        <div className="mkt-section">
          <div className="mkt-filters">
            <input
              type="text"
              placeholder="Player ID"
              value={tradesFilter.player_id}
              onChange={e => { setTradesFilter(f => ({ ...f, player_id: e.target.value })); setTradesPage(1) }}
            />
            <input
              type="text"
              placeholder="Min Price"
              value={tradesFilter.min_amount}
              onChange={e => { setTradesFilter(f => ({ ...f, min_amount: e.target.value })); setTradesPage(1) }}
            />
            <input
              type="text"
              placeholder="Max Price"
              value={tradesFilter.max_amount}
              onChange={e => { setTradesFilter(f => ({ ...f, max_amount: e.target.value })); setTradesPage(1) }}
            />
            <button className="mkt-btn mkt-btn-sm" onClick={exportTradesCsv}>Export CSV</button>
          </div>

          {tradesLoading ? (
            <p className="mkt-loading">Loading trades...</p>
          ) : trades.length === 0 ? (
            <p className="mkt-empty">No trades found.</p>
          ) : (
            <>
              <div className="mkt-table-wrap">
                <table className="mkt-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Buyer</th>
                      <th>Seller</th>
                      <th>Item</th>
                      <th>Price</th>
                      <th>Tax</th>
                      <th>Proceeds</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map(t => (
                      <tr key={t.id}>
                        <td className="mono">{t.id}</td>
                        <td>{t.buyer_name} <span className="id-tag">#{t.buyer_id}</span></td>
                        <td>{t.seller_name} <span className="id-tag">#{t.seller_id}</span></td>
                        <td><span className={`rarity-badge ${rarityClass(t.item_rarity)}`}>{t.item_rarity}</span> {t.item_name}</td>
                        <td className="mono">{formatShards(t.price)}</td>
                        <td className="mono">{formatShards(t.tax)}</td>
                        <td className="mono">{formatShards(t.seller_proceeds)}</td>
                        <td>{new Date(t.traded_at).toLocaleDateString()}</td>
                        <td>
                          <button className="mkt-btn mkt-btn-warn mkt-btn-sm" onClick={() => { setReverseModal({ trade: t }); setReverseReason('') }}>
                            Reverse
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mkt-pagination">
                <button disabled={tradesPage <= 1} onClick={() => setTradesPage(p => p - 1)}>Prev</button>
                <span>Page {tradesPage} of {tradesPages}</span>
                <button disabled={tradesPage >= tradesPages} onClick={() => setTradesPage(p => p + 1)}>Next</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ---- Anomaly Log ---- */}
      {subTab === 'anomalies' && (
        <div className="mkt-section">
          <div className="mkt-filters">
            <button className="mkt-btn mkt-btn-sm" onClick={fetchAnomalies}>Refresh</button>
          </div>

          {anomaliesLoading ? (
            <p className="mkt-loading">Loading anomalies...</p>
          ) : anomalies.length === 0 ? (
            <p className="mkt-empty">No anomalies detected.</p>
          ) : (
            <div className="mkt-table-wrap">
              <table className="mkt-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Details</th>
                    <th>Player(s)</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalies.map((a, i) => (
                    <tr key={i} className={`anomaly-row anomaly-${a.type}`}>
                      <td><span className={`anomaly-badge anomaly-type-${a.type}`}>{a.type.replace(/_/g, ' ')}</span></td>
                      <td>{a.details}</td>
                      <td>{a.player_names.map((name, j) => (
                        <span key={j} className="anomaly-player">{name} <span className="id-tag">#{a.player_ids[j]}</span></span>
                      ))}</td>
                      <td>{new Date(a.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---- Force Remove Modal ---- */}
      {removeModal && (
        <div className="mkt-modal-overlay">
          <div className="mkt-modal">
            <h3>Force Remove Listing #{removeModal.listing.id}</h3>
            <p>
              Item: <strong>{removeModal.listing.item_name}</strong> listed by{' '}
              <strong>{removeModal.listing.seller_name}</strong> for {formatShards(removeModal.listing.price)} shards.
            </p>
            <p className="mkt-modal-warn">This will immediately remove the listing from the marketplace.</p>
            <label className="mkt-modal-label">Reason for removal:</label>
            <textarea
              value={removeReason}
              onChange={e => setRemoveReason(e.target.value)}
              placeholder="Enter reason..."
              rows={3}
            />
            <div className="mkt-modal-actions">
              <button className="mkt-btn mkt-btn-secondary" onClick={() => setRemoveModal(null)}>Cancel</button>
              <button
                className="mkt-btn mkt-btn-danger"
                onClick={handleForceRemove}
                disabled={removeReason.trim().length < 5 || actionLoading}
              >
                {actionLoading ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Reverse Trade Modal ---- */}
      {reverseModal && (
        <div className="mkt-modal-overlay">
          <div className="mkt-modal">
            <h3>Reverse Trade #{reverseModal.trade.id}</h3>
            <p>
              <strong>{reverseModal.trade.buyer_name}</strong> bought{' '}
              <strong>{reverseModal.trade.item_name}</strong> from{' '}
              <strong>{reverseModal.trade.seller_name}</strong> for {formatShards(reverseModal.trade.price)} shards.
            </p>
            <p className="mkt-modal-warn-critical">
              Warning: The marketplace tax ({formatShards(reverseModal.trade.tax)} shards) will NOT be refunded.
              The item will be returned to the seller and shards returned to the buyer minus tax.
            </p>
            <label className="mkt-modal-label">Reason for reversal:</label>
            <textarea
              value={reverseReason}
              onChange={e => setReverseReason(e.target.value)}
              placeholder="Enter reason..."
              rows={3}
            />
            <div className="mkt-modal-actions">
              <button className="mkt-btn mkt-btn-secondary" onClick={() => setReverseModal(null)}>Cancel</button>
              <button
                className="mkt-btn mkt-btn-danger"
                onClick={handleReverseTrade}
                disabled={reverseReason.trim().length < 5 || actionLoading}
              >
                {actionLoading ? 'Reversing...' : 'Confirm Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
