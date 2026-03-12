import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import CsvExportButton from './CsvExportButton'
import './FinanceTabs.css'

/* ── Types ── */

interface DonationAnalytics {
  total_donations_all_time_cents: number
  total_donors: number
  donations_30d_cents: number
  average_donation_cents: number
  repeat_donor_rate: number
  patron_tiers: Record<string, number>
  top_donors: { player_name: string; total_cents: number; donation_count: number }[]
}

interface Donation {
  id: number
  player_id: number
  player_name: string
  amount_cents: number
  tier: string
  shard_bonus: number
  patron_tier: string
  created_at: string
}

interface DonationPage {
  items: Donation[]
  total: number
  page: number
  page_size: number
}

/* ── Helpers ── */

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatPct(val: number): string {
  return `${(val * 100).toFixed(1)}%`
}

function fmtDate(iso: string): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString()
}

const PATRON_TIERS = ['bronze', 'silver', 'gold', 'diamond']

/* ── Component ── */

export default function DonationsTab() {
  // Analytics
  const [analytics, setAnalytics] = useState<DonationAnalytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  // Table
  const [donations, setDonations] = useState<Donation[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [searchText, setSearchText] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [tierFilter, setTierFilter] = useState('')

  const PAGE_SIZE = 25

  /* ── Data fetching ── */

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true)
    try {
      const res = await api.get('/api/admin/finance/donation-analytics')
      if (res.ok) setAnalytics(await res.json())
    } catch { /* ignore */ }
    setAnalyticsLoading(false)
  }, [])

  const fetchDonations = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('page_size', String(PAGE_SIZE))
      if (searchText) params.set('search', searchText)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      if (amountMin) params.set('amount_min', amountMin)
      if (amountMax) params.set('amount_max', amountMax)
      if (tierFilter) params.set('patron_tier', tierFilter)

      const res = await api.get(`/api/admin/donations/?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: DonationPage = await res.json()
      setDonations(data.items)
      setTotal(data.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load donations')
    }
    setLoading(false)
  }, [page, searchText, dateFrom, dateTo, amountMin, amountMax, tierFilter])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])
  useEffect(() => { fetchDonations() }, [fetchDonations])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  /* ── Render ── */

  return (
    <div>
      <h2 className="ftab-section-title">Donations</h2>

      {/* Analytics cards */}
      {analyticsLoading ? (
        <div className="ftab-loading">Loading donation analytics...</div>
      ) : analytics ? (
        <>
          <div className="ftab-metrics">
            <div className="ftab-metric-card">
              <span className="ftab-metric-label">Total Donations (All Time)</span>
              <span className="ftab-metric-value ftab-metric-value--green">
                {formatCurrency(analytics.total_donations_all_time_cents)}
              </span>
            </div>
            <div className="ftab-metric-card">
              <span className="ftab-metric-label">Total Donors</span>
              <span className="ftab-metric-value">{analytics.total_donors.toLocaleString()}</span>
            </div>
            <div className="ftab-metric-card">
              <span className="ftab-metric-label">Donations (30d)</span>
              <span className="ftab-metric-value ftab-metric-value--green">
                {formatCurrency(analytics.donations_30d_cents)}
              </span>
            </div>
            <div className="ftab-metric-card">
              <span className="ftab-metric-label">Average Donation</span>
              <span className="ftab-metric-value">{formatCurrency(analytics.average_donation_cents)}</span>
            </div>
            <div className="ftab-metric-card">
              <span className="ftab-metric-label">Repeat Donor Rate</span>
              <span className="ftab-metric-value ftab-metric-value--amber">
                {formatPct(analytics.repeat_donor_rate)}
              </span>
            </div>
          </div>

          {/* Patron tier distribution */}
          {analytics.patron_tiers && Object.keys(analytics.patron_tiers).length > 0 && (
            <>
              <h5 className="ftab-sub-title">Patron Tier Distribution</h5>
              <div className="ftab-tier-row">
                {PATRON_TIERS.map(tier => (
                  <div className={`ftab-tier-card ftab-tier--${tier}`} key={tier}>
                    <h5>{tier.charAt(0).toUpperCase() + tier.slice(1)}</h5>
                    <div className="ftab-tier-count">
                      {(analytics.patron_tiers[tier] ?? 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Top donors */}
          {analytics.top_donors && analytics.top_donors.length > 0 && (
            <>
              <h5 className="ftab-sub-title">Top 10 Donors</h5>
              <ol className="ftab-donor-list">
                {analytics.top_donors.slice(0, 10).map((donor, i) => (
                  <li key={i}>
                    <span className="ftab-donor-rank">#{i + 1}</span>
                    <span className="ftab-donor-name">{donor.player_name}</span>
                    <span className="ftab-donor-amount">
                      {formatCurrency(donor.total_cents)} ({donor.donation_count} donations)
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </>
      ) : null}

      {/* Filters */}
      <div className="ftab-toolbar">
        <input
          className="ftab-input"
          placeholder="Search player..."
          value={searchText}
          onChange={e => { setSearchText(e.target.value); setPage(1) }}
        />
        <select
          className="ftab-select"
          value={tierFilter}
          onChange={e => { setTierFilter(e.target.value); setPage(1) }}
        >
          <option value="">All Tiers</option>
          {PATRON_TIERS.map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        <input
          className="ftab-input ftab-input--date"
          type="date"
          value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); setPage(1) }}
          title="From date"
        />
        <input
          className="ftab-input ftab-input--date"
          type="date"
          value={dateTo}
          onChange={e => { setDateTo(e.target.value); setPage(1) }}
          title="To date"
        />
        <input
          className="ftab-input ftab-input--sm"
          type="number"
          min="0"
          placeholder="Min $"
          value={amountMin}
          onChange={e => { setAmountMin(e.target.value); setPage(1) }}
          title="Minimum amount (cents)"
        />
        <input
          className="ftab-input ftab-input--sm"
          type="number"
          min="0"
          placeholder="Max $"
          value={amountMax}
          onChange={e => { setAmountMax(e.target.value); setPage(1) }}
          title="Maximum amount (cents)"
        />
        <div className="ftab-toolbar-right">
          <CsvExportButton
            data={donations as unknown as Record<string, unknown>[]}
            filename="donations_export"
          />
        </div>
      </div>

      {/* Error */}
      {error && <div className="ftab-error">{error}</div>}

      {/* Table */}
      {loading ? (
        <div className="ftab-loading">Loading donations...</div>
      ) : donations.length === 0 ? (
        <div className="ftab-empty">No donations found.</div>
      ) : (
        <>
          <div className="ftab-table-wrap">
            <table className="ftab-table">
              <thead>
                <tr>
                  <th>Donation ID</th>
                  <th>Player</th>
                  <th>Amount</th>
                  <th>Tier</th>
                  <th>Shard Bonus</th>
                  <th>Patron Tier</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {donations.map(d => (
                  <tr key={d.id}>
                    <td>{d.id}</td>
                    <td>{d.player_name || `#${d.player_id}`}</td>
                    <td style={{ color: '#2ecc71', fontWeight: 600 }}>{formatCurrency(d.amount_cents)}</td>
                    <td>{d.tier}</td>
                    <td>{d.shard_bonus.toLocaleString()}</td>
                    <td>
                      <span className={`ftab-badge ftab-badge--${d.patron_tier === 'none' ? 'no' : 'active'}`}>
                        {d.patron_tier}
                      </span>
                    </td>
                    <td>{fmtDate(d.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ftab-pagination">
            <button className="ftab-btn ftab-btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Prev
            </button>
            <span>Page {page} of {totalPages} ({total} total)</span>
            <button className="ftab-btn ftab-btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}
