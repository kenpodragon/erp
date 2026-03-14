import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'

interface EntityFamilyItem {
  id: number
  name: string
  display_name: string
  description: string | null
  icon_key: string | null
  lore_reference: string | null
  base_stat_template: Record<string, number> | null
  sort_order: number
  entity_count: number
}

interface FormData {
  name: string
  display_name: string
  description: string
  icon_key: string
  lore_reference: string
  sort_order: number
  base_stat_template: {
    strength: number
    agility: number
    intelligence: number
    base_hp: number
    base_gold: number
  }
}

const EMPTY_FORM: FormData = {
  name: '',
  display_name: '',
  description: '',
  icon_key: '',
  lore_reference: '',
  sort_order: 0,
  base_stat_template: {
    strength: 0,
    agility: 0,
    intelligence: 0,
    base_hp: 0,
    base_gold: 0,
  },
}

const STAT_KEYS = ['strength', 'agility', 'intelligence', 'base_hp', 'base_gold'] as const

export default function EntityFamilyManager() {
  const [families, setFamilies] = useState<EntityFamilyItem[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50

  const [searchText, setSearchText] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)

  const fetchFamilies = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
      if (searchText) params.set('search', searchText)
      const res = await api.get(`/api/admin/classification/entity-families?${params}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setFamilies(data)
          setTotal(data.length)
        } else {
          setFamilies(data.items || [])
          setTotal(data.total || data.items?.length || 0)
        }
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [page, searchText])

  useEffect(() => { fetchFamilies() }, [fetchFamilies])

  const handleEdit = (item: EntityFamilyItem) => {
    setEditingId(item.id)
    setCreating(false)
    const tpl = item.base_stat_template || {}
    setFormData({
      name: item.name,
      display_name: item.display_name,
      description: item.description || '',
      icon_key: item.icon_key || '',
      lore_reference: item.lore_reference || '',
      sort_order: item.sort_order,
      base_stat_template: {
        strength: tpl.strength ?? 0,
        agility: tpl.agility ?? 0,
        intelligence: tpl.intelligence ?? 0,
        base_hp: tpl.base_hp ?? 0,
        base_gold: tpl.base_gold ?? 0,
      },
    })
  }

  const handleCreate = () => {
    setEditingId(null)
    setCreating(true)
    setFormData({ ...EMPTY_FORM, base_stat_template: { ...EMPTY_FORM.base_stat_template } })
  }

  const handleCancel = () => {
    setEditingId(null)
    setCreating(false)
  }

  const hasTemplateValues = (tpl: FormData['base_stat_template']) =>
    STAT_KEYS.some(k => tpl[k] !== 0)

  const handleSave = async () => {
    setSaving(true)
    try {
      const tpl = hasTemplateValues(formData.base_stat_template)
        ? formData.base_stat_template
        : null

      const body = {
        name: formData.name,
        display_name: formData.display_name,
        description: formData.description || null,
        icon_key: formData.icon_key || null,
        lore_reference: formData.lore_reference || null,
        base_stat_template: tpl,
        sort_order: formData.sort_order,
      }

      if (creating) {
        const res = await api.post('/api/admin/classification/entity-families', body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Family created' })
          setCreating(false)
          await fetchFamilies()
        } else {
          const err = await res.json().catch(() => ({}))
          setMessage({ type: 'error', text: err.detail || 'Failed to create' })
        }
      } else if (editingId !== null) {
        const res = await api.patch(`/api/admin/classification/entity-families/${editingId}`, body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Family updated' })
          setEditingId(null)
          await fetchFamilies()
        } else {
          const err = await res.json().catch(() => ({}))
          setMessage({ type: 'error', text: err.detail || 'Failed to update' })
        }
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setSaving(false)
  }

  const handleDelete = async (item: EntityFamilyItem) => {
    if (item.entity_count > 0) {
      setMessage({ type: 'error', text: `Cannot delete "${item.display_name}" — ${item.entity_count} entities belong to this family. Reassign them first.` })
      return
    }
    if (!window.confirm(`Delete family "${item.display_name}"?`)) return
    try {
      const res = await api.delete(`/api/admin/classification/entity-families/${item.id}`)
      if (res.ok) {
        setMessage({ type: 'success', text: 'Family deleted' })
        if (editingId === item.id) setEditingId(null)
        await fetchFamilies()
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to delete' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const isEditing = creating || editingId !== null

  return (
    <div>
      {message && (
        <div className={`editor-message editor-message--${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>x</button>
        </div>
      )}

      <div className="editor-filters">
        <input
          className="form-input"
          placeholder="Search families..."
          value={searchText}
          onChange={e => { setSearchText(e.target.value); setPage(1) }}
          style={{ width: 250 }}
        />
      </div>

      <div className="editor-toolbar">
        <div className="editor-toolbar-left">
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{total} families</span>
        </div>
        <div className="editor-toolbar-right">
          <button className="btn btn-success" onClick={handleCreate}>+ New Family</button>
        </div>
      </div>

      {loading ? (
        <div className="editor-loading">Loading families...</div>
      ) : families.length === 0 ? (
        <div className="editor-empty">No families found.</div>
      ) : (
        <>
          <div className="editor-table-wrapper">
            <table className="editor-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Display Name</th>
                  <th>Description</th>
                  <th>Template</th>
                  <th>Entities</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {families.map(item => (
                  <tr key={item.id} className={editingId === item.id ? 'row-selected' : ''}>
                    <td>{item.name}</td>
                    <td>{item.display_name}</td>
                    <td className="truncated">{item.description || '--'}</td>
                    <td>
                      {item.base_stat_template ? (
                        <span className="cls-template-yes">&#10003;</span>
                      ) : (
                        <span className="cls-template-no">&#10007;</span>
                      )}
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
          {totalPages > 1 && (
            <div className="editor-pagination">
              <button className="btn btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
              <span>Page {page} of {totalPages}</span>
              <button className="btn btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
            </div>
          )}
        </>
      )}

      {isEditing && (
        <div className="detail-panel">
          <h3>{creating ? 'Create Family' : `Edit Family #${editingId}`}</h3>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Name</label>
              <input className="form-input" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g. undead" />
            </div>
            <div className="form-field">
              <label className="form-label">Display Name</label>
              <input className="form-input" value={formData.display_name} onChange={e => setFormData(p => ({ ...p, display_name: e.target.value }))} placeholder="e.g. Undead" />
            </div>
            <div className="form-field form-field--full">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <div className="form-field">
              <label className="form-label">Icon Key</label>
              <input className="form-input" value={formData.icon_key} onChange={e => setFormData(p => ({ ...p, icon_key: e.target.value }))} placeholder="e.g. skull" />
            </div>
            <div className="form-field">
              <label className="form-label">Sort Order</label>
              <input className="form-input" type="number" value={formData.sort_order} onChange={e => setFormData(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="form-field form-field--full">
              <label className="form-label">Lore Reference</label>
              <textarea className="form-textarea" value={formData.lore_reference} onChange={e => setFormData(p => ({ ...p, lore_reference: e.target.value }))} rows={2} placeholder="Book/chapter references..." />
            </div>
            <div className="form-field form-field--full">
              <label className="form-label">Base Stat Template</label>
              <div className="cls-stat-grid">
                {STAT_KEYS.map(key => (
                  <div className="cls-stat-field" key={key}>
                    <label>{key.replace(/_/g, ' ')}</label>
                    <input
                      type="number"
                      value={formData.base_stat_template[key]}
                      onChange={e => setFormData(p => ({
                        ...p,
                        base_stat_template: {
                          ...p.base_stat_template,
                          [key]: parseFloat(e.target.value) || 0,
                        },
                      }))}
                    />
                  </div>
                ))}
              </div>
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
