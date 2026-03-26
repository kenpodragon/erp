/* ------------------------------------------------------------------ */
/* Stat Bonuses Editor                                                 */
/* Toggleable list of stats + benefit effects with numeric values       */
/* ------------------------------------------------------------------ */

interface StatBonusesEditorProps {
  value: Record<string, number>
  onChange: (v: Record<string, number>) => void
  stats: { name: string; display_name: string }[]
  benefits: { effect_key: string; display_name: string }[]
}

export function StatBonusesEditor({ value, onChange, stats, benefits }: StatBonusesEditorProps) {
  const allKeys = [
    ...stats.map(s => ({ key: s.name, label: s.display_name, group: 'Stats' })),
    ...benefits.map(b => ({ key: b.effect_key, label: b.display_name, group: 'Benefits' })),
  ]

  const toggleKey = (key: string) => {
    const next = { ...value }
    if (key in next) {
      delete next[key]
    } else {
      next[key] = 0
    }
    onChange(next)
  }

  return (
    <div className="stat-bonuses-editor">
      {allKeys.map(({ key, label, group }) => {
        const active = key in value
        return (
          <div key={key} className={`sbe-row ${active ? 'sbe-row--active' : ''}`}>
            <label className="sbe-toggle">
              <input type="checkbox" checked={active} onChange={() => toggleKey(key)} />
              <span className="sbe-label">{label}</span>
              <span className="sbe-group">{group}</span>
            </label>
            {active && (
              <input
                type="number"
                step="any"
                className="sbe-value"
                value={value[key]}
                onChange={e => {
                  const n = parseFloat(e.target.value)
                  onChange({ ...value, [key]: isNaN(n) ? 0 : n })
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Visual Config Editor (color pickers + text inputs)                   */
/* ------------------------------------------------------------------ */

export function VisualConfigEditor({ value, onChange, avatarOptions }: {
  value: Record<string, any>
  onChange: (v: Record<string, any>) => void
  avatarOptions: { path: string; filename: string }[]
}) {
  const config = value || {}
  const COLOR_KEYS = ['primary_color', 'secondary_color', 'particle_tint', 'idle_sprite_tint', 'damage_text_color']
  const NUMBER_KEYS = ['border_glow_intensity']

  return (
    <div className="visual-config-editor">
      {/* Avatar URL picker */}
      <div className="vce-field">
        <label className="vce-label">avatar_url</label>
        <select
          className="vce-select"
          value={config.avatar_url || ''}
          onChange={e => onChange({ ...config, avatar_url: e.target.value })}
        >
          <option value="">-- none --</option>
          {avatarOptions.map(opt => (
            <option key={opt.path} value={opt.path}>{opt.filename}</option>
          ))}
        </select>
        {config.avatar_url && (
          <img src={config.avatar_url} alt="avatar" className="vce-avatar-preview" />
        )}
      </div>

      {/* Color pickers */}
      {COLOR_KEYS.map(key => (
        <div key={key} className="vce-field">
          <label className="vce-label">{key}</label>
          <div className="vce-color-row">
            <input
              type="color"
              value={config[key] || '#000000'}
              onChange={e => onChange({ ...config, [key]: e.target.value })}
              className="vce-color-picker"
            />
            <input
              type="text"
              value={config[key] || ''}
              onChange={e => onChange({ ...config, [key]: e.target.value })}
              className="vce-color-text"
              placeholder="#RRGGBB"
            />
          </div>
        </div>
      ))}

      {/* Numeric values */}
      {NUMBER_KEYS.map(key => (
        <div key={key} className="vce-field">
          <label className="vce-label">{key}</label>
          <input
            type="number"
            step="0.1"
            value={config[key] ?? 0}
            onChange={e => onChange({ ...config, [key]: parseFloat(e.target.value) || 0 })}
            className="vce-number"
          />
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Class Affinities Editor                                             */
/* ------------------------------------------------------------------ */

export function AffinitiesEditor({ affinities, stats, onChange }: {
  affinities: any[]
  stats: { id: number; name: string; display_name: string }[]
  onChange: (affs: any[]) => void
}) {
  return (
    <div className="affinities-editor">
      <table className="aff-table">
        <thead>
          <tr>
            <th>Stat</th>
            <th>Base Value</th>
            <th>Lore Weight</th>
            <th>Level Bonus/Lvl</th>
          </tr>
        </thead>
        <tbody>
          {stats.map(stat => {
            const aff = affinities.find((a: any) => a.stat_id === stat.id)
            const idx = affinities.indexOf(aff)
            return (
              <tr key={stat.id}>
                <td>{stat.display_name}</td>
                <td>
                  <input
                    type="number"
                    value={aff?.base_value ?? 10}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 0
                      if (aff) {
                        const next = [...affinities]
                        next[idx] = { ...aff, base_value: val }
                        onChange(next)
                      } else {
                        onChange([...affinities, { stat_id: stat.id, base_value: val, lore_weight: 0, level_bonus_per_level: 0 }])
                      }
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={aff?.lore_weight ?? 0}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0
                      if (aff) {
                        const next = [...affinities]
                        next[idx] = { ...aff, lore_weight: val }
                        onChange(next)
                      } else {
                        onChange([...affinities, { stat_id: stat.id, base_value: 10, lore_weight: val, level_bonus_per_level: 0 }])
                      }
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={aff?.level_bonus_per_level ?? 0}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0
                      if (aff) {
                        const next = [...affinities]
                        next[idx] = { ...aff, level_bonus_per_level: val }
                        onChange(next)
                      } else {
                        onChange([...affinities, { stat_id: stat.id, base_value: 10, lore_weight: 0, level_bonus_per_level: val }])
                      }
                    }}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
