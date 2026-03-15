import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/* ---- Mock api module ---- */
vi.mock('../../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from '../../api'
import {
  inferInputType,
  computeDropPreview,
  computeSkillBalance,
  buildEssenceSteps,
  goldPerEssence,
  formatGold,
} from './tuning-utils'
import TypeAwareInput from './TypeAwareInput'
import RarityWeightBar from './RarityWeightBar'
import DropPreview from './DropPreview'
import DropRateManager from './DropRateManager'
import { SkillBalanceViewer } from './SkillBalanceViewer'
import { EconomyTuningPanel } from './EconomyTuningPanel'
import ConfigSearchBar from './ConfigSearchBar'
import GameConfigsCategoryView from './GameConfigsCategoryView'

/* ---- Test data ---- */

function mockResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: () => Promise.resolve(data) }
}

const MOCK_CONFIGS = [
  { key: 'hp_scaling_factor', value_json: 1.15, description: 'HP scaling', game_impact: 'Affects enemy HP', category: 'combat' },
  { key: 'crit_chance', value_json: 0.05, description: 'Crit chance', game_impact: null, category: 'combat' },
  { key: 'rare_spawn_base_chance', value_json: 0.005, description: 'Rare spawn', game_impact: null, category: 'discovery' },
  { key: 'artifact_gen_drop_chance_scene', value_json: 0.05, description: 'Scene drop', game_impact: null, category: 'artifacts' },
  { key: 'artifact_gen_drop_chance_boss', value_json: 0.10, description: 'Boss drop', game_impact: null, category: 'artifacts' },
  { key: 'artifact_gen_drop_chance_mastery', value_json: 0.15, description: 'Mastery drop', game_impact: null, category: 'artifacts' },
  { key: 'cd_reduction_per_level', value_json: 0.01, description: 'CD reduction', game_impact: null, category: 'upgrades' },
  { key: 'max_cd_reduction', value_json: 0.7, description: 'Max CD cap', game_impact: null, category: 'upgrades' },
  { key: 'char_level_cap', value_json: 99, description: 'Level cap', game_impact: null, category: 'progression' },
  { key: 'gift_counts_toward_loyalty', value_json: true, description: 'Gift loyalty', game_impact: null, category: 'donations' },
]

const MOCK_SKILLS = [
  { id: 1, name: 'flame_strike', display_name: 'Flame Strike', category: 'attack', class_id: 1, class_name: 'Mage', base_cooldown_seconds: 8, base_cost_gold: 120, cost_scaling_factor: 1.15, is_class_exclusive: true },
  { id: 2, name: 'shield_bash', display_name: 'Shield Bash', category: 'defense', class_id: 2, class_name: 'Warrior', base_cooldown_seconds: 12, base_cost_gold: 100, cost_scaling_factor: 1.15, is_class_exclusive: true },
]

/* ================================================================== */
/* tuning-utils.ts unit tests                                          */
/* ================================================================== */

