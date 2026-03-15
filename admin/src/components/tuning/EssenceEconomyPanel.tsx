import React, { useMemo } from 'react'
import { goldPerEssence } from './tuning-utils'

interface EssenceEconomyPanelProps {
  configs: Record<string, any>
  onConfigChange: (key: string, value: any) => void
}

const FIELDS: { key: string; label: string; hint?: string; step?: string }[] = [
  { key: 'idle_essence_drain_per_minute', label: 'Drain Rate', hint: 'Essence/min', step: '1' },
  { key: 'idle_essence_capacity', label: 'Capacity', step: '1' },
  { key: 'idle_offline_cap_hours', label: 'Offline Cap', hint: 'hours', step: '0.5' },
  { key: 'gold_to_essence_base_rate', label: 'Gold-to-Essence Base Rate', step: '1' },
  { key: 'gold_to_essence_growth_factor', label: 'Gold-to-Essence Growth Factor', step: '0.01' },
]

const PREVIEW_ZONES = [1, 5, 10, 25]

export const EssenceEconomyPanel: React.FC<EssenceEconomyPanelProps> = ({
  configs,
  onConfigChange,
}) => {
  const baseRate = configs['gold_to_essence_base_rate'] ?? 100
  const growthFactor = configs['gold_to_essence_growth_factor'] ?? 1.15

  const preview = useMemo(
    () => PREVIEW_ZONES.map(z => ({ zone: z, gold: goldPerEssence(z, baseRate, growthFactor) })),
    [baseRate, growthFactor]
  )

  return (
    <div>
      {FIELDS.map(field => (
        <div className="tuning-field" key={field.key}>
          <span className="tuning-field-label">{field.label}</span>
          <div className="tuning-field-input">
            <input
              className="tuning-input"
              type="number"
              step={field.step ?? 'any'}
              value={configs[field.key] ?? 0}
              onChange={e => {
                const val = field.step === '1' || field.step === undefined
                  ? parseFloat(e.target.value) || 0
                  : parseFloat(e.target.value) || 0
                onConfigChange(field.key, val)
              }}
            />
            {field.hint && <span className="tuning-field-hint">{field.hint}</span>}
          </div>
        </div>
      ))}

      <div className="tuning-preview" style={{ marginTop: '12px' }}>
        <div className="tuning-preview-title">Gold per Essence by Zone</div>
        {preview.map(p => (
          <span key={p.zone} style={{ marginRight: '16px' }}>
            Zone {p.zone}: <strong style={{ color: '#88aadd' }}>{p.gold.toLocaleString()} gold</strong>
          </span>
        ))}
      </div>
    </div>
  )
}
