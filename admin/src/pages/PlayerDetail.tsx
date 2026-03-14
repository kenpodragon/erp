import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import PlayerFinanceWidget from './finance/PlayerFinanceWidget'
import CharacterEditorModal from '../components/admin/CharacterEditorModal'
import ItemCraftModal from '../components/admin/ItemCraftModal'
import ItemEditorModal from '../components/admin/ItemEditorModal'
import EssenceAdjustModal from '../components/admin/EssenceAdjustModal'
import ProgressionEditorModal from '../components/admin/ProgressionEditorModal'
import SkillEditorModal from '../components/admin/SkillEditorModal'
import ActivityTimelineModal from '../components/admin/ActivityTimelineModal'
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
  character_xp: number
  class_id: number
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

interface InventoryEntry {
  inventory_id: number
  item_id: number
  name: string
  item_type: string
  rarity: string
  base_stats: Record<string, number>
  item_level: number
  item_code: string
  gear_slot_id: number
  is_equipped: boolean
  equipped_slot: string | null
}

interface ArtifactEntry {
  id: number
  name: string
  rarity: string
  artifact_type: 'generated' | 'curated'
  artifact_code: string
  stat_bonuses: Record<string, number>
  curated_artifact_id: number | null
  icon_sprite_key: string
}

interface CharacterInventory {
  equipped: InventoryEntry[]
  bag: InventoryEntry[]
  bag_count: number
  bag_capacity: number
  artifacts: ArtifactEntry[]
}

interface EssenceInfo {
  current_balance: number
}

interface ProgressionInfo {
  book: number
  chapter: number
  scene: number
}

