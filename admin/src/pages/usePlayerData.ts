import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface Player {
  id: number
  firebase_uid: string
  email: string
  alias: string | null
  google_display_name: string | null
  google_avatar_url: string | null
  custom_avatar_url: string | null
  avatar_preset_key: string | null
  is_banned: boolean
  banned_at: string | null
  banned_by: string | null
  ban_reason: string | null
  sessions_invalid_before: string | null
  created_at: string
  last_login_at: string
  terms_accepted_at: string | null
  is_owner: boolean
  is_system_admin: boolean
  is_game_admin: boolean
}

export interface MeInfo {
  email: string
  is_owner: boolean
}

export interface Character {
  id: number
  character_name: string
  level: number
  character_xp: number
  class_id: number
  class: {
    name: string
    sprite_key: string
  }
  strength: number
  agility: number
  intelligence: number
  created_at: string
  last_played_at: string
}

export interface Ticket {
  id: number
  subject: string
  category: string
  status: string
  priority: string
  created_at: string
}

export interface InventoryEntry {
  inventory_id: number
  item_id: number
  name: string
  item_type: string
  rarity: string
  base_stats: Record<string, number>
  item_level: number
  item_code: string
  gear_slot_id: number
  is_equipped: boolean
  equipped_slot: string | null
}

export interface ArtifactEntry {
  id: number
  name: string
  rarity: string
  artifact_type: 'generated' | 'curated'
  artifact_code: string
  stat_bonuses: Record<string, number>
  curated_artifact_id: number | null
  icon_sprite_key: string
}

export interface CharacterInventory {
  equipped: InventoryEntry[]
  bag: InventoryEntry[]
  bag_count: number
  bag_capacity: number
  artifacts: ArtifactEntry[]
}

