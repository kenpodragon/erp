import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import CascadingPicker from './shared/CascadingPicker'
import LocationPicker from './shared/LocationPicker'
import AssetPicker from './shared/AssetPicker'
import DeleteConfirmDialog from './shared/DeleteConfirmDialog'
import EntityBeatMapper from './EntityBeatMapper'

interface Beat {
  id: number
  scene_id: number
  beat_number: number
  sort_order: number
  summary: string | null
  raw_text: string | null
  intensity: number | null
  pacing: string | null
  timeline_context: string | null
  location_id: number | null
  int_threshold: number | null
  hidden_text: string | null
  image_asset_key: string | null
  audio_path: string | null
  audio_duration: number | null
  semantic_tags?: any[]
}

interface StoryBeatEditorProps {
  initialBookId?: number
  initialChapterId?: number
  initialSceneId?: number
}

export default function StoryBeatEditor({ initialBookId, initialChapterId, initialSceneId }: StoryBeatEditorProps) {
  const [beats, setBeats] = useState<Beat[]>([])
  const [loading, setLoading] = useState(false)
  const [filterValue, setFilterValue] = useState<{ bookId?: number; chapterId?: number; sceneId?: number }>({
    bookId: initialBookId,
    chapterId: initialChapterId,
    sceneId: initialSceneId,
  })
  const [selected, setSelected] = useState<Beat | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Beat | null>(null)
  const [reorderMode, setReorderMode] = useState(false)
  const [showHiddenLore, setShowHiddenLore] = useState(false)
  const [showTags, setShowTags] = useState(false)
  const [showEntityBeats, setShowEntityBeats] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [tags, setTags] = useState<any[]>([])

  const fetchBeats = useCallback(async () => {
    if (!filterValue.sceneId) { setBeats([]); return }
    setLoading(true)
    try {
      const res = await api.get(`/api/admin/content/beats?scene_id=${filterValue.sceneId}`)
      if (res.ok) {
        const data = await res.json()
        setBeats(Array.isArray(data) ? data : data.items || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [filterValue.sceneId])

  useEffect(() => { fetchBeats() }, [fetchBeats])

  const fetchTags = useCallback(async (beatId: number) => {
    try {
      const res = await api.get(`/api/admin/content/semantic-tags?beat_id=${beatId}`)
      if (res.ok) {
        const data = await res.json()
        setTags(Array.isArray(data) ? data : data.items || [])
      }
    } catch { /* ignore */ }
  }, [])

  const handleSelect = (beat: Beat) => {
    setSelected(beat)
    setForm({ ...beat })
    setCreating(false)
    setShowHiddenLore(false)
    setShowTags(false)
    setShowEntityBeats(false)
    fetchTags(beat.id)
  }

  const handleCreate = () => {
    setSelected(null)
    setCreating(true)
    setForm({ scene_id: filterValue.sceneId || '', beat_number: beats.length + 1, sort_order: beats.length, summary: '' })
  }

  const wordCount = (text: string | null) => (text || '').split(/\s+/).filter(Boolean).length

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        scene_id: Number(form.scene_id),
        beat_number: Number(form.beat_number),
        sort_order: Number(form.sort_order) || 0,
        summary: form.summary || null,
        raw_text: form.raw_text || null,
        intensity: form.intensity ? Number(form.intensity) : null,
        pacing: form.pacing || null,
        timeline_context: form.timeline_context || null,
        location_id: form.location_id || null,
        int_threshold: form.int_threshold ? Number(form.int_threshold) : null,
        hidden_text: form.hidden_text || null,
        image_asset_key: form.image_asset_key || null,
        audio_path: form.audio_path || null,
        audio_duration: form.audio_duration ? Number(form.audio_duration) : null,
      }

      if (creating) {
        const res = await api.post('/api/admin/content/beats', body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Beat created' })
          setCreating(false)
          await fetchBeats()
        } else {
          const err = await res.json().catch(() => ({}))
          setMessage({ type: 'error', text: err.detail || 'Failed to create' })
        }
      } else if (selected) {
        const res = await api.patch(`/api/admin/content/beats/${selected.id}`, body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Beat updated' })
          setSelected(null)
          await fetchBeats()
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
      const res = await api.delete(`/api/admin/content/beats/${deleteTarget.id}`)
      if (res.ok) {
        setMessage({ type: 'success', text: 'Beat deleted' })
        setSelected(null)
        await fetchBeats()
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to delete' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setDeleteTarget(null)
  }

  const handleReorder = async (beatId: number, direction: 'up' | 'down') => {
    const idx = beats.findIndex(b => b.id === beatId)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= beats.length) return

    const reordered = [...beats]
    const temp = reordered[idx]
    reordered[idx] = reordered[swapIdx]
    reordered[swapIdx] = temp

    const payload = reordered.map((b, i) => ({ id: b.id, sort_order: i }))
    try {
      await api.patch('/api/admin/content/beats/reorder', payload)
      await fetchBeats()
    } catch { setMessage({ type: 'error', text: 'Failed to reorder' }) }
  }

  const addTag = async () => {
    if (!newTag.trim() || !selected) return
    try {
      await api.post('/api/admin/content/semantic-tags', { beat_id: selected.id, value: newTag.trim(), category: 'general' })
      setNewTag('')
      fetchTags(selected.id)
    } catch { /* ignore */ }
  }

  const removeTag = async (tagId: number) => {
    try {
      await api.delete(`/api/admin/content/semantic-tags/${tagId}`)
      if (selected) fetchTags(selected.id)
    } catch { /* ignore */ }
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
        <CascadingPicker
          level="scene"
          value={filterValue}
          onChange={v => setFilterValue({ bookId: v.bookId, chapterId: v.chapterId, sceneId: v.sceneId })}
          optional
        />
      </div>

      {!filterValue.sceneId ? (
        <div className="editor-empty">Select a scene to view beats.</div>
      ) : (
        <>
          <div className="editor-toolbar">
            <div className="editor-toolbar-left">
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{beats.length} beats</span>
              <button className={`btn btn-sm ${reorderMode ? 'btn-warning' : ''}`} onClick={() => setReorderMode(!reorderMode)}>
                {reorderMode ? 'Done Reordering' : 'Reorder'}
              </button>
            </div>
            <div className="editor-toolbar-right">
              <button className="btn btn-success" onClick={handleCreate}>+ New Beat</button>
            </div>
          </div>

          {loading ? (
            <div className="editor-loading">Loading beats...</div>
          ) : beats.length === 0 ? (
            <div className="editor-empty">No beats found for this scene.</div>
          ) : (
            <div className="editor-table-wrapper">
              <table className="editor-table">
                <thead>
                  <tr>
                    {reorderMode && <th>Move</th>}
                    <th>Beat #</th>
                    <th>Summary</th>
                    <th>Intensity</th>
                    <th>Pacing</th>
                    <th>Timeline</th>
                    <th>Lore</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {beats.map((beat, idx) => (
                    <tr key={beat.id} className={selected?.id === beat.id ? 'row-selected' : ''}>
                      {reorderMode && (
                        <td>
                          <button className="btn-icon" onClick={() => handleReorder(beat.id, 'up')} disabled={idx === 0}>^</button>
                          <button className="btn-icon" onClick={() => handleReorder(beat.id, 'down')} disabled={idx === beats.length - 1}>v</button>
                        </td>
                      )}
                      <td>{beat.beat_number}</td>
                      <td className="truncated">{(beat.summary || '').substring(0, 60) || '--'}</td>
                      <td>{beat.intensity ?? '--'}</td>
                      <td>{beat.pacing || '--'}</td>
                      <td className="truncated">{beat.timeline_context || '--'}</td>
                      <td>{beat.hidden_text ? <span className="badge badge--warning">Hidden</span> : '--'}</td>
                      <td>
                        <button className="btn btn-sm btn-primary" onClick={() => handleSelect(beat)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(beat)} style={{ marginLeft: 4 }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {(selected || creating) && (
        <div className="detail-panel">
          <h3>{creating ? 'Create Beat' : `Edit Beat #${selected?.id}`}</h3>

          {/* Narrative */}
          <div className="section-header">Narrative</div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Scene</label>
              <CascadingPicker level="scene" value={{ bookId: filterValue.bookId, chapterId: filterValue.chapterId, sceneId: form.scene_id }} onChange={v => setForm(p => ({ ...p, scene_id: v.sceneId }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Beat Number</label>
              <input className="form-input" type="number" value={form.beat_number ?? ''} onChange={e => setForm(p => ({ ...p, beat_number: Number(e.target.value) }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Sort Order</label>
              <input className="form-input" type="number" value={form.sort_order ?? 0} onChange={e => setForm(p => ({ ...p, sort_order: Number(e.target.value) }))} />
            </div>
            <div className="form-field form-field--full">
              <label className="form-label">Summary</label>
              <textarea className="form-textarea" value={form.summary || ''} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))} rows={2} />
            </div>
            <div className="form-field form-field--full">
              <label className="form-label">Raw Text</label>
              <textarea className="form-textarea" value={form.raw_text || ''} onChange={e => setForm(p => ({ ...p, raw_text: e.target.value }))} rows={8} style={{ fontFamily: 'var(--font-mono)' }} />
              <div className="word-count">{wordCount(form.raw_text)} words</div>
            </div>
          </div>

          {/* Metadata */}
          <div className="section-header">Metadata</div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Intensity (1-5)</label>
              <input className="form-input" type="number" min={1} max={5} value={form.intensity ?? ''} onChange={e => setForm(p => ({ ...p, intensity: e.target.value }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Pacing</label>
              <input className="form-input" value={form.pacing || ''} onChange={e => setForm(p => ({ ...p, pacing: e.target.value }))} placeholder="e.g. slow, building, climax" />
            </div>
            <div className="form-field">
              <label className="form-label">Timeline Context</label>
              <input className="form-input" value={form.timeline_context || ''} onChange={e => setForm(p => ({ ...p, timeline_context: e.target.value }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Location</label>
              <LocationPicker value={form.location_id} onChange={id => setForm(p => ({ ...p, location_id: id }))} />
            </div>
          </div>

          {/* Hidden Lore */}
          <div className="section-collapsible">
            <button className="section-collapsible-header" onClick={() => setShowHiddenLore(!showHiddenLore)}>
              <span>Hidden Lore</span>
              <span>{showHiddenLore ? '[-]' : '[+]'}</span>
            </button>
            {showHiddenLore && (
              <div className="section-collapsible-body">
                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label">INT Threshold</label>
                    <input className="form-input" type="number" value={form.int_threshold ?? ''} onChange={e => setForm(p => ({ ...p, int_threshold: e.target.value }))} />
                  </div>
                  <div className="form-field form-field--full">
                    <label className="form-label">Hidden Text</label>
                    <textarea className="form-textarea" value={form.hidden_text || ''} onChange={e => setForm(p => ({ ...p, hidden_text: e.target.value }))} rows={4} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Media */}
          <div className="section-header">Media</div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Image</label>
              <AssetPicker category="beat_image" value={form.image_asset_key} onChange={key => setForm(p => ({ ...p, image_asset_key: key }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Audio Path</label>
              <input className="form-input" value={form.audio_path || ''} onChange={e => setForm(p => ({ ...p, audio_path: e.target.value }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Audio Duration (s)</label>
              <input className="form-input" type="number" value={form.audio_duration ?? ''} onChange={e => setForm(p => ({ ...p, audio_duration: e.target.value }))} />
            </div>
          </div>

          {/* Semantic Tags */}
          {!creating && selected && (
            <div className="section-collapsible">
              <button className="section-collapsible-header" onClick={() => setShowTags(!showTags)}>
                <span>Semantic Tags ({tags.length})</span>
                <span>{showTags ? '[-]' : '[+]'}</span>
              </button>
              {showTags && (
                <div className="section-collapsible-body">
                  <div className="inline-list">
                    {tags.map((tag: any) => (
                      <div key={tag.id} className="inline-list-item">
                        <span>{tag.value}</span>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>({tag.category})</span>
                        <button className="remove-btn" onClick={() => removeTag(tag.id)}>x</button>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <input className="form-input" placeholder="New tag..." value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} style={{ flex: 1 }} />
                    <button className="btn btn-sm btn-success" onClick={addTag}>Add</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Entity-Beat Appearances */}
          {!creating && selected && (
            <div className="section-collapsible">
              <button className="section-collapsible-header" onClick={() => setShowEntityBeats(!showEntityBeats)}>
                <span>Entity Appearances</span>
                <span>{showEntityBeats ? '[-]' : '[+]'}</span>
              </button>
              {showEntityBeats && (
                <div className="section-collapsible-body">
                  <EntityBeatMapper beatId={selected.id} />
                </div>
              )}
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
          resourceType="Beat"
          resourceName={`Beat #${deleteTarget.beat_number}`}
          childCounts={{}}
          isBlocked={false}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
