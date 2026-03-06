import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

function setupMocks(configs = CONFIGS, categories = CATEGORIES) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url.includes('/categories')) return Promise.resolve(mockResponse(categories) as Response)
    return Promise.resolve(mockResponse(configs) as Response)
  })
}

describe('GameConfigs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    render(<GameConfigs />)
    expect(screen.getByText('Loading game configs...')).toBeInTheDocument()
  })

  it('renders config table after fetch', async () => {
    setupMocks()
    render(<GameConfigs />)

    await waitFor(() => {
      expect(screen.getByText('xp_multiplier')).toBeInTheDocument()
      expect(screen.getByText('gold_per_zone')).toBeInTheDocument()
      expect(screen.getByText('crit_chance_base')).toBeInTheDocument()
    })

    expect(screen.getByText('Key')).toBeInTheDocument()
    expect(screen.getByText('Value')).toBeInTheDocument()
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Impact')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
  })

  it('renders config values correctly', async () => {
    setupMocks()
    render(<GameConfigs />)

    await waitFor(() => {
      expect(screen.getByText('1.5')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('0.05')).toBeInTheDocument()
    })
  })

  it('renders object values as JSON', async () => {
    const configWithObject = [
      { key: 'scaling', value_json: { min: 1, max: 10 }, description: null, game_impact: null, category: null },
    ]
    setupMocks(configWithObject)
    render(<GameConfigs />)

    await waitFor(() => {
      expect(screen.getByText(/\"min\": 1/)).toBeInTheDocument()
    })
  })

  it('search input filters results by key', async () => {
    setupMocks()
    render(<GameConfigs />)

    await waitFor(() => screen.getByText('xp_multiplier'))

    const searchInput = screen.getByPlaceholderText('Search keys, descriptions...')
    await userEvent.type(searchInput, 'gold')

    expect(screen.getByText('gold_per_zone')).toBeInTheDocument()
    expect(screen.queryByText('xp_multiplier')).not.toBeInTheDocument()
    expect(screen.queryByText('crit_chance_base')).not.toBeInTheDocument()
  })

  it('search input filters results by description', async () => {
    setupMocks()
    render(<GameConfigs />)

    await waitFor(() => screen.getByText('xp_multiplier'))

    const searchInput = screen.getByPlaceholderText('Search keys, descriptions...')
    await userEvent.type(searchInput, 'crit chance')

    expect(screen.getByText('crit_chance_base')).toBeInTheDocument()
    expect(screen.queryByText('xp_multiplier')).not.toBeInTheDocument()
  })

  it('search input filters results by category', async () => {
    setupMocks()
    render(<GameConfigs />)

    await waitFor(() => screen.getByText('xp_multiplier'))

    const searchInput = screen.getByPlaceholderText('Search keys, descriptions...')
    await userEvent.type(searchInput, 'economy')

    expect(screen.getByText('gold_per_zone')).toBeInTheDocument()
    expect(screen.queryByText('xp_multiplier')).not.toBeInTheDocument()
  })

  it('shows empty message when no configs match search', async () => {
    setupMocks()
    render(<GameConfigs />)

    await waitFor(() => screen.getByText('xp_multiplier'))

    const searchInput = screen.getByPlaceholderText('Search keys, descriptions...')
    await userEvent.type(searchInput, 'nonexistent_config_key')

    expect(screen.getByText('No configs match your search.')).toBeInTheDocument()
  })

  it('Edit Meta button opens metadata modal', async () => {
    setupMocks()
    render(<GameConfigs />)

    await waitFor(() => screen.getByText('xp_multiplier'))

    const editButtons = screen.getAllByText('Edit Meta')
    fireEvent.click(editButtons[0])

    expect(screen.getByText('Edit Metadata: xp_multiplier')).toBeInTheDocument()
    // 'Description' appears in the table header AND the modal label
    const descEls = screen.getAllByText('Description')
    expect(descEls.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Game Impact')).toBeInTheDocument()
  })

  it('modal pre-fills with existing metadata', async () => {
    setupMocks()
    render(<GameConfigs />)

    await waitFor(() => screen.getByText('xp_multiplier'))

    const editButtons = screen.getAllByText('Edit Meta')
    fireEvent.click(editButtons[0])

    const textareas = screen.getAllByRole('textbox') as HTMLTextAreaElement[]
    const descTextarea = textareas.find(t => t.tagName === 'TEXTAREA' && t.value === 'XP scaling factor')
    expect(descTextarea).toBeTruthy()
  })

  it('Save metadata calls API and refreshes', async () => {
    setupMocks()
    vi.mocked(api.patch).mockResolvedValueOnce(mockResponse({ ok: true }) as Response)

    render(<GameConfigs />)

    await waitFor(() => screen.getByText('xp_multiplier'))

    const editButtons = screen.getAllByText('Edit Meta')
    fireEvent.click(editButtons[0])

    await waitFor(() => screen.getByText('Edit Metadata: xp_multiplier'))

    const saveBtn = screen.getByText('Save')
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(vi.mocked(api.patch)).toHaveBeenCalledWith(
        '/api/admin/game/configs/xp_multiplier/meta',
        expect.objectContaining({
          description: 'XP scaling factor',
          game_impact: 'Affects all XP gains',
          category: 'progression',
        })
      )
    })

    await waitFor(() => {
      expect(screen.queryByText('Edit Metadata: xp_multiplier')).not.toBeInTheDocument()
    })
  })

  it('Cancel closes modal without saving', async () => {
    setupMocks()
    render(<GameConfigs />)

    await waitFor(() => screen.getByText('xp_multiplier'))

    const editButtons = screen.getAllByText('Edit Meta')
    fireEvent.click(editButtons[0])
    expect(screen.getByText('Edit Metadata: xp_multiplier')).toBeInTheDocument()

    const cancelBtn = screen.getByText('Cancel')
    fireEvent.click(cancelBtn)

    expect(screen.queryByText('Edit Metadata: xp_multiplier')).not.toBeInTheDocument()
    expect(vi.mocked(api.patch)).not.toHaveBeenCalled()
  })

  it('clicking modal backdrop closes modal', async () => {
    setupMocks()
    render(<GameConfigs />)

    await waitFor(() => screen.getByText('xp_multiplier'))

    const editButtons = screen.getAllByText('Edit Meta')
    fireEvent.click(editButtons[0])
    expect(screen.getByText('Edit Metadata: xp_multiplier')).toBeInTheDocument()

    const backdrop = document.querySelector('.gc-modal-backdrop')!
    fireEvent.click(backdrop)

    expect(screen.queryByText('Edit Metadata: xp_multiplier')).not.toBeInTheDocument()
  })

  it('displays dash for null description/impact/category', async () => {
    const configWithNulls = [
      { key: 'test_key', value_json: 'val', description: null, game_impact: null, category: null },
    ]
    setupMocks(configWithNulls)
    render(<GameConfigs />)

    await waitFor(() => {
      expect(screen.getByText('test_key')).toBeInTheDocument()
      const dashes = screen.getAllByText('\u2014')
      expect(dashes.length).toBeGreaterThanOrEqual(3)
    })
  })

  /* ---- Value Editing Tests ---- */

  it('Edit Value button opens value editor modal for primitives', async () => {
    setupMocks()
    render(<GameConfigs />)

    await waitFor(() => screen.getByText('xp_multiplier'))

    const editValueBtns = screen.getAllByText('Edit Value')
    fireEvent.click(editValueBtns[0])

    expect(screen.getByText('Edit Value: xp_multiplier')).toBeInTheDocument()
    // Primitive value should show a simple input
    expect(screen.getByText('Save Value')).toBeInTheDocument()
  })

  it('Edit Value shows JSON editor for complex values', async () => {
    const configWithObject = [
      { key: 'scaling', value_json: { min: 1, max: 10 }, description: null, game_impact: null, category: null },
    ]
    setupMocks(configWithObject)
    render(<GameConfigs />)

    await waitFor(() => screen.getByText('scaling'))

    const editValueBtns = screen.getAllByText('Edit Value')
    fireEvent.click(editValueBtns[0])

    expect(screen.getByText('Edit Value: scaling')).toBeInTheDocument()
    // JSON editor should show keys
    expect(screen.getByText('min:')).toBeInTheDocument()
    expect(screen.getByText('max:')).toBeInTheDocument()
  })

  it('Save Value calls PATCH API for primitive value', async () => {
    setupMocks()
    vi.mocked(api.patch).mockResolvedValueOnce(mockResponse({ key: 'xp_multiplier', value_json: 2.0 }) as Response)

    render(<GameConfigs />)

    await waitFor(() => screen.getByText('xp_multiplier'))

    const editValueBtns = screen.getAllByText('Edit Value')
    fireEvent.click(editValueBtns[0])

    await waitFor(() => screen.getByText('Edit Value: xp_multiplier'))

    const saveBtn = screen.getByText('Save Value')
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(vi.mocked(api.patch)).toHaveBeenCalledWith(
        '/api/admin/game/configs/xp_multiplier/value',
        expect.objectContaining({ value_json: expect.anything() })
      )
    })
  })

  it('structural JSON change triggers confirmation dialog', async () => {
    const configWithObject = [
      { key: 'scaling', value_json: { min: 1, max: 10 }, description: null, game_impact: null, category: null },
    ]
    setupMocks(configWithObject)
    render(<GameConfigs />)

    await waitFor(() => screen.getByText('scaling'))

    const editValueBtns = screen.getAllByText('Edit Value')
    fireEvent.click(editValueBtns[0])

    await waitFor(() => screen.getByText('Edit Value: scaling'))

    // Remove a key — click the x button next to "min:"
    const removeButtons = document.querySelectorAll('.json-editor-remove-btn')
    expect(removeButtons.length).toBeGreaterThan(0)
    fireEvent.click(removeButtons[0])

    // The structural warning should appear
    expect(screen.getByText('Structural changes pending:')).toBeInTheDocument()

    // Click Save Value — should show confirmation dialog
    const saveBtn = screen.getByText('Save Value')
    fireEvent.click(saveBtn)

    expect(screen.getByText('Are you sure you want to save these changes?')).toBeInTheDocument()
    expect(screen.getByText('Yes, Save')).toBeInTheDocument()
  })

  it('confirmation dialog Go Back returns to editor', async () => {
    const configWithObject = [
      { key: 'scaling', value_json: { min: 1, max: 10 }, description: null, game_impact: null, category: null },
    ]
    setupMocks(configWithObject)
    render(<GameConfigs />)

    await waitFor(() => screen.getByText('scaling'))

    const editValueBtns = screen.getAllByText('Edit Value')
    fireEvent.click(editValueBtns[0])

    await waitFor(() => screen.getByText('Edit Value: scaling'))

    // Make a structural change
    const removeButtons = document.querySelectorAll('.json-editor-remove-btn')
    fireEvent.click(removeButtons[0])

    // Click Save Value to trigger confirmation
    fireEvent.click(screen.getByText('Save Value'))
    expect(screen.getByText('Are you sure you want to save these changes?')).toBeInTheDocument()

    // Click Go Back
    fireEvent.click(screen.getByText('Go Back'))

    // Should be back to the editor, not the confirmation
    expect(screen.queryByText('Are you sure you want to save these changes?')).not.toBeInTheDocument()
    expect(screen.getByText('Save Value')).toBeInTheDocument()
  })

  it('category dropdown shows existing categories', async () => {
    setupMocks()
    render(<GameConfigs />)

    await waitFor(() => screen.getByText('xp_multiplier'))

    const editMetaBtns = screen.getAllByText('Edit Meta')
    fireEvent.click(editMetaBtns[0])

    await waitFor(() => screen.getByText('Edit Metadata: xp_multiplier'))

    // The category select should have the existing categories
    const select = document.querySelector('.gc-category-select') as HTMLSelectElement
    expect(select).toBeTruthy()
    const options = Array.from(select.options).map(o => o.value)
    expect(options).toContain('progression')
    expect(options).toContain('combat')
    expect(options).toContain('economy')
    expect(options).toContain('__custom__')
  })
})
