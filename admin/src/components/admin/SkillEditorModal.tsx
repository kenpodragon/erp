import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import './SkillEditorModal.css'

/* -- Types ------------------------------------------------- */

interface Prerequisite {
  skill_id: number
  skill_name: string
  required_level: number
  current_level: number
  met: boolean
}

interface SkillEntry {
  skill_id: number
  skill_name: string
  category: string
  class_exclusive: boolean
  current_level: number | null
  current_xp: number | null
  has_skill_record: boolean
  prerequisites_met: boolean
  prerequisites: Prerequisite[]
}

interface SkillEdit {
  level: string
  xp: string
}

interface Props {
  characterId: number
  characterName: string
  className: string
  onClose: () => void
  onSave: () => void
}

/* -- Helpers ----------------------------------------------- */

/** Check if lowering a skill would break dependents */
function findDependentWarnings(
  skill: SkillEntry,
  newLevel: number,
  allSkills: SkillEntry[],
): string[] {
  const warnings: string[] = []
  for (const other of allSkills) {
    for (const prereq of other.prerequisites) {
      if (
        prereq.skill_id === skill.skill_id &&
        prereq.met &&
        newLevel < prereq.required_level
      ) {
        warnings.push(
          `${other.skill_name} requires ${skill.skill_name} Lv${prereq.required_level}`,
        )
      }
    }
  }
  return warnings
}

/* -- Component -------------------------------------------- */

