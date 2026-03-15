import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import GameConfigs from './GameConfigs'
import { api } from '../api'

function mockResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: () => Promise.resolve(data) }
}

const CATEGORIES = ['combat', 'economy', 'progression']

const CONFIGS = [
  { key: 'xp_multiplier', value_json: 1.5, description: 'XP scaling factor', game_impact: 'Affects all XP gains', category: 'progression' },
  { key: 'gold_per_zone', value_json: 100, description: 'Base gold per zone', game_impact: 'Economy balance', category: 'economy' },
  { key: 'crit_chance_base', value_json: 0.05, description: 'Base crit chance', game_impact: 'Combat feel', category: 'combat' },
]

const MOCK_SKILLS = [
  { id: 1, name: 'test_skill', display_name: 'Test Skill', category: 'attack', class_name: null, base_cooldown_seconds: 10, base_cost_gold: 100, cost_scaling_factor: 1.15, is_class_exclusive: false },
]

function setupMocks(configs = CONFIGS, categories = CATEGORIES) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url.includes('/categories')) return Promise.resolve(mockResponse(categories) as Response)
    if (url.includes('/content/skills')) return Promise.resolve(mockResponse(MOCK_SKILLS) as Response)
    return Promise.resolve(mockResponse(configs) as Response)
  })
}

