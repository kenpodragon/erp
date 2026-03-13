import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api'
import AssetPreview from '../components/AssetPreview'
import './AssetRegistry.css'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface AssetEntry {
  id: number
  asset_key: string
  category: string
  display_name: string | null
  description: string | null
  render_definition: any
  tags: string[] | null
  source: string
  created_at: string
  updated_at: string
}

interface AssetListResponse {
  items: AssetEntry[]
  total: number
  page: number
  page_size: number
}

interface MissingAsset {
  asset_key: string
  referenced_in: { table: string; column: string; count: number }[]
  suggested_category: string
}

interface UnusedAsset {
  asset_key: string
  category: string
  source: string
  created_at: string
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const VALID_CATEGORIES = [
  'entity_sprite', 'class_sprite', 'background',
  'item_icon', 'artifact_icon', 'achievement_icon', 'skill_icon',
  'avatar', 'skin', 'badge', 'flair',
  'spell_effect', 'ui_icon', 'narrative_image', 'portrait',
]

const SOURCE_OPTIONS = ['admin', 'seed', 'generator', 'migrated']

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function relativeTime(dateStr: string): string {
  if (!dateStr) return '--'
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function sourceClass(source: string): string {
  if (source === 'admin') return 'ar-source-badge ar-source-badge--admin'
  if (source === 'generator') return 'ar-source-badge ar-source-badge--generator'
  if (source === 'migrated') return 'ar-source-badge ar-source-badge--migrated'
  return 'ar-source-badge'
}

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export default function AssetRegistry() {
  /* --- List state --- */
  const [assets, setAssets] = useState<AssetEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  /* --- Filter state --- */
  const [filterCategory, setFilterCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [tagFilter, setTagFilter] = useState('')

  /* --- Pagination --- */
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)

  /* --- Modal state --- */
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<AssetEntry | null>(null)

  /* --- Delete confirm --- */
  const [deleteTarget, setDeleteTarget] = useState<AssetEntry | null>(null)
  const [deleteRefWarning, setDeleteRefWarning] = useState('')

  /* --- Orphan panel --- */
  const [orphanOpen, setOrphanOpen] = useState(false)
  const [orphanTab, setOrphanTab] = useState<'missing' | 'unused'>('missing')
  const [missingAssets, setMissingAssets] = useState<MissingAsset[]>([])
  const [unusedAssets, setUnusedAssets] = useState<UnusedAsset[]>([])
  const [orphanLoading, setOrphanLoading] = useState(false)

  /* --- Edit form state --- */
  const [editKey, setEditKey] = useState('')
  const [editCategory, setEditCategory] = useState('entity_sprite')
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editTags, setEditTags] = useState('')
  const [editSource, setEditSource] = useState('admin')
  const [editJson, setEditJson] = useState('{}')
  const [editDescription, setEditDescription] = useState('')

  /* --- Preview debounce --- */
  const [previewDef, setPreviewDef] = useState<any>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* --- Messages --- */
  const [message, setMessage] = useState('')
  const [messageError, setMessageError] = useState(false)
  const [saving, setSaving] = useState(false)

  /* ---------------------------------------------------------------- */
  /* Fetch assets                                                      */
  /* ---------------------------------------------------------------- */

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterCategory) params.set('category', filterCategory)
      if (searchTerm) params.set('search', searchTerm)
      if (tagFilter) params.set('tag', tagFilter)
      params.set('page', String(page))
      params.set('page_size', String(pageSize))
      const url = `/api/admin/assets/?${params.toString()}`
      const res = await api.get(url)
      if (res.ok) {
        const data: AssetListResponse = await res.json()
        setAssets(data.items)
        setTotal(data.total)
      } else {
        showMsg('Failed to fetch assets', true)
      }
    } catch {
      showMsg('Network error fetching assets', true)
    }
    setLoading(false)
  }, [filterCategory, searchTerm, tagFilter, page, pageSize])

  useEffect(() => { fetchAssets() }, [fetchAssets])

  /* ---------------------------------------------------------------- */
  /* Orphan fetching                                                   */
  /* ---------------------------------------------------------------- */

  const fetchOrphans = useCallback(async () => {
    setOrphanLoading(true)
    try {
      const [missingRes, unusedRes] = await Promise.all([
        api.get('/api/admin/assets/orphans/missing'),
        api.get('/api/admin/assets/orphans/unused'),
      ])
      if (missingRes.ok) {
        const data = await missingRes.json()
        setMissingAssets(data.missing || [])
      }
      if (unusedRes.ok) {
        const data = await unusedRes.json()
        setUnusedAssets(data.unused || [])
      }
    } catch {
      showMsg('Failed to fetch orphan data', true)
    }
    setOrphanLoading(false)
  }, [])

  useEffect(() => {
    if (orphanOpen) fetchOrphans()
  }, [orphanOpen, fetchOrphans])

  /* ---------------------------------------------------------------- */
  /* Message helper                                                    */
  /* ---------------------------------------------------------------- */

  const showMsg = useCallback((msg: string, isError = false) => {
    setMessage(msg)
    setMessageError(isError)
    if (!isError) setTimeout(() => setMessage(''), 4000)
  }, [])

  /* ---------------------------------------------------------------- */
  /* JSON preview debounce                                             */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      try {
        const parsed = JSON.parse(editJson)
        setPreviewDef(parsed)
      } catch {
        // Invalid JSON — keep last valid preview
      }
    }, 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [editJson])

  /* ---------------------------------------------------------------- */
  /* Modal: open create                                                */
  /* ---------------------------------------------------------------- */

  const openCreate = useCallback(() => {
    setSelectedAsset(null)
    setEditKey('')
    setEditCategory('entity_sprite')
    setEditDisplayName('')
    setEditTags('')
    setEditSource('admin')
    setEditJson('{}')
    setEditDescription('')
    setPreviewDef({})
    setIsModalOpen(true)
    setMessage('')
  }, [])

  /* ---------------------------------------------------------------- */
  /* Modal: open create from missing orphan                            */
  /* ---------------------------------------------------------------- */

  const openCreateFromMissing = useCallback((m: MissingAsset) => {
    setSelectedAsset(null)
    setEditKey(m.asset_key)
    setEditCategory(m.suggested_category || 'entity_sprite')
    setEditDisplayName(m.asset_key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
    setEditTags('')
    setEditSource('admin')
    setEditJson('{}')
    setEditDescription('')
    setPreviewDef({})
    setIsModalOpen(true)
    setMessage('')
  }, [])

  /* ---------------------------------------------------------------- */
  /* Modal: open edit                                                  */
  /* ---------------------------------------------------------------- */

  const openEdit = useCallback((asset: AssetEntry) => {
    setSelectedAsset(asset)
    setEditKey(asset.asset_key)
    setEditCategory(asset.category)
    setEditDisplayName(asset.display_name || '')
    setEditTags(Array.isArray(asset.tags) ? asset.tags.join(', ') : '')
    setEditSource(asset.source)
    const jsonStr = asset.render_definition ? JSON.stringify(asset.render_definition, null, 2) : '{}'
    setEditJson(jsonStr)
    setEditDescription(asset.description || '')
    try { setPreviewDef(asset.render_definition || {}) } catch { setPreviewDef({}) }
    setIsModalOpen(true)
    setMessage('')
  }, [])

  /* ---------------------------------------------------------------- */
  /* Modal: save (create or update)                                    */
  /* ---------------------------------------------------------------- */

  const handleSave = useCallback(async () => {
    if (!editKey.trim()) { showMsg('Asset key is required', true); return }

    let parsedDef: any
    try {
      parsedDef = JSON.parse(editJson)
    } catch {
      showMsg('Invalid JSON in render definition', true)
      return
    }

    const tagsArray = editTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)

    const body = {
      asset_key: editKey.trim(),
      category: editCategory,
      display_name: editDisplayName.trim() || null,
      description: editDescription.trim() || null,
      render_definition: parsedDef,
      tags: tagsArray.length > 0 ? tagsArray : [],
      source: editSource,
    }

    setSaving(true)
    try {
      let res: Response
      if (selectedAsset) {
        res = await api.put(`/api/admin/assets/${selectedAsset.asset_key}`, body)
      } else {
        res = await api.post('/api/admin/assets/', body)
      }

      if (res.ok) {
        showMsg(selectedAsset ? 'Asset updated' : 'Asset created')
        setIsModalOpen(false)
        fetchAssets()
      } else {
        const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
        showMsg(`Error: ${err.detail || JSON.stringify(err)}`, true)
      }
    } catch {
      showMsg('Network error', true)
    }
    setSaving(false)
  }, [editKey, editCategory, editDisplayName, editTags, editSource, editJson, editDescription, selectedAsset, fetchAssets, showMsg])

  /* ---------------------------------------------------------------- */
  /* Delete                                                            */
  /* ---------------------------------------------------------------- */

  const confirmDelete = useCallback(async (asset: AssetEntry) => {
    setDeleteTarget(asset)
    setDeleteRefWarning('')
    // Check if referenced — try to get info from API
    try {
      const res = await api.get(`/api/admin/assets/${asset.asset_key}`)
      if (res.ok) {
        const data = await res.json()
        if (data.reference_count && data.reference_count > 0) {
          setDeleteRefWarning(`This asset is referenced ${data.reference_count} time(s) in game tables.`)
        }
      }
    } catch {
      // Proceed without warning
    }
  }, [])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      const res = await api.delete(`/api/admin/assets/${deleteTarget.asset_key}`)
      if (res.ok) {
        showMsg(`Deleted "${deleteTarget.asset_key}"`)
        setDeleteTarget(null)
        fetchAssets()
      } else {
        const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
        showMsg(`Error: ${err.detail || JSON.stringify(err)}`, true)
        setDeleteTarget(null)
      }
    } catch {
      showMsg('Network error', true)
      setDeleteTarget(null)
    }
  }, [deleteTarget, fetchAssets, showMsg])

  /* ---------------------------------------------------------------- */
  /* Bulk delete unused                                                */
  /* ---------------------------------------------------------------- */

  const handleBulkDeleteUnused = useCallback(async () => {
    if (unusedAssets.length === 0) return
    if (!confirm(`Delete ${unusedAssets.length} unused asset(s)? This cannot be undone.`)) return
    try {
      let deleted = 0
      for (const u of unusedAssets) {
        const res = await api.delete(`/api/admin/assets/${u.asset_key}`)
        if (res.ok) deleted++
      }
      showMsg(`Deleted ${deleted} unused asset(s)`)
      fetchAssets()
      fetchOrphans()
    } catch {
      showMsg('Error during bulk delete', true)
    }
  }, [unusedAssets, fetchAssets, fetchOrphans, showMsg])

  /* ---------------------------------------------------------------- */
  /* Search debounce                                                   */
  /* ---------------------------------------------------------------- */

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setSearchTerm(searchInput)
      setPage(1)
    }, 300)
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current) }
  }, [searchInput])

  /* ---------------------------------------------------------------- */
  /* Pagination helpers                                                */
  /* ---------------------------------------------------------------- */

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="ar-page">
      {/* --- Header --- */}
      <div className="ar-header">
        <h2>Asset Registry</h2>
        <div className="ar-header-actions">
          <input
            type="text"
            className="ar-search-input"
            placeholder="Search assets..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          <button className="ar-btn ar-btn-primary" onClick={openCreate}>+ New Asset</button>
        </div>
      </div>

      {/* --- Category Tabs --- */}
      <div className="ar-category-tabs">
        <button
          className={`ar-category-tab ${!filterCategory ? 'ar-category-tab--active' : ''}`}
          onClick={() => { setFilterCategory(''); setPage(1) }}
        >
          All
        </button>
        {VALID_CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`ar-category-tab ${filterCategory === cat ? 'ar-category-tab--active' : ''}`}
            onClick={() => { setFilterCategory(cat); setPage(1) }}
          >
            {cat.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* --- Message --- */}
      {message && (
        <div className={`ar-message ${messageError ? 'ar-message--error' : ''}`}>
          {message}
        </div>
      )}

      {/* --- Asset Table --- */}
      {loading ? (
        <div className="ar-loading">Loading assets...</div>
      ) : assets.length === 0 ? (
        <div className="ar-empty">No assets found. Create one or adjust filters.</div>
      ) : (
        <div className="ar-table-wrapper">
          <table className="ar-table">
            <thead>
              <tr>
                <th>Preview</th>
                <th>Asset Key</th>
                <th>Display Name</th>
                <th>Category</th>
                <th>Tags</th>
                <th>Source</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(asset => (
                <tr key={asset.id}>
                  <td className="ar-preview-cell">
                    <AssetPreview
                      category={asset.category}
                      renderDefinition={asset.render_definition}
                      width={48}
                      height={48}
                    />
                  </td>
                  <td className="ar-key-cell">{asset.asset_key}</td>
                  <td className="ar-name-cell">{asset.display_name || '--'}</td>
                  <td><span className="ar-category-badge">{asset.category.replace(/_/g, ' ')}</span></td>
                  <td>
                    <div className="ar-tag-chips">
                      {(asset.tags || []).slice(0, 5).map((tag, i) => (
                        <span key={i} className="ar-tag-chip">{tag}</span>
                      ))}
                      {(asset.tags || []).length > 5 && (
                        <span className="ar-tag-chip">+{(asset.tags || []).length - 5}</span>
                      )}
                    </div>
                  </td>
                  <td><span className={sourceClass(asset.source)}>{asset.source}</span></td>
                  <td className="ar-time-cell">{relativeTime(asset.updated_at)}</td>
                  <td>
                    <div className="ar-actions-cell">
                      <button className="ar-btn ar-btn-sm" onClick={() => openEdit(asset)}>Edit</button>
                      <button className="ar-btn ar-btn-sm ar-btn-danger" onClick={() => confirmDelete(asset)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- Pagination --- */}
      <div className="ar-pagination">
        <span>
          {total} asset{total !== 1 ? 's' : ''} total
          {filterCategory && ` in "${filterCategory.replace(/_/g, ' ')}"`}
        </span>
        <div className="ar-pagination-controls">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      </div>

      {/* --- Orphan Detection Panel --- */}
      <div className="ar-orphan-panel">
        <div className="ar-orphan-header" onClick={() => setOrphanOpen(!orphanOpen)}>
          <h3>Orphan Detection</h3>
          <span className="ar-orphan-toggle">{orphanOpen ? 'Collapse' : 'Expand'}</span>
        </div>
        {orphanOpen && (
          <div className="ar-orphan-body">
            <div className="ar-orphan-tabs">
              <button
                className={`ar-orphan-tab ${orphanTab === 'missing' ? 'ar-orphan-tab--active' : ''}`}
                onClick={() => setOrphanTab('missing')}
              >
                Missing Assets ({missingAssets.length})
              </button>
              <button
                className={`ar-orphan-tab ${orphanTab === 'unused' ? 'ar-orphan-tab--active' : ''}`}
                onClick={() => setOrphanTab('unused')}
              >
                Unused Assets ({unusedAssets.length})
              </button>
            </div>

            {orphanLoading ? (
              <div className="ar-loading">Scanning...</div>
            ) : orphanTab === 'missing' ? (
              missingAssets.length === 0 ? (
                <div className="ar-empty">No missing assets detected.</div>
              ) : (
                <table className="ar-orphan-table">
                  <thead>
                    <tr>
                      <th>Asset Key</th>
                      <th>Referenced In</th>
                      <th>Suggested Category</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missingAssets.map((m, i) => (
                      <tr key={i}>
                        <td className="ar-key-cell">{m.asset_key}</td>
                        <td>
                          {m.referenced_in.map((ref, j) => (
                            <div key={j} className="ar-orphan-ref">
                              {ref.table}.{ref.column} ({ref.count})
                            </div>
                          ))}
                        </td>
                        <td><span className="ar-category-badge">{m.suggested_category.replace(/_/g, ' ')}</span></td>
                        <td>
                          <button className="ar-btn ar-btn-sm ar-btn-primary" onClick={() => openCreateFromMissing(m)}>
                            Create
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              <>
                {unusedAssets.length === 0 ? (
                  <div className="ar-empty">No unused assets detected.</div>
                ) : (
                  <>
                    <table className="ar-orphan-table">
                      <thead>
                        <tr>
                          <th>Asset Key</th>
                          <th>Category</th>
                          <th>Source</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unusedAssets.map((u, i) => (
                          <tr key={i}>
                            <td className="ar-key-cell">{u.asset_key}</td>
                            <td><span className="ar-category-badge">{u.category.replace(/_/g, ' ')}</span></td>
                            <td><span className={sourceClass(u.source)}>{u.source}</span></td>
                            <td className="ar-time-cell">{relativeTime(u.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="ar-bulk-actions">
                      <button className="ar-btn ar-btn-danger" onClick={handleBulkDeleteUnused}>
                        Delete All Unused ({unusedAssets.length})
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* --- Create/Edit Modal --- */}
      {isModalOpen && (
        <div className="ar-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="ar-modal" onClick={e => e.stopPropagation()}>
            <h3>{selectedAsset ? 'Edit Asset' : 'Create Asset'}</h3>
            <div className="ar-modal-body">
              {/* Left panel — form fields */}
              <div className="ar-modal-left">
                <div className="ar-form-row">
                  <label>Asset Key</label>
                  <input
                    type="text"
                    value={editKey}
                    onChange={e => setEditKey(e.target.value)}
                    disabled={!!selectedAsset}
                    placeholder="e.g., enemy_sludge_stalker"
                  />
                </div>
                <div className="ar-form-row">
                  <label>Category</label>
                  <select value={editCategory} onChange={e => setEditCategory(e.target.value)}>
                    {VALID_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div className="ar-form-row">
                  <label>Display Name</label>
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={e => setEditDisplayName(e.target.value)}
                    placeholder="Human-readable name"
                  />
                </div>
                <div className="ar-form-row">
                  <label>Description</label>
                  <textarea
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    rows={2}
                    placeholder="Optional description"
                  />
                </div>
                <div className="ar-form-row">
                  <label>Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={editTags}
                    onChange={e => setEditTags(e.target.value)}
                    placeholder="book_1, chapter_1, melee"
                  />
                </div>
                <div className="ar-form-row">
                  <label>Source</label>
                  <select value={editSource} onChange={e => setEditSource(e.target.value)}>
                    {SOURCE_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Right panel — JSON editor + live preview */}
              <div className="ar-modal-right">
                <div>
                  <div className="ar-json-label">Render Definition (JSON)</div>
                  <textarea
                    className="ar-json-editor"
                    value={editJson}
                    onChange={e => setEditJson(e.target.value)}
                    spellCheck={false}
                    placeholder='{ "base_shape": "circle", "radius": 20, "fill_color": "#aa44cc" }'
                  />
                </div>
                <div className="ar-live-preview">
                  <div className="ar-live-preview-label">Live Preview</div>
                  <AssetPreview
                    category={editCategory}
                    renderDefinition={previewDef}
                    width={192}
                    height={192}
                  />
                </div>
              </div>
            </div>

            <div className="ar-modal-actions">
              <button className="ar-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button
                className="ar-btn ar-btn-primary"
                onClick={handleSave}
                disabled={saving || !editKey.trim()}
              >
                {saving ? 'Saving...' : selectedAsset ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Delete Confirmation --- */}
      {deleteTarget && (
        <div className="ar-modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="ar-confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3>Delete Asset</h3>
            <p>
              Are you sure you want to delete <strong>{deleteTarget.asset_key}</strong>?
            </p>
            {deleteRefWarning && (
              <div className="ar-ref-warning">{deleteRefWarning}</div>
            )}
            <div className="ar-modal-actions">
              <button className="ar-btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="ar-btn ar-btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
