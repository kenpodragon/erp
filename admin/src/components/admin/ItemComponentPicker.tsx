/* ── ItemComponentPicker.tsx ── Reusable item component selector (S1.7) ── */

/* ── Type Definitions ── */

interface GearSlotOption {
  id: number
  name: string
  display_name: string
}

interface TypeBaseOption {
  id: number
  code: string
  display_name: string
  gear_slot_id: number
  base_stat_range: Record<string, [number, number]>
}

interface PrefixOption {
  id: number
  code: string
  display_name: string
  stat_bonuses: Record<string, number>
}

interface QualityOption {
  id: number
  code: string
  display_name: string
}

interface LoreTagOption {
  id: number
  code: string
  display_name: string
  narrative_context?: string
}

interface SuffixOption {
  id: number
  code: string
  display_name: string
  stat_bonuses: Record<string, number>
}

export interface ItemComponents {
  gear_slots: GearSlotOption[]
  type_bases: TypeBaseOption[]
  prefixes: PrefixOption[]
  qualities: QualityOption[]
  lore_tags: LoreTagOption[]
  suffixes: SuffixOption[]
  rarities: string[]
  rarity_multipliers: Record<string, number>
  artifact_prefixes?: unknown[]
  artifact_suffixes?: unknown[]
  artifact_type_bases?: unknown[]
}

export interface ItemComponentPickerProps {
  components: ItemComponents
  selectedGearSlotId: number | null
  onGearSlotChange: (id: number) => void
  selectedTypeBaseId: number | null
  onTypeBaseChange: (id: number) => void
  selectedPrefixId: number | null
  onPrefixChange: (id: number) => void
  selectedQualityId: number | null
  onQualityChange: (id: number) => void
  selectedLoreTagId: number | null
  onLoreTagChange: (id: number) => void
  selectedSuffixId: number | null
  onSuffixChange: (id: number) => void
  selectedRarity: string
  onRarityChange: (r: string) => void
  baseStatValues: Record<string, number>
  onBaseStatChange: (stat: string, value: number) => void
}

/* ── Component ── */

export default function ItemComponentPicker({
  components,
  selectedGearSlotId,
  onGearSlotChange,
  selectedTypeBaseId,
  onTypeBaseChange,
  selectedPrefixId,
  onPrefixChange,
  selectedQualityId,
  onQualityChange,
  selectedLoreTagId,
  onLoreTagChange,
  selectedSuffixId,
  onSuffixChange,
  selectedRarity,
  onRarityChange,
  baseStatValues,
  onBaseStatChange,
}: ItemComponentPickerProps) {
  // Filter type bases by selected gear slot
  const filteredTypeBases = selectedGearSlotId
    ? components.type_bases.filter(tb => tb.gear_slot_id === selectedGearSlotId)
    : components.type_bases

  // Get selected type base for stat ranges
  const selectedTypeBase = components.type_bases.find(tb => tb.id === selectedTypeBaseId) ?? null

  return (
    <div className="icp-root">
      {/* Gear Slot */}
      <div className="icp-field">
        <label>Gear Slot</label>
        <select
          value={selectedGearSlotId ?? ''}
          onChange={e => onGearSlotChange(Number(e.target.value))}
        >
          <option value="" disabled>Select gear slot...</option>
          {components.gear_slots.map(gs => (
            <option key={gs.id} value={gs.id}>{gs.display_name}</option>
          ))}
        </select>
      </div>

      {/* Type Base */}
      <div className="icp-field">
        <label>Type Base</label>
        <select
          value={selectedTypeBaseId ?? ''}
          onChange={e => onTypeBaseChange(Number(e.target.value))}
          disabled={filteredTypeBases.length === 0}
        >
          <option value="" disabled>Select type...</option>
          {filteredTypeBases.map(tb => (
            <option key={tb.id} value={tb.id}>{tb.display_name}</option>
          ))}
        </select>
      </div>

      {/* Prefix */}
      <div className="icp-field">
        <label>Prefix</label>
        <select
          value={selectedPrefixId ?? ''}
          onChange={e => onPrefixChange(Number(e.target.value))}
        >
          <option value="" disabled>Select prefix...</option>
          {components.prefixes.map(p => (
            <option key={p.id} value={p.id}>{p.display_name}</option>
          ))}
        </select>
      </div>

      {/* Quality */}
      <div className="icp-field">
        <label>Quality</label>
        <select
          value={selectedQualityId ?? ''}
          onChange={e => onQualityChange(Number(e.target.value))}
        >
          <option value="" disabled>Select quality...</option>
          {components.qualities.map(q => (
            <option key={q.id} value={q.id}>{q.display_name}</option>
          ))}
        </select>
      </div>

      {/* Lore Tag */}
      <div className="icp-field">
        <label>Lore Tag</label>
        <select
          value={selectedLoreTagId ?? ''}
          onChange={e => onLoreTagChange(Number(e.target.value))}
        >
          <option value="" disabled>Select lore tag...</option>
          {components.lore_tags.map(lt => (
            <option key={lt.id} value={lt.id}>{lt.display_name}</option>
          ))}
        </select>
      </div>

      {/* Suffix */}
      <div className="icp-field">
        <label>Suffix</label>
        <select
          value={selectedSuffixId ?? ''}
          onChange={e => onSuffixChange(Number(e.target.value))}
        >
          <option value="" disabled>Select suffix...</option>
          {components.suffixes.map(s => (
            <option key={s.id} value={s.id}>{s.display_name}</option>
          ))}
        </select>
      </div>

      {/* Rarity */}
      <div className="icp-field">
        <label>Rarity</label>
        <select
          value={selectedRarity}
          onChange={e => onRarityChange(e.target.value)}
        >
          {components.rarities.map(r => (
            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Base Stat Values — range sliders */}
      {selectedTypeBase && Object.keys(selectedTypeBase.base_stat_range).length > 0 && (
        <div className="icp-stats-section">
          <label className="icp-stats-heading">Base Stat Values</label>
          {Object.entries(selectedTypeBase.base_stat_range).map(([stat, [min, max]]) => {
            const current = baseStatValues[stat] ?? min
            return (
              <div key={stat} className="icp-stat-row">
                <span className="icp-stat-label">{stat.toUpperCase()}</span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={current}
                  onChange={e => onBaseStatChange(stat, Number(e.target.value))}
                  className="icp-stat-slider"
                />
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={current}
                  onChange={e => {
                    const v = Number(e.target.value)
                    onBaseStatChange(stat, Math.max(min, Math.min(max, v)))
                  }}
                  className="icp-stat-input"
                />
                <span className="icp-stat-range">{min}–{max}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
