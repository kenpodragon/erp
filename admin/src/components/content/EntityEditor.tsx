import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import CascadingPicker from './shared/CascadingPicker'
import AssetPicker from './shared/AssetPicker'
import AtmospherePicker from './shared/AtmospherePicker'
import JsonEditor from './shared/JsonEditor'
import DeleteConfirmDialog from './shared/DeleteConfirmDialog'

interface Entity {
  id: number
  canonical_name: string
  entity_type_id: number
  entity_family_id: number | null
  entity_type_name?: string
  entity_type_display_name?: string
  entity_type_color_hex?: string
  entity_family_name?: string
  entity_family_display_name?: string
  resolved_visual_behavior?: string
  is_generated: boolean
  description: string | null
  first_appearance_book_id: number | null
  first_appearance_chapter_id: number | null
  first_appearance_scene_id: number | null
  emotional_state: string | null
  sounds: string | null
  smells: string | null
  equipment: string | null
  abilities: string | null
  boss_text_references: string | null
  boss_action_quote: string | null
  boss_variant_differences: string | null
  sprite_key: string | null
  base_hp: number | null
  base_gold: number | null
  appearance_rate: number | null
  stat_block: Record<string, any> | null
  boss_theme_id: number | null
  death_sfx_key: string | null
  has_gameplay: boolean
  attack_types?: any[]
  aliases?: string[]
  scene_count?: number
  beat_count?: number
}

interface EntityTypeOption {
  id: number
  name: string
  display_name: string
  color_hex: string | null
  sort_order: number
}

interface EntityFamilyOption {
  id: number
  name: string
  display_name: string
}

interface EntityEditorProps {
  onNavigate?: (tab: string, params?: Record<string, string>) => void
}

