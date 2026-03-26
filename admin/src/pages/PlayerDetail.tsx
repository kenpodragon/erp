import { useParams, Link } from 'react-router-dom'
import PlayerFinanceWidget from './finance/PlayerFinanceWidget'
import CharacterEditorModal from '../components/admin/CharacterEditorModal'
import ItemCraftModal from '../components/admin/ItemCraftModal'
import ItemEditorModal from '../components/admin/ItemEditorModal'
import EssenceAdjustModal from '../components/admin/EssenceAdjustModal'
import ProgressionEditorModal from '../components/admin/ProgressionEditorModal'
import SkillEditorModal from '../components/admin/SkillEditorModal'
import ActivityTimelineModal from '../components/admin/ActivityTimelineModal'
import PlayerCharacterCard from './PlayerCharacterCard'
import { usePlayerData } from './usePlayerData'
import './PlayerDetail.css'

export default function PlayerDetail() {
  const { id } = useParams<{ id: string }>()
  const d = usePlayerData(id)

  if (d.loading) return <div className="detail-loading">Loading player detail...</div>
  if (d.error) return <div className="detail-error">Error: {d.error}</div>
  if (!d.player) return <div className="detail-error">Player not found.</div>

  const player = d.player

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
          <button className="btn-secondary" onClick={() => d.setShowEditAlias(true)}>Edit Alias</button>
          <button className="btn-secondary" onClick={d.handleLogout} disabled={d.actionLoading}>Force Logout</button>
          <button className="btn-secondary btn-timeline" onClick={() => d.setShowTimeline(true)}>Activity Timeline</button>
          {player.is_banned ? (
            <button className="btn-unban" onClick={d.handleUnban} disabled={d.actionLoading}>Unban Player</button>
          ) : (
            <button className="btn-ban" onClick={() => d.setShowBanModal(true)}>Ban Player</button>
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
            {d.me?.is_owner && (
              <div className="info-item permissions-block">
                <label>Permissions (Owner Only)</label>
                <div className="permission-toggles">
                  <label className="permission-toggle">
                    <input
                      type="checkbox"
                      checked={player.is_system_admin}
                      disabled={d.actionLoading || player.is_owner}
                      onChange={(e) => d.togglePermission('is_system_admin', e.target.checked)}
                    />
                    <span>System Admin</span>
                  </label>
                  <label className="permission-toggle">
                    <input
                      type="checkbox"
                      checked={player.is_game_admin}
                      disabled={d.actionLoading || player.is_owner}
                      onChange={(e) => d.togglePermission('is_game_admin', e.target.checked)}
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
          {d.characters.length === 0 ? (
            <p className="empty-msg">No characters created yet.</p>
          ) : (
            <div className="character-list">
              {d.characters.map(char => (
                <PlayerCharacterCard
                  key={char.id}
                  char={char}
                  inventory={d.inventoryData[char.id]}
                  isExpanded={!!d.expandedInventory[char.id]}
                  essence={d.essenceData[char.id]}
                  onToggleInventory={d.toggleInventory}
                  onEditCharacter={d.setEditCharId}
                  onCraftItem={(charId, level) => { d.setCraftCharId(charId); d.setCraftCharLevel(level) }}
                  onAdjustEssence={(charId, name) => { d.setEssenceCharId(charId); d.setEssenceCharName(name) }}
                  onEditProgression={d.openProgressionEditor}
                  onEditSkills={(charId, name, cls) => { d.setSkillsCharId(charId); d.setSkillsCharName(name); d.setSkillsClassName(cls) }}
                  onEditItem={d.openItemEditor}
                />
              ))}
            </div>
          )}
        </section>

        <section className="detail-section info-card tickets-section">
          <h3>Recent Support Tickets</h3>
          {d.tickets.length === 0 ? (
            <p className="empty-msg">No support tickets found.</p>
          ) : (
            <div className="ticket-list-mini">
              {d.tickets.map(ticket => (
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
          onClick={() => d.setShowFinance(f => !f)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          {d.showFinance ? '▾' : '▸'} Finance
        </h3>
        {d.showFinance && (
          <PlayerFinanceWidget playerId={Number(id)} />
        )}
      </section>

      {/* Ban Modal */}
      {d.showBanModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Ban Player: {player.alias || player.email}</h3>
            <p>Reason for ban (required, min 10 chars):</p>
            <textarea
              value={d.banReason}
              onChange={(e) => d.setBanReason(e.target.value)}
              placeholder="Enter reason for account suspension..."
              rows={4}
            />
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => d.setShowBanModal(false)}>Cancel</button>
              <button
                className="btn-confirm-ban"
                onClick={d.handleBan}
                disabled={d.banReason.trim().length < 10 || d.actionLoading}
              >
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Alias Modal */}
      {d.showEditAlias && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Update Player Alias</h3>
            <p>Alias for {player.email}:</p>
            <input
              type="text"
              value={d.newAlias}
              onChange={(e) => d.setNewAlias(e.target.value)}
              placeholder="Enter new alias..."
            />
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => d.setShowEditAlias(false)}>Cancel</button>
              <button
                className="btn-confirm-save"
                onClick={d.handleUpdateAlias}
                disabled={d.actionLoading}
              >
                Save Alias
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Character Modals */}
      {d.editCharId !== null && (
        <CharacterEditorModal
          characterId={d.editCharId}
          onClose={() => d.setEditCharId(null)}
          onSave={() => { d.setEditCharId(null); d.handleModalSave() }}
        />
      )}

      {d.craftCharId !== null && (
        <ItemCraftModal
          characterId={d.craftCharId}
          characterLevel={d.craftCharLevel}
          onClose={() => d.setCraftCharId(null)}
          onSave={() => { d.setCraftCharId(null); d.handleModalSave() }}
        />
      )}

      {d.editItemId !== null && d.editItemCharId !== null && (
        <ItemEditorModal
          itemId={d.editItemId}
          characterId={d.editItemCharId}
          isArtifact={d.editItemIsArtifact}
          artifactType={d.editItemArtifactType}
          onClose={() => { d.setEditItemId(null); d.setEditItemCharId(null) }}
          onSave={() => { d.setEditItemId(null); d.setEditItemCharId(null); d.handleModalSave() }}
        />
      )}

      {d.essenceCharId !== null && (
        <EssenceAdjustModal
          characterId={d.essenceCharId}
          characterName={d.essenceCharName}
          onClose={() => d.setEssenceCharId(null)}
          onSave={() => { d.setEssenceCharId(null); d.handleModalSave() }}
        />
      )}

      {d.progressionCharId !== null && (
        <ProgressionEditorModal
          characterId={d.progressionCharId}
          characterName={d.progressionCharName}
          currentPosition={d.progressionCurrentPos}
          onClose={() => d.setProgressionCharId(null)}
          onSave={() => { d.setProgressionCharId(null); d.handleModalSave() }}
        />
      )}

      {d.skillsCharId !== null && (
        <SkillEditorModal
          characterId={d.skillsCharId}
          characterName={d.skillsCharName}
          className={d.skillsClassName}
          onClose={() => d.setSkillsCharId(null)}
          onSave={() => { d.setSkillsCharId(null); d.handleModalSave() }}
        />
      )}

      {d.showTimeline && (
        <ActivityTimelineModal
          playerId={Number(id)}
          playerAlias={player.alias || player.google_display_name || player.email}
          onClose={() => d.setShowTimeline(false)}
        />
      )}
    </div>
  )
}
