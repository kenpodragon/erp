import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import CascadingPicker from './shared/CascadingPicker'
import LocationPicker from './shared/LocationPicker'
import AssetPicker from './shared/AssetPicker'
import AtmospherePicker from './shared/AtmospherePicker'
import EntityPicker from './shared/EntityPicker'
import DeleteConfirmDialog from './shared/DeleteConfirmDialog'
import WaveConfigPanel from './WaveConfigPanel'

interface Scene {
  id: number
  chapter_id: number
  scene_number: number
  sort_order: number
  title: string | null
  summary: string | null
  scene_type: string
  location_id: number | null
  location_name?: string
  hard_break: boolean
  raw_text: string | null
  duration: number | null
  background_key: string | null
  boss_scene: boolean
  atmosphere_id: number | null
  boss_entity_id: number | null
  boss_timer_seconds: number | null
  boss_interrupts: any[]
  beats_count?: number
  entities_count?: number
}

const SCENE_TYPES = ['narrative', 'combat', 'exploration', 'dialogue', 'chapter_boss', 'book_boss', 'transition', 'cutscene']
const INTERRUPT_TYPES = ['click_burst', 'target_zone', 'whack_sequence']

interface SceneEditorProps {
  initialBookId?: number
  initialChapterId?: number
  onNavigate?: (tab: string, params?: Record<string, string>) => void
}

