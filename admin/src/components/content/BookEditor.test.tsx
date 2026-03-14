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

// Mock AtmospherePicker
vi.mock('./shared/AtmospherePicker', () => ({
  default: ({ value, onChange }: { value: any; onChange: (id: number | null) => void }) => (
    <select data-testid="atmosphere-picker" value={value || ''} onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}>
      <option value="">None</option>
      <option value="1">Atmosphere 1</option>
    </select>
  ),
}))

// Mock DeleteConfirmDialog
vi.mock('./shared/DeleteConfirmDialog', () => ({
  default: ({ resourceType, resourceName, isBlocked, onConfirm, onCancel, childCounts }: any) => (
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
import BookEditor from './BookEditor'

function mockResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: () => Promise.resolve(data) }
}

const BOOKS = [
  { id: 1, book_number: 1, title: 'First Tower', chapters_count: 5, scenes_count: 20, source_file: null, recommended_level: null, min_level: null, atmosphere_id: null, transition_lore_text: null },
  { id: 2, book_number: 2, title: 'Second Tower', chapters_count: 0, scenes_count: 0, source_file: null, recommended_level: null, min_level: null, atmosphere_id: null, transition_lore_text: null },
]

describe('BookEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue(mockResponse(BOOKS) as Response)
    vi.mocked(api.post).mockResolvedValue(mockResponse({ id: 3 }) as Response)
    vi.mocked(api.patch).mockResolvedValue(mockResponse({ ok: true }) as Response)
    vi.mocked(api.delete).mockResolvedValue(mockResponse({ ok: true }) as Response)
  })

  it('renders and loads book list from API', async () => {
    render(<BookEditor />)

    await waitFor(() => {
      expect(screen.getByText('First Tower')).toBeInTheDocument()
      expect(screen.getByText('Second Tower')).toBeInTheDocument()
    })

    expect(screen.getByText('2 books')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/api/admin/content/books')
  })

  it('clicking edit opens detail panel with book data', async () => {
    render(<BookEditor />)

    await waitFor(() => screen.getByText('First Tower'))

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Edit Book #1')).toBeInTheDocument()
    })

    // Check that the title input has the book title
    const titleInput = screen.getByDisplayValue('First Tower')
    expect(titleInput).toBeInTheDocument()

    // Save and Cancel buttons should be present
    expect(screen.getByText('Save')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('creating a new book sends POST and refreshes list', async () => {
    render(<BookEditor />)

    await waitFor(() => screen.getByText('First Tower'))

    fireEvent.click(screen.getByText('+ New Book'))

    await waitFor(() => {
      expect(screen.getByText('Create Book')).toBeInTheDocument()
    })

    // Fill in the title - use getAllByText since "Title" appears in both table header and form label
    const titleLabels = screen.getAllByText('Title')
    const titleLabel = titleLabels.find(el => el.classList.contains('form-label'))!
    const titleInput = titleLabel.closest('.form-field')!.querySelector('input')!
    await userEvent.type(titleInput, 'Third Tower')

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/admin/content/books',
        expect.objectContaining({ title: 'Third Tower' })
      )
    })
  })

  it('updating a book sends PATCH', async () => {
    render(<BookEditor />)

    await waitFor(() => screen.getByText('First Tower'))

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    await waitFor(() => screen.getByText('Edit Book #1'))

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/api/admin/content/books/1',
        expect.objectContaining({ title: 'First Tower' })
      )
    })
  })

  it('deleting a book with children shows blocked dialog', async () => {
    render(<BookEditor />)

    await waitFor(() => screen.getByText('First Tower'))

    // Delete the first book (has chapters_count: 5)
    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByTestId('delete-dialog')).toBeInTheDocument()
    })

    // The dialog should show blocked state because chapters_count > 0
    expect(screen.getByText('Blocked')).toBeInTheDocument()
    // "First Tower" appears in both the table and the dialog
    expect(screen.getAllByText('First Tower').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('5 chapters')).toBeInTheDocument()
  })
})