describe('tuning-utils', () => {
  describe('inferInputType', () => {
    it('returns boolean for booleans', () => {
      expect(inferInputType(true)).toBe('boolean')
      expect(inferInputType(false)).toBe('boolean')
    })

    it('returns string for strings', () => {
      expect(inferInputType('hello')).toBe('string')
    })

    it('returns slider_01 for floats 0-1', () => {
      expect(inferInputType(0.05)).toBe('slider_01')
      expect(inferInputType(0.0)).toBe('integer') // 0 is integer
      expect(inferInputType(0.99)).toBe('slider_01')
    })

    it('returns integer for positive integers', () => {
      expect(inferInputType(10)).toBe('integer')
      expect(inferInputType(0)).toBe('integer')
    })

    it('returns float for numbers > 1', () => {
      expect(inferInputType(1.15)).toBe('float')
      expect(inferInputType(100.5)).toBe('float')
    })

    it('returns json_array for arrays', () => {
      expect(inferInputType([1, 2, 3])).toBe('json_array')
    })

    it('returns json_object for objects', () => {
      expect(inferInputType({ a: 1 })).toBe('json_object')
    })
  })

  describe('computeDropPreview', () => {
    it('computes expected drops per 100 scenes', () => {
      const result = computeDropPreview({
        artifact_gen_drop_chance_scene: 0.05,
        artifact_gen_drop_chance_boss: 0.10,
        artifact_gen_drop_chance_mastery: 0.15,
      })
      expect(result.from_scenes).toBe(5)
      expect(result.from_bosses).toBe(2)
      expect(result.total).toBeGreaterThan(0)
    })

    it('handles missing keys with defaults', () => {
      const result = computeDropPreview({})
      expect(result.from_scenes).toBe(5)
      expect(result.total).toBeGreaterThan(0)
    })
  })

  describe('computeSkillBalance', () => {
    it('computes cost at various levels', () => {
      const row = computeSkillBalance(
        { id: 1, name: 'test', base_cost_gold: 100, cost_scaling_factor: 1.15, base_cooldown_seconds: 10 },
        { cd_reduction_per_level: 0.01, max_cd_reduction: 0.7 },
      )
      expect(row.cost_at_5).toBe(Math.round(100 * Math.pow(1.15, 5)))
      expect(row.cost_at_10).toBe(Math.round(100 * Math.pow(1.15, 10)))
      expect(row.cost_at_25).toBe(Math.round(100 * Math.pow(1.15, 25)))
    })

    it('computes effective cooldown with cap', () => {
      const row = computeSkillBalance(
        { id: 1, name: 'test', base_cooldown_seconds: 10, base_cost_gold: 100, cost_scaling_factor: 1.15 },
        { cd_reduction_per_level: 0.05, max_cd_reduction: 0.7 },
      )
      // At level 25: min(0.05*25, 0.7) = 0.7, so 10 * (1-0.7) = 3
      expect(row.eff_cd_at_25).toBe(3)
    })
  })

  describe('buildEssenceSteps', () => {
    it('returns 5 steps with defaults', () => {
      const steps = buildEssenceSteps({})
      expect(steps).toHaveLength(5)
      expect(steps[0].label).toBe('Floor (0%)')
      expect(steps[4].label).toBe('Full')
    })
  })

  describe('goldPerEssence', () => {
    it('computes zone-scaled cost', () => {
      expect(goldPerEssence(1, 100, 1.1)).toBe(100)
      expect(goldPerEssence(10, 100, 1.1)).toBe(Math.round(100 * Math.pow(1.1, 9)))
    })
  })

  describe('formatGold', () => {
    it('formats thousands', () => {
      expect(formatGold(1500)).toBe('1.5K')
    })
    it('formats millions', () => {
      expect(formatGold(2_500_000)).toBe('2.5M')
    })
    it('returns raw for small numbers', () => {
      expect(formatGold(500)).toBe('500')
    })
  })
})

/* ================================================================== */
/* TypeAwareInput component tests                                      */
/* ================================================================== */

