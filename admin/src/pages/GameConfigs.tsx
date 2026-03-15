import { useState, useEffect, useMemo, useCallback } from 'react'
import { api } from '../api'
import GameConfigsCategoryView from '../components/tuning/GameConfigsCategoryView'
import DropRateManager from '../components/tuning/DropRateManager'
import { SkillBalanceViewer } from '../components/tuning/SkillBalanceViewer'
import { EconomyTuningPanel } from '../components/tuning/EconomyTuningPanel'
import './GameConfigs.css'
import '../components/tuning/tuning.css'

export interface GameConfigEntry {
  key: string
  value_json: any
  description: string | null
  game_impact: string | null
  category: string | null
}

/* ------------------------------------------------------------------ */
/* JSON Key-Value Editor (recursive for nested objects)                */
/* ------------------------------------------------------------------ */

interface JsonEditorProps {
  value: any
  onChange: (v: any) => void
  onStructuralChange?: (msg: string) => void
  depth?: number
}

export function JsonEditor({ value, onChange, onStructuralChange, depth = 0 }: JsonEditorProps) {
  if (value === null || value === undefined) {
    return (
      <div className="json-editor-primitive">
        <input type="text" value="" placeholder="null" onChange={e => onChange(e.target.value || null)} />
      </div>
    )
  }

  if (Array.isArray(value)) {
    return (
      <div className="json-editor-array" style={{ marginLeft: depth > 0 ? 12 : 0 }}>
        {value.map((item, i) => (
          <div key={i} className="json-editor-array-item">
            <span className="json-editor-index">[{i}]</span>
            <JsonEditor value={item} onChange={v => {
              const next = [...value]
              next[i] = v
              onChange(next)
            }} onStructuralChange={onStructuralChange} depth={depth + 1} />
            <button className="json-editor-remove-btn" title="Remove item" onClick={() => {
              const next = value.filter((_: any, idx: number) => idx !== i)
              onChange(next)
              onStructuralChange?.(`Removed array item [${i}]`)
            }}>&times;</button>
          </div>
        ))}
        <button className="json-editor-add-btn" onClick={() => {
          onChange([...value, ''])
          onStructuralChange?.('Added new array item')
        }}>+ Add Item</button>
      </div>
    )
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value)
    return (
      <div className="json-editor-object" style={{ marginLeft: depth > 0 ? 12 : 0 }}>
        {keys.map(k => (
          <div key={k} className="json-editor-field">
            <span className="json-editor-key">{k}:</span>
            <JsonEditor value={value[k]} onChange={v => {
              onChange({ ...value, [k]: v })
            }} onStructuralChange={onStructuralChange} depth={depth + 1} />
            <button className="json-editor-remove-btn" title={`Remove key "${k}"`} onClick={() => {
              const next = { ...value }
              delete next[k]
              onChange(next)
              onStructuralChange?.(`Removed key "${k}"`)
            }}>&times;</button>
          </div>
        ))}
        <div className="json-editor-add-key">
          <input
            type="text"
            placeholder="new key..."
            className="json-editor-new-key-input"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const input = e.target as HTMLInputElement
                const newKey = input.value.trim()
                if (newKey && !(newKey in value)) {
                  onChange({ ...value, [newKey]: '' })
                  onStructuralChange?.(`Added new key "${newKey}"`)
                  input.value = ''
                }
              }
            }}
          />
          <span className="json-editor-hint">Press Enter to add key</span>
        </div>
      </div>
    )
  }

  // Primitive: boolean
  if (typeof value === 'boolean') {
    return (
      <select className="json-editor-select" value={String(value)} onChange={e => onChange(e.target.value === 'true')}>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    )
  }

  // Primitive: number
  if (typeof value === 'number') {
    return (
      <input
        type="number"
        className="json-editor-number"
        value={value}
        step="any"
        onChange={e => {
          const n = Number(e.target.value)
          onChange(isNaN(n) ? e.target.value : n)
        }}
      />
    )
  }

  // String
  return (
    <input
      type="text"
      className="json-editor-text"
      value={String(value)}
      onChange={e => {
        const v = e.target.value
        if (v !== '' && !isNaN(Number(v)) && v === String(Number(v))) {
          onChange(Number(v))
        } else {
          onChange(v)
        }
      }}
    />
  )
}

