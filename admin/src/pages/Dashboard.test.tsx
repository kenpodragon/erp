import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'
import { api } from '../api'

vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
  },
}))

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
  vi.mocked(api.get).mockReset()
  vi.mocked(api.get)
    .mockImplementation((path: string) => {
      if (path.includes('/overview')) return Promise.resolve(mockResponse(OVERVIEW) as Response)
      if (path.includes('/dau')) return Promise.resolve(mockResponse(DAU_DATA) as Response)
      if (path.includes('/registrations')) return Promise.resolve(mockResponse(REG_DATA) as Response)
      if (path.includes('/chapter-distribution')) return Promise.resolve(mockResponse(CHAPTER_DATA) as Response)
      if (path.includes('/events')) return Promise.resolve(mockResponse(EVENTS_DATA) as Response)
      return Promise.resolve(mockResponse({}) as Response)
    })
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
    vi.restoreAllMocks()
    setupMocks()
  })

  it('renders the page header', () => {
    renderDashboard()
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
  })

  it('displays overview card stats after load', async () => {
    renderDashboard()
    await waitFor(() => {
      // Find the "Total Players" card value specifically
      const totalPlayersLabel = screen.getByText('Total Players')
      const totalPlayersCard = totalPlayersLabel.closest('.ov-card')
      expect(totalPlayersCard).toHaveTextContent('42')
      
      expect(screen.getByText('Open Tickets')).toBeInTheDocument()
      expect(screen.getByText('7')).toBeInTheDocument()
    })
  })

  it('shows active player breakdown', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()   // active 24h
      expect(screen.getByText('12')).toBeInTheDocument()  // active 7d
      // Use specific query for the active 30d value to avoid ambiguity with chapter distribution
      const activeLabel = screen.getByText('Active')
      const activeCard = activeLabel.closest('.ov-card')
      expect(activeCard).toHaveTextContent('30')
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
    vi.mocked(api.get)
      .mockImplementation((path: string) => {
        if (path.includes('/overview')) return Promise.reject(new Error('Network error'))
        return Promise.resolve(mockResponse({}) as Response)
      })

    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('Failed to load overview stats')).toBeInTheDocument()
    })
  })

  it('renders Quick Actions with Audit Log link', async () => {
    renderDashboard()
    await waitFor(() => {
      expect(screen.getByText('Audit Log')).toBeInTheDocument()
    })
  })
})
