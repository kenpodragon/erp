import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AtmosphereEditor from './AtmosphereEditor'
import { api } from '../api'

/* ------------------------------------------------------------------ */
/* Mock Web Audio API                                                  */
/* ------------------------------------------------------------------ */

const mockOscillator = {
  type: 'sine',
  frequency: { value: 440, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}

const mockGain = {
  gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
  connect: vi.fn(),
}

const mockAudioCtx = {
  currentTime: 0,
  state: 'running',
  destination: {},
  createOscillator: vi.fn(() => ({ ...mockOscillator })),
  createGain: vi.fn(() => ({ ...mockGain })),
  resume: vi.fn(),
  close: vi.fn(() => Promise.resolve()),
}

globalThis.AudioContext = vi.fn(() => mockAudioCtx) as any

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const mockedApi = api as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

function makeAtmosphere(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Dark Sanctum',
    archetype: 'occult_sanctum',
    description: 'A dark and eerie atmosphere',
    generator_bpm: 80,
    generator_key: 'D',
    generator_scale: 'minor',
    generator_complexity: 7,
    scene_count: 5,
    chapter_count: 2,
    book_count: 1,
    ...overrides,
  }
}

function makeDetail(overrides: Record<string, unknown> = {}) {
  return {
    ...makeAtmosphere(),
    music_definitions: {
      explore: { bpm: 80, melody: { oscillator: 'square', volume: 0.3, sequence: [{ note: 'C4', beats: 1 }] } },
    },
    generator_seed: 42,
    assigned_scene_ids: [10, 20],
    assigned_chapters: [{ id: 1, title: 'Chapter One' }],
    assigned_books: [{ id: 1, title: 'Book One' }],
    ...overrides,
  }
}

function mockOk(body: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
}

function mockFail(status = 500, body: unknown = { detail: 'Server error' }) {
  return Promise.resolve({ ok: false, status, json: () => Promise.resolve(body) })
}

/* ------------------------------------------------------------------ */
/* Setup                                                               */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(window, 'confirm').mockReturnValue(true)

  mockedApi.get.mockImplementation((url: string) => {
    if (url === '/api/admin/atmospheres') return mockOk([makeAtmosphere()])
    if (url.match(/\/api\/admin\/atmospheres\/\d+/)) return mockOk(makeDetail())
    return mockOk([])
  })
  mockedApi.post.mockImplementation(() => mockOk({ id: 2, ...makeAtmosphere({ id: 2, name: 'New Atmo' }) }))
  mockedApi.put.mockImplementation(() => mockOk(makeAtmosphere()))
  mockedApi.delete.mockImplementation(() => mockOk({}))
})

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

