import { useState, useEffect, useMemo } from 'react'
import { api } from '../../api'
import ItemComponentPicker from './ItemComponentPicker'
import type { ItemComponents } from './ItemComponentPicker'
import './ItemCraftModal.css'

/* ── Types ── */

interface ItemCraftModalProps {
  characterId: number
  characterLevel: number
  onClose: () => void
  onSave: () => void
}

interface CraftedItemResponse {
  item: {
    id: number
    name: string
    rarity: string
    base_stats: Record<string, number>
    item_level: number
    min_char_level: number
    stat_requirements: Record<string, number>
  }
  inventory_id: number
  bag_warning: boolean
}

/* ── Constants ── */

const RARITY_MULTIPLIERS: Record<string, number> = {
  common: 1.0,
  uncommon: 1.3,
  rare: 1.7,
  epic: 2.2,
  cosmic: 3.0,
}

const RARITY_COLORS: Record<string, string> = {
  common: 'rarity-common',
  uncommon: 'rarity-uncommon',
  rare: 'rarity-rare',
  epic: 'rarity-epic',
  cosmic: 'rarity-cosmic',
}

const REQ_FRACTIONS: Record<string, number> = {
  common: 0.3,
  uncommon: 0.35,
  rare: 0.40,
  epic: 0.45,
  cosmic: 0.50,
}

/* ── Component ── */

