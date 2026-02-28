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

export default function ServerConfig() {
  const [config, setConfig] = useState<GroupedConfig>({})
  const [modified, setModified] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'game' | 'ops'>('game')
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

  const entries = config[activeTab] || []

  return (
    <div className="server-config">
      <h2>Server Configuration</h2>

      {error && <div className="config-alert error">{error}</div>}
      {successMsg && <div className="config-alert success">{successMsg}</div>}

      <div className="config-tabs">
        <button
          className={`config-tab ${activeTab === 'game' ? 'active' : ''}`}
          onClick={() => setActiveTab('game')}
        >
          Game Settings
        </button>
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