const RARITY_COLORS: Record<string, string> = {
  common: '#aaa',
  uncommon: '#4caf50',
  rare: '#2196f3',
  epic: '#e040fb',
  cosmic: '#ffd700',
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

  // Inventory data per character
  const [inventoryData, setInventoryData] = useState<Record<number, CharacterInventory>>({})
  const [expandedInventory, setExpandedInventory] = useState<Record<number, boolean>>({})
  const [essenceData, setEssenceData] = useState<Record<number, number>>({})
  const [progressionData, setProgressionData] = useState<Record<number, ProgressionInfo>>({})

  // Existing modals
  const [showBanModal, setShowBanModal] = useState(false)
  const [banReason, setBanReason] = useState('')
  const [showEditAlias, setShowEditAlias] = useState(false)
  const [newAlias, setNewAlias] = useState('')
  const [showFinance, setShowFinance] = useState(true)

  // 5.1 Modals
  const [editCharId, setEditCharId] = useState<number | null>(null)
  const [craftCharId, setCraftCharId] = useState<number | null>(null)
  const [craftCharLevel, setCraftCharLevel] = useState(1)
  const [editItemId, setEditItemId] = useState<number | null>(null)
  const [editItemCharId, setEditItemCharId] = useState<number | null>(null)
  const [editItemIsArtifact, setEditItemIsArtifact] = useState(false)
  const [editItemArtifactType, setEditItemArtifactType] = useState<'generated' | 'curated' | undefined>()
  const [essenceCharId, setEssenceCharId] = useState<number | null>(null)
  const [essenceCharName, setEssenceCharName] = useState('')
  const [progressionCharId, setProgressionCharId] = useState<number | null>(null)
  const [progressionCharName, setProgressionCharName] = useState('')
  const [progressionCurrentPos, setProgressionCurrentPos] = useState<ProgressionInfo>({ book: 1, chapter: 1, scene: 1 })
  const [skillsCharId, setSkillsCharId] = useState<number | null>(null)
  const [skillsCharName, setSkillsCharName] = useState('')
  const [skillsClassName, setSkillsClassName] = useState('')
  const [showTimeline, setShowTimeline] = useState(false)

  const fetchDetail = useCallback(async () => {
    try {
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

  const fetchCharacterInventory = async (characterId: number) => {
    try {
      const res = await api.get(`/api/admin/characters/${characterId}/inventory`)
      if (res.ok) {
        const data = await res.json()
        setInventoryData(prev => ({ ...prev, [characterId]: data }))
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err)
    }
  }

  const fetchCharacterEssence = async (characterId: number) => {
    try {
      const res = await api.get(`/api/admin/characters/${characterId}/essence/history?page_size=1`)
      if (res.ok) {
        const data = await res.json()
        setEssenceData(prev => ({ ...prev, [characterId]: data.current_balance || 0 }))
      }
    } catch (err) {
      console.error('Failed to fetch essence:', err)
    }
  }

  // Load enrichment data for each character
  useEffect(() => {
    characters.forEach(char => {
      fetchCharacterEssence(char.id)
    })
  }, [characters])

  const toggleInventory = (characterId: number) => {
    const isExpanded = expandedInventory[characterId]
    if (!isExpanded && !inventoryData[characterId]) {
      fetchCharacterInventory(characterId)
    }
    setExpandedInventory(prev => ({ ...prev, [characterId]: !isExpanded }))
  }

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

  const handleModalSave = async () => {
    await fetchDetail()
    // Refresh inventory data for any open characters
    for (const charId of Object.keys(inventoryData)) {
      fetchCharacterInventory(Number(charId))
    }
    for (const char of characters) {
      fetchCharacterEssence(char.id)
    }
  }

  const openItemEditor = (itemId: number, characterId: number, isArtifact: boolean, artifactType?: 'generated' | 'curated') => {
    setEditItemId(itemId)
    setEditItemCharId(characterId)
    setEditItemIsArtifact(isArtifact)
    setEditItemArtifactType(artifactType)
  }

  const openProgressionEditor = (char: Character) => {
    setProgressionCharId(char.id)
    setProgressionCharName(char.character_name)
    setProgressionCurrentPos(progressionData[char.id] || { book: 1, chapter: 1, scene: 1 })
  }

  if (loading) return <div className="detail-loading">Loading player detail...</div>
  if (error) return <div className="detail-error">Error: {error}</div>
  if (!player) return <div className="detail-error">Player not found.</div>

  return (
    <div className="player-detail-page">
      <div className="breadcrumb">
        <Link to="/players">&larr; Back to Player List</Link>
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
          <button className="btn-secondary btn-timeline" onClick={() => setShowTimeline(true)}>Activity Timeline</button>
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

        <section className="detail-section info-card characters-section">
          <h3>Character(s)</h3>
          {characters.length === 0 ? (
            <p className="empty-msg">No characters created yet.</p>
          ) : (
            <div className="character-list">
              {characters.map(char => {
                const inv = inventoryData[char.id]
                const isExpanded = expandedInventory[char.id]
                const essence = essenceData[char.id]

                return (
                  <div key={char.id} className="character-card enhanced">
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
                    {essence !== undefined && (
                      <div className="char-essence">
                        Essence: {essence.toLocaleString()}
                      </div>
                    )}
                    <div className="char-footer">
                      Created: {new Date(char.created_at).toLocaleDateString()}
                    </div>

                    {/* Action Buttons */}
                    <div className="char-actions">
                      <button className="btn-char-action" onClick={() => setEditCharId(char.id)}>Edit Character</button>
                      <button className="btn-char-action" onClick={() => { setCraftCharId(char.id); setCraftCharLevel(char.level) }}>Craft Item</button>
                      <button className="btn-char-action" onClick={() => { setEssenceCharId(char.id); setEssenceCharName(char.character_name) }}>Adjust Essence</button>
                      <button className="btn-char-action" onClick={() => openProgressionEditor(char)}>Edit Progression</button>
                      <button className="btn-char-action" onClick={() => { setSkillsCharId(char.id); setSkillsCharName(char.character_name); setSkillsClassName(char.class?.name || '') }}>Edit Skills</button>
                    </div>

                    {/* Collapsible Inventory */}
                    <div className="char-inventory-toggle" onClick={() => toggleInventory(char.id)}>
                      {isExpanded ? '▾' : '▸'} Inventory {inv ? `(${inv.bag_count}/${inv.bag_capacity} bag, ${inv.artifacts.length} artifacts)` : ''}
                    </div>

                    {isExpanded && inv && (
                      <div className="char-inventory">
                        {/* Equipped Items */}
                        <div className="inv-section">
                          <div className="inv-section-label">Equipped</div>
                          {inv.equipped.length === 0 ? (
                            <div className="inv-empty">No items equipped</div>
                          ) : (
                            inv.equipped.map(item => (
                              <div
                                key={item.inventory_id}
                                className="inv-item clickable"
                                onClick={() => openItemEditor(item.item_id, char.id, false)}
                                style={{ borderLeftColor: RARITY_COLORS[item.rarity] || '#aaa' }}
                              >
                                <span className="inv-item-name" style={{ color: RARITY_COLORS[item.rarity] }}>{item.name}</span>
                                <span className="inv-item-slot">{item.equipped_slot}</span>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Bag Items */}
                        <div className="inv-section">
                          <div className="inv-section-label">Bag ({inv.bag_count}/{inv.bag_capacity})</div>
                          {inv.bag.length === 0 ? (
                            <div className="inv-empty">Bag is empty</div>
                          ) : (
                            inv.bag.map(item => (
                              <div
                                key={item.inventory_id}
                                className="inv-item clickable"
                                onClick={() => openItemEditor(item.item_id, char.id, false)}
                                style={{ borderLeftColor: RARITY_COLORS[item.rarity] || '#aaa' }}
                              >
                                <span className="inv-item-name" style={{ color: RARITY_COLORS[item.rarity] }}>{item.name}</span>
                                <span className="inv-item-rarity">{item.rarity}</span>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Artifacts */}
                        <div className="inv-section">
                          <div className="inv-section-label">Artifacts ({inv.artifacts.length})</div>
                          {inv.artifacts.length === 0 ? (
                            <div className="inv-empty">No artifacts</div>
                          ) : (
                            inv.artifacts.map(art => (
                              <div
                                key={art.id}
                                className="inv-item clickable"
                                onClick={() => openItemEditor(art.id, char.id, true, art.artifact_type)}
                                style={{ borderLeftColor: RARITY_COLORS[art.rarity] || '#aaa' }}
                              >
                                <span className="inv-item-name" style={{ color: RARITY_COLORS[art.rarity] }}>{art.name}</span>
                                <span className="inv-item-rarity">{art.rarity}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
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
              <Link to="/support" className="view-all-link">View All Tickets &rarr;</Link>
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

      {/* 5.1 Modals */}
      {editCharId !== null && (
        <CharacterEditorModal
          characterId={editCharId}
          onClose={() => setEditCharId(null)}
          onSave={() => { setEditCharId(null); handleModalSave() }}
        />
      )}

      {craftCharId !== null && (
        <ItemCraftModal
          characterId={craftCharId}
          characterLevel={craftCharLevel}
          onClose={() => setCraftCharId(null)}
          onSave={() => { setCraftCharId(null); handleModalSave() }}
        />
      )}

      {editItemId !== null && editItemCharId !== null && (
        <ItemEditorModal
          itemId={editItemId}
          characterId={editItemCharId}
          isArtifact={editItemIsArtifact}
          artifactType={editItemArtifactType}
          onClose={() => { setEditItemId(null); setEditItemCharId(null) }}
          onSave={() => { setEditItemId(null); setEditItemCharId(null); handleModalSave() }}
        />
      )}

      {essenceCharId !== null && (
        <EssenceAdjustModal
          characterId={essenceCharId}
          characterName={essenceCharName}
          onClose={() => setEssenceCharId(null)}
          onSave={() => { setEssenceCharId(null); handleModalSave() }}
        />
      )}

      {progressionCharId !== null && (
        <ProgressionEditorModal
          characterId={progressionCharId}
          characterName={progressionCharName}
          currentPosition={progressionCurrentPos}
          onClose={() => setProgressionCharId(null)}
          onSave={() => { setProgressionCharId(null); handleModalSave() }}
        />
      )}

      {skillsCharId !== null && (
        <SkillEditorModal
          characterId={skillsCharId}
          characterName={skillsCharName}
          className={skillsClassName}
          onClose={() => setSkillsCharId(null)}
          onSave={() => { setSkillsCharId(null); handleModalSave() }}
        />
      )}

      {showTimeline && (
        <ActivityTimelineModal
          playerId={Number(id)}
          playerAlias={player.alias || player.google_display_name || player.email}
          onClose={() => setShowTimeline(false)}
        />
      )}
    </div>
  )
}
