import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AuditLog from './AuditLog'
import { api } from '../api'

function mockResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: () => Promise.resolve(data) }
}

const ENTRY_1 = {
  id: 1, admin_email: 'alice@example.com', action: 'player_banned',
  target_type: 'player', target_id: '42', details: { ban_reason: 'cheating' },
  ip_address: '127.0.0.1', created_at: '2026-01-15T10:00:00Z',
}
const ENTRY_2 = {
  id: 2, admin_email: 'bob@example.com', action: 'config_changed',
  target_type: 'config', target_id: 'game.xp_multiplier', details: { old: '1.0', new: '2.0' },
  ip_address: null, created_at: '2026-01-14T09:00:00Z',
}

describe('AuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page header', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse({ total: 0, entries: [] }) as Response)
    render(<AuditLog />)
    expect(screen.getByText('Audit Log')).toBeInTheDocument()
    expect(screen.getByText(/Immutable record/)).toBeInTheDocument()
  })

  it('shows empty state when no entries', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse({ total: 0, entries: [] }) as Response)
    render(<AuditLog />)
    await waitFor(() => {
      expect(screen.getByText(/No audit log entries/)).toBeInTheDocument()
    })
  })

  it('renders audit entries in a table', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse({ total: 2, entries: [ENTRY_1, ENTRY_2] }) as Response)
    render(<AuditLog />)
    await waitFor(() => {
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
      expect(screen.getByRole('cell', { name: 'player_banned' })).toBeInTheDocument()
      expect(screen.getByText('bob@example.com')).toBeInTheDocument()
      expect(screen.getByRole('cell', { name: 'config_changed' })).toBeInTheDocument()
    })
  })

  it('shows total entry count', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse({ total: 2, entries: [ENTRY_1, ENTRY_2] }) as Response)
    render(<AuditLog />)
    await waitFor(() => {
      expect(screen.getByText(/2 total entries/)).toBeInTheDocument()
    })
  })

  it('shows target type and ID columns', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse({ total: 1, entries: [ENTRY_1] }) as Response)
    render(<AuditLog />)
    await waitFor(() => {
      expect(screen.getByRole('cell', { name: 'player' })).toBeInTheDocument()
      expect(screen.getByText('42')).toBeInTheDocument()
    })
  })

  it('expands detail JSON on row click', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse({ total: 1, entries: [ENTRY_1] }) as Response)
    render(<AuditLog />)
    await waitFor(() => screen.getByText('alice@example.com'))

    const rows = screen.getAllByRole('row')
    // Click the data row (index 1, after header)
    fireEvent.click(rows[1])
    await waitFor(() => {
      expect(screen.getByText(/cheating/)).toBeInTheDocument()
    })
  })

  it('collapses detail on second click', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse({ total: 1, entries: [ENTRY_1] }) as Response)
    render(<AuditLog />)
    await waitFor(() => screen.getByText('alice@example.com'))

    const rows = screen.getAllByRole('row')
    fireEvent.click(rows[1])
    await waitFor(() => screen.getByText(/cheating/))
    fireEvent.click(rows[1])
    await waitFor(() => {
      expect(screen.queryByText(/cheating/)).not.toBeInTheDocument()
    })
  })

  it('applies admin email filter on submit', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(mockResponse({ total: 2, entries: [ENTRY_1, ENTRY_2] }) as Response)
      .mockResolvedValueOnce(mockResponse({ total: 1, entries: [ENTRY_1] }) as Response)

    render(<AuditLog />)
    await waitFor(() => screen.getByText('alice@example.com'))

    const input = screen.getByPlaceholderText('Admin email…')
    await userEvent.type(input, 'alice')
    fireEvent.submit(input.closest('form')!)

    await waitFor(() => {
      // Check that at least one call with the correct filter happened
      const calls = vi.mocked(api.get).mock.calls
      const filterCall = calls.find(call => (call[0] as string).includes('admin=alice'))
      expect(filterCall).toBeDefined()
    })
  })

  it('clears filters when Clear button is clicked', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(mockResponse({ total: 2, entries: [ENTRY_1, ENTRY_2] }) as Response)
      .mockResolvedValueOnce(mockResponse({ total: 2, entries: [ENTRY_1, ENTRY_2] }) as Response)

    render(<AuditLog />)
    await waitFor(() => screen.getByText('alice@example.com'))

    const clearBtn = screen.getByRole('button', { name: /Clear/ })
    await userEvent.click(clearBtn)

    await waitFor(() => {
      const lastCall = vi.mocked(api.get).mock.calls.at(-1)![0] as string
      expect(lastCall).not.toContain('admin=')
    })
  })

  it('shows error message on fetch failure', async () => {
    vi.mocked(api.get).mockReset()
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'))
    render(<AuditLog />)
    await waitFor(() => {
      const errorDiv = screen.getByText('Failed to load audit log.')
      expect(errorDiv).toBeInTheDocument()
      expect(errorDiv).toHaveClass('audit-error')
    })
  })

  it('shows pagination when total exceeds page size', async () => {
    const entries = Array.from({ length: 50 }, (_, i) => ({
      ...ENTRY_1, id: i + 1, target_id: String(i + 1),
    }))
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse({ total: 120, entries }) as Response)
    render(<AuditLog />)
    await waitFor(() => {
      expect(screen.getByText(/Page 1 \/ 3/)).toBeInTheDocument()
    })
  })

  it('disables Prev button on first page', async () => {
    const entries = Array.from({ length: 50 }, (_, i) => ({ ...ENTRY_1, id: i + 1, target_id: String(i) }))
    vi.mocked(api.get).mockResolvedValueOnce(mockResponse({ total: 120, entries }) as Response)
    render(<AuditLog />)
    await waitFor(() => screen.getAllByText('alice@example.com'))
    const prevBtn = screen.getByRole('button', { name: /Prev/ })
    expect(prevBtn).toBeDisabled()
  })
})
