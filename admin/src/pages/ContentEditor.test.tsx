import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ContentEditor from './ContentEditor'
import { api } from '../api'

vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

function mockResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: () => Promise.resolve(data) }
}

const STATS_DATA = [
  { id: 1, name: 'strength', display_name: 'Strength', description: 'Physical power', base_value: 10 },
  { id: 2, name: 'agility', display_name: 'Agility', description: 'Speed and dexterity', base_value: 8 },
]

const CLASSES_DATA = [
  { id: 1, name: 'drifter', lore_blurb: 'A wanderer between realms', base_strength: 8, base_agility: 16, base_intelligence: 6, is_available: true, visual_config: { primary_color: '#ff0000' }, affinities: [{ stat_id: 1, base_value: 15, lore_weight: 0.6, level_bonus_per_level: 1.0 }] },
  { id: 2, name: 'engineer', lore_blurb: 'Master of machinery', base_strength: 14, base_agility: 10, base_intelligence: 6, is_available: true, visual_config: { primary_color: '#00ff00' }, affinities: [] },
]

const SKILLS_DATA = [
  { id: 1, name: 'power_strike', display_name: 'Power Strike', category: 'active', is_class_exclusive: false, effect_type: 'damage' },
]

const BENEFITS_DATA = [
  { id: 1, effect_key: 'xp_bonus', display_name: 'XP Bonus', description: 'Increases XP gain' },
]

const ITEMS_DATA = {
  prefixes: [
    { id: 1, code: 'blazing', display_name: 'Blazing', stat_bonuses: { strength: 5 } },
  ],
  qualities: [
    { id: 1, code: 'common', display_name: 'Common' },
  ],
  lore_tags: [
    { id: 1, code: 'elysium', display_name: 'Elysium' },
  ],
  type_bases: [
    { id: 1, code: 'sword', display_name: 'Sword', gear_slot_id: 1, base_stat_range: { strength: 10 } },
  ],
  suffixes: [
    { id: 1, code: 'of_fire', display_name: 'of Fire', stat_bonuses: { intelligence: 3 } },
  ],
}

const GEAR_SLOTS = [
  { id: 1, name: 'weapon', display_name: 'Weapon', sort_order: 0 },
  { id: 2, name: 'armor', display_name: 'Armor', sort_order: 1 },
]

const AVATAR_OPTIONS = [
  { path: '/assets/avatars/preset_drifter.png', filename: 'preset_drifter.png' },
]

function setupDefaultMocks() {
  vi.mocked(api.get).mockImplementation((path: string) => {
    if (path.includes('/avatar-options')) return Promise.resolve(mockResponse(AVATAR_OPTIONS) as Response)
    if (path.includes('/gear-slots')) return Promise.resolve(mockResponse(GEAR_SLOTS) as Response)
    if (path.includes('/items/components')) return Promise.resolve(mockResponse(ITEMS_DATA) as Response)
    if (path.includes('/stats')) return Promise.resolve(mockResponse(STATS_DATA) as Response)
    if (path.includes('/classes')) return Promise.resolve(mockResponse(CLASSES_DATA) as Response)
    if (path.includes('/skills')) return Promise.resolve(mockResponse(SKILLS_DATA) as Response)
    if (path.includes('/benefits')) return Promise.resolve(mockResponse(BENEFITS_DATA) as Response)
    return Promise.resolve(mockResponse([]) as Response)
  })
  vi.mocked(api.post).mockResolvedValue(mockResponse({ id: 99 }) as Response)
  vi.mocked(api.patch).mockResolvedValue(mockResponse({ ok: true }) as Response)
  vi.mocked(api.delete).mockResolvedValue(mockResponse({ ok: true }) as Response)
}