describe('GameConfigs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset URL to prevent tab state leaking between tests
    window.history.replaceState({}, '', '/')
  })

  it('renders loading state initially', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    render(<GameConfigs />)
    expect(screen.getByText('Loading game configs...')).toBeInTheDocument()
  })

  it('renders top-level tabs', async () => {
    setupMocks()
    render(<GameConfigs />)

    await waitFor(() => {
      expect(screen.getByText('All Configs')).toBeInTheDocument()
      expect(screen.getByText('Drop Rates')).toBeInTheDocument()
      expect(screen.getByText('Skill Balance')).toBeInTheDocument()
      expect(screen.getByText('Economy')).toBeInTheDocument()
    })
  })

  it('renders config keys in All Configs tab', async () => {
    setupMocks()
    render(<GameConfigs />)

    await waitFor(() => {
      expect(screen.getByText('xp_multiplier')).toBeInTheDocument()
      expect(screen.getByText('gold_per_zone')).toBeInTheDocument()
      expect(screen.getByText('crit_chance_base')).toBeInTheDocument()
    })
  })

  it('renders config descriptions', async () => {
    setupMocks()
    render(<GameConfigs />)

    await waitFor(() => {
      expect(screen.getByText('XP scaling factor')).toBeInTheDocument()
      expect(screen.getByText('Base gold per zone')).toBeInTheDocument()
    })
  })

  it('renders game_impact as tooltip icon', async () => {
    setupMocks()
    render(<GameConfigs />)

    await waitFor(() => {
      // game_impact rendered as "i" icon with title attribute
      const impactIcons = document.querySelectorAll('.config-key-impact')
      expect(impactIcons.length).toBeGreaterThan(0)
    })
  })

  it('renders category tabs in All Configs view', async () => {
    setupMocks()
    render(<GameConfigs />)

    await waitFor(() => {
      // Category tabs should be rendered
      const buttons = screen.getAllByRole('button')
      const combatTab = buttons.find(b => b.textContent?.includes('combat'))
      expect(combatTab).toBeDefined()
      const economyTab = buttons.find(b => b.textContent?.includes('economy'))
      expect(economyTab).toBeDefined()
    })
  })

  it('search bar filters configs', async () => {
    setupMocks()
    render(<GameConfigs />)

    await waitFor(() => screen.getByText('xp_multiplier'))

    const searchInput = screen.getByPlaceholderText(/search/i)
    fireEvent.focus(searchInput)
    fireEvent.change(searchInput, { target: { value: 'gold' } })

    // gold_per_zone should still be visible (may appear in both key list and search dropdown)
    await waitFor(() => {
      const matches = screen.getAllByText('gold_per_zone')
      expect(matches.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('Meta button opens metadata modal', async () => {
    setupMocks()
    vi.mocked(api.patch).mockResolvedValue(mockResponse({ ok: true }) as Response)
    render(<GameConfigs />)

    await waitFor(() => screen.getByText('xp_multiplier'))

    const metaBtns = screen.getAllByText('Meta')
    fireEvent.click(metaBtns[0])

    await waitFor(() => {
      expect(screen.getByText(/Edit Metadata:/)).toBeInTheDocument()
    })
  })

  it('modal pre-fills with existing metadata', async () => {
    setupMocks()
    render(<GameConfigs />)

    await waitFor(() => screen.getByText('xp_multiplier'))

    const metaBtns = screen.getAllByText('Meta')
    fireEvent.click(metaBtns[0])

    await waitFor(() => screen.getByText(/Edit Metadata:/))

    const textareas = screen.getAllByRole('textbox') as HTMLTextAreaElement[]
    const hasPrefilled = textareas.some(t => t.tagName === 'TEXTAREA' && t.value.length > 0)
    expect(hasPrefilled).toBeTruthy()
  })

  it('Save metadata calls API and refreshes', async () => {
    setupMocks()
    vi.mocked(api.patch).mockResolvedValueOnce(mockResponse({ ok: true }) as Response)

    render(<GameConfigs />)

    await waitFor(() => screen.getByText('xp_multiplier'))

    const metaBtns = screen.getAllByText('Meta')
    fireEvent.click(metaBtns[0])

    await waitFor(() => screen.getByText(/Edit Metadata:/))

    const saveBtn = screen.getByText('Save')
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(vi.mocked(api.patch)).toHaveBeenCalledWith(
        expect.stringContaining('/meta'),
        expect.objectContaining({
          description: expect.any(String),
        })
      )
    })
  })

  it('Cancel closes modal without saving', async () => {
    setupMocks()
    render(<GameConfigs />)

    await waitFor(() => screen.getByText('xp_multiplier'))

    const metaBtns = screen.getAllByText('Meta')
    fireEvent.click(metaBtns[0])
    expect(screen.getByText(/Edit Metadata:/)).toBeInTheDocument()

    const cancelBtn = screen.getByText('Cancel')
    fireEvent.click(cancelBtn)

    expect(screen.queryByText(/Edit Metadata:/)).not.toBeInTheDocument()
    expect(vi.mocked(api.patch)).not.toHaveBeenCalled()
  })

  it('clicking modal backdrop closes modal', async () => {
    setupMocks()
    render(<GameConfigs />)

    await waitFor(() => screen.getByText('xp_multiplier'))

    const metaBtns = screen.getAllByText('Meta')
    fireEvent.click(metaBtns[0])
    expect(screen.getByText(/Edit Metadata:/)).toBeInTheDocument()

    const backdrop = document.querySelector('.gc-modal-backdrop')!
    fireEvent.click(backdrop)

    expect(screen.queryByText(/Edit Metadata:/)).not.toBeInTheDocument()
  })

  it('switching to Drop Rates tab shows drop rate sections', async () => {
    setupMocks()
    render(<GameConfigs />)

    await waitFor(() => screen.getByText('All Configs'))

    fireEvent.click(screen.getByText('Drop Rates'))

    await waitFor(() => {
      expect(screen.getByText('Artifact Drop Chances')).toBeInTheDocument()
    })
  })

  it('switching to Economy tab shows economy sections', async () => {
    setupMocks()
    render(<GameConfigs />)

    await waitFor(() => screen.getByText('All Configs'))

    fireEvent.click(screen.getByText('Economy'))

    await waitFor(() => {
      expect(screen.getByText('Essence XP Curve')).toBeInTheDocument()
    })
  })

  it('category dropdown shows existing categories in meta modal', async () => {
    setupMocks()
    render(<GameConfigs />)

    // Wait for configs to load — keys appear as .config-key-name elements
    await waitFor(() => {
      expect(screen.getByText('xp_multiplier')).toBeInTheDocument()
    })

    const metaBtns = screen.getAllByText('Meta')
    fireEvent.click(metaBtns[0])

    await waitFor(() => screen.getByText(/Edit Metadata:/))

    const select = document.querySelector('.gc-category-select') as HTMLSelectElement
    expect(select).toBeTruthy()
    const options = Array.from(select.options).map(o => o.value)
    expect(options).toContain('progression')
    expect(options).toContain('combat')
    expect(options).toContain('economy')
    expect(options).toContain('__custom__')
  })
})
