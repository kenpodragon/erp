import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'

interface VisualBehavior {
  id: number
  name: string
  display_name: string
  stat_weights: StatWeights | null
}

interface StatWeights {
  size: { strength: number; agility: number; intelligence: number }
  speed: { strength: number; agility: number; intelligence: number }
  vfx_intensity: { strength: number; agility: number; intelligence: number }
  clamps: {
    size: [number, number]
    speed: [number, number]
    vfx_intensity: [number, number]
  }
}

const DEFAULT_WEIGHTS: Record<string, StatWeights> = {
  grounded_melee: {
    size: { strength: 0.6, agility: 0.2, intelligence: 0.2 },
    speed: { strength: 0.2, agility: 0.6, intelligence: 0.2 },
    vfx_intensity: { strength: 0.3, agility: 0.3, intelligence: 0.4 },
    clamps: { size: [0.5, 2.5], speed: [0.3, 1.5], vfx_intensity: [0.0, 1.0] },
  },
  grounded_ranged: {
    size: { strength: 0.3, agility: 0.4, intelligence: 0.3 },
    speed: { strength: 0.1, agility: 0.7, intelligence: 0.2 },
    vfx_intensity: { strength: 0.2, agility: 0.2, intelligence: 0.6 },
    clamps: { size: [0.5, 2.0], speed: [0.3, 1.5], vfx_intensity: [0.0, 1.0] },
  },
  airborne: {
    size: { strength: 0.2, agility: 0.5, intelligence: 0.3 },
    speed: { strength: 0.1, agility: 0.7, intelligence: 0.2 },
    vfx_intensity: { strength: 0.1, agility: 0.3, intelligence: 0.6 },
    clamps: { size: [0.5, 2.0], speed: [0.4, 1.8], vfx_intensity: [0.0, 1.0] },
  },
  magic_caster: {
    size: { strength: 0.2, agility: 0.2, intelligence: 0.6 },
    speed: { strength: 0.1, agility: 0.3, intelligence: 0.6 },
    vfx_intensity: { strength: 0.05, agility: 0.1, intelligence: 0.85 },
    clamps: { size: [0.5, 1.8], speed: [0.3, 1.2], vfx_intensity: [0.0, 1.0] },
  },
  hybrid: {
    size: { strength: 0.34, agility: 0.33, intelligence: 0.33 },
    speed: { strength: 0.34, agility: 0.33, intelligence: 0.33 },
    vfx_intensity: { strength: 0.34, agility: 0.33, intelligence: 0.33 },
    clamps: { size: [0.5, 2.5], speed: [0.3, 1.5], vfx_intensity: [0.0, 1.0] },
  },
}

const PROPERTIES = ['size', 'speed', 'vfx_intensity'] as const
const STATS = ['strength', 'agility', 'intelligence'] as const
const STAT_LABELS: Record<string, { short: string; cls: string }> = {
  strength: { short: 'STR', cls: 'str' },
  agility: { short: 'AGI', cls: 'agi' },
  intelligence: { short: 'INT', cls: 'int' },
}
const PROP_LABELS: Record<string, string> = {
  size: 'Size Weights',
  speed: 'Speed Weights',
  vfx_intensity: 'VFX Intensity Weights',
}

