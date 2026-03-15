import React, { useState, useMemo } from 'react'
import RarityWeightBar from './RarityWeightBar'
import DropPreview from './DropPreview'
import './tuning.css'

interface DropRateManagerProps {
  configs: Record<string, any>
  onConfigChange: (key: string, value: any) => void
  dirtyKeys: Set<string>
  onSave: () => Promise<void>
  onReset: () => void
  saving: boolean
}

/* Keys this panel owns — used for the unsaved indicator */
const MANAGED_KEYS = [
  'artifact_gen_drop_chance_scene',
  'artifact_gen_drop_chance_boss',
  'artifact_gen_drop_chance_mastery',
  'artifact_rarity_weight_book_1',
  'artifact_rarity_weight_book_2',
  'artifact_rarity_weight_book_3',
  'artifact_rarity_stat_multiplier',
  'rarity_weight_book_1',
  'rarity_weight_book_2',
  'rarity_weight_book_3',
  'gear_slot_weights_combat',
  'gear_slot_weights_narrative',
  'rare_spawn_base_chance',
  'run_achievement_config',
]

const GEAR_SLOT_COLORS: Record<string, string> = {
  weapon: '#8b4513',
  armor: '#4682b4',
  helm: '#708090',
  boots: '#556b2f',
  gloves: '#6b5b4f',
  shield: '#9e9e66',
  amulet: '#9b59b6',
  ring: '#c0392b',
  cloak: '#2c3e50',
  belt: '#7f6b3f',
  bracers: '#5e81ac',
  trinket: '#d4a017',
}

const DROP_CHANCE_KEYS = [
  { key: 'artifact_gen_drop_chance_scene', label: 'Scene Drop Chance' },
  { key: 'artifact_gen_drop_chance_boss', label: 'Boss Drop Chance' },
  { key: 'artifact_gen_drop_chance_mastery', label: 'Mastery Drop Chance' },
] as const