export interface ProgressionInfo {
  book: number
  chapter: number
  scene: number
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function usePlayerData(id: string | undefined) {
  const [player, setPlayer] = useState<Player | null>(null)
  const [me, setMe] = useState<MeInfo | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Inventory data per character
  const [inventoryData, setInventoryData] = useState<Record<number, CharacterInventory>>({})
  const [expandedInventory, setExpandedInventory] = useState<Record<number, boolean>>({})
  const [essenceData, setEssenceData] = useState<Record<number, number>>({})
  const [progressionData, setProgressionData] = useState<Record<number, ProgressionInfo>>({})

  // Ban modal
  const [showBanModal, setShowBanModal] = useState(false)
  const [banReason, setBanReason] = useState('')

  // Alias modal
  const [showEditAlias, setShowEditAlias] = useState(false)
  const [newAlias, setNewAlias] = useState('')

  // Finance toggle
  const [showFinance, setShowFinance] = useState(true)

  // Modal state for character interactions
  const [editCharId, setEditCharId] = useState<number | null>(null)
  const [craftCharId, setCraftCharId] = useState<number | null>(null)
  const [craftCharLevel, setCraftCharLevel] = useState(1)
  const [editItemId, setEditItemId] = useState<number | null>(null)
  const [editItemCharId, setEditItemCharId] = useState<number | null>(null)
  const [editItemIsArtifact, setEditItemIsArtifact] = useState(false)
  const [editItemArtifactType, setEditItemArtifactType] = useState<'generated' | 'curated' | undefined>()
  const [essenceCharId, setEssenceCharId] = useState<number | null>(null)
  const [essenceCharName, setEssenceCharName] = useState('')
  const [progressionCharId, setProgressionCharId] = useState<number | null>(null)
  const [progressionCharName, setProgressionCharName] = useState('')
  const [progressionCurrentPos, setProgressionCurrentPos] = useState<ProgressionInfo>({ book: 1, chapter: 1, scene: 1 })
  const [skillsCharId, setSkillsCharId] = useState<number | null>(null)
  const [skillsCharName, setSkillsCharName] = useState('')
  const [skillsClassName, setSkillsClassName] = useState('')
  const [showTimeline, setShowTimeline] = useState(false)

  /* ---------------------------------------------------------------- */
  /* Data fetching                                                     */
  /* ---------------------------------------------------------------- */

  const fetchDetail = useCallback(async () => {
    try {
      const meRes = await api.get('/api/admin/me')
      if (meRes.ok) {
        const meData = await meRes.json()
        setMe(meData)
      }

      const res = await api.get(`/api/admin/players/${id}`)
      if (!res.ok) throw new Error('Failed to load player detail')
      const data = await res.json()
      setPlayer(data.player)
      setCharacters(data.characters)
      setTickets(data.recent_tickets)
      setNewAlias(data.player.alias || '')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load player detail')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const fetchCharacterInventory = async (characterId: number) => {
    try {
      const res = await api.get(`/api/admin/characters/${characterId}/inventory`)
      if (res.ok) {
        const data = await res.json()
        setInventoryData(prev => ({ ...prev, [characterId]: data }))
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err)
    }
  }

  const fetchCharacterEssence = async (characterId: number) => {
    try {
      const res = await api.get(`/api/admin/characters/${characterId}/essence/history?page_size=1`)
      if (res.ok) {
        const data = await res.json()
        setEssenceData(prev => ({ ...prev, [characterId]: data.current_balance || 0 }))
      }
    } catch (err) {
      console.error('Failed to fetch essence:', err)
    }
  }

  useEffect(() => {
    characters.forEach(char => {
      fetchCharacterEssence(char.id)
    })
  }, [characters])

  const toggleInventory = (characterId: number) => {
    const isExpanded = expandedInventory[characterId]
    if (!isExpanded && !inventoryData[characterId]) {
      fetchCharacterInventory(characterId)
    }
    setExpandedInventory(prev => ({ ...prev, [characterId]: !isExpanded }))
  }

  /* ---------------------------------------------------------------- */
  /* Player actions                                                    */
  /* ---------------------------------------------------------------- */

  const handleBan = async () => {
    if (!banReason.trim()) return
    setActionLoading(true)
    try {
      const res = await api.post(`/api/admin/players/${id}/ban`, { reason: banReason })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to ban player')
      }
      setShowBanModal(false)
      setBanReason('')
      await fetchDetail()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to ban player')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnban = async () => {
    if (!confirm('Are you sure you want to unban this player?')) return
    setActionLoading(true)
    try {
      const res = await api.post(`/api/admin/players/${id}/unban`)
      if (!res.ok) throw new Error('Failed to unban player')
      await fetchDetail()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to unban player')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLogout = async () => {
    if (!confirm('Force logout will invalidate all current session tokens for this player. Continue?')) return
    setActionLoading(true)
    try {
      const res = await api.post(`/api/admin/players/${id}/logout`)
      if (!res.ok) throw new Error('Failed to force logout')
      alert('Player sessions invalidated.')
      await fetchDetail()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to force logout')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateAlias = async () => {
    setActionLoading(true)
    try {
      const res = await api.patch(`/api/admin/players/${id}`, { alias: newAlias || null })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to update alias')
      }
      setShowEditAlias(false)
      await fetchDetail()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update alias')
    } finally {
      setActionLoading(false)
    }
  }

  const togglePermission = async (field: 'is_system_admin' | 'is_game_admin', value: boolean) => {
    if (!me?.is_owner) return
    setActionLoading(true)
    try {
      const res = await api.patch(`/api/admin/players/${id}/permissions`, { [field]: value })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to update permissions')
      }
      await fetchDetail()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update permissions')
    } finally {
      setActionLoading(false)
    }
  }

  const handleModalSave = async () => {
    await fetchDetail()
    for (const charId of Object.keys(inventoryData)) {
      fetchCharacterInventory(Number(charId))
    }
    for (const char of characters) {
      fetchCharacterEssence(char.id)
    }
  }

  const openItemEditor = (itemId: number, characterId: number, isArtifact: boolean, artifactType?: 'generated' | 'curated') => {
    setEditItemId(itemId)
    setEditItemCharId(characterId)
    setEditItemIsArtifact(isArtifact)
    setEditItemArtifactType(artifactType)
  }

  const openProgressionEditor = (char: Character) => {
    setProgressionCharId(char.id)
    setProgressionCharName(char.character_name)
    setProgressionCurrentPos(progressionData[char.id] || { book: 1, chapter: 1, scene: 1 })
  }

  return {
    // Core data
    player,
    me,
    characters,
    tickets,
    loading,
    error,
    actionLoading,

    // Inventory
    inventoryData,
    expandedInventory,
    essenceData,
    progressionData,
    toggleInventory,

    // Ban modal
    showBanModal,
    setShowBanModal,
    banReason,
    setBanReason,
    handleBan,
    handleUnban,

    // Alias modal
    showEditAlias,
    setShowEditAlias,
    newAlias,
    setNewAlias,
    handleUpdateAlias,

    // Finance
    showFinance,
    setShowFinance,

    // Actions
    handleLogout,
    togglePermission,
    handleModalSave,

    // Character modals
    editCharId,
    setEditCharId,
    craftCharId,
    setCraftCharId,
    craftCharLevel,
    setCraftCharLevel,
    editItemId,
    editItemCharId,
    editItemIsArtifact,
    editItemArtifactType,
    openItemEditor,
    setEditItemId,
    setEditItemCharId,
    essenceCharId,
    setEssenceCharId,
    essenceCharName,
    setEssenceCharName,
    progressionCharId,
    setProgressionCharId,
    progressionCharName,
    progressionCurrentPos,
    openProgressionEditor,
    skillsCharId,
    setSkillsCharId,
    skillsCharName,
    setSkillsCharName,
    skillsClassName,
    setSkillsClassName,
    showTimeline,
    setShowTimeline,
  }
}
