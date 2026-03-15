import React, { useState } from 'react'

interface SubscriptionBoostPanelProps {
  configs: Record<string, any>
  onConfigChange: (key: string, value: any) => void
}

const SLIDERS: { key: string; label: string }[] = [
  { key: 'subscription_base_xp_boost', label: 'XP Boost' },
  { key: 'subscription_base_essence_boost', label: 'Essence Boost' },
  { key: 'subscription_base_drop_boost', label: 'Drop Rate Boost' },
  { key: 'subscription_base_training_boost', label: 'Training Speed' },
]

const JSON_FIELDS: { key: string; label: string }[] = [
  { key: 'subscription_streak_bonuses', label: 'Streak Bonuses' },
  { key: 'subscription_cumulative_milestones', label: 'Cumulative Milestones' },
]

export const SubscriptionBoostPanel: React.FC<SubscriptionBoostPanelProps> = ({
  configs,
  onConfigChange,
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({})

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleJsonChange = (key: string, raw: string) => {
    try {
      const parsed = JSON.parse(raw)
      onConfigChange(key, parsed)
      setJsonErrors(prev => ({ ...prev, [key]: '' }))
    } catch {
      setJsonErrors(prev => ({ ...prev, [key]: 'Invalid JSON' }))
    }
  }

  return (
    <div>
      {SLIDERS.map(slider => {
        const value = configs[slider.key] ?? 0
        return (
          <div className="tuning-field" key={slider.key}>
            <span className="tuning-field-label">{slider.label}</span>
            <div className="tuning-field-input">
              <input
                className="tuning-slider"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={value}
                onChange={e => onConfigChange(slider.key, parseFloat(e.target.value))}
              />
              <span className="tuning-slider-value">{Math.round(value * 100)}%</span>
            </div>
          </div>
        )
      })}

      <div className="tuning-field" style={{ marginTop: '8px' }}>
        <span className="tuning-field-label">Monthly Stipend (Shards)</span>
        <div className="tuning-field-input">
          <input
            className="tuning-input"
            type="number"
            step="1"
            min="0"
            value={configs['subscription_base_stipend_shards'] ?? 0}
            onChange={e =>
              onConfigChange('subscription_base_stipend_shards', parseInt(e.target.value) || 0)
            }
          />
        </div>
      </div>

      {JSON_FIELDS.map(field => {
        const isOpen = expanded[field.key] ?? false
        const rawValue = configs[field.key]
        const displayValue =
          typeof rawValue === 'string' ? rawValue : JSON.stringify(rawValue ?? [], null, 2)

        return (
          <div key={field.key} style={{ marginTop: '12px' }}>
            <button className="tuning-json-toggle" onClick={() => toggleExpand(field.key)}>
              {isOpen ? '\u25BC' : '\u25B6'} {field.label}
            </button>
            {isOpen && (
              <div style={{ marginTop: '6px' }}>
                <textarea
                  className="tuning-json-editor"
                  rows={6}
                  defaultValue={displayValue}
                  onChange={e => handleJsonChange(field.key, e.target.value)}
                />
                {jsonErrors[field.key] && (
                  <div style={{ color: '#cc4444', fontSize: '11px', marginTop: '4px' }}>
                    {jsonErrors[field.key]}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
