import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SupportTickets from './SupportTickets'
import { api } from '../api'

const mockApi = api as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  patch: ReturnType<typeof vi.fn>
}

function mockResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 400, json: () => Promise.resolve(data) }
}

describe('SupportTickets (Admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the ticket queue', async () => {
    mockApi.get.mockResolvedValueOnce(mockResponse({
      tickets: [
        {
          id: 1, player_id: 10, category: 'bug_report', priority: 'high', subject: 'Crash on login',
          status: 'open', assigned_admin: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
          player_alias: 'TestPlayer', player_email: 'test@example.com',
        },
      ],
      total: 1,
    }))

    render(<SupportTickets />)

    await waitFor(() => {
      expect(screen.getByText('Support Tickets')).toBeInTheDocument()
      expect(screen.getByText('Crash on login')).toBeInTheDocument()
      expect(screen.getByText('TestPlayer')).toBeInTheDocument()
      expect(screen.getByText('1 total')).toBeInTheDocument()
    })
  })

  it('shows empty state when no tickets', async () => {
    mockApi.get.mockResolvedValueOnce(mockResponse({ tickets: [], total: 0 }))

    render(<SupportTickets />)

    await waitFor(() => {
      expect(screen.getByText(/No tickets match/)).toBeInTheDocument()
    })
  })

  it('opens ticket detail on click', async () => {
    mockApi.get
      .mockResolvedValueOnce(mockResponse({
        tickets: [
          {
            id: 3, player_id: 10, category: 'payment_issue', priority: 'normal', subject: 'Double charged',
            status: 'open', assigned_admin: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
            player_alias: 'BillingUser', player_email: 'billing@example.com',
          },
        ],
        total: 1,
      }))
      .mockResolvedValueOnce(mockResponse({
        ticket: {
          id: 3, player_id: 10, category: 'payment_issue', priority: 'normal', subject: 'Double charged',
          status: 'open', assigned_admin: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
          player_alias: 'BillingUser', player_email: 'billing@example.com',
        },
        replies: [
          { id: 1, ticket_id: 3, author_type: 'player', content: 'I was charged twice.', is_internal_note: false, created_at: '2026-01-01T00:00:00Z' },
        ],
      }))

    render(<SupportTickets />)

    await waitFor(() => {
      expect(screen.getByText('Double charged')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Double charged'))

    await waitFor(() => {
      expect(screen.getByText('Ticket #3')).toBeInTheDocument()
      expect(screen.getByText('Conversation')).toBeInTheDocument()
      expect(screen.getByText('I was charged twice.')).toBeInTheDocument()
      expect(screen.getByText('Back to Queue')).toBeInTheDocument()
    })
  })

  it('shows quick action buttons in detail view', async () => {
    mockApi.get
      .mockResolvedValueOnce(mockResponse({
        tickets: [
          {
            id: 7, player_id: 1, category: 'bug_report', priority: 'normal', subject: 'Test actions',
            status: 'open', assigned_admin: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
            player_alias: 'ActionUser', player_email: 'action@example.com',
          },
        ],
        total: 1,
      }))
      .mockResolvedValueOnce(mockResponse({
        ticket: {
          id: 7, player_id: 1, category: 'bug_report', priority: 'normal', subject: 'Test actions',
          status: 'open', assigned_admin: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
          player_alias: 'ActionUser', player_email: 'action@example.com',
        },
        replies: [],
      }))

    render(<SupportTickets />)

    await waitFor(() => {
      expect(screen.getByText('Test actions')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('Test actions'))

    await waitFor(() => {
      expect(screen.getByText('Resolve + Reply')).toBeInTheDocument()
      expect(screen.getByText('Close Ticket')).toBeInTheDocument()
      expect(screen.queryByText('Escalate')).not.toBeInTheDocument()
      expect(screen.getByText('Reply to Player')).toBeInTheDocument()
      expect(screen.getByText('Internal Note')).toBeInTheDocument()
    })
  })
})
