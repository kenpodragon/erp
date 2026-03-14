import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

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
import ClassificationEditor from './ClassificationEditor'
import EntityTypeManager from './EntityTypeManager'
import EntityFamilyManager from './EntityFamilyManager'

function mockResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: () => Promise.resolve(data) }
}

const ENTITY_TYPES = [
  { id: 1, name: 'enemy', display_name: 'Enemy', description: 'Hostile entities', color_hex: '#cc3333', sort_order: 1, entity_count: 42 },
  { id: 2, name: 'character', display_name: 'Character', description: 'Player characters', color_hex: '#3399cc', sort_order: 2, entity_count: 10 },
  { id: 3, name: 'npc', display_name: 'NPC', description: 'Non-player characters', color_hex: '#33cc33', sort_order: 3, entity_count: 5 },
]

const ENTITY_FAMILIES = {
  items: [
    { id: 1, name: 'shadows', display_name: 'Shadows', description: 'Shadow creatures', icon_key: null, lore_reference: null, base_stat_template: null, sort_order: 1, entity_count: 8 },
    { id: 2, name: 'undead', display_name: 'Undead', description: 'Undead beings', icon_key: 'skull', lore_reference: 'Book 1', base_stat_template: { strength: 5, agility: 2, intelligence: 1, base_hp: 100, base_gold: 10 }, sort_order: 2, entity_count: 12 },
    { id: 3, name: 'mechanical', display_name: 'Mechanical', description: 'Clockwork constructs', icon_key: 'gear', lore_reference: null, base_stat_template: null, sort_order: 3, entity_count: 3 },
  ],
  total: 3,
}

describe('ClassificationEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/api/admin/classification/entity-types')) return Promise.resolve(mockResponse(ENTITY_TYPES) as Response)
      if (path.includes('/api/admin/classification/entity-families')) return Promise.resolve(mockResponse(ENTITY_FAMILIES) as Response)
      return Promise.resolve(mockResponse([]) as Response)
    })
    vi.mocked(api.post).mockResolvedValue(mockResponse({ id: 10 }) as Response)
    vi.mocked(api.patch).mockResolvedValue(mockResponse({ ok: true }) as Response)
    vi.mocked(api.delete).mockResolvedValue(mockResponse({ ok: true }) as Response)
  })

  it('renders with 6 sub-tabs', async () => {
    render(<ClassificationEditor />)

    expect(screen.getByText('Entity Types')).toBeInTheDocument()
    expect(screen.getByText('Families')).toBeInTheDocument()
    expect(screen.getByText('Attack Types')).toBeInTheDocument()
    expect(screen.getByText('Visual Behaviors')).toBeInTheDocument()
    expect(screen.getByText('Bulk Assignment')).toBeInTheDocument()
    expect(screen.getByText('Audit')).toBeInTheDocument()
  })

  it('clicking sub-tabs switches content', async () => {
    render(<ClassificationEditor />)

    // Default tab is Entity Types — wait for its content to load
    await waitFor(() => {
      expect(screen.getByText('Enemy')).toBeInTheDocument()
    })

    // Click Families tab
    fireEvent.click(screen.getByText('Families'))

    await waitFor(() => {
      expect(screen.getByText('Shadows')).toBeInTheDocument()
    })
  })
})

describe('EntityTypeManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/api/admin/classification/entity-types')) return Promise.resolve(mockResponse(ENTITY_TYPES) as Response)
      return Promise.resolve(mockResponse([]) as Response)
    })
    vi.mocked(api.post).mockResolvedValue(mockResponse({ id: 10 }) as Response)
    vi.mocked(api.patch).mockResolvedValue(mockResponse({ ok: true }) as Response)
    vi.mocked(api.delete).mockResolvedValue(mockResponse({ ok: true }) as Response)
  })

  it('renders entity type list from mock API', async () => {
    render(<EntityTypeManager />)

    await waitFor(() => {
      expect(screen.getByText('Enemy')).toBeInTheDocument()
      expect(screen.getByText('Character')).toBeInTheDocument()
      expect(screen.getByText('NPC')).toBeInTheDocument()
    })

    expect(screen.getByText('3 entity types')).toBeInTheDocument()
  })

  it('opens edit form on edit click', async () => {
    render(<EntityTypeManager />)

    await waitFor(() => screen.getByText('Enemy'))

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Edit Entity Type #1')).toBeInTheDocument()
    })

    // Form should be populated with enemy data
    const nameInput = screen.getByDisplayValue('enemy')
    expect(nameInput).toBeInTheDocument()

    const displayNameInput = screen.getByDisplayValue('Enemy')
    expect(displayNameInput).toBeInTheDocument()
  })

  it('creates a new entity type', async () => {
    render(<EntityTypeManager />)

    await waitFor(() => screen.getByText('Enemy'))

    fireEvent.click(screen.getByText('+ New Type'))

    await waitFor(() => {
      expect(screen.getByText('Create Entity Type')).toBeInTheDocument()
    })

    // Fill form
    const nameInput = screen.getByPlaceholderText('e.g. enemy')
    await userEvent.type(nameInput, 'beast')

    const displayNameInput = screen.getByPlaceholderText('e.g. Enemy')
    await userEvent.type(displayNameInput, 'Beast')

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/admin/classification/entity-types',
        expect.objectContaining({ name: 'beast', display_name: 'Beast' })
      )
    })
  })
})

describe('EntityFamilyManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/api/admin/classification/entity-families')) return Promise.resolve(mockResponse(ENTITY_FAMILIES) as Response)
      return Promise.resolve(mockResponse([]) as Response)
    })
    vi.mocked(api.post).mockResolvedValue(mockResponse({ id: 10 }) as Response)
    vi.mocked(api.patch).mockResolvedValue(mockResponse({ ok: true }) as Response)
    vi.mocked(api.delete).mockResolvedValue(mockResponse({ ok: true }) as Response)
  })

  it('renders family list', async () => {
    render(<EntityFamilyManager />)

    await waitFor(() => {
      expect(screen.getByText('Shadows')).toBeInTheDocument()
      expect(screen.getByText('Undead')).toBeInTheDocument()
      expect(screen.getByText('Mechanical')).toBeInTheDocument()
    })

    expect(screen.getByText('3 families')).toBeInTheDocument()
  })

  it('search filters the list', async () => {
    render(<EntityFamilyManager />)

    await waitFor(() => screen.getByText('Shadows'))

    const searchInput = screen.getByPlaceholderText('Search families...')
    await userEvent.type(searchInput, 'undead')

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('search=undead'))
    })
  })
})

// NOTE: CombatStage.tsx (frontend) still references entity_type as a string in the
// rareSpawn prop interface (line 88):
//   rareSpawn?: { entity_id: number; canonical_name: string; entity_type: string; entity_family: string | null; ... }
// This needs to be updated in a future pass to use entity_type_id (number) and
// entity_family_id (number | null) to match the new FK-based classification system.
// The backend endpoint supplying rare spawn data will also need to return the new FK fields.
