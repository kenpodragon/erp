/* ------------------------------------------------------------------ */
/* Shared utilities for the GameConfigs tuning panels (5.5)           */
/* ------------------------------------------------------------------ */

/* ---- Type inference ---- */

export type InferredType =
  | 'slider_01'
  | 'integer'
  | 'float'
  | 'string'
  | 'boolean'
  | 'json_array'
  | 'json_object'

export function inferInputType(value: unknown): InferredType {
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'string') return 'string'
  if (Array.isArray(value)) return 'json_array'
  if (typeof value === 'object' && value !== null) return 'json_object'
  if (typeof value === 'number') {
    if (Number.isInteger(value) && value >= 0) return 'integer'
    if (value >= 0 && value <= 1) return 'slider_01'
    return 'float'
  }
  return 'string'
}

/* ---- Drop rate preview ---- */

export interface DropPreviewData {
  from_scenes: number
  from_bosses: number
  from_mastery: number
  total: number
}

export function computeDropPreview(configs: Record<string, any>): DropPreviewData {
  const sceneChance = configs['artifact_gen_drop_chance_scene'] ?? 0.05
  const bossChance = configs['artifact_gen_drop_chance_boss'] ?? 0.10
  const masteryChance = configs['artifact_gen_drop_chance_mastery'] ?? 0.15
  const bossRate = 0.2 // ~1 in 5 scenes has a boss
  const masteryRate = 0.05 // ~5% of scenes trigger mastery

  const from_scenes = Math.round(100 * sceneChance * 10) / 10
  const from_bosses = Math.round(100 * bossRate * bossChance * 10) / 10
  const from_mastery = Math.round(100 * masteryRate * masteryChance * 10) / 10

  return {
    from_scenes,
    from_bosses,
    from_mastery,
    total: Math.round((from_scenes + from_bosses + from_mastery) * 10) / 10,
  }
}

/* ---- Skill balance computation ---- */

export interface SkillBalanceRow {
  id: number
  name: string
  display_name: string
  category: string
  class_name: string | null
  base_cooldown_seconds: number
  base_cost_gold: number
  cost_scaling_factor: number
  cost_at_5: number
  cost_at_10: number
  cost_at_25: number
  eff_cd_at_10: number
  eff_cd_at_25: number
}

export function computeSkillBalance(
  skill: {
    id: number
    name: string
    display_name?: string
    category?: string
    class_name?: string | null
    base_cooldown_seconds?: number
    base_cost_gold?: number
    cost_scaling_factor?: number
  },
  coefficients: Record<string, number>,
): SkillBalanceRow {
  const cdReduction = coefficients['cd_reduction_per_level'] ?? 0.01
  const maxCdReduction = coefficients['max_cd_reduction'] ?? 0.7
  const costScaling = skill.cost_scaling_factor ?? 1.15
  const baseCost = skill.base_cost_gold ?? 100
  const baseCd = skill.base_cooldown_seconds ?? 30

  return {
    id: skill.id,
    name: skill.name,
    display_name: skill.display_name ?? skill.name,
    category: skill.category ?? '',
    class_name: skill.class_name ?? null,
    base_cooldown_seconds: baseCd,
    base_cost_gold: baseCost,
    cost_scaling_factor: costScaling,
    cost_at_5: Math.round(baseCost * Math.pow(costScaling, 5)),
    cost_at_10: Math.round(baseCost * Math.pow(costScaling, 10)),
    cost_at_25: Math.round(baseCost * Math.pow(costScaling, 25)),
    eff_cd_at_10:
      Math.round(baseCd * (1 - Math.min(cdReduction * 10, maxCdReduction)) * 100) / 100,
    eff_cd_at_25:
      Math.round(baseCd * (1 - Math.min(cdReduction * 25, maxCdReduction)) * 100) / 100,
  }
}

/* ---- Essence XP step-function ---- */

export interface EssenceStep {
  threshold: number
  rate: number
  label: string
  configKey: string
}

export function buildEssenceSteps(configs: Record<string, any>): EssenceStep[] {
  return [
    {
      threshold: 0.0,
      rate: configs['idle_essence_xp_floor_rate'] ?? 0.10,
      label: 'Floor (0%)',
      configKey: 'idle_essence_xp_floor_rate',
    },
    {
      threshold: configs['idle_essence_xp_critical_threshold'] ?? 0.10,
      rate: 0.25,
      label: 'Critical',
      configKey: 'idle_essence_xp_critical_threshold',
    },
    {
      threshold: configs['idle_essence_xp_low_threshold'] ?? 0.25,
      rate: 0.50,
      label: 'Low',
      configKey: 'idle_essence_xp_low_threshold',
    },
    {
      threshold: configs['idle_essence_xp_mid_threshold'] ?? 0.50,
      rate: 0.75,
      label: 'Mid',
      configKey: 'idle_essence_xp_mid_threshold',
    },
    {
      threshold: configs['idle_essence_xp_full_threshold'] ?? 0.75,
      rate: 1.00,
      label: 'Full',
      configKey: 'idle_essence_xp_full_threshold',
    },
  ]
}

/* ---- Gold-to-essence conversion preview ---- */

export function goldPerEssence(zone: number, baseRate: number, growthFactor: number): number {
  return Math.round(baseRate * Math.pow(growthFactor, zone - 1))
}

/* ---- Rarity colors ---- */

export const RARITY_COLORS: Record<string, string> = {
  common: '#9d9d9d',
  uncommon: '#1eff00',
  rare: '#0070dd',
  epic: '#a335ee',
  legendary: '#ff8000',
  cosmic: '#e6cc80',
}

/* ---- Number formatting for large values ---- */

export function formatGold(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