describe('AtmosphereEditor', () => {
  it('renders the page heading', async () => {
    render(<AtmosphereEditor />)
    expect(screen.getByText('Atmosphere Editor')).toBeDefined()
  })

  it('fetches atmospheres on mount and renders the table', async () => {
    render(<AtmosphereEditor />)

    await waitFor(() => {
      expect(screen.getByText('Dark Sanctum')).toBeDefined()
    })

    expect(mockedApi.get).toHaveBeenCalledWith('/api/admin/atmospheres')
  })

  it('shows loading state initially', () => {
    mockedApi.get.mockImplementation(() => new Promise(() => {})) // never resolves
    render(<AtmosphereEditor />)
    expect(screen.getByText('Loading...')).toBeDefined()
  })

  it('shows empty state when no atmospheres exist', async () => {
    mockedApi.get.mockImplementation(() => mockOk([]))
    render(<AtmosphereEditor />)

    await waitFor(() => {
      expect(screen.getByText('No atmospheres found')).toBeDefined()
    })
  })

  it('renders table column headers', async () => {
    render(<AtmosphereEditor />)

    await waitFor(() => {
      expect(screen.getByText('Dark Sanctum')).toBeDefined()
    })
    expect(screen.getByText('Archetype')).toBeDefined()
    expect(screen.getByText('Scenes')).toBeDefined()
  })

  it('selects an atmosphere and loads detail', async () => {
    render(<AtmosphereEditor />)

    await waitFor(() => {
      expect(screen.getByText('Dark Sanctum')).toBeDefined()
    })

    fireEvent.click(screen.getByText('Dark Sanctum'))

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/api/admin/atmospheres/1')
    })

    await waitFor(() => {
      expect(screen.getByText('Chapter One')).toBeDefined()
    })
  })

  it('shows detail info fields after selecting atmosphere', async () => {
    render(<AtmosphereEditor />)

    await waitFor(() => expect(screen.getByText('Dark Sanctum')).toBeDefined())
    fireEvent.click(screen.getByText('Dark Sanctum'))

    await waitFor(() => {
      expect(screen.getByText('Assignments')).toBeDefined()
    })
    expect(screen.getByText('Music Definitions')).toBeDefined()
    expect(screen.getByText('2 scenes')).toBeDefined()
  })

  it('filters by archetype', async () => {
    const atmospheres = [
      makeAtmosphere({ id: 1, name: 'Dark Sanctum', archetype: 'occult_sanctum' }),
      makeAtmosphere({ id: 2, name: 'Training Field', archetype: 'training_grounds' }),
    ]
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/api/admin/atmospheres') return mockOk(atmospheres)
      return mockOk(makeDetail())
    })

    render(<AtmosphereEditor />)

    await waitFor(() => {
      expect(screen.getByText('Dark Sanctum')).toBeDefined()
      expect(screen.getByText('Training Field')).toBeDefined()
    })

    const filterSelect = screen.getByDisplayValue('All Archetypes')
    fireEvent.change(filterSelect, { target: { value: 'training_grounds' } })

    expect(screen.queryByText('Dark Sanctum')).toBeNull()
    expect(screen.getByText('Training Field')).toBeDefined()
  })

  it('enters create mode when clicking + Create', async () => {
    render(<AtmosphereEditor />)

    await waitFor(() => expect(screen.getByText('Dark Sanctum')).toBeDefined())

    fireEvent.click(screen.getByText('+ Create'))

    expect(screen.getByText('Create New Atmosphere')).toBeDefined()
  })

  it('create form has required fields', async () => {
    render(<AtmosphereEditor />)
    await waitFor(() => expect(screen.getByText('Dark Sanctum')).toBeDefined())

    fireEvent.click(screen.getByText('+ Create'))

    expect(screen.getByText('BPM')).toBeDefined()
    expect(screen.getByText('Key')).toBeDefined()
    expect(screen.getByText('Scale')).toBeDefined()
    expect(screen.getByText('Complexity')).toBeDefined()
    expect(screen.getByText('Seed')).toBeDefined()
    expect(screen.getByText('Description')).toBeDefined()
  })

  it('submits create form and calls POST', async () => {
    render(<AtmosphereEditor />)
    await waitFor(() => expect(screen.getByText('Dark Sanctum')).toBeDefined())

    fireEvent.click(screen.getByText('+ Create'))

    // Fill in name — first text input in the create form
    const inputs = screen.getAllByRole('textbox')
    const nameInput = inputs[0]
    fireEvent.change(nameInput, { target: { value: 'New Atmosphere' } })

    const createBtn = screen.getByRole('button', { name: 'Create' })
    fireEvent.click(createBtn)

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/api/admin/atmospheres',
        expect.objectContaining({ name: 'New Atmosphere' })
      )
    })
  })

  it('enters edit mode and populates fields', async () => {
    render(<AtmosphereEditor />)
    await waitFor(() => expect(screen.getByText('Dark Sanctum')).toBeDefined())

    fireEvent.click(screen.getByText('Dark Sanctum'))
    await waitFor(() => expect(screen.getByText('Assignments')).toBeDefined())

    fireEvent.click(screen.getByText('Edit'))

    expect(screen.getByDisplayValue('Dark Sanctum')).toBeDefined()
    expect(screen.getByDisplayValue('80')).toBeDefined()
    expect(screen.getByDisplayValue('D')).toBeDefined()
  })

  it('save in edit mode calls PUT with correct URL', async () => {
    render(<AtmosphereEditor />)
    await waitFor(() => expect(screen.getByText('Dark Sanctum')).toBeDefined())

    fireEvent.click(screen.getByText('Dark Sanctum'))
    await waitFor(() => expect(screen.getByText('Assignments')).toBeDefined())

    fireEvent.click(screen.getByText('Edit'))
    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(mockedApi.put).toHaveBeenCalledWith(
        '/api/admin/atmospheres/1',
        expect.objectContaining({ name: 'Dark Sanctum' })
      )
    })
  })

  it('delete calls DELETE with confirmation', async () => {
    render(<AtmosphereEditor />)
    await waitFor(() => expect(screen.getByText('Dark Sanctum')).toBeDefined())

    fireEvent.click(screen.getByText('Dark Sanctum'))
    await waitFor(() => expect(screen.getByText('Assignments')).toBeDefined())

    fireEvent.click(screen.getByText('Delete'))

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled()
      expect(mockedApi.delete).toHaveBeenCalledWith('/api/admin/atmospheres/1')
    })
  })

  it('delete is cancelled when user declines confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<AtmosphereEditor />)
    await waitFor(() => expect(screen.getByText('Dark Sanctum')).toBeDefined())

    fireEvent.click(screen.getByText('Dark Sanctum'))
    await waitFor(() => expect(screen.getByText('Assignments')).toBeDefined())

    fireEvent.click(screen.getByText('Delete'))

    expect(mockedApi.delete).not.toHaveBeenCalled()
  })

  it('handles API error on fetch list', async () => {
    mockedApi.get.mockImplementation(() => mockFail())
    render(<AtmosphereEditor />)

    await waitFor(() => {
      expect(screen.getByText('No atmospheres found')).toBeDefined()
    })
  })

  it('handles API error on save and shows message', async () => {
    mockedApi.put.mockImplementation(() => mockFail(400, { detail: 'Validation failed' }))

    render(<AtmosphereEditor />)
    await waitFor(() => expect(screen.getByText('Dark Sanctum')).toBeDefined())

    fireEvent.click(screen.getByText('Dark Sanctum'))
    await waitFor(() => expect(screen.getByText('Assignments')).toBeDefined())

    fireEvent.click(screen.getByText('Edit'))
    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(screen.getByText('Error: Validation failed')).toBeDefined()
    })
  })

  it('shows empty detail prompt when nothing selected', async () => {
    render(<AtmosphereEditor />)
    await waitFor(() => expect(screen.getByText('Dark Sanctum')).toBeDefined())

    expect(screen.getByText('Select an atmosphere or create a new one')).toBeDefined()
  })

  it('opens batch assign modal', async () => {
    render(<AtmosphereEditor />)
    await waitFor(() => expect(screen.getByText('Dark Sanctum')).toBeDefined())

    fireEvent.click(screen.getByText('Batch Assign'))

    expect(screen.getByText('Batch Assign Atmosphere')).toBeDefined()
    expect(screen.getByText('Target Type')).toBeDefined()
    expect(screen.getByText('Target ID')).toBeDefined()
  })

  it('batch assign modal cancel closes it', async () => {
    render(<AtmosphereEditor />)
    await waitFor(() => expect(screen.getByText('Dark Sanctum')).toBeDefined())

    fireEvent.click(screen.getByText('Batch Assign'))
    expect(screen.getByText('Batch Assign Atmosphere')).toBeDefined()

    fireEvent.click(screen.getByText('Cancel'))

    await waitFor(() => {
      expect(screen.queryByText('Batch Assign Atmosphere')).toBeNull()
    })
  })

  it('cancel in create mode exits create mode', async () => {
    render(<AtmosphereEditor />)
    await waitFor(() => expect(screen.getByText('Dark Sanctum')).toBeDefined())

    fireEvent.click(screen.getByText('+ Create'))
    expect(screen.getByText('Create New Atmosphere')).toBeDefined()

    const cancelBtns = screen.getAllByText('Cancel')
    fireEvent.click(cancelBtns[0])

    await waitFor(() => {
      expect(screen.queryByText('Create New Atmosphere')).toBeNull()
    })
  })

  it('handles create API error', async () => {
    mockedApi.post.mockImplementation(() => mockFail(400, { detail: 'Name required' }))

    render(<AtmosphereEditor />)
    await waitFor(() => expect(screen.getByText('Dark Sanctum')).toBeDefined())

    fireEvent.click(screen.getByText('+ Create'))

    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: 'Test' } })

    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(screen.getByText('Error: Name required')).toBeDefined()
    })
  })
})
