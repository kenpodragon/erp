import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import PresetApplyModal from './PresetApplyModal'

interface DifficultyPreset {
  id: number
  name: string
  description: string | null
  difficulty_curve_id: number | null
  difficulty_curve_name: string | null
  wave_preset_id: number | null
  wave_preset_name: string | null
  config_snapshot: Record<string, any>
  config_key_count: number
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

interface CurveOption {
  id: number
  name: string
}

interface WavePresetOption {
  id: number
  name: string
}

export default function DifficultyPresetManager() {
  const [presets, setPresets] = useState<DifficultyPreset[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<DifficultyPreset | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)

  // Dropdown options
  const [curves, setCurves] = useState<CurveOption[]>([])
  const [wavePresets, setWavePresets] = useState<WavePresetOption[]>([])

  // Current config for apply modal
  const [currentConfig, setCurrentConfig] = useState<Record<string, any>>({})
  const [applyPreset, setApplyPreset] = useState<DifficultyPreset | null>(null)

  // Detail view: expanded config snapshot
  const [showSnapshot, setShowSnapshot] = useState(false)

  const fetchPresets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/scaling/presets')
      if (res.ok) {
        const data = await res.json()
        setPresets(data.items || [])
        setTotal(data.total || 0)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  const fetchOptions = useCallback(async () => {
    try {
      const [curvesRes, wavesRes, configRes] = await Promise.all([
        api.get('/api/admin/scaling/difficulty-curves'),
        api.get('/api/admin/scaling/wave-presets'),
        api.get('/api/admin/scaling/presets/capture-current'),
      ])
      if (curvesRes.ok) {
        const data = await curvesRes.json()
        setCurves((data.items || []).map((c: any) => ({ id: c.id, name: c.name })))
      }
      if (wavesRes.ok) {
        const data = await wavesRes.json()
        setWavePresets((data.items || []).map((w: any) => ({ id: w.id, name: w.name })))
      }
      if (configRes.ok) {
        const data = await configRes.json()
        setCurrentConfig(data.config_snapshot || {})
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchPresets(); fetchOptions() }, [fetchPresets, fetchOptions])

  const activePreset = presets.find(p => p.is_active)

  const handleSelect = (p: DifficultyPreset) => {
    setSelected(p)
    setCreating(false)
    setForm({
      name: p.name,
      description: p.description || '',
      difficulty_curve_id: p.difficulty_curve_id,
      wave_preset_id: p.wave_preset_id,
    })
    setShowSnapshot(false)
    setMessage(null)
  }

  const handleCreate = () => {
    setSelected(null)
    setCreating(true)
    setForm({ name: '', description: '', difficulty_curve_id: null, wave_preset_id: null })
    setShowSnapshot(false)
    setMessage(null)
  }

  const handleCancel = () => {
    setSelected(null)
    setCreating(false)
    setForm({})
  }

  const handleCaptureSettings = async () => {
    try {
      const res = await api.get('/api/admin/scaling/presets/capture-current')
      if (res.ok) {
        const data = await res.json()
        setForm(prev => ({ ...prev, config_snapshot: data.config_snapshot }))
        setMessage({ type: 'success', text: `Captured ${data.total_keys} config keys` })
      } else {
        setMessage({ type: 'error', text: 'Failed to capture settings' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: Record<string, any> = {
        name: form.name,
        description: form.description || null,
        difficulty_curve_id: form.difficulty_curve_id || null,
        wave_preset_id: form.wave_preset_id || null,
      }

      if (form.config_snapshot) {
        body.config_snapshot = form.config_snapshot
      }

      if (creating) {
        const res = await api.post('/api/admin/scaling/presets', body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Difficulty preset created' })
          setCreating(false)
          setForm({})
          await fetchPresets()
        } else {
          const err = await res.json().catch(() => ({}))
          setMessage({ type: 'error', text: err.detail || 'Failed to create' })
        }
      } else if (selected) {
        const res = await api.patch(`/api/admin/scaling/presets/${selected.id}`, body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Difficulty preset updated' })
          await fetchPresets()
          const updated = await res.json()
          setSelected({ ...selected, ...updated })
        } else {
          const err = await res.json().catch(() => ({}))
          setMessage({ type: 'error', text: err.detail || 'Failed to update' })
        }
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setSaving(false)
  }

  const handleDelete = async (p: DifficultyPreset) => {
    if (!window.confirm(`Delete difficulty preset "${p.name}"? This cannot be undone.`)) return
    try {
      const res = await api.delete(`/api/admin/scaling/presets/${p.id}`)
      if (res.ok || res.status === 204) {
        setMessage({ type: 'success', text: 'Difficulty preset deleted' })
        if (selected?.id === p.id) handleCancel()
        await fetchPresets()
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to delete' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
  }

  const handleApply = (p: DifficultyPreset) => {
    setApplyPreset(p)
  }

  const handleApplied = async () => {
    setApplyPreset(null)
    setMessage({ type: 'success', text: 'Preset applied successfully' })
    await fetchPresets()
    await fetchOptions()
  }

  // Group config snapshot by category prefix
  const groupedSnapshot = (snapshot: Record<string, any>) => {
    const groups: Record<string, [string, any][]> = {}
    for (const [key, value] of Object.entries(snapshot)) {
      const parts = key.split('_')
      const category = parts.length > 1 ? parts[0] : 'general'
      if (!groups[category]) groups[category] = []
      groups[category].push([key, value])
    }
    return groups
  }

  return (
    <div className="editor-panel">
      {message && (
        <div className={`editor-message editor-message--${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>x</button>
        </div>
      )}

      {/* Active preset banner */}
      {activePreset && (
        <div style={{
          padding: '8px 12px',
          marginBottom: 12,
          background: 'rgba(51, 153, 51, 0.1)',
          border: '1px solid rgba(51, 153, 51, 0.3)',
          borderRadius: 4,
          fontSize: '13px',
        }}>
          Active preset: <strong>{activePreset.name}</strong>
          {activePreset.difficulty_curve_name && <span> | Curve: {activePreset.difficulty_curve_name}</span>}
          {activePreset.wave_preset_name && <span> | Waves: {activePreset.wave_preset_name}</span>}
        </div>
      )}

      <div className="editor-toolbar">
        <div className="editor-toolbar-left">
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {total} difficulty preset{total !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="editor-toolbar-right">
          <button className="btn btn-success" onClick={handleCreate}>+ New Preset</button>
        </div>
      </div>

      {loading ? (
        <div className="editor-loading">Loading difficulty presets...</div>
      ) : presets.length === 0 ? (
        <div className="editor-empty">No difficulty presets found. Create one to get started.</div>
      ) : (
        <div className="editor-table-wrapper">
          <table className="editor-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Curve</th>
                <th>Wave Preset</th>
                <th>Active</th>
                <th>Config Keys</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {presets.map(p => (
                <tr key={p.id} className={selected?.id === p.id ? 'row-selected' : ''}>
                  <td>
                    {p.is_active && <span style={{ color: '#cc9900', marginRight: 4 }} title="Active preset">&#9733;</span>}
                    {p.name}
                  </td>
                  <td>{p.description ? (p.description.length > 40 ? p.description.substring(0, 40) + '...' : p.description) : '--'}</td>
                  <td>{p.difficulty_curve_name || '--'}</td>
                  <td>{p.wave_preset_name || '--'}</td>
                  <td>{p.is_active ? 'Yes' : '--'}</td>
                  <td>{p.config_key_count}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-sm btn-primary" onClick={() => handleSelect(p)}>Edit</button>
                    <button className="btn btn-sm btn-success" onClick={() => handleApply(p)} style={{ marginLeft: 4 }}>Apply</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p)} style={{ marginLeft: 4 }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(selected || creating) && (
        <div className="detail-panel">
          <h3>{creating ? 'Create Difficulty Preset' : `Edit Difficulty Preset #${selected?.id}`}</h3>

          {/* Basic Info */}
          <div className="section-header">Basic Info</div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Name</label>
              <input
                className="form-input"
                value={form.name || ''}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Easy Mode"
              />
            </div>
            <div className="form-field form-field--full">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={form.description || ''}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          {/* References */}
          <div className="section-header">References</div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Difficulty Curve</label>
              <select
                className="form-select"
                value={form.difficulty_curve_id ?? ''}
                onChange={e => setForm(p => ({ ...p, difficulty_curve_id: e.target.value ? Number(e.target.value) : null }))}
              >
                <option value="">-- none --</option>
                {curves.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Wave Preset</label>
              <select
                className="form-select"
                value={form.wave_preset_id ?? ''}
                onChange={e => setForm(p => ({ ...p, wave_preset_id: e.target.value ? Number(e.target.value) : null }))}
              >
                <option value="">-- none --</option>
                {wavePresets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          {/* Capture Current Settings */}
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Config Snapshot</span>
            <button className="btn btn-sm btn-primary" onClick={handleCaptureSettings}>
              Capture Current Settings
            </button>
          </div>
          {form.config_snapshot && (
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {Object.keys(form.config_snapshot).length} keys captured
            </p>
          )}

          <div className="form-actions">
            <button className="btn" onClick={handleCancel}>Cancel</button>
            <button className="btn btn-success" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>

          {/* Detail view: expandable config snapshot */}
          {selected && selected.config_snapshot && Object.keys(selected.config_snapshot).length > 0 && (
            <>
              <div
                className="section-header"
                style={{ marginTop: 24, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setShowSnapshot(!showSnapshot)}
              >
                {showSnapshot ? '[-]' : '[+]'} Config Snapshot Detail ({Object.keys(selected.config_snapshot).length} keys)
              </div>
              {showSnapshot && (
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {Object.entries(groupedSnapshot(selected.config_snapshot)).map(([category, entries]) => (
                    <div key={category} style={{ marginBottom: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                        {category}
                      </div>
                      <div className="editor-table-wrapper">
                        <table className="editor-table">
                          <tbody>
                            {entries.map(([key, value]) => (
                              <tr key={key}>
                                <td style={{ fontFamily: 'monospace', fontSize: '12px', width: '50%' }}>{key}</td>
                                <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Apply Modal */}
      {applyPreset && (
        <PresetApplyModal
          preset={applyPreset}
          currentConfig={currentConfig}
          onClose={() => setApplyPreset(null)}
          onApplied={handleApplied}
        />
      )}
    </div>
  )
}
