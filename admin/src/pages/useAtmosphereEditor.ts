import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { useAudioPreview } from './atmosphereAudio'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface AtmosphereListItem {
  id: number
  name: string
  archetype: string | null
  description: string | null
  generator_bpm: number
  generator_key: string
  generator_scale: string
  generator_complexity: number
  scene_count: number
  chapter_count: number
  book_count: number
}

export interface AtmosphereDetail extends AtmosphereListItem {
  music_definitions: any
  generator_seed: number | null
  assigned_scene_ids: number[]
  assigned_chapters: { id: number; title: string }[]
  assigned_books: { id: number; title: string }[]
}

export const ARCHETYPES = [
  'mundane_dread', 'occult_sanctum', 'liminal_purgatory', 'body_horror_theatre',
  'ancient_sanctuary', 'cosmic_archive', 'tech_utopia', 'alien_frontier',
  'void_abyss', 'domestic_trauma', 'glitch_reality', 'conspiracy_bunker',
  'training_grounds',
]

export const MUSIC_STATES = ['explore', 'combat', 'boss', 'mystery'] as const

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function useAtmosphereEditor() {
  const [atmospheres, setAtmospheres] = useState<AtmosphereListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<AtmosphereDetail | null>(null)
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showBatch, setShowBatch] = useState(false)
  const [filterArchetype, setFilterArchetype] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editArchetype, setEditArchetype] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editBpm, setEditBpm] = useState(120)
  const [editKey, setEditKey] = useState('C')
  const [editScale, setEditScale] = useState('minor')
  const [editComplexity, setEditComplexity] = useState(5)
  const [editSeed, setEditSeed] = useState<number | ''>('')
  const [editMusicJson, setEditMusicJson] = useState<Record<string, string>>({
    explore: '', combat: '', boss: '', mystery: '',
  })

  const preview = useAudioPreview()

  /* ---------------------------------------------------------------- */
  /* Data fetching                                                     */
  /* ---------------------------------------------------------------- */

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/atmospheres')
      if (res.ok) setAtmospheres(await res.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { return () => preview.destroy() }, [preview.destroy])

  const fetchDetail = async (id: number) => {
    try {
      const res = await api.get(`/api/admin/atmospheres/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSelected(data)
        populateEditForm(data)
      }
    } catch {}
  }

  const populateEditForm = (data: AtmosphereDetail) => {
    setEditName(data.name)
    setEditArchetype(data.archetype || '')
    setEditDescription(data.description || '')
    setEditBpm(data.generator_bpm)
    setEditKey(data.generator_key)
    setEditScale(data.generator_scale)
    setEditComplexity(data.generator_complexity)
    setEditSeed(data.generator_seed ?? '')
    const defs = data.music_definitions || {}
    setEditMusicJson({
      explore: defs.explore ? JSON.stringify(defs.explore, null, 2) : '',
      combat: defs.combat ? JSON.stringify(defs.combat, null, 2) : '',
      boss: defs.boss ? JSON.stringify(defs.boss, null, 2) : '',
      mystery: defs.mystery ? JSON.stringify(defs.mystery, null, 2) : '',
    })
  }

  /* ---------------------------------------------------------------- */
  /* Build music definitions from JSON                                 */
  /* ---------------------------------------------------------------- */

  const buildMusicDefs = (): any | null => {
    const musicDefs: any = {}
    for (const state of MUSIC_STATES) {
      if (editMusicJson[state].trim()) {
        try { musicDefs[state] = JSON.parse(editMusicJson[state]) }
        catch { setMessage(`Invalid JSON in ${state}`); return null }
      }
    }
    return musicDefs
  }

  const buildBody = (musicDefs: any) => ({
    name: editName,
    archetype: editArchetype || null,
    description: editDescription || null,
    music_definitions: Object.keys(musicDefs).length > 0 ? musicDefs : null,
    generator_bpm: editBpm,
    generator_key: editKey,
    generator_scale: editScale,
    generator_complexity: editComplexity,
    generator_seed: editSeed === '' ? null : editSeed,
  })

  /* ---------------------------------------------------------------- */
  /* CRUD operations                                                   */
  /* ---------------------------------------------------------------- */

  const handleCreate = async () => {
    setSaving(true)
    setMessage('')
    const musicDefs = buildMusicDefs()
    if (musicDefs === null) { setSaving(false); return }

    try {
      const res = await api.post('/api/admin/atmospheres', buildBody(musicDefs))
      if (res.ok) {
        const data = await res.json()
        setMessage(`Created atmosphere #${data.id}`)
        setCreating(false)
        fetchList()
        fetchDetail(data.id)
        setEditing(false)
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
    const musicDefs = buildMusicDefs()
    if (musicDefs === null) { setSaving(false); return }

    try {
      const res = await api.put(`/api/admin/atmospheres/${selected.id}`, buildBody(musicDefs))
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

  const handleDelete = async () => {
    if (!selected) return
    if (!confirm(`Delete atmosphere "${selected.name}"?`)) return
    try {
      const res = await api.delete(`/api/admin/atmospheres/${selected.id}`)
      if (res.ok) {
        setSelected(null)
        setEditing(false)
        fetchList()
        setMessage('Deleted')
      } else {
        const err = await res.json()
        setMessage(`Error: ${err.detail}`)
      }
    } catch { setMessage('Network error') }
  }

  const handlePreview = (state: string) => {
    try {
      const json = editMusicJson[state]
      if (!json.trim()) return
      const parsed = JSON.parse(json)
      preview.play(parsed)
    } catch {
      setMessage(`Invalid JSON in ${state}`)
    }
  }

  /* ---------------------------------------------------------------- */
  /* UI helpers                                                        */
  /* ---------------------------------------------------------------- */

  const filtered = filterArchetype
    ? atmospheres.filter(a => a.archetype === filterArchetype)
    : atmospheres

  const startCreate = () => {
    setSelected(null)
    setEditing(false)
    setCreating(true)
    setEditName('')
    setEditArchetype('')
    setEditDescription('')
    setEditBpm(120)
    setEditKey('C')
    setEditScale('minor')
    setEditComplexity(5)
    setEditSeed('')
    setEditMusicJson({ explore: '', combat: '', boss: '', mystery: '' })
    setMessage('')
  }

  const selectAtmosphere = (id: number) => {
    fetchDetail(id)
    setCreating(false)
    setEditing(false)
    setMessage('')
  }

  const cancelEdit = () => {
    setEditing(false)
    if (selected) populateEditForm(selected)
  }

  return {
    // List
    atmospheres,
    filtered,
    loading,

    // Selection
    selected,
    editing,
    setEditing,
    creating,
    setCreating,
    selectAtmosphere,

    // Filters
    filterArchetype,
    setFilterArchetype,
    showBatch,
    setShowBatch,

    // Messages
    saving,
    message,

    // Form state
    editName,
    setEditName,
    editArchetype,
    setEditArchetype,
    editDescription,
    setEditDescription,
    editBpm,
    setEditBpm,
    editKey,
    setEditKey,
    editScale,
    setEditScale,
    editComplexity,
    setEditComplexity,
    editSeed,
    setEditSeed,
    editMusicJson,
    setEditMusicJson,

    // Actions
    startCreate,
    handleCreate,
    handleSave,
    handleDelete,
    handlePreview,
    cancelEdit,
    fetchList,

    // Audio
    preview,
  }
}
