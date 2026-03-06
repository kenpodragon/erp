import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import './ContentEditor.css'

type EntityType = 'stats' | 'classes' | 'skills' | 'benefits' | 'items' | 'attack_types' | 'gear_slots'

interface TabConfig {
  key: EntityType
  label: string
  endpoint: string
  columns: string[]
  nameField: string
}

const TABS: TabConfig[] = [
  { key: 'stats', label: 'Stat Definitions', endpoint: '/api/admin/game/stats', columns: ['id', 'name', 'display_name', 'description', 'base_value'], nameField: 'name' },
  { key: 'classes', label: 'Character Classes', endpoint: '/api/admin/game/classes', columns: ['id', 'name', 'lore_blurb', 'base_strength', 'base_agility', 'base_intelligence', 'is_available'], nameField: 'name' },
  { key: 'skills', label: 'Skills', endpoint: '/api/admin/game/skills', columns: ['id', 'name', 'display_name', 'category', 'is_class_exclusive', 'effect_type'], nameField: 'name' },
  { key: 'benefits', label: 'Benefit Effects', endpoint: '/api/admin/game/benefits', columns: ['id', 'effect_key', 'display_name', 'description'], nameField: 'effect_key' },
  { key: 'items', label: 'Item Components', endpoint: '/api/admin/game/items/components', columns: [], nameField: '' },
  { key: 'attack_types', label: 'Attack Types', endpoint: '/api/admin/game/attack-types', columns: ['id', 'name', 'display_name', 'is_physical', 'description'], nameField: 'name' },
  { key: 'gear_slots', label: 'Gear Slots', endpoint: '/api/admin/game/gear-slots', columns: ['id', 'name', 'display_name', 'sort_order', 'description'], nameField: 'name' },
]

/* ------------------------------------------------------------------ */
/* Stat Bonuses Editor                                                 */
/* Toggleable list of stats + benefit effects with numeric values       */
/* ------------------------------------------------------------------ */

interface StatBonusesEditorProps {
  value: Record<string, number>
  onChange: (v: Record<string, number>) => void
  stats: { name: string; display_name: string }[]
  benefits: { effect_key: string; display_name: string }[]
}

