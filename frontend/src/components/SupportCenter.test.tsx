import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SupportCenter } from './SupportCenter'
import { api } from '../api'

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  patch: ReturnType<typeof vi.fn>
}

function mockResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 400, json: () => Promise.resolve(data) }
}

describe('SupportCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the ticket list view by default', async () => {
    mockApi.get.mockResolvedValueOnce(mockResponse({ tickets: [], total: 0 }))

    render(<SupportCenter />)

    await waitFor(() => {
      expect(screen.getByText('My Support Tickets')).toBeInTheDocument()
    })
    expect(screen.getByText('New Ticket')).toBeInTheDocument()
    expect(screen.getByText('0 tickets')).toBeInTheDocument()
  })

  it('shows empty state when no tickets', async () => {
    mockApi.get.mockResolvedValueOnce(mockResponse({ tickets: [], total: 0 }))

    render(<SupportCenter />)

    await waitFor(() => {
      expect(screen.getByText(/No tickets found/)).toBeInTheDocument()
    })
  })

  it('renders tickets in the list', async () => {
    mockApi.get.mockResolvedValueOnce(mockResponse({
      tickets: [
        { id: 1, category: 'bug_report', priority: 'normal', subject: 'Game crash', status: 'open', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
        { id: 2, category: 'feedback', priority: 'normal', subject: 'New feature', status: 'in_progress', created_at: '2026-01-02T00:00:00Z', updated_at: '2026-01-02T00:00:00Z' },
      ],
      total: 2,
    }))

    render(<SupportCenter />)

    await waitFor(() => {
      expect(screen.getByText('Game crash')).toBeInTheDocument()
      expect(screen.getByText('New feature')).toBeInTheDocument()
      expect(screen.getByText('2 tickets')).toBeInTheDocument()
    })
  })

  it('navigates to the new ticket form', async () => {
    mockApi.get.mockResolvedValueOnce(mockResponse({ tickets: [], total: 0 }))

    render(<SupportCenter />)

    await waitFor(() => {
      expect(screen.getByText('New Ticket')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('New Ticket'))

    expect(screen.getByText('Submit a Ticket')).toBeInTheDocument()
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText(/Subject/)).toBeInTheDocument()
    expect(screen.getByText(/Description/)).toBeInTheDocument()
  })

  it('submits a new ticket and returns to list', async () => {
    mockApi.get.mockResolvedValue(mockResponse({ tickets: [], total: 0 }))
    mockApi.post.mockResolvedValueOnce(mockResponse({
      ticket: { id: 1, status: 'open' },
      reply: { id: 1 },
    }))

    render(<SupportCenter />)

    await waitFor(() => {
      expect(screen.getByText('New Ticket')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('New Ticket'))

    const subjectInput = screen.getByPlaceholderText('Brief summary of your issue')
    const descriptionInput = screen.getByPlaceholderText(/Please describe your issue/)

    await userEvent.type(subjectInput, 'My game crashes constantly')
    await userEvent.type(descriptionInput, 'Every time I open the game it freezes and crashes to desktop.')

    await userEvent.click(screen.getByText('Submit Ticket'))

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/api/support/tickets', expect.objectContaining({
        category: 'bug_report',
        subject: 'My game crashes constantly',
      }))
    })
  })

  it('shows ticket detail when clicking a ticket', async () => {
    mockApi.get
      .mockResolvedValueOnce(mockResponse({
        tickets: [
          { id: 5, category: 'bug_report', priority: 'normal', subject: 'Test ticket', status: 'open', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
        ],
        total: 1,
      }))
      .mockResolvedValueOnce(mockResponse({
        ticket: { id: 5, category: 'bug_report', priority: 'normal', subject: 'Test ticket', status: 'open', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
        replies: [
          { id: 1, ticket_id: 5, author_type: 'player', content: 'Initial description', is_internal_note: false, created_at: '2026-01-01T00:00:00Z' },
        ],
      }))

    render(<SupportCenter />)

    await waitFor(() => {
      expect(screen.getByText('Test ticket')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Test ticket'))

    await waitFor(() => {
      expect(screen.getByText('Ticket #5')).toBeInTheDocument()
      expect(screen.getByText('Conversation')).toBeInTheDocument()
      expect(screen.getByText('Initial description')).toBeInTheDocument()
    })
  })
})
