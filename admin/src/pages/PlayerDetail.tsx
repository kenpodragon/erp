import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import PlayerFinanceWidget from './finance/PlayerFinanceWidget'
import './PlayerDetail.css'

interface Player {
  id: number
  firebase_uid: string
  email: string
  alias: string | null
  google_display_name: string | null
  google_avatar_url: string | null
  custom_avatar_url: string | null
  avatar_preset_key: string | null
  is_banned: boolean
  banned_at: string | null
  banned_by: string | null
  ban_reason: string | null
  sessions_invalid_before: string | null
  created_at: string
  last_login_at: string
  terms_accepted_at: string | null
  is_owner: boolean
  is_system_admin: boolean
  is_game_admin: boolean
}

interface MeInfo {
  email: string
  is_owner: boolean
}

interface Character {
  id: number
  character_name: string
  level: number
  class: {
    name: string
    sprite_key: string
  }
  strength: number
  agility: number
  intelligence: number
  created_at: string
  last_played_at: string
}

interface Ticket {
  id: number
  subject: string
  category: string
  status: string
  priority: string
  created_at: string
}

export default function PlayerDetail() {
  const { id } = useParams<{ id: string }>()
  
  const [player, setPlayer] = useState<Player | null>(null)
  const [me, setMe] = useState<MeInfo | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  
  // Modals
  const [showBanModal, setShowBanModal] = useState(false)
  const [banReason, setBanReason] = useState('')
  const [showEditAlias, setShowEditAlias] = useState(false)
  const [newAlias, setNewAlias] = useState('')
  const [showFinance, setShowFinance] = useState(true)

  const fetchDetail = useCallback(async () => {
    try {
      // Fetch current user info to check for owner status
      const meRes = await api.get('/api/admin/me')
      if (meRes.ok) {
        const meData = await meRes.json()
        setMe(meData)
      }

      const res = await api.get(`/api/admin/players/${id}`)
      if (!res.ok) throw new Error('Failed to load player detail')
      const data = await res.json()
      setPlayer(data.player)
      setCharacters(data.characters)
      setTickets(data.recent_tickets)
      setNewAlias(data.player.alias || '')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load player detail')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const handleBan = async () => {
    if (!banReason.trim()) return
    setActionLoading(true)
    try {
      const res = await api.post(`/api/admin/players/${id}/ban`, { reason: banReason })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to ban player')
      }
      setShowBanModal(false)
      setBanReason('')
      await fetchDetail()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to ban player')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnban = async () => {
    if (!confirm('Are you sure you want to unban this player?')) return
    setActionLoading(true)
    try {
      const res = await api.post(`/api/admin/players/${id}/unban`)
      if (!res.ok) throw new Error('Failed to unban player')
      await fetchDetail()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to unban player')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLogout = async () => {
    if (!confirm('Force logout will invalidate all current session tokens for this player. Continue?')) return
    setActionLoading(true)
    try {
      const res = await api.post(`/api/admin/players/${id}/logout`)
      if (!res.ok) throw new Error('Failed to force logout')
      alert('Player sessions invalidated.')
      await fetchDetail()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to force logout')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateAlias = async () => {
    setActionLoading(true)
    try {
      const res = await api.patch(`/api/admin/players/${id}`, { alias: newAlias || null })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to update alias')
      }
      setShowEditAlias(false)
      await fetchDetail()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update alias')
    } finally {
      setActionLoading(false)
    }
  }

  const togglePermission = async (field: 'is_system_admin' | 'is_game_admin', value: boolean) => {
    if (!me?.is_owner) return
    setActionLoading(true)
    try {
      const res = await api.patch(`/api/admin/players/${id}/permissions`, { [field]: value })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to update permissions')
      }
      await fetchDetail()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update permissions')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <div className="detail-loading">Loading player detail...</div>
  if (error) return <div className="detail-error">Error: {error}</div>
  if (!player) return <div className="detail-error">Player not found.</div>

  return (
    <div className="player-detail-page">
      <div className="breadcrumb">
        <Link to="/players">← Back to Player List</Link>
      </div>

      <header className="detail-header">
        <div className="header-main">
          <div className="avatar-container">
            <img 
              src={player.custom_avatar_url || player.google_avatar_url || '/default-avatar.png'} 
              alt="Avatar" 
              className="player-avatar"
            />
          </div>
          <div className="identity-block">
            <h2>{player.alias || player.google_display_name || 'New Player'}</h2>
            <div className="sub-info">
              <span className="email">{player.email}</span>
              <span className="uid">UID: {player.firebase_uid}</span>
            </div>
            <div className="status-row">
              <span className={`status-badge ${player.is_banned ? 'banned' : 'active'}`}>
                {player.is_banned ? 'Banned' : 'Active'}
              </span>
              {player.is_owner && <span className="status-badge owner">OWNER</span>}
              {player.is_system_admin && <span className="status-badge sys-admin">SYS ADMIN</span>}
              {player.is_game_admin && <span className="status-badge game-admin">GAME ADMIN</span>}
              {player.is_banned && <span className="ban-reason-inline">Reason: {player.ban_reason}</span>}
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => setShowEditAlias(true)}>Edit Alias</button>
          <button className="btn-secondary" onClick={handleLogout} disabled={actionLoading}>Force Logout</button>
          {player.is_banned ? (
            <button className="btn-unban" onClick={handleUnban} disabled={actionLoading}>Unban Player</button>
          ) : (
            <button className="btn-ban" onClick={() => setShowBanModal(true)}>Ban Player</button>
          )}
        </div>
      </header>

      <div className="detail-grid">
        <section className="detail-section info-card">
          <h3>Account Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Player ID</label>
              <span>{player.id}</span>
            </div>
            {me?.is_owner && (
              <div className="info-item permissions-block">
                <label>Permissions (Owner Only)</label>
                <div className="permission-toggles">
                  <label className="permission-toggle">
                    <input 
                      type="checkbox" 
                      checked={player.is_system_admin} 
                      disabled={actionLoading || player.is_owner}
                      onChange={(e) => togglePermission('is_system_admin', e.target.checked)}
                    />
                    <span>System Admin</span>
                  </label>
                  <label className="permission-toggle">
                    <input 
                      type="checkbox" 
                      checked={player.is_game_admin} 
                      disabled={actionLoading || player.is_owner}
                      onChange={(e) => togglePermission('is_game_admin', e.target.checked)}
                    />
                    <span>Game Admin</span>
                  </label>
                </div>
                {player.is_owner && <p className="hint">Owner permissions cannot be changed via UI.</p>}
              </div>
            )}
            <div className="info-item">
              <label>Registration Date</label>
              <span>{new Date(player.created_at).toLocaleString()}</span>
            </div>
            <div className="info-item">
              <label>Last Login</label>
              <span>{new Date(player.last_login_at).toLocaleString()}</span>
            </div>
            <div className="info-item">
              <label>Terms Accepted</label>
              <span>{player.terms_accepted_at ? new Date(player.terms_accepted_at).toLocaleString() : 'Not Yet'}</span>
            </div>
            <div className="info-item">
              <label>Session Invalidation</label>
              <span>{player.sessions_invalid_before ? new Date(player.sessions_invalid_before).toLocaleString() : 'None'}</span>
            </div>
          </div>
        </section>

        <section className="detail-section info-card">
          <h3>Character(s)</h3>
          {characters.length === 0 ? (
            <p className="empty-msg">No characters created yet.</p>
          ) : (
            <div className="character-list">
              {characters.map(char => (
                <div key={char.id} className="character-card">
                  <div className="char-header">
                    <span className="char-name">{char.character_name}</span>
                    <span className="char-level">Level {char.level}</span>
                  </div>
                  <div className="char-class">{char.class?.name || 'Unknown Class'}</div>
                  <div className="char-stats">
                    <span>STR: {char.strength}</span>
                    <span>AGI: {char.agility}</span>
                    <span>INT: {char.intelligence}</span>
                  </div>
                  <div className="char-footer">
                    Created: {new Date(char.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="detail-section info-card tickets-section">
          <h3>Recent Support Tickets</h3>
          {tickets.length === 0 ? (
            <p className="empty-msg">No support tickets found.</p>
          ) : (
            <div className="ticket-list-mini">
              {tickets.map(ticket => (
                <Link to={`/support/${ticket.id}`} key={ticket.id} className="ticket-item-mini">
                  <div className="ticket-meta-mini">
                    <span className={`priority-dot ${ticket.priority}`}></span>
                    <span className="ticket-subject">{ticket.subject}</span>
                  </div>
                  <div className="ticket-status-mini">
                    <span className={`status-badge-mini ${ticket.status}`}>{ticket.status}</span>
                    <span className="ticket-date">{new Date(ticket.created_at).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
              <Link to="/support" className="view-all-link">View All Tickets →</Link>
            </div>
          )}
        </section>
      </div>

      {/* Finance Section */}
      <section className="detail-section info-card finance-section">
        <h3
          className="collapsible-header"
          onClick={() => setShowFinance(f => !f)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          {showFinance ? '▾' : '▸'} Finance
        </h3>
        {showFinance && (
          <PlayerFinanceWidget playerId={Number(id)} />
        )}
      </section>

      {/* Ban Modal */}
      {showBanModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Ban Player: {player.alias || player.email}</h3>
            <p>Reason for ban (required, min 10 chars):</p>
            <textarea 
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Enter reason for account suspension..."
              rows={4}
            />
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowBanModal(false)}>Cancel</button>
              <button 
                className="btn-confirm-ban" 
                onClick={handleBan}
                disabled={banReason.trim().length < 10 || actionLoading}
              >
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Alias Modal */}
      {showEditAlias && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Update Player Alias</h3>
            <p>Alias for {player.email}:</p>
            <input 
              type="text"
              value={newAlias}
              onChange={(e) => setNewAlias(e.target.value)}
              placeholder="Enter new alias..."
            />
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowEditAlias(false)}>Cancel</button>
              <button 
                className="btn-confirm-save" 
                onClick={handleUpdateAlias}
                disabled={actionLoading}
              >
                Save Alias
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