export default function ItemCraftModal({
  characterId,
  characterLevel,
  onClose,
  onSave,
}: ItemCraftModalProps) {
  const [tab, setTab] = useState<'manual' | 'random'>('manual')
  const [components, setComponents] = useState<ItemComponents | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [bagWarning, setBagWarning] = useState(false)
  const [success, setSuccess] = useState('')

  // Manual mode state
  const [gearSlotId, setGearSlotId] = useState<number | null>(null)
  const [typeBaseId, setTypeBaseId] = useState<number | null>(null)
  const [prefixId, setPrefixId] = useState<number | null>(null)
  const [qualityId, setQualityId] = useState<number | null>(null)
  const [loreTagId, setLoreTagId] = useState<number | null>(null)
  const [suffixId, setSuffixId] = useState<number | null>(null)
  const [rarity, setRarity] = useState('common')
  const [baseStatValues, setBaseStatValues] = useState<Record<string, number>>({})
  const [itemLevel, setItemLevel] = useState(characterLevel)

  // Random mode state
  const [randomGearSlotId, setRandomGearSlotId] = useState<number | null>(null)
  const [randomRarity, setRandomRarity] = useState('')
  const [generating, setGenerating] = useState(false)
  const [randomResult, setRandomResult] = useState<CraftedItemResponse | null>(null)

  // Fetch components on mount
  useEffect(() => {
    async function fetchComponents() {
      try {
        const res = await api.get('/api/admin/items/components')
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.detail || `HTTP ${res.status}`)
        }
        const data: ItemComponents = await res.json()
        setComponents(data)
        if (data.rarities.length > 0) {
          setRarity(data.rarities[0])
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load components')
      }
      setLoading(false)
    }
    fetchComponents()
  }, [])

  // When gear slot changes, reset type base if it no longer matches
  useEffect(() => {
    if (!components || !gearSlotId || !typeBaseId) return
    const tb = components.type_bases.find(t => t.id === typeBaseId)
    if (tb && tb.gear_slot_id !== gearSlotId) {
      setTypeBaseId(null)
      setBaseStatValues({})
    }
  }, [gearSlotId, components, typeBaseId])

  // When type base changes, initialize base stat values to midpoints
  useEffect(() => {
    if (!components || !typeBaseId) return
    const tb = components.type_bases.find(t => t.id === typeBaseId)
    if (!tb) return
    const initial: Record<string, number> = {}
    for (const [stat, [min, max]] of Object.entries(tb.base_stat_range)) {
      initial[stat] = Math.floor((min + max) / 2)
    }
    setBaseStatValues(initial)
  }, [typeBaseId, components])

  // Compute live stat preview
  const preview = useMemo(() => {
    if (!components || !typeBaseId) return null

    const tb = components.type_bases.find(t => t.id === typeBaseId)
    const prefix = components.prefixes.find(p => p.id === prefixId)
    const quality = components.qualities.find(q => q.id === qualityId)
    const loreTag = components.lore_tags.find(lt => lt.id === loreTagId)
    const suffix = components.suffixes.find(s => s.id === suffixId)

    if (!tb) return null

    const rarityMult = RARITY_MULTIPLIERS[rarity] ?? 1.0
    const stats: Record<string, number> = {}
    for (const [stat, baseVal] of Object.entries(baseStatValues)) {
      const prefixBonus = prefix?.stat_bonuses?.[stat] ?? 0
      const suffixBonus = suffix?.stat_bonuses?.[stat] ?? 0
      stats[stat] = Math.floor((baseVal + prefixBonus + suffixBonus) * rarityMult)
    }

    // Build name parts
    const nameParts = [
      prefix?.display_name,
      quality?.display_name,
      loreTag?.display_name,
      tb.display_name,
      suffix?.display_name,
    ].filter(Boolean)
    const name = nameParts.join(' ') || tb.display_name

    // Level and requirements
    const level = itemLevel || characterLevel
    const reqFraction = REQ_FRACTIONS[rarity] ?? 0.3
    const statRequirements: Record<string, number> = {}
    for (const [stat, val] of Object.entries(stats)) {
      statRequirements[stat] = Math.max(1, Math.floor(val * reqFraction))
    }

    return { name, rarity, stats, level, minLevel: Math.max(1, level - 2), statRequirements }
  }, [components, typeBaseId, prefixId, qualityId, loreTagId, suffixId, rarity, baseStatValues, itemLevel, characterLevel])

  // Validate manual form completeness
  const manualValid = gearSlotId && typeBaseId && prefixId && qualityId && loreTagId && suffixId && rarity

  const handleBaseStatChange = (stat: string, value: number) => {
    setBaseStatValues(prev => ({ ...prev, [stat]: value }))
  }

  /* ── Manual Craft ── */
  const handleManualCraft = async () => {
    if (!manualValid) return
    setSaving(true)
    setError('')
    setBagWarning(false)

    try {
      const payload = {
        mode: 'manual',
        gear_slot_id: gearSlotId,
        type_base_id: typeBaseId,
        prefix_id: prefixId,
        quality_id: qualityId,
        lore_tag_id: loreTagId,
        suffix_id: suffixId,
        rarity,
        item_level: itemLevel || characterLevel,
        base_stat_values: baseStatValues,
      }

      const res = await api.post(`/api/admin/characters/${characterId}/items/craft`, payload)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail || `HTTP ${res.status}`)
      }
      const data: CraftedItemResponse = await res.json()
      if (data.bag_warning) {
        setBagWarning(true)
      }
      setSuccess(`Item "${data.item.name}" granted successfully.`)
      setTimeout(() => {
        onSave()
      }, 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Craft failed')
    }
    setSaving(false)
  }

  /* ── Random Generate ── */
  const handleRandomGenerate = async () => {
    setGenerating(true)
    setError('')
    setRandomResult(null)
    setBagWarning(false)

    try {
      const payload: Record<string, unknown> = { mode: 'random' }
      if (randomGearSlotId) payload.gear_slot_id = randomGearSlotId
      if (randomRarity) payload.rarity = randomRarity

      const res = await api.post(`/api/admin/characters/${characterId}/items/craft`, payload)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.detail || `HTTP ${res.status}`)
      }
      const data: CraftedItemResponse = await res.json()
      setRandomResult(data)
      if (data.bag_warning) {
        setBagWarning(true)
      }
      setSuccess(`Item "${data.item.name}" granted successfully.`)
      setTimeout(() => {
        onSave()
      }, 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    }
    setGenerating(false)
  }

  /* ── Render ── */

  if (loading) {
    return (
      <div className="icm-modal-overlay" onClick={onClose}>
        <div className="icm-modal" onClick={e => e.stopPropagation()}>
          <h3>Craft Item</h3>
          <p style={{ color: '#888' }}>Loading components...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="icm-modal-overlay" onClick={onClose}>
      <div className="icm-modal" onClick={e => e.stopPropagation()}>
        <h3>Craft Item</h3>

        {error && <div className="icm-error">{error}</div>}
        {success && <div className="icm-success">{success}</div>}

        {/* Tab bar */}
        <div className="icm-tabs">
          <button
            className={`icm-tab ${tab === 'manual' ? 'active' : ''}`}
            onClick={() => setTab('manual')}
          >
            Manual
          </button>
          <button
            className={`icm-tab ${tab === 'random' ? 'active' : ''}`}
            onClick={() => setTab('random')}
          >
            Random
          </button>
        </div>

        {components && tab === 'manual' && (
          <div className="icm-body">
            {/* LEFT: Component selectors */}
            <div className="icm-left">
              <ItemComponentPicker
                components={components}
                selectedGearSlotId={gearSlotId}
                onGearSlotChange={setGearSlotId}
                selectedTypeBaseId={typeBaseId}
                onTypeBaseChange={setTypeBaseId}
                selectedPrefixId={prefixId}
                onPrefixChange={setPrefixId}
                selectedQualityId={qualityId}
                onQualityChange={setQualityId}
                selectedLoreTagId={loreTagId}
                onLoreTagChange={setLoreTagId}
                selectedSuffixId={suffixId}
                onSuffixChange={setSuffixId}
                selectedRarity={rarity}
                onRarityChange={setRarity}
                baseStatValues={baseStatValues}
                onBaseStatChange={handleBaseStatChange}
              />

              {/* Item Level */}
              <div className="icm-level-field">
                <label>Item Level</label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={itemLevel}
                  onChange={e => setItemLevel(Math.max(1, Math.min(999, Number(e.target.value) || 1)))}
                />
              </div>
            </div>

            {/* RIGHT: Live stat preview */}
            <div className="icm-right">
              <div className="icm-preview">
                <p className="icm-preview-title">Live Preview</p>

                {preview ? (
                  <>
                    <div className={`icm-preview-rarity ${RARITY_COLORS[preview.rarity] || ''}`}>
                      {preview.rarity.toUpperCase()}
                    </div>
                    <div className="icm-preview-name">{preview.name}</div>

                    <div className="icm-preview-stats">
                      {Object.entries(preview.stats).map(([stat, val]) => (
                        <div key={stat} className="icm-preview-stat">
                          <span className="icm-preview-stat-name">{stat}</span>
                          <span className="icm-preview-stat-value">+{val}</span>
                        </div>
                      ))}
                    </div>

                    <div className="icm-preview-reqs">
                      <div className="icm-preview-req">
                        Level {preview.minLevel}+
                      </div>
                      {Object.entries(preview.statRequirements).map(([stat, val]) => (
                        <div key={stat} className="icm-preview-req">
                          Req: {stat.toUpperCase()} &ge; {val}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="icm-preview-empty">Select components to see preview</p>
                )}
              </div>
            </div>
          </div>
        )}

        {components && tab === 'random' && (
          <div className="icm-body">
            <div className="icm-left">
              <div className="icm-random-fields">
                {/* Optional gear slot */}
                <div className="icm-random-field">
                  <label>Gear Slot (optional)</label>
                  <select
                    value={randomGearSlotId ?? ''}
                    onChange={e => setRandomGearSlotId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Any</option>
                    {components.gear_slots.map(gs => (
                      <option key={gs.id} value={gs.id}>{gs.display_name}</option>
                    ))}
                  </select>
                </div>

                {/* Optional rarity */}
                <div className="icm-random-field">
                  <label>Rarity (optional)</label>
                  <select
                    value={randomRarity}
                    onChange={e => setRandomRarity(e.target.value)}
                  >
                    <option value="">Any</option>
                    {components.rarities.map(r => (
                      <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <button
                  className="icm-generate-btn"
                  onClick={handleRandomGenerate}
                  disabled={generating || !!success}
                >
                  {generating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>

            {/* RIGHT: Random result preview */}
            <div className="icm-right">
              <div className="icm-preview">
                <p className="icm-preview-title">Generated Item</p>

                {randomResult ? (
                  <>
                    <div className={`icm-preview-rarity ${RARITY_COLORS[randomResult.item.rarity] || ''}`}>
                      {randomResult.item.rarity.toUpperCase()}
                    </div>
                    <div className="icm-preview-name">{randomResult.item.name}</div>

                    <div className="icm-preview-stats">
                      {Object.entries(randomResult.item.base_stats).map(([stat, val]) => (
                        <div key={stat} className="icm-preview-stat">
                          <span className="icm-preview-stat-name">{stat}</span>
                          <span className="icm-preview-stat-value">+{val}</span>
                        </div>
                      ))}
                    </div>

                    <div className="icm-preview-reqs">
                      <div className="icm-preview-req">
                        Level {randomResult.item.min_char_level}+
                      </div>
                      {Object.entries(randomResult.item.stat_requirements || {}).map(([stat, val]) => (
                        <div key={stat} className="icm-preview-req">
                          Req: {stat.toUpperCase()} &ge; {val}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="icm-preview-empty">Click Generate to create a random item</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bag warning */}
        {bagWarning && (
          <div className="icm-warning">
            Warning: Player bag has reached or exceeded the item cap. The item was still granted.
          </div>
        )}

        {/* Actions */}
        <div className="icm-actions">
          <button className="icm-btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          {tab === 'manual' && (
            <button
              className="icm-btn icm-btn-primary"
              onClick={handleManualCraft}
              disabled={saving || !manualValid || !!success}
            >
              {saving ? 'Granting...' : 'Grant to Player'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
