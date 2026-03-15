import React from 'react'
import { RARITY_COLORS } from './tuning-utils'

interface RarityWeightBarProps {
  weights: Record<string, number>
  onChange: (weights: Record<string, number>) => void
  readOnly?: boolean
}

const RarityWeightBar: React.FC<RarityWeightBarProps> = ({ weights, onChange, readOnly }) => {
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0)

  const handleWeightChange = (rarity: string, raw: string) => {
    const val = parseInt(raw, 10)
    onChange({ ...weights, [rarity]: isNaN(val) ? 0 : Math.max(0, val) })
  }

  return (
    <div>
      {/* Stacked bar */}
      <div className="rarity-bar">
        {Object.entries(weights).map(([rarity, weight]) => {
          const pct = totalWeight > 0 ? (weight / totalWeight) * 100 : 0
          const isNarrow = pct < 10
          return (
            <div
              key={rarity}
              className={`rarity-bar-segment${isNarrow ? ' rarity-bar-segment--narrow' : ''}`}
              style={{
                width: `${pct}%`,
                backgroundColor: RARITY_COLORS[rarity] ?? '#555',
              }}
              title={`${rarity}: ${weight} (${pct.toFixed(1)}%)`}
            >
              {!isNarrow && `${rarity} ${Math.round(pct)}%`}
            </div>
          )
        })}
      </div>

      {/* Editable inputs */}
      {!readOnly && (
        <div className="rarity-weights-inputs">
          {Object.entries(weights).map(([rarity, weight]) => (
            <div key={rarity} className="rarity-weight-field">
              <span
                className="rarity-weight-label"
                style={{ color: RARITY_COLORS[rarity] ?? '#ccc' }}
              >
                {rarity}
              </span>
              <input
                type="number"
                className="rarity-weight-input"
                value={weight}
                min={0}
                onChange={(e) => handleWeightChange(rarity, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RarityWeightBar