describe('TypeAwareInput', () => {
  it('renders slider for float 0-1', () => {
    const onChange = vi.fn()
    render(<TypeAwareInput value={0.5} onChange={onChange} />)
    const slider = screen.getByRole('slider')
    expect(slider).toBeInTheDocument()
  })

  it('renders number input for integers', () => {
    const onChange = vi.fn()
    render(<TypeAwareInput value={42} onChange={onChange} />)
    const input = screen.getByRole('spinbutton')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('step', '1')
  })

  it('renders checkbox for booleans', () => {
    const onChange = vi.fn()
    render(<TypeAwareInput value={true} onChange={onChange} />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).toBeChecked()
  })

  it('renders text input for strings', () => {
    const onChange = vi.fn()
    render(<TypeAwareInput value="hello" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('hello')
  })

  it('renders JSON toggle for objects', () => {
    const onChange = vi.fn()
    render(<TypeAwareInput value={{ a: 1 }} onChange={onChange} />)
    expect(screen.getByText(/Expand Object/)).toBeInTheDocument()
  })

  it('renders JSON toggle for arrays', () => {
    const onChange = vi.fn()
    render(<TypeAwareInput value={[1, 2]} onChange={onChange} />)
    expect(screen.getByText(/Expand Array/)).toBeInTheDocument()
  })
})

/* ================================================================== */
/* RarityWeightBar component tests                                     */
/* ================================================================== */

describe('RarityWeightBar', () => {
  const defaultWeights = { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 }

  it('renders segments for each rarity', () => {
    render(<RarityWeightBar weights={defaultWeights} onChange={vi.fn()} />)
    // The bar should have segments — check that common appears
    const segments = document.querySelectorAll('.rarity-bar-segment')
    expect(segments.length).toBe(5)
  })

  it('renders editable inputs when not readOnly', () => {
    render(<RarityWeightBar weights={defaultWeights} onChange={vi.fn()} />)
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs.length).toBe(5) // One per rarity
  })

  it('hides inputs when readOnly', () => {
    render(<RarityWeightBar weights={defaultWeights} onChange={vi.fn()} readOnly />)
    const inputs = screen.queryAllByRole('spinbutton')
    expect(inputs.length).toBe(0)
  })

  it('calls onChange when a weight is modified', () => {
    const onChange = vi.fn()
    render(<RarityWeightBar weights={defaultWeights} onChange={onChange} />)
    const inputs = screen.getAllByRole('spinbutton')
    fireEvent.change(inputs[0], { target: { value: '50' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ common: 50 }))
  })
})

/* ================================================================== */
/* DropPreview component tests                                         */
/* ================================================================== */

describe('DropPreview', () => {
  it('shows per-100-scenes breakdown', () => {
    render(
      <DropPreview configs={{
        artifact_gen_drop_chance_scene: 0.05,
        artifact_gen_drop_chance_boss: 0.10,
        artifact_gen_drop_chance_mastery: 0.15,
      }} />,
    )
    expect(screen.getByText(/Estimated Artifact Drops per 100 Scenes/)).toBeInTheDocument()
    expect(screen.getByText(/From normal scenes/)).toBeInTheDocument()
  })
})

/* ================================================================== */
/* DropRateManager component tests                                     */
/* ================================================================== */

describe('DropRateManager', () => {
  const baseProps = {
    configs: {
      artifact_gen_drop_chance_scene: 0.05,
      artifact_gen_drop_chance_boss: 0.10,
      artifact_gen_drop_chance_mastery: 0.15,
      artifact_rarity_weight_book_1: { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 },
      rarity_weight_book_1: { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 },
      rare_spawn_base_chance: 0.005,
      artifact_rarity_stat_multiplier: 1.5,
      gear_slot_weights_combat: { weapon: 20, armor: 20, helm: 15 },
      gear_slot_weights_narrative: { weapon: 15, armor: 25 },
      run_achievement_config: { threshold: 100 },
    },
    onConfigChange: vi.fn(),
    dirtyKeys: new Set<string>(),
    onSave: vi.fn().mockResolvedValue(undefined),
    onReset: vi.fn(),
    saving: false,
  }

  it('renders all sections', () => {
    render(<DropRateManager {...baseProps} />)
    expect(screen.getByText('Artifact Drop Chances')).toBeInTheDocument()
    expect(screen.getByText('Artifact Rarity Weights')).toBeInTheDocument()
    expect(screen.getByText('Dream Item Rarity Weights')).toBeInTheDocument()
    expect(screen.getByText('Gear Slot Weights')).toBeInTheDocument()
    expect(screen.getByText('Rare Spawn')).toBeInTheDocument()
    expect(screen.getByText('Run Achievement Config')).toBeInTheDocument()
  })

  it('renders drop chance sliders', () => {
    render(<DropRateManager {...baseProps} />)
    expect(screen.getByText('Scene Drop Chance')).toBeInTheDocument()
    expect(screen.getByText('Boss Drop Chance')).toBeInTheDocument()
    expect(screen.getByText('Mastery Drop Chance')).toBeInTheDocument()
  })

  it('shows save/reset buttons', () => {
    render(<DropRateManager {...baseProps} />)
    expect(screen.getByText('Save Changes')).toBeInTheDocument()
    expect(screen.getByText('Reset')).toBeInTheDocument()
  })

  it('disables save when no dirty keys', () => {
    render(<DropRateManager {...baseProps} />)
    expect(screen.getByText('Save Changes')).toBeDisabled()
  })

  it('enables save when dirty keys present', () => {
    render(
      <DropRateManager
        {...baseProps}
        dirtyKeys={new Set(['artifact_gen_drop_chance_scene'])}
      />,
    )
    expect(screen.getByText('Save Changes')).not.toBeDisabled()
  })

  it('shows unsaved indicator when dirty', () => {
    render(
      <DropRateManager
        {...baseProps}
        dirtyKeys={new Set(['artifact_gen_drop_chance_scene'])}
      />,
    )
    expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
  })
})

