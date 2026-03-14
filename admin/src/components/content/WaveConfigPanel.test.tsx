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
      <button onClick={() => onChange(10, 'Goblin')}>{placeholder || 'Select entity'}</button>
    </div>
  ),
}))

import { api } from '../../api'
import WaveConfigPanel from './WaveConfigPanel'

function mockResponse(data: unknown, ok = true, status?: number) {
  return { ok, status: status || (ok ? 200 : 500), json: () => Promise.resolve(data) }
}

const WAVE_CONFIG = {
  max_enemies_per_wave: 5,
  wave_count: 3,
  spawn_interval_ms: 1000,
  scaling_factor: 1.0,
  hp_multiplier: 1.5,
  gold_multiplier: 2.0,
  boss_entity_id: null,
  entity_pool: [
    { entity_id: 1, entity_name: 'Shadow Beast', weight: 2, min_wave: 1, max_wave: null },
    { entity_id: 2, entity_name: 'Wraith', weight: 1, min_wave: 2, max_wave: 3 },
  ],
}

describe('WaveConfigPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with existing wave config data', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse(WAVE_CONFIG) as Response)

    render(<WaveConfigPanel sceneId={100} />)

    await waitFor(() => {
      expect(screen.getByText('Wave Parameters')).toBeInTheDocument()
    })

    // Should show the config fields
    expect(screen.getByText('Max Enemies Per Wave')).toBeInTheDocument()
    expect(screen.getByText('Wave Count')).toBeInTheDocument()
    expect(screen.getByText('Spawn Interval (ms)')).toBeInTheDocument()
    expect(screen.getByText('HP Multiplier')).toBeInTheDocument()
    expect(screen.getByText('Gold Multiplier')).toBeInTheDocument()

    // Entity pool should show entities
    expect(screen.getByText('Shadow Beast')).toBeInTheDocument()
    expect(screen.getByText('Wraith')).toBeInTheDocument()

    // Save button
    expect(screen.getByText('Save Wave Config')).toBeInTheDocument()
  })

  it('updates wave config fields', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse(WAVE_CONFIG) as Response)
    vi.mocked(api.put).mockResolvedValueOnce(mockResponse({ ok: true }) as Response)

    render(<WaveConfigPanel sceneId={100} />)

    await waitFor(() => screen.getByText('Wave Parameters'))

    // Change wave count
    const waveCountInput = screen.getByText('Wave Count').closest('.form-field')!.querySelector('input')!
    fireEvent.change(waveCountInput, { target: { value: '5' } })

    // Save
    fireEvent.click(screen.getByText('Save Wave Config'))

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/api/admin/content/wave-configs/100',
        expect.objectContaining({ wave_count: 5 })
      )
    })
  })

  it('manages entity pool (add/remove entities)', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse(WAVE_CONFIG) as Response)

    render(<WaveConfigPanel sceneId={100} />)

    await waitFor(() => screen.getByText('Shadow Beast'))

    // Remove an entity from the pool
    const removeButtons = screen.getAllByText('Remove')
    fireEvent.click(removeButtons[0])

    // Shadow Beast should be removed from the table
    await waitFor(() => {
      expect(screen.queryByText('Shadow Beast')).not.toBeInTheDocument()
    })

    // Add entity via entity picker
    fireEvent.click(screen.getByText('Add entity to pool...'))

    // Should add the entity to the pool
    await waitFor(() => {
      expect(screen.getByText('Goblin')).toBeInTheDocument()
    })
  })

  it('auto-populate button calls API', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse(WAVE_CONFIG) as Response)
    vi.mocked(api.post).mockResolvedValueOnce(mockResponse({ ok: true }) as Response)
    // After auto-populate, it fetches config again
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse(WAVE_CONFIG) as Response)

    render(<WaveConfigPanel sceneId={100} />)

    await waitFor(() => screen.getByText('Wave Parameters'))

    fireEvent.click(screen.getByText('Auto-populate'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/admin/content/wave-configs/auto-populate/100')
    })
  })

  it('delete wave config (creates default on 404)', async () => {
    // Returns 404, so component creates a default config
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse(null, false, 404) as Response)

    render(<WaveConfigPanel sceneId={999} />)

    await waitFor(() => {
      expect(screen.getByText('Wave Parameters')).toBeInTheDocument()
    })

    // Should show default values
    expect(screen.getByText('Entity Pool')).toBeInTheDocument()
    // Pool should be empty
    expect(screen.getByText(/No entities in pool/)).toBeInTheDocument()
  })
})
