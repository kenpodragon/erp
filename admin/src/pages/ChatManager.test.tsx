import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatManager from './ChatManager'
import { api } from '../api'

vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}))

function mockResponse(data: unknown, ok = true, status?: number) {
  return { ok, status: status ?? (ok ? 200 : 500), json: () => Promise.resolve(data) }
}

const CHANNELS = [
  { id: 1, name: 'Global Chat', channel_type: 'global', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 2, name: 'Trade Chat', channel_type: 'trade', is_active: true, created_at: '2026-01-02T00:00:00Z' },
  { id: 3, name: 'Guild Chat', channel_type: 'guild', is_active: false, created_at: '2026-01-03T00:00:00Z' },
]

const PLAYER_STATUS_ACTIVE = {
  player_id: 42,
  chat_muted: false,
  chat_muted_until: null,
}

const PLAYER_STATUS_MUTED = {
  player_id: 42,
  chat_muted: true,
  chat_muted_until: '2026-06-01T00:00:00Z',
}

function setupChannelsMock(channels = CHANNELS) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url.includes('/channels')) return Promise.resolve(mockResponse(channels) as Response)
    return Promise.resolve(mockResponse(null, false) as Response)
  })
}

describe('ChatManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders ChatManager page with title', async () => {
    setupChannelsMock()
    render(<ChatManager />)

    await waitFor(() => {
      expect(screen.getByText('Chat Manager')).toBeInTheDocument()
    })

    expect(screen.getByText('Channels')).toBeInTheDocument()
    expect(screen.getByText('Player Moderation')).toBeInTheDocument()
  })

  it('fetches and displays channels', async () => {
    setupChannelsMock()
    render(<ChatManager />)

    await waitFor(() => {
      expect(screen.getByText('Global Chat')).toBeInTheDocument()
      expect(screen.getByText('Trade Chat')).toBeInTheDocument()
      expect(screen.getByText('Guild Chat')).toBeInTheDocument()
    })

    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/api/admin/chat/channels')

    // Verify table headers
    expect(screen.getByText('ID')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()

    // Verify channel types rendered
    expect(screen.getByText('global')).toBeInTheDocument()
    expect(screen.getByText('trade')).toBeInTheDocument()
    expect(screen.getByText('guild')).toBeInTheDocument()

    // Active/Disabled status badges
    const activeStatuses = screen.getAllByText('Active')
    expect(activeStatuses.length).toBe(2) // Global + Trade
    expect(screen.getByText('Disabled')).toBeInTheDocument() // Guild
  })

  it('toggles channel active state', async () => {
    setupChannelsMock()
    vi.mocked(api.patch).mockResolvedValueOnce(mockResponse({ ok: true }) as Response)

    render(<ChatManager />)

    await waitFor(() => {
      expect(screen.getByText('Trade Chat')).toBeInTheDocument()
    })

    // Trade Chat (id=2) is active, so its button should say "Disable"
    const disableButtons = screen.getAllByText('Disable')
    // Only non-global active channels get a Disable button — Trade Chat
    expect(disableButtons.length).toBe(1)
    fireEvent.click(disableButtons[0])

    await waitFor(() => {
      expect(vi.mocked(api.patch)).toHaveBeenCalledWith(
        '/api/admin/chat/channels/2',
        { is_active: false }
      )
    })
  })

  it('prevents disabling global channel', async () => {
    setupChannelsMock()
    render(<ChatManager />)

    await waitFor(() => {
      expect(screen.getByText('Global Chat')).toBeInTheDocument()
    })

    // Global channel should show "Cannot disable" hint instead of a toggle button
    expect(screen.getByText('Cannot disable')).toBeInTheDocument()

    // There should be no Disable/Enable button for the global channel row.
    // The only Disable button should be for Trade Chat; Enable for Guild Chat.
    const disableButtons = screen.getAllByText('Disable')
    expect(disableButtons.length).toBe(1) // Only Trade Chat

    const enableButtons = screen.getAllByText('Enable')
    expect(enableButtons.length).toBe(1) // Only Guild Chat

    // api.patch should not have been called at all
    expect(vi.mocked(api.patch)).not.toHaveBeenCalled()
  })

  it('searches for player chat status', async () => {
    setupChannelsMock()
    render(<ChatManager />)

    await waitFor(() => {
      expect(screen.getByText('Chat Manager')).toBeInTheDocument()
    })

    // Mock the player status response for the search
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/player/42/status')) {
        return Promise.resolve(mockResponse(PLAYER_STATUS_ACTIVE) as Response)
      }
      return Promise.resolve(mockResponse(CHANNELS) as Response)
    })

    const input = screen.getByPlaceholderText('Player ID...')
    await userEvent.type(input, '42')

    const searchBtn = screen.getByText('Search')
    fireEvent.click(searchBtn)

    await waitFor(() => {
      expect(vi.mocked(api.get)).toHaveBeenCalledWith('/api/admin/chat/player/42/status')
    })

    // Player info should render
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument()
    })
  })

  it('mutes a player', async () => {
    setupChannelsMock()
    render(<ChatManager />)

    await waitFor(() => {
      expect(screen.getByText('Chat Manager')).toBeInTheDocument()
    })

    // Mock player search returning an active (unmuted) player
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/player/42/status')) {
        return Promise.resolve(mockResponse(PLAYER_STATUS_ACTIVE) as Response)
      }
      return Promise.resolve(mockResponse(CHANNELS) as Response)
    })

    const input = screen.getByPlaceholderText('Player ID...')
    await userEvent.type(input, '42')
    fireEvent.click(screen.getByText('Search'))

    // Wait for player result to render
    await waitFor(() => {
      expect(screen.getByText('Mute Player')).toBeInTheDocument()
    })

    // Mock the mute API call
    vi.mocked(api.post).mockResolvedValueOnce(
      mockResponse(PLAYER_STATUS_MUTED) as Response
    )

    fireEvent.click(screen.getByText('Mute Player'))

    await waitFor(() => {
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        '/api/admin/chat/mute',
        { player_id: 42, muted: true }
      )
    })
  })

  it('unmutes a player', async () => {
    setupChannelsMock()
    render(<ChatManager />)

    await waitFor(() => {
      expect(screen.getByText('Chat Manager')).toBeInTheDocument()
    })

    // Mock player search returning a muted player
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/player/42/status')) {
        return Promise.resolve(mockResponse(PLAYER_STATUS_MUTED) as Response)
      }
      return Promise.resolve(mockResponse(CHANNELS) as Response)
    })

    const input = screen.getByPlaceholderText('Player ID...')
    await userEvent.type(input, '42')
    fireEvent.click(screen.getByText('Search'))

    // Wait for muted player result — should show Unmute button
    await waitFor(() => {
      expect(screen.getByText('Unmute Player')).toBeInTheDocument()
    })

    // Verify the player is shown as Muted
    expect(screen.getByText('Muted')).toBeInTheDocument()

    // Mock the unmute API call
    vi.mocked(api.post).mockResolvedValueOnce(
      mockResponse(PLAYER_STATUS_ACTIVE) as Response
    )

    fireEvent.click(screen.getByText('Unmute Player'))

    await waitFor(() => {
      expect(vi.mocked(api.post)).toHaveBeenCalledWith(
        '/api/admin/chat/mute',
        { player_id: 42, muted: false }
      )
    })
  })
})
