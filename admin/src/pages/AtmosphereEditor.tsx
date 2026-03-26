import { useAtmosphereEditor, ARCHETYPES, MUSIC_STATES } from './useAtmosphereEditor'
import BatchAssignModal from './BatchAssignModal'
import './AtmosphereEditor.css'

// Re-export for backwards compatibility (SFXConfigEditor imports from here)
export { useSFXPreview } from './atmosphereAudio'

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export default function AtmosphereEditor() {
  const e = useAtmosphereEditor()

  return (
    <div className="ae-page">
      <div className="ae-header">
        <h2>Atmosphere Editor</h2>
        <div className="ae-header-actions">
          <select value={e.filterArchetype} onChange={ev => e.setFilterArchetype(ev.target.value)} className="ae-filter">
            <option value="">All Archetypes</option>
            {ARCHETYPES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button className="ae-btn" onClick={() => e.setShowBatch(true)}>Batch Assign</button>
          <button className="ae-btn ae-btn-primary" onClick={e.startCreate}>+ Create</button>
        </div>
      </div>

      <div className="ae-layout">
        {/* List panel */}
        <div className="ae-list-panel">
          {e.loading ? (
            <div className="ae-loading">Loading...</div>
          ) : e.filtered.length === 0 ? (
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
                {e.filtered.map(a => (
                  <tr
                    key={a.id}
                    className={e.selected?.id === a.id ? 'ae-row--selected' : ''}
                    onClick={() => e.selectAtmosphere(a.id)}
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
          {e.creating ? (
            <div className="ae-detail">
              <h3>Create New Atmosphere</h3>
              <EditForm e={e} />
              <div className="ae-detail-actions">
                <button onClick={() => e.setCreating(false)}>Cancel</button>
                <button className="ae-btn-primary" onClick={e.handleCreate} disabled={e.saving || !e.editName}>
                  {e.saving ? 'Creating...' : 'Create'}
                </button>
              </div>
              {e.message && <div className="ae-message">{e.message}</div>}
            </div>
          ) : e.selected ? (
            <div className="ae-detail">
              <div className="ae-detail-header">
                <h3>{e.selected.name}</h3>
                <div>
                  {!e.editing && <button className="ae-btn" onClick={() => e.setEditing(true)}>Edit</button>}
                  <button className="ae-btn ae-btn-danger" onClick={e.handleDelete}>Delete</button>
                </div>
              </div>

              {e.editing ? (
                <>
                  <EditForm e={e} />
                  <div className="ae-detail-actions">
                    <button onClick={e.cancelEdit}>Cancel</button>
                    <button className="ae-btn-primary" onClick={e.handleSave} disabled={e.saving}>
                      {e.saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="ae-info-grid">
                    <div><span className="ae-label">Archetype:</span> {e.selected.archetype || '—'}</div>
                    <div><span className="ae-label">Description:</span> {e.selected.description || '—'}</div>
                    <div><span className="ae-label">BPM:</span> {e.selected.generator_bpm}</div>
                    <div><span className="ae-label">Key:</span> {e.selected.generator_key} {e.selected.generator_scale}</div>
                    <div><span className="ae-label">Complexity:</span> {e.selected.generator_complexity}</div>
                  </div>

                  <h4>Music Definitions</h4>
                  {MUSIC_STATES.map(state => {
                    const def = e.selected!.music_definitions?.[state]
                    return (
                      <div key={state} className="ae-music-state">
                        <div className="ae-music-state-header">
                          <span className="ae-state-label">{state}</span>
                          {def && <button className="ae-btn ae-btn-sm" onClick={() => e.handlePreview(state)}>Preview</button>}
                        </div>
                        <pre className="ae-json-preview">
                          {def ? JSON.stringify(def, null, 2) : '(empty)'}
                        </pre>
                      </div>
                    )
                  })}

                  <h4>Assignments</h4>
                  <div className="ae-assignments">
                    <div><span className="ae-label">Scenes:</span> {e.selected.assigned_scene_ids.length} scenes</div>
                    <div><span className="ae-label">Chapters:</span> {e.selected.assigned_chapters.map(c => c.title || `#${c.id}`).join(', ') || '—'}</div>
                    <div><span className="ae-label">Books:</span> {e.selected.assigned_books.map(b => b.title || `#${b.id}`).join(', ') || '—'}</div>
                  </div>
                </>
              )}

              {e.message && <div className="ae-message">{e.message}</div>}
            </div>
          ) : (
            <div className="ae-detail ae-empty-detail">
              Select an atmosphere or create a new one
            </div>
          )}
        </div>
      </div>

      {e.showBatch && (
        <BatchAssignModal
          atmospheres={e.atmospheres}
          onClose={() => e.setShowBatch(false)}
          onAssigned={() => { e.fetchList(); e.setShowBatch(false) }}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Edit Form (extracted from inner function)                           */
/* ------------------------------------------------------------------ */

function EditForm({ e }: { e: ReturnType<typeof useAtmosphereEditor> }) {
  return (
    <div className="ae-edit-form">
      <div className="ae-form-row">
        <label>Name</label>
        <input type="text" value={e.editName} onChange={ev => e.setEditName(ev.target.value)} />
      </div>
      <div className="ae-form-row">
        <label>Archetype</label>
        <select value={e.editArchetype} onChange={ev => e.setEditArchetype(ev.target.value)}>
          <option value="">None</option>
          {ARCHETYPES.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <div className="ae-form-row">
        <label>Description</label>
        <textarea value={e.editDescription} onChange={ev => e.setEditDescription(ev.target.value)} rows={2} />
      </div>
      <div className="ae-form-grid">
        <div className="ae-form-row">
          <label>BPM</label>
          <input type="number" value={e.editBpm} onChange={ev => e.setEditBpm(Number(ev.target.value))} />
        </div>
        <div className="ae-form-row">
          <label>Key</label>
          <input type="text" value={e.editKey} onChange={ev => e.setEditKey(ev.target.value)} />
        </div>
        <div className="ae-form-row">
          <label>Scale</label>
          <input type="text" value={e.editScale} onChange={ev => e.setEditScale(ev.target.value)} />
        </div>
        <div className="ae-form-row">
          <label>Complexity</label>
          <input type="number" value={e.editComplexity} onChange={ev => e.setEditComplexity(Number(ev.target.value))} min={1} max={10} />
        </div>
        <div className="ae-form-row">
          <label>Seed</label>
          <input type="number" value={e.editSeed} onChange={ev => e.setEditSeed(ev.target.value === '' ? '' : Number(ev.target.value))} placeholder="random" />
        </div>
      </div>

      <h4>Music Definitions (JSON per state)</h4>
      {MUSIC_STATES.map(state => (
        <div key={state} className="ae-music-editor">
          <div className="ae-music-editor-header">
            <span className="ae-state-label">{state}</span>
            <button className="ae-btn ae-btn-sm" onClick={() => e.handlePreview(state)} type="button">Preview</button>
            <button className="ae-btn ae-btn-sm" onClick={() => e.preview.stop()} type="button">Stop</button>
          </div>
          <textarea
            className="ae-json-editor"
            value={e.editMusicJson[state]}
            onChange={ev => e.setEditMusicJson(prev => ({ ...prev, [state]: ev.target.value }))}
            rows={8}
            placeholder={`{ "bpm": 120, "melody": { ... }, "bass": { ... } }`}
            spellCheck={false}
          />
        </div>
      ))}
    </div>
  )
}
