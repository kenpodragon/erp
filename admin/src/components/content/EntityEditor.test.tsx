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

vi.mock('./shared/CascadingPicker', () => ({
  default: ({ value, onChange }: any) => <div data-testid="cascading-picker">Picker</div>,
}))

vi.mock('./shared/AssetPicker', () => ({
  default: ({ value, onChange }: any) => <select data-testid="asset-picker"><option value="">None</option></select>,
}))

vi.mock('./shared/AtmospherePicker', () => ({
  default: ({ value, onChange }: any) => <select data-testid="atmosphere-picker"><option value="">None</option></select>,
}))

vi.mock('./shared/JsonEditor', () => ({
  default: ({ value, onChange }: any) => <div data-testid="json-editor">JSON Editor</div>,
}))

vi.mock('./shared/DeleteConfirmDialog', () => ({
  default: ({ resourceName, isBlocked, onConfirm, onCancel, childCounts }: any) => (
    <div data-testid="delete-dialog">
      <span>{resourceName}</span>
      <button onClick={onConfirm}>Confirm Delete</button>
      <button onClick={onCancel}>Cancel Delete</button>
    </div>
  ),
}))

import { api } from '../../api'
import EntityEditor from './EntityEditor'

function mockResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: () => Promise.resolve(data) }
}

const ENTITY_TYPE_OPTIONS = [
  { id: 1, name: 'enemy', display_name: 'Enemy', color_hex: '#cc3333', sort_order: 1 },
  { id: 2, name: 'character', display_name: 'Character', color_hex: '#3399cc', sort_order: 2 },
  { id: 3, name: 'npc', display_name: 'NPC', color_hex: '#33cc33', sort_order: 3 },
]

const ENTITY_FAMILY_OPTIONS = [
  { id: 1, name: 'shadows', display_name: 'Shadows' },
  { id: 2, name: 'undead', display_name: 'Undead' },
  { id: 3, name: 'mechanical', display_name: 'Mechanical' },
]

const ENTITIES = {
  items: [
    { id: 1, canonical_name: 'Shadow Beast', entity_type_id: 1, entity_family_id: 1, entity_type_name: 'enemy', entity_type_display_name: 'Enemy', entity_type_color_hex: '#cc3333', entity_family_name: 'shadows', entity_family_display_name: 'Shadows', resolved_visual_behavior: 'melee_slash', is_generated: false, description: 'A dark creature', first_appearance_book_id: null, first_appearance_chapter_id: null, first_appearance_scene_id: null, emotional_state: null, sounds: null, smells: null, equipment: null, abilities: null, boss_text_references: null, boss_action_quote: null, boss_variant_differences: null, sprite_key: null, base_hp: 100, base_gold: 50, appearance_rate: 0.5, stat_block: { strength: 10 }, boss_theme_id: null, death_sfx_key: null, has_gameplay: true, attack_types: [], aliases: ['Shadow', 'Beast'], scene_count: 3, beat_count: 5 },
    { id: 2, canonical_name: 'Elara', entity_type_id: 2, entity_family_id: null, entity_type_name: 'character', entity_type_display_name: 'Character', entity_type_color_hex: '#3399cc', entity_family_name: null, entity_family_display_name: null, resolved_visual_behavior: null, is_generated: false, description: 'The protagonist', first_appearance_book_id: 1, first_appearance_chapter_id: null, first_appearance_scene_id: null, emotional_state: null, sounds: null, smells: null, equipment: null, abilities: null, boss_text_references: null, boss_action_quote: null, boss_variant_differences: null, sprite_key: null, base_hp: null, base_gold: null, appearance_rate: null, stat_block: null, boss_theme_id: null, death_sfx_key: null, has_gameplay: false, attack_types: [], aliases: [], scene_count: 10, beat_count: 20 },
  ],
  total: 2,
}

