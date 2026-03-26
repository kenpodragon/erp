import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface AssetEntry {
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

export interface AssetListResponse {
  items: AssetEntry[]
  total: number
  page: number
  page_size: number
}

export interface MissingAsset {
  asset_key: string
  referenced_in: { table: string; column: string; count: number }[]
  suggested_category: string
}

export interface UnusedAsset {
  asset_key: string
  category: string
  source: string
  created_at: string
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

interface UseAssetOperationsArgs {
  filterCategory: string
  searchTerm: string
  tagFilter: string
  page: number
  pageSize: number
  setTotal: (n: number) => void
}

export interface AssetOperations {
  /* List */
  assets: AssetEntry[]
  loading: boolean
  fetchAssets: () => Promise<void>

  /* Messages */
  message: string
  messageError: boolean
  showMsg: (msg: string, isError?: boolean) => void

  /* Modal */
  isModalOpen: boolean
  setIsModalOpen: (v: boolean) => void
  selectedAsset: AssetEntry | null
  editKey: string
  setEditKey: (v: string) => void
  editCategory: string
  setEditCategory: (v: string) => void
  editDisplayName: string
  setEditDisplayName: (v: string) => void
  editTags: string
  setEditTags: (v: string) => void
  editSource: string
  setEditSource: (v: string) => void
  editJson: string
  setEditJson: (v: string) => void
  editDescription: string
  setEditDescription: (v: string) => void
  previewDef: any
  saving: boolean
  openCreate: () => void
  openCreateFromMissing: (m: MissingAsset) => void
  openEdit: (asset: AssetEntry) => void
  handleSave: () => Promise<void>

  /* Delete */
  deleteTarget: AssetEntry | null
  deleteRefWarning: string
  confirmDelete: (asset: AssetEntry) => Promise<void>
  handleDelete: () => Promise<void>
  setDeleteTarget: (v: AssetEntry | null) => void

  /* Orphans */
  orphanOpen: boolean
  setOrphanOpen: (v: boolean) => void
  orphanTab: 'missing' | 'unused'
  setOrphanTab: (v: 'missing' | 'unused') => void
  missingAssets: MissingAsset[]
  unusedAssets: UnusedAsset[]
  orphanLoading: boolean
  handleBulkDeleteUnused: () => Promise<void>
}

export function useAssetOperations({
  filterCategory,
  searchTerm,
  tagFilter,
  page,
  pageSize,
  setTotal,
}: UseAssetOperationsArgs): AssetOperations {
  /* --- List state --- */
  const [assets, setAssets] = useState<AssetEntry[]>([])
  const [loading, setLoading] = useState(true)

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
  /* Message helper                                                    */
  /* ---------------------------------------------------------------- */

  const showMsg = useCallback((msg: string, isError = false) => {
    setMessage(msg)
    setMessageError(isError)
    if (!isError) setTimeout(() => setMessage(''), 4000)
  }, [])

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
  }, [filterCategory, searchTerm, tagFilter, page, pageSize, setTotal, showMsg])

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
  }, [showMsg])

  useEffect(() => {
    if (orphanOpen) fetchOrphans()
  }, [orphanOpen, fetchOrphans])

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

  return {
    assets,
    loading,
    fetchAssets,
    message,
    messageError,
    showMsg,
    isModalOpen,
    setIsModalOpen,
    selectedAsset,
    editKey,
    setEditKey,
    editCategory,
    setEditCategory,
    editDisplayName,
    setEditDisplayName,
    editTags,
    setEditTags,
    editSource,
    setEditSource,
    editJson,
    setEditJson,
    editDescription,
    setEditDescription,
    previewDef,
    saving,
    openCreate,
    openCreateFromMissing,
    openEdit,
    handleSave,
    deleteTarget,
    deleteRefWarning,
    confirmDelete,
    handleDelete,
    setDeleteTarget,
    orphanOpen,
    setOrphanOpen,
    orphanTab,
    setOrphanTab,
    missingAssets,
    unusedAssets,
    orphanLoading,
    handleBulkDeleteUnused,
  }
}