describe('ContentEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('renders tab navigation with all entity types', async () => {
    render(<ContentEditor />)

    expect(screen.getByText('Stat Definitions')).toBeInTheDocument()
    expect(screen.getByText('Character Classes')).toBeInTheDocument()
    expect(screen.getByText('Skills')).toBeInTheDocument()
    expect(screen.getByText('Benefit Effects')).toBeInTheDocument()
    expect(screen.getByText('Item Components')).toBeInTheDocument()
  })

  it('loads stats tab by default and shows data', async () => {
    render(<ContentEditor />)

    await waitFor(() => {
      expect(screen.getByText('strength')).toBeInTheDocument()
      expect(screen.getByText('Strength')).toBeInTheDocument()
      expect(screen.getByText('agility')).toBeInTheDocument()
    })
  })

  it('shows correct column headers for stats tab', async () => {
    render(<ContentEditor />)

    await waitFor(() => {
      expect(screen.getByText('id')).toBeInTheDocument()
      expect(screen.getByText('name')).toBeInTheDocument()
      expect(screen.getByText('display_name')).toBeInTheDocument()
      expect(screen.getByText('description')).toBeInTheDocument()
      expect(screen.getByText('base_value')).toBeInTheDocument()
    })
  })

  it('switching to Classes tab loads class data', async () => {
    render(<ContentEditor />)

    await waitFor(() => screen.getByText('strength'))

    const classesTab = screen.getByText('Character Classes')
    fireEvent.click(classesTab)

    await waitFor(() => {
      expect(screen.getByText('drifter')).toBeInTheDocument()
      expect(screen.getByText('engineer')).toBeInTheDocument()
    })
  })

  it('switching to Skills tab loads skill data', async () => {
    render(<ContentEditor />)

    const skillsTab = screen.getByText('Skills')
    fireEvent.click(skillsTab)

    await waitFor(() => {
      expect(screen.getByText('power_strike')).toBeInTheDocument()
      expect(screen.getByText('Power Strike')).toBeInTheDocument()
    })
  })

  it('switching to Benefits tab loads benefit data', async () => {
    render(<ContentEditor />)

    const benefitsTab = screen.getByText('Benefit Effects')
    fireEvent.click(benefitsTab)

    await waitFor(() => {
      expect(screen.getByText('xp_bonus')).toBeInTheDocument()
      expect(screen.getByText('XP Bonus')).toBeInTheDocument()
    })
  })

  it('Create button opens empty form', async () => {
    render(<ContentEditor />)

    await waitFor(() => screen.getByText('strength'))

    const createBtn = screen.getByText(/\+ New Stat Definition/)
    fireEvent.click(createBtn)

    await waitFor(() => {
      expect(screen.getByText('Create Stat Definition')).toBeInTheDocument()
    })

    expect(screen.getByText('Save')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('Create form does not show id field', async () => {
    render(<ContentEditor />)

    await waitFor(() => screen.getByText('strength'))

    const createBtn = screen.getByText(/\+ New/)
    fireEvent.click(createBtn)

    await waitFor(() => screen.getByText('Create Stat Definition'))

    const labels = screen.getAllByRole('textbox')
    const disabledInputs = labels.filter((el) => (el as HTMLInputElement).disabled)
    expect(disabledInputs).toHaveLength(0)
  })

  it('Edit button loads existing data into form', async () => {
    render(<ContentEditor />)

    await waitFor(() => screen.getByText('strength'))

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Edit #1')).toBeInTheDocument()
    })

    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[]
    const idInput = inputs.find(i => i.disabled && i.value === '1')
    expect(idInput).toBeTruthy()
  })

  it('Save on create calls POST and refreshes', async () => {
    render(<ContentEditor />)

    await waitFor(() => screen.getByText('strength'))

    const createBtn = screen.getByText(/\+ New/)
    fireEvent.click(createBtn)

    await waitFor(() => screen.getByText('Create Stat Definition'))

    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[]
    await userEvent.type(inputs[0], 'intellect')

    const saveBtn = screen.getByText('Save')
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        '/api/admin/game/stats',
        expect.objectContaining({ name: 'intellect' })
      )
    })
  })

  it('Save on edit calls PATCH with item id', async () => {
    render(<ContentEditor />)

    await waitFor(() => screen.getByText('strength'))

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    await waitFor(() => screen.getByText('Edit #1'))

    const saveBtn = screen.getByText('Save')
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(vi.mocked(api.patch)).toHaveBeenCalledWith(
        '/api/admin/game/stats/1',
        expect.objectContaining({ id: 1, name: 'strength' })
      )
    })
  })

  it('Delete button calls API with confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<ContentEditor />)

    await waitFor(() => screen.getByText('strength'))

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    expect(confirmSpy).toHaveBeenCalledWith('Delete this entry?')

    await waitFor(() => {
      expect(vi.mocked(api.delete)).toHaveBeenCalledWith('/api/admin/game/stats/1')
    })

    confirmSpy.mockRestore()
  })

  it('Delete is cancelled when user declines confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<ContentEditor />)

    await waitFor(() => screen.getByText('strength'))

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    expect(confirmSpy).toHaveBeenCalled()
    expect(vi.mocked(api.delete)).not.toHaveBeenCalled()

    confirmSpy.mockRestore()
  })

  it('Cancel button closes edit form without saving', async () => {
    render(<ContentEditor />)

    await waitFor(() => screen.getByText('strength'))

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])
    expect(screen.getByText('Edit #1')).toBeInTheDocument()

    const cancelBtn = screen.getByText('Cancel')
    fireEvent.click(cancelBtn)

    expect(screen.queryByText('Edit #1')).not.toBeInTheDocument()
    expect(vi.mocked(api.patch)).not.toHaveBeenCalled()
  })

  it('Cancel button closes create form without saving', async () => {
    render(<ContentEditor />)

    await waitFor(() => screen.getByText('strength'))

    const createBtn = screen.getByText(/\+ New/)
    fireEvent.click(createBtn)
    expect(screen.getByText('Create Stat Definition')).toBeInTheDocument()

    const cancelBtn = screen.getByText('Cancel')
    fireEvent.click(cancelBtn)

    expect(screen.queryByText('Create Stat Definition')).not.toBeInTheDocument()
    expect(vi.mocked(api.post)).not.toHaveBeenCalled()
  })

  it('shows loading state while fetching', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    render(<ContentEditor />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('boolean values display as Yes/No', async () => {
    render(<ContentEditor />)

    const skillsTab = screen.getByText('Skills')
    fireEvent.click(skillsTab)

    await waitFor(() => {
      expect(screen.getByText('No')).toBeInTheDocument()
    })
  })
})

