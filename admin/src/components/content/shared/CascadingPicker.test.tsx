import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../../../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from '../../../api'
import CascadingPicker from './CascadingPicker'

function mockResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: () => Promise.resolve(data) }
}

const BOOKS = [
  { id: 1, book_number: 1, title: 'First Tower' },
  { id: 2, book_number: 2, title: 'Second Tower' },
]

const CHAPTERS = [
  { id: 10, chapter_number: 1, title: 'Awakening' },
  { id: 11, chapter_number: 2, title: 'Rising' },
]

const SCENES = [
  { id: 100, scene_number: 1, title: 'Intro' },
  { id: 101, scene_number: 2, title: 'Battle' },
]

describe('CascadingPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders initial book dropdown and loads books', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse(BOOKS) as Response)

    const onChange = vi.fn()
    render(<CascadingPicker level="scene" value={{}} onChange={onChange} />)

    // Should show book dropdown with default option
    expect(screen.getByText('-- Select Book --')).toBeInTheDocument()

    // Books should load
    await waitFor(() => {
      expect(screen.getByText('Book 1: First Tower')).toBeInTheDocument()
      expect(screen.getByText('Book 2: Second Tower')).toBeInTheDocument()
    })

    expect(api.get).toHaveBeenCalledWith('/api/admin/content/books')
  })

  it('selecting book loads chapters, then selecting chapter loads scenes', async () => {
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path === '/api/admin/content/books') {
        return Promise.resolve(mockResponse(BOOKS) as Response)
      }
      if (path.includes('/api/admin/content/chapters?book_id=1')) {
        return Promise.resolve(mockResponse(CHAPTERS) as Response)
      }
      if (path.includes('/api/admin/content/scenes?chapter_id=10')) {
        return Promise.resolve(mockResponse(SCENES) as Response)
      }
      return Promise.resolve(mockResponse([]) as Response)
    })

    const onChange = vi.fn()
    // Start with bookId=1 to trigger chapter loading
    const { rerender } = render(
      <CascadingPicker level="scene" value={{ bookId: 1 }} onChange={onChange} />
    )

    // Books and chapters should load
    await waitFor(() => {
      expect(screen.getByText('Book 1: First Tower')).toBeInTheDocument()
      expect(screen.getByText('Ch 1: Awakening')).toBeInTheDocument()
    })

    // Now simulate selecting chapter by updating value prop
    rerender(
      <CascadingPicker level="scene" value={{ bookId: 1, chapterId: 10 }} onChange={onChange} />
    )

    // Scenes should load
    await waitFor(() => {
      expect(screen.getByText('Scene 1: Intro')).toBeInTheDocument()
      expect(screen.getByText('Scene 2: Battle')).toBeInTheDocument()
    })
  })
})