export default function EntityEditor({ onNavigate }: EntityEditorProps) {
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50

  const [filterTypes, setFilterTypes] = useState<number[]>([])
  const [filterFamily, setFilterFamily] = useState('')
  const [filterHasGameplay, setFilterHasGameplay] = useState<string>('')
  const [searchText, setSearchText] = useState('')
  const [families, setFamilies] = useState<string[]>([])
  const [entityTypeOptions, setEntityTypeOptions] = useState<EntityTypeOption[]>([])
  const [entityFamilyOptions, setEntityFamilyOptions] = useState<EntityFamilyOption[]>([])

  const [selected, setSelected] = useState<Entity | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Entity | null>(null)

  const [showLoreDetails, setShowLoreDetails] = useState(false)
  const [showGameplay, setShowGameplay] = useState(false)
  const [attackTypes, setAttackTypes] = useState<any[]>([])
  const [allAttackTypes, setAllAttackTypes] = useState<any[]>([])
  const [aliases, setAliases] = useState<string[]>([])
  const [newAlias, setNewAlias] = useState('')

  const fetchFamilies = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/content/entities/families')
      if (res.ok) setFamilies(await res.json())
    } catch { /* ignore */ }
  }, [])

  const fetchEntityTypeOptions = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/classification/entity-types')
      if (res.ok) {
        const data = await res.json()
        setEntityTypeOptions(Array.isArray(data) ? data : data.items || [])
      }
    } catch { /* ignore */ }
  }, [])

  const fetchEntityFamilyOptions = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/classification/entity-families')
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : data.items || []
        setEntityFamilyOptions(items)
      }
    } catch { /* ignore */ }
  }, [])

  const fetchAllAttackTypes = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/game/attack-types')
      if (res.ok) setAllAttackTypes(await res.json())
    } catch { /* ignore */ }
  }, [])

  const fetchEntities = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
      if (searchText) params.set('search', searchText)
      if (filterTypes.length > 0) params.set('entity_type_ids', filterTypes.join(','))
      if (filterFamily) params.set('entity_family', filterFamily)
      if (filterHasGameplay) params.set('has_gameplay', filterHasGameplay)
      const res = await api.get(`/api/admin/content/entities?${params}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setEntities(data)
          setTotal(data.length)
        } else {
          setEntities(data.items || [])
          setTotal(data.total || data.items?.length || 0)
        }
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [page, searchText, filterTypes, filterFamily, filterHasGameplay])

  useEffect(() => { fetchFamilies(); fetchEntityTypeOptions(); fetchEntityFamilyOptions(); fetchAllAttackTypes() }, [fetchFamilies, fetchEntityTypeOptions, fetchEntityFamilyOptions, fetchAllAttackTypes])
  useEffect(() => { fetchEntities() }, [fetchEntities])

  const fetchEntityAttackTypes = useCallback(async (entityId: number) => {
    try {
      const res = await api.get(`/api/admin/content/entities/${entityId}/attack-types`)
      if (res.ok) setAttackTypes(await res.json())
    } catch { /* ignore */ }
  }, [])

  const handleSelect = (entity: Entity) => {
    setSelected(entity)
    setForm({ ...entity })
    setCreating(false)
    setShowLoreDetails(false)
    setShowGameplay(entity.has_gameplay)
    setAliases(entity.aliases || [])
    fetchEntityAttackTypes(entity.id)
  }

  const handleCreate = () => {
    setSelected(null)
    setCreating(true)
    setForm({ entity_type_id: entityTypeOptions.length > 0 ? entityTypeOptions[0].id : 0, entity_family_id: null, is_generated: false, has_gameplay: false, stat_block: {} })
    setShowLoreDetails(false)
    setShowGameplay(false)
    setAliases([])
    setAttackTypes([])
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        canonical_name: form.canonical_name,
        entity_type_id: Number(form.entity_type_id),
        entity_family_id: form.entity_family_id ? Number(form.entity_family_id) : null,
        is_generated: !!form.is_generated,
        description: form.description || null,
        first_appearance_book_id: form.first_appearance_book_id || null,
        first_appearance_chapter_id: form.first_appearance_chapter_id || null,
        first_appearance_scene_id: form.first_appearance_scene_id || null,
        emotional_state: form.emotional_state || null,
        sounds: form.sounds || null,
        smells: form.smells || null,
        equipment: form.equipment || null,
        abilities: form.abilities || null,
        boss_text_references: form.boss_text_references || null,
        boss_action_quote: form.boss_action_quote || null,
        boss_variant_differences: form.boss_variant_differences || null,
        sprite_key: form.sprite_key || null,
        base_hp: form.base_hp ? Number(form.base_hp) : null,
        base_gold: form.base_gold ? Number(form.base_gold) : null,
        appearance_rate: form.appearance_rate ? Number(form.appearance_rate) : null,
        stat_block: form.stat_block || null,
        boss_theme_id: form.boss_theme_id || null,
        death_sfx_key: form.death_sfx_key || null,
      }

      if (creating) {
        const res = await api.post('/api/admin/content/entities', body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Entity created' })
          setCreating(false)
          await fetchEntities()
        } else {
          const err = await res.json().catch(() => ({}))
          setMessage({ type: 'error', text: err.detail || 'Failed to create' })
        }
      } else if (selected) {
        const res = await api.patch(`/api/admin/content/entities/${selected.id}`, body)
        if (res.ok) {
          setMessage({ type: 'success', text: 'Entity updated' })
          setSelected(null)
          await fetchEntities()
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
      const res = await api.delete(`/api/admin/content/entities/${deleteTarget.id}`)
      if (res.ok) {
        setMessage({ type: 'success', text: 'Entity deleted' })
        setSelected(null)
        await fetchEntities()
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to delete' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setDeleteTarget(null)
  }

  const saveAttackTypes = async () => {
    if (!selected) return
    try {
      const res = await api.put(`/api/admin/content/entities/${selected.id}/attack-types`, attackTypes)
      if (res.ok) setMessage({ type: 'success', text: 'Attack types updated' })
      else setMessage({ type: 'error', text: 'Failed to update attack types' })
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
  }

  const addAlias = async () => {
    if (!newAlias.trim() || !selected) return
    try {
      const res = await api.post(`/api/admin/content/entities/${selected.id}/aliases`, { alias: newAlias.trim() })
      if (res.ok) {
        setAliases([...aliases, newAlias.trim()])
        setNewAlias('')
      }
    } catch { /* ignore */ }
  }

  const removeAlias = async (alias: string) => {
    if (!selected) return
    try {
      await api.delete(`/api/admin/content/entities/${selected.id}/aliases`, { alias })
      setAliases(aliases.filter(a => a !== alias))
    } catch { /* ignore */ }
  }

  const toggleFilter = (typeId: number) => {
    setFilterTypes(prev => prev.includes(typeId) ? prev.filter(t => t !== typeId) : [...prev, typeId])
    setPage(1)
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
        <input className="form-input" placeholder="Search entities..." value={searchText} onChange={e => { setSearchText(e.target.value); setPage(1) }} style={{ width: 200 }} />
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {entityTypeOptions.map(t => (
            <button key={t.id} className={`btn btn-sm ${filterTypes.includes(t.id) ? 'btn-primary' : ''}`} onClick={() => toggleFilter(t.id)}>
              {t.color_hex && <span className="cls-color-badge" style={{ backgroundColor: t.color_hex, width: 8, height: 8, borderRadius: '50%', display: 'inline-block', marginRight: 4 }} />}
              {t.display_name}
            </button>
          ))}
        </div>
        <select className="form-select" value={filterFamily} onChange={e => { setFilterFamily(e.target.value); setPage(1) }} style={{ width: 150 }}>
          <option value="">All Families</option>
          {families.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className="form-select" value={filterHasGameplay} onChange={e => { setFilterHasGameplay(e.target.value); setPage(1) }} style={{ width: 140 }}>
          <option value="">All</option>
          <option value="true">Has Gameplay</option>
          <option value="false">No Gameplay</option>
        </select>
      </div>

      <div className="editor-toolbar">
        <div className="editor-toolbar-left">
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{total} entities</span>
        </div>
        <div className="editor-toolbar-right">
          <button className="btn btn-success" onClick={handleCreate}>+ New Entity</button>
        </div>
      </div>

      {loading ? (
        <div className="editor-loading">Loading entities...</div>
      ) : entities.length === 0 ? (
        <div className="editor-empty">No entities found.</div>
      ) : (
        <>
          <div className="editor-table-wrapper">
            <table className="editor-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Family</th>
                  <th>Gameplay</th>
                  <th>Scenes</th>
                  <th>Beats</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entities.map(entity => (
                  <tr key={entity.id} className={selected?.id === entity.id ? 'row-selected' : ''}>
                    <td>{entity.canonical_name}</td>
                    <td>
                      <span className="badge badge--info" style={entity.entity_type_color_hex ? { backgroundColor: entity.entity_type_color_hex, color: '#fff' } : undefined}>
                        {entity.entity_type_display_name || entity.entity_type_name || `Type #${entity.entity_type_id}`}
                      </span>
                    </td>
                    <td>{entity.entity_family_display_name || entity.entity_family_name || '--'}</td>
                    <td>{entity.has_gameplay ? <span className="badge badge--success">Yes</span> : <span className="badge badge--muted">No</span>}</td>
                    <td>{entity.scene_count ?? '--'}</td>
                    <td>{entity.beat_count ?? '--'}</td>
                    <td>
                      <button className="btn btn-sm btn-primary" onClick={() => handleSelect(entity)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => setDeleteTarget(entity)} style={{ marginLeft: 4 }}>Delete</button>
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
          <h3>{creating ? 'Create Entity' : `Edit Entity #${selected?.id}`}</h3>

          {/* Core */}
          <div className="section-header">Core</div>
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">Canonical Name</label>
              <input className="form-input" value={form.canonical_name || ''} onChange={e => setForm(p => ({ ...p, canonical_name: e.target.value }))} />
            </div>
            <div className="form-field">
              <label className="form-label">Entity Type</label>
              <select className="form-select" value={form.entity_type_id ?? ''} onChange={e => setForm(p => ({ ...p, entity_type_id: Number(e.target.value) }))}>
                <option value="" disabled>Select type...</option>
                {entityTypeOptions.map(t => (
                  <option key={t.id} value={t.id}>{t.display_name}</option>
                ))}
              </select>
              {form.entity_type_id && (() => {
                const selected = entityTypeOptions.find(t => t.id === Number(form.entity_type_id))
                return selected?.color_hex ? (
                  <span className="cls-color-badge" style={{ backgroundColor: selected.color_hex, width: 12, height: 12, borderRadius: '50%', display: 'inline-block', marginTop: 4 }} />
                ) : null
              })()}
            </div>
            <div className="form-field">
              <label className="form-label">Family</label>
              <select className="form-select" value={form.entity_family_id ?? ''} onChange={e => setForm(p => ({ ...p, entity_family_id: e.target.value ? Number(e.target.value) : null }))}>
                <option value="">None</option>
                {entityFamilyOptions.map(f => (
                  <option key={f.id} value={f.id}>{f.display_name}</option>
                ))}
              </select>
            </div>
            {form.resolved_visual_behavior && (
              <div className="form-field">
                <label className="form-label">Visual Behavior</label>
                <span className="badge badge--muted">{form.resolved_visual_behavior}</span>
              </div>
            )}
            <div className="form-field">
              <div className="form-checkbox-row">
                <input type="checkbox" checked={!!form.is_generated} onChange={e => setForm(p => ({ ...p, is_generated: e.target.checked }))} />
                <label className="form-label">Is Generated</label>
              </div>
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
          </div>

          {/* Lore Details */}
          <div className="section-collapsible">
            <button className="section-collapsible-header" onClick={() => setShowLoreDetails(!showLoreDetails)}>
              <span>Lore Details</span>
              <span>{showLoreDetails ? '[-]' : '[+]'}</span>
            </button>
            {showLoreDetails && (
              <div className="section-collapsible-body">
                <div className="form-grid">
                  {(['emotional_state', 'sounds', 'smells', 'equipment', 'abilities', 'boss_text_references', 'boss_action_quote', 'boss_variant_differences'] as const).map(field => (
                    <div className="form-field" key={field}>
                      <label className="form-label">{field.replace(/_/g, ' ')}</label>
                      <textarea className="form-textarea" value={form[field] || ''} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} rows={2} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Gameplay Data */}
          <div className="section-collapsible">
            <button className="section-collapsible-header" onClick={() => setShowGameplay(!showGameplay)}>
              <span>Gameplay Data</span>
              <span>{showGameplay ? '[-]' : '[+]'}</span>
            </button>
            {showGameplay && (
              <div className="section-collapsible-body">
                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label">Sprite</label>
                    <AssetPicker category="entity_sprite" value={form.sprite_key} onChange={key => setForm(p => ({ ...p, sprite_key: key }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Base HP</label>
                    <input className="form-input" type="number" value={form.base_hp ?? ''} onChange={e => setForm(p => ({ ...p, base_hp: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Base Gold</label>
                    <input className="form-input" type="number" value={form.base_gold ?? ''} onChange={e => setForm(p => ({ ...p, base_gold: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Appearance Rate</label>
                    <input className="form-input" type="number" step="0.01" value={form.appearance_rate ?? ''} onChange={e => setForm(p => ({ ...p, appearance_rate: e.target.value }))} />
                  </div>
                  <div className="form-field form-field--full">
                    <label className="form-label">Stat Block</label>
                    <JsonEditor value={form.stat_block || {}} onChange={v => setForm(p => ({ ...p, stat_block: v }))} mode="structured" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Boss Theme</label>
                    <AtmospherePicker value={form.boss_theme_id} onChange={id => setForm(p => ({ ...p, boss_theme_id: id }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Death SFX Key</label>
                    <input className="form-input" value={form.death_sfx_key || ''} onChange={e => setForm(p => ({ ...p, death_sfx_key: e.target.value }))} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Attack Types */}
          {!creating && selected && (
            <div className="section-collapsible">
              <button className="section-collapsible-header" onClick={() => {}}>
                <span>Attack Types</span>
              </button>
              <div className="section-collapsible-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px' }}>
                  {allAttackTypes.map((at: any) => {
                    const current = attackTypes.find((a: any) => a.attack_type_id === at.id)
                    return (
                      <div key={at.id} className="form-checkbox-row">
                        <input
                          type="checkbox"
                          checked={!!current}
                          onChange={e => {
                            if (e.target.checked) {
                              setAttackTypes([...attackTypes, { attack_type_id: at.id, is_primary: false }])
                            } else {
                              setAttackTypes(attackTypes.filter((a: any) => a.attack_type_id !== at.id))
                            }
                          }}
                        />
                        <span style={{ fontSize: '12px' }}>{at.display_name || at.name}</span>
                        {current && (
                          <label style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                            <input
                              type="radio"
                              name="primary-attack"
                              checked={current.is_primary}
                              onChange={() => setAttackTypes(attackTypes.map((a: any) => ({ ...a, is_primary: a.attack_type_id === at.id })))}
                            /> Primary
                          </label>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop: '8px' }}>
                  <button className="btn btn-sm btn-success" onClick={saveAttackTypes}>Save Attack Types</button>
                </div>
              </div>
            </div>
          )}

          {/* Aliases */}
          {!creating && selected && (
            <div style={{ marginTop: '12px' }}>
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
          resourceType="Entity"
          resourceName={deleteTarget.canonical_name}
          childCounts={{ scenes: deleteTarget.scene_count || 0, beats: deleteTarget.beat_count || 0 }}
          isBlocked={false}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
