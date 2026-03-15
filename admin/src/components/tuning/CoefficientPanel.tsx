import React from 'react'

interface CoefficientPanelProps {
  coefficients: Record<string, number>
  originalCoefficients: Record<string, number>
  onChange: (key: string, value: number) => void
}

const COEFFICIENT_DEFS: { key: string; hint: string }[] = [
  { key: 'cd_reduction_per_level', hint: '-X% cooldown per level' },
  { key: 'max_cd_reduction', hint: 'Max X% reduction' },
  { key: 'int_power_coefficient', hint: '+X% skill power per INT' },
  { key: 'int_cooldown_coefficient', hint: '-X% cooldown per INT' },
  { key: 'gcd_ms', hint: 'Global cooldown (ms)' },
  { key: 'upgrade_cost_scaling', hint: 'Cost multiplier per level' },
  { key: 'base_skill_unlock_cost', hint: 'Base unlock gold cost' },
  { key: 'base_skill_level_upgrade_cost', hint: 'Base level-up gold cost' },
]

export const CoefficientPanel: React.FC<CoefficientPanelProps> = ({
  coefficients,
  originalCoefficients,
  onChange,
}) => {
  return (
    <div className="coefficient-panel">
      <div className="coefficient-panel-title">Global Coefficients</div>
      {COEFFICIENT_DEFS.map(def => {
        const current = coefficients[def.key] ?? 0
        const original = originalCoefficients[def.key] ?? 0
        const isDirty = current !== original
        return (
          <div className="coefficient-row" key={def.key}>
            <span className="coefficient-key" style={isDirty ? { color: '#ccaa44' } : undefined}>
              {def.key}
            </span>
            <input
              className="coefficient-input"
              type="number"
              step="any"
              value={current}
              onChange={e => onChange(def.key, parseFloat(e.target.value) || 0)}
            />
            <span className="coefficient-hint">{def.hint}</span>
          </div>
        )
      })}
    </div>
  )
}
