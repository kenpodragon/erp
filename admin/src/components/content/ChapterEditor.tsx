import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import AtmospherePicker from './shared/AtmospherePicker'
import DeleteConfirmDialog from './shared/DeleteConfirmDialog'

interface Chapter {
  id: number
  book_id: number
  chapter_number: number
  sort_order: number
  title: string
  processing_status: string
  recommended_level: number | null
  min_level: number | null
  atmosphere_id: number | null
  transition_lore_text: string | null
  raw_text: string | null
  scenes_count?: number
  book_title?: string
}

interface BookOption {
  id: number
  book_number: number
  title: string
}

interface ChapterEditorProps {
  initialBookId?: number
  onNavigate?: (tab: string, params?: Record<string, string>) => void
}

const STATUS_OPTIONS = ['pending', 'processing', 'completed', 'error', 'review']

export default function ChapterEditor({ initialBookId, onNavigate }: ChapterEditorProps) {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [books, setBooks] = useState<BookOption[]>([])
  const [loading, setLoading] = useState(false)
  const [filterBookId, setFilterBookId] = useState<number | undefined>(initialBookId)
  const [selected, setSelected] = useState<Chapter | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Chapter | null>(null)
  const [showRawText, setShowRawText] = useState(false)

  const fetchBooks = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/content/books')
      if (res.ok) {
        const data = await res.json()
        setBooks((Array.isArray(data) ? data : data.items || []).map((b: any) => ({
          id: b.id, book_number: b.book_number, title: b.title
        })))
      }
    } catch { /* ignore */ }
  }, [])

  const fetchChapters = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterBookId) params.set('book_id', String(filterBookId))
      const res = await api.get(`/api/admin/content/chapters?${params}`)
      if (res.ok) {
        const data = await res.json()
        setChapters(Array.isArray(data) ? data : data.items || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [filterBookId])

  useEffect(() => { fetchBooks() }, [fetchBooks])
  useEffect(() => { fetchChapters() }, [fetchChapters])

  const handleSelect = (ch: Chapter) => {
    setSelected(ch)
    setForm({ ...ch })
    setCreating(false)
    setShowRawText(false)
  }

  const handleCreate = () => {
    setSelected(null)
    setCreating(true)
    setForm({ book_id: filterBookId || '', chapter_number: 1, sort_order: 0, title: '', processing_status: 'pending' })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        book_id: Number(form.book_id),
        chapter_number: Number(form.chapter_number),
        sort_order: Number(form.sort_order) || 0,
        title: form.title,
        processing_status: form.processing_status || 'pending',
        recommended_level: form.recommended_level ? Number(form.recommended_level) : null,
        min_level: form.min_level ? Number(form.min_level) : null,
        atmosphere_id: form.atmosphere_id || null,
        transition_lore_text: form.transition_lore_text || null,
      }

      if (creating) {
        const res = await api.post('/api/admin/content/chapters', body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Chapter created' })
          setCreating(false)
          await fetchChapters()
        } else {
          const err = await res.json().catch(() => ({}))
          setMessage({ type: 'error', text: err.detail || 'Failed to create' })
        }
      } else if (selected) {
        const res = await api.patch(`/api/admin/content/chapters/${selected.id}`, body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Chapter updated' })
          setSelected(null)
          await fetchChapters()
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
      const res = await api.delete(`/api/admin/content/chapters/${deleteTarget.id}`)
      if (res.ok) {
        setMessage({ type: 'success', text: 'Chapter deleted' })
        setSelected(null)
        await fetchChapters()
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to delete' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setDeleteTarget(null)
  }

  return (
    <div className="editor-panel">
      {message && (
        <div className={`editor-message editor-message--${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>x</button>
        </div>
      )}

      <div className="editor-filters">
        <select className="form-select" value={filterBookId || ''} onChange={e => setFilterBookId(e.target.value ? Number(e.target.value) : undefined)} style={{ width: 220 }}>
          <option value="">All Books</option>
          {books.map(b => <option key={b.id} value={b.id}>Book {b.book_number}: {b.title}</option>)}
        </select>
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{chapters.length} chapters</span>
      </div>

      <div className="editor-toolbar">
        <div className="editor-toolbar-left" />
        <div className="editor-toolbar-right">
          <button className="btn btn-success" onClick={handleCreate}>+ New Chapter</button>
        </div>
      </div>

      {loading ? (
        <div className="editor-loading">Loading chapters...</div>
      ) : chapters.length === 0 ? (
        <div className="editor-empty">No chapters found.</div>
      ) : (
        <div className="editor-table-wrapper">
          <table className="editor-table">
            <thead>
              <tr>
                <th>Ch #</th>
                <th>Title</th>
                <th>Book</th>
                <th>Scenes</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {chapters.map(ch => (
                <tr key={ch.id} className={selected?.id === ch.id ? 'row-selected' : ''}>
                  <td>{ch.chapter_number}</td>
                  <td>{ch.title}</td>
                  <td>{ch.book_title || books.find(b => b.id === ch.book_id)?.title || ch.book_id}</td>
                  <td>{ch.scenes_count ?? '--'}</td>
                  <td><span className={`badge badge--${ch.processing_status === 'completed' ? 'success' : ch.processing_status === 'error' ? 'error' : 'warning'}`}>{ch.processing_status}</span></td>
                  <td>
                    <button className="btn btn-sm btn-primary" onClick={() => handleSelect(ch)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(ch)} style={{ marginLeft: 4 }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(selected || creating) && (
        <div className="detail-panel">
          <h3>{creating ? 'Create Chapter' : `Edit Chapter #${selected?.id}`}</h3>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Book</label>
              <select className="form-select" value={form.book_id || ''} onChange={e => setForm(p => ({ ...p, book_id: Number(e.target.value) }))}>
                <option value="">-- Select Book --</option>
                {books.map(b => <option key={b.id} value={b.id}>Book {b.book_number}: {b.title}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Chapter Number</label>
              <input className="form-input" type="number" value={form.chapter_number ?? ''} onChange={e => setForm(p => ({ ...p, chapter_number: Number(e.target.value) }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Sort Order</label>
              <input className="form-input" type="number" value={form.sort_order ?? 0} onChange={e => setForm(p => ({ ...p, sort_order: Number(e.target.value) }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Title</label>
              <input className="form-input" value={form.title || ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Processing Status</label>
              <select className="form-select" value={form.processing_status || 'pending'} onChange={e => setForm(p => ({ ...p, processing_status: e.target.value }))}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Recommended Level</label>
              <input className="form-input" type="number" value={form.recommended_level ?? ''} onChange={e => setForm(p => ({ ...p, recommended_level: e.target.value }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Min Level</label>
              <input className="form-input" type="number" value={form.min_level ?? ''} onChange={e => setForm(p => ({ ...p, min_level: e.target.value }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Atmosphere</label>
              <AtmospherePicker value={form.atmosphere_id} onChange={id => setForm(p => ({ ...p, atmosphere_id: id }))} />
            </div>
            <div className="form-field form-field--full">
              <label className="form-label">Transition Lore Text</label>
              <textarea className="form-textarea" value={form.transition_lore_text || ''} onChange={e => setForm(p => ({ ...p, transition_lore_text: e.target.value }))} rows={4} />
            </div>
          </div>

          {!creating && form.raw_text && (
            <div className="section-collapsible" style={{ marginTop: '12px' }}>
              <button className="section-collapsible-header" onClick={() => setShowRawText(!showRawText)}>
                <span>Raw Text</span>
                <span>{showRawText ? '[-]' : '[+]'}</span>
              </button>
              {showRawText && (
                <div className="section-collapsible-body">
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', color: 'var(--color-text-muted)', maxHeight: '300px', overflow: 'auto', margin: 0 }}>
                    {form.raw_text}
                  </pre>
                </div>
              )}
            </div>
          )}

          {!creating && (
            <div style={{ marginTop: '12px' }}>
              <button className="link-btn" onClick={() => onNavigate?.('scenes', { chapter_id: String(selected!.id), book_id: String(selected!.book_id) })}>
                View Scenes &rarr;
              </button>
            </div>
          )}

          <div className="form-actions">
            <button className="btn" onClick={() => { setSelected(null); setCreating(false) }}>Cancel</button>
            <button className="btn btn-success" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          resourceType="Chapter"
          resourceName={deleteTarget.title}
          childCounts={{ scenes: deleteTarget.scenes_count || 0 }}
          isBlocked={(deleteTarget.scenes_count || 0) > 0}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