const DropRateManager: React.FC<DropRateManagerProps> = ({
  configs,
  onConfigChange,
  dirtyKeys,
  onSave,
  onReset,
  saving,
}) => {
  const [achievementExpanded, setAchievementExpanded] = useState(false)
  const [achievementJsonText, setAchievementJsonText] = useState('')
  const [achievementJsonError, setAchievementJsonError] = useState('')

  const hasDirty = useMemo(
    () => MANAGED_KEYS.some((k) => dirtyKeys.has(k)),
    [dirtyKeys],
  )

  /* ---- helpers ---- */

  const getVal = (key: string, fallback: any = 0) => configs[key] ?? fallback

  const parseWeights = (key: string): Record<string, number> => {
    const raw = configs[key]
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw
    return { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 }
  }

  const parseGearSlots = (key: string): Record<string, number> => {
    const raw = configs[key]
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw
    return { weapon: 20, armor: 20, helm: 15, boots: 10, gloves: 10, shield: 5, amulet: 5, ring: 5, cloak: 5, belt: 5 }
  }

  /* ---- render helpers ---- */

  const renderSlider01 = (key: string, label: string) => {
    const val = Number(getVal(key, 0))
    return (
      <div className="tuning-field" key={key}>
        <span className="tuning-field-label">{label}</span>
        <div className="tuning-field-input">
          <input
            type="range"
            className="tuning-slider"
            min={0}
            max={1}
            step={0.01}
            value={val}
            onChange={(e) => onConfigChange(key, parseFloat(e.target.value))}
          />
          <span className="tuning-slider-value">{(val * 100).toFixed(0)}%</span>
        </div>
      </div>
    )
  }

  const renderGearSlotBar = (key: string, label: string) => {
    const slots = parseGearSlots(key)
    const total = Object.values(slots).reduce((s, w) => s + w, 0)

    const handleSlotChange = (slot: string, raw: string) => {
      const val = parseInt(raw, 10)
      onConfigChange(key, { ...slots, [slot]: isNaN(val) ? 0 : Math.max(0, val) })
    }

    return (
      <div key={key} style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>{label}</div>
        <div className="gear-slot-bar">
          {Object.entries(slots).map(([slot, weight]) => {
            const pct = total > 0 ? (weight / total) * 100 : 0
            return (
              <div
                key={slot}
                className="gear-slot-segment"
                style={{
                  width: `${pct}%`,
                  backgroundColor: GEAR_SLOT_COLORS[slot] ?? '#555',
                }}
                title={`${slot}: ${weight} (${pct.toFixed(1)}%)`}
              >
                {pct >= 8 ? slot : ''}
              </div>
            )
          })}
        </div>
        <div className="rarity-weights-inputs">
          {Object.entries(slots).map(([slot, weight]) => (
            <div key={slot} className="rarity-weight-field">
              <span className="rarity-weight-label" style={{ color: GEAR_SLOT_COLORS[slot] ?? '#ccc' }}>
                {slot}
              </span>
              <input
                type="number"
                className="rarity-weight-input"
                value={weight}
                min={0}
                onChange={(e) => handleSlotChange(slot, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  /* ---- achievement JSON editor ---- */

  const handleAchievementToggle = () => {
    if (!achievementExpanded) {
      const raw = configs['run_achievement_config']
      setAchievementJsonText(JSON.stringify(raw ?? {}, null, 2))
      setAchievementJsonError('')
    }
    setAchievementExpanded((prev) => !prev)
  }

  const handleAchievementJsonChange = (text: string) => {
    setAchievementJsonText(text)
    try {
      const parsed = JSON.parse(text)
      setAchievementJsonError('')
      onConfigChange('run_achievement_config', parsed)
    } catch {
      setAchievementJsonError('Invalid JSON')
    }
  }

  /* ---- render ---- */

  return (
    <div className="tuning-panel">
      {/* 1. Artifact Drop Chances */}
      <div className="tuning-section">
        <h3 className="tuning-section-title">Artifact Drop Chances</h3>
        {DROP_CHANCE_KEYS.map(({ key, label }) => renderSlider01(key, label))}
        <div style={{ marginTop: 12 }}>
          <DropPreview configs={configs} />
        </div>
      </div>

      {/* 2. Artifact Rarity Weights */}
      <div className="tuning-section">
        <h3 className="tuning-section-title">Artifact Rarity Weights</h3>
        {[1, 2, 3].map((book) => {
          const key = `artifact_rarity_weight_book_${book}`
          return (
            <div key={key} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>Book {book}</div>
              <RarityWeightBar
                weights={parseWeights(key)}
                onChange={(w) => onConfigChange(key, w)}
              />
            </div>
          )
        })}
        <div className="tuning-field">
          <span className="tuning-field-label">Rarity Stat Multiplier</span>
          <div className="tuning-field-input">
            <input
              type="number"
              className="tuning-input"
              value={getVal('artifact_rarity_stat_multiplier', 1)}
              step={0.1}
              min={0}
              onChange={(e) =>
                onConfigChange('artifact_rarity_stat_multiplier', parseFloat(e.target.value) || 0)
              }
            />
          </div>
        </div>
      </div>

      {/* 3. Dream Item Rarity Weights */}
      <div className="tuning-section">
        <h3 className="tuning-section-title">Dream Item Rarity Weights</h3>
        {[1, 2, 3].map((book) => {
          const key = `rarity_weight_book_${book}`
          return (
            <div key={key} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>Book {book}</div>
              <RarityWeightBar
                weights={parseWeights(key)}
                onChange={(w) => onConfigChange(key, w)}
              />
            </div>
          )
        })}
      </div>

      {/* 4. Gear Slot Weights */}
      <div className="tuning-section">
        <h3 className="tuning-section-title">Gear Slot Weights</h3>
        {renderGearSlotBar('gear_slot_weights_combat', 'Combat Slots')}
        {renderGearSlotBar('gear_slot_weights_narrative', 'Narrative Slots')}
      </div>

      {/* 5. Rare Spawn */}
      <div className="tuning-section">
        <h3 className="tuning-section-title">Rare Spawn</h3>
        {renderSlider01('rare_spawn_base_chance', 'Base Chance')}
        <div className="tuning-field-help">
          At {((Number(getVal('rare_spawn_base_chance', 0)) * 100)).toFixed(0)}%, expect ~1 rare
          spawn every{' '}
          {Number(getVal('rare_spawn_base_chance', 0)) > 0
            ? Math.round(1 / Number(getVal('rare_spawn_base_chance', 0)))
            : '∞'}{' '}
          waves
        </div>
      </div>

      {/* 6. Run Achievement Config */}
      <div className="tuning-section">
        <h3 className="tuning-section-title">Run Achievement Config</h3>
        <button className="tuning-json-toggle" onClick={handleAchievementToggle}>
          {achievementExpanded ? 'Collapse' : 'Expand'} JSON Editor
        </button>
        {achievementExpanded && (
          <div style={{ marginTop: 8 }}>
            <textarea
              className="tuning-json-editor"
              rows={12}
              value={achievementJsonText}
              onChange={(e) => handleAchievementJsonChange(e.target.value)}
              spellCheck={false}
              style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace' }}
            />
            {achievementJsonError && (
              <div style={{ color: '#cc4444', fontSize: 11, marginTop: 4 }}>
                {achievementJsonError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Unsaved indicator */}
      {hasDirty && (
        <div className="tuning-unsaved">
          You have unsaved changes in Drop Rate settings.
        </div>
      )}

      {/* Actions */}
      <div className="tuning-actions">
        <button
          className="tuning-btn tuning-btn--reset"
          onClick={onReset}
          disabled={!hasDirty || saving}
        >
          Reset
        </button>
        <button
          className="tuning-btn tuning-btn--save"
          onClick={onSave}
          disabled={!hasDirty || saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

export default DropRateManager
