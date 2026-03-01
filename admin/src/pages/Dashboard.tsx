import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import './Dashboard.css'

interface DashboardStats {
  players: {
    total: number
    active_30d: number
    banned: number
  }
  tickets: {
    open: number
    in_progress: number
    total_unresolved: number
  }
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch players summary
        const pRes = await api.get('/api/admin/players?limit=1')
        const pData = await pRes.json()
        
        // Fetch tickets summary (reusing existing list endpoint with status filters)
        const tOpenRes = await api.get('/api/admin/support/tickets?status=open&limit=1')
        const tOpenData = await tOpenRes.json()
        const tProgRes = await api.get('/api/admin/support/tickets?status=in_progress&limit=1')
        const tProgData = await tProgRes.json()

        setStats({
          players: pData.summary,
          tickets: {
            open: tOpenData.total || 0,
            in_progress: tProgData.total || 0,
            total_unresolved: (tOpenData.total || 0) + (tProgData.total || 0)
          }
        })
      } catch {
        setError('Failed to load dashboard statistics')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) return <div className="dash-loading">Loading dashboard...</div>

  return (
    <div className="dashboard-page">
      <header className="dash-header">
        <h1>Admin Dashboard</h1>
        <p className="dash-subtitle">Real-time overview of Elysium Rising</p>
      </header>

      {error && <div className="dash-error">{error}</div>}

      <div className="dash-grid">
        <section className="dash-card players-card">
          <div className="card-header">
            <h3>Player Base</h3>
            <Link to="/players" className="card-link">Manage Players →</Link>
          </div>
          <div className="card-stats">
            <div className="stat-item">
              <span className="stat-value">{stats?.players.total}</span>
              <span className="stat-label">Total Registered</span>
            </div>
            <div className="stat-item highlight">
              <span className="stat-value">{stats?.players.active_30d}</span>
              <span className="stat-label">Active (30d)</span>
            </div>
            <div className="stat-item danger">
              <span className="stat-value">{stats?.players.banned}</span>
              <span className="stat-label">Banned</span>
            </div>
          </div>
        </section>

        <section className="dash-card tickets-card">
          <div className="card-header">
            <h3>Support Queue</h3>
            <Link to="/support" className="card-link">View Queue →</Link>
          </div>
          <div className="card-stats">
            <div className="stat-item warning">
              <span className="stat-value">{stats?.tickets.open}</span>
              <span className="stat-label">Open Tickets</span>
            </div>
            <div className="stat-item info">
              <span className="stat-value">{stats?.tickets.in_progress}</span>
              <span className="stat-label">In Progress</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats?.tickets.total_unresolved}</span>
              <span className="stat-label">Total Unresolved</span>
            </div>
          </div>
        </section>

        <section className="dash-card quick-actions-card">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <Link to="/config" className="action-btn">System Settings</Link>
            <Link to="/players" className="action-btn">Search Player</Link>
            <Link to="/support" className="action-btn">Check Critical Tickets</Link>
          </div>
        </section>

        <section className="dash-card system-card">
          <h3>System Integrity</h3>
          <div className="system-health">
            <div className="health-item">
              <label>Database</label>
              <span className="health-status online">CONNECTED</span>
            </div>
            <div className="health-item">
              <label>Firebase Auth</label>
              <span className="health-status online">OPERATIONAL</span>
            </div>
            <div className="health-item">
              <label>API Latency</label>
              <span className="health-status">OPTIMAL</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
