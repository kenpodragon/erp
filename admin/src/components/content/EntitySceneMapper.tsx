import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import EntityPicker from './shared/EntityPicker'

interface TreeBook {
  id: number
  book_number: number
  title: string
  chapters: TreeChapter[]
}

interface TreeChapter {
  id: number
  chapter_number: number
  title: string
  scenes: TreeScene[]
}

interface TreeScene {
  id: number
  scene_number: number
  title: string | null
  entity_count: number
}

interface EntitySceneMapping {
  id: number
  entity_id: number
  scene_id: number
  entity_name: string
  role: string | null
  is_present: boolean
  description_delta: string | null
  emotional_state_delta: string | null
  equipment_delta: string | null
  entry_context: string | null
  exit_reason: string | null
  relationships: string | null
}

export default function EntitySceneMapper() {
  const [tree, setTree] = useState<TreeBook[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedBooks, setExpandedBooks] = useState<Set<number>>(new Set())
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set())
  const [selectedScene, setSelectedScene] = useState<TreeScene | null>(null)
  const [mappings, setMappings] = useState<EntitySceneMapping[]>([])
  const [mappingLoading, setMappingLoading] = useState(false)
  const [expandedMapping, setExpandedMapping] = useState<number | null>(null)
  const [editMapping, setEditMapping] = useState<Record<string, any> | null>(null)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [copyFromScene, setCopyFromScene] = useState<number | null>(null)
  const [showCopyDialog, setShowCopyDialog] = useState(false)

  const fetchTree = useCallback(async () => {
    setLoading(true)
    try {
      const booksRes = await api.get('/api/admin/content/books')
      if (!booksRes.ok) { setLoading(false); return }
      const booksData = await booksRes.json()
      const books = Array.isArray(booksData) ? booksData : booksData.items || []

      const treeData: TreeBook[] = []
      for (const book of books) {
        const chapRes = await api.get(`/api/admin/content/chapters?book_id=${book.id}`)
        if (!chapRes.ok) continue
        const chapData = await chapRes.json()
        const chapters = Array.isArray(chapData) ? chapData : chapData.items || []

        const treeChapters: TreeChapter[] = []
        for (const ch of chapters) {
          const sceneRes = await api.get(`/api/admin/content/scenes?chapter_id=${ch.id}`)
          if (!sceneRes.ok) continue
          const sceneData = await sceneRes.json()
          const scenes = (Array.isArray(sceneData) ? sceneData : sceneData.items || []).map((s: any) => ({
            id: s.id,
            scene_number: s.scene_number,
            title: s.title,
            entity_count: s.entities_count || 0,
          }))
          treeChapters.push({ id: ch.id, chapter_number: ch.chapter_number, title: ch.title, scenes })
        }
        treeData.push({ id: book.id, book_number: book.book_number, title: book.title, chapters: treeChapters })
      }
      setTree(treeData)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchTree() }, [fetchTree])

  const fetchMappings = useCallback(async (sceneId: number) => {
    setMappingLoading(true)
    try {
      const res = await api.get(`/api/admin/content/entity-scenes?scene_id=${sceneId}`)
      if (res.ok) {
        const data = await res.json()
        setMappings(Array.isArray(data) ? data : data.items || [])
      }
    } catch { /* ignore */ }
    setMappingLoading(false)
  }, [])

  const handleSceneSelect = (scene: TreeScene) => {
    setSelectedScene(scene)
    setExpandedMapping(null)
    setEditMapping(null)
    fetchMappings(scene.id)
  }

  const addEntity = async (entityId: number | null) => {
    if (!entityId || !selectedScene) return
    setSaving(true)
    try {
      const res = await api.post('/api/admin/content/entity-scenes', { entity_id: entityId, scene_id: selectedScene.id, is_present: true })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Entity added' })
        fetchMappings(selectedScene.id)
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to add' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setSaving(false)
  }

  const removeMapping = async (mappingId: number) => {
    if (!selectedScene) return
    try {
      const res = await api.delete(`/api/admin/content/entity-scenes/${mappingId}`)
      if (res.ok) {
        setMessage({ type: 'success', text: 'Removed' })
        fetchMappings(selectedScene.id)
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
  }

  const updateMapping = async () => {
    if (!editMapping || !selectedScene) return
    setSaving(true)
    try {
      const res = await api.patch(`/api/admin/content/entity-scenes/${editMapping.id}`, editMapping)
      if (res.ok) {
        setMessage({ type: 'success', text: 'Updated' })
        setEditMapping(null)
        fetchMappings(selectedScene.id)
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setSaving(false)
  }

  const copyFromSceneFn = async () => {
    if (!copyFromScene || !selectedScene) return
    setSaving(true)
    try {
      const res = await api.post('/api/admin/content/entity-scenes/copy', { source_scene_id: copyFromScene, target_scene_id: selectedScene.id })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Copied entities' })
        setShowCopyDialog(false)
        fetchMappings(selectedScene.id)
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setSaving(false)
  }

  const toggleBook = (id: number) => setExpandedBooks(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleChapter = (id: number) => setExpandedChapters(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  return (
    <div className="editor-panel">
      {message && (
        <div className={`editor-message editor-message--${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>x</button>
        </div>
      )}

      <div className="split-panel">
        {/* Left: Tree */}
        <div className="split-panel-left">
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-info)', marginBottom: '8px', textTransform: 'uppercase' }}>Scene Tree</div>
          {loading ? (
            <div className="editor-loading">Loading...</div>
          ) : (
            <div className="tree-view">
              {tree.map(book => (
                <div key={book.id} className="tree-node">
                  <div className="tree-node-header" onClick={() => toggleBook(book.id)}>
                    <span className="tree-toggle">{expandedBooks.has(book.id) ? 'v' : '>'}</span>
                    <span className="tree-label">Book {book.book_number}: {book.title}</span>
                  </div>
                  {expandedBooks.has(book.id) && (
                    <div className="tree-node-children">
                      {book.chapters.map(ch => (
                        <div key={ch.id} className="tree-node">
                          <div className="tree-node-header" onClick={() => toggleChapter(ch.id)}>
                            <span className="tree-toggle">{expandedChapters.has(ch.id) ? 'v' : '>'}</span>
                            <span className="tree-label">Ch {ch.chapter_number}: {ch.title}</span>
                          </div>
                          {expandedChapters.has(ch.id) && (
                            <div className="tree-node-children">
                              {ch.scenes.map(sc => (
                                <div
                                  key={sc.id}
                                  className={`tree-node-header ${selectedScene?.id === sc.id ? 'selected' : ''}`}
                                  onClick={() => handleSceneSelect(sc)}
                                >
                                  <span className="tree-toggle" />
                                  <span className="tree-label">Scene {sc.scene_number}: {sc.title || 'Untitled'}</span>
                                  <span className="tree-count">{sc.entity_count}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Mappings */}
        <div className="split-panel-right">
          {!selectedScene ? (
            <div className="editor-empty">Select a scene from the tree to view entity assignments.</div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>
                  Scene {selectedScene.scene_number}: {selectedScene.title || 'Untitled'}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-sm" onClick={() => setShowCopyDialog(true)}>Copy From...</button>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <EntityPicker value={null} onChange={id => addEntity(id)} placeholder="Add entity to scene..." />
              </div>

              {mappingLoading ? (
                <div className="editor-loading">Loading...</div>
              ) : mappings.length === 0 ? (
                <div className="editor-empty">No entities assigned to this scene.</div>
              ) : (
                <div className="editor-table-wrapper" style={{ maxHeight: '400px' }}>
                  <table className="editor-table">
                    <thead>
                      <tr>
                        <th>Entity</th>
                        <th>Role</th>
                        <th>Present</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappings.map(m => (
                        <>
                          <tr key={m.id} className={expandedMapping === m.id ? 'row-selected' : ''}>
                            <td>{m.entity_name}</td>
                            <td>{m.role || '--'}</td>
                            <td>
                              <input type="checkbox" checked={m.is_present} onChange={async e => {
                                await api.patch(`/api/admin/content/entity-scenes/${m.id}`, { is_present: e.target.checked })
                                fetchMappings(selectedScene.id)
                              }} />
                            </td>
                            <td>
                              <button className="btn btn-sm btn-primary" onClick={() => { setExpandedMapping(expandedMapping === m.id ? null : m.id); setEditMapping({ ...m }) }}>
                                {expandedMapping === m.id ? 'Close' : 'Edit'}
                              </button>
                              <button className="btn btn-sm btn-danger" onClick={() => removeMapping(m.id)} style={{ marginLeft: 4 }}>Remove</button>
                            </td>
                          </tr>
                          {expandedMapping === m.id && editMapping && (
                            <tr key={`${m.id}-edit`}>
                              <td colSpan={4}>
                                <div className="form-grid" style={{ padding: '8px' }}>
                                  <div className="form-field">
                                    <label className="form-label">Role</label>
                                    <input className="form-input" value={editMapping.role || ''} onChange={e => setEditMapping(p => p ? { ...p, role: e.target.value } : null)} />
                                  </div>
                                  <div className="form-field">
                                    <label className="form-label">Entry Context</label>
                                    <input className="form-input" value={editMapping.entry_context || ''} onChange={e => setEditMapping(p => p ? { ...p, entry_context: e.target.value } : null)} />
                                  </div>
                                  <div className="form-field">
                                    <label className="form-label">Exit Reason</label>
                                    <input className="form-input" value={editMapping.exit_reason || ''} onChange={e => setEditMapping(p => p ? { ...p, exit_reason: e.target.value } : null)} />
                                  </div>
                                  <div className="form-field form-field--full">
                                    <label className="form-label">Description Delta</label>
                                    <textarea className="form-textarea" value={editMapping.description_delta || ''} onChange={e => setEditMapping(p => p ? { ...p, description_delta: e.target.value } : null)} rows={2} />
                                  </div>
                                  <div className="form-field">
                                    <label className="form-label">Emotional State Delta</label>
                                    <textarea className="form-textarea" value={editMapping.emotional_state_delta || ''} onChange={e => setEditMapping(p => p ? { ...p, emotional_state_delta: e.target.value } : null)} rows={2} />
                                  </div>
                                  <div className="form-field">
                                    <label className="form-label">Equipment Delta</label>
                                    <textarea className="form-textarea" value={editMapping.equipment_delta || ''} onChange={e => setEditMapping(p => p ? { ...p, equipment_delta: e.target.value } : null)} rows={2} />
                                  </div>
                                  <div className="form-field form-field--full">
                                    <label className="form-label">Relationships</label>
                                    <textarea className="form-textarea" value={editMapping.relationships || ''} onChange={e => setEditMapping(p => p ? { ...p, relationships: e.target.value } : null)} rows={2} />
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', padding: '8px' }}>
                                  <button className="btn btn-sm" onClick={() => { setExpandedMapping(null); setEditMapping(null) }}>Cancel</button>
                                  <button className="btn btn-sm btn-success" onClick={updateMapping} disabled={saving}>Save</button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Copy Dialog */}
      {showCopyDialog && (
        <div className="dialog-overlay" onClick={() => setShowCopyDialog(false)}>
          <div className="dialog-box" onClick={e => e.stopPropagation()}>
            <h4>Copy Entities From Another Scene</h4>
            <p>Enter the source scene ID to copy all entity mappings from.</p>
            <input
              className="form-input"
              type="number"
              placeholder="Source Scene ID"
              value={copyFromScene || ''}
              onChange={e => setCopyFromScene(e.target.value ? Number(e.target.value) : null)}
              style={{ marginBottom: '12px' }}
            />
            <div className="dialog-actions">
              <button className="btn" onClick={() => setShowCopyDialog(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={copyFromSceneFn} disabled={!copyFromScene || saving}>Copy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
