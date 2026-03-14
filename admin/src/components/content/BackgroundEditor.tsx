import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import AssetPicker from './shared/AssetPicker'
import DeleteConfirmDialog from './shared/DeleteConfirmDialog'

interface Background {
  id: number
  name: string
  description: string | null
  background_key: string | null
  time_of_day: string | null
  mood: string | null
  parallax_config: any[] | null
  primary_color: string | null
  secondary_color: string | null
  accent_color: string | null
  scene_count?: number
}

const TIME_OF_DAY = ['dawn', 'morning', 'midday', 'afternoon', 'dusk', 'evening', 'night', 'midnight']
const MOODS = ['calm', 'tense', 'eerie', 'serene', 'chaotic', 'mystical', 'dark', 'bright', 'ominous', 'hopeful']

export default function BackgroundEditor() {
  const [backgrounds, setBackgrounds] = useState<Background[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [selected, setSelected] = useState<Background | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Background | null>(null)

  const fetchBackgrounds = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/content/backgrounds')
      if (res.ok) {
        const data = await res.json()
        setBackgrounds(Array.isArray(data) ? data : data.items || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchBackgrounds() }, [fetchBackgrounds])

  const handleSelect = (bg: Background) => {
    setSelected(bg)
    setForm({ ...bg, parallax_config: bg.parallax_config || [] })
    setCreating(false)
  }

  const handleCreate = () => {
    setSelected(null)
    setCreating(true)
    setForm({ name: '', parallax_config: [] })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        name: form.name,
        description: form.description || null,
        background_key: form.background_key || null,
        time_of_day: form.time_of_day || null,
        mood: form.mood || null,
        parallax_config: form.parallax_config || null,
        primary_color: form.primary_color || null,
        secondary_color: form.secondary_color || null,
        accent_color: form.accent_color || null,
      }

      if (creating) {
        const res = await api.post('/api/admin/content/backgrounds', body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Background created' })
          setCreating(false)
          await fetchBackgrounds()
        } else {
          const err = await res.json().catch(() => ({}))
          setMessage({ type: 'error', text: err.detail || 'Failed to create' })
        }
      } else if (selected) {
        const res = await api.patch(`/api/admin/content/backgrounds/${selected.id}`, body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Background updated' })
          setSelected(null)
          await fetchBackgrounds()
        } else {
          const err = await res.json().catch(() => ({}))
          setMessage({ type: 'error', text: err.detail || 'Failed to update' })
        }
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setSaving(false)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await api.delete(`/api/admin/content/backgrounds/${deleteTarget.id}`)
      if (res.ok) {
        setMessage({ type: 'success', text: 'Background deleted' })
        setSelected(null)
        await fetchBackgrounds()
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to delete' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setDeleteTarget(null)
  }

  const addLayer = () => {
    setForm(p => ({ ...p, parallax_config: [...(p.parallax_config || []), { depth: 0, speed: 1 }] }))
  }

  const removeLayer = (idx: number) => {
    setForm(p => ({ ...p, parallax_config: (p.parallax_config || []).filter((_: any, i: number) => i !== idx) }))
  }

  const updateLayer = (idx: number, field: string, value: number) => {
    setForm(p => {
      const layers = [...(p.parallax_config || [])]
      layers[idx] = { ...layers[idx], [field]: value }
      return { ...p, parallax_config: layers }
    })
  }

  return (
    <div className="editor-panel">
      {message && (
        <div className={`editor-message editor-message--${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>x</button>
        </div>
      )}

      <div className="editor-toolbar">
        <div className="editor-toolbar-left">
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{backgrounds.length} backgrounds</span>
          <button className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : ''}`} onClick={() => setViewMode('table')}>Table</button>
          <button className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : ''}`} onClick={() => setViewMode('grid')}>Grid</button>
        </div>
        <div className="editor-toolbar-right">
          <button className="btn btn-success" onClick={handleCreate}>+ New Background</button>
        </div>
      </div>

      {loading ? (
        <div className="editor-loading">Loading backgrounds...</div>
      ) : backgrounds.length === 0 ? (
        <div className="editor-empty">No backgrounds found.</div>
      ) : viewMode === 'table' ? (
        <div className="editor-table-wrapper">
          <table className="editor-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Key</th>
                <th>Time</th>
                <th>Mood</th>
                <th>Scenes</th>
                <th>Asset</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backgrounds.map(bg => (
                <tr key={bg.id} className={selected?.id === bg.id ? 'row-selected' : ''}>
                  <td>{bg.name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{bg.background_key || '--'}</td>
                  <td>{bg.time_of_day || '--'}</td>
                  <td>{bg.mood || '--'}</td>
                  <td>{bg.scene_count ?? '--'}</td>
                  <td>{bg.background_key ? <span className="badge badge--success">Yes</span> : <span className="badge badge--muted">No</span>}</td>
                  <td>
                    <button className="btn btn-sm btn-primary" onClick={() => handleSelect(bg)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(bg)} style={{ marginLeft: 4 }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid-view">
          {backgrounds.map(bg => (
            <div
              key={bg.id}
              className={`grid-card ${selected?.id === bg.id ? 'selected' : ''}`}
              onClick={() => handleSelect(bg)}
            >
              <div style={{
                width: '100%',
                height: '80px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '8px',
                background: bg.primary_color
                  ? `linear-gradient(135deg, ${bg.primary_color}, ${bg.secondary_color || bg.primary_color})`
                  : 'var(--color-bg-input)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
              }}>
                {bg.background_key || 'No asset'}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>{bg.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                {bg.time_of_day || ''} {bg.mood ? `/ ${bg.mood}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {(selected || creating) && (
        <div className="detail-panel">
          <h3>{creating ? 'Create Background' : `Edit Background #${selected?.id}`}</h3>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-field form-field--full">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="form-field">
              <label className="form-label">Background Asset</label>
              <AssetPicker category="background" value={form.background_key} onChange={key => setForm(p => ({ ...p, background_key: key }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Time of Day</label>
              <select className="form-select" value={form.time_of_day || ''} onChange={e => setForm(p => ({ ...p, time_of_day: e.target.value || null }))}>
                <option value="">-- None --</option>
                {TIME_OF_DAY.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Mood</label>
              <select className="form-select" value={form.mood || ''} onChange={e => setForm(p => ({ ...p, mood: e.target.value || null }))}>
                <option value="">-- None --</option>
                {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Parallax Config */}
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Parallax Layers</span>
            <button className="btn btn-sm btn-success" onClick={addLayer}>+ Add Layer</button>
          </div>
          {(form.parallax_config || []).length === 0 ? (
            <div className="editor-empty" style={{ padding: '12px' }}>No parallax layers configured.</div>
          ) : (
            (form.parallax_config || []).map((layer: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Depth:
                  <input className="form-input" type="number" step="0.1" value={layer.depth} onChange={e => updateLayer(i, 'depth', Number(e.target.value))} style={{ width: 70, marginLeft: 4 }} />
                </label>
                <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Speed:
                  <input className="form-input" type="number" step="0.1" value={layer.speed} onChange={e => updateLayer(i, 'speed', Number(e.target.value))} style={{ width: 70, marginLeft: 4 }} />
                </label>
                <button className="btn btn-sm btn-danger" onClick={() => removeLayer(i)}>Remove</button>
              </div>
            ))
          )}

          {/* Color Palette */}
          <div className="section-header">Color Palette</div>
          <div className="form-grid">
            {(['primary_color', 'secondary_color', 'accent_color'] as const).map(field => (
              <div className="form-field" key={field}>
                <label className="form-label">{field.replace(/_/g, ' ')}</label>
                <div className="color-input-row">
                  <input
                    type="color"
                    className="color-swatch"
                    value={form[field] || '#000000'}
                    onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                  />
                  <input className="form-input" value={form[field] || ''} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} placeholder="#RRGGBB" style={{ flex: 1 }} />
                </div>
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button className="btn" onClick={() => { setSelected(null); setCreating(false) }}>Cancel</button>
            <button className="btn btn-success" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          resourceType="Background"
          resourceName={deleteTarget.name}
          childCounts={{ scenes: deleteTarget.scene_count || 0 }}
          isBlocked={false}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