describe('ContentEditor - Item Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('switching to Items tab shows sub-tabs and keeps top-level tabs', async () => {
    render(<ContentEditor />)

    const itemsTab = screen.getByText('Item Components')
    fireEvent.click(itemsTab)

    await waitFor(() => {
      // Sub-tabs
      expect(screen.getByText('prefixes')).toBeInTheDocument()
      expect(screen.getByText('qualities')).toBeInTheDocument()
      expect(screen.getByText('lore tags')).toBeInTheDocument()
      expect(screen.getByText('type bases')).toBeInTheDocument()
      expect(screen.getByText('suffixes')).toBeInTheDocument()
    })

    // Top-level tabs should still be visible
    expect(screen.getByText('Stat Definitions')).toBeInTheDocument()
    expect(screen.getByText('Character Classes')).toBeInTheDocument()
  })

  it('items tab shows prefix data by default', async () => {
    render(<ContentEditor />)

    const itemsTab = screen.getByText('Item Components')
    fireEvent.click(itemsTab)

    await waitFor(() => {
      expect(screen.getByText('blazing')).toBeInTheDocument()
      expect(screen.getByText('Blazing')).toBeInTheDocument()
    })
  })

  it('clicking sub-tab switches component type', async () => {
    render(<ContentEditor />)

    const itemsTab = screen.getByText('Item Components')
    fireEvent.click(itemsTab)

    await waitFor(() => screen.getByText('blazing'))

    const qualitiesTab = screen.getByText('qualities')
    fireEvent.click(qualitiesTab)

    await waitFor(() => {
      expect(screen.getByText('common')).toBeInTheDocument()
      expect(screen.getByText('Common')).toBeInTheDocument()
    })
  })

  it('create button opens form in item components', async () => {
    render(<ContentEditor />)

    const itemsTab = screen.getByText('Item Components')
    fireEvent.click(itemsTab)

    await waitFor(() => screen.getByText('blazing'))

    const createBtn = screen.getByText(/\+ New prefix/)
    fireEvent.click(createBtn)

    expect(screen.getByText('Create prefixes')).toBeInTheDocument()
  })

  it('edit button opens form with existing item data', async () => {
    render(<ContentEditor />)

    const itemsTab = screen.getByText('Item Components')
    fireEvent.click(itemsTab)

    await waitFor(() => screen.getByText('blazing'))

    const editBtn = screen.getByText('Edit')
    fireEvent.click(editBtn)

    expect(screen.getByText('Edit #1')).toBeInTheDocument()

    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[]
    const codeInput = inputs.find(i => i.value === 'blazing')
    expect(codeInput).toBeTruthy()
  })

  it('delete button in item components calls correct endpoint', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<ContentEditor />)

    const itemsTab = screen.getByText('Item Components')
    fireEvent.click(itemsTab)

    await waitFor(() => screen.getByText('blazing'))

    const deleteBtn = screen.getByText('Delete')
    fireEvent.click(deleteBtn)

    expect(confirmSpy).toHaveBeenCalledWith('Delete this entry?')

    await waitFor(() => {
      expect(vi.mocked(api.delete)).toHaveBeenCalledWith('/api/admin/game/items/prefixes/1')
    })

    confirmSpy.mockRestore()
  })

  it('save on create in item components calls POST', async () => {
    render(<ContentEditor />)

    const itemsTab = screen.getByText('Item Components')
    fireEvent.click(itemsTab)

    await waitFor(() => screen.getByText('blazing'))

    const createBtn = screen.getByText(/\+ New prefix/)
    fireEvent.click(createBtn)

    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[]
    await userEvent.type(inputs[0], 'frozen')

    const saveBtn = screen.getByText('Save')
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        '/api/admin/game/items/prefixes',
        expect.objectContaining({ code: 'frozen' })
      )
    })
  })

  it('prefix edit form shows stat bonuses editor with toggles', async () => {
    render(<ContentEditor />)

    const itemsTab = screen.getByText('Item Components')
    fireEvent.click(itemsTab)

    await waitFor(() => screen.getByText('blazing'))

    const editBtn = screen.getByText('Edit')
    fireEvent.click(editBtn)

    // Stat bonuses editor should show stat names from lookup data as checkboxes
    await waitFor(() => {
      expect(screen.getByText('Stat Bonuses')).toBeInTheDocument()
      expect(screen.getByText('Strength')).toBeInTheDocument()
      expect(screen.getByText('Agility')).toBeInTheDocument()
    })
  })

  it('type_bases sub-tab edit form shows gear slot dropdown', async () => {
    render(<ContentEditor />)

    const itemsTab = screen.getByText('Item Components')
    fireEvent.click(itemsTab)

    await waitFor(() => screen.getByText('blazing'))

    const typeBasesTab = screen.getByText('type bases')
    fireEvent.click(typeBasesTab)

    await waitFor(() => screen.getByText('sword'))

    const editBtn = screen.getByText('Edit')
    fireEvent.click(editBtn)

    // Gear slot dropdown
    expect(screen.getByText('Gear Slot')).toBeInTheDocument()
    // Should have Weapon and Armor options
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[]
    expect(selects.length).toBeGreaterThan(0)
  })
})

