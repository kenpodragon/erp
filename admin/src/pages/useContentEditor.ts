import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'

/* ------------------------------------------------------------------ */
/* Types & Constants                                                   */
/* ------------------------------------------------------------------ */

export type EntityType = 'stats' | 'classes' | 'skills' | 'benefits' | 'items' | 'gear_slots'

export interface TabConfig {
  key: EntityType
  label: string
  endpoint: string
  columns: string[]
  nameField: string
}

export const TABS: TabConfig[] = [
  { key: 'stats', label: 'Stat Definitions', endpoint: '/api/admin/game/stats', columns: ['id', 'name', 'display_name', 'description', 'base_value'], nameField: 'name' },
  { key: 'classes', label: 'Character Classes', endpoint: '/api/admin/game/classes', columns: ['id', 'name', 'lore_blurb', 'base_strength', 'base_agility', 'base_intelligence', 'is_available'], nameField: 'name' },
  { key: 'skills', label: 'Skills', endpoint: '/api/admin/game/skills', columns: ['id', 'name', 'display_name', 'category', 'is_class_exclusive', 'effect_type'], nameField: 'name' },
  { key: 'benefits', label: 'Benefit Effects', endpoint: '/api/admin/game/benefits', columns: ['id', 'effect_key', 'display_name', 'description'], nameField: 'effect_key' },
  { key: 'items', label: 'Item Components', endpoint: '/api/admin/game/items/components', columns: [], nameField: '' },
  { key: 'gear_slots', label: 'Gear Slots', endpoint: '/api/admin/game/gear-slots', columns: ['id', 'name', 'display_name', 'sort_order', 'description'], nameField: 'name' },
]

export const COMPONENT_TYPES = ['prefixes', 'qualities', 'lore_tags', 'type_bases', 'suffixes'] as const
export type CompType = typeof COMPONENT_TYPES[number]

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function useContentEditor() {
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
  const [activeComp, setActiveComp] = useState<CompType>('prefixes')
  const [itemData, setItemData] = useState<Record<string, any[]>>({})

  const tab = TABS.find(t => t.key === activeTab)!

  /* ---------------------------------------------------------------- */
  /* Lookup data                                                       */
  /* ---------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------- */
  /* Data fetching                                                     */
  /* ---------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------- */
  /* Selection & creation                                              */
  /* ---------------------------------------------------------------- */

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

  const changeActiveComp = (ct: string) => {
    setActiveComp(ct as CompType)
    setSelected(null)
    setCreating(false)
  }

  const cancelEdit = () => {
    setSelected(null)
    setCreating(false)
  }

  /* ---------------------------------------------------------------- */
  /* CRUD                                                              */
  /* ---------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------- */
  /* Derived data                                                      */
  /* ---------------------------------------------------------------- */

  const displayItems = activeTab === 'items' ? (itemData[activeComp] || []) : data
  const displayColumns = activeTab === 'items' ? ['id', 'code', 'display_name'] : tab.columns

  return {
    // Tab state
    activeTab,
    setActiveTab,
    tab,
    activeComp,
    changeActiveComp,

    // Data
    data,
    loading,
    displayItems,
    displayColumns,
    itemData,

    // Selection
    selected,
    creating,
    editForm,
    setEditForm,
    saving,

    // Lookups
    statDefs,
    benefitDefs,
    avatarOptions,
    gearSlots,

    // Actions
    handleSelect,
    handleCreate,
    handleSave,
    handleDelete,
    cancelEdit,
  }
}
