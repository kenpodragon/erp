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

vi.mock('./shared/AtmospherePicker', () => ({
  default: ({ value, onChange }: any) => (
    <select data-testid="atmosphere-picker" value={value || ''} onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}>
      <option value="">None</option>
    </select>
  ),
}))

vi.mock('./shared/DeleteConfirmDialog', () => ({
  default: ({ resourceName, isBlocked, onConfirm, onCancel, childCounts }: any) => (
    <div data-testid="delete-dialog">
      <span>{isBlocked ? 'Blocked' : 'Unblocked'}</span>
      <span>{resourceName}</span>
      {Object.entries(childCounts).map(([key, count]) => (
        <span key={key}>{String(count)} {key}</span>
      ))}
      <button onClick={onConfirm}>Confirm Delete</button>
      <button onClick={onCancel}>Cancel Delete</button>
    </div>
  ),
}))

import { api } from '../../api'
import ChapterEditor from './ChapterEditor'

function mockResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: () => Promise.resolve(data) }
}

const BOOKS = [
  { id: 1, book_number: 1, title: 'First Tower' },
  { id: 2, book_number: 2, title: 'Second Tower' },
]

const CHAPTERS = [
  { id: 10, book_id: 1, chapter_number: 1, sort_order: 0, title: 'Awakening', processing_status: 'completed', recommended_level: null, min_level: null, atmosphere_id: null, transition_lore_text: null, raw_text: null, scenes_count: 3, book_title: 'First Tower' },
  { id: 11, book_id: 1, chapter_number: 2, sort_order: 1, title: 'Rising', processing_status: 'pending', recommended_level: null, min_level: null, atmosphere_id: null, transition_lore_text: null, raw_text: null, scenes_count: 0, book_title: 'First Tower' },
  { id: 12, book_id: 2, chapter_number: 1, sort_order: 0, title: 'Return', processing_status: 'completed', recommended_level: null, min_level: null, atmosphere_id: null, transition_lore_text: null, raw_text: null, scenes_count: 5, book_title: 'Second Tower' },
]

describe('ChapterEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/api/admin/content/books')) return Promise.resolve(mockResponse(BOOKS) as Response)
      if (path.includes('/api/admin/content/chapters')) return Promise.resolve(mockResponse(CHAPTERS) as Response)
      return Promise.resolve(mockResponse([]) as Response)
    })
    vi.mocked(api.post).mockResolvedValue(mockResponse({ id: 20 }) as Response)
    vi.mocked(api.patch).mockResolvedValue(mockResponse({ ok: true }) as Response)
    vi.mocked(api.delete).mockResolvedValue(mockResponse({ ok: true }) as Response)
  })

  it('renders and loads chapters from API', async () => {
    render(<ChapterEditor />)

    await waitFor(() => {
      expect(screen.getByText('Awakening')).toBeInTheDocument()
      expect(screen.getByText('Rising')).toBeInTheDocument()
      expect(screen.getByText('Return')).toBeInTheDocument()
    })

    expect(screen.getByText('3 chapters')).toBeInTheDocument()
  })

  it('filters chapters by book', async () => {
    // When filtering, the API should be called with book_id
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/api/admin/content/books')) return Promise.resolve(mockResponse(BOOKS) as Response)
      if (path.includes('book_id=1')) return Promise.resolve(mockResponse([CHAPTERS[0], CHAPTERS[1]]) as Response)
      if (path.includes('/api/admin/content/chapters')) return Promise.resolve(mockResponse(CHAPTERS) as Response)
      return Promise.resolve(mockResponse([]) as Response)
    })

    render(<ChapterEditor />)

    await waitFor(() => screen.getByText('Awakening'))

    // Select a book filter
    const bookSelect = screen.getByDisplayValue('All Books')
    fireEvent.change(bookSelect, { target: { value: '1' } })

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('book_id=1'))
    })
  })

  it('creates a new chapter', async () => {
    render(<ChapterEditor />)

    await waitFor(() => screen.getByText('Awakening'))

    fireEvent.click(screen.getByText('+ New Chapter'))

    await waitFor(() => {
      expect(screen.getByText('Create Chapter')).toBeInTheDocument()
    })

    // Fill in title - use getAllByText since "Title" appears in both table header and form label
    const titleLabels = screen.getAllByText('Title')
    const titleLabel = titleLabels.find(el => el.classList.contains('form-label'))!
    const titleInput = titleLabel.closest('.form-field')!.querySelector('input')!
    await userEvent.type(titleInput, 'New Dawn')

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/admin/content/chapters',
        expect.objectContaining({ title: 'New Dawn' })
      )
    })
  })

  it('updates chapter fields', async () => {
    render(<ChapterEditor />)

    await waitFor(() => screen.getByText('Awakening'))

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Edit Chapter #10')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/api/admin/content/chapters/10',
        expect.objectContaining({ title: 'Awakening' })
      )
    })
  })

  it('delete blocked when scenes exist', async () => {
    render(<ChapterEditor />)

    await waitFor(() => screen.getByText('Awakening'))

    // Delete the first chapter (scenes_count: 3)
    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByTestId('delete-dialog')).toBeInTheDocument()
    })

    expect(screen.getByText('Blocked')).toBeInTheDocument()
    expect(screen.getByText('3 scenes')).toBeInTheDocument()
  })
})
