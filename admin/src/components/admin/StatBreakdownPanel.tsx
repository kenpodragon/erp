import { useState } from 'react'

/* ── Type definitions ────────────────────────────────────── */

interface SkillDetail {
  skill_id?: number
  skill_name?: string
  level?: number
  contribution?: number
  item_name?: string
  slot?: string
  bonus?: number
  artifact_name?: string
  rarity?: string
}

export interface StatSource {
  value: number
  detail: string | SkillDetail[]
}

export interface StatEntry {
  total: number
  sources: {
    class_base: StatSource
    idle_training: StatSource
    lore_distribution: StatSource
    character_level: StatSource
    equipment: StatSource
    artifacts: StatSource
  }
}

export interface StatBreakdown {
  character_id: number
  character_name: string
  class_name: string
  level: number
  stats: Record<string, StatEntry>
}

/* ── Source labels & colors ──────────────────────────────── */

const SOURCE_META: Record<string, { label: string; color: string }> = {
  class_base:        { label: 'Class Base',        color: '#2196f3' },
  idle_training:     { label: 'Idle Training',     color: '#e040fb' },
  lore_distribution: { label: 'Lore Distribution', color: '#ffd700' },
  character_level:   { label: 'Character Level',   color: '#4caf50' },
  equipment:         { label: 'Equipment',         color: '#ff9800' },
  artifacts:         { label: 'Artifacts',         color: '#f44336' },
}

const SOURCE_ORDER = [
  'class_base',
  'character_level',
  'lore_distribution',
  'idle_training',
  'equipment',
  'artifacts',
] as const

/* ── Helpers ─────────────────────────────────────────────── */

function formatStatName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function renderDetailItems(detail: SkillDetail[]) {
  if (detail.length === 0) return <span className="sbp-empty">None</span>

  return (
    <ul className="sbp-detail-list">
      {detail.map((item, i) => {
        // Idle training skill contributions
        if (item.skill_name !== undefined) {
          return (
            <li key={i} className="sbp-detail-item">
              <span className="sbp-detail-name">{item.skill_name}</span>
              <span className="sbp-detail-extra">Lv {item.level}</span>
              <span className="sbp-detail-value">+{item.contribution}</span>
            </li>
          )
        }
        // Equipment bonuses
        if (item.item_name !== undefined) {
          return (
            <li key={i} className="sbp-detail-item">
              <span className="sbp-detail-name">{item.item_name}</span>
              <span className="sbp-detail-extra">{item.slot}</span>
              <span className="sbp-detail-value">+{item.bonus}</span>
            </li>
          )
        }
        // Artifact bonuses
        if (item.artifact_name !== undefined) {
          return (
            <li key={i} className="sbp-detail-item">
              <span className="sbp-detail-name">{item.artifact_name}</span>
              <span className={`sbp-rarity sbp-rarity-${(item.rarity || 'common').toLowerCase()}`}>
                {item.rarity}
              </span>
              <span className="sbp-detail-value">+{item.bonus}</span>
            </li>
          )
        }
        return null
      })}
    </ul>
  )
}

/* ── Component ───────────────────────────────────────────── */

interface Props {
  statBreakdown: StatBreakdown | null
}

export default function StatBreakdownPanel({ statBreakdown }: Props) {
  const [expandedStats, setExpandedStats] = useState<Set<string>>(new Set())

  if (!statBreakdown) {
    return (
      <div className="sbp-container">
        <p className="sbp-empty">No stat breakdown available.</p>
      </div>
    )
  }

  const toggleStat = (statKey: string) => {
    setExpandedStats(prev => {
      const next = new Set(prev)
      if (next.has(statKey)) {
        next.delete(statKey)
      } else {
        next.add(statKey)
      }
      return next
    })
  }

  const statKeys = Object.keys(statBreakdown.stats)

  return (
    <div className="sbp-container">
      <div className="sbp-header">
        <h4 className="sbp-title">Stat Breakdown</h4>
        <span className="sbp-subtitle">
          {statBreakdown.character_name} &mdash; {statBreakdown.class_name} &mdash; Level {statBreakdown.level}
        </span>
      </div>

      <div className="sbp-stat-list">
        {statKeys.map(statKey => {
          const entry = statBreakdown.stats[statKey]
          const isExpanded = expandedStats.has(statKey)

          return (
            <div key={statKey} className={`sbp-stat-row ${isExpanded ? 'sbp-expanded' : ''}`}>
              <button
                type="button"
                className="sbp-stat-toggle"
                onClick={() => toggleStat(statKey)}
              >
                <span className="sbp-chevron">{isExpanded ? '\u25BE' : '\u25B8'}</span>
                <span className="sbp-stat-name">{formatStatName(statKey)}</span>
                <span className="sbp-stat-total">{entry.total}</span>
              </button>

              {isExpanded && (
                <div className="sbp-sources">
                  {SOURCE_ORDER.map(srcKey => {
                    const source = entry.sources[srcKey]
                    if (!source) return null
                    const meta = SOURCE_META[srcKey]
                    const hasArrayDetail = Array.isArray(source.detail)

                    return (
                      <div key={srcKey} className="sbp-source-row">
                        <div className="sbp-source-header">
                          <span
                            className="sbp-source-dot"
                            style={{ background: meta.color }}
                          />
                          <span className="sbp-source-label">{meta.label}</span>
                          <span className="sbp-source-value" style={{ color: meta.color }}>
                            {source.value > 0 ? `+${source.value}` : source.value}
                          </span>
                        </div>

                        {hasArrayDetail ? (
                          <div className="sbp-source-detail">
                            {renderDetailItems(source.detail as SkillDetail[])}
                          </div>
                        ) : source.detail ? (
                          <div className="sbp-source-detail">
                            <span className="sbp-detail-text">{source.detail as string}</span>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
