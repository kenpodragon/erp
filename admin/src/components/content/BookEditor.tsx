import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import AtmospherePicker from './shared/AtmospherePicker'
import DeleteConfirmDialog from './shared/DeleteConfirmDialog'

interface Book {
  id: number
  book_number: number
  title: string
  source_file: string | null
  recommended_level: number | null
  min_level: number | null
  atmosphere_id: number | null
  transition_lore_text: string | null
  chapters_count?: number
  scenes_count?: number
}

interface BookEditorProps {
  onNavigate?: (tab: string, params?: Record<string, string>) => void
}

export default function BookEditor({ onNavigate }: BookEditorProps) {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Book | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null)

  const fetchBooks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/content/books')
      if (res.ok) {
        const data = await res.json()
        setBooks(Array.isArray(data) ? data : data.items || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  const handleSelect = (book: Book) => {
    setSelected(book)
    setForm({ ...book })
    setCreating(false)
  }

  const handleCreate = () => {
    setSelected(null)
    setCreating(true)
    setForm({ book_number: (books.length > 0 ? Math.max(...books.map(b => b.book_number)) + 1 : 1), title: '' })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        title: form.title,
        book_number: form.book_number,
        source_file: form.source_file || null,
        recommended_level: form.recommended_level ? Number(form.recommended_level) : null,
        min_level: form.min_level ? Number(form.min_level) : null,
        atmosphere_id: form.atmosphere_id || null,
        transition_lore_text: form.transition_lore_text || null,
      }

      if (creating) {
        const res = await api.post('/api/admin/content/books', body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Book created' })
          setCreating(false)
          await fetchBooks()
        } else {
          const err = await res.json().catch(() => ({}))
          setMessage({ type: 'error', text: err.detail || 'Failed to create book' })
        }
      } else if (selected) {
        const res = await api.patch(`/api/admin/content/books/${selected.id}`, body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Book updated' })
          setSelected(null)
          await fetchBooks()
        } else {
          const err = await res.json().catch(() => ({}))
          setMessage({ type: 'error', text: err.detail || 'Failed to update book' })
        }
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setSaving(false)
  }

  const handleDelete = async (book: Book) => {
    setDeleteTarget(book)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await api.delete(`/api/admin/content/books/${deleteTarget.id}`)
      if (res.ok) {
        setMessage({ type: 'success', text: 'Book deleted' })
        setSelected(null)
        await fetchBooks()
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

      <div className="editor-toolbar">
        <div className="editor-toolbar-left">
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{books.length} books</span>
        </div>
        <div className="editor-toolbar-right">
          <button className="btn btn-success" onClick={handleCreate}>+ New Book</button>
        </div>
      </div>

      {loading ? (
        <div className="editor-loading">Loading books...</div>
      ) : books.length === 0 ? (
        <div className="editor-empty">No books found. Create one to get started.</div>
      ) : (
        <div className="editor-table-wrapper">
          <table className="editor-table">
            <thead>
              <tr>
                <th>Book #</th>
                <th>Title</th>
                <th>Chapters</th>
                <th>Scenes</th>
                <th>Atmosphere</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {books.map(book => (
                <tr key={book.id} className={selected?.id === book.id ? 'row-selected' : ''}>
                  <td>{book.book_number}</td>
                  <td>{book.title}</td>
                  <td>{book.chapters_count ?? '--'}</td>
                  <td>{book.scenes_count ?? '--'}</td>
                  <td>{book.atmosphere_id || '--'}</td>
                  <td>
                    <button className="btn btn-sm btn-primary" onClick={() => handleSelect(book)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(book)} style={{ marginLeft: 4 }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(selected || creating) && (
        <div className="detail-panel">
          <h3>{creating ? 'Create Book' : `Edit Book #${selected?.id}`}</h3>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Title</label>
              <input className="form-input" value={form.title || ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Book Number</label>
              <input className="form-input" type="number" value={form.book_number ?? ''} onChange={e => setForm(p => ({ ...p, book_number: Number(e.target.value) }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Source File</label>
              <input className="form-input" value={form.source_file || ''} onChange={e => setForm(p => ({ ...p, source_file: e.target.value }))} />
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

          {!creating && (
            <div style={{ marginTop: '12px' }}>
              <button className="link-btn" onClick={() => onNavigate?.('chapters', { book_id: String(selected!.id) })}>
                View Chapters &rarr;
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
          resourceType="Book"
          resourceName={deleteTarget.title}
          childCounts={{ chapters: deleteTarget.chapters_count || 0, scenes: deleteTarget.scenes_count || 0 }}
          isBlocked={(deleteTarget.chapters_count || 0) > 0}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
