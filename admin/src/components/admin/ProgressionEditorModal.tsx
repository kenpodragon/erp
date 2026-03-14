import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import './ProgressionEditorModal.css'

/* ── Type definitions ────────────────────────────────────── */

interface ProgressionEditorModalProps {
  characterId: number
  characterName: string
  currentPosition: { book: number; chapter: number; scene: number }
  onClose: () => void
  onSave: () => void
}

interface Scene {
  id: number
  sort_order: number
  title: string
  scene_type: string
}

interface Chapter {
  id: number
  chapter_number: number
  title: string
  scenes: Scene[]
}

interface Book {
  id: number
  book_number: number
  title: string
  chapters: Chapter[]
}

interface BossCompletion {
  scene_id: number
  scene_title: string
  chapter_title: string
  completed_at: string
}

type Direction = 'advancing' | 'rewinding' | 'same'

/* ── Helpers ─────────────────────────────────────────────── */

function compareTuples(
  a: { book: number; chapter: number; scene: number },
  b: { book: number; chapter: number; scene: number }
): Direction {
  if (a.book !== b.book) return a.book > b.book ? 'advancing' : 'rewinding'
  if (a.chapter !== b.chapter) return a.chapter > b.chapter ? 'advancing' : 'rewinding'
  if (a.scene !== b.scene) return a.scene > b.scene ? 'advancing' : 'rewinding'
  return 'same'
}

function countScenesBetween(
  books: Book[],
  from: { book: number; chapter: number; scene: number },
  to: { book: number; chapter: number; scene: number }
): { scenes: number; bosses: number } {
  let scenes = 0
  let bosses = 0

  for (const book of books) {
    for (const chapter of book.chapters) {
      for (const scene of chapter.scenes) {
        const pos = { book: book.book_number, chapter: chapter.chapter_number, scene: scene.sort_order }
        const afterFrom = compareTuples(pos, from) === 'advancing'
        const beforeOrAtTo = compareTuples(pos, to) !== 'advancing'

        if (afterFrom && beforeOrAtTo) {
          if (scene.scene_type === 'chapter_boss' || scene.scene_type === 'book_boss') {
            bosses++
          } else {
            scenes++
          }
        }
      }
    }
  }

  return { scenes, bosses }
}

/* ── Component ───────────────────────────────────────────── */

