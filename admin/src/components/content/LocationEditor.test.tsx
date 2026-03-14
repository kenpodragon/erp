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

vi.mock('./shared/AtmospherePicker', () => ({
  default: ({ value, onChange }: any) => <select data-testid="atmosphere-picker"><option value="">None</option></select>,
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
import LocationEditor from './LocationEditor'

function mockResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: () => Promise.resolve(data) }
}

const LOCATION_TYPES = ['interior', 'exterior', 'underground', 'aerial']

const LOCATIONS = {
  items: [
    { id: 1, canonical_name: 'Tower Base', location_type: 'interior', description: 'The base of the tower', first_appearance_book_id: 1, first_appearance_chapter_id: null, first_appearance_scene_id: null, archetype_id: null, visual: 'Dim stone walls', auditory: 'Dripping water', olfactory: 'Musty', tactile: 'Cold stone', atmosphere: 'Foreboding', scene_count: 3, alias_count: 2, aliases: ['Base', 'Ground Floor'] },
    { id: 2, canonical_name: 'Sky Bridge', location_type: 'aerial', description: null, first_appearance_book_id: null, first_appearance_chapter_id: null, first_appearance_scene_id: null, archetype_id: 1, visual: null, auditory: null, olfactory: null, tactile: null, atmosphere: null, scene_count: 0, alias_count: 0, aliases: [] },
  ],
  total: 2,
}

const SCENE_APPEARANCES = [
  { scene_id: 100, scene_title: 'Intro', visual_delta: 'Darker than usual', atmosphere_delta: null },
  { scene_id: 101, scene_title: 'Battle', visual_delta: null, atmosphere_delta: 'More tense' },
]

describe('LocationEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/api/admin/content/locations/types')) return Promise.resolve(mockResponse(LOCATION_TYPES) as Response)
      if (path.includes('/api/admin/content/locations/') && path.includes('/scenes')) return Promise.resolve(mockResponse(SCENE_APPEARANCES) as Response)
      if (path.includes('/api/admin/content/locations')) return Promise.resolve(mockResponse(LOCATIONS) as Response)
      return Promise.resolve(mockResponse([]) as Response)
    })
    vi.mocked(api.post).mockResolvedValue(mockResponse({ id: 3 }) as Response)
    vi.mocked(api.patch).mockResolvedValue(mockResponse({ ok: true }) as Response)
    vi.mocked(api.delete).mockResolvedValue(mockResponse({ ok: true }) as Response)
  })

  it('renders and loads locations with pagination', async () => {
    render(<LocationEditor />)

    await waitFor(() => {
      expect(screen.getByText('Tower Base')).toBeInTheDocument()
      expect(screen.getByText('Sky Bridge')).toBeInTheDocument()
    })

    expect(screen.getByText('2 locations')).toBeInTheDocument()
  })

  it('creates new location with sensory fields', async () => {
    render(<LocationEditor />)

    await waitFor(() => screen.getByText('Tower Base'))

    fireEvent.click(screen.getByText('+ New Location'))

    await waitFor(() => {
      expect(screen.getByText('Create Location')).toBeInTheDocument()
    })

    // Fill in name
    const nameInput = screen.getByText('Canonical Name').closest('.form-field')!.querySelector('input')!
    await userEvent.type(nameInput, 'Crystal Chamber')

    // Should have sensory fields
    expect(screen.getByText('Sensory Details')).toBeInTheDocument()
    expect(screen.getByText('visual')).toBeInTheDocument()
    expect(screen.getByText('auditory')).toBeInTheDocument()
    expect(screen.getByText('olfactory')).toBeInTheDocument()
    expect(screen.getByText('tactile')).toBeInTheDocument()
    expect(screen.getByText('atmosphere')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/admin/content/locations',
        expect.objectContaining({ canonical_name: 'Crystal Chamber' })
      )
    })
  })

  it('updates location', async () => {
    render(<LocationEditor />)

    await waitFor(() => screen.getByText('Tower Base'))

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Edit Location #1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/api/admin/content/locations/1',
        expect.objectContaining({ canonical_name: 'Tower Base' })
      )
    })
  })

  it('manages aliases', async () => {
    render(<LocationEditor />)

    await waitFor(() => screen.getByText('Tower Base'))

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    await waitFor(() => screen.getByText('Edit Location #1'))

    // Should show existing aliases
    expect(screen.getByText('Base')).toBeInTheDocument()
    expect(screen.getByText('Ground Floor')).toBeInTheDocument()

    // Add a new alias
    const aliasInput = screen.getByPlaceholderText('New alias...')
    await userEvent.type(aliasInput, 'Entrance')
    fireEvent.click(screen.getByText('Add'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/admin/content/locations/1/aliases',
        { alias: 'Entrance' }
      )
    })

    // Remove an alias
    const baseElement = screen.getByText('Base')
    const removeBtn = baseElement.closest('.inline-list-item')!.querySelector('.remove-btn')!
    fireEvent.click(removeBtn)

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(
        '/api/admin/content/locations/1/aliases',
        { alias: 'Base' }
      )
    })
  })

  it('shows scene appearances (read-only)', async () => {
    render(<LocationEditor />)

    await waitFor(() => screen.getByText('Tower Base'))

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    await waitFor(() => screen.getByText('Edit Location #1'))

    // Should show Scene Appearances section
    await waitFor(() => {
      expect(screen.getByText('Scene Appearances')).toBeInTheDocument()
    })

    // Should show scene appearance data
    expect(screen.getByText('Intro')).toBeInTheDocument()
    expect(screen.getByText('Darker than usual')).toBeInTheDocument()
    expect(screen.getByText('Battle')).toBeInTheDocument()
    expect(screen.getByText('More tense')).toBeInTheDocument()
  })
})
