import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../api'

interface PickerValue {
  bookId?: number
  chapterId?: number
  sceneId?: number
  beatId?: number
}

interface CascadingPickerProps {
  level: 'book' | 'chapter' | 'scene' | 'beat'
  value: PickerValue
  onChange: (value: PickerValue) => void
  optional?: boolean
}

interface SelectOption {
  id: number
  label: string
}

export default function CascadingPicker({ level, value, onChange, optional }: CascadingPickerProps) {
  const [books, setBooks] = useState<SelectOption[]>([])
  const [chapters, setChapters] = useState<SelectOption[]>([])
  const [scenes, setScenes] = useState<SelectOption[]>([])
  const [beats, setBeats] = useState<SelectOption[]>([])

  const fetchBooks = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/content/books')
      if (res.ok) {
        const data = await res.json()
        setBooks(data.map((b: any) => ({ id: b.id, label: `Book ${b.book_number}: ${b.title}` })))
      }
    } catch { /* ignore */ }
  }, [])

  const fetchChapters = useCallback(async (bookId: number) => {
    try {
      const res = await api.get(`/api/admin/content/chapters?book_id=${bookId}`)
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : data.items || []
        setChapters(items.map((c: any) => ({ id: c.id, label: `Ch ${c.chapter_number}: ${c.title}` })))
      }
    } catch { /* ignore */ }
  }, [])

  const fetchScenes = useCallback(async (chapterId: number) => {
    try {
      const res = await api.get(`/api/admin/content/scenes?chapter_id=${chapterId}`)
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : data.items || []
        setScenes(items.map((s: any) => ({ id: s.id, label: `Scene ${s.scene_number}: ${s.title || 'Untitled'}` })))
      }
    } catch { /* ignore */ }
  }, [])

  const fetchBeats = useCallback(async (sceneId: number) => {
    try {
      const res = await api.get(`/api/admin/content/beats?scene_id=${sceneId}`)
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : data.items || []
        setBeats(items.map((b: any) => ({ id: b.id, label: `Beat ${b.beat_number}: ${(b.summary || '').substring(0, 40)}` })))
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  useEffect(() => {
    if (value.bookId) fetchChapters(value.bookId)
    else setChapters([])
  }, [value.bookId, fetchChapters])

  useEffect(() => {
    if (value.chapterId && level !== 'chapter') fetchScenes(value.chapterId)
    else setScenes([])
  }, [value.chapterId, level, fetchScenes])

  useEffect(() => {
    if (value.sceneId && level === 'beat') fetchBeats(value.sceneId)
    else setBeats([])
  }, [value.sceneId, level, fetchBeats])

  const showChapter = level !== 'book'
  const showScene = level === 'scene' || level === 'beat'
  const showBeat = level === 'beat'

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <select
        className="form-select"
        value={value.bookId || ''}
        onChange={e => {
          const bookId = e.target.value ? Number(e.target.value) : undefined
          onChange({ bookId })
        }}
        style={{ minWidth: 180 }}
      >
        <option value="">{optional ? '-- Any Book --' : '-- Select Book --'}</option>
        {books.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
      </select>

      {showChapter && (
        <select
          className="form-select"
          value={value.chapterId || ''}
          onChange={e => {
            const chapterId = e.target.value ? Number(e.target.value) : undefined
            onChange({ bookId: value.bookId, chapterId })
          }}
          disabled={!value.bookId}
          style={{ minWidth: 200 }}
        >
          <option value="">{optional ? '-- Any Chapter --' : '-- Select Chapter --'}</option>
          {chapters.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      )}

      {showScene && (
        <select
          className="form-select"
          value={value.sceneId || ''}
          onChange={e => {
            const sceneId = e.target.value ? Number(e.target.value) : undefined
            onChange({ bookId: value.bookId, chapterId: value.chapterId, sceneId })
          }}
          disabled={!value.chapterId}
          style={{ minWidth: 220 }}
        >
          <option value="">{optional ? '-- Any Scene --' : '-- Select Scene --'}</option>
          {scenes.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      )}

      {showBeat && (
        <select
          className="form-select"
          value={value.beatId || ''}
          onChange={e => {
            const beatId = e.target.value ? Number(e.target.value) : undefined
            onChange({ ...value, beatId })
          }}
          disabled={!value.sceneId}
          style={{ minWidth: 240 }}
        >
          <option value="">{optional ? '-- Any Beat --' : '-- Select Beat --'}</option>
          {beats.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
        </select>
      )}
    </div>
  )
}
