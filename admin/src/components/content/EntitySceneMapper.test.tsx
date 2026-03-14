import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('./shared/EntityPicker', () => ({
  default: ({ value, onChange, placeholder }: any) => (
    <div data-testid="entity-picker">
      <button onClick={() => onChange(5, 'Test Entity')}>{placeholder || 'Select entity'}</button>
    </div>
  ),
}))

import { api } from '../../api'
import EntitySceneMapper from './EntitySceneMapper'

function mockResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: () => Promise.resolve(data) }
}

const BOOKS = [
  { id: 1, book_number: 1, title: 'First Tower' },
]

const CHAPTERS = [
  { id: 10, chapter_number: 1, title: 'Awakening' },
]

const SCENES = [
  { id: 100, scene_number: 1, title: 'Intro', entities_count: 2 },
  { id: 101, scene_number: 2, title: 'Battle', entities_count: 0 },
]

const MAPPINGS = [
  { id: 500, entity_id: 1, scene_id: 100, entity_name: 'Shadow Beast', role: 'antagonist', is_present: true, description_delta: null, emotional_state_delta: null, equipment_delta: null, entry_context: null, exit_reason: null, relationships: null },
  { id: 501, entity_id: 2, scene_id: 100, entity_name: 'Elara', role: 'protagonist', is_present: true, description_delta: null, emotional_state_delta: null, equipment_delta: null, entry_context: null, exit_reason: null, relationships: null },
]

describe('EntitySceneMapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/api/admin/content/books')) return Promise.resolve(mockResponse(BOOKS) as Response)
      if (path.includes('/api/admin/content/chapters?book_id=1')) return Promise.resolve(mockResponse(CHAPTERS) as Response)
      if (path.includes('/api/admin/content/scenes?chapter_id=10')) return Promise.resolve(mockResponse(SCENES) as Response)
      if (path.includes('/api/admin/content/entity-scenes?scene_id=100')) return Promise.resolve(mockResponse(MAPPINGS) as Response)
      return Promise.resolve(mockResponse([]) as Response)
    })
    vi.mocked(api.post).mockResolvedValue(mockResponse({ id: 502 }) as Response)
    vi.mocked(api.patch).mockResolvedValue(mockResponse({ ok: true }) as Response)
    vi.mocked(api.delete).mockResolvedValue(mockResponse({ ok: true }) as Response)
  })

  it('renders tree view with books/chapters/scenes', async () => {
    render(<EntitySceneMapper />)

    // Should show Scene Tree label
    expect(screen.getByText('Scene Tree')).toBeInTheDocument()

    // Book should load
    await waitFor(() => {
      expect(screen.getByText('Book 1: First Tower')).toBeInTheDocument()
    })

    // Should show empty message for right panel
    expect(screen.getByText('Select a scene from the tree to view entity assignments.')).toBeInTheDocument()
  })

  it('selecting scene loads entity list', async () => {
    render(<EntitySceneMapper />)

    await waitFor(() => screen.getByText('Book 1: First Tower'))

    // Expand the book
    fireEvent.click(screen.getByText('Book 1: First Tower'))

    await waitFor(() => {
      expect(screen.getByText('Ch 1: Awakening')).toBeInTheDocument()
    })

    // Expand the chapter
    fireEvent.click(screen.getByText('Ch 1: Awakening'))

    await waitFor(() => {
      expect(screen.getByText(/Scene 1: Intro/)).toBeInTheDocument()
    })

    // Click on a scene
    fireEvent.click(screen.getByText(/Scene 1: Intro/))

    await waitFor(() => {
      expect(screen.getByText('Shadow Beast')).toBeInTheDocument()
      expect(screen.getByText('Elara')).toBeInTheDocument()
    })
  })

  it('add entity to scene', async () => {
    render(<EntitySceneMapper />)

    await waitFor(() => screen.getByText('Book 1: First Tower'))

    // Navigate to scene
    fireEvent.click(screen.getByText('Book 1: First Tower'))
    await waitFor(() => screen.getByText('Ch 1: Awakening'))
    fireEvent.click(screen.getByText('Ch 1: Awakening'))
    await waitFor(() => screen.getByText(/Scene 1: Intro/))
    fireEvent.click(screen.getByText(/Scene 1: Intro/))

    await waitFor(() => screen.getByText('Shadow Beast'))

    // Use the entity picker to add an entity
    fireEvent.click(screen.getByText('Add entity to scene...'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/admin/content/entity-scenes',
        expect.objectContaining({ entity_id: 5, scene_id: 100, is_present: true })
      )
    })
  })

  it('bulk add entities', async () => {
    render(<EntitySceneMapper />)

    await waitFor(() => screen.getByText('Book 1: First Tower'))

    // Navigate to scene
    fireEvent.click(screen.getByText('Book 1: First Tower'))
    await waitFor(() => screen.getByText('Ch 1: Awakening'))
    fireEvent.click(screen.getByText('Ch 1: Awakening'))
    await waitFor(() => screen.getByText(/Scene 1: Intro/))
    fireEvent.click(screen.getByText(/Scene 1: Intro/))

    await waitFor(() => screen.getByText('Shadow Beast'))

    // Click "Copy From..." button
    fireEvent.click(screen.getByText('Copy From...'))

    // Copy dialog should appear
    await waitFor(() => {
      expect(screen.getByText('Copy Entities From Another Scene')).toBeInTheDocument()
    })

    // Enter source scene ID
    const sourceInput = screen.getByPlaceholderText('Source Scene ID')
    fireEvent.change(sourceInput, { target: { value: '50' } })

    // Click Copy button
    fireEvent.click(screen.getByText('Copy'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/admin/content/entity-scenes/copy',
        { source_scene_id: 50, target_scene_id: 100 }
      )
    })
  })

  it('remove entity from scene', async () => {
    render(<EntitySceneMapper />)

    await waitFor(() => screen.getByText('Book 1: First Tower'))

    // Navigate to scene
    fireEvent.click(screen.getByText('Book 1: First Tower'))
    await waitFor(() => screen.getByText('Ch 1: Awakening'))
    fireEvent.click(screen.getByText('Ch 1: Awakening'))
    await waitFor(() => screen.getByText(/Scene 1: Intro/))
    fireEvent.click(screen.getByText(/Scene 1: Intro/))

    await waitFor(() => screen.getByText('Shadow Beast'))

    // Click Remove on the first mapping
    const removeButtons = screen.getAllByText('Remove')
    fireEvent.click(removeButtons[0])

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/admin/content/entity-scenes/500')
    })
  })
})