function StatBonusesEditor({ value, onChange, stats, benefits }: StatBonusesEditorProps) {
  const allKeys = [
    ...stats.map(s => ({ key: s.name, label: s.display_name, group: 'Stats' })),
    ...benefits.map(b => ({ key: b.effect_key, label: b.display_name, group: 'Benefits' })),
  ]

  const toggleKey = (key: string) => {
    const next = { ...value }
    if (key in next) {
      delete next[key]
    } else {
      next[key] = 0
    }
    onChange(next)
  }

  return (
    <div className="stat-bonuses-editor">
      {allKeys.map(({ key, label, group }) => {
        const active = key in value
        return (
          <div key={key} className={`sbe-row ${active ? 'sbe-row--active' : ''}`}>
            <label className="sbe-toggle">
              <input type="checkbox" checked={active} onChange={() => toggleKey(key)} />
              <span className="sbe-label">{label}</span>
              <span className="sbe-group">{group}</span>
            </label>
            {active && (
              <input
                type="number"
                step="any"
                className="sbe-value"
                value={value[key]}
                onChange={e => {
                  const n = parseFloat(e.target.value)
                  onChange({ ...value, [key]: isNaN(n) ? 0 : n })
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Visual Config Editor (color pickers + text inputs)                   */
/* ------------------------------------------------------------------ */

function VisualConfigEditor({ value, onChange, avatarOptions }: {
  value: Record<string, any>
  onChange: (v: Record<string, any>) => void
  avatarOptions: { path: string; filename: string }[]
}) {
  const config = value || {}
  const COLOR_KEYS = ['primary_color', 'secondary_color', 'particle_tint', 'idle_sprite_tint', 'damage_text_color']
  const NUMBER_KEYS = ['border_glow_intensity']

  return (
    <div className="visual-config-editor">
      {/* Avatar URL picker */}
      <div className="vce-field">
        <label className="vce-label">avatar_url</label>
        <select
          className="vce-select"
          value={config.avatar_url || ''}
          onChange={e => onChange({ ...config, avatar_url: e.target.value })}
        >
          <option value="">-- none --</option>
          {avatarOptions.map(opt => (
            <option key={opt.path} value={opt.path}>{opt.filename}</option>
          ))}
        </select>
        {config.avatar_url && (
          <img src={config.avatar_url} alt="avatar" className="vce-avatar-preview" />
        )}
      </div>

      {/* Color pickers */}
      {COLOR_KEYS.map(key => (
        <div key={key} className="vce-field">
          <label className="vce-label">{key}</label>
          <div className="vce-color-row">
            <input
              type="color"
              value={config[key] || '#000000'}
              onChange={e => onChange({ ...config, [key]: e.target.value })}
              className="vce-color-picker"
            />
            <input
              type="text"
              value={config[key] || ''}
              onChange={e => onChange({ ...config, [key]: e.target.value })}
              className="vce-color-text"
              placeholder="#RRGGBB"
            />
          </div>
        </div>
      ))}

      {/* Numeric values */}
      {NUMBER_KEYS.map(key => (
        <div key={key} className="vce-field">
          <label className="vce-label">{key}</label>
          <input
            type="number"
            step="0.1"
            value={config[key] ?? 0}
            onChange={e => onChange({ ...config, [key]: parseFloat(e.target.value) || 0 })}
            className="vce-number"
          />
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Class Affinities Editor                                             */
/* ------------------------------------------------------------------ */

function AffinitiesEditor({ affinities, stats, onChange }: {
  affinities: any[]
  stats: { id: number; name: string; display_name: string }[]
  onChange: (affs: any[]) => void
}) {
  return (
    <div className="affinities-editor">
      <table className="aff-table">
        <thead>
          <tr>
            <th>Stat</th>
            <th>Base Value</th>
            <th>Lore Weight</th>
            <th>Level Bonus/Lvl</th>
          </tr>
        </thead>
        <tbody>
          {stats.map(stat => {
            const aff = affinities.find((a: any) => a.stat_id === stat.id)
            const idx = affinities.indexOf(aff)
            return (
              <tr key={stat.id}>
                <td>{stat.display_name}</td>
                <td>
                  <input
                    type="number"
                    value={aff?.base_value ?? 10}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 0
                      if (aff) {
                        const next = [...affinities]
                        next[idx] = { ...aff, base_value: val }
                        onChange(next)
                      } else {
                        onChange([...affinities, { stat_id: stat.id, base_value: val, lore_weight: 0, level_bonus_per_level: 0 }])
                      }
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={aff?.lore_weight ?? 0}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0
                      if (aff) {
                        const next = [...affinities]
                        next[idx] = { ...aff, lore_weight: val }
                        onChange(next)
                      } else {
                        onChange([...affinities, { stat_id: stat.id, base_value: 10, lore_weight: val, level_bonus_per_level: 0 }])
                      }
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={aff?.level_bonus_per_level ?? 0}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0
                      if (aff) {
                        const next = [...affinities]
                        next[idx] = { ...aff, level_bonus_per_level: val }
                        onChange(next)
                      } else {
                        onChange([...affinities, { stat_id: stat.id, base_value: 10, lore_weight: 0, level_bonus_per_level: val }])
                      }
                    }}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export default function ContentEditor() {
  const [activeTab, setActiveTab] = useState<EntityType>('stats')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [editForm, setEditForm] = useState<Record<string, any>>({})
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  // Lookup data for dropdowns
  const [statDefs, setStatDefs] = useState<any[]>([])
  const [benefitDefs, setBenefitDefs] = useState<any[]>([])
  const [avatarOptions, setAvatarOptions] = useState<{ path: string; filename: string }[]>([])
  const [gearSlots, setGearSlots] = useState<any[]>([])

  // Item components sub-tab
  const COMPONENT_TYPES = ['prefixes', 'qualities', 'lore_tags', 'type_bases', 'suffixes'] as const
  type CompType = typeof COMPONENT_TYPES[number]
  const [activeComp, setActiveComp] = useState<CompType>('prefixes')
  const [itemData, setItemData] = useState<Record<string, any[]>>({})

  const tab = TABS.find(t => t.key === activeTab)!

  // Fetch lookup data on mount
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [statsRes, benefitsRes, avatarsRes, gearRes] = await Promise.all([
          api.get('/api/admin/game/stats'),
          api.get('/api/admin/game/benefits'),
          api.get('/api/admin/game/avatar-options'),
          api.get('/api/admin/game/gear-slots'),
        ])
        if (statsRes.ok) setStatDefs(await statsRes.json())
        if (benefitsRes.ok) setBenefitDefs(await benefitsRes.json())
        if (avatarsRes.ok) setAvatarOptions(await avatarsRes.json())
        if (gearRes.ok) setGearSlots(await gearRes.json())
      } catch { /* ignore */ }
    }
    fetchLookups()
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      if (activeTab === 'items') {
        const res = await api.get('/api/admin/game/items/components')
        if (res.ok) setItemData(await res.json())
      } else {
        const res = await api.get(tab.endpoint)
        if (res.ok) {
          const json = await res.json()
          setData(Array.isArray(json) ? json : [])
        }
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [tab.endpoint, activeTab])

  const refreshGearSlots = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/game/gear-slots')
      if (res.ok) setGearSlots(await res.json())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setSelected(null)
    setCreating(false)
    fetchData()
  }, [activeTab, fetchData])

  const handleSelect = (item: any) => {
    setSelected(item)
    setEditForm({ ...item })
    setCreating(false)
  }

  const handleCreate = () => {
    setSelected(null)
    setCreating(true)
    if (activeTab === 'classes') {
      setEditForm({ affinities: statDefs.map((s: any) => ({ stat_id: s.id, base_value: 10, lore_weight: 0, level_bonus_per_level: 0 })) })
    } else {
      setEditForm({})
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (activeTab === 'items') {
        if (creating) {
          const res = await api.post(`/api/admin/game/items/${activeComp}`, editForm)
          if (res.ok) { setCreating(false); await fetchData() }
        } else if (selected) {
          const res = await api.patch(`/api/admin/game/items/${activeComp}/${selected.id}`, editForm)
          if (res.ok) { setSelected(null); await fetchData() }
        }
      } else if (creating) {
        const res = await api.post(tab.endpoint, editForm)
        if (res.ok) {
          setCreating(false)
          await fetchData()
          if (activeTab === 'gear_slots') await refreshGearSlots()
        }
      } else if (selected) {
        const res = await api.patch(`${tab.endpoint}/${selected.id}`, editForm)
        if (res.ok) {
          setSelected(null)
          await fetchData()
          if (activeTab === 'gear_slots') await refreshGearSlots()
        }
      }
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this entry?')) return
    try {
      const endpoint = activeTab === 'items'
        ? `/api/admin/game/items/${activeComp}/${id}`
        : `${tab.endpoint}/${id}`
      const res = await api.delete(endpoint)
      if (res.ok) {
        setSelected(null)
        await fetchData()
      }
    } catch { /* ignore */ }
  }

  // Get displayed items list
  const displayItems = activeTab === 'items' ? (itemData[activeComp] || []) : data
  const displayColumns = activeTab === 'items' ? ['id', 'code', 'display_name'] : tab.columns

  /* ---- Render detail form fields ---- */
  const renderDetailForm = () => {
    if (activeTab === 'items') {
      return renderItemForm()
    }
    if (activeTab === 'classes') {
      return renderClassForm()
    }
    if (activeTab === 'attack_types') {
      return renderAttackTypeForm()
    }
    if (activeTab === 'gear_slots') {
      return renderGearSlotForm()
    }
    // Generic form for stats, skills, benefits
    return (
      <div className="ce-form">
        {(creating ? tab.columns.filter(c => c !== 'id') : tab.columns).map(col => (
          <label key={col}>
            {col}
            {col === 'id' ? (
              <input type="text" value={editForm[col] ?? ''} disabled />
            ) : (
              <input
                type="text"
                value={editForm[col] ?? ''}
                onChange={e => setEditForm(p => ({ ...p, [col]: e.target.value }))}
              />
            )}
          </label>
        ))}
      </div>
    )
  }

  /* ---- Item Component Form ---- */
  const renderItemForm = () => {
    const hasStatBonuses = ['prefixes', 'suffixes', 'qualities', 'type_bases'].includes(activeComp)

    return (
      <div className="ce-form">
        <label>Code <input type="text" value={editForm.code || ''} onChange={e => setEditForm(p => ({ ...p, code: e.target.value }))} /></label>
        <label>Display Name <input type="text" value={editForm.display_name || ''} onChange={e => setEditForm(p => ({ ...p, display_name: e.target.value }))} /></label>

        {activeComp === 'type_bases' && (
          <label>Gear Slot
            <select
              value={editForm.gear_slot_id || ''}
              onChange={e => setEditForm(p => ({ ...p, gear_slot_id: parseInt(e.target.value) || null }))}
            >
              <option value="">-- select --</option>
              {gearSlots.map((gs: any) => (
                <option key={gs.id} value={gs.id}>{gs.display_name}</option>
              ))}
            </select>
          </label>
        )}

        {activeComp === 'type_bases' && (
          <label>Base Stat Range
            <div className="stat-bonuses-editor">
              <StatBonusesEditor
                value={typeof editForm.base_stat_range === 'object' ? editForm.base_stat_range || {} : {}}
                onChange={v => setEditForm(p => ({ ...p, base_stat_range: v }))}
                stats={statDefs}
                benefits={benefitDefs}
              />
            </div>
          </label>
        )}

        {hasStatBonuses && activeComp !== 'type_bases' && (
          <label>Stat Bonuses
            <StatBonusesEditor
              value={typeof editForm.stat_bonuses === 'object' ? editForm.stat_bonuses || {} : {}}
              onChange={v => setEditForm(p => ({ ...p, stat_bonuses: v }))}
              stats={statDefs}
              benefits={benefitDefs}
            />
          </label>
        )}

        {(activeComp === 'prefixes' || activeComp === 'suffixes' || activeComp === 'type_bases') && (
          <label>Lore Reference
            <input type="text" value={editForm.lore_reference || ''} onChange={e => setEditForm(p => ({ ...p, lore_reference: e.target.value }))} />
          </label>
        )}

        {activeComp === 'lore_tags' && (
          <label>Narrative Context
            <textarea value={editForm.narrative_context || ''} onChange={e => setEditForm(p => ({ ...p, narrative_context: e.target.value }))} />
          </label>
        )}
      </div>
    )
  }

  /* ---- Attack Type Form ---- */
  const renderAttackTypeForm = () => (
    <div className="ce-form">
      {!creating && <label>ID <input type="text" value={editForm.id ?? ''} disabled /></label>}
      <label>Name <input type="text" value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></label>
      <label>Display Name <input type="text" value={editForm.display_name || ''} onChange={e => setEditForm(p => ({ ...p, display_name: e.target.value }))} /></label>
      <label className="ce-checkbox-label">
        <input type="checkbox" checked={editForm.is_physical || false} onChange={e => setEditForm(p => ({ ...p, is_physical: e.target.checked }))} />
        Physical Attack
      </label>
      <label>Description
        <textarea value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
      </label>
      <label>Lore Reference
        <textarea value={editForm.lore_reference || ''} onChange={e => setEditForm(p => ({ ...p, lore_reference: e.target.value }))} />
      </label>
    </div>
  )

  /* ---- Gear Slot Form ---- */
  const renderGearSlotForm = () => (
    <div className="ce-form">
      {!creating && <label>ID <input type="text" value={editForm.id ?? ''} disabled /></label>}
      <label>Name <input type="text" value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></label>
      <label>Display Name <input type="text" value={editForm.display_name || ''} onChange={e => setEditForm(p => ({ ...p, display_name: e.target.value }))} /></label>
      <label>Sort Order <input type="number" value={editForm.sort_order ?? 0} onChange={e => setEditForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} /></label>
      <label>Description
        <textarea value={editForm.description || ''} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
      </label>
    </div>
  )

  /* ---- Character Class Form ---- */
  const renderClassForm = () => {
    const affinities = editForm.affinities || []

    return (
      <div className="ce-form">
        {!creating && (
          <label>ID <input type="text" value={editForm.id ?? ''} disabled /></label>
        )}
        <label>Name <input type="text" value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></label>
        <label>Lore Blurb
          <textarea value={editForm.lore_blurb || ''} onChange={e => setEditForm(p => ({ ...p, lore_blurb: e.target.value }))} />
        </label>
        <label>Sprite Key <input type="text" value={editForm.sprite_key || ''} onChange={e => setEditForm(p => ({ ...p, sprite_key: e.target.value }))} /></label>
        <label className="ce-checkbox-label">
          <input type="checkbox" checked={editForm.is_available !== false} onChange={e => setEditForm(p => ({ ...p, is_available: e.target.checked }))} />
          Available
        </label>

        <div className="ce-section-header">Base Stats</div>
        <div className="ce-stat-row">
          <label>STR <input type="number" value={editForm.base_strength ?? 10} onChange={e => setEditForm(p => ({ ...p, base_strength: parseInt(e.target.value) || 0 }))} /></label>
          <label>AGI <input type="number" value={editForm.base_agility ?? 10} onChange={e => setEditForm(p => ({ ...p, base_agility: parseInt(e.target.value) || 0 }))} /></label>
          <label>INT <input type="number" value={editForm.base_intelligence ?? 10} onChange={e => setEditForm(p => ({ ...p, base_intelligence: parseInt(e.target.value) || 0 }))} /></label>
        </div>

        <div className="ce-section-header">Stat Affinities</div>
        <AffinitiesEditor
          affinities={affinities}
          stats={statDefs}
          onChange={affs => setEditForm(p => ({ ...p, affinities: affs }))}
        />

        <div className="ce-section-header">Visual Config</div>
        <VisualConfigEditor
          value={editForm.visual_config || {}}
          onChange={vc => setEditForm(p => ({ ...p, visual_config: vc }))}
          avatarOptions={avatarOptions}
        />
      </div>
    )
  }

  return (
    <div className="content-editor">
      {/* Top-level tabs — always visible */}
      <div className="ce-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`ce-tab ${activeTab === t.key ? 'ce-tab--active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-tabs for item components */}
      {activeTab === 'items' && (
        <div className="ce-sub-tabs">
          {COMPONENT_TYPES.map(ct => (
            <button
              key={ct}
              className={`ce-sub-tab ${activeComp === ct ? 'ce-sub-tab--active' : ''}`}
              onClick={() => { setActiveComp(ct); setSelected(null); setCreating(false) }}
            >
              {ct.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}

      <div className="ce-toolbar">
        <button className="ce-btn ce-btn--create" onClick={handleCreate}>
          + New {activeTab === 'items' ? activeComp.replace('_', ' ').replace(/s$/, '') : tab.label.replace(/s$/, '')}
        </button>
      </div>

      {loading ? (
        <div className="ce-loading">Loading...</div>
      ) : (
        <table className="ce-table">
          <thead>
            <tr>
              {displayColumns.map(col => <th key={col}>{col}</th>)}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayItems.map((item: any) => (
              <tr key={item.id} className={selected?.id === item.id ? 'ce-row--selected' : ''}>
                {displayColumns.map(col => (
                  <td key={col}>
                    {typeof item[col] === 'boolean' ? (item[col] ? 'Yes' : 'No') :
                     typeof item[col] === 'object' ? JSON.stringify(item[col]) :
                     col === 'lore_blurb' ? (item[col] ? (item[col] as string).substring(0, 60) + '...' : '\u2014') :
                     String(item[col] ?? '\u2014')}
                  </td>
                ))}
                <td>
                  <button className="ce-btn ce-btn--edit" onClick={() => handleSelect(item)}>Edit</button>
                  <button className="ce-btn ce-btn--delete" onClick={() => handleDelete(item.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(selected || creating) && (
        <div className="ce-detail">
          <h3>{creating ? `Create ${activeTab === 'items' ? activeComp.replace('_', ' ') : tab.label.replace(/s$/, '')}` : `Edit #${selected?.id}`}</h3>
          {renderDetailForm()}
          <div className="ce-form-actions">
            <button className="ce-btn ce-btn--save" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button className="ce-btn ce-btn--cancel" onClick={() => { setSelected(null); setCreating(false) }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