export default function VisualWeightEditor() {
  const [behaviors, setBehaviors] = useState<VisualBehavior[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [weights, setWeights] = useState<StatWeights | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null)

  const fetchBehaviors = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/classification/visual-behaviors')
      if (res.ok) {
        const data = await res.json()
        setBehaviors(data.items || [])
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchBehaviors() }, [fetchBehaviors])

  const selected = behaviors.find(b => b.id === selectedId)

  const handleSelect = (id: number) => {
    const b = behaviors.find(x => x.id === id)
    setSelectedId(id)
    if (b?.stat_weights) {
      setWeights(JSON.parse(JSON.stringify(b.stat_weights)))
    } else {
      const defaults = DEFAULT_WEIGHTS[b?.name || '']
      setWeights(defaults ? JSON.parse(JSON.stringify(defaults)) : null)
    }
    setMessage(null)
  }

  const updateWeight = (prop: string, stat: string, value: number) => {
    if (!weights) return
    setWeights(prev => {
      if (!prev) return prev
      const copy = JSON.parse(JSON.stringify(prev))
      copy[prop][stat] = value
      return copy
    })
  }

  const updateClamp = (prop: string, idx: 0 | 1, value: number) => {
    if (!weights) return
    setWeights(prev => {
      if (!prev) return prev
      const copy = JSON.parse(JSON.stringify(prev))
      copy.clamps[prop][idx] = value
      return copy
    })
  }

  const handleReset = () => {
    if (!selected) return
    const defaults = DEFAULT_WEIGHTS[selected.name]
    if (defaults) {
      setWeights(JSON.parse(JSON.stringify(defaults)))
      setMessage({ type: 'info', text: 'Reset to defaults (unsaved)' })
    }
  }

  const handleSave = async () => {
    if (!selectedId || !weights) return
    setSaving(true)
    try {
      const res = await api.patch(`/api/admin/classification/visual-behaviors/${selectedId}`, {
        stat_weights: weights,
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Stat weights saved' })
        await fetchBehaviors()
      } else {
        const err = await res.json().catch(() => ({}))
        setMessage({ type: 'error', text: err.detail || 'Failed to save' })
      }
    } catch { setMessage({ type: 'error', text: 'Network error' }) }
    setSaving(false)
  }

  return (
    <div>
      {message && (
        <div className={`editor-message editor-message--${message.type}`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>x</button>
        </div>
      )}

      <div className="vw-behavior-select">
        <label className="form-label">Select Behavior</label>
        <select
          className="form-select"
          value={selectedId ?? ''}
          onChange={e => e.target.value ? handleSelect(Number(e.target.value)) : setSelectedId(null)}
        >
          <option value="">-- select behavior --</option>
          {behaviors.map(b => (
            <option key={b.id} value={b.id}>{b.display_name} ({b.name})</option>
          ))}
        </select>
      </div>

      {selectedId && weights && (
        <>
          {PROPERTIES.map(prop => {
            const propWeights = weights[prop]
            const clamp = weights.clamps[prop]
            const total = STATS.reduce((sum, s) => sum + (propWeights[s] || 0), 0) || 1

            return (
              <div key={prop} className="vw-property-section">
                <div className="vw-property-header">
                  <span>{PROP_LABELS[prop]}</span>
                  <div className="vw-clamp-inputs">
                    <span>Clamp:</span>
                    <input
                      className="form-input"
                      type="number"
                      step="0.1"
                      value={clamp[0]}
                      onChange={e => updateClamp(prop, 0, parseFloat(e.target.value) || 0)}
                    />
                    <span>-</span>
                    <input
                      className="form-input"
                      type="number"
                      step="0.1"
                      value={clamp[1]}
                      onChange={e => updateClamp(prop, 1, parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {STATS.map(stat => (
                  <div key={stat} className="vw-slider-row">
                    <label className={STAT_LABELS[stat].cls}>{STAT_LABELS[stat].short}</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={propWeights[stat] || 0}
                      onChange={e => updateWeight(prop, stat, parseFloat(e.target.value))}
                    />
                    <span className="vw-value">{(propWeights[stat] || 0).toFixed(2)}</span>
                  </div>
                ))}

                <div className="vw-weight-bar">
                  {STATS.map(stat => (
                    <div
                      key={stat}
                      className={`${STAT_LABELS[stat].cls}-seg`}
                      style={{ width: `${((propWeights[stat] || 0) / total) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          <div className="form-actions">
            <button className="btn" onClick={handleReset}>Reset to Defaults</button>
            <button className="btn" onClick={() => { setSelectedId(null); setWeights(null) }}>Cancel</button>
            <button className="btn btn-success" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
