import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api'
import './AtmosphereEditor.css'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface AtmosphereListItem {
  id: number
  name: string
  archetype: string | null
  description: string | null
  generator_bpm: number
  generator_key: string
  generator_scale: string
  generator_complexity: number
  scene_count: number
  chapter_count: number
  book_count: number
}

interface AtmosphereDetail extends AtmosphereListItem {
  music_definitions: any
  generator_seed: number | null
  assigned_scene_ids: number[]
  assigned_chapters: { id: number; title: string }[]
  assigned_books: { id: number; title: string }[]
}

const ARCHETYPES = [
  'mundane_dread', 'occult_sanctum', 'liminal_purgatory', 'body_horror_theatre',
  'ancient_sanctuary', 'cosmic_archive', 'tech_utopia', 'alien_frontier',
  'void_abyss', 'domestic_trauma', 'glitch_reality', 'conspiracy_bunker',
  'training_grounds',
]

const MUSIC_STATES = ['explore', 'combat', 'boss', 'mystery'] as const

/* ------------------------------------------------------------------ */
/* Web Audio Preview                                                   */
/* ------------------------------------------------------------------ */

function useAudioPreview() {
  const ctxRef = useRef<AudioContext | null>(null)
  const nodesRef = useRef<OscillatorNode[]>([])
  const playingRef = useRef(false)

  const stop = useCallback(() => {
    nodesRef.current.forEach(n => { try { n.stop() } catch {} })
    nodesRef.current = []
    playingRef.current = false
  }, [])

  const play = useCallback((definition: any) => {
    stop()
    if (!definition) return

    try {
      const ctx = ctxRef.current || new AudioContext()
      ctxRef.current = ctx
      if (ctx.state === 'suspended') ctx.resume()

      playingRef.current = true
      const nodes: OscillatorNode[] = []

      // Play melody if present
      const melody = definition.melody
      if (melody?.sequence) {
        let time = ctx.currentTime + 0.05
        const beatDur = 60 / (definition.bpm || 120)

        for (const step of melody.sequence) {
          if (step.note && playingRef.current) {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = (melody.oscillator || 'square') as OscillatorType
            osc.frequency.value = noteToFreq(step.note)
            gain.gain.value = melody.volume ?? 0.3
            osc.connect(gain)
            gain.connect(ctx.destination)
            const dur = (step.beats || 1) * beatDur
            osc.start(time)
            osc.stop(time + dur * 0.9)
            nodes.push(osc)
            time += dur
          } else {
            time += (step.beats || 1) * beatDur
          }
        }
      }

      // Play bass if present
      const bass = definition.bass
      if (bass?.sequence) {
        let time = ctx.currentTime + 0.05
        const beatDur = 60 / (definition.bpm || 120)

        for (const step of bass.sequence) {
          if (step.note) {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = (bass.oscillator || 'triangle') as OscillatorType
            osc.frequency.value = noteToFreq(step.note)
            gain.gain.value = bass.volume ?? 0.2
            osc.connect(gain)
            gain.connect(ctx.destination)
            const dur = (step.beats || 1) * beatDur
            osc.start(time)
            osc.stop(time + dur * 0.9)
            nodes.push(osc)
            time += dur
          } else {
            time += (step.beats || 1) * beatDur
          }
        }
      }

      nodesRef.current = nodes
    } catch (e) {
      console.error('Preview error:', e)
    }
  }, [stop])

  const destroy = useCallback(() => {
    stop()
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {})
      ctxRef.current = null
    }
  }, [stop])

  return { play, stop, destroy }
}