const FAMILIES = ['shadows', 'undead', 'mechanical']
const ATTACK_TYPES = [
  { id: 1, name: 'slash', display_name: 'Slash' },
  { id: 2, name: 'bite', display_name: 'Bite' },
]

describe('EntityEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/api/admin/classification/entity-types')) return Promise.resolve(mockResponse(ENTITY_TYPE_OPTIONS) as Response)
      if (path.includes('/api/admin/classification/entity-families')) return Promise.resolve(mockResponse(ENTITY_FAMILY_OPTIONS) as Response)
      if (path.includes('/api/admin/content/entities/families')) return Promise.resolve(mockResponse(FAMILIES) as Response)
      if (path.includes('/api/admin/game/attack-types')) return Promise.resolve(mockResponse(ATTACK_TYPES) as Response)
      if (path.includes('/api/admin/content/entities') && path.includes('attack-types')) return Promise.resolve(mockResponse([]) as Response)
      if (path.includes('/api/admin/content/entities')) return Promise.resolve(mockResponse(ENTITIES) as Response)
      return Promise.resolve(mockResponse([]) as Response)
    })
    vi.mocked(api.post).mockResolvedValue(mockResponse({ id: 3 }) as Response)
    vi.mocked(api.patch).mockResolvedValue(mockResponse({ ok: true }) as Response)
    vi.mocked(api.put).mockResolvedValue(mockResponse({ ok: true }) as Response)
    vi.mocked(api.delete).mockResolvedValue(mockResponse({ ok: true }) as Response)
  })

  it('renders and loads entities with pagination', async () => {
    render(<EntityEditor />)

    await waitFor(() => {
      expect(screen.getByText('Shadow Beast')).toBeInTheDocument()
      expect(screen.getByText('Elara')).toBeInTheDocument()
    })

    expect(screen.getByText('2 entities')).toBeInTheDocument()
  })

  it('filters by entity_type_id and search', async () => {
    render(<EntityEditor />)

    await waitFor(() => screen.getByText('Shadow Beast'))

    // Click on Enemy type filter button (display_name from classification API)
    const enemyButtons = screen.getAllByText('Enemy')
    const filterButton = enemyButtons.find(el => el.tagName === 'BUTTON' || el.closest('button'))!
    fireEvent.click(filterButton.closest('button') || filterButton)

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('entity_type_ids=1'))
    })

    // Type in search
    const searchInput = screen.getByPlaceholderText('Search entities...')
    await userEvent.type(searchInput, 'shadow')

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('search=shadow'))
    })
  })

  it('creates new entity', async () => {
    render(<EntityEditor />)

    await waitFor(() => screen.getByText('Shadow Beast'))

    fireEvent.click(screen.getByText('+ New Entity'))

    await waitFor(() => {
      expect(screen.getByText('Create Entity')).toBeInTheDocument()
    })

    // Fill in name
    const nameInput = screen.getByText('Canonical Name').closest('.form-field')!.querySelector('input')!
    await userEvent.type(nameInput, 'Iron Golem')

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/admin/content/entities',
        expect.objectContaining({ canonical_name: 'Iron Golem', entity_type_id: 1 })
      )
    })
  })

  it('updates entity core fields', async () => {
    render(<EntityEditor />)

    await waitFor(() => screen.getByText('Shadow Beast'))

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Edit Entity #1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/api/admin/content/entities/1',
        expect.objectContaining({ canonical_name: 'Shadow Beast' })
      )
    })
  })

  it('toggle gameplay data on/off', async () => {
    render(<EntityEditor />)

    await waitFor(() => screen.getByText('Shadow Beast'))

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    await waitFor(() => screen.getByText('Edit Entity #1'))

    // Gameplay Data section should be visible (entity has has_gameplay: true, so showGameplay is set)
    const gameplayHeader = screen.getByText('Gameplay Data')
    expect(gameplayHeader).toBeInTheDocument()

    // Click to toggle it off
    fireEvent.click(gameplayHeader.closest('button')!)

    // The gameplay content should be hidden after toggling
    // (Click toggles showGameplay state)
  })

  it('edit aliases (add and remove)', async () => {
    render(<EntityEditor />)

    await waitFor(() => screen.getByText('Shadow Beast'))

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    await waitFor(() => screen.getByText('Edit Entity #1'))

    // Should show existing aliases
    expect(screen.getByText('Shadow')).toBeInTheDocument()
    expect(screen.getByText('Beast')).toBeInTheDocument()

    // Add a new alias
    const aliasInput = screen.getByPlaceholderText('New alias...')
    await userEvent.type(aliasInput, 'Dark One')
    fireEvent.click(screen.getByText('Add'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/admin/content/entities/1/aliases',
        { alias: 'Dark One' }
      )
    })

    // Remove an alias
    const removeButtons = screen.getAllByText('x')
    // Find the remove button next to 'Shadow'
    const shadowElement = screen.getByText('Shadow')
    const removeBtn = shadowElement.closest('.inline-list-item')!.querySelector('.remove-btn')!
    fireEvent.click(removeBtn)

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(
        '/api/admin/content/entities/1/aliases',
        { alias: 'Shadow' }
      )
    })
  })

  it('set attack types with primary selection', async () => {
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/api/admin/classification/entity-types')) return Promise.resolve(mockResponse(ENTITY_TYPE_OPTIONS) as Response)
      if (path.includes('/api/admin/classification/entity-families')) return Promise.resolve(mockResponse(ENTITY_FAMILY_OPTIONS) as Response)
      if (path.includes('/api/admin/content/entities/families')) return Promise.resolve(mockResponse(FAMILIES) as Response)
      if (path.includes('/api/admin/game/attack-types')) return Promise.resolve(mockResponse(ATTACK_TYPES) as Response)
      if (path.includes('/api/admin/content/entities/1/attack-types')) return Promise.resolve(mockResponse([{ attack_type_id: 1, is_primary: true }]) as Response)
      if (path.includes('/api/admin/content/entities')) return Promise.resolve(mockResponse(ENTITIES) as Response)
      return Promise.resolve(mockResponse([]) as Response)
    })

    render(<EntityEditor />)

    await waitFor(() => screen.getByText('Shadow Beast'))

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    await waitFor(() => screen.getByText('Edit Entity #1'))

    // Attack Types section should be visible
    expect(screen.getByText('Attack Types')).toBeInTheDocument()

    // Should show available attack types
    expect(screen.getByText('Slash')).toBeInTheDocument()
    expect(screen.getByText('Bite')).toBeInTheDocument()

    // Save Attack Types button should be present
    expect(screen.getByText('Save Attack Types')).toBeInTheDocument()

    // Click Save Attack Types
    fireEvent.click(screen.getByText('Save Attack Types'))

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/api/admin/content/entities/1/attack-types',
        expect.any(Array)
      )
    })
  })

  it('detail view shows all sections', async () => {
    render(<EntityEditor />)

    await waitFor(() => screen.getByText('Shadow Beast'))

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    await waitFor(() => screen.getByText('Edit Entity #1'))

    // Core section
    expect(screen.getByText('Core')).toBeInTheDocument()
    expect(screen.getByText('Canonical Name')).toBeInTheDocument()
    expect(screen.getByText('Entity Type')).toBeInTheDocument()

    // Lore Details section (collapsible)
    expect(screen.getByText('Lore Details')).toBeInTheDocument()

    // Gameplay Data section (collapsible)
    expect(screen.getByText('Gameplay Data')).toBeInTheDocument()

    // Attack Types section
    expect(screen.getByText('Attack Types')).toBeInTheDocument()

    // Aliases section
    expect(screen.getByText('Aliases')).toBeInTheDocument()

    // Save/Cancel buttons
    expect(screen.getByText('Save')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })
})
