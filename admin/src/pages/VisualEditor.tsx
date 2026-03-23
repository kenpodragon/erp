import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import './VisualEditor.css'

/* ------------------------------------------------------------------ */
/* Tab & Column Definitions                                            */
/* ------------------------------------------------------------------ */

interface ColumnDef {
  key: string
  label: string
  type: 'text' | 'number' | 'boolean'
  required?: boolean
}

interface TabDef {
  key: string
  label: string
  apiName: string
  columns: ColumnDef[]
  idField: string
}

const TABS: TabDef[] = [
  {
    key: 'movement-types', label: 'Movement Types', apiName: 'movement-types', idField: 'id',
    columns: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'y_offset_min', label: 'Y Offset Min', type: 'number' },
      { key: 'y_offset_max', label: 'Y Offset Max', type: 'number' },
      { key: 'bob_amplitude', label: 'Bob Amplitude', type: 'number' },
      { key: 'bob_frequency', label: 'Bob Frequency', type: 'number' },
      { key: 'speed_multiplier', label: 'Speed Multiplier', type: 'number' },
      { key: 'trail_effect', label: 'Trail Effect', type: 'text' },
    ],
  },
  {
    key: 'size-classes', label: 'Size Classes', apiName: 'size-classes', idField: 'id',
    columns: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'scale_min', label: 'Scale Min', type: 'number' },
      { key: 'scale_max', label: 'Scale Max', type: 'number' },
      { key: 'width_base', label: 'Width Base', type: 'number' },
      { key: 'height_base', label: 'Height Base', type: 'number' },
      { key: 'hitbox_radius', label: 'Hitbox Radius', type: 'number' },
      { key: 'hp_bar_width', label: 'HP Bar Width', type: 'number' },
      { key: 'sort_order', label: 'Sort Order', type: 'number' },
    ],
  },
  {
    key: 'animation-styles', label: 'Animation Styles', apiName: 'animation-styles', idField: 'id',
    columns: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'idle_scale_x', label: 'Idle Scale X', type: 'number' },
      { key: 'idle_scale_y', label: 'Idle Scale Y', type: 'number' },
      { key: 'idle_cycle_ms', label: 'Idle Cycle (ms)', type: 'number' },
      { key: 'idle_translate_x', label: 'Idle Translate X', type: 'number' },
      { key: 'idle_translate_y', label: 'Idle Translate Y', type: 'number' },
      { key: 'death_style', label: 'Death Style', type: 'text' },
      { key: 'death_particle_count', label: 'Death Particles', type: 'number' },
    ],
  },
  {
    key: 'silhouette-types', label: 'Silhouette Types', apiName: 'silhouette-types', idField: 'id',
    columns: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'body_shape', label: 'Body Shape', type: 'text' },
      { key: 'body_ratio_w', label: 'Body Ratio W', type: 'number' },
      { key: 'body_ratio_h', label: 'Body Ratio H', type: 'number' },
      { key: 'has_limbs', label: 'Has Limbs', type: 'boolean' },
      { key: 'limb_count', label: 'Limb Count', type: 'number' },
      { key: 'has_head', label: 'Has Head', type: 'boolean' },
      { key: 'has_wings', label: 'Has Wings', type: 'boolean' },
      { key: 'has_eye_glow', label: 'Has Eye Glow', type: 'boolean' },
    ],
  },
  {
    key: 'armor-classes', label: 'Armor Classes', apiName: 'armor-classes', idField: 'id',
    columns: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'display_name', label: 'Display Name', type: 'text', required: true },
      { key: 'overlay_opacity', label: 'Overlay Opacity', type: 'number' },
      { key: 'texture_pattern', label: 'Texture Pattern', type: 'text' },
      { key: 'glow_intensity', label: 'Glow Intensity', type: 'number' },
      { key: 'weight_class', label: 'Weight Class', type: 'text' },
    ],
  },
]

/* ------------------------------------------------------------------ */
/* Helper: build empty row from column defs                            */
/* ------------------------------------------------------------------ */