export default function ProgressionEditorModal({
  characterId,
  characterName,
  currentPosition,
  onClose,
  onSave,
}: ProgressionEditorModalProps) {
  // Content tree state
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Selected position
  const [selectedBook, setSelectedBook] = useState<number>(currentPosition.book)
  const [selectedChapter, setSelectedChapter] = useState<number>(currentPosition.chapter)
  const [selectedScene, setSelectedScene] = useState<number>(currentPosition.scene)

  // Boss completions
  const [bossCompletions, setBossCompletions] = useState<BossCompletion[]>([])
  const [selectedBossIds, setSelectedBossIds] = useState<Set<number>>(new Set())

  // Action state
  const [saving, setSaving] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'progression' | 'boss-reset' | null>(null)

  /* ── Data fetching ───────────────────────────────────── */

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [treeRes, bossRes] = await Promise.all([
        api.get('/api/admin/content-tree'),
        api.get(`/api/admin/characters/${characterId}/boss-completions`),
      ])

      if (!treeRes.ok) throw new Error('Failed to load content tree')
      if (!bossRes.ok) throw new Error('Failed to load boss completions')

      const treeData = await treeRes.json()
      const bossData = await bossRes.json()

      setBooks(treeData.books || treeData)
      setBossCompletions(bossData.completions || bossData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [characterId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ── Derived state ──────────────────────────────────── */

  const currentBook = books.find(b => b.book_number === selectedBook)
  const chapters = currentBook?.chapters || []
  const currentChapter = chapters.find(c => c.chapter_number === selectedChapter)
  const scenes = currentChapter?.scenes || []

  const targetPosition = { book: selectedBook, chapter: selectedChapter, scene: selectedScene }
  const direction = compareTuples(targetPosition, currentPosition)

  const diff = direction !== 'same'
    ? countScenesBetween(
        books,
        direction === 'advancing' ? currentPosition : targetPosition,
        direction === 'advancing' ? targetPosition : currentPosition
      )
    : { scenes: 0, bosses: 0 }

  /* ── Cascade handlers ───────────────────────────────── */

  const handleBookChange = (bookNum: number) => {
    setSelectedBook(bookNum)
    const book = books.find(b => b.book_number === bookNum)
    if (book && book.chapters.length > 0) {
      const firstChapter = book.chapters[0]
      setSelectedChapter(firstChapter.chapter_number)
      if (firstChapter.scenes.length > 0) {
        setSelectedScene(firstChapter.scenes[0].sort_order)
      }
    }
  }

  const handleChapterChange = (chapterNum: number) => {
    setSelectedChapter(chapterNum)
    const chapter = chapters.find(c => c.chapter_number === chapterNum)
    if (chapter && chapter.scenes.length > 0) {
      setSelectedScene(chapter.scenes[0].sort_order)
    }
  }

  /* ── Boss checkbox handlers ─────────────────────────── */

  const toggleBoss = (sceneId: number) => {
    setSelectedBossIds(prev => {
      const next = new Set(prev)
      if (next.has(sceneId)) {
        next.delete(sceneId)
      } else {
        next.add(sceneId)
      }
      return next
    })
  }

  /* ── Submit handlers ────────────────────────────────── */

  const handleApplyProgression = async () => {
    setSaving(true)
    try {
      const res = await api.patch(`/api/admin/characters/${characterId}/progression`, {
        book_number: selectedBook,
        chapter_number: selectedChapter,
        scene_number: selectedScene,
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to update progression')
      }
      setConfirmAction(null)
      onSave()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update progression')
    } finally {
      setSaving(false)
    }
  }

  const handleResetBosses = async () => {
    setSaving(true)
    try {
      const res = await api.post(`/api/admin/characters/${characterId}/boss-completions/reset`, {
        scene_ids: Array.from(selectedBossIds),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to reset boss completions')
      }
      setConfirmAction(null)
      setSelectedBossIds(new Set())
      onSave()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reset boss completions')
    } finally {
      setSaving(false)
    }
  }

  /* ── Direction description ──────────────────────────── */

  function getDirectionDescription(): string {
    if (direction === 'same') return 'No change from current position.'
    if (direction === 'advancing') {
      const parts: string[] = []
      if (diff.scenes > 0) parts.push(`${diff.scenes} scene${diff.scenes !== 1 ? 's' : ''}`)
      if (diff.bosses > 0) parts.push(`${diff.bosses} boss clear${diff.bosses !== 1 ? 's' : ''}`)
      return `Will backfill ${parts.join(' and ')}.`
    }
    const parts: string[] = []
    if (diff.scenes > 0) parts.push(`${diff.scenes} scene${diff.scenes !== 1 ? 's' : ''}`)
    if (diff.bosses > 0) parts.push(`${diff.bosses} boss clear${diff.bosses !== 1 ? 's' : ''}`)
    return `Will revert ${parts.join(' and ')}.`
  }

  /* ── Render ─────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="pem-modal" onClick={e => e.stopPropagation()}>
          <div className="pem-loading">Loading progression data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="pem-modal" onClick={e => e.stopPropagation()}>
          <div className="pem-error">Error: {error}</div>
          <div className="pem-actions">
            <button className="btn-cancel" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="pem-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="pem-header">
          <h3>Edit Progression &mdash; &ldquo;{characterName}&rdquo;</h3>
        </div>

        {/* Current Position */}
        <div className="pem-current-position">
          <span className="pem-label">Current Position:</span>
          <span className="pem-breadcrumb">
            Book {currentPosition.book} &rsaquo; Chapter {currentPosition.chapter} &rsaquo; Scene {currentPosition.scene}
          </span>
        </div>

        {/* Set New Position */}
        <div className="pem-section">
          <h4 className="pem-section-title">Set New Position</h4>

          <div className="pem-field">
            <label htmlFor="pem-book">Book:</label>
            <select
              id="pem-book"
              value={selectedBook}
              onChange={e => handleBookChange(Number(e.target.value))}
            >
              {books.map(book => (
                <option key={book.id} value={book.book_number}>
                  Book {book.book_number}: {book.title}
                </option>
              ))}
            </select>
          </div>

          <div className="pem-field">
            <label htmlFor="pem-chapter">Chapter:</label>
            <select
              id="pem-chapter"
              value={selectedChapter}
              onChange={e => handleChapterChange(Number(e.target.value))}
            >
              {chapters.map(chapter => (
                <option key={chapter.id} value={chapter.chapter_number}>
                  Chapter {chapter.chapter_number}: {chapter.title}
                </option>
              ))}
            </select>
          </div>

          <div className="pem-field">
            <label htmlFor="pem-scene">Scene:</label>
            <select
              id="pem-scene"
              value={selectedScene}
              onChange={e => setSelectedScene(Number(e.target.value))}
            >
              {scenes.map(scene => (
                <option key={scene.id} value={scene.sort_order}>
                  Scene {scene.sort_order}: {scene.title}
                </option>
              ))}
            </select>
          </div>

          {/* Direction Indicator */}
          <div className={`pem-direction pem-direction-${direction}`}>
            <span className="pem-direction-icon">
              {direction === 'advancing' ? '\u25B6' : direction === 'rewinding' ? '\u25C0' : '\u25CF'}
            </span>
            <span className="pem-direction-label">
              {direction === 'advancing' ? 'Advancing' : direction === 'rewinding' ? 'Rewinding' : 'No Change'}:
            </span>
            <span className="pem-direction-desc">{getDirectionDescription()}</span>
          </div>
        </div>

        {/* Boss Completions */}
        <div className="pem-section">
          <h4 className="pem-section-title">Boss Completions</h4>

          {bossCompletions.length === 0 ? (
            <p className="pem-empty">No boss completions recorded.</p>
          ) : (
            <div className="pem-boss-list">
              {bossCompletions.map(boss => (
                <label key={boss.scene_id} className="pem-boss-item">
                  <input
                    type="checkbox"
                    checked={selectedBossIds.has(boss.scene_id)}
                    onChange={() => toggleBoss(boss.scene_id)}
                  />
                  <span className="pem-boss-info">
                    <span className="pem-boss-chapter">{boss.chapter_title}</span>
                    <span className="pem-boss-name">&ldquo;{boss.scene_title}&rdquo;</span>
                  </span>
                  <span className="pem-boss-date">
                    {new Date(boss.completed_at).toLocaleDateString()}
                  </span>
                </label>
              ))}
            </div>
          )}

          {selectedBossIds.size > 0 && (
            <button
              className="btn-reset-bosses"
              onClick={() => setConfirmAction('boss-reset')}
              disabled={saving}
            >
              Reset Selected Bosses ({selectedBossIds.size})
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="pem-actions">
          <button className="btn-cancel" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn-confirm-save"
            onClick={() => setConfirmAction('progression')}
            disabled={saving || direction === 'same'}
          >
            Apply Changes
          </button>
        </div>

        {/* Confirmation Dialog — Progression */}
        {confirmAction === 'progression' && (
          <div className="pem-confirm-overlay" onClick={() => setConfirmAction(null)}>
            <div className="pem-confirm-dialog" onClick={e => e.stopPropagation()}>
              <h4>Confirm Progression Change</h4>
              <p>
                {direction === 'advancing' ? 'Advance' : 'Rewind'} &ldquo;{characterName}&rdquo; to
                Book {selectedBook}, Chapter {selectedChapter}, Scene {selectedScene}?
              </p>
              <p className="pem-confirm-detail">{getDirectionDescription()}</p>
              <div className="pem-confirm-actions">
                <button className="btn-cancel" onClick={() => setConfirmAction(null)} disabled={saving}>
                  Cancel
                </button>
                <button
                  className={`btn-confirm-${direction === 'rewinding' ? 'danger' : 'save'}`}
                  onClick={handleApplyProgression}
                  disabled={saving}
                >
                  {saving ? 'Applying...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Dialog — Boss Reset */}
        {confirmAction === 'boss-reset' && (
          <div className="pem-confirm-overlay" onClick={() => setConfirmAction(null)}>
            <div className="pem-confirm-dialog" onClick={e => e.stopPropagation()}>
              <h4>Confirm Boss Reset</h4>
              <p>
                Reset {selectedBossIds.size} boss completion{selectedBossIds.size !== 1 ? 's' : ''} for
                &ldquo;{characterName}&rdquo;?
              </p>
              <p className="pem-confirm-detail">
                This will remove the completion records. The player will need to defeat these bosses again.
              </p>
              <div className="pem-confirm-actions">
                <button className="btn-cancel" onClick={() => setConfirmAction(null)} disabled={saving}>
                  Cancel
                </button>
                <button
                  className="btn-confirm-danger"
                  onClick={handleResetBosses}
                  disabled={saving}
                >
                  {saving ? 'Resetting...' : 'Reset Bosses'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
