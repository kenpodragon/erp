import React, { useMemo } from 'react'

interface ProgressionPanelProps {
  configs: Record<string, any>
  onConfigChange: (key: string, value: any) => void
}

const FIELDS: { key: string; label: string; type: 'int' | 'float'; hint?: string }[] = [
  { key: 'char_level_cap', label: 'Level Cap', type: 'int' },
  { key: 'char_level_xp_factor', label: 'XP Factor (K)', type: 'int', hint: 'XP to level N = K \u00D7 N\u00B2' },
  { key: 'char_xp_per_scene_base', label: 'XP per Scene (base)', type: 'int' },
  { key: 'idle_to_char_xp_ratio', label: 'Idle-to-Char XP Ratio', type: 'float', hint: '10 idle XP \u2192 1 char XP (when 0.1)' },
  { key: 'lore_pool_coefficient', label: 'Lore Pool Coefficient', type: 'float' },
]

const PREVIEW_LEVELS = [10, 25, 50, 99]

export const ProgressionPanel: React.FC<ProgressionPanelProps> = ({
  configs,
  onConfigChange,
}) => {
  const factor = configs['char_level_xp_factor'] ?? 100

  const preview = useMemo(
    () => PREVIEW_LEVELS.map(lvl => ({ level: lvl, xp: factor * lvl * lvl })),
    [factor]
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
              step={field.type === 'int' ? '1' : '0.01'}
              value={configs[field.key] ?? 0}
              onChange={e => {
                const val = field.type === 'int'
                  ? parseInt(e.target.value) || 0
                  : parseFloat(e.target.value) || 0
                onConfigChange(field.key, val)
              }}
            />
            {field.hint && <span className="tuning-field-hint">{field.hint}</span>}
          </div>
        </div>
      ))}

      <div style={{ marginTop: '12px' }}>
        <div className="tuning-preview-title">XP Requirements Preview</div>
        <div className="progression-preview">
          {preview.map(p => (
            <React.Fragment key={p.level}>
              <span className="progression-preview-level">Level {p.level}:</span>
              <span className="progression-preview-xp">{p.xp.toLocaleString()} XP</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
