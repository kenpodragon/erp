import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import AtmosphereEditor from './AtmosphereEditor'
import { api } from '../api'

vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

function mockResponse(data: unknown, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(data) }
}

const ATMOSPHERES = [
  {
    id: 1, name: 'Mundane Dread', archetype: 'mundane_dread', description: 'Test',
    generator_bpm: 100, generator_key: 'C', generator_scale: 'minor',
    generator_complexity: 5, scene_count: 3, chapter_count: 1, book_count: 0,
  },
  {
    id: 2, name: 'Occult Sanctum', archetype: 'occult_sanctum', description: 'Occult',
    generator_bpm: 80, generator_key: 'A', generator_scale: 'minor',
    generator_complexity: 6, scene_count: 0, chapter_count: 0, book_count: 1,
  },
]

const DETAIL = {
  ...ATMOSPHERES[0],
  music_definitions: { explore: { bpm: 100 }, combat: null, boss: null, mystery: null },
  generator_seed: 42,
  assigned_scene_ids: [1, 2, 3],
  assigned_chapters: [{ id: 1, title: 'Chapter 1' }],
  assigned_books: [],
}

describe('AtmosphereEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/atmospheres/')) return Promise.resolve(mockResponse(DETAIL) as Response)
      return Promise.resolve(mockResponse(ATMOSPHERES) as Response)
    })
  })

  it('renders loading state', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    render(<AtmosphereEditor />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders atmosphere list after fetch', async () => {
    render(<AtmosphereEditor />)
    await waitFor(() => {
      expect(screen.getByText('Mundane Dread')).toBeInTheDocument()
      expect(screen.getByText('Occult Sanctum')).toBeInTheDocument()
    })
  })

  it('shows correct column headers', async () => {
    render(<AtmosphereEditor />)
    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Archetype')).toBeInTheDocument()
      expect(screen.getByText('Scenes')).toBeInTheDocument()
    })
  })

  it('shows detail panel when atmosphere is clicked', async () => {
    render(<AtmosphereEditor />)
    await waitFor(() => screen.getByText('Mundane Dread'))

    fireEvent.click(screen.getByText('Mundane Dread'))

    await waitFor(() => {
      expect(screen.getByText('explore')).toBeInTheDocument()
      expect(screen.getByText('3 scenes')).toBeInTheDocument()
    })
  })

  it('shows create form when Create button clicked', async () => {
    render(<AtmosphereEditor />)
    await waitFor(() => screen.getByText('+ Create'))

    fireEvent.click(screen.getByText('+ Create'))

    expect(screen.getByText('Create New Atmosphere')).toBeInTheDocument()
  })

  it('calls POST on create', async () => {
    vi.mocked(api.post).mockResolvedValue(mockResponse({ id: 99, name: 'New' }) as Response)
    render(<AtmosphereEditor />)
    await waitFor(() => screen.getByText('+ Create'))

    fireEvent.click(screen.getByText('+ Create'))
    const nameInput = screen.getAllByRole('textbox')[0]
    fireEvent.change(nameInput, { target: { value: 'New Atmosphere' } })
    fireEvent.click(screen.getByText('Create'))

    await waitFor(() => {
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        '/api/admin/atmospheres',
        expect.objectContaining({ name: 'New Atmosphere' })
      )
    })
  })

  it('calls DELETE on delete', async () => {
    vi.mocked(api.delete).mockResolvedValue(mockResponse({ deleted: true }) as Response)
    window.confirm = vi.fn(() => true)

    render(<AtmosphereEditor />)
    await waitFor(() => screen.getByText('Mundane Dread'))
    fireEvent.click(screen.getByText('Mundane Dread'))

    await waitFor(() => screen.getByText('Delete'))
    fireEvent.click(screen.getByText('Delete'))

    await waitFor(() => {
      expect(vi.mocked(api.delete)).toHaveBeenCalledWith('/api/admin/atmospheres/1')
    })
  })

  it('filters by archetype', async () => {
    render(<AtmosphereEditor />)
    await waitFor(() => screen.getByText('Mundane Dread'))

    const filter = screen.getByRole('combobox')
    fireEvent.change(filter, { target: { value: 'occult_sanctum' } })

    expect(screen.queryByText('Mundane Dread')).not.toBeInTheDocument()
    expect(screen.getByText('Occult Sanctum')).toBeInTheDocument()
  })

  it('shows batch assign modal', async () => {
    render(<AtmosphereEditor />)
    await waitFor(() => screen.getByText('Batch Assign'))

    fireEvent.click(screen.getByText('Batch Assign'))
    expect(screen.getByText('Batch Assign Atmosphere')).toBeInTheDocument()
  })

  it('shows edit form when Edit button clicked', async () => {
    render(<AtmosphereEditor />)
    await waitFor(() => screen.getByText('Mundane Dread'))
    fireEvent.click(screen.getByText('Mundane Dread'))

    await waitFor(() => screen.getByText('Edit'))
    fireEvent.click(screen.getByText('Edit'))

    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('shows empty state when no atmosphere selected', async () => {
    render(<AtmosphereEditor />)
    await waitFor(() => {
      expect(screen.getByText('Select an atmosphere or create a new one')).toBeInTheDocument()
    })
  })
})
