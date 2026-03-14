import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import EntityPicker from './shared/EntityPicker'

interface WaveConfig {
  max_enemies_per_wave: number
  wave_count: number
  spawn_interval_ms: number
  scaling_factor: number
  hp_multiplier: number
  gold_multiplier: number
  boss_entity_id: number | null
  entity_pool: EntityPoolEntry[]
}

interface EntityPoolEntry {
  entity_id: number
  entity_name?: string
  weight: number
  min_wave: number
  max_wave: number | null
}

interface WaveConfigPanelProps {
  sceneId: number
}

export default function WaveConfigPanel({ sceneId }: WaveConfigPanelProps) {
  const [config, setConfig] = useState<WaveConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/admin/content/wave-configs/${sceneId}`)
      if (res.ok) {
        setConfig(await res.json())
      } else if (res.status === 404) {
        setConfig({
          max_enemies_per_wave: 5,
          wave_count: 3,
          spawn_interval_ms: 1000,
          scaling_factor: 1.0,
          hp_multiplier: 1.0,
          gold_multiplier: 1.0,
          boss_entity_id: null,
          entity_pool: [],
        })
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [sceneId])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    try {
      const res = await api.put(`/api/admin/content/wave-configs/${sceneId}`, config)
      if (res.ok) {
        setMessage({ type: 'success', text: 'Wave config saved' })
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to save' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setSaving(false)
  }

  const handleAutoPopulate = async () => {
    setSaving(true)
    try {
      const res = await api.post(`/api/admin/content/wave-configs/auto-populate/${sceneId}`)
      if (res.ok) {
        setMessage({ type: 'success', text: 'Auto-populated' })
        await fetchConfig()
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to auto-populate' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setSaving(false)
  }

  const updateField = (field: string, value: any) => {
    if (config) setConfig({ ...config, [field]: value })
  }

  const addPoolEntry = (entityId: number, entityName?: string) => {
    if (!config) return
    setConfig({
      ...config,
      entity_pool: [...config.entity_pool, { entity_id: entityId, entity_name: entityName, weight: 1, min_wave: 1, max_wave: null }]
    })
  }

  const removePoolEntry = (index: number) => {
    if (!config) return
    setConfig({ ...config, entity_pool: config.entity_pool.filter((_, i) => i !== index) })
  }

  const updatePoolEntry = (index: number, field: string, value: any) => {
    if (!config) return
    const pool = [...config.entity_pool]
    pool[index] = { ...pool[index], [field]: value }
    setConfig({ ...config, entity_pool: pool })
  }

  if (loading) return <div className="editor-loading">Loading wave config...</div>
  if (!config) return <div className="editor-empty">No wave config available.</div>

  return (
    <div>
      {message && (
        <div className={`editor-message editor-message--${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>x</button>
        </div>
      )}

      <div className="section-header">Wave Parameters</div>
      <div className="form-grid">
        <div className="form-field">
          <label className="form-label">Max Enemies Per Wave</label>
          <input className="form-input" type="number" value={config.max_enemies_per_wave} onChange={e => updateField('max_enemies_per_wave', Number(e.target.value))} />
        </div>
        <div className="form-field">
          <label className="form-label">Wave Count</label>
          <input className="form-input" type="number" value={config.wave_count} onChange={e => updateField('wave_count', Number(e.target.value))} />
        </div>
        <div className="form-field">
          <label className="form-label">Spawn Interval (ms)</label>
          <input className="form-input" type="number" value={config.spawn_interval_ms} onChange={e => updateField('spawn_interval_ms', Number(e.target.value))} />
        </div>
        <div className="form-field">
          <label className="form-label">Scaling Factor</label>
          <input className="form-input" type="number" step="0.1" value={config.scaling_factor} onChange={e => updateField('scaling_factor', Number(e.target.value))} />
        </div>
        <div className="form-field">
          <label className="form-label">HP Multiplier</label>
          <input className="form-input" type="number" step="0.1" value={config.hp_multiplier} onChange={e => updateField('hp_multiplier', Number(e.target.value))} />
        </div>
        <div className="form-field">
          <label className="form-label">Gold Multiplier</label>
          <input className="form-input" type="number" step="0.1" value={config.gold_multiplier} onChange={e => updateField('gold_multiplier', Number(e.target.value))} />
        </div>
      </div>

      <div className="section-header">Boss Entity</div>
      <EntityPicker value={config.boss_entity_id} onChange={id => updateField('boss_entity_id', id)} placeholder="Select boss entity..." />

      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Entity Pool</span>
        <button className="btn btn-sm btn-warning" onClick={handleAutoPopulate} disabled={saving}>Auto-populate</button>
      </div>

      {config.entity_pool.length === 0 ? (
        <div className="editor-empty" style={{ padding: '16px' }}>No entities in pool. Add one or use Auto-populate.</div>
      ) : (
        <div className="editor-table-wrapper" style={{ maxHeight: '250px' }}>
          <table className="editor-table">
            <thead>
              <tr>
                <th>Entity</th>
                <th>Weight</th>
                <th>Min Wave</th>
                <th>Max Wave</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {config.entity_pool.map((entry, i) => (
                <tr key={i}>
                  <td>{entry.entity_name || `Entity #${entry.entity_id}`}</td>
                  <td><input className="form-input" type="number" value={entry.weight} onChange={e => updatePoolEntry(i, 'weight', Number(e.target.value))} style={{ width: 60 }} /></td>
                  <td><input className="form-input" type="number" value={entry.min_wave} onChange={e => updatePoolEntry(i, 'min_wave', Number(e.target.value))} style={{ width: 60 }} /></td>
                  <td><input className="form-input" type="number" value={entry.max_wave ?? ''} onChange={e => updatePoolEntry(i, 'max_wave', e.target.value ? Number(e.target.value) : null)} style={{ width: 60 }} /></td>
                  <td><button className="btn btn-sm btn-danger" onClick={() => removePoolEntry(i)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '8px' }}>
        <EntityPicker value={null} onChange={(id, name) => { if (id) addPoolEntry(id, name) }} placeholder="Add entity to pool..." />
      </div>

      <div className="form-actions">
        <button className="btn btn-success" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Wave Config'}</button>
      </div>
    </div>
  )
}
