import { useState, useEffect, useMemo } from 'react'
import { api } from '../../api'
import './ItemEditorModal.css'

/* ── Types ─────────────────────────────────────────────────── */

interface ItemEditorModalProps {
  itemId: number
  characterId: number
  isArtifact: boolean
  artifactType?: 'generated' | 'curated' // only when isArtifact=true
  onClose: () => void
  onSave: () => void
}

interface ComponentOption {
  code: string
  label: string
  stat_bonuses?: Record<string, number>
}

interface ItemComponents {
  prefixes: ComponentOption[]
  suffixes: ComponentOption[]
  qualities: ComponentOption[]
  lore_tags: ComponentOption[]
  rarities: ComponentOption[]
}

interface ItemDetail {
  id: number
  name: string
  type_base: string
  gear_slot: string
  prefix_code: string | null
  suffix_code: string | null
  quality_code: string | null
  lore_tag_code: string | null
  rarity: string
  stats: Record<string, number>
}

interface ArtifactDetail {
  id: number
  name: string
  prefix_code: string | null
  suffix_code: string | null
  rarity: string
  artifact_type: 'generated' | 'curated'
  stat_bonuses: Record<string, number>
}

const RARITY_MULTIPLIERS: Record<string, number> = {
  common: 1.0,
  uncommon: 1.3,
  rare: 1.7,
  epic: 2.2,
  cosmic: 3.0,
}

const RARITY_OPTIONS = ['common', 'uncommon', 'rare', 'epic', 'cosmic']

/* ── Helpers ───────────────────────────────────────────────── */

function calcStats(
  base: Record<string, number>,
  prefixBonus: Record<string, number>,
  suffixBonus: Record<string, number>,
  rarityKey: string,
): Record<string, number> {
  const mult = RARITY_MULTIPLIERS[rarityKey] ?? 1.0
  const allKeys = new Set([
    ...Object.keys(base),
    ...Object.keys(prefixBonus),
    ...Object.keys(suffixBonus),
  ])
  const result: Record<string, number> = {}
  for (const key of allKeys) {
    const b = base[key] ?? 0
    const p = prefixBonus[key] ?? 0
    const s = suffixBonus[key] ?? 0
    result[key] = Math.floor((b + p + s) * mult)
  }
  return result
}

