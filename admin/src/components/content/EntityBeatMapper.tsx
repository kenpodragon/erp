import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import EntityPicker from './shared/EntityPicker'

interface EntityBeatMapping {
  id: number
  entity_id: number
  beat_id: number
  entity_name: string
  role: string | null
  is_primary: boolean
  beat_context: string | null
}

interface EntityBeatMapperProps {
  beatId: number
}

export default function EntityBeatMapper({ beatId }: EntityBeatMapperProps) {
  const [mappings, setMappings] = useState<EntityBeatMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Record<string, any>>({})

  const fetchMappings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/admin/content/entity-beats?beat_id=${beatId}`)
      if (res.ok) {
        const data = await res.json()
        setMappings(Array.isArray(data) ? data : data.items || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [beatId])

  useEffect(() => { fetchMappings() }, [fetchMappings])

  const addEntity = async (entityId: number | null) => {
    if (!entityId) return
    try {
      const res = await api.post('/api/admin/content/entity-beats', { entity_id: entityId, beat_id: beatId, is_primary: false })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Entity added' })
        fetchMappings()
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to add' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
  }

  const removeMapping = async (id: number) => {
    try {
      const res = await api.delete(`/api/admin/content/entity-beats/${id}`)
      if (res.ok) fetchMappings()
    } catch { /* ignore */ }
  }

  const saveEdit = async () => {
    if (!editId) return
    try {
      const res = await api.patch(`/api/admin/content/entity-beats/${editId}`, editForm)
      if (res.ok) {
        setEditId(null)
        fetchMappings()
      }
    } catch { /* ignore */ }
  }

  if (loading) return <div className="editor-loading" style={{ padding: '12px' }}>Loading...</div>

  return (
    <div>
      {message && (
        <div className={`editor-message editor-message--${message.type}`} style={{ marginBottom: '8px' }}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>x</button>
        </div>
      )}

      {mappings.length > 0 && (
        <table className="editor-table" style={{ marginBottom: '8px' }}>
          <thead>
            <tr>
              <th>Entity</th>
              <th>Role</th>
              <th>Primary</th>
              <th>Context</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map(m => (
              <tr key={m.id}>
                <td>{m.entity_name}</td>
                <td>
                  {editId === m.id ? (
                    <input className="form-input" value={editForm.role || ''} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))} style={{ width: 100 }} />
                  ) : (
                    m.role || '--'
                  )}
                </td>
                <td>
                  {editId === m.id ? (
                    <input type="checkbox" checked={!!editForm.is_primary} onChange={e => setEditForm(p => ({ ...p, is_primary: e.target.checked }))} />
                  ) : (
                    m.is_primary ? 'Yes' : 'No'
                  )}
                </td>
                <td>
                  {editId === m.id ? (
                    <input className="form-input" value={editForm.beat_context || ''} onChange={e => setEditForm(p => ({ ...p, beat_context: e.target.value }))} style={{ width: 150 }} />
                  ) : (
                    <span className="truncated">{m.beat_context || '--'}</span>
                  )}
                </td>
                <td>
                  {editId === m.id ? (
                    <>
                      <button className="btn btn-sm btn-success" onClick={saveEdit}>Save</button>
                      <button className="btn btn-sm" onClick={() => setEditId(null)} style={{ marginLeft: 4 }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-sm btn-primary" onClick={() => { setEditId(m.id); setEditForm({ role: m.role, is_primary: m.is_primary, beat_context: m.beat_context }) }}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => removeMapping(m.id)} style={{ marginLeft: 4 }}>Remove</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <EntityPicker value={null} onChange={id => addEntity(id)} placeholder="Add entity to beat..." />
    </div>
  )
}
