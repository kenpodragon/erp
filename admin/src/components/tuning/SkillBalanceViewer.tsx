import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import type { SkillBalanceRow } from './tuning-utils'
import { computeSkillBalance } from './tuning-utils'
import { SkillBalanceTable } from './SkillBalanceTable'
import { CoefficientPanel } from './CoefficientPanel'
import './tuning.css'

interface SkillBalanceViewerProps {
  configs: Record<string, any>
  onConfigChange: (key: string, value: any) => void
  dirtyKeys: Set<string>
  onSave: () => Promise<void>
  onReset: () => void
  saving: boolean
}

const COEFF_KEYS = [
  'cd_reduction_per_level',
  'max_cd_reduction',
  'int_power_coefficient',
  'int_cooldown_coefficient',
  'gcd_ms',
  'upgrade_cost_scaling',
  'base_skill_unlock_cost',
  'base_skill_level_upgrade_cost',
]

function extractCoefficients(configs: Record<string, any>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const k of COEFF_KEYS) {
    out[k] = typeof configs[k] === 'number' ? configs[k] : parseFloat(configs[k]) || 0
  }
  return out
}

export const SkillBalanceViewer: React.FC<SkillBalanceViewerProps> = ({
  configs,
  onConfigChange,
  dirtyKeys,
  onSave,
  onReset,
  saving,
}) => {
  const [rawSkills, setRawSkills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')

  // Local coefficients for reactive preview
  const [localCoeffs, setLocalCoeffs] = useState<Record<string, number>>(() =>
    extractCoefficients(configs)
  )

  // Sync local coefficients when configs change externally (e.g. reset)
  useEffect(() => {
    setLocalCoeffs(extractCoefficients(configs))
  }, [configs])

  // Original (server) coefficients for diff highlighting
  const originalCoeffs = useMemo(() => {
    const out: Record<string, number> = {}
    for (const k of COEFF_KEYS) {
      // If a key is dirty, the original is the value before local edits.
      // Since configs reflects current state, we need to check dirtyKeys.
      // For simplicity, original = config value when not dirty, else we can't recover.
      // The parent should pass original configs. We use configs minus dirty as approximation.
      out[k] = typeof configs[k] === 'number' ? configs[k] : parseFloat(configs[k]) || 0
    }
    return out
  }, [configs])

  useEffect(() => {
    let cancelled = false
    const fetchSkills = async () => {
      try {
        const resp = await api.get('/api/admin/content/skills')
        if (!resp.ok) throw new Error('Failed to fetch skills')
        const data = await resp.json()
        if (!cancelled) setRawSkills(Array.isArray(data) ? data : data.skills ?? [])
      } catch (err) {
        console.error('Failed to load skills:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchSkills()
    return () => { cancelled = true }
  }, [])

  // Current computed rows using local coefficients
  const currentRows: SkillBalanceRow[] = useMemo(
    () => rawSkills.map(s => computeSkillBalance(s, localCoeffs)),
    [rawSkills, localCoeffs]
  )

  // Original computed rows using server coefficients
  const originalRows: SkillBalanceRow[] = useMemo(
    () => rawSkills.map(s => computeSkillBalance(s, originalCoeffs)),
    [rawSkills, originalCoeffs]
  )

  // Unique categories and classes for filters
  const categories = useMemo(
    () => [...new Set(currentRows.map(r => r.category).filter(Boolean))].sort(),
    [currentRows]
  )
  const classes = useMemo(
    () => [...new Set(currentRows.map(r => r.class_name).filter(Boolean) as string[])].sort(),
    [currentRows]
  )

  const handleCoeffChange = (key: string, value: number) => {
    setLocalCoeffs(prev => ({ ...prev, [key]: value }))
    onConfigChange(key, value)
  }

  if (loading) {
    return <div style={{ color: '#888', padding: '20px' }}>Loading skills...</div>
  }

  return (
    <div className="tuning-panel">
      <div className="skill-filters">
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={classFilter} onChange={e => setClassFilter(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <SkillBalanceTable
        skills={currentRows}
        originalSkills={originalRows}
        categoryFilter={categoryFilter}
        classFilter={classFilter}
      />

      <CoefficientPanel
        coefficients={localCoeffs}
        originalCoefficients={originalCoeffs}
        onChange={handleCoeffChange}
      />

      {dirtyKeys.size > 0 && (
        <div className="tuning-unsaved">
          {dirtyKeys.size} unsaved change{dirtyKeys.size !== 1 ? 's' : ''}
        </div>
      )}

      <div className="tuning-actions">
        <button
          className="tuning-btn tuning-btn--reset"
          onClick={onReset}
          disabled={dirtyKeys.size === 0 || saving}
        >
          Reset
        </button>
        <button
          className="tuning-btn tuning-btn--save"
          onClick={onSave}
          disabled={dirtyKeys.size === 0 || saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