export default function SkillEditorModal({
  characterId,
  characterName,
  className,
  onClose,
  onSave,
}: Props) {
  const [skills, setSkills] = useState<SkillEntry[]>([])
  const [edits, setEdits] = useState<Record<number, SkillEdit>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetStep, setResetStep] = useState(0) // 0=hidden, 1=first, 2=confirmed

  /* -- Fetch skills -------------------------------------- */

  const fetchSkills = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await api.get(`/api/admin/characters/${characterId}/skills`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Failed to load skills')
      }

      const data = await res.json()
      const skillList: SkillEntry[] = data.skills ?? data ?? []
      setSkills(skillList)

      // Initialize edits from current values
      const initial: Record<number, SkillEdit> = {}
      for (const s of skillList) {
        initial[s.skill_id] = {
          level: s.current_level != null ? String(s.current_level) : '',
          xp: s.current_xp != null ? String(s.current_xp) : '',
        }
      }
      setEdits(initial)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills')
    } finally {
      setLoading(false)
    }
  }, [characterId])

  useEffect(() => {
    fetchSkills()
  }, [fetchSkills])

  /* -- Keyboard: Escape ---------------------------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  /* -- Edit handlers ------------------------------------- */

  const updateEdit = (skillId: number, field: 'level' | 'xp', value: string) => {
    setEdits(prev => ({
      ...prev,
      [skillId]: { ...prev[skillId], [field]: value },
    }))
  }

  /* -- Compute changed skills ---------------------------- */

  const getChangedUpdates = () => {
    const updates: Array<{ skill_id: number; level: number; xp: number }> = []

    for (const skill of skills) {
      const edit = edits[skill.skill_id]
      if (!edit) continue

      const newLevel = edit.level !== '' ? parseInt(edit.level, 10) : null
      const newXp = edit.xp !== '' ? parseFloat(edit.xp) : null

      const origLevel = skill.current_level
      const origXp = skill.current_xp

      if (newLevel !== origLevel || newXp !== origXp) {
        updates.push({
          skill_id: skill.skill_id,
          level: newLevel ?? 0,
          xp: newXp ?? 0,
        })
      }
    }
    return updates
  }

  /* -- Save ---------------------------------------------- */

  const handleSave = async () => {
    const updates = getChangedUpdates()
    if (updates.length === 0) {
      onSave()
      return
    }

    setSaving(true)
    setSaveError(null)
    setSuccessMsg(null)

    try {
      const res = await api.patch(`/api/admin/characters/${characterId}/skills`, {
        updates,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Failed to save skill changes')
      }

      setSuccessMsg(`Updated ${updates.length} skill${updates.length > 1 ? 's' : ''} successfully.`)
      setTimeout(() => {
        onSave()
      }, 1200)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  /* -- Reset all to level 1 ------------------------------ */

  const handleResetClick = () => {
    setShowResetConfirm(true)
    setResetStep(1)
  }

  const handleResetConfirm = () => {
    if (resetStep === 1) {
      setResetStep(2)
      return
    }

    // Step 2 — actually apply the reset
    const resetEdits: Record<number, SkillEdit> = {}
    for (const s of skills) {
      resetEdits[s.skill_id] = { level: '1', xp: '0' }
    }
    setEdits(resetEdits)
    setShowResetConfirm(false)
    setResetStep(0)
  }

  const handleResetCancel = () => {
    setShowResetConfirm(false)
    setResetStep(0)
  }

  /* -- Group skills by category -------------------------- */

  const categories = Array.from(new Set(skills.map(s => s.category)))

  const hasChanges = getChangedUpdates().length > 0

  /* -- Render -------------------------------------------- */

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="sem-modal" onClick={e => e.stopPropagation()}>
        {/* Title bar */}
        <div className="sem-title-bar">
          <h3>
            Edit Skills &mdash; &ldquo;{characterName}&rdquo; ({className})
          </h3>
          <button className="sem-close-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="sem-body">
          {loading && <div className="sem-loading">Loading skills...</div>}
          {error && <div className="sem-error">{error}</div>}

          {!loading && !error && skills.length === 0 && (
            <div className="sem-empty">No skills found for this character.</div>
          )}

          {!loading && !error && skills.length > 0 && (
            <>
              {/* Skill table */}
              <div className="sem-table-wrap">
                <table className="sem-table">
                  <thead>
                    <tr>
                      <th className="sem-th-name">Skill Name</th>
                      <th className="sem-th-cat">Cat</th>
                      <th className="sem-th-num">Level</th>
                      <th className="sem-th-num">New</th>
                      <th className="sem-th-num">XP</th>
                      <th className="sem-th-num">New XP</th>
                      <th className="sem-th-status">Prereq</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(cat =>
                      skills
                        .filter(s => s.category === cat)
                        .map(skill => {
                          const edit = edits[skill.skill_id] ?? { level: '', xp: '' }
                          const parsedNewLevel = edit.level !== '' ? parseInt(edit.level, 10) : 0
                          const dependentWarnings =
                            skill.current_level != null && parsedNewLevel < skill.current_level
                              ? findDependentWarnings(skill, parsedNewLevel, skills)
                              : []
                          const isLocked = !skill.prerequisites_met
                          const hasWarning = dependentWarnings.length > 0
                          const isExclusive = skill.class_exclusive

                          return (
                            <tr
                              key={skill.skill_id}
                              className={[
                                'sem-row',
                                isLocked ? 'sem-row-locked' : '',
                                hasWarning ? 'sem-row-warning' : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                            >
                              {/* Skill name */}
                              <td className="sem-td-name">
                                <span className="sem-skill-icon">
                                  {isLocked ? '\uD83D\uDD12' : '\u2705'}
                                </span>
                                <span className="sem-skill-label">
                                  {skill.skill_name}
                                  {isExclusive && (
                                    <span className="sem-exclusive" title="Class exclusive">
                                      {' \u2605'}
                                    </span>
                                  )}
                                </span>
                                {/* Unmet prerequisite details */}
                                {isLocked && skill.prerequisites.length > 0 && (
                                  <div className="sem-prereq-detail">
                                    {skill.prerequisites
                                      .filter(p => !p.met)
                                      .map(p => (
                                        <span key={p.skill_id} className="sem-prereq-line">
                                          Needs: {p.skill_name} Lv{p.required_level} (current:{' '}
                                          {p.current_level})
                                        </span>
                                      ))}
                                  </div>
                                )}
                                {/* Dependent warning */}
                                {hasWarning && (
                                  <div className="sem-dep-warning">
                                    {dependentWarnings.map((w, i) => (
                                      <span key={i} className="sem-dep-warning-line">
                                        {w}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>

                              {/* Category */}
                              <td className="sem-td-cat">{skill.category}</td>

                              {/* Current level */}
                              <td className="sem-td-num">
                                {skill.current_level != null ? skill.current_level : '\u2014'}
                              </td>

                              {/* New level input */}
                              <td className="sem-td-num">
                                <input
                                  type="number"
                                  className="sem-input"
                                  min={0}
                                  value={edit.level}
                                  onChange={e =>
                                    updateEdit(skill.skill_id, 'level', e.target.value)
                                  }
                                  disabled={isLocked}
                                  title={isLocked ? 'Prerequisites not met' : ''}
                                />
                              </td>

                              {/* Current XP */}
                              <td className="sem-td-num">
                                {skill.current_xp != null
                                  ? Number(skill.current_xp).toFixed(1)
                                  : '\u2014'}
                              </td>

                              {/* New XP input */}
                              <td className="sem-td-num">
                                <input
                                  type="number"
                                  className="sem-input"
                                  min={0}
                                  step="0.1"
                                  value={edit.xp}
                                  onChange={e =>
                                    updateEdit(skill.skill_id, 'xp', e.target.value)
                                  }
                                  disabled={isLocked}
                                  title={isLocked ? 'Prerequisites not met' : ''}
                                />
                              </td>

                              {/* Prereq status */}
                              <td className="sem-td-status">
                                {skill.prerequisites_met ? (
                                  <span className="sem-prereq-met" title="All prerequisites met">
                                    {'\u2713'}
                                  </span>
                                ) : (
                                  <span
                                    className="sem-prereq-unmet"
                                    title="Prerequisites not met"
                                  >
                                    {'\u2717'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        }),
                    )}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="sem-legend">
                <span className="sem-legend-item">
                  <span className="sem-exclusive">{'\u2605'}</span> = class exclusive
                </span>
              </div>

              {/* Reset button */}
              <div className="sem-reset-row">
                <button
                  className="sem-btn-reset"
                  onClick={handleResetClick}
                  disabled={saving}
                >
                  Reset All to Level 1
                </button>
              </div>

              {/* Messages */}
              {saveError && <div className="sem-error">{saveError}</div>}
              {successMsg && <div className="sem-success">{successMsg}</div>}
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="sem-actions">
          <button className="btn-cancel" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn-confirm-save"
            onClick={handleSave}
            disabled={saving || loading || !!error || !hasChanges}
          >
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>

        {/* Reset confirmation sub-dialog (double-confirm) */}
        {showResetConfirm && (
          <div className="sem-confirm-overlay">
            <div className="sem-confirm-dialog">
              <h4>
                {resetStep === 1
                  ? 'Reset All Skills?'
                  : 'Are you absolutely sure?'}
              </h4>
              <p>
                {resetStep === 1
                  ? `This will set ALL skill levels to 1 and XP to 0 for "${characterName}".`
                  : 'This action will overwrite all skill levels in the form. You still need to click "Save All Changes" to apply.'}
              </p>
              <div className="sem-confirm-actions">
                <button className="btn-cancel" onClick={handleResetCancel}>
                  Cancel
                </button>
                <button className="sem-btn-danger" onClick={handleResetConfirm}>
                  {resetStep === 1 ? 'Yes, Reset' : 'Confirm Reset'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
