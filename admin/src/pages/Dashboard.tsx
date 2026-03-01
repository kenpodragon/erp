import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { api } from '../api'
import './Dashboard.css'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface OverviewStats {
  players: {
    total: number
    active_24h: number
    active_7d: number
    active_30d: number
  }
  registrations: {
    today: number
    this_week: number
    this_month: number
  }
  tickets: {
    open: number
    avg_resolution_time_seconds: number
  }
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return 'N/A'
  const hours = Math.round(seconds / 3600)
  if (hours < 24) return `${hours}h`
  const days = Math.round(hours / 24)
  return `${days}d`
}

interface TimeSeriesPoint {
  date: string
  count: number
}

interface ChapterPoint {
  book: number
  chapter: number
  count: number
}

interface ActivityEvent {
  id: number
  player_id: number | null
  player_alias: string | null
  event_type: string
  event_data: Record<string, unknown> | null
  created_at: string
}

type DauRange = '7d' | '30d' | '90d'

const EVENT_TYPES = [
  '', 'player_login', 'player_logout', 'character_created',
  'profile_updated', 'support_ticket_created',
]

const EVENT_LABELS: Record<string, string> = {
  player_login: 'Login',
  player_logout: 'Logout',
  character_created: 'Character Created',
  profile_updated: 'Profile Updated',
  support_ticket_created: 'Ticket Created',
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function OverviewCards({ stats }: { stats: OverviewStats }) {
  return (
    <div className="overview-cards">
      <div className="ov-card">
        <span className="ov-label">Total Players</span>
        <span className="ov-value">{stats.players.total.toLocaleString()}</span>
      </div>
      <div className="ov-card">
        <span className="ov-label">Active</span>
        <div className="ov-sub-row">
          <span><strong>{stats.players.active_24h}</strong><em>24h</em></span>
          <span><strong>{stats.players.active_7d}</strong><em>7d</em></span>
          <span><strong>{stats.players.active_30d}</strong><em>30d</em></span>
        </div>
      </div>
      <div className="ov-card">
        <span className="ov-label">New Registrations</span>
        <div className="ov-sub-row">
          <span><strong>{stats.registrations.today}</strong><em>Today</em></span>
          <span><strong>{stats.registrations.this_week}</strong><em>This Week</em></span>
          <span><strong>{stats.registrations.this_month}</strong><em>This Month</em></span>
        </div>
      </div>
      <div className="ov-card warning">
        <span className="ov-label">Open Tickets</span>
        <span className="ov-value">{stats.tickets.open}</span>
        <div className="ov-sub-row">
          <span><strong>{formatDuration(stats.tickets.avg_resolution_time_seconds)}</strong><em>Avg Res Time</em></span>
        </div>
        <Link to="/support" className="ov-link">View Queue →</Link>
      </div>
    </div>
  )
}

function DauChart() {
  const [range, setRange] = useState<DauRange>('30d')
  const [data, setData] = useState<TimeSeriesPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/api/admin/analytics/dau?range=${range}`)
      .then(r => r.json())
      .then(d => setData(d.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [range])

  return (
    <div className="dash-card chart-card">
      <div className="card-header">
        <h3>Daily Active Users</h3>
        <div className="range-toggle">
          {(['7d', '30d', '90d'] as DauRange[]).map(r => (
            <button
              key={r}
              className={range === r ? 'active' : ''}
              onClick={() => { setLoading(true); setRange(r) }}
            >{r}</button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="chart-empty">Loading…</div>
      ) : data.length === 0 ? (
        <div className="chart-empty">No login events recorded yet.</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 11 }} />
            <YAxis tick={{ fill: '#555', fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#1a1a1a', border: '1px solid #333', color: '#fff' }}
            />
            <Line type="monotone" dataKey="count" stroke="#646cff" strokeWidth={2} dot={false} name="DAU" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function RegistrationChart() {
  const [data, setData] = useState<TimeSeriesPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/admin/analytics/registrations?range=30d')
      .then(r => r.json())
      .then(d => setData(d.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="dash-card chart-card">
      <div className="card-header">
        <h3>New Registrations (30d)</h3>
      </div>
      {loading ? (
        <div className="chart-empty">Loading…</div>
      ) : data.length === 0 ? (
        <div className="chart-empty">No registrations in last 30 days.</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 11 }} />
            <YAxis tick={{ fill: '#555', fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#1a1a1a', border: '1px solid #333', color: '#fff' }}
            />
            <Bar dataKey="count" fill="#4caf50" name="Registrations" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function ChapterDistribution() {
  const [data, setData] = useState<ChapterPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/admin/analytics/chapter-distribution')
      .then(r => r.json())
      .then(d => setData(d.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="dash-card">
      <div className="card-header">
        <h3>Chapter Distribution</h3>
      </div>
      {loading ? (
        <div className="chart-empty">Loading…</div>
      ) : data.length === 0 ? (
        <div className="chart-empty">No player progress data yet.</div>
      ) : (
        <table className="dist-table">
          <thead>
            <tr><th>Book</th><th>Chapter</th><th>Players</th></tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={`${row.book}-${row.chapter}`}>
                <td>{row.book}</td>
                <td>{row.chapter}</td>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const qs = filter ? `?event_type=${filter}&limit=50` : '?limit=50'
    api.get(`/api/admin/analytics/events${qs}`)
      .then(r => r.json())
      .then(d => { setEvents(d.events || []); setTotal(d.total || 0) })
      .catch(() => { setEvents([]); setTotal(0) })
      .finally(() => setLoading(false))
  }, [filter])

  return (
    <div className="dash-card activity-feed-card">
      <div className="card-header">
        <h3>Recent Activity</h3>
        <select
          className="feed-filter"
          value={filter}
          onChange={e => { setLoading(true); setFilter(e.target.value) }}
        >
          {EVENT_TYPES.map(t => (
            <option key={t} value={t}>{t ? EVENT_LABELS[t] || t : 'All Events'}</option>
          ))}
        </select>
      </div>
      <div className="feed-meta">{total} total events</div>
      {loading ? (
        <div className="chart-empty">Loading…</div>
      ) : events.length === 0 ? (
        <div className="chart-empty">No events found.</div>
      ) : (
        <div className="feed-list">
          {events.map(ev => (
            <div key={ev.id} className="feed-item">
              <span className="feed-time">{new Date(ev.created_at).toLocaleString()}</span>
              <span className={`feed-badge event-${ev.event_type.replace(/_/g, '-')}`}>
                {EVENT_LABELS[ev.event_type] || ev.event_type}
              </span>
              <span className="feed-player">
                {ev.player_alias ?? (ev.player_id ? `#${ev.player_id}` : '—')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const [overview, setOverview] = useState<OverviewStats | null>(null)
  const [overviewError, setOverviewError] = useState<string | null>(null)

  useEffect(() => {
    api.get('/api/admin/analytics/overview')
      .then(r => r.json())
      .then(d => setOverview(d))
      .catch(() => setOverviewError('Failed to load overview stats'))
  }, [])

  return (
    <div className="dashboard-page">
      <header className="dash-header">
        <h1>Admin Dashboard</h1>
        <p className="dash-subtitle">Real-time overview of Elysium Rising</p>
      </header>

      {overviewError && <div className="dash-error">{overviewError}</div>}

      {overview && <OverviewCards stats={overview} />}

      <div className="dash-charts-row">
        <DauChart />
        <RegistrationChart />
      </div>

      <div className="dash-bottom-row">
        <ChapterDistribution />
        <ActivityFeed />
      </div>

      <div className="dash-grid dash-quick-row">
        <section className="dash-card quick-actions-card">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <Link to="/config" className="action-btn">System Settings</Link>
            <Link to="/players" className="action-btn">Search Player</Link>
            <Link to="/support" className="action-btn">Check Critical Tickets</Link>
            <Link to="/audit-log" className="action-btn">Audit Log</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