function formatStatName(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function findOption(options: ComponentOption[], code: string | null): ComponentOption | undefined {
  if (!code) return undefined
  return options.find(o => o.code === code)
}

/* ── Component ─────────────────────────────────────────────── */

export default function ItemEditorModal({
  itemId,
  characterId,
  isArtifact,
  artifactType,
  onClose,
  onSave,
}: ItemEditorModalProps) {
  // Shared state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  // Item state (regular items)
  const [item, setItem] = useState<ItemDetail | null>(null)
  const [components, setComponents] = useState<ItemComponents | null>(null)

  // Artifact state
  const [artifact, setArtifact] = useState<ArtifactDetail | null>(null)

  // Editable fields — items
  const [prefixCode, setPrefixCode] = useState<string>('')
  const [suffixCode, setSuffixCode] = useState<string>('')
  const [qualityCode, setQualityCode] = useState<string>('')
  const [loreTagCode, setLoreTagCode] = useState<string>('')
  const [rarity, setRarity] = useState<string>('common')

  // Editable fields — artifacts
  const [artPrefixCode, setArtPrefixCode] = useState<string>('')
  const [artSuffixCode, setArtSuffixCode] = useState<string>('')
  const [artRarity, setArtRarity] = useState<string>('common')

  // Original stats snapshot (for before/after)
  const [originalStats, setOriginalStats] = useState<Record<string, number>>({})

  /* ── Fetch on mount ──────────────────────────────────────── */

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        if (isArtifact) {
          const res = await api.get(`/api/admin/artifacts/${itemId}`)
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error(body.detail || `Failed to load artifact: ${res.statusText}`)
          }
          const data: ArtifactDetail = await res.json()
          setArtifact(data)
          setArtPrefixCode(data.prefix_code || '')
          setArtSuffixCode(data.suffix_code || '')
          setArtRarity(data.rarity || 'common')
          setOriginalStats(data.stat_bonuses || {})

          // Also fetch components for dropdown options (artifacts share prefix/suffix)
          const compRes = await api.get('/api/admin/items/components')
          if (compRes.ok) {
            setComponents(await compRes.json())
          }
        } else {
          // Fetch item + components in parallel
          const [itemRes, compRes] = await Promise.all([
            api.get(`/api/admin/items/${itemId}`),
            api.get('/api/admin/items/components'),
          ])

          if (!itemRes.ok) {
            const body = await itemRes.json().catch(() => ({}))
            throw new Error(body.detail || `Failed to load item: ${itemRes.statusText}`)
          }
          if (!compRes.ok) {
            throw new Error('Failed to load item components')
          }

          const itemData: ItemDetail = await itemRes.json()
          const compData: ItemComponents = await compRes.json()

          setItem(itemData)
          setComponents(compData)
          setPrefixCode(itemData.prefix_code || '')
          setSuffixCode(itemData.suffix_code || '')
          setQualityCode(itemData.quality_code || '')
          setLoreTagCode(itemData.lore_tag_code || '')
          setRarity(itemData.rarity || 'common')
          setOriginalStats(itemData.stats || {})
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [itemId, isArtifact])

  /* ── Computed preview stats ──────────────────────────────── */

  const previewStats = useMemo(() => {
    if (isArtifact) {
      if (!artifact || !components) return {}
      const prefixOpt = findOption(components.prefixes, artPrefixCode || null)
      const suffixOpt = findOption(components.suffixes, artSuffixCode || null)
      return calcStats(
        {}, // artifacts: base is 0, bonuses come from prefix/suffix
        prefixOpt?.stat_bonuses || {},
        suffixOpt?.stat_bonuses || {},
        artRarity,
      )
    } else {
      if (!item || !components) return {}
      // Use item base stats minus old component contributions — simplified:
      // Re-derive from the base + selected components
      const prefixOpt = findOption(components.prefixes, prefixCode || null)
      const suffixOpt = findOption(components.suffixes, suffixCode || null)
      // base stats from type_base (approximated from original stats / original rarity)
      const origMult = RARITY_MULTIPLIERS[item.rarity] ?? 1.0
      const baseStats: Record<string, number> = {}
      const origPrefix = findOption(components.prefixes, item.prefix_code)
      const origSuffix = findOption(components.suffixes, item.suffix_code)
      for (const key of Object.keys(originalStats)) {
        const origP = origPrefix?.stat_bonuses?.[key] ?? 0
        const origS = origSuffix?.stat_bonuses?.[key] ?? 0
        // Reverse: base = floor(total / mult) - prefix - suffix (approximate)
        baseStats[key] = Math.round(originalStats[key] / origMult) - origP - origS
      }
      return calcStats(
        baseStats,
        prefixOpt?.stat_bonuses || {},
        suffixOpt?.stat_bonuses || {},
        rarity,
      )
    }
  }, [
    isArtifact, item, artifact, components,
    prefixCode, suffixCode, rarity,
    artPrefixCode, artSuffixCode, artRarity,
    originalStats,
  ])

  /* ── Save handler ────────────────────────────────────────── */

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      let res: Response

      if (isArtifact) {
        const body: Record<string, unknown> = { rarity: artRarity }
        if (artifactType === 'generated') {
          body.prefix_code = artPrefixCode || null
          body.suffix_code = artSuffixCode || null
        }
        res = await api.patch(`/api/admin/artifacts/${itemId}`, body)
      } else {
        res = await api.patch(`/api/admin/items/${itemId}`, {
          prefix_code: prefixCode || null,
          suffix_code: suffixCode || null,
          quality_code: qualityCode || null,
          lore_tag_code: loreTagCode || null,
          rarity,
        })
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Save failed: ${res.statusText}`)
      }

      setSuccess('Changes saved successfully.')
      setTimeout(() => {
        onSave()
        onClose()
      }, 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  /* ── Discard (delete) handler ────────────────────────────── */

  const handleDiscard = async () => {
    setSaving(true)
    setError(null)

    try {
      const endpoint = isArtifact
        ? `/api/admin/artifacts/${itemId}`
        : `/api/admin/items/${itemId}`
      const res = await api.delete(endpoint)

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Delete failed: ${res.statusText}`)
      }

      setSuccess('Item discarded successfully.')
      setTimeout(() => {
        onSave()
        onClose()
      }, 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setSaving(false)
      setConfirmDiscard(false)
    }
  }

  /* ── Stat comparison keys ────────────────────────────────── */

  const allStatKeys = useMemo(() => {
    const keys = new Set([
      ...Object.keys(originalStats),
      ...Object.keys(previewStats),
    ])
    return Array.from(keys).sort()
  }, [originalStats, previewStats])

  /* ── Render ──────────────────────────────────────────────── */

  const currentRarity = isArtifact ? artRarity : rarity
  const itemName = isArtifact
    ? artifact?.name || `Artifact #${itemId}`
    : item?.name || `Item #${itemId}`

  return (
    <div className="iem-overlay" onClick={onClose}>
      <div className="iem-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="iem-header">
          <h3>{isArtifact ? 'Edit Artifact' : 'Edit Item'}</h3>
          <span className="iem-subtitle">
            {itemName} — Character #{characterId}
          </span>
        </div>

        {/* Alerts */}
        {error && <div className="iem-alert iem-alert-error">{error}</div>}
        {success && <div className="iem-alert iem-alert-success">{success}</div>}

        {/* Loading state */}
        {loading && <div className="iem-loading">Loading item data...</div>}

        {/* Content */}
        {!loading && (item || artifact) && components && (
          <>
            {/* Current item card */}
            <div className="iem-item-card">
              <div className="iem-item-card-header">
                <span className={`iem-rarity-badge iem-rarity-${currentRarity}`}>
                  {currentRarity}
                </span>
                <span className="iem-item-name">{itemName}</span>
                {isArtifact && artifactType && (
                  <span className="iem-artifact-type">{artifactType}</span>
                )}
              </div>
              {!isArtifact && item && (
                <div className="iem-item-card-meta">
                  <span className="iem-meta-label">Type:</span>
                  <span className="iem-meta-value iem-meta-disabled">{item.type_base}</span>
                  <span className="iem-meta-label">Slot:</span>
                  <span className="iem-meta-value iem-meta-disabled">{item.gear_slot}</span>
                </div>
              )}
            </div>

            {/* Component dropdowns */}
            <div className="iem-section">
              <h4 className="iem-section-title">Components</h4>

              {!isArtifact && (
                <>
                  {/* Type Base + Gear Slot — read-only */}
                  <div className="iem-form-inline">
                    <div className="iem-form-row">
                      <label>Type Base</label>
                      <input
                        className="iem-input iem-input-disabled"
                        value={item?.type_base || ''}
                        disabled
                      />
                    </div>
                    <div className="iem-form-row">
                      <label>Gear Slot</label>
                      <input
                        className="iem-input iem-input-disabled"
                        value={item?.gear_slot || ''}
                        disabled
                      />
                    </div>
                  </div>

                  {/* Editable dropdowns */}
                  <div className="iem-form-inline">
                    <div className="iem-form-row">
                      <label>Prefix</label>
                      <select
                        className="iem-select"
                        value={prefixCode}
                        onChange={e => setPrefixCode(e.target.value)}
                      >
                        <option value="">None</option>
                        {components.prefixes.map(p => (
                          <option key={p.code} value={p.code}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="iem-form-row">
                      <label>Suffix</label>
                      <select
                        className="iem-select"
                        value={suffixCode}
                        onChange={e => setSuffixCode(e.target.value)}
                      >
                        <option value="">None</option>
                        {components.suffixes.map(s => (
                          <option key={s.code} value={s.code}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="iem-form-inline">
                    <div className="iem-form-row">
                      <label>Quality</label>
                      <select
                        className="iem-select"
                        value={qualityCode}
                        onChange={e => setQualityCode(e.target.value)}
                      >
                        <option value="">None</option>
                        {components.qualities.map(q => (
                          <option key={q.code} value={q.code}>{q.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="iem-form-row">
                      <label>Lore Tag</label>
                      <select
                        className="iem-select"
                        value={loreTagCode}
                        onChange={e => setLoreTagCode(e.target.value)}
                      >
                        <option value="">None</option>
                        {components.lore_tags.map(l => (
                          <option key={l.code} value={l.code}>{l.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="iem-form-row">
                    <label>Rarity</label>
                    <select
                      className="iem-select"
                      value={rarity}
                      onChange={e => setRarity(e.target.value)}
                    >
                      {RARITY_OPTIONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {isArtifact && artifactType === 'generated' && (
                <>
                  <div className="iem-form-inline">
                    <div className="iem-form-row">
                      <label>Prefix</label>
                      <select
                        className="iem-select"
                        value={artPrefixCode}
                        onChange={e => setArtPrefixCode(e.target.value)}
                      >
                        <option value="">None</option>
                        {components.prefixes.map(p => (
                          <option key={p.code} value={p.code}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="iem-form-row">
                      <label>Suffix</label>
                      <select
                        className="iem-select"
                        value={artSuffixCode}
                        onChange={e => setArtSuffixCode(e.target.value)}
                      >
                        <option value="">None</option>
                        {components.suffixes.map(s => (
                          <option key={s.code} value={s.code}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="iem-form-row">
                    <label>Rarity</label>
                    <select
                      className="iem-select"
                      value={artRarity}
                      onChange={e => setArtRarity(e.target.value)}
                    >
                      {RARITY_OPTIONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {isArtifact && artifactType === 'curated' && (
                <div className="iem-form-row">
                  <label>Rarity</label>
                  <select
                    className="iem-select"
                    value={artRarity}
                    onChange={e => setArtRarity(e.target.value)}
                  >
                    {RARITY_OPTIONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Before / After stat comparison */}
            <div className="iem-section">
              <h4 className="iem-section-title">
                {isArtifact ? 'Stat Bonus Comparison' : 'Stat Comparison'}
              </h4>
              {allStatKeys.length === 0 ? (
                <p className="iem-empty">No stats to display.</p>
              ) : (
                <table className="iem-stat-table">
                  <thead>
                    <tr>
                      <th>Stat</th>
                      <th>Before</th>
                      <th>After</th>
                      <th>Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allStatKeys.map(key => {
                      const before = originalStats[key] ?? 0
                      const after = previewStats[key] ?? 0
                      const diff = after - before
                      let diffClass = 'iem-stat-neutral'
                      if (diff > 0) diffClass = 'iem-stat-positive'
                      if (diff < 0) diffClass = 'iem-stat-negative'

                      return (
                        <tr key={key}>
                          <td className="iem-stat-name">{formatStatName(key)}</td>
                          <td className="iem-stat-value">{before}</td>
                          <td className="iem-stat-value">{after}</td>
                          <td className={`iem-stat-value ${diffClass}`}>
                            {diff > 0 ? `+${diff}` : diff === 0 ? '--' : diff}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Rarity multiplier reference */}
            <div className="iem-rarity-ref">
              Rarity multipliers: {RARITY_OPTIONS.map(r => (
                <span key={r} className={`iem-rarity-chip iem-rarity-${r}`}>
                  {r} x{RARITY_MULTIPLIERS[r]}
                </span>
              ))}
            </div>
          </>
        )}

        {/* Discard confirmation dialog */}
        {confirmDiscard && (
          <div className="iem-confirm-overlay">
            <div className="iem-confirm-dialog">
              <p>
                Are you sure you want to permanently discard this{' '}
                {isArtifact ? 'artifact' : 'item'}? This action cannot be undone.
              </p>
              <div className="iem-confirm-actions">
                <button
                  className="iem-btn iem-btn-secondary"
                  onClick={() => setConfirmDiscard(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className="iem-btn iem-btn-danger"
                  onClick={handleDiscard}
                  disabled={saving}
                >
                  {saving ? 'Deleting...' : 'Confirm Discard'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="iem-actions">
          <button
            className="iem-btn iem-btn-danger"
            onClick={() => setConfirmDiscard(true)}
            disabled={saving || loading || !!success}
          >
            Discard
          </button>
          <div className="iem-actions-right">
            <button
              className="iem-btn iem-btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="iem-btn iem-btn-primary"
              onClick={handleSave}
              disabled={saving || loading || !!success}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
