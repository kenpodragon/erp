import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import CascadingPicker from './shared/CascadingPicker'
import AtmospherePicker from './shared/AtmospherePicker'
import DeleteConfirmDialog from './shared/DeleteConfirmDialog'

interface Location {
  id: number
  canonical_name: string
  location_type: string
  description: string | null
  first_appearance_book_id: number | null
  first_appearance_chapter_id: number | null
  first_appearance_scene_id: number | null
  archetype_id: number | null
  visual: string | null
  auditory: string | null
  olfactory: string | null
  tactile: string | null
  atmosphere: string | null
  scene_count?: number
  alias_count?: number
  aliases?: string[]
  scene_appearances?: any[]
}

export default function LocationEditor() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50

  const [filterType, setFilterType] = useState('')
  const [filterHasArchetype, setFilterHasArchetype] = useState<string>('')
  const [searchText, setSearchText] = useState('')
  const [locationTypes, setLocationTypes] = useState<string[]>([])

  const [selected, setSelected] = useState<Location | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null)
  const [aliases, setAliases] = useState<string[]>([])
  const [newAlias, setNewAlias] = useState('')
  const [sceneAppearances, setSceneAppearances] = useState<any[]>([])

  const fetchTypes = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/content/locations/types')
      if (res.ok) setLocationTypes(await res.json())
    } catch { /* ignore */ }
  }, [])

  const fetchLocations = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
      if (searchText) params.set('search', searchText)
      if (filterType) params.set('location_type', filterType)
      if (filterHasArchetype) params.set('has_archetype', filterHasArchetype)
      const res = await api.get(`/api/admin/content/locations?${params}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setLocations(data)
          setTotal(data.length)
        } else {
          setLocations(data.items || [])
          setTotal(data.total || data.items?.length || 0)
        }
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [page, searchText, filterType, filterHasArchetype])

  useEffect(() => { fetchTypes() }, [fetchTypes])
  useEffect(() => { fetchLocations() }, [fetchLocations])

  const handleSelect = async (loc: Location) => {
    setSelected(loc)
    setForm({ ...loc })
    setCreating(false)
    setAliases(loc.aliases || [])
    // Fetch scene appearances
    try {
      const res = await api.get(`/api/admin/content/locations/${loc.id}/scenes`)
      if (res.ok) setSceneAppearances(await res.json())
      else setSceneAppearances([])
    } catch { setSceneAppearances([]) }
  }

  const handleCreate = () => {
    setSelected(null)
    setCreating(true)
    setForm({ canonical_name: '', location_type: '' })
    setAliases([])
    setSceneAppearances([])
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        canonical_name: form.canonical_name,
        location_type: form.location_type || null,
        description: form.description || null,
        first_appearance_book_id: form.first_appearance_book_id || null,
        first_appearance_chapter_id: form.first_appearance_chapter_id || null,
        first_appearance_scene_id: form.first_appearance_scene_id || null,
        archetype_id: form.archetype_id || null,
        visual: form.visual || null,
        auditory: form.auditory || null,
        olfactory: form.olfactory || null,
        tactile: form.tactile || null,
        atmosphere: form.atmosphere || null,
      }

      if (creating) {
        const res = await api.post('/api/admin/content/locations', body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Location created' })
          setCreating(false)
          await fetchLocations()
        } else {
          const err = await res.json().catch(() => ({}))
          setMessage({ type: 'error', text: err.detail || 'Failed to create' })
        }
      } else if (selected) {
        const res = await api.patch(`/api/admin/content/locations/${selected.id}`, body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Location updated' })
          setSelected(null)
          await fetchLocations()
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
      const res = await api.delete(`/api/admin/content/locations/${deleteTarget.id}`)
      if (res.ok) {
        setMessage({ type: 'success', text: 'Location deleted' })
        setSelected(null)
        await fetchLocations()
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to delete' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setDeleteTarget(null)
  }

  const addAlias = async () => {
    if (!newAlias.trim() || !selected) return
    try {
      const res = await api.post(`/api/admin/content/locations/${selected.id}/aliases`, { alias: newAlias.trim() })
      if (res.ok) {
        setAliases([...aliases, newAlias.trim()])
        setNewAlias('')
      }
    } catch { /* ignore */ }
  }

  const removeAlias = async (alias: string) => {
    if (!selected) return
    try {
      await api.delete(`/api/admin/content/locations/${selected.id}/aliases`, { alias })
      setAliases(aliases.filter(a => a !== alias))
    } catch { /* ignore */ }
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

      <div className="editor-filters">
        <input className="form-input" placeholder="Search locations..." value={searchText} onChange={e => { setSearchText(e.target.value); setPage(1) }} style={{ width: 200 }} />
        <select className="form-select" value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }} style={{ width: 150 }}>
          <option value="">All Types</option>
          {locationTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="form-select" value={filterHasArchetype} onChange={e => { setFilterHasArchetype(e.target.value); setPage(1) }} style={{ width: 150 }}>
          <option value="">All</option>
          <option value="true">Has Archetype</option>
          <option value="false">No Archetype</option>
        </select>
      </div>

      <div className="editor-toolbar">
        <div className="editor-toolbar-left">
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{total} locations</span>
        </div>
        <div className="editor-toolbar-right">
          <button className="btn btn-success" onClick={handleCreate}>+ New Location</button>
        </div>
      </div>

      {loading ? (
        <div className="editor-loading">Loading locations...</div>
      ) : locations.length === 0 ? (
        <div className="editor-empty">No locations found.</div>
      ) : (
        <>
          <div className="editor-table-wrapper">
            <table className="editor-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Archetype</th>
                  <th>Scenes</th>
                  <th>Aliases</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map(loc => (
                  <tr key={loc.id} className={selected?.id === loc.id ? 'row-selected' : ''}>
                    <td>{loc.canonical_name}</td>
                    <td>{loc.location_type || '--'}</td>
                    <td>{loc.archetype_id ? <span className="badge badge--info">Yes</span> : '--'}</td>
                    <td>{loc.scene_count ?? '--'}</td>
                    <td>{loc.alias_count ?? '--'}</td>
                    <td>
                      <button className="btn btn-sm btn-primary" onClick={() => handleSelect(loc)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(loc)} style={{ marginLeft: 4 }}>Delete</button>
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

      {(selected || creating) && (
        <div className="detail-panel">
          <h3>{creating ? 'Create Location' : `Edit Location #${selected?.id}`}</h3>

          {/* Core */}
          <div className="section-header">Core</div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Canonical Name</label>
              <input className="form-input" value={form.canonical_name || ''} onChange={e => setForm(p => ({ ...p, canonical_name: e.target.value }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Location Type</label>
              <select className="form-select" value={form.location_type || ''} onChange={e => setForm(p => ({ ...p, location_type: e.target.value }))}>
                <option value="">-- Select --</option>
                {locationTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-field form-field--full">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <div className="form-field form-field--full">
              <label className="form-label">First Appearance</label>
              <CascadingPicker
                level="scene"
                value={{ bookId: form.first_appearance_book_id, chapterId: form.first_appearance_chapter_id, sceneId: form.first_appearance_scene_id }}
                onChange={v => setForm(p => ({ ...p, first_appearance_book_id: v.bookId, first_appearance_chapter_id: v.chapterId, first_appearance_scene_id: v.sceneId }))}
                optional
              />
            </div>
            <div className="form-field">
              <label className="form-label">Archetype Atmosphere</label>
              <AtmospherePicker value={form.archetype_id} onChange={id => setForm(p => ({ ...p, archetype_id: id }))} />
            </div>
          </div>

          {/* Sensory Details */}
          <div className="section-header">Sensory Details</div>
          <div className="form-grid">
            {(['visual', 'auditory', 'olfactory', 'tactile', 'atmosphere'] as const).map(field => (
              <div className="form-field" key={field}>
                <label className="form-label">{field}</label>
                <textarea className="form-textarea" value={form[field] || ''} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} rows={2} />
              </div>
            ))}
          </div>

          {/* Aliases */}
          {!creating && selected && (
            <>
              <div className="section-header">Aliases</div>
              <div className="inline-list">
                {aliases.map(alias => (
                  <div key={alias} className="inline-list-item">
                    <span>{alias}</span>
                    <button className="remove-btn" onClick={() => removeAlias(alias)}>x</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <input className="form-input" placeholder="New alias..." value={newAlias} onChange={e => setNewAlias(e.target.value)} onKeyDown={e => e.key === 'Enter' && addAlias()} style={{ flex: 1 }} />
                <button className="btn btn-sm btn-success" onClick={addAlias}>Add</button>
              </div>
            </>
          )}

          {/* Scene Appearances (read-only) */}
          {!creating && selected && sceneAppearances.length > 0 && (
            <>
              <div className="section-header">Scene Appearances</div>
              <div className="editor-table-wrapper" style={{ maxHeight: '200px' }}>
                <table className="editor-table">
                  <thead>
                    <tr>
                      <th>Scene</th>
                      <th>Visual Delta</th>
                      <th>Atmosphere Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sceneAppearances.map((sa: any, i: number) => (
                      <tr key={i}>
                        <td>{sa.scene_title || `Scene #${sa.scene_id}`}</td>
                        <td className="truncated">{sa.visual_delta || '--'}</td>
                        <td className="truncated">{sa.atmosphere_delta || '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="form-actions">
            <button className="btn" onClick={() => { setSelected(null); setCreating(false) }}>Cancel</button>
            <button className="btn btn-success" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          resourceType="Location"
          resourceName={deleteTarget.canonical_name}
          childCounts={{ scenes: deleteTarget.scene_count || 0 }}
          isBlocked={false}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