/* ================================================================== */
/* SkillBalanceViewer component tests                                   */
/* ================================================================== */

describe('SkillBalanceViewer', () => {
  const baseProps = {
    configs: {
      cd_reduction_per_level: 0.01,
      max_cd_reduction: 0.7,
      int_power_coefficient: 0.02,
      int_cooldown_coefficient: 0.005,
      gcd_ms: 1000,
      upgrade_cost_scaling: 1.07,
      base_skill_unlock_cost: 100,
      base_skill_level_upgrade_cost: 50,
    },
    onConfigChange: vi.fn(),
    dirtyKeys: new Set<string>(),
    onSave: vi.fn().mockResolvedValue(undefined),
    onReset: vi.fn(),
    saving: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/content/skills')) {
        return Promise.resolve(mockResponse(MOCK_SKILLS) as Response)
      }
      return Promise.resolve(mockResponse([]) as Response)
    })
  })

  it('renders skill balance header and loads skills', async () => {
    render(<SkillBalanceViewer {...baseProps} />)
    await waitFor(() => {
      expect(screen.getByText('Flame Strike')).toBeInTheDocument()
      expect(screen.getByText('Shield Bash')).toBeInTheDocument()
    })
  })

  it('shows global coefficients panel', async () => {
    render(<SkillBalanceViewer {...baseProps} />)
    await waitFor(() => {
      expect(screen.getByText('cd_reduction_per_level')).toBeInTheDocument()
      expect(screen.getByText('max_cd_reduction')).toBeInTheDocument()
    })
  })

  it('shows category and class filters', async () => {
    render(<SkillBalanceViewer {...baseProps} />)
    await waitFor(() => {
      // Filter dropdowns
      const selects = screen.getAllByRole('combobox')
      expect(selects.length).toBeGreaterThanOrEqual(2)
    })
  })
})

/* ================================================================== */
/* EconomyTuningPanel component tests                                  */
/* ================================================================== */

