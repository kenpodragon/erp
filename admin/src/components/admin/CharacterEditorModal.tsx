import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import StatBreakdownPanel, { type StatBreakdown } from './StatBreakdownPanel'
import './CharacterEditorModal.css'

/* ── Types ───────────────────────────────────────────────── */

interface CharacterClass {
  id: number
  name: string
}

interface CharacterData {
  id: number
  character_name: string
  level: number
  xp: number
  class_id: number
  class_name: string
}

interface Props {
  characterId: number
  onClose: () => void
  onSave: () => void
}

/* ── Component ───────────────────────────────────────────── */

export default function CharacterEditorModal({ characterId, onClose, onSave }: Props) {
  // Data state
  const [character, setCharacter] = useState<CharacterData | null>(null)
  const [classes, setClasses] = useState<CharacterClass[]>([])
  const [statBreakdown, setStatBreakdown] = useState<StatBreakdown | null>(null)
  const [equipmentWarnings, setEquipmentWarnings] = useState<string[]>([])

  // Form state
  const [name, setName] = useState('')
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const [classId, setClassId] = useState<number>(0)

  // UI state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showClassConfirm, setShowClassConfirm] = useState(false)
  const [pendingClassId, setPendingClassId] = useState<number | null>(null)

  /* ── Fetch character data ─────────────────────────────── */

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [statsRes, classesRes] = await Promise.all([
        api.get(`/api/admin/characters/${characterId}/stats`),
        api.get(`/api/admin/characters/classes`),
      ])

      if (!statsRes.ok) throw new Error('Failed to load character stats')
      if (!classesRes.ok) throw new Error('Failed to load class list')

      const statsData = await statsRes.json()
      const classesData = await classesRes.json()

      // Populate character fields from stats response
      const charInfo: CharacterData = {
        id: statsData.character_id ?? characterId,
        character_name: statsData.character_name ?? '',
        level: statsData.level ?? 1,
        xp: statsData.xp ?? 0,
        class_id: statsData.class_id ?? 0,
        class_name: statsData.class_name ?? '',
      }

      setCharacter(charInfo)
      setName(charInfo.character_name)
      setLevel(charInfo.level)
      setXp(charInfo.xp)
      setClassId(charInfo.class_id)
      setClasses(classesData.classes ?? classesData ?? [])
      setStatBreakdown(statsData)
      setEquipmentWarnings(statsData.equipment_warnings ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load character data')
    } finally {
      setLoading(false)
    }
  }, [characterId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ── Class change handling ────────────────────────────── */

  const handleClassChange = (newClassId: number) => {
    if (character && newClassId !== character.class_id) {
      setPendingClassId(newClassId)
      setShowClassConfirm(true)
    } else {
      setClassId(newClassId)
    }
  }

  const confirmClassChange = () => {
    if (pendingClassId !== null) {
      setClassId(pendingClassId)
    }
    setPendingClassId(null)
    setShowClassConfirm(false)
  }

  const cancelClassChange = () => {
    setPendingClassId(null)
    setShowClassConfirm(false)
  }

  /* ── Save ─────────────────────────────────────────────── */

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const payload: Record<string, unknown> = {}

      if (name !== character?.character_name) payload.character_name = name
      if (level !== character?.level) payload.level = level
      if (xp !== character?.xp) payload.xp = xp
      if (classId !== character?.class_id) payload.class_id = classId

      if (Object.keys(payload).length === 0) {
        onSave()
        return
      }

      const res = await api.patch(`/api/admin/characters/${characterId}`, payload)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Failed to save character')
      }

      onSave()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save character')
    } finally {
      setSaving(false)
    }
  }

  /* ── Keyboard: close on Escape ────────────────────────── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  /* ── Render ───────────────────────────────────────────── */

  const pendingClassName = pendingClassId
    ? classes.find(c => c.id === pendingClassId)?.name ?? 'Unknown'
    : ''

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="cem-modal" onClick={e => e.stopPropagation()}>
        {/* Title bar */}
        <div className="cem-title-bar">
          <h3>Edit Character {character ? `- ${character.character_name}` : ''}</h3>
          <button className="cem-close-btn" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        {/* Body */}
        <div className="cem-body">
          {loading && <div className="cem-loading">Loading character data...</div>}
          {error && <div className="cem-error">{error}</div>}

          {!loading && !error && character && (
            <>
              {/* Form fields */}
              <div className="cem-form">
                <div className="cem-field">
                  <label htmlFor="cem-name">Character Name</label>
                  <input
                    id="cem-name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    maxLength={32}
                  />
                </div>

                <div className="cem-field-row">
                  <div className="cem-field">
                    <label htmlFor="cem-level">Level</label>
                    <input
                      id="cem-level"
                      type="number"
                      min={1}
                      value={level}
                      onChange={e => setLevel(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>
                  <div className="cem-field">
                    <label htmlFor="cem-xp">XP</label>
                    <input
                      id="cem-xp"
                      type="number"
                      min={0}
                      value={xp}
                      onChange={e => setXp(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                </div>

                <div className="cem-field">
                  <label htmlFor="cem-class">Class</label>
                  <select
                    id="cem-class"
                    value={classId}
                    onChange={e => handleClassChange(Number(e.target.value))}
                  >
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                  {classId !== character.class_id && (
                    <p className="cem-class-warning">
                      Class change will remap skills to the new class equivalent where possible.
                      Skills without a mapping will be reset.
                    </p>
                  )}
                </div>
              </div>

              {/* Equipment warnings */}
              {equipmentWarnings.length > 0 && (
                <div className="cem-warnings">
                  <h4>Equipment Warnings</h4>
                  <ul>
                    {equipmentWarnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Stat breakdown (read-only) */}
              <div className="cem-stats-section">
                <StatBreakdownPanel statBreakdown={statBreakdown} />
              </div>

              {/* Save error */}
              {saveError && <div className="cem-error">{saveError}</div>}
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="cem-actions">
          <button className="btn-cancel" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn-confirm-save"
            onClick={handleSave}
            disabled={saving || loading || !!error || !name.trim()}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Class change confirmation sub-dialog */}
        {showClassConfirm && (
          <div className="cem-confirm-overlay">
            <div className="cem-confirm-dialog">
              <h4>Confirm Class Change</h4>
              <p>
                Changing class from <strong>{character?.class_name}</strong> to{' '}
                <strong>{pendingClassName}</strong> will:
              </p>
              <ul>
                <li>Remap existing skills to the new class equivalent where possible</li>
                <li>Reset skills that have no mapping to the target class</li>
                <li>Recalculate all stats based on the new class base values</li>
              </ul>
              <p className="cem-confirm-note">
                This cannot be undone automatically. Proceed?
              </p>
              <div className="cem-confirm-actions">
                <button className="btn-cancel" onClick={cancelClassChange}>Cancel</button>
                <button className="btn-confirm-save" onClick={confirmClassChange}>
                  Confirm Change
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
