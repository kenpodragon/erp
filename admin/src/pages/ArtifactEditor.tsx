import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import './ArtifactEditor.css'

interface ArtifactListItem {
  id: number
  name: string
  description: string
  icon_sprite_key: string
  source_type: string
  source_id: number | null
  source_hint: string
  base_drop_chance: number
  is_active: boolean
  tier_count: number
  owner_count: number
}

interface ArtifactTier {
  id?: number
  rarity: string
  stat_bonuses: any
  unique_effect_text: string | null
  drop_chance_multiplier: number
}

interface ArtifactDetail extends ArtifactListItem {
  lore_text: string | null
  synergy_set_id: number | null
  tiers: ArtifactTier[]
}

const SOURCE_TYPES = ['boss', 'chapter', 'achievement', 'shop', 'event', 'quest']
const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary']

const ARTIFACT_CONFIG_KEYS = [
  { key: 'artifact_gen_drop_chance_scene', label: 'Drop Chance (Scene)', type: 'number' as const },
  { key: 'artifact_gen_drop_chance_boss', label: 'Drop Chance (Boss)', type: 'number' as const },
  { key: 'artifact_gen_drop_chance_mastery', label: 'Drop Chance (Mastery)', type: 'number' as const },
  { key: 'artifact_rarity_weight_book_1', label: 'Rarity Weights (Book 1)', type: 'json' as const },
  { key: 'artifact_rarity_weight_book_2', label: 'Rarity Weights (Book 2)', type: 'json' as const },
  { key: 'artifact_rarity_weight_book_3', label: 'Rarity Weights (Book 3)', type: 'json' as const },
  { key: 'artifact_rarity_stat_multiplier', label: 'Stat Multiplier (per Rarity)', type: 'json' as const },
]