describe('EconomyTuningPanel', () => {
  const baseProps = {
    configs: {
      idle_essence_xp_floor_rate: 0.10,
      idle_essence_xp_critical_threshold: 0.10,
      idle_essence_xp_low_threshold: 0.25,
      idle_essence_xp_mid_threshold: 0.50,
      idle_essence_xp_full_threshold: 0.75,
      idle_essence_drain_per_minute: 1.0,
      idle_essence_capacity: 100,
      idle_offline_cap_hours: 8,
      gold_to_essence_base_rate: 100,
      gold_to_essence_growth_factor: 1.1,
      salvage_equipment_common_essence: 5,
      salvage_equipment_uncommon_essence: 10,
      salvage_equipment_rare_essence: 25,
      salvage_equipment_epic_essence: 50,
      salvage_equipment_legendary_essence: 100,
      salvage_artifact_multiplier: 2.0,
      salvage_curated_bonus_multiplier: 1.15,
      subscription_base_xp_boost: 0.15,
      subscription_base_essence_boost: 0.15,
      subscription_base_drop_boost: 0.10,
      subscription_base_training_boost: 0.15,
      subscription_base_stipend_shards: 100,
      subscription_streak_bonuses: [{ months: 3, bonus: 0.05 }],
      subscription_cumulative_milestones: [{ months: 6, shards: 50 }],
      char_level_cap: 99,
      char_level_xp_factor: 1000,
      char_xp_per_scene_base: 100,
      idle_to_char_xp_ratio: 0.1,
      lore_pool_coefficient: 1.0,
    },
    onConfigChange: vi.fn(),
    dirtyKeys: new Set<string>(),
    onSave: vi.fn().mockResolvedValue(undefined),
    onReset: vi.fn(),
    saving: false,
  }

  it('renders all economy sections', () => {
    render(<EconomyTuningPanel {...baseProps} />)
    expect(screen.getByText('Essence XP Curve')).toBeInTheDocument()
    expect(screen.getByText('Essence Economy')).toBeInTheDocument()
    expect(screen.getByText('Salvage Rates')).toBeInTheDocument()
    expect(screen.getByText(/Subscription Boosts/)).toBeInTheDocument()
    expect(screen.getByText('Progression')).toBeInTheDocument()
  })

  it('shows save/reset buttons', () => {
    render(<EconomyTuningPanel {...baseProps} />)
    expect(screen.getByText('Save')).toBeInTheDocument()
    expect(screen.getByText('Reset')).toBeInTheDocument()
  })

  it('renders XP curve chart area', () => {
    render(<EconomyTuningPanel {...baseProps} />)
    const chartContainer = document.querySelector('.xp-curve-container')
    expect(chartContainer).toBeInTheDocument()
  })

  it('renders salvage table with 5 rarities', () => {
    render(<EconomyTuningPanel {...baseProps} />)
    // Rarity names are lowercase in the salvage table (text-transform: capitalize in CSS)
    expect(screen.getByText('common')).toBeInTheDocument()
    expect(screen.getByText('legendary')).toBeInTheDocument()
  })

  it('renders progression preview', () => {
    render(<EconomyTuningPanel {...baseProps} />)
    // XP requirement at level 10 = 1000 * 100 = 100,000
    expect(screen.getByText(/Level 10/)).toBeInTheDocument()
  })
})

/* ================================================================== */
/* ConfigSearchBar component tests                                     */
/* ================================================================== */

describe('ConfigSearchBar', () => {
  const configs = MOCK_CONFIGS.map(c => ({
    ...c,
    description: c.description,
    game_impact: c.game_impact,
    category: c.category,
  }))

  it('renders search input', () => {
    render(
      <ConfigSearchBar
        configs={configs}
        onJumpTo={vi.fn()}
        matchingCategories={new Set()}
        onSearchChange={vi.fn()}
      />,
    )
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('filters results on typing', () => {
    const onSearchChange = vi.fn()
    render(
      <ConfigSearchBar
        configs={configs}
        onJumpTo={vi.fn()}
        matchingCategories={new Set()}
        onSearchChange={onSearchChange}
      />,
    )
    const input = screen.getByPlaceholderText(/search/i)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'crit' } })
    expect(onSearchChange).toHaveBeenCalled()
  })
})

/* ================================================================== */
/* GameConfigsCategoryView component tests                             */
/* ================================================================== */

