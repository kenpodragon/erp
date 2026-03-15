import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'

interface DifficultyCurve {
  id: number
  name: string
  description: string | null
  curve_data: Record<string, CurveEntry>
  is_default: boolean
  sort_order: number
  book_count: number
  preset_count: number
  created_at: string | null
  updated_at: string | null
}

interface CurveEntry {
  hp: number
  gold: number
  wave_density: number
  spawn_speed: number
}

interface BookOption {
  id: number
  title: string
  difficulty_curve_id: number | null
}

const DEFAULT_ENTRY: CurveEntry = { hp: 1.0, gold: 1.0, wave_density: 1.0, spawn_speed: 1.0 }
const CURVE_DIMS = ['hp', 'gold', 'wave_density', 'spawn_speed'] as const
const DIM_LABELS: Record<string, string> = {
  hp: 'HP',
  gold: 'Gold',
  wave_density: 'Wave Density',
  spawn_speed: 'Spawn Speed',
}

export default function DifficultyCurveManager() {
  const [curves, setCurves] = useState<DifficultyCurve[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<DifficultyCurve | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})
  const [curveData, setCurveData] = useState<Record<string, CurveEntry>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)

  // Books for assignment
  const [books, setBooks] = useState<BookOption[]>([])
  const [assignBookId, setAssignBookId] = useState<number | null>(null)

  const fetchCurves = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/scaling/difficulty-curves')
      if (res.ok) {
        const data = await res.json()
        setCurves(data.items || [])
        setTotal(data.total || 0)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  const fetchBooks = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/content/books')
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : data.items || []
        setBooks(items.map((b: any) => ({ id: b.id, title: b.title, difficulty_curve_id: b.difficulty_curve_id ?? null })))
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchCurves(); fetchBooks() }, [fetchCurves, fetchBooks])

  const handleSelect = (c: DifficultyCurve) => {
    setSelected(c)
    setCreating(false)
    setForm({ name: c.name, description: c.description || '', is_default: c.is_default, sort_order: c.sort_order })
    setCurveData(c.curve_data && Object.keys(c.curve_data).length > 0
      ? JSON.parse(JSON.stringify(c.curve_data))
      : { '1': { ...DEFAULT_ENTRY } })
    setMessage(null)
  }

  const handleCreate = () => {
    setSelected(null)
    setCreating(true)
    setForm({ name: '', description: '', is_default: false, sort_order: 0 })
    setCurveData({ '1': { ...DEFAULT_ENTRY } })
    setMessage(null)
  }

  const handleCancel = () => {
    setSelected(null)
    setCreating(false)
    setForm({})
    setCurveData({})
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        name: form.name,
        description: form.description || null,
        is_default: form.is_default ?? false,
        sort_order: form.sort_order ?? 0,
        curve_data: curveData,
      }

      if (creating) {
        const res = await api.post('/api/admin/scaling/difficulty-curves', body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Difficulty curve created' })
          setCreating(false)
          setForm({})
          setCurveData({})
          await fetchCurves()
        } else {
          const err = await res.json().catch(() => ({}))
          setMessage({ type: 'error', text: err.detail || 'Failed to create' })
        }
      } else if (selected) {
        const res = await api.patch(`/api/admin/scaling/difficulty-curves/${selected.id}`, body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Difficulty curve updated' })
          await fetchCurves()
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

  const handleDelete = async (c: DifficultyCurve) => {
    if (!window.confirm(`Delete difficulty curve "${c.name}"? This cannot be undone.`)) return
    try {
      const res = await api.delete(`/api/admin/scaling/difficulty-curves/${c.id}`)
      if (res.ok || res.status === 204) {
        setMessage({ type: 'success', text: 'Difficulty curve deleted' })
        if (selected?.id === c.id) handleCancel()
        await fetchCurves()
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to delete' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
  }

  // --- Curve Data helpers ---
  const sortedKeys = Object.keys(curveData).sort((a, b) => parseInt(a) - parseInt(b))

  const addChapter = () => {
    const maxKey = sortedKeys.length > 0 ? Math.max(...sortedKeys.map(Number)) : 0
    const next = String(maxKey + 1)
    setCurveData(prev => ({ ...prev, [next]: { ...DEFAULT_ENTRY } }))
  }

  const removeLastChapter = () => {
    if (sortedKeys.length <= 1) return
    const last = sortedKeys[sortedKeys.length - 1]
    setCurveData(prev => {
      const copy = { ...prev }
      delete copy[last]
      return copy
    })
  }

  const updateCurveValue = (key: string, dim: string, value: number) => {
    setCurveData(prev => ({
      ...prev,
      [key]: { ...prev[key], [dim]: value },
    }))
  }

  // --- Book Assignment helpers ---
  const assignedBooks = selected
    ? books.filter(b => b.difficulty_curve_id === selected.id)
    : []
  const unassignedBooks = selected
    ? books.filter(b => b.difficulty_curve_id !== selected.id)
    : books

  const handleAssignBook = async () => {
    if (!selected || !assignBookId) return
    try {
      const res = await api.patch(`/api/admin/scaling/difficulty-curves/${selected.id}/assign-book`, {
        book_id: assignBookId,
        unassign: false,
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Book assigned to curve' })
        setAssignBookId(null)
        await fetchBooks()
        await fetchCurves()
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to assign book' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
  }

  const handleUnassignBook = async (bookId: number) => {
    if (!selected) return
    try {
      const res = await api.patch(`/api/admin/scaling/difficulty-curves/${selected.id}/assign-book`, {
        book_id: bookId,
        unassign: true,
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Book unassigned from curve' })
        await fetchBooks()
        await fetchCurves()
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to unassign book' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
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
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {total} difficulty curve{total !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="editor-toolbar-right">
          <button className="btn btn-success" onClick={handleCreate}>+ New Curve</button>
        </div>
      </div>

      {loading ? (
        <div className="editor-loading">Loading difficulty curves...</div>
      ) : curves.length === 0 ? (
        <div className="editor-empty">No difficulty curves found. Create one to get started.</div>
      ) : (
        <div className="editor-table-wrapper">
          <table className="editor-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Default</th>
                <th>Books</th>
                <th>Presets</th>
                <th>Chapters</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {curves.map(c => (
                <tr key={c.id} className={selected?.id === c.id ? 'row-selected' : ''}>
                  <td>{c.name}</td>
                  <td>{c.description ? (c.description.length > 40 ? c.description.substring(0, 40) + '...' : c.description) : '--'}</td>
                  <td>{c.is_default ? '\u2605' : ''}</td>
                  <td>{c.book_count}</td>
                  <td>{c.preset_count}</td>
                  <td>{c.curve_data ? Object.keys(c.curve_data).length : 0}</td>
                  <td>
                    <button className="btn btn-sm btn-primary" onClick={() => handleSelect(c)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c)} style={{ marginLeft: 4 }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(selected || creating) && (
        <div className="detail-panel">
          <h3>{creating ? 'Create Difficulty Curve' : `Edit Difficulty Curve #${selected?.id}`}</h3>

          {/* --- Basic Info --- */}
          <div className="section-header">Basic Info</div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Name</label>
              <input
                className="form-input"
                value={form.name || ''}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Linear Progression"
              />
            </div>
            <div className="form-field">
              <label className="form-label">Sort Order</label>
              <input
                className="form-input"
                type="number"
                value={form.sort_order ?? 0}
                onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
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
            <div className="form-field">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.is_default ?? false}
                  onChange={e => setForm(p => ({ ...p, is_default: e.target.checked }))}
                />
                Default Curve
              </label>
            </div>
          </div>

          {/* --- Curve Data Table --- */}
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Curve Data ({sortedKeys.length} chapter{sortedKeys.length !== 1 ? 's' : ''})</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm btn-success" onClick={addChapter}>+ Add Chapter</button>
              <button
                className="btn btn-sm btn-danger"
                onClick={removeLastChapter}
                disabled={sortedKeys.length <= 1}
              >
                Remove Last
              </button>
            </div>
          </div>

          <div className="editor-table-wrapper" style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table className="editor-table">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>Chapter</th>
                  {CURVE_DIMS.map(dim => (
                    <th key={dim}>{DIM_LABELS[dim]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedKeys.map(key => (
                  <tr key={key}>
                    <td style={{ fontWeight: 600, textAlign: 'center' }}>{key}</td>
                    {CURVE_DIMS.map(dim => (
                      <td key={dim}>
                        <input
                          className="form-input"
                          type="number"
                          step={0.1}
                          min={0.01}
                          value={curveData[key]?.[dim] ?? 1.0}
                          onChange={e => updateCurveValue(key, dim, parseFloat(e.target.value) || 1.0)}
                          style={{ width: '100%', padding: '4px 6px', fontSize: '13px' }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="form-actions">
            <button className="btn" onClick={handleCancel}>Cancel</button>
            <button className="btn btn-success" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>

          {/* --- Book Assignments (edit mode only) --- */}
          {selected && (
            <>
              <div className="section-header" style={{ marginTop: 24 }}>Assigned Books</div>
              {assignedBooks.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>No books assigned to this curve.</p>
              ) : (
                <div className="editor-table-wrapper">
                  <table className="editor-table">
                    <thead>
                      <tr>
                        <th>Book</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignedBooks.map(b => (
                        <tr key={b.id}>
                          <td>{b.title}</td>
                          <td>
                            <button className="btn btn-sm btn-danger" onClick={() => handleUnassignBook(b.id)}>Unassign</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 8 }}>
                <div className="form-field" style={{ minWidth: 220 }}>
                  <label className="form-label">Add Book</label>
                  <select
                    className="form-select"
                    value={assignBookId ?? ''}
                    onChange={e => setAssignBookId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">-- select book --</option>
                    {unassignedBooks.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.title}{b.difficulty_curve_id ? ` (curve #${b.difficulty_curve_id})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleAssignBook}
                  disabled={!assignBookId}
                  style={{ height: 36 }}
                >
                  Assign Book
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
