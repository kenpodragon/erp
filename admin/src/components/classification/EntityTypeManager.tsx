import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'

interface EntityTypeItem {
  id: number
  name: string
  display_name: string
  description: string | null
  color_hex: string | null
  sort_order: number
  entity_count: number
}

interface FormData {
  name: string
  display_name: string
  description: string
  color_hex: string
  sort_order: number
}

const EMPTY_FORM: FormData = {
  name: '',
  display_name: '',
  description: '',
  color_hex: '#888888',
  sort_order: 0,
}

export default function EntityTypeManager() {
  const [types, setTypes] = useState<EntityTypeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)

  const fetchTypes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/classification/entity-types')
      if (res.ok) {
        const data = await res.json()
        setTypes(Array.isArray(data) ? data : data.items || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchTypes() }, [fetchTypes])

  const handleEdit = (item: EntityTypeItem) => {
    setEditingId(item.id)
    setCreating(false)
    setFormData({
      name: item.name,
      display_name: item.display_name,
      description: item.description || '',
      color_hex: item.color_hex || '#888888',
      sort_order: item.sort_order,
    })
  }

  const handleCreate = () => {
    setEditingId(null)
    setCreating(true)
    setFormData({ ...EMPTY_FORM })
  }

  const handleCancel = () => {
    setEditingId(null)
    setCreating(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        name: formData.name,
        display_name: formData.display_name,
        description: formData.description || null,
        color_hex: formData.color_hex || null,
        sort_order: formData.sort_order,
      }

      if (creating) {
        const res = await api.post('/api/admin/classification/entity-types', body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Entity type created' })
          setCreating(false)
          await fetchTypes()
        } else {
          const err = await res.json().catch(() => ({}))
          setMessage({ type: 'error', text: err.detail || 'Failed to create' })
        }
      } else if (editingId !== null) {
        const res = await api.patch(`/api/admin/classification/entity-types/${editingId}`, body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Entity type updated' })
          setEditingId(null)
          await fetchTypes()
        } else {
          const err = await res.json().catch(() => ({}))
          setMessage({ type: 'error', text: err.detail || 'Failed to update' })
        }
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setSaving(false)
  }

  const handleDelete = async (item: EntityTypeItem) => {
    if (item.entity_count > 0) {
      setMessage({ type: 'error', text: `Cannot delete "${item.display_name}" — ${item.entity_count} entities are assigned to this type. Reassign them first.` })
      return
    }
    if (!window.confirm(`Delete entity type "${item.display_name}"?`)) return
    try {
      const res = await api.delete(`/api/admin/classification/entity-types/${item.id}`)
      if (res.ok) {
        setMessage({ type: 'success', text: 'Entity type deleted' })
        if (editingId === item.id) setEditingId(null)
        await fetchTypes()
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to delete' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
  }

  const isEditing = creating || editingId !== null

  return (
    <div>
      {message && (
        <div className={`editor-message editor-message--${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>x</button>
        </div>
      )}

      <div className="editor-toolbar">
        <div className="editor-toolbar-left">
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{types.length} entity types</span>
        </div>
        <div className="editor-toolbar-right">
          <button className="btn btn-success" onClick={handleCreate}>+ New Type</button>
        </div>
      </div>

      {loading ? (
        <div className="editor-loading">Loading entity types...</div>
      ) : types.length === 0 ? (
        <div className="editor-empty">No entity types defined.</div>
      ) : (
        <div className="editor-table-wrapper">
          <table className="editor-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Display Name</th>
                <th>Color</th>
                <th>Entities</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {types.map(item => (
                <tr key={item.id} className={editingId === item.id ? 'row-selected' : ''}>
                  <td>{item.sort_order}</td>
                  <td>{item.name}</td>
                  <td>{item.display_name}</td>
                  <td>
                    {item.color_hex ? (
                      <span className="cls-color-badge" style={{ backgroundColor: item.color_hex }} title={item.color_hex} />
                    ) : '--'}
                  </td>
                  <td>{item.entity_count}</td>
                  <td>
                    <button className="btn btn-sm btn-primary" onClick={() => handleEdit(item)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item)} style={{ marginLeft: 4 }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isEditing && (
        <div className="detail-panel">
          <h3>{creating ? 'Create Entity Type' : `Edit Entity Type #${editingId}`}</h3>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Name</label>
              <input className="form-input" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g. enemy" />
            </div>
            <div className="form-field">
              <label className="form-label">Display Name</label>
              <input className="form-input" value={formData.display_name} onChange={e => setFormData(p => ({ ...p, display_name: e.target.value }))} placeholder="e.g. Enemy" />
            </div>
            <div className="form-field form-field--full">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="form-field">
              <label className="form-label">Color</label>
              <div className="cls-color-input-row">
                <input type="color" value={formData.color_hex} onChange={e => setFormData(p => ({ ...p, color_hex: e.target.value }))} />
                <input className="form-input" type="text" value={formData.color_hex} onChange={e => setFormData(p => ({ ...p, color_hex: e.target.value }))} placeholder="#RRGGBB" />
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">Sort Order</label>
              <input className="form-input" type="number" value={formData.sort_order} onChange={e => setFormData(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
            </div>
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