describe('GameConfigsCategoryView', () => {
  const configsMap: Record<string, any> = {}
  MOCK_CONFIGS.forEach(c => { configsMap[c.key] = c })

  const baseProps = {
    configs: configsMap,
    configsList: MOCK_CONFIGS,
    categories: ['combat', 'discovery', 'artifacts', 'upgrades', 'progression', 'donations'],
    onConfigChange: vi.fn(),
    dirtyKeys: new Set<string>(),
    onSave: vi.fn().mockResolvedValue(undefined),
    onReset: vi.fn(),
    onMetaEdit: vi.fn(),
    saving: false,
  }

  it('renders category tabs with counts', () => {
    render(<GameConfigsCategoryView {...baseProps} />)
    // "All" tab present
    const allTab = screen.getAllByText(/All/)[0]
    expect(allTab).toBeInTheDocument()
    // Category tabs render — check for tab buttons via their role
    const buttons = screen.getAllByRole('button')
    const combatButton = buttons.find(b => b.textContent?.includes('combat'))
    expect(combatButton).toBeDefined()
  })

  it('renders config keys', () => {
    render(<GameConfigsCategoryView {...baseProps} />)
    expect(screen.getByText('hp_scaling_factor')).toBeInTheDocument()
    expect(screen.getByText('crit_chance')).toBeInTheDocument()
  })

  it('switching category tabs works', () => {
    render(<GameConfigsCategoryView {...baseProps} />)
    // Find discovery tab button
    const buttons = screen.getAllByRole('button')
    const discoveryTab = buttons.find(b => b.textContent?.includes('discovery'))
    expect(discoveryTab).toBeDefined()
    fireEvent.click(discoveryTab!)
    // Should show rare_spawn_base_chance
    expect(screen.getByText('rare_spawn_base_chance')).toBeInTheDocument()
  })
})

/* ================================================================== */
/* GameConfigs page integration tests                                  */
/* ================================================================== */

describe('GameConfigs page (tab routing)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/configs/categories')) {
        return Promise.resolve(mockResponse(['combat', 'artifacts', 'upgrades']) as Response)
      }
      if (path.includes('/configs')) {
        return Promise.resolve(mockResponse(MOCK_CONFIGS) as Response)
      }
      if (path.includes('/content/skills')) {
        return Promise.resolve(mockResponse(MOCK_SKILLS) as Response)
      }
      return Promise.resolve(mockResponse([]) as Response)
    })
  })

  // Dynamically import GameConfigs to avoid mocking issues
  it('renders top-level tabs', async () => {
    const { default: GameConfigs } = await import('../../pages/GameConfigs')
    render(<GameConfigs />)
    await waitFor(() => {
      expect(screen.getByText('All Configs')).toBeInTheDocument()
      expect(screen.getByText('Drop Rates')).toBeInTheDocument()
      expect(screen.getByText('Skill Balance')).toBeInTheDocument()
      expect(screen.getByText('Economy')).toBeInTheDocument()
    })
  })

  it('renders all configs tab by default', async () => {
    const { default: GameConfigs } = await import('../../pages/GameConfigs')
    render(<GameConfigs />)
    await waitFor(() => {
      expect(screen.getByText('hp_scaling_factor')).toBeInTheDocument()
    })
  })

  it('switching to Drop Rates tab works', async () => {
    const { default: GameConfigs } = await import('../../pages/GameConfigs')
    render(<GameConfigs />)
    await waitFor(() => {
      expect(screen.getByText('All Configs')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Drop Rates'))
    await waitFor(() => {
      expect(screen.getByText('Artifact Drop Chances')).toBeInTheDocument()
    })
  })

  it('switching to Economy tab works', async () => {
    const { default: GameConfigs } = await import('../../pages/GameConfigs')
    render(<GameConfigs />)
    await waitFor(() => {
      expect(screen.getByText('All Configs')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Economy'))
    await waitFor(() => {
      expect(screen.getByText('Essence XP Curve')).toBeInTheDocument()
    })
  })
})