function noteToFreq(note: string): number {
  const match = note.match(/^([A-G])(b|#)?(\d)$/)
  if (!match) return 440
  const [, letter, accidental, octaveStr] = match
  const noteMap: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  let semitone = noteMap[letter] ?? 9
  if (accidental === '#') semitone++
  else if (accidental === 'b') semitone--
  const octave = parseInt(octaveStr)
  const midi = (octave + 1) * 12 + semitone
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/* ------------------------------------------------------------------ */
/* SFX Preview (for the SFX editor page)                               */
/* ------------------------------------------------------------------ */

export function useSFXPreview() {
  const ctxRef = useRef<AudioContext | null>(null)

  const play = useCallback((preset: any, baseVolume = 0.6) => {
    try {
      const ctx = ctxRef.current || new AudioContext()
      ctxRef.current = ctx
      if (ctx.state === 'suspended') ctx.resume()

      const steps = Array.isArray(preset) ? preset : [preset]
      let offset = 0

      for (const step of steps) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = (step.oscillator_type || 'square') as OscillatorType
        const freqStart = step.frequency_start || 440
        const freqEnd = step.frequency_end || freqStart
        const dur = (step.duration_ms || 100) / 1000

        osc.frequency.setValueAtTime(freqStart, ctx.currentTime + offset)
        if (freqEnd !== freqStart) {
          osc.frequency.exponentialRampToValueAtTime(
            Math.max(freqEnd, 1), ctx.currentTime + offset + dur
          )
        }

        gain.gain.setValueAtTime(baseVolume, ctx.currentTime + offset)
        const release = (step.release_ms || 50) / 1000
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + offset + dur)

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(ctx.currentTime + offset)
        osc.stop(ctx.currentTime + offset + dur + release)
        offset += dur
      }
    } catch (e) {
      console.error('SFX preview error:', e)
    }
  }, [])

  return { play }
}

/* ------------------------------------------------------------------ */
/* Batch Assignment Modal                                              */
/* ------------------------------------------------------------------ */

interface BatchAssignProps {
  atmospheres: AtmosphereListItem[]
  onClose: () => void
  onAssigned: () => void
}

function BatchAssignModal({ atmospheres, onClose, onAssigned }: BatchAssignProps) {
  const [targetType, setTargetType] = useState<'chapter' | 'book'>('chapter')
  const [targetId, setTargetId] = useState('')
  const [atmosphereId, setAtmosphereId] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleAssign = async () => {
    if (!targetId || !atmosphereId) return
    setSaving(true)
    try {
      const res = await api.post('/api/admin/atmospheres/batch-assign', {
        target_type: targetType,
        target_id: parseInt(targetId),
        atmosphere_id: parseInt(atmosphereId),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(`Updated ${data.scenes_updated} scenes`)
        onAssigned()
      } else {
        const err = await res.json()
        setResult(`Error: ${err.detail}`)
      }
    } catch {
      setResult('Network error')
    }
    setSaving(false)
  }

  return (
    <div className="ae-modal-backdrop" onClick={onClose}>
      <div className="ae-modal" onClick={e => e.stopPropagation()}>
        <h3>Batch Assign Atmosphere</h3>
        <div className="ae-form-row">
          <label>Target Type</label>
          <select value={targetType} onChange={e => setTargetType(e.target.value as 'chapter' | 'book')}>
            <option value="chapter">Chapter</option>
            <option value="book">Book</option>
          </select>
        </div>
        <div className="ae-form-row">
          <label>Target ID</label>
          <input type="number" value={targetId} onChange={e => setTargetId(e.target.value)} placeholder={`${targetType} ID`} />
        </div>
        <div className="ae-form-row">
          <label>Atmosphere</label>
          <select value={atmosphereId} onChange={e => setAtmosphereId(e.target.value)}>
            <option value="">Select...</option>
            {atmospheres.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.archetype})</option>
            ))}
          </select>
        </div>
        {result && <div className="ae-result">{result}</div>}
        <div className="ae-modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="ae-btn-primary" onClick={handleAssign} disabled={saving || !targetId || !atmosphereId}>
            {saving ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export default function AtmosphereEditor() {
  const [atmospheres, setAtmospheres] = useState<AtmosphereListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<AtmosphereDetail | null>(null)
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showBatch, setShowBatch] = useState(false)
  const [filterArchetype, setFilterArchetype] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editArchetype, setEditArchetype] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editBpm, setEditBpm] = useState(120)
  const [editKey, setEditKey] = useState('C')
  const [editScale, setEditScale] = useState('minor')
  const [editComplexity, setEditComplexity] = useState(5)
  const [editSeed, setEditSeed] = useState<number | ''>('')
  const [editMusicJson, setEditMusicJson] = useState<Record<string, string>>({
    explore: '', combat: '', boss: '', mystery: '',
  })

  const preview = useAudioPreview()

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/atmospheres')
      if (res.ok) setAtmospheres(await res.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { return () => preview.destroy() }, [preview.destroy])

  const fetchDetail = async (id: number) => {
    try {
      const res = await api.get(`/api/admin/atmospheres/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSelected(data)
        populateEditForm(data)
      }
    } catch {}
  }

  const populateEditForm = (data: AtmosphereDetail) => {
    setEditName(data.name)
    setEditArchetype(data.archetype || '')
    setEditDescription(data.description || '')
    setEditBpm(data.generator_bpm)
    setEditKey(data.generator_key)
    setEditScale(data.generator_scale)
    setEditComplexity(data.generator_complexity)
    setEditSeed(data.generator_seed ?? '')
    const defs = data.music_definitions || {}
    setEditMusicJson({
      explore: defs.explore ? JSON.stringify(defs.explore, null, 2) : '',
      combat: defs.combat ? JSON.stringify(defs.combat, null, 2) : '',
      boss: defs.boss ? JSON.stringify(defs.boss, null, 2) : '',
      mystery: defs.mystery ? JSON.stringify(defs.mystery, null, 2) : '',
    })
  }

  const handleCreate = async () => {
    setSaving(true)
    setMessage('')
    try {
      const musicDefs: any = {}
      for (const state of MUSIC_STATES) {
        if (editMusicJson[state].trim()) {
          try { musicDefs[state] = JSON.parse(editMusicJson[state]) }
          catch { setMessage(`Invalid JSON in ${state}`); setSaving(false); return }
        }
      }

      const res = await api.post('/api/admin/atmospheres', {
        name: editName,
        archetype: editArchetype || null,
        description: editDescription || null,
        music_definitions: Object.keys(musicDefs).length > 0 ? musicDefs : null,
        generator_bpm: editBpm,
        generator_key: editKey,
        generator_scale: editScale,
        generator_complexity: editComplexity,
        generator_seed: editSeed === '' ? null : editSeed,
      })

      if (res.ok) {
        const data = await res.json()
        setMessage(`Created atmosphere #${data.id}`)
        setCreating(false)
        fetchList()
        fetchDetail(data.id)
        setEditing(false)
      } else {
        const err = await res.json()
        setMessage(`Error: ${err.detail}`)
      }
    } catch { setMessage('Network error') }
    setSaving(false)
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    setMessage('')
    try {
      const musicDefs: any = {}
      for (const state of MUSIC_STATES) {
        if (editMusicJson[state].trim()) {
          try { musicDefs[state] = JSON.parse(editMusicJson[state]) }
          catch { setMessage(`Invalid JSON in ${state}`); setSaving(false); return }
        }
      }

      const res = await api.put(`/api/admin/atmospheres/${selected.id}`, {
        name: editName,
        archetype: editArchetype || null,
        description: editDescription || null,
        music_definitions: Object.keys(musicDefs).length > 0 ? musicDefs : null,
        generator_bpm: editBpm,
        generator_key: editKey,
        generator_scale: editScale,
        generator_complexity: editComplexity,
        generator_seed: editSeed === '' ? null : editSeed,
      })

      if (res.ok) {
        setMessage('Saved')
        setEditing(false)
        fetchList()
        fetchDetail(selected.id)
      } else {
        const err = await res.json()
        setMessage(`Error: ${err.detail}`)
      }
    } catch { setMessage('Network error') }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!selected) return
    if (!confirm(`Delete atmosphere "${selected.name}"?`)) return
    try {
      const res = await api.delete(`/api/admin/atmospheres/${selected.id}`)
      if (res.ok) {
        setSelected(null)
        setEditing(false)
        fetchList()
        setMessage('Deleted')
      } else {
        const err = await res.json()
        setMessage(`Error: ${err.detail}`)
      }
    } catch { setMessage('Network error') }
  }

  const handlePreview = (state: string) => {
    try {
      const json = editMusicJson[state]
      if (!json.trim()) return
      const parsed = JSON.parse(json)
      preview.play(parsed)
    } catch {
      setMessage(`Invalid JSON in ${state}`)
    }
  }

  const filtered = filterArchetype
    ? atmospheres.filter(a => a.archetype === filterArchetype)
    : atmospheres

  const startCreate = () => {
    setSelected(null)
    setEditing(false)
    setCreating(true)
    setEditName('')
    setEditArchetype('')
    setEditDescription('')
    setEditBpm(120)
    setEditKey('C')
    setEditScale('minor')
    setEditComplexity(5)
    setEditSeed('')
    setEditMusicJson({ explore: '', combat: '', boss: '', mystery: '' })
    setMessage('')
  }

  return (
    <div className="ae-page">
      <div className="ae-header">
        <h2>Atmosphere Editor</h2>
        <div className="ae-header-actions">
          <select value={filterArchetype} onChange={e => setFilterArchetype(e.target.value)} className="ae-filter">
            <option value="">All Archetypes</option>
            {ARCHETYPES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button className="ae-btn" onClick={() => setShowBatch(true)}>Batch Assign</button>
          <button className="ae-btn ae-btn-primary" onClick={startCreate}>+ Create</button>
        </div>
      </div>

      <div className="ae-layout">
        {/* List panel */}
        <div className="ae-list-panel">
          {loading ? (
            <div className="ae-loading">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="ae-empty">No atmospheres found</div>
          ) : (
            <table className="ae-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Archetype</th>
                  <th>Scenes</th>
                  <th>Ch</th>
                  <th>Books</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr
                    key={a.id}
                    className={selected?.id === a.id ? 'ae-row--selected' : ''}
                    onClick={() => { fetchDetail(a.id); setCreating(false); setEditing(false); setMessage('') }}
                  >
                    <td className="ae-name">{a.name}</td>
                    <td className="ae-archetype">{a.archetype || '—'}</td>
                    <td>{a.scene_count}</td>
                    <td>{a.chapter_count}</td>
                    <td>{a.book_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        <div className="ae-detail-panel">
          {creating ? (
            <div className="ae-detail">
              <h3>Create New Atmosphere</h3>
              {renderEditForm()}
              <div className="ae-detail-actions">
                <button onClick={() => setCreating(false)}>Cancel</button>
                <button className="ae-btn-primary" onClick={handleCreate} disabled={saving || !editName}>
                  {saving ? 'Creating...' : 'Create'}
                </button>
              </div>
              {message && <div className="ae-message">{message}</div>}
            </div>
          ) : selected ? (
            <div className="ae-detail">
              <div className="ae-detail-header">
                <h3>{selected.name}</h3>
                <div>
                  {!editing && <button className="ae-btn" onClick={() => setEditing(true)}>Edit</button>}
                  <button className="ae-btn ae-btn-danger" onClick={handleDelete}>Delete</button>
                </div>
              </div>

              {editing ? (
                <>
                  {renderEditForm()}
                  <div className="ae-detail-actions">
                    <button onClick={() => { setEditing(false); populateEditForm(selected) }}>Cancel</button>
                    <button className="ae-btn-primary" onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="ae-info-grid">
                    <div><span className="ae-label">Archetype:</span> {selected.archetype || '—'}</div>
                    <div><span className="ae-label">Description:</span> {selected.description || '—'}</div>
                    <div><span className="ae-label">BPM:</span> {selected.generator_bpm}</div>
                    <div><span className="ae-label">Key:</span> {selected.generator_key} {selected.generator_scale}</div>
                    <div><span className="ae-label">Complexity:</span> {selected.generator_complexity}</div>
                  </div>

                  <h4>Music Definitions</h4>
                  {MUSIC_STATES.map(state => {
                    const def = selected.music_definitions?.[state]
                    return (
                      <div key={state} className="ae-music-state">
                        <div className="ae-music-state-header">
                          <span className="ae-state-label">{state}</span>
                          {def && <button className="ae-btn ae-btn-sm" onClick={() => handlePreview(state)}>Preview</button>}
                        </div>
                        <pre className="ae-json-preview">
                          {def ? JSON.stringify(def, null, 2) : '(empty)'}
                        </pre>
                      </div>
                    )
                  })}

                  <h4>Assignments</h4>
                  <div className="ae-assignments">
                    <div><span className="ae-label">Scenes:</span> {selected.assigned_scene_ids.length} scenes</div>
                    <div><span className="ae-label">Chapters:</span> {selected.assigned_chapters.map(c => c.title || `#${c.id}`).join(', ') || '—'}</div>
                    <div><span className="ae-label">Books:</span> {selected.assigned_books.map(b => b.title || `#${b.id}`).join(', ') || '—'}</div>
                  </div>
                </>
              )}

              {message && <div className="ae-message">{message}</div>}
            </div>
          ) : (
            <div className="ae-detail ae-empty-detail">
              Select an atmosphere or create a new one
            </div>
          )}
        </div>
      </div>

      {showBatch && (
        <BatchAssignModal
          atmospheres={atmospheres}
          onClose={() => setShowBatch(false)}
          onAssigned={() => { fetchList(); setShowBatch(false) }}
        />
      )}
    </div>
  )

  function renderEditForm() {
    return (
      <div className="ae-edit-form">
        <div className="ae-form-row">
          <label>Name</label>
          <input type="text" value={editName} onChange={e => setEditName(e.target.value)} />
        </div>
        <div className="ae-form-row">
          <label>Archetype</label>
          <select value={editArchetype} onChange={e => setEditArchetype(e.target.value)}>
            <option value="">None</option>
            {ARCHETYPES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="ae-form-row">
          <label>Description</label>
          <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2} />
        </div>
        <div className="ae-form-grid">
          <div className="ae-form-row">
            <label>BPM</label>
            <input type="number" value={editBpm} onChange={e => setEditBpm(Number(e.target.value))} />
          </div>
          <div className="ae-form-row">
            <label>Key</label>
            <input type="text" value={editKey} onChange={e => setEditKey(e.target.value)} />
          </div>
          <div className="ae-form-row">
            <label>Scale</label>
            <input type="text" value={editScale} onChange={e => setEditScale(e.target.value)} />
          </div>
          <div className="ae-form-row">
            <label>Complexity</label>
            <input type="number" value={editComplexity} onChange={e => setEditComplexity(Number(e.target.value))} min={1} max={10} />
          </div>
          <div className="ae-form-row">
            <label>Seed</label>
            <input type="number" value={editSeed} onChange={e => setEditSeed(e.target.value === '' ? '' : Number(e.target.value))} placeholder="random" />
          </div>
        </div>

        <h4>Music Definitions (JSON per state)</h4>
        {MUSIC_STATES.map(state => (
          <div key={state} className="ae-music-editor">
            <div className="ae-music-editor-header">
              <span className="ae-state-label">{state}</span>
              <button className="ae-btn ae-btn-sm" onClick={() => handlePreview(state)} type="button">Preview</button>
              <button className="ae-btn ae-btn-sm" onClick={() => preview.stop()} type="button">Stop</button>
            </div>
            <textarea
              className="ae-json-editor"
              value={editMusicJson[state]}
              onChange={e => setEditMusicJson(prev => ({ ...prev, [state]: e.target.value }))}
              rows={8}
              placeholder={`{ "bpm": 120, "melody": { ... }, "bass": { ... } }`}
              spellCheck={false}
            />
          </div>
        ))}
      </div>
    )
  }
}
