import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import './ChatManager.css'

interface ChatChannel {
  id: number
  name: string
  channel_type: string
  is_active: boolean
  created_at: string
}

interface PlayerChatStatus {
  player_id: number
  chat_muted: boolean
  chat_muted_until: string | null
}

export default function ChatManager() {
  const [channels, setChannels] = useState<ChatChannel[]>([])
  const [loadingChannels, setLoadingChannels] = useState(true)
  const [togglingChannel, setTogglingChannel] = useState<number | null>(null)

  const [playerIdInput, setPlayerIdInput] = useState('')
  const [playerStatus, setPlayerStatus] = useState<PlayerChatStatus | null>(null)
  const [playerError, setPlayerError] = useState('')
  const [searchingPlayer, setSearchingPlayer] = useState(false)

  const [muteUntil, setMuteUntil] = useState('')
  const [mutingPlayer, setMutingPlayer] = useState(false)

  const [message, setMessage] = useState('')

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  /* ---- Channels ---- */

  const fetchChannels = useCallback(async () => {
    setLoadingChannels(true)
    try {
      const res = await api.get('/api/admin/chat/channels')
      if (res.ok) setChannels(await res.json())
    } catch { /* ignore */ }
    finally { setLoadingChannels(false) }
  }, [])

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  const handleToggleChannel = async (channel: ChatChannel) => {
    if (channel.channel_type === 'global') return
    setTogglingChannel(channel.id)
    try {
      const res = await api.patch(`/api/admin/chat/channels/${channel.id}`, {
        is_active: !channel.is_active,
      })
      if (res.ok) {
        setChannels(prev =>
          prev.map(c => c.id === channel.id ? { ...c, is_active: !channel.is_active } : c)
        )
        showMessage(`Channel "${channel.name}" ${!channel.is_active ? 'enabled' : 'disabled'}`)
      }
    } catch { /* ignore */ }
    finally { setTogglingChannel(null) }
  }

  /* ---- Player Search ---- */

  const handleSearchPlayer = async () => {
    const id = playerIdInput.trim()
    if (!id) return
    setSearchingPlayer(true)
    setPlayerError('')
    setPlayerStatus(null)
    setMuteUntil('')
    try {
      const res = await api.get(`/api/admin/chat/player/${encodeURIComponent(id)}/status`)
      if (res.ok) {
        setPlayerStatus(await res.json())
      } else if (res.status === 404) {
        setPlayerError('Player not found.')
      } else {
        setPlayerError(`Error: ${res.status}`)
      }
    } catch {
      setPlayerError('Network error.')
    }
    finally { setSearchingPlayer(false) }
  }

  /* ---- Mute / Unmute ---- */

  const handleToggleMute = async (muted: boolean) => {
    if (!playerStatus) return
    setMutingPlayer(true)
    try {
      const body: { player_id: number; muted: boolean; until?: string } = {
        player_id: playerStatus.player_id,
        muted,
      }
      if (muted && muteUntil) {
        body.until = muteUntil
      }
      const res = await api.post('/api/admin/chat/mute', body)
      if (res.ok) {
        const updated = await res.json()
        setPlayerStatus(updated)
        setMuteUntil('')
        showMessage(`Player #${playerStatus.player_id} ${muted ? 'muted' : 'unmuted'}`)
      }
    } catch { /* ignore */ }
    finally { setMutingPlayer(false) }
  }

  /* ---- Render ---- */

  if (loadingChannels) return <div className="cm-loading">Loading channels...</div>

  return (
    <div className="chat-manager">
      <h2>Chat Manager</h2>

      {message && <div className="cm-message">{message}</div>}

      {/* ---- Channels Section ---- */}
      <div className="cm-card">
        <h3>Channels</h3>
        {channels.length === 0 ? (
          <div className="cm-empty">No channels found.</div>
        ) : (
          <table className="cm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Created</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {channels.map(ch => (
                <tr key={ch.id}>
                  <td className="cm-mono">{ch.id}</td>
                  <td>{ch.name}</td>
                  <td className="cm-mono">{ch.channel_type}</td>
                  <td className="cm-date">
                    {ch.created_at ? new Date(ch.created_at).toLocaleDateString() : '\u2014'}
                  </td>
                  <td>
                    <span className={`cm-status ${ch.is_active ? 'cm-status--on' : 'cm-status--off'}`}>
                      {ch.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td>
                    {ch.channel_type === 'global' ? (
                      <span className="cm-hint">Cannot disable</span>
                    ) : (
                      <button
                        className={`cm-btn ${ch.is_active ? 'cm-btn--danger' : 'cm-btn--save'}`}
                        disabled={togglingChannel === ch.id}
                        onClick={() => handleToggleChannel(ch)}
                      >
                        {togglingChannel === ch.id
                          ? 'Saving...'
                          : ch.is_active ? 'Disable' : 'Enable'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ---- Player Moderation Section ---- */}
      <div className="cm-card">
        <h3>Player Moderation</h3>

        <div className="cm-search-row">
          <input
            className="cm-input"
            type="text"
            placeholder="Player ID..."
            value={playerIdInput}
            onChange={e => setPlayerIdInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearchPlayer() }}
          />
          <button
            className="cm-btn cm-btn--primary"
            onClick={handleSearchPlayer}
            disabled={searchingPlayer || !playerIdInput.trim()}
          >
            {searchingPlayer ? 'Searching...' : 'Search'}
          </button>
        </div>

        {playerError && <div className="cm-error">{playerError}</div>}

        {playerStatus && (
          <div className="cm-player-result">
            <div className="cm-player-info">
              <span className="cm-label">Player ID:</span>
              <span className="cm-mono">{playerStatus.player_id}</span>
            </div>
            <div className="cm-player-info">
              <span className="cm-label">Chat Status:</span>
              <span className={`cm-status ${playerStatus.chat_muted ? 'cm-status--off' : 'cm-status--on'}`}>
                {playerStatus.chat_muted ? 'Muted' : 'Active'}
              </span>
            </div>
            {playerStatus.chat_muted && playerStatus.chat_muted_until && (
              <div className="cm-player-info">
                <span className="cm-label">Muted Until:</span>
                <span className="cm-date">
                  {new Date(playerStatus.chat_muted_until).toLocaleString()}
                </span>
              </div>
            )}

            <div className="cm-mute-controls">
              {playerStatus.chat_muted ? (
                <button
                  className="cm-btn cm-btn--save"
                  onClick={() => handleToggleMute(false)}
                  disabled={mutingPlayer}
                >
                  {mutingPlayer ? 'Unmuting...' : 'Unmute Player'}
                </button>
              ) : (
                <>
                  <label className="cm-mute-label">
                    Mute Until (optional):
                    <input
                      className="cm-input cm-input--datetime"
                      type="datetime-local"
                      value={muteUntil}
                      onChange={e => setMuteUntil(e.target.value)}
                    />
                  </label>
                  <button
                    className="cm-btn cm-btn--danger"
                    onClick={() => handleToggleMute(true)}
                    disabled={mutingPlayer}
                  >
                    {mutingPlayer ? 'Muting...' : 'Mute Player'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
