export interface CurveMultipliers {
  hp: number
  gold: number
  wave_density: number
  spawn_speed: number
}

export interface CurveData {
  [chapterPos: string]: CurveMultipliers
}

export interface WavePresetConfig {
  max_enemies_per_wave?: number
  wave_count?: number
  spawn_interval_ms?: number
  scaling_factor?: number
  hp_multiplier?: number
  gold_multiplier?: number
  spawn_pattern?: string
}

export interface ScalingConfig {
  game_configs: Record<string, any>
  curve: CurveData | null
  wave_preset: WavePresetConfig | null
}

export interface ChapterInfo {
  id: number
  title: string
  chapter_number: number
}

export interface ScalingProjection {
  chapter_number: number
  chapter_title: string
  base_hp: number
  base_gold: number
  wave_count: number
  enemies_per_wave: number
  spawn_interval_ms: number
  effective_difficulty: number
}

export function getCurveEntry(curve: CurveData | null, pos: string): CurveMultipliers {
  const defaults: CurveMultipliers = { hp: 1, gold: 1, wave_density: 1, spawn_speed: 1 }
  if (!curve) return defaults
  if (curve[pos]) return curve[pos]
  // Fallback to last defined entry
  const keys = Object.keys(curve).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b)
  if (keys.length === 0) return defaults
  const lastKey = keys[keys.length - 1]
  return curve[String(lastKey)] ?? defaults
}

export function computeProjections(
  config: ScalingConfig,
  chapters: ChapterInfo[],
): ScalingProjection[] {
  const hpFactor = config.game_configs['hp_scaling_factor'] ?? 1.15
  const goldMult = config.game_configs['session_gold_multiplier'] ?? 1.0

  const waveDefaults = {
    max_enemies_per_wave: config.game_configs['wave_default_max_enemies'] ?? 5,
    wave_count: config.game_configs['wave_default_wave_count'] ?? 10,
    spawn_interval_ms: config.game_configs['wave_default_spawn_interval_ms'] ?? 2000,
  }

  return chapters.map((ch, i) => {
    const pos = String(i + 1)
    const curveEntry = getCurveEntry(config.curve, pos)

    const waveConfig = config.wave_preset ?? waveDefaults

    const base_hp = Math.round(Math.pow(hpFactor, i + 1) * curveEntry.hp)
    const base_gold = Math.round(10 * goldMult * curveEntry.gold)
    const enemies = Math.round((waveConfig.max_enemies_per_wave ?? waveDefaults.max_enemies_per_wave) * curveEntry.wave_density)
    const spawn_ms = Math.round((waveConfig.spawn_interval_ms ?? waveDefaults.spawn_interval_ms) * curveEntry.spawn_speed)
    const wave_count = waveConfig.wave_count ?? waveDefaults.wave_count

    const effective = Math.round(base_hp * enemies / Math.max(spawn_ms / 1000, 0.2))

    return {
      chapter_number: i + 1,
      chapter_title: ch.title || `Chapter ${i + 1}`,
      base_hp,
      base_gold,
      wave_count,
      enemies_per_wave: enemies,
      spawn_interval_ms: spawn_ms,
      effective_difficulty: effective,
    }
  })
}

export function computeDelta(a: number, b: number): { pct: number; cls: string; label: string } {
  if (a === b || a === 0) return { pct: 0, cls: 'neutral', label: '' }
  const pct = Math.round(((b - a) / a) * 100)
  if (pct > 0) return { pct, cls: 'harder', label: `+${pct}%` }
  return { pct, cls: 'easier', label: `${pct}%` }
}