describe('ContentEditor - Character Classes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('class editor shows visual config with color pickers', async () => {
    render(<ContentEditor />)

    const classesTab = screen.getByText('Character Classes')
    fireEvent.click(classesTab)

    await waitFor(() => screen.getByText('drifter'))

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    await waitFor(() => screen.getByText('Edit #1'))

    // Should have Visual Config section
    expect(screen.getByText('Visual Config')).toBeInTheDocument()
    // Should have color picker labels
    expect(screen.getByText('primary_color')).toBeInTheDocument()
  })

  it('class editor shows stat affinities table', async () => {
    render(<ContentEditor />)

    const classesTab = screen.getByText('Character Classes')
    fireEvent.click(classesTab)

    await waitFor(() => screen.getByText('drifter'))

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    await waitFor(() => screen.getByText('Edit #1'))

    // Should have Stat Affinities section
    expect(screen.getByText('Stat Affinities')).toBeInTheDocument()
    // Should have Base Stats section
    expect(screen.getByText('Base Stats')).toBeInTheDocument()
  })

  it('class editor shows lore_blurb textarea', async () => {
    render(<ContentEditor />)

    const classesTab = screen.getByText('Character Classes')
    fireEvent.click(classesTab)

    await waitFor(() => screen.getByText('drifter'))

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    await waitFor(() => screen.getByText('Edit #1'))

    expect(screen.getByText('Lore Blurb')).toBeInTheDocument()
    const textareas = screen.getAllByRole('textbox') as HTMLTextAreaElement[]
    const loreTextarea = textareas.find(t => t.tagName === 'TEXTAREA' && t.value.includes('wanderer'))
    expect(loreTextarea).toBeTruthy()
  })

  it('class create includes affinities pre-populated', async () => {
    render(<ContentEditor />)

    const classesTab = screen.getByText('Character Classes')
    fireEvent.click(classesTab)

    await waitFor(() => screen.getByText('drifter'))

    const createBtn = screen.getByText(/\+ New/)
    fireEvent.click(createBtn)

    await waitFor(() => screen.getByText(/Create Character Class/))

    // Should have affinities section pre-populated
    expect(screen.getByText('Stat Affinities')).toBeInTheDocument()
  })

  it('class create saves with visual_config and affinities', async () => {
    render(<ContentEditor />)

    const classesTab = screen.getByText('Character Classes')
    fireEvent.click(classesTab)

    await waitFor(() => screen.getByText('drifter'))

    const createBtn = screen.getByText(/\+ New/)
    fireEvent.click(createBtn)

    await waitFor(() => screen.getByText(/Create Character Class/))

    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[]
    await userEvent.type(inputs[0], 'conduit')

    const saveBtn = screen.getByText('Save')
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        '/api/admin/game/classes',
        expect.objectContaining({ name: 'conduit' })
      )
    })
  })
})
