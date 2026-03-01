import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import './PlayersList.css'

interface PlayerSummary {
  total: number
  banned: number
  active_30d: number
}

interface Player {
  id: number
  firebase_uid: string
  email: string
  alias: string | null
  google_display_name: string | null
  is_banned: boolean
  created_at: string
  last_login_at: string
  character_count: number
}

export default function PlayersList() {
  const [players, setPlayers] = useState<Player[]>([])
  const [summary, setSummary] = useState<PlayerSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters & Pagination
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [hasCharacter, setHasCharacter] = useState<string>('all')
  const [sortBy, setSortBy] = useState('last_login_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const limit = 20

  const fetchPlayers = useCallback(async () => {
    setLoading(true)
    try {
      let url = `/api/admin/players?limit=${limit}&offset=${page * limit}&sort_by=${sortBy}&sort_order=${sortOrder}`
      if (search) url += `&search=${encodeURIComponent(search)}`
      if (status !== 'all') url += `&status=${status}`
      if (hasCharacter !== 'all') url += `&has_character=${hasCharacter === 'yes'}`

      const res = await api.get(url)
      if (!res.ok) throw new Error('Failed to load players')
      const data = await res.json()
      setPlayers(data.players)
      setTotal(data.total)
      setSummary(data.summary)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load players')
    } finally {
      setLoading(false)
    }
  }, [page, sortBy, sortOrder, search, status, hasCharacter])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPlayers()
    }, 300) // Debounce search
    return () => clearTimeout(timer)
  }, [fetchPlayers])

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setPage(0)
  }

  return (
    <div className="players-list-page">
      <header className="page-header">
        <h2>Player Management</h2>
        {summary && (
          <div className="summary-cards">
            <div className="summary-card">
              <span className="summary-value">{summary.total}</span>
              <span className="summary-label">Total Players</span>
            </div>
            <div className="summary-card active">
              <span className="summary-value">{summary.active_30d}</span>
              <span className="summary-label">Active (30d)</span>
            </div>
            <div className="summary-card banned">
              <span className="summary-value">{summary.banned}</span>
              <span className="summary-label">Banned</span>
            </div>
          </div>
        )}
      </header>

      <section className="controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by alias, email, or UID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <div className="filters">
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="banned">Banned Only</option>
          </select>
          <select value={hasCharacter} onChange={(e) => { setHasCharacter(e.target.value); setPage(0); }}>
            <option value="all">All Players</option>
            <option value="yes">With Characters</option>
            <option value="no">No Characters</option>
          </select>
        </div>
      </section>

      {error && <div className="alert error">{error}</div>}

      <div className="table-container">
        <table className="players-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('id')}>ID {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
              <th onClick={() => handleSort('alias')}>Identity {sortBy === 'alias' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
              <th>Status</th>
              <th>Characters</th>
              <th onClick={() => handleSort('created_at')}>Registered {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
              <th onClick={() => handleSort('last_login_at')}>Last Active {sortBy === 'last_login_at' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && players.length === 0 ? (
              <tr><td colSpan={7} className="loading-cell">Loading players...</td></tr>
            ) : players.length === 0 ? (
              <tr><td colSpan={7} className="empty-cell">No players found matching filters.</td></tr>
            ) : (
              players.map(player => (
                <tr key={player.id} className={player.is_banned ? 'row-banned' : ''}>
                  <td>{player.id}</td>
                  <td>
                    <div className="player-identity">
                      <span className="player-alias">{player.alias || player.google_display_name || 'New Player'}</span>
                      <span className="player-email">{player.email}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${player.is_banned ? 'banned' : 'active'}`}>
                      {player.is_banned ? 'Banned' : 'Active'}
                    </span>
                  </td>
                  <td>{player.character_count}</td>
                  <td>{new Date(player.created_at).toLocaleDateString()}</td>
                  <td>{new Date(player.last_login_at).toLocaleString()}</td>
                  <td>
                    <Link to={`/players/${player.id}`} className="btn-view">View Detail</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="pagination">
        <button 
          disabled={page === 0 || loading} 
          onClick={() => setPage(p => p - 1)}
          className="btn-page"
        >
          Previous
        </button>
        <span className="page-info">
          Page {page + 1} of {Math.ceil(total / limit) || 1} ({total} total)
        </span>
        <button 
          disabled={(page + 1) * limit >= total || loading} 
          onClick={() => setPage(p => p + 1)}
          className="btn-page"
        >
          Next
        </button>
      </footer>
    </div>
  )
}
