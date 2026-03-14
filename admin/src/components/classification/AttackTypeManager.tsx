import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'

interface AttackType {
  id: number
  name: string
  display_name: string
  is_physical: boolean
  description: string | null
  lore_reference: string | null
  visual_behavior_id: number | null
  visual_behavior_name: string | null
  strength_multiplier: number
  agility_multiplier: number
  intelligence_multiplier: number
  hp_multiplier: number
  gold_multiplier: number
  entity_count: number
}

interface VisualBehavior {
  id: number
  name: string
  display_name: string
}

export default function AttackTypeManager() {
  const [attackTypes, setAttackTypes] = useState<AttackType[]>([])
  const [visualBehaviors, setVisualBehaviors] = useState<VisualBehavior[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<AttackType | null>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)

  const fetchAttackTypes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/classification/attack-types')
      if (res.ok) {
        const data = await res.json()
        setAttackTypes(Array.isArray(data) ? data : [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  const fetchVisualBehaviors = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/classification/visual-behaviors')
      if (res.ok) {
        const data = await res.json()
        setVisualBehaviors(Array.isArray(data) ? data : [])
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchAttackTypes(); fetchVisualBehaviors() }, [fetchAttackTypes, fetchVisualBehaviors])

  const handleSelect = (at: AttackType) => {
    setSelected(at)
    setForm({ ...at })
    setMessage(null)
  }

  const handleCancel = () => {
    setSelected(null)
    setForm({})
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    try {
      // Only send changed fields
      const patch: Record<string, any> = {}
      const fields = [
        'name', 'display_name', 'description', 'is_physical', 'lore_reference',
        'visual_behavior_id',
        'strength_multiplier', 'agility_multiplier', 'intelligence_multiplier',
        'hp_multiplier', 'gold_multiplier',
      ]
      for (const key of fields) {
        if (form[key] !== (selected as any)[key]) {
          patch[key] = form[key]
        }
      }

      if (Object.keys(patch).length === 0) {
        setMessage({ type: 'info', text: 'No changes to save' })
        setSaving(false)
        return
      }

      const res = await api.patch(`/api/admin/classification/attack-types/${selected.id}`, patch)
      if (res.ok) {
        setMessage({ type: 'success', text: 'Attack type updated' })
        setSelected(null)
        setForm({})
        await fetchAttackTypes()
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to update' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setSaving(false)
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
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{attackTypes.length} attack types</span>
        </div>
      </div>

      {loading ? (
        <div className="editor-loading">Loading attack types...</div>
      ) : attackTypes.length === 0 ? (
        <div className="editor-empty">No attack types found.</div>
      ) : (
        <div className="editor-table-wrapper">
          <table className="editor-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Display Name</th>
                <th>Physical</th>
                <th>Visual Behavior</th>
                <th>Entities</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {attackTypes.map(at => (
                <tr key={at.id} className={selected?.id === at.id ? 'row-selected' : ''}>
                  <td>{at.name}</td>
                  <td>{at.display_name}</td>
                  <td>{at.is_physical ? '\u2713' : '\u2717'}</td>
                  <td>{at.visual_behavior_name || '--'}</td>
                  <td>{at.entity_count ?? 0}</td>
                  <td>
                    <button className="btn btn-sm btn-primary" onClick={() => handleSelect(at)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="detail-panel">
          <h3>Edit Attack Type #{selected.id}</h3>

          <div className="section-header">Standard Fields</div>
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
              <div className="form-checkbox-row">
                <input type="checkbox" checked={!!form.is_physical} onChange={e => setForm(p => ({ ...p, is_physical: e.target.checked }))} />
                <label className="form-label">Physical Attack</label>
              </div>
            </div>
            <div className="form-field form-field--full">
              <label className="form-label">Lore Reference</label>
              <textarea className="form-textarea" value={form.lore_reference || ''} onChange={e => setForm(p => ({ ...p, lore_reference: e.target.value }))} rows={2} />
            </div>
          </div>

          <div className="section-header">Visual Behavior</div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Visual Behavior</label>
              <select
                className="form-select"
                value={form.visual_behavior_id ?? ''}
                onChange={e => setForm(p => ({ ...p, visual_behavior_id: e.target.value ? Number(e.target.value) : null }))}
              >
                <option value="">None</option>
                {visualBehaviors.map(vb => (
                  <option key={vb.id} value={vb.id}>{vb.display_name || vb.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="section-header">Stat Multipliers</div>
          <p className="cls-help-text">Applied as multipliers on family base stats when using Apply Template</p>
          <div className="cls-stat-grid">
            {[
              { key: 'strength_multiplier', label: 'Strength' },
              { key: 'agility_multiplier', label: 'Agility' },
              { key: 'intelligence_multiplier', label: 'Intelligence' },
              { key: 'hp_multiplier', label: 'HP Multiplier' },
              { key: 'gold_multiplier', label: 'Gold Multiplier' },
            ].map(({ key, label }) => (
              <div className="cls-stat-field" key={key}>
                <label>{label}</label>
                <input
                  type="number"
                  step="0.01"
                  value={form[key] ?? 1}
                  onChange={e => setForm(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button className="btn" onClick={handleCancel}>Cancel</button>
            <button className="btn btn-success" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
