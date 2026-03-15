import { useState, useEffect } from 'react'
import { api } from '../api'
import './ServerConfig.css'

interface ConfigEntry {
  key: string
  value: string
  value_type: string
  description: string | null
  default_value: string | null
  updated_at: string | null
  updated_by: string | null
}

type GroupedConfig = Record<string, ConfigEntry[]>

interface BypassCharacter {
  id: number
  character_name: string
  class_id: number
  level: number
}

interface BypassPlayer {
  id: number
  email: string
  alias: string | null
  is_banned: boolean
  characters: BypassCharacter[]
}

interface BypassStatus {
  env_allows_bypass: boolean
  db_bypass_enabled: boolean
  bypass_active: boolean
  bypass_player_id: string
  bypass_player: BypassPlayer | null
  available_classes: { id: number; name: string }[]
}

/* ── Auth Bypass Panel ── */
function AuthBypassPanel() {
  const [status, setStatus] = useState<BypassStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [newAlias, setNewAlias] = useState('TestPlayer')
  const [newCharName, setNewCharName] = useState('TestHero')
  const [newClassId, setNewClassId] = useState(1)
  const [playerIdInput, setPlayerIdInput] = useState('')

  const fetchStatus = async () => {
    try {
      const res = await api.get('/api/admin/config/auth-bypass/status')
      if (!res.ok) throw new Error('Failed to fetch bypass status')
      const data: BypassStatus = await res.json()
      setStatus(data)
      setPlayerIdInput(data.bypass_player_id || '')
      if (data.available_classes.length > 0) {
        setNewClassId(data.available_classes[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStatus() }, [])

  const handleCreateTestPlayer = async () => {
    setCreating(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await api.post('/api/admin/config/auth-bypass/create-test-player', {
        alias: newAlias,
        class_id: newClassId,
        character_name: newCharName,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to create test player')
      }
      const data = await res.json()
      setSuccessMsg(data.message)
      await fetchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setCreating(false)
    }
  }

  const handleSetPlayer = async () => {
    if (!playerIdInput) return
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await api.post(`/api/admin/config/auth-bypass/set-player/${playerIdInput}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed')
      }
      setSuccessMsg(`Bypass target set to player ${playerIdInput}`)
      await fetchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
  }

  const handleToggleBypass = async (enabled: boolean) => {
    setError(null)
    try {
      const res = await api.patch('/api/admin/config/ops.auth_bypass_enabled', {
        value: enabled ? 'true' : 'false',
      })
      if (!res.ok) throw new Error('Failed to toggle')
      await fetchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
  }

  if (loading) return <div style={{ padding: '1rem', color: '#888' }}>Loading bypass status...</div>

  if (!status) return null

  // If .env doesn't allow bypass, show nothing
  if (!status.env_allows_bypass) {
    return (
      <div style={{ padding: '1rem', background: '#1a1a2e', borderRadius: '8px', border: '1px solid #333', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem', color: '#666' }}>Auth Bypass</h3>
        <p style={{ color: '#666', fontSize: '0.85rem', margin: 0 }}>
          Disabled. Set <code style={{ color: '#888' }}>ALLOW_AUTH_BYPASS=true</code> in <code style={{ color: '#888' }}>backend/.env</code> and restart the server to enable.
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '1rem', background: '#1a1a2e', borderRadius: '8px', border: `1px solid ${status.bypass_active ? '#ff9800' : '#333'}`, marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: status.bypass_active ? '#ff9800' : '#aaa' }}>
          Auth Bypass {status.bypass_active ? '(ACTIVE)' : ''}
        </h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={status.db_bypass_enabled}
            onChange={(e) => handleToggleBypass(e.target.checked)}
          />
          <span style={{ color: '#ccc', fontSize: '0.85rem' }}>
            {status.db_bypass_enabled ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      </div>

      {error && <div style={{ color: '#ff4444', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</div>}
      {successMsg && <div style={{ color: '#4caf50', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{successMsg}</div>}

      <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '1rem' }}>
        .env gate: <span style={{ color: '#4caf50' }}>ALLOW_AUTH_BYPASS=true</span> |
        DB toggle: <span style={{ color: status.db_bypass_enabled ? '#4caf50' : '#ff4444' }}>{status.db_bypass_enabled ? 'true' : 'false'}</span> |
        Status: <span style={{ color: status.bypass_active ? '#ff9800' : '#666', fontWeight: 600 }}>{status.bypass_active ? 'ACTIVE' : 'INACTIVE'}</span>
      </div>

      {/* Current bypass player */}
      {status.bypass_player && (
        <div style={{ background: '#111', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #333' }}>
          <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>Current Bypass Player</div>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div>
              <span style={{ color: '#e0e0e0', fontWeight: 600 }}>{status.bypass_player.alias || 'No Alias'}</span>
              <span style={{ color: '#666', fontSize: '0.8rem', marginLeft: '0.5rem' }}>ID: {status.bypass_player.id}</span>
            </div>
            <div style={{ color: '#888', fontSize: '0.8rem' }}>{status.bypass_player.email}</div>
            {status.bypass_player.characters.length > 0 && (
              <div style={{ color: '#888', fontSize: '0.8rem' }}>
                Characters: {status.bypass_player.characters.map(c => `${c.character_name} (L${c.level})`).join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Set existing player */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
        <input
          type="number"
          value={playerIdInput}
          onChange={(e) => setPlayerIdInput(e.target.value)}
          placeholder="Player ID"
          style={{ width: '100px', padding: '6px 10px', background: '#111', border: '1px solid #333', borderRadius: '4px', color: '#e0e0e0', fontSize: '0.85rem' }}
        />
        <button
          onClick={handleSetPlayer}
          disabled={!playerIdInput}
          style={{ padding: '6px 12px', background: '#333', border: '1px solid #555', borderRadius: '4px', color: '#e0e0e0', cursor: 'pointer', fontSize: '0.85rem' }}
        >
          Set as Bypass Player
        </button>
      </div>

      {/* Create new test player */}
      <div style={{ background: '#111', padding: '0.75rem', borderRadius: '6px', border: '1px solid #333' }}>
        <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem', fontWeight: 600 }}>Create New Test Player</div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={newAlias}
            onChange={(e) => setNewAlias(e.target.value)}
            placeholder="Alias"
            style={{ width: '120px', padding: '6px 10px', background: '#1a1a2e', border: '1px solid #333', borderRadius: '4px', color: '#e0e0e0', fontSize: '0.85rem' }}
          />
          <input
            type="text"
            value={newCharName}
            onChange={(e) => setNewCharName(e.target.value)}
            placeholder="Character Name"
            style={{ width: '140px', padding: '6px 10px', background: '#1a1a2e', border: '1px solid #333', borderRadius: '4px', color: '#e0e0e0', fontSize: '0.85rem' }}
          />
          <select
            value={newClassId}
            onChange={(e) => setNewClassId(Number(e.target.value))}
            style={{ padding: '6px 10px', background: '#1a1a2e', border: '1px solid #333', borderRadius: '4px', color: '#e0e0e0', fontSize: '0.85rem' }}
          >
            {status.available_classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={handleCreateTestPlayer}
            disabled={creating || !newAlias || !newCharName}
            style={{ padding: '6px 14px', background: '#ff9800', border: 'none', borderRadius: '4px', color: '#000', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
          >
            {creating ? 'Creating...' : 'Create & Set as Bypass'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main ServerConfig Component ── */
export default function ServerConfig() {
  const [config, setConfig] = useState<GroupedConfig>({})
  const [modified, setModified] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('ops')
  const [resetConfirm, setResetConfirm] = useState<string | null>(null)

  const fetchConfig = async () => {
    try {
      const res = await api.get('/api/admin/config')
      if (!res.ok) throw new Error('Failed to load config')
      const data: GroupedConfig = await res.json()
      setConfig(data)
      setModified({})
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  const handleValueChange = (key: string, newValue: string) => {
    setModified(prev => ({ ...prev, [key]: newValue }))
    setSuccessMsg(null)
  }

  const getCurrentValue = (entry: ConfigEntry): string => {
    return modified[entry.key] !== undefined ? modified[entry.key] : (entry.value || '')
  }

  const hasChanges = Object.keys(modified).length > 0

  const handleSaveAll = async () => {
    setSaving(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const keys = Object.keys(modified)
      for (const key of keys) {
        const res = await api.patch(`/api/admin/config/${key}`, { value: modified[key] })
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(`Failed to save ${key}: ${errData.detail || 'Unknown error'}`)
        }
      }
      setSuccessMsg(`Saved ${keys.length} setting(s) successfully.`)
      await fetchConfig()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async (key: string) => {
    setResetConfirm(null)
    try {
      const res = await api.post(`/api/admin/config/${key}/reset`)
      if (!res.ok) throw new Error('Failed to reset')
      setSuccessMsg(`Reset "${key}" to default.`)
      await fetchConfig()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset')
    }
  }

  const renderControl = (entry: ConfigEntry) => {
    const currentValue = getCurrentValue(entry)
    const isModified = modified[entry.key] !== undefined

    // Hide auth_bypass keys from the general config list — handled by the panel above
    if (entry.key.startsWith('ops.auth_bypass')) return null

    switch (entry.value_type) {
      case 'boolean':
        return (
          <label className="config-toggle">
            <input
              type="checkbox"
              checked={currentValue.toLowerCase() === 'true'}
              onChange={(e) => handleValueChange(entry.key, e.target.checked ? 'true' : 'false')}
            />
            <span className="toggle-slider" />
            <span className={`toggle-label ${isModified ? 'modified' : ''}`}>
              {currentValue.toLowerCase() === 'true' ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        )

      case 'integer':
        return (
          <input
            type="number"
            step="1"
            className={`config-input ${isModified ? 'modified' : ''}`}
            value={currentValue}
            onChange={(e) => handleValueChange(entry.key, e.target.value)}
          />
        )

      case 'numeric':
        return (
          <input
            type="number"
            step="0.01"
            className={`config-input ${isModified ? 'modified' : ''}`}
            value={currentValue}
            onChange={(e) => handleValueChange(entry.key, e.target.value)}
          />
        )

      case 'text':
        return (
          <textarea
            className={`config-textarea ${isModified ? 'modified' : ''}`}
            value={currentValue}
            onChange={(e) => handleValueChange(entry.key, e.target.value)}
            rows={3}
          />
        )

      default: // string
        return (
          <input
            type="text"
            className={`config-input ${isModified ? 'modified' : ''}`}
            value={currentValue}
            onChange={(e) => handleValueChange(entry.key, e.target.value)}
          />
        )
    }
  }

  if (loading) return <div className="config-loading">Loading configuration...</div>

  // Filter out auth_bypass entries from the main list
  const entries = (config[activeTab] || []).filter(e => !e.key.startsWith('ops.auth_bypass'))

  return (
    <div className="server-config">
      <h2>Server Configuration</h2>

      {error && <div className="config-alert error">{error}</div>}
      {successMsg && <div className="config-alert success">{successMsg}</div>}

      {/* Auth Bypass Panel — always shown, self-hides if .env doesn't allow */}
      <AuthBypassPanel />

      <div className="config-tabs">
        <button
          className={`config-tab ${activeTab === 'ops' ? 'active' : ''}`}
          onClick={() => setActiveTab('ops')}
        >
          Operational Settings
        </button>
      </div>

      <div className="config-entries">
        {entries.map((entry) => (
          <div key={entry.key} className="config-entry">
            <div className="config-entry-header">
              <div className="config-key">{entry.key}</div>
              {resetConfirm === entry.key ? (
                <div className="reset-confirm">
                  <span>Reset to default?</span>
                  <button className="btn-confirm-yes" onClick={() => handleReset(entry.key)}>Yes</button>
                  <button className="btn-confirm-no" onClick={() => setResetConfirm(null)}>No</button>
                </div>
              ) : (
                <button
                  className="btn-reset"
                  onClick={() => setResetConfirm(entry.key)}
                  title={`Default: ${entry.default_value}`}
                >
                  Reset to Default
                </button>
              )}
            </div>
            {entry.description && (
              <div className="config-description">{entry.description}</div>
            )}
            <div className="config-control">
              {renderControl(entry)}
            </div>
            {entry.updated_by && (
              <div className="config-meta">
                Last updated by {entry.updated_by}
                {entry.updated_at && ` at ${new Date(entry.updated_at).toLocaleString()}`}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="config-actions">
        <button
          className="btn-save-all"
          disabled={!hasChanges || saving}
          onClick={handleSaveAll}
        >
          {saving ? 'Saving...' : `Save All Changes${hasChanges ? ` (${Object.keys(modified).length})` : ''}`}
        </button>
      </div>
    </div>
  )
}
