import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import SFXConfigEditor from './SFXConfigEditor'
import { api } from '../api'

vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
  },
}))

function mockResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: () => Promise.resolve(data) }
}

const CONFIGS = [
  {
    id: 1, config_key: 'sfx_click', category: 'combat', display_name: 'Player Click',
    preset_definition: { oscillator_type: 'square', frequency_start: 660, frequency_end: 440, duration_ms: 80 },
    base_volume: 0.6, pitch_variation: 0.08, spatial_enabled: true,
  },
  {
    id: 2, config_key: 'sfx_crit', category: 'combat', display_name: 'Critical Hit',
    preset_definition: { oscillator_type: 'square', frequency_start: 1200, frequency_end: 600, duration_ms: 150 },
    base_volume: 0.8, pitch_variation: 0.05, spatial_enabled: true,
  },
]

describe('SFXConfigEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue(mockResponse(CONFIGS) as Response)
  })

  it('renders loading state', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    render(<SFXConfigEditor />)
    expect(screen.getByText('Loading SFX configs...')).toBeInTheDocument()
  })

  it('renders SFX config table after fetch', async () => {
    render(<SFXConfigEditor />)
    await waitFor(() => {
      expect(screen.getByText('sfx_click')).toBeInTheDocument()
      expect(screen.getByText('sfx_crit')).toBeInTheDocument()
    })
  })

  it('shows correct column headers', async () => {
    render(<SFXConfigEditor />)
    await waitFor(() => {
      expect(screen.getByText('Key')).toBeInTheDocument()
      expect(screen.getByText('Display Name')).toBeInTheDocument()
      expect(screen.getByText('Volume')).toBeInTheDocument()
      expect(screen.getByText('Spatial')).toBeInTheDocument()
    })
  })

  it('shows edit panel when Edit button clicked', async () => {
    render(<SFXConfigEditor />)
    await waitFor(() => screen.getByText('sfx_click'))

    const editBtns = screen.getAllByText('Edit')
    fireEvent.click(editBtns[0])

    expect(screen.getByText(/Editing: sfx_click/)).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('calls PUT on save', async () => {
    vi.mocked(api.put).mockResolvedValue(mockResponse({ id: 1, config_key: 'sfx_click', updated_fields: ['base_volume'] }) as Response)
    render(<SFXConfigEditor />)
    await waitFor(() => screen.getByText('sfx_click'))

    const editBtns = screen.getAllByText('Edit')
    fireEvent.click(editBtns[0])

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(vi.mocked(api.put)).toHaveBeenCalledWith(
        '/api/admin/audio-configs/1',
        expect.objectContaining({ base_volume: 0.6 })
      )
    })
  })

  it('shows cancel button in edit panel', async () => {
    render(<SFXConfigEditor />)
    await waitFor(() => screen.getByText('sfx_click'))

    const editBtns = screen.getAllByText('Edit')
    fireEvent.click(editBtns[0])

    expect(screen.getByText('Cancel')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByText(/Editing:/)).not.toBeInTheDocument()
  })

  it('displays spatial enabled as Yes/No', async () => {
    render(<SFXConfigEditor />)
    await waitFor(() => {
      const yesCells = screen.getAllByText('Yes')
      expect(yesCells.length).toBe(2) // both configs have spatial=true
    })
  })

  it('has Play button for each config', async () => {
    render(<SFXConfigEditor />)
    await waitFor(() => {
      const playBtns = screen.getAllByText('Play')
      expect(playBtns.length).toBe(2)
    })
  })
})
