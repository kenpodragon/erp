import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'

interface VisualBehavior {
  id: number
  name: string
  display_name: string
  description: string | null
  animation_config: Record<string, any> | null
  sort_order: number
  attack_type_count: number
  transitive_entity_count: number
  attack_type_names?: string[]
}

const MOVEMENT_PATTERNS = ['walk', 'hover', 'teleport', 'stationary', 'burrow']
const ATTACK_ANIMATIONS = ['melee_swing', 'projectile', 'spell_cast', 'dive_attack', 'area_blast']
const IDLE_ANIMATIONS = ['idle_bounce', 'float', 'pulse', 'shimmer']

export default function VisualBehaviorManager() {
  const [behaviors, setBehaviors] = useState<VisualBehavior[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<VisualBehavior | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})
  const [animConfig, setAnimConfig] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)

  const fetchBehaviors = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/classification/visual-behaviors')
      if (res.ok) {
        const data = await res.json()
        setBehaviors(Array.isArray(data) ? data : [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchBehaviors() }, [fetchBehaviors])

  const handleSelect = (vb: VisualBehavior) => {
    setSelected(vb)
    setCreating(false)
    setForm({ ...vb })
    setAnimConfig(vb.animation_config || {})
    setMessage(null)
  }

  const handleCreate = () => {
    setSelected(null)
    setCreating(true)
    setForm({ name: '', display_name: '', description: '', sort_order: 0 })
    setAnimConfig({})
    setMessage(null)
  }

  const handleCancel = () => {
    setSelected(null)
    setCreating(false)
    setForm({})
    setAnimConfig({})
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: Record<string, any> = {
        name: form.name,
        display_name: form.display_name,
        description: form.description || null,
        animation_config: animConfig,
        sort_order: form.sort_order ?? 0,
      }

      if (creating) {
        const res = await api.post('/api/admin/classification/visual-behaviors', body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Visual behavior created' })
          setCreating(false)
          setForm({})
          setAnimConfig({})
          await fetchBehaviors()
        } else {
          const err = await res.json().catch(() => ({}))
          setMessage({ type: 'error', text: err.detail || 'Failed to create' })
        }
      } else if (selected) {
        const res = await api.patch(`/api/admin/classification/visual-behaviors/${selected.id}`, body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Visual behavior updated' })
          setSelected(null)
          setForm({})
          setAnimConfig({})
          await fetchBehaviors()
        } else {
          const err = await res.json().catch(() => ({}))
          setMessage({ type: 'error', text: err.detail || 'Failed to update' })
        }
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setSaving(false)
  }

  const handleDelete = async (vb: VisualBehavior) => {
    if (!window.confirm(`Delete visual behavior "${vb.display_name || vb.name}"?`)) return
    try {
      const res = await api.delete(`/api/admin/classification/visual-behaviors/${vb.id}`)
      if (res.ok) {
        setMessage({ type: 'success', text: 'Visual behavior deleted' })
        if (selected?.id === vb.id) {
          setSelected(null)
          setForm({})
          setAnimConfig({})
        }
        await fetchBehaviors()
      } else {
        const err = await res.json().catch(() => ({}))
        if (res.status === 409) {
          setMessage({ type: 'error', text: err.detail || 'Cannot delete: attack types reference this behavior' })
        } else {
          setMessage({ type: 'error', text: err.detail || 'Failed to delete' })
        }
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
  }

  const truncate = (text: string | null, len: number) => {
    if (!text) return '--'
    return text.length > len ? text.substring(0, len) + '...' : text
  }

  // Find which attack types map to the currently edited behavior
  const mappedAttackTypes = selected
    ? (selected.attack_type_names || [])
    : []

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
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{behaviors.length} visual behaviors</span>
        </div>
        <div className="editor-toolbar-right">
          <button className="btn btn-success" onClick={handleCreate}>+ New Behavior</button>
        </div>
      </div>

      {loading ? (
        <div className="editor-loading">Loading visual behaviors...</div>
      ) : behaviors.length === 0 ? (
        <div className="editor-empty">No visual behaviors found.</div>
      ) : (
        <div className="editor-table-wrapper">
          <table className="editor-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Display Name</th>
                <th>Description</th>
                <th>Attack Types</th>
                <th>Entities</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {behaviors.map(vb => (
                <tr key={vb.id} className={selected?.id === vb.id ? 'row-selected' : ''}>
                  <td>{vb.name}</td>
                  <td>{vb.display_name}</td>
                  <td>{truncate(vb.description, 50)}</td>
                  <td>{vb.attack_type_count ?? 0}</td>
                  <td>{vb.transitive_entity_count ?? 0}</td>
                  <td>
                    <button className="btn btn-sm btn-primary" onClick={() => handleSelect(vb)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(vb)} style={{ marginLeft: 4 }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(selected || creating) && (
        <div className="detail-panel">
          <h3>{creating ? 'Create Visual Behavior' : `Edit Visual Behavior #${selected?.id}`}</h3>

          <div className="section-header">Basic Info</div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Display Name</label>
              <input className="form-input" value={form.display_name || ''} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))} />
            </div>
            <div className="form-field form-field--full">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <div className="form-field">
              <label className="form-label">Sort Order</label>
              <input className="form-input" type="number" value={form.sort_order ?? 0} onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>

          <div className="section-header">Animation Config</div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Y Offset</label>
              <input
                className="form-input"
                type="number"
                value={animConfig.y_offset ?? 0}
                onChange={e => setAnimConfig(p => ({ ...p, y_offset: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Movement Pattern</label>
              <select
                className="form-select"
                value={animConfig.movement_pattern || ''}
                onChange={e => setAnimConfig(p => ({ ...p, movement_pattern: e.target.value || undefined }))}
              >
                <option value="">-- select --</option>
                {MOVEMENT_PATTERNS.map(mp => <option key={mp} value={mp}>{mp}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Attack Animation</label>
              <select
                className="form-select"
                value={animConfig.attack_animation || ''}
                onChange={e => setAnimConfig(p => ({ ...p, attack_animation: e.target.value || undefined }))}
              >
                <option value="">-- select --</option>
                {ATTACK_ANIMATIONS.map(aa => <option key={aa} value={aa}>{aa}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Attack VFX (optional)</label>
              <input
                className="form-input"
                value={animConfig.attack_vfx || ''}
                onChange={e => setAnimConfig(p => ({ ...p, attack_vfx: e.target.value || undefined }))}
                placeholder="e.g., fire_burst"
              />
            </div>
            <div className="form-field">
              <label className="form-label">Idle Animation</label>
              <select
                className="form-select"
                value={animConfig.idle_animation || ''}
                onChange={e => setAnimConfig(p => ({ ...p, idle_animation: e.target.value || undefined }))}
              >
                <option value="">-- select --</option>
                {IDLE_ANIMATIONS.map(ia => <option key={ia} value={ia}>{ia}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Speed Modifier</label>
              <input
                className="form-input"
                type="number"
                step="0.1"
                value={animConfig.speed_modifier ?? 1}
                onChange={e => setAnimConfig(p => ({ ...p, speed_modifier: parseFloat(e.target.value) || 1 }))}
              />
            </div>
          </div>

          {/* Mapped Attack Types (read-only) */}
          {!creating && mappedAttackTypes.length > 0 && (
            <>
              <div className="section-header">Mapped Attack Types</div>
              <div className="inline-list">
                {mappedAttackTypes.map((name: string) => (
                  <div key={name} className="inline-list-item">
                    <span>{name}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="form-actions">
            <button className="btn" onClick={handleCancel}>Cancel</button>
            <button className="btn btn-success" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
