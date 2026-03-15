import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'

interface WavePreset {
  id: number
  name: string
  description: string | null
  config: Record<string, any>
  is_default: boolean
  sort_order: number
  assignment_count: number
  created_at: string | null
  updated_at: string | null
}

interface Assignment {
  id: number
  book_id: number | null
  book_title: string | null
  chapter_id: number | null
  chapter_title: string | null
}

interface BookOption {
  id: number
  title: string
  chapters?: { id: number; title: string; chapter_number: number }[]
}

const SPAWN_PATTERNS = ['uniform', 'front_loaded', 'crescendo', 'random']

const DEFAULT_CONFIG: Record<string, any> = {
  max_enemies_per_wave: 5,
  wave_count: 10,
  spawn_interval_ms: 2000,
  scaling_factor: 1.0,
  hp_multiplier: 1.0,
  gold_multiplier: 1.0,
  spawn_pattern: 'uniform',
}

export default function WavePresetManager() {
  const [presets, setPresets] = useState<WavePreset[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<WavePreset | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})
  const [config, setConfig] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)

  // Assignments state
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  const [books, setBooks] = useState<BookOption[]>([])
  const [assignType, setAssignType] = useState<'book' | 'chapter'>('book')
  const [assignBookId, setAssignBookId] = useState<number | null>(null)
  const [assignChapterId, setAssignChapterId] = useState<number | null>(null)

  // Apply to scenes state
  const [applyTarget, setApplyTarget] = useState<'book' | 'chapter'>('book')
  const [applyTargetId, setApplyTargetId] = useState<number | null>(null)
  const [applyOverwrite, setApplyOverwrite] = useState(false)
  const [applying, setApplying] = useState(false)

  const fetchPresets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/scaling/wave-presets')
      if (res.ok) {
        const data = await res.json()
        setPresets(data.items || [])
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
        setBooks(Array.isArray(data) ? data : data.items || [])
      }
    } catch { /* ignore */ }
  }, [])

  const fetchAssignments = useCallback(async (presetId: number) => {
    setLoadingAssignments(true)
    try {
      const res = await api.get(`/api/admin/scaling/wave-presets/${presetId}/assignments`)
      if (res.ok) {
        const data = await res.json()
        setAssignments(data.items || [])
      }
    } catch { /* ignore */ }
    setLoadingAssignments(false)
  }, [])

  useEffect(() => { fetchPresets(); fetchBooks() }, [fetchPresets, fetchBooks])

  const handleSelect = (p: WavePreset) => {
    setSelected(p)
    setCreating(false)
    setForm({ name: p.name, description: p.description || '', is_default: p.is_default, sort_order: p.sort_order })
    setConfig({ ...DEFAULT_CONFIG, ...p.config })
    setMessage(null)
    fetchAssignments(p.id)
  }

  const handleCreate = () => {
    setSelected(null)
    setCreating(true)
    setForm({ name: '', description: '', is_default: false, sort_order: 0 })
    setConfig({ ...DEFAULT_CONFIG })
    setAssignments([])
    setMessage(null)
  }

  const handleCancel = () => {
    setSelected(null)
    setCreating(false)
    setForm({})
    setConfig({})
    setAssignments([])
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        name: form.name,
        description: form.description || null,
        is_default: form.is_default ?? false,
        sort_order: form.sort_order ?? 0,
        config,
      }

      if (creating) {
        const res = await api.post('/api/admin/scaling/wave-presets', body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Wave preset created' })
          setCreating(false)
          setForm({})
          setConfig({})
          await fetchPresets()
        } else {
          const err = await res.json().catch(() => ({}))
          setMessage({ type: 'error', text: err.detail || 'Failed to create' })
        }
      } else if (selected) {
        const res = await api.patch(`/api/admin/scaling/wave-presets/${selected.id}`, body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Wave preset updated' })
          await fetchPresets()
          // Re-select to refresh
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

  const handleDelete = async (p: WavePreset) => {
    if (!window.confirm(`Delete wave preset "${p.name}"? This cannot be undone.`)) return
    try {
      const res = await api.delete(`/api/admin/scaling/wave-presets/${p.id}`)
      if (res.ok || res.status === 204) {
        setMessage({ type: 'success', text: 'Wave preset deleted' })
        if (selected?.id === p.id) handleCancel()
        await fetchPresets()
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to delete' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
  }

  const handleAddAssignment = async () => {
    if (!selected) return
    const body: Record<string, any> = {}
    if (assignType === 'book' && assignBookId) {
      body.book_id = assignBookId
    } else if (assignType === 'chapter' && assignChapterId) {
      body.chapter_id = assignChapterId
    } else {
      setMessage({ type: 'error', text: 'Select a book or chapter to assign' })
      return
    }
    try {
      const res = await api.post(`/api/admin/scaling/wave-presets/${selected.id}/assignments`, body)
      if (res.ok) {
        setMessage({ type: 'success', text: 'Assignment created' })
        fetchAssignments(selected.id)
        await fetchPresets()
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to assign' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
  }

  const handleRemoveAssignment = async (assignmentId: number) => {
    if (!selected) return
    try {
      const res = await api.delete(`/api/admin/scaling/wave-presets/assignments/${assignmentId}`)
      if (res.ok || res.status === 204) {
        setMessage({ type: 'success', text: 'Assignment removed' })
        fetchAssignments(selected.id)
        await fetchPresets()
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to remove assignment' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
  }

  const handleApplyToScenes = async () => {
    if (!selected || !applyTargetId) return
    if (!window.confirm(`Apply preset "${selected.name}" to all scenes in this ${applyTarget}? ${applyOverwrite ? 'Existing configs WILL be overwritten.' : 'Existing configs will be skipped.'}`)) return
    setApplying(true)
    try {
      const res = await api.post(`/api/admin/scaling/wave-presets/${selected.id}/apply-to-scenes`, {
        target: applyTarget,
        target_id: applyTargetId,
        overwrite_existing: applyOverwrite,
      })
      if (res.ok) {
        const data = await res.json()
        setMessage({ type: 'success', text: `Applied: ${data.created_count} updated, ${data.skipped_count} skipped` })
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to apply' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setApplying(false)
  }

  // Build chapters list from the selected book for assignment
  const selectedBookChapters = assignBookId
    ? (books.find(b => b.id === assignBookId)?.chapters || [])
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
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {total} wave preset{total !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="editor-toolbar-right">
          <button className="btn btn-success" onClick={handleCreate}>+ New Preset</button>
        </div>
      </div>

      {loading ? (
        <div className="editor-loading">Loading wave presets...</div>
      ) : presets.length === 0 ? (
        <div className="editor-empty">No wave presets found. Create one to get started.</div>
      ) : (
        <div className="editor-table-wrapper">
          <table className="editor-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Default</th>
                <th>Assignments</th>
                <th>Waves</th>
                <th>Enemies/Wave</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {presets.map(p => (
                <tr key={p.id} className={selected?.id === p.id ? 'row-selected' : ''}>
                  <td>{p.name}</td>
                  <td>{p.description ? (p.description.length > 40 ? p.description.substring(0, 40) + '...' : p.description) : '--'}</td>
                  <td>{p.is_default ? '\u2605' : ''}</td>
                  <td>{p.assignment_count}</td>
                  <td>{p.config?.wave_count ?? '--'}</td>
                  <td>{p.config?.max_enemies_per_wave ?? '--'}</td>
                  <td>
                    <button className="btn btn-sm btn-primary" onClick={() => handleSelect(p)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p)} style={{ marginLeft: 4 }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(selected || creating) && (
        <div className="detail-panel">
          <h3>{creating ? 'Create Wave Preset' : `Edit Wave Preset #${selected?.id}`}</h3>

          {/* --- Basic Info --- */}
          <div className="section-header">Basic Info</div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Name</label>
              <input
                className="form-input"
                value={form.name || ''}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Standard Combat"
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
                Default Preset
              </label>
            </div>
          </div>

          {/* --- Config Fields --- */}
          <div className="section-header">Wave Configuration</div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Max Enemies per Wave (1-50)</label>
              <input
                className="form-input"
                type="number"
                min={1}
                max={50}
                value={config.max_enemies_per_wave ?? 5}
                onChange={e => setConfig(p => ({ ...p, max_enemies_per_wave: parseInt(e.target.value) || 5 }))}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Wave Count (1-100)</label>
              <input
                className="form-input"
                type="number"
                min={1}
                max={100}
                value={config.wave_count ?? 10}
                onChange={e => setConfig(p => ({ ...p, wave_count: parseInt(e.target.value) || 10 }))}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Spawn Interval (ms, 200-10000)</label>
              <input
                className="form-input"
                type="number"
                min={200}
                max={10000}
                step={100}
                value={config.spawn_interval_ms ?? 2000}
                onChange={e => setConfig(p => ({ ...p, spawn_interval_ms: parseInt(e.target.value) || 2000 }))}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Spawn Pattern</label>
              <select
                className="form-select"
                value={config.spawn_pattern || 'uniform'}
                onChange={e => setConfig(p => ({ ...p, spawn_pattern: e.target.value }))}
              >
                {SPAWN_PATTERNS.map(sp => (
                  <option key={sp} value={sp}>{sp}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Scaling Factor</label>
              <input
                className="form-input"
                type="number"
                step={0.1}
                min={0.1}
                value={config.scaling_factor ?? 1.0}
                onChange={e => setConfig(p => ({ ...p, scaling_factor: parseFloat(e.target.value) || 1.0 }))}
              />
            </div>
            <div className="form-field">
              <label className="form-label">HP Multiplier</label>
              <input
                className="form-input"
                type="number"
                step={0.1}
                min={0.1}
                value={config.hp_multiplier ?? 1.0}
                onChange={e => setConfig(p => ({ ...p, hp_multiplier: parseFloat(e.target.value) || 1.0 }))}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Gold Multiplier</label>
              <input
                className="form-input"
                type="number"
                step={0.1}
                min={0.1}
                value={config.gold_multiplier ?? 1.0}
                onChange={e => setConfig(p => ({ ...p, gold_multiplier: parseFloat(e.target.value) || 1.0 }))}
              />
            </div>
          </div>

          <div className="form-actions">
            <button className="btn" onClick={handleCancel}>Cancel</button>
            <button className="btn btn-success" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>

          {/* --- Assignments Panel (edit mode only) --- */}
          {selected && (
            <>
              <div className="section-header" style={{ marginTop: 24 }}>Assignments</div>
              {loadingAssignments ? (
                <div className="editor-loading">Loading assignments...</div>
              ) : assignments.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>No assignments yet.</p>
              ) : (
                <div className="editor-table-wrapper">
                  <table className="editor-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Book</th>
                        <th>Chapter</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map(a => (
                        <tr key={a.id}>
                          <td>{a.chapter_id ? 'Chapter' : 'Book'}</td>
                          <td>{a.book_title || '--'}</td>
                          <td>{a.chapter_title || '--'}</td>
                          <td>
                            <button className="btn btn-sm btn-danger" onClick={() => handleRemoveAssignment(a.id)}>Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Add Assignment */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 8, flexWrap: 'wrap' }}>
                <div className="form-field" style={{ minWidth: 100 }}>
                  <label className="form-label">Assign to</label>
                  <select
                    className="form-select"
                    value={assignType}
                    onChange={e => { setAssignType(e.target.value as 'book' | 'chapter'); setAssignBookId(null); setAssignChapterId(null) }}
                  >
                    <option value="book">Book</option>
                    <option value="chapter">Chapter</option>
                  </select>
                </div>
                <div className="form-field" style={{ minWidth: 180 }}>
                  <label className="form-label">Book</label>
                  <select
                    className="form-select"
                    value={assignBookId ?? ''}
                    onChange={e => { setAssignBookId(e.target.value ? Number(e.target.value) : null); setAssignChapterId(null) }}
                  >
                    <option value="">-- select book --</option>
                    {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                  </select>
                </div>
                {assignType === 'chapter' && assignBookId && (
                  <div className="form-field" style={{ minWidth: 200 }}>
                    <label className="form-label">Chapter</label>
                    <select
                      className="form-select"
                      value={assignChapterId ?? ''}
                      onChange={e => setAssignChapterId(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">-- select chapter --</option>
                      {selectedBookChapters.map(c => (
                        <option key={c.id} value={c.id}>Ch {c.chapter_number}: {c.title}</option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  className="btn btn-primary"
                  onClick={handleAddAssignment}
                  style={{ height: 36 }}
                >
                  Add Assignment
                </button>
              </div>

              {/* Apply to Scenes */}
              <div className="section-header" style={{ marginTop: 24 }}>Apply to Scenes</div>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                Bulk-apply this preset's config values to all scene_wave_configs in the target book or chapter.
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="form-field" style={{ minWidth: 100 }}>
                  <label className="form-label">Target</label>
                  <select
                    className="form-select"
                    value={applyTarget}
                    onChange={e => { setApplyTarget(e.target.value as 'book' | 'chapter'); setApplyTargetId(null) }}
                  >
                    <option value="book">Book</option>
                    <option value="chapter">Chapter</option>
                  </select>
                </div>
                <div className="form-field" style={{ minWidth: 180 }}>
                  <label className="form-label">{applyTarget === 'book' ? 'Book' : 'Book (for chapter list)'}</label>
                  <select
                    className="form-select"
                    value={applyTarget === 'book' ? (applyTargetId ?? '') : (assignBookId ?? '')}
                    onChange={e => {
                      const v = e.target.value ? Number(e.target.value) : null
                      if (applyTarget === 'book') {
                        setApplyTargetId(v)
                      } else {
                        setAssignBookId(v)
                        setApplyTargetId(null)
                      }
                    }}
                  >
                    <option value="">-- select book --</option>
                    {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                  </select>
                </div>
                {applyTarget === 'chapter' && assignBookId && (
                  <div className="form-field" style={{ minWidth: 200 }}>
                    <label className="form-label">Chapter</label>
                    <select
                      className="form-select"
                      value={applyTargetId ?? ''}
                      onChange={e => setApplyTargetId(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">-- select chapter --</option>
                      {selectedBookChapters.map(c => (
                        <option key={c.id} value={c.id}>Ch {c.chapter_number}: {c.title}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-field" style={{ minWidth: 120 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={applyOverwrite}
                      onChange={e => setApplyOverwrite(e.target.checked)}
                    />
                    Overwrite existing
                  </label>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleApplyToScenes}
                  disabled={applying || !applyTargetId}
                  style={{ height: 36 }}
                >
                  {applying ? 'Applying...' : 'Apply to Scenes'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
