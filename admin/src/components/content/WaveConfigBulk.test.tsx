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

vi.mock('./shared/CascadingPicker', () => ({
  default: ({ value, onChange, level }: any) => (
    <div data-testid="cascading-picker">
      <select
        data-testid="picker-scope"
        value={value.bookId || ''}
        onChange={e => {
          const bookId = e.target.value ? Number(e.target.value) : undefined
          // For chapter level, also set chapterId to trigger data loading
          if (level === 'chapter') {
            onChange({ bookId, chapterId: bookId ? 10 : undefined })
          } else {
            onChange({ bookId })
          }
        }}
      >
        <option value="">-- Select --</option>
        <option value="1">Book 1</option>
      </select>
    </div>
  ),
}))

import { api } from '../../api'
import WaveConfigBulk from './WaveConfigBulk'

function mockResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: () => Promise.resolve(data) }
}

const SCENES = [
  { id: 100, scene_number: 1, title: 'Intro' },
  { id: 101, scene_number: 2, title: 'Battle' },
  { id: 102, scene_number: 3, title: 'Finale' },
]

describe('WaveConfigBulk', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/api/admin/content/scenes')) return Promise.resolve(mockResponse(SCENES) as Response)
      return Promise.resolve(mockResponse([]) as Response)
    })
    vi.mocked(api.post).mockResolvedValue(mockResponse({ ok: true }) as Response)
    vi.mocked(api.patch).mockResolvedValue(mockResponse({ ok: true }) as Response)
  })

  it('renders template form with scope picker', () => {
    render(<WaveConfigBulk />)

    expect(screen.getByText('Wave Config Template')).toBeInTheDocument()
    expect(screen.getByText('Scope')).toBeInTheDocument()
    expect(screen.getByText('Target')).toBeInTheDocument()

    // Base config section
    expect(screen.getByText('Base Config')).toBeInTheDocument()
    expect(screen.getByText('Wave Count')).toBeInTheDocument()
    expect(screen.getByText('Max Enemies/Wave')).toBeInTheDocument()
    expect(screen.getByText('Spawn Interval (ms)')).toBeInTheDocument()

    // Scaling section
    expect(screen.getByText('Scaling')).toBeInTheDocument()
    expect(screen.getByText('Start Value')).toBeInTheDocument()
    expect(screen.getByText('Increment Per Scene')).toBeInTheDocument()

    // Apply button
    expect(screen.getByText('Apply Template')).toBeInTheDocument()
  })

  it('preview section shows projected values', async () => {
    render(<WaveConfigBulk />)

    // Select a scope target to trigger preview
    const scopeSelect = screen.getByTestId('picker-scope')
    fireEvent.change(scopeSelect, { target: { value: '1' } })

    await waitFor(() => {
      expect(screen.getByText('Preview')).toBeInTheDocument()
    })

    // Should show scene previews (scenes appear in both preview and bulk sections)
    expect(screen.getAllByText(/Scene 1: Intro/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Scene 2: Battle/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Scene 3: Finale/).length).toBeGreaterThanOrEqual(1)
  })

  it('apply template calls POST /bulk-template', async () => {
    render(<WaveConfigBulk />)

    // Select scope target
    const scopeSelect = screen.getByTestId('picker-scope')
    fireEvent.change(scopeSelect, { target: { value: '1' } })

    await waitFor(() => screen.getByText('Preview'))

    // Click apply
    fireEvent.click(screen.getByText('Apply Template'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/admin/content/wave-configs/bulk-template',
        expect.objectContaining({
          scope: 'chapter',
          base_wave_count: 3,
          base_max_enemies: 5,
        })
      )
    })
  })

  it('bulk multiplier adjustment with scene selection', async () => {
    render(<WaveConfigBulk />)

    // Select scope target to load scenes
    const scopeSelect = screen.getByTestId('picker-scope')
    fireEvent.change(scopeSelect, { target: { value: '1' } })

    await waitFor(() => {
      expect(screen.getAllByText(/Scene 1: Intro/).length).toBeGreaterThanOrEqual(1)
    })

    // Bulk Multiplier section
    expect(screen.getByText('Bulk Multiplier Adjustment')).toBeInTheDocument()
    expect(screen.getByText('HP Multiplier Factor')).toBeInTheDocument()
    expect(screen.getByText('Gold Multiplier Factor')).toBeInTheDocument()

    // Select All checkbox should exist
    expect(screen.getByText('Select All')).toBeInTheDocument()

    // Click Apply Multipliers
    fireEvent.click(screen.getByText('Apply Multipliers'))

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/api/admin/content/wave-configs/bulk-multipliers',
        expect.objectContaining({
          scene_ids: [100, 101, 102],
          hp_multiplier: 1.0,
          gold_multiplier: 1.0,
        })
      )
    })
  })
})