export default function ArtifactEditor() {
  const [artifacts, setArtifacts] = useState<ArtifactListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ArtifactDetail | null>(null)
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [showGenConfig, setShowGenConfig] = useState(false)
  const [genConfigs, setGenConfigs] = useState<Record<string, string>>({})
  const [genConfigEdits, setGenConfigEdits] = useState<Record<string, string>>({})
  const [genConfigLoading, setGenConfigLoading] = useState(false)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editLoreText, setEditLoreText] = useState('')
  const [editIcon, setEditIcon] = useState('artifact_default')
  const [editSourceType, setEditSourceType] = useState('boss')
  const [editSourceId, setEditSourceId] = useState('')
  const [editSourceHint, setEditSourceHint] = useState('')
  const [editDropChance, setEditDropChance] = useState('0.01')
  const [editSynergySetId, setEditSynergySetId] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)
  const [editTiers, setEditTiers] = useState<ArtifactTier[]>([])

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/artifacts')
      if (res.ok) setArtifacts(await res.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchList() }, [fetchList])

  const fetchGenConfigs = useCallback(async () => {
    setGenConfigLoading(true)
    try {
      const res = await api.get('/api/admin/game/configs')
      if (res.ok) {
        const allConfigs: any[] = await res.json()
        const mapped: Record<string, string> = {}
        for (const cfg of allConfigs) {
          if (ARTIFACT_CONFIG_KEYS.some(k => k.key === cfg.key)) {
            mapped[cfg.key] = cfg.value_json
          }
        }
        setGenConfigs(mapped)
        setGenConfigEdits({ ...mapped })
      }
    } catch {}
    setGenConfigLoading(false)
  }, [])

  const handleSaveGenConfig = async (key: string) => {
    setSaving(true)
    setMessage('')
    try {
      const res = await api.patch(`/api/admin/game/configs/${encodeURIComponent(key)}/value`, {
        value_json: genConfigEdits[key],
      })
      if (res.ok) {
        setGenConfigs(prev => ({ ...prev, [key]: genConfigEdits[key] }))
        setMessage(`Saved ${key}`)
      } else {
        const err = await res.json()
        setMessage(`Error: ${err.detail}`)
      }
    } catch { setMessage('Network error') }
    setSaving(false)
  }

  const fetchDetail = async (id: number) => {
    try {
      const res = await api.get(`/api/admin/artifacts/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSelected(data)
        populateForm(data)
      }
    } catch {}
  }

  const populateForm = (data: ArtifactDetail) => {
    setEditName(data.name)
    setEditDescription(data.description)
    setEditLoreText(data.lore_text || '')
    setEditIcon(data.icon_sprite_key)
    setEditSourceType(data.source_type)
    setEditSourceId(data.source_id?.toString() || '')
    setEditSourceHint(data.source_hint)
    setEditDropChance(data.base_drop_chance.toString())
    setEditSynergySetId(data.synergy_set_id?.toString() || '')
    setEditIsActive(data.is_active)
    setEditTiers(data.tiers.map(t => ({ ...t })))
  }

  const startCreate = () => {
    setSelected(null)
    setEditing(false)
    setCreating(true)
    setMessage('')
    setEditName('')
    setEditDescription('')
    setEditLoreText('')
    setEditIcon('artifact_default')
    setEditSourceType('boss')
    setEditSourceId('')
    setEditSourceHint('')
    setEditDropChance('0.01')
    setEditSynergySetId('')
    setEditIsActive(true)
    setEditTiers([])
  }

  const handleCreate = async () => {
    if (!editName.trim()) { setMessage('Name is required'); return }
    setSaving(true)
    setMessage('')
    try {
      const res = await api.post('/api/admin/artifacts', {
        name: editName,
        description: editDescription,
        lore_text: editLoreText || null,
        icon_sprite_key: editIcon,
        source_type: editSourceType,
        source_id: editSourceId ? parseInt(editSourceId) : null,
        source_hint: editSourceHint,
        base_drop_chance: parseFloat(editDropChance),
        synergy_set_id: editSynergySetId ? parseInt(editSynergySetId) : null,
        is_active: editIsActive,
      })
      if (res.ok) {
        const data = await res.json()
        setMessage(`Created artifact #${data.id}`)
        setCreating(false)
        fetchList()
        fetchDetail(data.id)
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
      const res = await api.put(`/api/admin/artifacts/${selected.id}`, {
        name: editName,
        description: editDescription,
        lore_text: editLoreText || null,
        icon_sprite_key: editIcon,
        source_type: editSourceType,
        source_id: editSourceId ? parseInt(editSourceId) : null,
        source_hint: editSourceHint,
        base_drop_chance: parseFloat(editDropChance),
        synergy_set_id: editSynergySetId ? parseInt(editSynergySetId) : null,
        is_active: editIsActive,
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

  const handleSaveTiers = async () => {
    if (!selected) return
    setSaving(true)
    setMessage('')
    try {
      // Validate stat_bonuses JSON
      for (const tier of editTiers) {
        if (tier.stat_bonuses && typeof tier.stat_bonuses === 'string') {
          try { tier.stat_bonuses = JSON.parse(tier.stat_bonuses) }
          catch { setMessage(`Invalid JSON in ${tier.rarity} tier`); setSaving(false); return }
        }
      }
      const res = await api.put(`/api/admin/artifacts/${selected.id}/tiers`, editTiers)
      if (res.ok) {
        setMessage('Tiers saved')
        fetchDetail(selected.id)
      } else {
        const err = await res.json()
        setMessage(`Error: ${err.detail}`)
      }
    } catch { setMessage('Network error') }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!selected || !confirm(`Deactivate "${selected.name}"?`)) return
    try {
      const res = await api.delete(`/api/admin/artifacts/${selected.id}`)
      if (res.ok) {
        setMessage('Deactivated')
        setSelected(null)
        setEditing(false)
        fetchList()
      }
    } catch { setMessage('Network error') }
  }

  const addTier = () => {
    const usedRarities = editTiers.map(t => t.rarity)
    const nextRarity = RARITIES.find(r => !usedRarities.includes(r)) || 'common'
    setEditTiers([...editTiers, { rarity: nextRarity, stat_bonuses: {}, unique_effect_text: null, drop_chance_multiplier: 1.0 }])
  }

  const removeTier = (idx: number) => {
    setEditTiers(editTiers.filter((_, i) => i !== idx))
  }

  const updateTier = (idx: number, field: string, value: any) => {
    const updated = [...editTiers]
    ;(updated[idx] as any)[field] = value
    setEditTiers(updated)
  }

  const filtered = filterSource
    ? artifacts.filter(a => a.source_type === filterSource)
    : artifacts

  if (loading) return <div className="arte-loading">Loading artifacts...</div>

  return (
    <div className="arte-page">
      <div className="arte-header">
        <h2>Artifact Editor</h2>
        <div className="arte-header-actions">
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)}>
            <option value="">All Sources</option>
            {SOURCE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="arte-btn arte-btn-primary" onClick={startCreate}>+ New Artifact</button>
          <button className="arte-btn" onClick={() => { setShowGenConfig(!showGenConfig); if (!showGenConfig) fetchGenConfigs() }}>
            {showGenConfig ? 'Hide' : 'Generation'} Config
          </button>
        </div>
      </div>

      {message && <div className="arte-message">{message}</div>}

      {showGenConfig && (
        <div className="arte-gen-config">
          <h3>Artifact Generation Config</h3>
          {genConfigLoading ? (
            <p className="arte-empty">Loading configs...</p>
          ) : (
            <div className="arte-gen-config-grid">
              {ARTIFACT_CONFIG_KEYS.map(cfg => (
                <div key={cfg.key} className="arte-gen-config-row">
                  <label>{cfg.label}</label>
                  {cfg.type === 'number' ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={genConfigEdits[cfg.key] || ''}
                      onChange={e => setGenConfigEdits(prev => ({ ...prev, [cfg.key]: e.target.value }))}
                    />
                  ) : (
                    <textarea
                      rows={2}
                      spellCheck={false}
                      value={genConfigEdits[cfg.key] || ''}
                      onChange={e => setGenConfigEdits(prev => ({ ...prev, [cfg.key]: e.target.value }))}
                    />
                  )}
                  <button
                    className="arte-btn arte-btn-sm"
                    disabled={saving || genConfigEdits[cfg.key] === genConfigs[cfg.key]}
                    onClick={() => handleSaveGenConfig(cfg.key)}
                  >
                    Save
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="arte-layout">
        <div className="arte-list-panel">
          <table className="arte-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Source</th>
                <th>Drop %</th>
                <th>Tiers</th>
                <th>Owners</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(art => (
                <tr
                  key={art.id}
                  className={selected?.id === art.id ? 'arte-row--selected' : ''}
                  onClick={() => { fetchDetail(art.id); setEditing(false); setCreating(false) }}
                >
                  <td className="arte-name">{art.name}</td>
                  <td>{art.source_type}</td>
                  <td>{(art.base_drop_chance * 100).toFixed(1)}%</td>
                  <td>{art.tier_count}</td>
                  <td>{art.owner_count}</td>
                  <td>{art.is_active ? 'Yes' : 'No'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="arte-empty">No artifacts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="arte-detail-panel">
          {(editing || creating) ? renderEditForm() : selected ? renderDetail() : (
            <div className="arte-empty-detail">Select an artifact or create a new one.</div>
          )}
        </div>
      </div>
    </div>
  )

  function renderDetail() {
    if (!selected) return null
    return (
      <div className="arte-detail">
        <div className="arte-detail-header">
          <h3>{selected.name}</h3>
          <div className="arte-detail-actions">
            <button className="arte-btn" onClick={() => setEditing(true)}>Edit</button>
            <button className="arte-btn arte-btn-danger" onClick={handleDelete}>Deactivate</button>
          </div>
        </div>
        <div className="arte-detail-grid">
          <div className="arte-field"><label>Description</label><p>{selected.description}</p></div>
          <div className="arte-field"><label>Lore</label><p>{selected.lore_text || '—'}</p></div>
          <div className="arte-field"><label>Source</label><p>{selected.source_type} {selected.source_id ? `#${selected.source_id}` : ''}</p></div>
          <div className="arte-field"><label>Hint</label><p>{selected.source_hint || '—'}</p></div>
          <div className="arte-field"><label>Drop Chance</label><p>{(selected.base_drop_chance * 100).toFixed(2)}%</p></div>
          <div className="arte-field"><label>Icon</label><p>{selected.icon_sprite_key}</p></div>
          <div className="arte-field"><label>Synergy Set</label><p>{selected.synergy_set_id || '—'}</p></div>
          <div className="arte-field"><label>Active</label><p>{selected.is_active ? 'Yes' : 'No'}</p></div>
          <div className="arte-field"><label>Owners</label><p>{selected.owner_count}</p></div>
        </div>

        <h4>Tiers ({selected.tiers.length})</h4>
        {selected.tiers.length > 0 ? (
          <table className="arte-table arte-tier-table">
            <thead>
              <tr><th>Rarity</th><th>Bonuses</th><th>Effect</th><th>Drop Mult</th></tr>
            </thead>
            <tbody>
              {selected.tiers.map((t, i) => (
                <tr key={i}>
                  <td className={`arte-rarity--${t.rarity}`}>{t.rarity}</td>
                  <td><code>{JSON.stringify(t.stat_bonuses)}</code></td>
                  <td>{t.unique_effect_text || '—'}</td>
                  <td>{t.drop_chance_multiplier}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="arte-empty">No tiers defined.</p>}
      </div>
    )
  }

  function renderEditForm() {
    return (
      <div className="arte-edit-form">
        <h3>{creating ? 'New Artifact' : `Editing: ${selected?.name}`}</h3>
        <div className="arte-form-row">
          <label>Name</label>
          <input value={editName} onChange={e => setEditName(e.target.value)} />
        </div>
        <div className="arte-form-row">
          <label>Description</label>
          <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3} />
        </div>
        <div className="arte-form-row">
          <label>Lore Text</label>
          <textarea value={editLoreText} onChange={e => setEditLoreText(e.target.value)} rows={3} />
        </div>
        <div className="arte-form-row">
          <label>Icon Sprite Key</label>
          <input value={editIcon} onChange={e => setEditIcon(e.target.value)} />
        </div>
        <div className="arte-form-row">
          <label>Source Type</label>
          <select value={editSourceType} onChange={e => setEditSourceType(e.target.value)}>
            {SOURCE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="arte-form-row">
          <label>Source ID</label>
          <input type="number" value={editSourceId} onChange={e => setEditSourceId(e.target.value)} placeholder="Optional" />
        </div>
        <div className="arte-form-row">
          <label>Source Hint</label>
          <input value={editSourceHint} onChange={e => setEditSourceHint(e.target.value)} placeholder="e.g. 'Dropped by the Dark Sentinel'" />
        </div>
        <div className="arte-form-row">
          <label>Base Drop Chance</label>
          <input type="number" step="0.001" min="0" max="1" value={editDropChance} onChange={e => setEditDropChance(e.target.value)} />
        </div>
        <div className="arte-form-row">
          <label>Synergy Set ID</label>
          <input type="number" value={editSynergySetId} onChange={e => setEditSynergySetId(e.target.value)} placeholder="Optional" />
        </div>
        <div className="arte-form-row arte-form-checkbox">
          <label>
            <input type="checkbox" checked={editIsActive} onChange={e => setEditIsActive(e.target.checked)} />
            Active
          </label>
        </div>

        <div className="arte-detail-actions">
          {creating ? (
            <button className="arte-btn arte-btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? 'Creating...' : 'Create'}
            </button>
          ) : (
            <button className="arte-btn arte-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
          <button className="arte-btn" onClick={() => { setEditing(false); setCreating(false); if (selected) populateForm(selected) }}>
            Cancel
          </button>
        </div>

        {!creating && selected && (
          <>
            <h4>Tier Editor</h4>
            {editTiers.map((tier, idx) => (
              <div key={idx} className="arte-tier-edit">
                <div className="arte-form-row">
                  <label>Rarity</label>
                  <select value={tier.rarity} onChange={e => updateTier(idx, 'rarity', e.target.value)}>
                    {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="arte-form-row">
                  <label>Stat Bonuses (JSON)</label>
                  <textarea
                    value={typeof tier.stat_bonuses === 'string' ? tier.stat_bonuses : JSON.stringify(tier.stat_bonuses, null, 2)}
                    onChange={e => updateTier(idx, 'stat_bonuses', e.target.value)}
                    rows={3}
                    spellCheck={false}
                  />
                </div>
                <div className="arte-form-row">
                  <label>Unique Effect</label>
                  <input value={tier.unique_effect_text || ''} onChange={e => updateTier(idx, 'unique_effect_text', e.target.value || null)} />
                </div>
                <div className="arte-form-row">
                  <label>Drop Multiplier</label>
                  <input type="number" step="0.1" value={tier.drop_chance_multiplier} onChange={e => updateTier(idx, 'drop_chance_multiplier', parseFloat(e.target.value))} />
                </div>
                <button className="arte-btn arte-btn-danger arte-btn-sm" onClick={() => removeTier(idx)}>Remove Tier</button>
              </div>
            ))}
            <div className="arte-tier-actions">
              <button className="arte-btn" onClick={addTier}>+ Add Tier</button>
              <button className="arte-btn arte-btn-primary" onClick={handleSaveTiers} disabled={saving}>
                {saving ? 'Saving Tiers...' : 'Save Tiers'}
              </button>
            </div>
          </>
        )}
      </div>
    )
  }
}