function emptyRow(columns: ColumnDef[]): Record<string, any> {
  const row: Record<string, any> = {}
  columns.forEach(col => {
    if (col.type === 'boolean') row[col.key] = false
    else if (col.type === 'number') row[col.key] = 0
    else row[col.key] = ''
  })
  return row
}

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export default function VisualEditor() {
  const [activeTab, setActiveTab] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab && TABS.some(t => t.key === tab)) return tab
    return TABS[0].key
  })

  const [rows, setRows] = useState<Record<string, any>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Modal state
  const [editingRow, setEditingRow] = useState<Record<string, any> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const currentTab = TABS.find(t => t.key === activeTab)!

  /* ---- Fetch rows ---- */

  const fetchRows = useCallback(async (tabKey: string) => {
    setLoading(true)
    setError(null)
    try {
      const tab = TABS.find(t => t.key === tabKey)!
      const res = await api.get(`/api/admin/visual/${tab.apiName}`)
      if (res.ok) {
        setRows(await res.json())
      } else {
        setError(`Failed to load ${tab.label}`)
        setRows([])
      }
    } catch {
      setError('Network error')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRows(activeTab)
  }, [activeTab, fetchRows])

  /* ---- Tab navigation ---- */

  const handleTabChange = useCallback((tabKey: string) => {
    setActiveTab(tabKey)
    setEditingRow(null)
    setDeleteConfirm(null)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tabKey)
    window.history.replaceState({}, '', url.toString())
  }, [])

  /* ---- CRUD operations ---- */

  const handleAdd = () => {
    setEditingRow(emptyRow(currentTab.columns))
    setIsNew(true)
  }

  const handleEdit = (row: Record<string, any>) => {
    setEditingRow({ ...row })
    setIsNew(false)
  }

  const handleSave = async () => {
    if (!editingRow) return
    setSaving(true)
    try {
      let res: Response
      if (isNew) {
        res = await api.post(`/api/admin/visual/${currentTab.apiName}`, editingRow)
      } else {
        res = await api.put(`/api/admin/visual/${currentTab.apiName}/${editingRow[currentTab.idField]}`, editingRow)
      }
      if (res.ok) {
        setEditingRow(null)
        await fetchRows(activeTab)
      } else {
        const errData = await res.json().catch(() => null)
        setError(errData?.detail || 'Save failed')
      }
    } catch {
      setError('Network error during save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    setSaving(true)
    try {
      const res = await api.delete(`/api/admin/visual/${currentTab.apiName}/${id}`)
      if (res.ok) {
        setDeleteConfirm(null)
        await fetchRows(activeTab)
      } else {
        setError('Delete failed')
      }
    } catch {
      setError('Network error during delete')
    } finally {
      setSaving(false)
    }
  }

  /* ---- Field change in modal ---- */

  const handleFieldChange = (key: string, value: any, type: string) => {
    if (!editingRow) return
    let parsed = value
    if (type === 'number') {
      parsed = value === '' ? 0 : Number(value)
    } else if (type === 'boolean') {
      parsed = value === true || value === 'true'
    }
    setEditingRow({ ...editingRow, [key]: parsed })
  }

  /* ---- Render cell value ---- */

  const renderCell = (row: Record<string, any>, col: ColumnDef) => {
    const val = row[col.key]
    if (col.type === 'boolean') return val ? 'Yes' : 'No'
    if (val === null || val === undefined) return <span className="ve-null">null</span>
    return String(val)
  }

  /* ---- Render ---- */

  return (
    <div className="visual-editor">
      <div className="ve-header">
        <h2>Visual Editor</h2>
      </div>

      {/* Tabs */}
      <div className="ve-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={'ve-tab' + (activeTab === tab.key ? ' ve-tab--active' : '')}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="ve-error">
          {error}
          <button className="ve-error-dismiss" onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="ve-toolbar">
        <span className="ve-count">{rows.length} row{rows.length !== 1 ? 's' : ''}</span>
        <button className="ve-btn ve-btn--add" onClick={handleAdd}>+ Add {currentTab.label.replace(/s$/, '')}</button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="ve-loading">Loading {currentTab.label}...</div>
      ) : rows.length === 0 ? (
        <div className="ve-empty">No {currentTab.label.toLowerCase()} found.</div>
      ) : (
        <div className="ve-table-wrap">
          <table className="ve-table">
            <thead>
              <tr>
                <th>ID</th>
                {currentTab.columns.map(col => (
                  <th key={col.key}>{col.label}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row[currentTab.idField]}>
                  <td className="ve-id">{row[currentTab.idField]}</td>
                  {currentTab.columns.map(col => (
                    <td key={col.key}>{renderCell(row, col)}</td>
                  ))}
                  <td className="ve-actions">
                    <button className="ve-btn ve-btn--edit" onClick={() => handleEdit(row)}>Edit</button>
                    {deleteConfirm === row[currentTab.idField] ? (
                      <>
                        <button className="ve-btn ve-btn--danger" onClick={() => handleDelete(row[currentTab.idField])} disabled={saving}>
                          Confirm
                        </button>
                        <button className="ve-btn ve-btn--cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                      </>
                    ) : (
                      <button className="ve-btn ve-btn--delete" onClick={() => setDeleteConfirm(row[currentTab.idField])}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit / Add Modal */}
      {editingRow && (
        <div className="ve-modal-backdrop" onClick={() => setEditingRow(null)}>
          <div className="ve-modal" onClick={e => e.stopPropagation()}>
            <h3>{isNew ? 'Add' : 'Edit'} {currentTab.label.replace(/s$/, '')}</h3>
            <div className="ve-form">
              {currentTab.columns.map(col => (
                <label key={col.key} className="ve-field">
                  <span className="ve-field-label">
                    {col.label}
                    {col.required && <span className="ve-required">*</span>}
                  </span>
                  {col.type === 'boolean' ? (
                    <select
                      value={String(editingRow[col.key] ?? false)}
                      onChange={e => handleFieldChange(col.key, e.target.value, col.type)}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : col.type === 'number' ? (
                    <input
                      type="number"
                      step="any"
                      value={editingRow[col.key] ?? 0}
                      onChange={e => handleFieldChange(col.key, e.target.value, col.type)}
                    />
                  ) : (
                    <input
                      type="text"
                      value={editingRow[col.key] ?? ''}
                      onChange={e => handleFieldChange(col.key, e.target.value, col.type)}
                    />
                  )}
                </label>
              ))}
            </div>
            <div className="ve-modal-actions">
              <button className="ve-btn ve-btn--save" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : isNew ? 'Create' : 'Save'}
              </button>
              <button className="ve-btn ve-btn--cancel" onClick={() => setEditingRow(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