export default function SceneEditor({ initialBookId, initialChapterId, onNavigate }: SceneEditorProps) {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [loading, setLoading] = useState(false)
  const [filterValue, setFilterValue] = useState<{ bookId?: number; chapterId?: number }>({
    bookId: initialBookId,
    chapterId: initialChapterId,
  })
  const [filterType, setFilterType] = useState('')
  const [selected, setSelected] = useState<Scene | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Scene | null>(null)
  const [showRawText, setShowRawText] = useState(false)
  const [showBossConfig, setShowBossConfig] = useState(false)
  const [showWaveConfig, setShowWaveConfig] = useState(false)

  const fetchScenes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterValue.chapterId) params.set('chapter_id', String(filterValue.chapterId))
      else if (filterValue.bookId) params.set('book_id', String(filterValue.bookId))
      if (filterType) params.set('scene_type', filterType)
      const res = await api.get(`/api/admin/content/scenes?${params}`)
      if (res.ok) {
        const data = await res.json()
        setScenes(Array.isArray(data) ? data : data.items || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [filterValue, filterType])

  useEffect(() => { fetchScenes() }, [fetchScenes])

  const handleSelect = (scene: Scene) => {
    setSelected(scene)
    setForm({ ...scene, boss_interrupts: scene.boss_interrupts || [] })
    setCreating(false)
    setShowRawText(false)
    setShowBossConfig(scene.scene_type.endsWith('_boss'))
    setShowWaveConfig(false)
  }

  const handleCreate = () => {
    setSelected(null)
    setCreating(true)
    setForm({
      chapter_id: filterValue.chapterId || '',
      scene_number: 1,
      sort_order: 0,
      title: '',
      scene_type: 'narrative',
      hard_break: false,
      boss_scene: false,
      boss_interrupts: [],
    })
    setShowBossConfig(false)
    setShowWaveConfig(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        chapter_id: Number(form.chapter_id),
        scene_number: Number(form.scene_number),
        sort_order: Number(form.sort_order) || 0,
        title: form.title || null,
        summary: form.summary || null,
        scene_type: form.scene_type || 'narrative',
        location_id: form.location_id || null,
        hard_break: !!form.hard_break,
        duration: form.duration ? Number(form.duration) : null,
        background_key: form.background_key || null,
        boss_scene: !!form.boss_scene,
        atmosphere_id: form.atmosphere_id || null,
        boss_entity_id: form.boss_entity_id || null,
        boss_timer_seconds: form.boss_timer_seconds ? Number(form.boss_timer_seconds) : null,
        boss_interrupts: form.boss_interrupts || [],
      }

      if (creating) {
        const res = await api.post('/api/admin/content/scenes', body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Scene created' })
          setCreating(false)
          await fetchScenes()
        } else {
          const err = await res.json().catch(() => ({}))
          setMessage({ type: 'error', text: err.detail || 'Failed to create' })
        }
      } else if (selected) {
        const res = await api.patch(`/api/admin/content/scenes/${selected.id}`, body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Scene updated' })
          setSelected(null)
          await fetchScenes()
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
      const res = await api.delete(`/api/admin/content/scenes/${deleteTarget.id}`)
      if (res.ok) {
        setMessage({ type: 'success', text: 'Scene deleted' })
        setSelected(null)
        await fetchScenes()
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to delete' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setDeleteTarget(null)
  }

  const addInterrupt = () => {
    setForm(p => ({
      ...p,
      boss_interrupts: [...(p.boss_interrupts || []), { type: 'click_burst', interval: 10, duration: 5, difficulty: 1 }]
    }))
  }

  const removeInterrupt = (index: number) => {
    setForm(p => ({
      ...p,
      boss_interrupts: (p.boss_interrupts || []).filter((_: any, i: number) => i !== index)
    }))
  }

  const updateInterrupt = (index: number, field: string, value: any) => {
    setForm(p => {
      const interrupts = [...(p.boss_interrupts || [])]
      interrupts[index] = { ...interrupts[index], [field]: value }
      return { ...p, boss_interrupts: interrupts }
    })
  }

  const isBossType = (form.scene_type || '').endsWith('_boss')

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
          onChange={v => setFilterValue({ bookId: v.bookId, chapterId: v.chapterId })}
          optional
        />
        <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 140 }}>
          <option value="">All Types</option>
          {SCENE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{scenes.length} scenes</span>
      </div>

      <div className="editor-toolbar">
        <div className="editor-toolbar-left" />
        <div className="editor-toolbar-right">
          <button className="btn btn-success" onClick={handleCreate}>+ New Scene</button>
        </div>
      </div>

      {loading ? (
        <div className="editor-loading">Loading scenes...</div>
      ) : scenes.length === 0 ? (
        <div className="editor-empty">No scenes found.</div>
      ) : (
        <div className="editor-table-wrapper">
          <table className="editor-table">
            <thead>
              <tr>
                <th>Scene #</th>
                <th>Title</th>
                <th>Type</th>
                <th>Location</th>
                <th>Beats</th>
                <th>Entities</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {scenes.map(scene => (
                <tr key={scene.id} className={selected?.id === scene.id ? 'row-selected' : ''}>
                  <td>{scene.scene_number}</td>
                  <td className="truncated">{scene.title || '--'}</td>
                  <td><span className={`badge ${scene.scene_type.endsWith('_boss') ? 'badge--error' : 'badge--info'}`}>{scene.scene_type}</span></td>
                  <td>{scene.location_name || '--'}</td>
                  <td>{scene.beats_count ?? '--'}</td>
                  <td>{scene.entities_count ?? '--'}</td>
                  <td>
                    <button className="btn btn-sm btn-primary" onClick={() => handleSelect(scene)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(scene)} style={{ marginLeft: 4 }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(selected || creating) && (
        <div className="detail-panel">
          <h3>{creating ? 'Create Scene' : `Edit Scene #${selected?.id}`}</h3>

          {/* Section 1: Narrative */}
          <div className="section-header">Narrative</div>
          <div className="form-grid">
            <div className="form-field form-field--full">
              <label className="form-label">Chapter</label>
              <CascadingPicker level="chapter" value={{ bookId: filterValue.bookId, chapterId: form.chapter_id }} onChange={v => setForm(p => ({ ...p, chapter_id: v.chapterId }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Scene Number</label>
              <input className="form-input" type="number" value={form.scene_number ?? ''} onChange={e => setForm(p => ({ ...p, scene_number: Number(e.target.value) }))} />
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
              <label className="form-label">Scene Type</label>
              <select className="form-select" value={form.scene_type || 'narrative'} onChange={e => setForm(p => ({ ...p, scene_type: e.target.value }))}>
                {SCENE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-field form-field--full">
              <label className="form-label">Summary</label>
              <textarea className="form-textarea" value={form.summary || ''} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))} rows={3} />
            </div>
            <div className="form-field">
              <label className="form-label">Location</label>
              <LocationPicker value={form.location_id} onChange={id => setForm(p => ({ ...p, location_id: id }))} />
            </div>
            <div className="form-field">
              <div className="form-checkbox-row">
                <input type="checkbox" checked={!!form.hard_break} onChange={e => setForm(p => ({ ...p, hard_break: e.target.checked }))} />
                <label className="form-label">Hard Break</label>
              </div>
            </div>
          </div>

          {!creating && form.raw_text && (
            <div className="section-collapsible" style={{ marginTop: '8px' }}>
              <button className="section-collapsible-header" onClick={() => setShowRawText(!showRawText)}>
                <span>Raw Text</span>
                <span>{showRawText ? '[-]' : '[+]'}</span>
              </button>
              {showRawText && (
                <div className="section-collapsible-body">
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', color: 'var(--color-text-muted)', maxHeight: '300px', overflow: 'auto', margin: 0 }}>{form.raw_text}</pre>
                </div>
              )}
            </div>
          )}

          {/* Section 2: Gameplay */}
          <div className="section-header">Gameplay</div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Duration (seconds)</label>
              <input className="form-input" type="number" value={form.duration ?? ''} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Background</label>
              <AssetPicker category="background" value={form.background_key} onChange={key => setForm(p => ({ ...p, background_key: key }))} />
            </div>
            <div className="form-field">
              <div className="form-checkbox-row">
                <input type="checkbox" checked={!!form.boss_scene} onChange={e => setForm(p => ({ ...p, boss_scene: e.target.checked }))} />
                <label className="form-label">Boss Scene</label>
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">Atmosphere</label>
              <AtmospherePicker value={form.atmosphere_id} onChange={id => setForm(p => ({ ...p, atmosphere_id: id }))} />
            </div>
          </div>

          {/* Section 3: Boss Config (conditional) */}
          {isBossType && (
            <>
              <div className="section-header" style={{ cursor: 'pointer' }} onClick={() => setShowBossConfig(!showBossConfig)}>
                Boss Config {showBossConfig ? '[-]' : '[+]'}
              </div>
              {showBossConfig && (
                <div>
                  <div className="form-grid">
                    <div className="form-field">
                      <label className="form-label">Boss Entity</label>
                      <EntityPicker value={form.boss_entity_id} onChange={id => setForm(p => ({ ...p, boss_entity_id: id }))} />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Timer (seconds)</label>
                      <input className="form-input" type="number" value={form.boss_timer_seconds ?? ''} onChange={e => setForm(p => ({ ...p, boss_timer_seconds: e.target.value }))} />
                    </div>
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="form-label">Interrupts</span>
                      <button className="btn btn-sm btn-success" onClick={addInterrupt}>+ Add Interrupt</button>
                    </div>
                    {(form.boss_interrupts || []).map((int: any, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', padding: '6px', background: 'var(--color-bg-input)', borderRadius: 'var(--radius-sm)' }}>
                        <select className="form-select" value={int.type} onChange={e => updateInterrupt(i, 'type', e.target.value)} style={{ width: 140 }}>
                          {INTERRUPT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Int:
                          <input className="form-input" type="number" value={int.interval} onChange={e => updateInterrupt(i, 'interval', Number(e.target.value))} style={{ width: 50, marginLeft: 4 }} />
                        </label>
                        <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Dur:
                          <input className="form-input" type="number" value={int.duration} onChange={e => updateInterrupt(i, 'duration', Number(e.target.value))} style={{ width: 50, marginLeft: 4 }} />
                        </label>
                        <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Diff:
                          <input className="form-input" type="number" value={int.difficulty} onChange={e => updateInterrupt(i, 'difficulty', Number(e.target.value))} style={{ width: 50, marginLeft: 4 }} />
                        </label>
                        <button className="btn btn-sm btn-danger" onClick={() => removeInterrupt(i)}>x</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Section 4: Wave Config (inline) */}
          {!creating && selected && (
            <>
              <div className="section-header" style={{ cursor: 'pointer' }} onClick={() => setShowWaveConfig(!showWaveConfig)}>
                Wave Config {showWaveConfig ? '[-]' : '[+]'}
              </div>
              {showWaveConfig && <WaveConfigPanel sceneId={selected.id} />}
            </>
          )}

          {!creating && selected && (
            <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
              <button className="link-btn" onClick={() => onNavigate?.('beats', { scene_id: String(selected.id) })}>
                View Beats &rarr;
              </button>
              <button className="link-btn" onClick={() => onNavigate?.('mapper', { scene_id: String(selected.id) })}>
                Entity Mapper &rarr;
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
          resourceType="Scene"
          resourceName={deleteTarget.title || `Scene #${deleteTarget.scene_number}`}
          childCounts={{ beats: deleteTarget.beats_count || 0, entities: deleteTarget.entities_count || 0 }}
          isBlocked={(deleteTarget.beats_count || 0) > 0}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
