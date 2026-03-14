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
import SemanticTagManager from './SemanticTagManager'

function mockResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: () => Promise.resolve(data) }
}

const ANALYTICS = {
  total_tags: 150,
  total_beats: 45,
  orphan_beat_count: 3,
  categories: { general: 80, emotion: 40, theme: 30 },
}

const TAGS = {
  items: [
    { id: 1, value: 'darkness', canonical_value: 'dark', category: 'theme', beat_id: 100, beat_context: 'Beat #100' },
    { id: 2, value: 'fear', canonical_value: null, category: 'emotion', beat_id: 101, beat_context: 'Beat #101' },
    { id: 3, value: 'tower', canonical_value: null, category: 'general', beat_id: 102, beat_context: 'Beat #102' },
  ],
  total: 3,
}

describe('SemanticTagManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/api/admin/content/semantic-tags/analytics')) return Promise.resolve(mockResponse(ANALYTICS) as Response)
      if (path.includes('/api/admin/content/semantic-tags')) return Promise.resolve(mockResponse(TAGS) as Response)
      return Promise.resolve(mockResponse([]) as Response)
    })
    vi.mocked(api.post).mockResolvedValue(mockResponse({ id: 4 }) as Response)
    vi.mocked(api.patch).mockResolvedValue(mockResponse({ ok: true }) as Response)
    vi.mocked(api.delete).mockResolvedValue(mockResponse({ ok: true }) as Response)
  })

  it('renders with analytics section', async () => {
    render(<SemanticTagManager />)

    await waitFor(() => {
      // Analytics cards should be visible
      expect(screen.getByText('Total Tags')).toBeInTheDocument()
      expect(screen.getByText('150')).toBeInTheDocument()

      expect(screen.getByText('Tagged Beats')).toBeInTheDocument()
      expect(screen.getByText('45')).toBeInTheDocument()

      expect(screen.getByText('Orphan Beats')).toBeInTheDocument()
      // "3" appears in analytics and in "3 tags" count - use getAllByText
      expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1)

      // Categories count card
      expect(screen.getAllByText('Categories').length).toBeGreaterThanOrEqual(1)
    })

    // Category breakdowns - "general" and "emotion" appear in both analytics cards and table badges
    expect(screen.getAllByText('general').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('80')).toBeInTheDocument()
    expect(screen.getAllByText('emotion').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('40').length).toBeGreaterThanOrEqual(1)
  })

  it('lists tags with category filter', async () => {
    render(<SemanticTagManager />)

    await waitFor(() => {
      expect(screen.getByText('darkness')).toBeInTheDocument()
      expect(screen.getByText('fear')).toBeInTheDocument()
      expect(screen.getByText('tower')).toBeInTheDocument()
    })

    expect(screen.getByText('3 tags')).toBeInTheDocument()

    // Filter by category
    const categorySelect = screen.getByDisplayValue('All Categories')
    fireEvent.change(categorySelect, { target: { value: 'emotion' } })

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('category=emotion'))
    })
  })

  it('creates new tag', async () => {
    render(<SemanticTagManager />)

    await waitFor(() => screen.getByText('darkness'))

    // Click Bulk Add button
    fireEvent.click(screen.getByText('Bulk Add'))

    await waitFor(() => {
      expect(screen.getByText('Bulk Add Tags')).toBeInTheDocument()
    })

    // Fill in beat ID
    const beatIdInput = screen.getByText('Beat ID').closest('.form-field')!.querySelector('input')!
    await userEvent.type(beatIdInput, '200')

    // Fill in values
    const valuesTextarea = screen.getByText('Values (one per line)').closest('.form-field')!.querySelector('textarea')!
    await userEvent.type(valuesTextarea, 'hope\nlight')

    // Click Add Tags
    fireEvent.click(screen.getByText('Add Tags'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/admin/content/semantic-tags/bulk',
        expect.objectContaining({
          beat_id: 200,
          category: 'general',
          values: ['hope', 'light'],
        })
      )
    })
  })

  it('rename value across category', async () => {
    render(<SemanticTagManager />)

    await waitFor(() => screen.getByText('darkness'))

    // Click Rename button
    fireEvent.click(screen.getByText('Rename'))

    await waitFor(() => {
      expect(screen.getByText('Rename Tags')).toBeInTheDocument()
    })

    // Select category - "Category" appears in multiple places, find the one in the rename form
    const categoryLabels = screen.getAllByText('Category')
    const categoryLabel = categoryLabels.find(el => el.classList.contains('form-label'))!
    const categorySelect = categoryLabel.closest('.form-field')!.querySelector('select')!
    fireEvent.change(categorySelect, { target: { value: 'theme' } })

    // Enter old value
    const oldInput = screen.getByText('Old Value').closest('.form-field')!.querySelector('input')!
    await userEvent.type(oldInput, 'darkness')

    // Enter new value
    const newInput = screen.getByText('New Value').closest('.form-field')!.querySelector('input')!
    await userEvent.type(newInput, 'shadow')

    // Click Rename All
    fireEvent.click(screen.getByText('Rename All'))

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/api/admin/content/semantic-tags/rename',
        {
          category: 'theme',
          old_value: 'darkness',
          new_value: 'shadow',
        }
      )
    })
  })

  it('deletes tag', async () => {
    render(<SemanticTagManager />)

    await waitFor(() => screen.getByText('darkness'))

    // Click delete on first tag
    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/admin/content/semantic-tags/1')
    })
  })
})