/* ------------------------------------------------------------------ */
/* Tab definitions                                                     */
/* ------------------------------------------------------------------ */

const TABS = [
  { key: 'all', label: 'All Configs' },
  { key: 'drop-rates', label: 'Drop Rates' },
  { key: 'skill-balance', label: 'Skill Balance' },
  { key: 'economy', label: 'Economy' },
] as const

type TabKey = typeof TABS[number]['key']

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export default function GameConfigs() {
  const [serverConfigs, setServerConfigs] = useState<GameConfigEntry[]>([])
  const [localConfigs, setLocalConfigs] = useState<Record<string, GameConfigEntry>>({})
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  // Active tab from URL
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab && TABS.some(t => t.key === tab)) return tab as TabKey
    return 'all'
  })

  // Metadata editing
  const [editingMeta, setEditingMeta] = useState<string | null>(null)
  const [metaForm, setMetaForm] = useState({ description: '', game_impact: '', category: '' })

  // Value editing (legacy modal, kept for JsonEditor use)
  const [editingValue, setEditingValue] = useState<string | null>(null)
  const [valueForm, setValueForm] = useState<any>(null)
  const [pendingStructuralChanges, setPendingStructuralChanges] = useState<string[]>([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  /* ---- Data fetching ---- */

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/game/configs')
      if (res.ok) {
        const data: GameConfigEntry[] = await res.json()
        setServerConfigs(data)
        const map: Record<string, GameConfigEntry> = {}
        data.forEach(c => { map[c.key] = { ...c } })
        setLocalConfigs(map)
        setDirtyKeys(new Set())
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/game/configs/categories')
      if (res.ok) setCategories(await res.json())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchConfigs()
    fetchCategories()
  }, [fetchConfigs, fetchCategories])

  /* ---- Derived data ---- */

  const configsList = useMemo(() => Object.values(localConfigs), [localConfigs])

  const configsRecord = useMemo(() => {
    const rec: Record<string, any> = {}
    Object.values(localConfigs).forEach(c => { rec[c.key] = c.value_json })
    return rec
  }, [localConfigs])

  /* ---- Config change handling ---- */

  const updateConfig = useCallback((key: string, value: any) => {
    setLocalConfigs(prev => {
      const existing = prev[key]
      if (!existing) return prev
      return { ...prev, [key]: { ...existing, value_json: value } }
    })
    setDirtyKeys(prev => {
      const next = new Set(prev)
      next.add(key)
      return next
    })
  }, [])

  const saveAll = useCallback(async () => {
    if (dirtyKeys.size === 0) return
    setSaving(true)
    try {
      const promises = Array.from(dirtyKeys).map(key => {
        const config = localConfigs[key]
        if (!config) return Promise.resolve()
        return api.patch(
          `/api/admin/game/configs/${encodeURIComponent(key)}/value`,
          { value_json: config.value_json }
        )
      })
      await Promise.all(promises)
      await fetchConfigs()
      await fetchCategories()
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }, [dirtyKeys, localConfigs, fetchConfigs, fetchCategories])

  const resetAll = useCallback(() => {
    const map: Record<string, GameConfigEntry> = {}
    serverConfigs.forEach(c => { map[c.key] = { ...c } })
    setLocalConfigs(map)
    setDirtyKeys(new Set())
  }, [serverConfigs])

  /* ---- Tab navigation ---- */

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab)
    const url = new URL(window.location.href)
    if (tab === 'all') {
      url.searchParams.delete('tab')
    } else {
      url.searchParams.set('tab', tab)
    }
    window.history.replaceState({}, '', url.toString())
  }, [])

  /* ---- Title ---- */

  const tabLabel = TABS.find(t => t.key === activeTab)?.label ?? 'All Configs'
  const pageTitle = activeTab === 'all' ? 'Game Configs' : `Game Configs — ${tabLabel}`

  /* ---- Meta editing ---- */

  const handleEditMeta = useCallback((config: GameConfigEntry) => {
    setEditingMeta(config.key)
    setMetaForm({
      description: config.description || '',
      game_impact: config.game_impact || '',
      category: config.category || '',
    })
  }, [])

  const handleSaveMeta = async () => {
    if (!editingMeta) return
    setSaving(true)
    try {
      const res = await api.patch(`/api/admin/game/configs/${encodeURIComponent(editingMeta)}/meta`, metaForm)
      if (res.ok) {
        setEditingMeta(null)
        await fetchConfigs()
        await fetchCategories()
      }
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  /* ---- Value editing (legacy modal) ---- */

  const handleEditValue = (config: GameConfigEntry) => {
    setEditingValue(config.key)
    setValueForm(JSON.parse(JSON.stringify(config.value_json)))
    setPendingStructuralChanges([])
    setShowConfirmDialog(false)
  }

  const handleStructuralChange = (msg: string) => {
    setPendingStructuralChanges(prev => [...prev, msg])
  }

  const doSaveValue = async () => {
    if (!editingValue) return
    setSaving(true)
    try {
      const res = await api.patch(
        `/api/admin/game/configs/${encodeURIComponent(editingValue)}/value`,
        { value_json: valueForm }
      )
      if (res.ok) {
        setEditingValue(null)
        setShowConfirmDialog(false)
        setPendingStructuralChanges([])
        await fetchConfigs()
      }
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const handleSaveValue = () => {
    if (pendingStructuralChanges.length > 0 && !showConfirmDialog) {
      setShowConfirmDialog(true)
      return
    }
    doSaveValue()
  }

  const isComplex = (v: any) => typeof v === 'object' && v !== null

  /* ---- Render ---- */

  if (loading) return <div className="gc-loading">Loading game configs...</div>

  return (
    <div className="game-configs">
      <div className="gc-header">
        <h2>{pageTitle}</h2>
      </div>

      {/* Top-level tabs */}
      <div className="gc-top-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={'gc-top-tab' + (activeTab === tab.key ? ' gc-top-tab--active' : '')}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
            {dirtyKeys.size > 0 && tab.key === activeTab && (
              <span className="dirty-dot" />
            )}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      {activeTab === 'all' && (
        <GameConfigsCategoryView
          configs={localConfigs}
          configsList={configsList}
          categories={categories}
          onConfigChange={updateConfig}
          dirtyKeys={dirtyKeys}
          onSave={saveAll}
          onReset={resetAll}
          onMetaEdit={handleEditMeta}
          saving={saving}
        />
      )}

      {activeTab === 'drop-rates' && (
        <DropRateManager
          configs={configsRecord}
          onConfigChange={updateConfig}
          dirtyKeys={dirtyKeys}
          onSave={saveAll}
          onReset={resetAll}
          saving={saving}
        />
      )}

      {activeTab === 'skill-balance' && (
        <SkillBalanceViewer
          configs={configsRecord}
          onConfigChange={updateConfig}
          dirtyKeys={dirtyKeys}
          onSave={saveAll}
          onReset={resetAll}
          saving={saving}
        />
      )}

      {activeTab === 'economy' && (
        <EconomyTuningPanel
          configs={configsRecord}
          onConfigChange={updateConfig}
          dirtyKeys={dirtyKeys}
          onSave={saveAll}
          onReset={resetAll}
          saving={saving}
        />
      )}

      {/* ---- Metadata Modal ---- */}
      {editingMeta && (
        <div className="gc-modal-backdrop" onClick={() => setEditingMeta(null)}>
          <div className="gc-modal" onClick={e => e.stopPropagation()}>
            <h3>Edit Metadata: {editingMeta}</h3>
            <label>
              Description
              <textarea value={metaForm.description} onChange={e => setMetaForm(p => ({ ...p, description: e.target.value }))} />
            </label>
            <label>
              Game Impact
              <textarea value={metaForm.game_impact} onChange={e => setMetaForm(p => ({ ...p, game_impact: e.target.value }))} />
            </label>
            <label>
              Category
              <select
                className="gc-category-select"
                value={categories.includes(metaForm.category) ? metaForm.category : (metaForm.category ? '__custom__' : '')}
                onChange={e => {
                  const v = e.target.value
                  if (v === '__custom__') {
                    setMetaForm(p => ({ ...p, category: '' }))
                  } else {
                    setMetaForm(p => ({ ...p, category: v }))
                  }
                }}
              >
                <option value="">-- none --</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="__custom__">+ Custom...</option>
              </select>
              {!categories.includes(metaForm.category) && metaForm.category !== '' && (
                <input
                  type="text"
                  placeholder="Enter custom category"
                  className="gc-custom-category"
                  value={metaForm.category}
                  onChange={e => setMetaForm(p => ({ ...p, category: e.target.value }))}
                />
              )}
            </label>
            <div className="gc-modal-actions">
              <button className="gc-btn gc-btn--save" onClick={handleSaveMeta} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button className="gc-btn gc-btn--cancel" onClick={() => setEditingMeta(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Value Editor Modal ---- */}
      {editingValue && (
        <div className="gc-modal-backdrop" onClick={() => { setEditingValue(null); setShowConfirmDialog(false) }}>
          <div className="gc-modal gc-modal--wide" onClick={e => e.stopPropagation()}>
            <h3>Edit Value: {editingValue}</h3>

            {isComplex(valueForm) ? (
              <div className="gc-value-editor">
                <JsonEditor
                  value={valueForm}
                  onChange={setValueForm}
                  onStructuralChange={handleStructuralChange}
                />
              </div>
            ) : (
              <div className="gc-simple-value-editor">
                {typeof valueForm === 'boolean' ? (
                  <select value={String(valueForm)} onChange={e => setValueForm(e.target.value === 'true')}>
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : typeof valueForm === 'number' ? (
                  <input
                    type="number"
                    step="any"
                    value={valueForm}
                    onChange={e => setValueForm(Number(e.target.value))}
                  />
                ) : (
                  <input
                    type="text"
                    value={String(valueForm ?? '')}
                    onChange={e => {
                      const v = e.target.value
                      if (v !== '' && !isNaN(Number(v)) && v === String(Number(v))) {
                        setValueForm(Number(v))
                      } else {
                        setValueForm(v)
                      }
                    }}
                  />
                )}
              </div>
            )}

            {/* Structural change warnings */}
            {pendingStructuralChanges.length > 0 && !showConfirmDialog && (
              <div className="gc-structural-warnings">
                <strong>Structural changes pending:</strong>
                <ul>
                  {pendingStructuralChanges.map((msg, i) => <li key={i}>{msg}</li>)}
                </ul>
              </div>
            )}

            {/* Confirmation dialog */}
            {showConfirmDialog ? (
              <div className="gc-confirm-dialog">
                <p>You have made structural changes to this JSON value:</p>
                <ul>
                  {pendingStructuralChanges.map((msg, i) => <li key={i}>{msg}</li>)}
                </ul>
                <p>Are you sure you want to save these changes?</p>
                <div className="gc-confirm-actions">
                  <button className="gc-btn gc-btn--save" onClick={doSaveValue} disabled={saving}>
                    {saving ? 'Saving...' : 'Yes, Save'}
                  </button>
                  <button className="gc-btn gc-btn--cancel" onClick={() => setShowConfirmDialog(false)}>Go Back</button>
                </div>
              </div>
            ) : (
              <div className="gc-modal-actions">
                <button className="gc-btn gc-btn--save" onClick={handleSaveValue} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Value'}
                </button>
                <button className="gc-btn gc-btn--cancel" onClick={() => { setEditingValue(null); setShowConfirmDialog(false) }}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
