import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'

interface Tag {
  id: number
  value: string
  canonical_value: string | null
  category: string
  beat_id: number
  beat_context?: string
}

interface Analytics {
  total_tags: number
  total_beats: number
  orphan_beat_count: number
  categories: Record<string, number>
}

export default function SemanticTagManager() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50

  const [filterCategory, setFilterCategory] = useState('')
  const [searchText, setSearchText] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)

  const [selected, setSelected] = useState<Tag | null>(null)
  const [editForm, setEditForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)

  // Rename form
  const [showRename, setShowRename] = useState(false)
  const [renameCategory, setRenameCategory] = useState('')
  const [renameOld, setRenameOld] = useState('')
  const [renameNew, setRenameNew] = useState('')

  // Bulk add
  const [showBulk, setShowBulk] = useState(false)
  const [bulkBeatId, setBulkBeatId] = useState('')
  const [bulkCategory, setBulkCategory] = useState('general')
  const [bulkValues, setBulkValues] = useState('')

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/content/semantic-tags/analytics')
      if (res.ok) {
        const data = await res.json()
        setAnalytics(data)
        if (data.categories) setCategories(Object.keys(data.categories))
      }
    } catch { /* ignore */ }
  }, [])

  const fetchTags = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
      if (searchText) params.set('search', searchText)
      if (filterCategory) params.set('category', filterCategory)
      const res = await api.get(`/api/admin/content/semantic-tags?${params}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setTags(data)
          setTotal(data.length)
        } else {
          setTags(data.items || [])
          setTotal(data.total || data.items?.length || 0)
        }
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [page, searchText, filterCategory])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])
  useEffect(() => { fetchTags() }, [fetchTags])

  const handleEdit = (tag: Tag) => {
    setSelected(tag)
    setEditForm({ ...tag })
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const res = await api.patch(`/api/admin/content/semantic-tags/${selected.id}`, {
        value: editForm.value,
        canonical_value: editForm.canonical_value || null,
        category: editForm.category,
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Tag updated' })
        setSelected(null)
        await fetchTags()
        await fetchAnalytics()
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to update' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setSaving(false)
  }

  const handleDelete = async (id: number) => {
    try {
      const res = await api.delete(`/api/admin/content/semantic-tags/${id}`)
      if (res.ok) {
        setMessage({ type: 'success', text: 'Tag deleted' })
        await fetchTags()
        await fetchAnalytics()
      }
    } catch { /* ignore */ }
  }

  const handleRename = async () => {
    if (!renameCategory || !renameOld || !renameNew) return
    setSaving(true)
    try {
      const res = await api.patch('/api/admin/content/semantic-tags/rename', {
        category: renameCategory,
        old_value: renameOld,
        new_value: renameNew,
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Tags renamed' })
        setShowRename(false)
        setRenameOld('')
        setRenameNew('')
        await fetchTags()
        await fetchAnalytics()
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to rename' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setSaving(false)
  }

  const handleBulkAdd = async () => {
    if (!bulkBeatId || !bulkValues.trim()) return
    setSaving(true)
    try {
      const values = bulkValues.split('\n').map(v => v.trim()).filter(Boolean)
      const res = await api.post('/api/admin/content/semantic-tags/bulk', {
        beat_id: Number(bulkBeatId),
        category: bulkCategory,
        values,
      })
      if (res.ok) {
        setMessage({ type: 'success', text: `Added ${values.length} tags` })
        setShowBulk(false)
        setBulkValues('')
        await fetchTags()
        await fetchAnalytics()
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to add' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setSaving(false)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="editor-panel">
      {message && (
        <div className={`editor-message editor-message--${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>x</button>
        </div>
      )}

      {/* Analytics Cards */}
      {analytics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', marginBottom: '16px' }}>
          <div style={{ padding: '12px', background: 'var(--color-bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-info)' }}>{analytics.total_tags}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total Tags</div>
          </div>
          <div style={{ padding: '12px', background: 'var(--color-bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-success)' }}>{analytics.total_beats}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Tagged Beats</div>
          </div>
          <div style={{ padding: '12px', background: 'var(--color-bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: analytics.orphan_beat_count > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>{analytics.orphan_beat_count}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Orphan Beats</div>
          </div>
          <div style={{ padding: '12px', background: 'var(--color-bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-secondary)' }}>{categories.length}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Categories</div>
          </div>
          {Object.entries(analytics.categories || {}).map(([cat, count]) => (
            <div key={cat} style={{ padding: '12px', background: 'var(--color-bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{count}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{cat}</div>
            </div>
          ))}
        </div>
      )}

      <div className="editor-filters">
        <input className="form-input" placeholder="Search tags..." value={searchText} onChange={e => { setSearchText(e.target.value); setPage(1) }} style={{ width: 200 }} />
        <select className="form-select" value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1) }} style={{ width: 150 }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="editor-toolbar">
        <div className="editor-toolbar-left">
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{total} tags</span>
        </div>
        <div className="editor-toolbar-right">
          <button className={`btn btn-sm ${showRename ? 'btn-warning' : ''}`} onClick={() => setShowRename(!showRename)}>Rename</button>
          <button className={`btn btn-sm ${showBulk ? 'btn-primary' : ''}`} onClick={() => setShowBulk(!showBulk)}>Bulk Add</button>
        </div>
      </div>

      {/* Rename Form */}
      {showRename && (
        <div className="detail-panel" style={{ marginBottom: '12px' }}>
          <h3>Rename Tags</h3>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Category</label>
              <select className="form-select" value={renameCategory} onChange={e => setRenameCategory(e.target.value)}>
                <option value="">-- Select --</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Old Value</label>
              <input className="form-input" value={renameOld} onChange={e => setRenameOld(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">New Value</label>
              <input className="form-input" value={renameNew} onChange={e => setRenameNew(e.target.value)} />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn" onClick={() => setShowRename(false)}>Cancel</button>
            <button className="btn btn-warning" onClick={handleRename} disabled={saving}>Rename All</button>
          </div>
        </div>
      )}

      {/* Bulk Add Form */}
      {showBulk && (
        <div className="detail-panel" style={{ marginBottom: '12px' }}>
          <h3>Bulk Add Tags</h3>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Beat ID</label>
              <input className="form-input" type="number" value={bulkBeatId} onChange={e => setBulkBeatId(e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Category</label>
              <input className="form-input" value={bulkCategory} onChange={e => setBulkCategory(e.target.value)} list="bulk-categories" />
              <datalist id="bulk-categories">
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="form-field form-field--full">
              <label className="form-label">Values (one per line)</label>
              <textarea className="form-textarea" value={bulkValues} onChange={e => setBulkValues(e.target.value)} rows={6} />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn" onClick={() => setShowBulk(false)}>Cancel</button>
            <button className="btn btn-success" onClick={handleBulkAdd} disabled={saving}>Add Tags</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="editor-loading">Loading tags...</div>
      ) : tags.length === 0 ? (
        <div className="editor-empty">No tags found.</div>
      ) : (
        <>
          <div className="editor-table-wrapper">
            <table className="editor-table">
              <thead>
                <tr>
                  <th>Value</th>
                  <th>Canonical</th>
                  <th>Category</th>
                  <th>Beat</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tags.map(tag => (
                  <tr key={tag.id} className={selected?.id === tag.id ? 'row-selected' : ''}>
                    <td>
                      {selected?.id === tag.id ? (
                        <input className="form-input" value={editForm.value || ''} onChange={e => setEditForm(p => ({ ...p, value: e.target.value }))} style={{ width: 120 }} />
                      ) : (
                        tag.value
                      )}
                    </td>
                    <td>
                      {selected?.id === tag.id ? (
                        <input className="form-input" value={editForm.canonical_value || ''} onChange={e => setEditForm(p => ({ ...p, canonical_value: e.target.value }))} style={{ width: 120 }} />
                      ) : (
                        tag.canonical_value || '--'
                      )}
                    </td>
                    <td>
                      {selected?.id === tag.id ? (
                        <input className="form-input" value={editForm.category || ''} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))} style={{ width: 100 }} />
                      ) : (
                        <span className="badge badge--info">{tag.category}</span>
                      )}
                    </td>
                    <td className="truncated">{tag.beat_context || `Beat #${tag.beat_id}`}</td>
                    <td>
                      {selected?.id === tag.id ? (
                        <>
                          <button className="btn btn-sm btn-success" onClick={handleSave} disabled={saving}>Save</button>
                          <button className="btn btn-sm" onClick={() => setSelected(null)} style={{ marginLeft: 4 }}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-sm btn-primary" onClick={() => handleEdit(tag)}>Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(tag.id)} style={{ marginLeft: 4 }}>Delete</button>
                        </>
                      )}
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
    </div>
  )
}
