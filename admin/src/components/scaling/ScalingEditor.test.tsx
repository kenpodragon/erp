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

import { api } from '../../api'
import ScalingEditor from './ScalingEditor'

function mockResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: () => Promise.resolve(data) }
}

const EMPTY_LIST = { items: [], total: 0, page: 1, page_size: 50 }

const VISUAL_BEHAVIORS = [
  { id: 1, name: 'grounded_melee', display_name: 'Grounded Melee', stat_weights: null, sort_order: 1 },
]

const BOOKS = [
  { id: 1, title: 'Book One', book_number: 1, chapters: [{ id: 1, title: 'Chapter 1', chapter_number: 1 }] },
]

const CAPTURE_CURRENT = {
  config_snapshot: { hp_scaling_factor: 1.15 },
  captured_categories: ['combat'],
  extra_keys: [],
  total_keys: 1,
  current_active_curve_id: null,
  current_active_wave_preset_id: null,
}

describe('ScalingEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/visual-behaviors')) return Promise.resolve(mockResponse({ items: VISUAL_BEHAVIORS, total: 1 }) as Response)
      if (path.includes('/wave-presets') && !path.includes('assignments')) return Promise.resolve(mockResponse(EMPTY_LIST) as Response)
      if (path.includes('/difficulty-curves')) return Promise.resolve(mockResponse(EMPTY_LIST) as Response)
      if (path.includes('/presets/capture-current')) return Promise.resolve(mockResponse(CAPTURE_CURRENT) as Response)
      if (path.includes('/presets')) return Promise.resolve(mockResponse(EMPTY_LIST) as Response)
      if (path.includes('/content/books')) return Promise.resolve(mockResponse(BOOKS) as Response)
      return Promise.resolve(mockResponse([]) as Response)
    })
    vi.mocked(api.post).mockResolvedValue(mockResponse({ id: 10 }) as Response)
    vi.mocked(api.patch).mockResolvedValue(mockResponse({ ok: true }) as Response)
    vi.mocked(api.delete).mockResolvedValue(mockResponse({ ok: true }) as Response)
  })

  it('renders all 5 tabs', async () => {
    render(<ScalingEditor />)

    expect(screen.getByText('Visual Weights')).toBeInTheDocument()
    expect(screen.getByText('Wave Presets')).toBeInTheDocument()
    expect(screen.getByText('Difficulty Curves')).toBeInTheDocument()
    expect(screen.getByText('Scaling Preview')).toBeInTheDocument()
    expect(screen.getByText('Difficulty Presets')).toBeInTheDocument()
  })

  it('tab switching works — clicking Wave Presets shows its content', async () => {
    render(<ScalingEditor />)

    // Default tab: Visual Weights — should load its content
    await waitFor(() => {
      expect(screen.getByText(/Grounded Melee/)).toBeInTheDocument()
    })

    // Switch to Wave Presets tab
    fireEvent.click(screen.getByText('Wave Presets'))

    await waitFor(() => {
      expect(screen.getByText('+ New Preset')).toBeInTheDocument()
    })
  })

  it('VisualWeightEditor renders behavior selector', async () => {
    render(<ScalingEditor />)

    // Default tab is visual-weights
    await waitFor(() => {
      expect(screen.getByText(/Grounded Melee/)).toBeInTheDocument()
    })
  })

  it('ScalingPreview renders book selector', async () => {
    render(<ScalingEditor />)

    fireEvent.click(screen.getByText('Scaling Preview'))

    await waitFor(() => {
      expect(screen.getByText('Scaling Preview', { selector: '.section-header' })).toBeInTheDocument()
    })

    // Should have a book dropdown
    await waitFor(() => {
      const bookSelect = screen.getByText('-- select book --')
      expect(bookSelect).toBeInTheDocument()
    })
  })

  it('WavePresetManager renders create button', async () => {
    render(<ScalingEditor />)

    fireEvent.click(screen.getByText('Wave Presets'))

    await waitFor(() => {
      expect(screen.getByText('+ New Preset')).toBeInTheDocument()
    })
  })

  it('DifficultyCurveManager renders create button', async () => {
    render(<ScalingEditor />)

    fireEvent.click(screen.getByText('Difficulty Curves'))

    await waitFor(() => {
      expect(screen.getByText('+ New Curve')).toBeInTheDocument()
    })
  })

  it('DifficultyPresetManager renders create button', async () => {
    render(<ScalingEditor />)

    fireEvent.click(screen.getByText('Difficulty Presets'))

    await waitFor(() => {
      // The DifficultyPresetManager has a "+ New Preset" button
      const buttons = screen.getAllByText('+ New Preset')
      expect(buttons.length).toBeGreaterThanOrEqual(1)
    })
  })
})
