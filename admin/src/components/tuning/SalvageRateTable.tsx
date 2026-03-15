import React from 'react'
import { RARITY_COLORS } from './tuning-utils'

interface SalvageRateTableProps {
  configs: Record<string, any>
  onConfigChange: (key: string, value: any) => void
}

const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const

export const SalvageRateTable: React.FC<SalvageRateTableProps> = ({
  configs,
  onConfigChange,
}) => {
  const artifactMultiplier = configs['salvage_artifact_multiplier'] ?? 2
  const curatedBonus = configs['salvage_curated_bonus_multiplier'] ?? 1.5

  return (
    <div>
      <div style={{ display: 'flex', gap: '24px', marginBottom: '12px' }}>
        <div className="tuning-field">
          <span className="tuning-field-label" style={{ minWidth: 'auto' }}>Artifact Multiplier</span>
          <div className="tuning-field-input">
            <input
              className="tuning-input"
              type="number"
              step="0.1"
              min="1"
              value={artifactMultiplier}
              onChange={e => onConfigChange('salvage_artifact_multiplier', parseFloat(e.target.value) || 1)}
            />
          </div>
        </div>
        <div className="tuning-field">
          <span className="tuning-field-label" style={{ minWidth: 'auto' }}>Curated Bonus</span>
          <div className="tuning-field-input">
            <input
              className="tuning-input"
              type="number"
              step="0.1"
              min="1"
              value={curatedBonus}
              onChange={e => onConfigChange('salvage_curated_bonus_multiplier', parseFloat(e.target.value) || 1)}
            />
          </div>
        </div>
      </div>

      <table className="salvage-table">
        <thead>
          <tr>
            <th>Rarity</th>
            <th>Equipment Essence</th>
            <th>Artifact Essence</th>
            <th>Curated Essence</th>
          </tr>
        </thead>
        <tbody>
          {RARITIES.map(rarity => {
            const configKey = `salvage_equipment_${rarity}_essence`
            const equipEssence = configs[configKey] ?? 0
            const artifactEssence = Math.round(equipEssence * artifactMultiplier)
            const curatedEssence = Math.round(artifactEssence * curatedBonus)

            return (
              <tr key={rarity}>
                <td>
                  <span style={{ color: RARITY_COLORS[rarity], fontWeight: 600, textTransform: 'capitalize' }}>
                    {rarity}
                  </span>
                </td>
                <td>
                  <input
                    className="tuning-input"
                    type="number"
                    step="1"
                    min="0"
                    value={equipEssence}
                    onChange={e => onConfigChange(configKey, parseInt(e.target.value) || 0)}
                    style={{ width: '80px' }}
                  />
                </td>
                <td className="computed">{artifactEssence}</td>
                <td className="computed">{curatedEssence}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
