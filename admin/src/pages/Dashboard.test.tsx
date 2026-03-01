import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'
import { api } from '../api'

const mockApi = api as unknown as { get: ReturnType<typeof vi.fn> }

function mockResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: () => Promise.resolve(data) }
}

const OVERVIEW = {
  players: { total: 42, active_24h: 5, active_7d: 12, active_30d: 30 },
  registrations: { today: 3, this_week: 10, this_month: 42 },
  tickets: { open: 7 },
}

const DAU_DATA = { range: '30d', data: [{ date: '2026-01-01', count: 10 }] }
const REG_DATA = { range: '30d', data: [{ date: '2026-01-01', count: 3 }] }
const CHAPTER_DATA = { data: [{ book: 1, chapter: 1, count: 30 }] }
const EVENTS_DATA = {
  total: 2,
  events: [
    { id: 1, player_id: 1, player_alias: 'Hero', event_type: 'player_login', event_data: null, created_at: '2026-01-01T00:00:00Z' },
    { id: 2, player_id: 2, player_alias: null, event_type: 'character_created', event_data: null, created_at: '2026-01-01T00:00:00Z' },
  ],
}

function setupMocks() {
  // The Dashboard fires multiple concurrent fetches — mock in order of resolution.
  // Overview, then DAU, Registrations, Chapter, Events.
  mockApi.get
    .mockResolvedValueOnce(mockResponse(OVERVIEW))      // overview
    .mockResolvedValueOnce(mockResponse(DAU_DATA))       // dau
    .mockResolvedValueOnce(mockResponse(REG_DATA))       // registrations
    .mockResolvedValueOnce(mockResponse(CHAPTER_DATA))   // chapter-distribution
    .mockResolvedValueOnce(mockResponse(EVENTS_DATA))    // events
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  )
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset to a fresh mock for each test
    setupMocks()
  })

  it('renders the page header', () => {
    renderDashboard()
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
  })

  it('displays overview card stats after load', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument()   // total players
      expect(screen.getByText('7')).toBeInTheDocument()    // open tickets
      expect(screen.getByText('Total Players')).toBeInTheDocument()
      expect(screen.getByText('Open Tickets')).toBeInTheDocument()
    })
  })

  it('shows active player breakdown', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()   // active 24h
      expect(screen.getByText('12')).toBeInTheDocument()  // active 7d
      expect(screen.getByText('30')).toBeInTheDocument()  // active 30d
    })
  })

  it('shows registration breakdown', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()   // today
      expect(screen.getByText('10')).toBeInTheDocument()  // this week
    })
  })

  it('shows DAU chart section', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('Daily Active Users')).toBeInTheDocument()
    })
  })

  it('shows Recent Activity section', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument()
      expect(screen.getByText('2 total events')).toBeInTheDocument()
    })
  })

  it('shows activity feed event with player alias', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('Hero')).toBeInTheDocument()
    })
  })

  it('shows chapter distribution section', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('Chapter Distribution')).toBeInTheDocument()
    })
  })

  it('shows error message when overview fetch fails', async () => {
    vi.clearAllMocks()
    mockApi.get
      .mockRejectedValueOnce(new Error('Network error'))  // overview
      .mockResolvedValueOnce(mockResponse(DAU_DATA))
      .mockResolvedValueOnce(mockResponse(REG_DATA))
      .mockResolvedValueOnce(mockResponse(CHAPTER_DATA))
      .mockResolvedValueOnce(mockResponse(EVENTS_DATA))

    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText(/Failed to load overview stats/)).toBeInTheDocument()
    })
  })

  it('renders Quick Actions with Audit Log link', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('Audit Log')).toBeInTheDocument()
    })
  })
})
