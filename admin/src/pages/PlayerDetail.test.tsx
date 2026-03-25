import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PlayerDetail from './PlayerDetail'
import { api } from '../api'

// Mock all modal sub-components — test page behavior, not modal internals
vi.mock('../components/admin/CharacterEditorModal', () => ({
  default: () => <div data-testid="char-editor-modal">CharacterEditorModal</div>,
}))
vi.mock('../components/admin/ItemCraftModal', () => ({
  default: () => <div data-testid="item-craft-modal">ItemCraftModal</div>,
}))
vi.mock('../components/admin/ItemEditorModal', () => ({
  default: () => <div data-testid="item-editor-modal">ItemEditorModal</div>,
}))
vi.mock('../components/admin/EssenceAdjustModal', () => ({
  default: () => <div data-testid="essence-modal">EssenceAdjustModal</div>,
}))
vi.mock('../components/admin/ProgressionEditorModal', () => ({
  default: () => <div data-testid="progression-modal">ProgressionEditorModal</div>,
}))
vi.mock('../components/admin/SkillEditorModal', () => ({
  default: () => <div data-testid="skill-modal">SkillEditorModal</div>,
}))
vi.mock('../components/admin/ActivityTimelineModal', () => ({
  default: () => <div data-testid="timeline-modal">ActivityTimelineModal</div>,
}))
vi.mock('./finance/PlayerFinanceWidget', () => ({
  default: () => <div data-testid="finance-widget">PlayerFinanceWidget</div>,
}))

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const mockedApi = api as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  patch: ReturnType<typeof vi.fn>
}

function makePlayer(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    firebase_uid: 'uid_abc123',
    email: 'player@test.com',
    alias: 'TestHero',
    google_display_name: 'Test Player',
    google_avatar_url: 'https://example.com/avatar.png',
    custom_avatar_url: null,
    avatar_preset_key: null,
    is_banned: false,
    banned_at: null,
    banned_by: null,
    ban_reason: null,
    sessions_invalid_before: null,
    created_at: '2026-01-01T00:00:00Z',
    last_login_at: '2026-03-20T10:00:00Z',
    terms_accepted_at: '2026-01-02T00:00:00Z',
    is_owner: false,
    is_system_admin: false,
    is_game_admin: false,
    ...overrides,
  }
}

function makeCharacter(overrides: Record<string, unknown> = {}) {
  return {
    id: 20,
    character_name: 'Arion',
    level: 25,
    character_xp: 48000,
    class_id: 1,
    class: { name: 'Warrior', sprite_key: 'warrior_m' },
    strength: 50,
    agility: 30,
    intelligence: 20,
    created_at: '2026-01-05T00:00:00Z',
    last_played_at: '2026-03-14T10:00:00Z',
    ...overrides,
  }
}

function makeTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: 100,
    subject: 'Cannot login',
    category: 'bug',
    status: 'open',
    priority: 'high',
    created_at: '2026-03-15T00:00:00Z',
    ...overrides,
  }
}

function mockOk(body: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
}

function mockFail(status = 500, body: unknown = { detail: 'Server error' }) {
  return Promise.resolve({ ok: false, status, json: () => Promise.resolve(body) })
}

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/players/10']}>
      <Routes>
        <Route path="/players/:id" element={<PlayerDetail />} />
      </Routes>
    </MemoryRouter>
  )
}

/* ------------------------------------------------------------------ */
/* Default mock setup                                                  */
/* ------------------------------------------------------------------ */

function setupDefaultMocks(playerOverrides: Record<string, unknown> = {}, chars = [makeCharacter()], tickets = [makeTicket()]) {
  mockedApi.get.mockImplementation((url: string) => {
    if (url === '/api/admin/me')
      return mockOk({ email: 'admin@test.com', is_owner: true })
    if (url.startsWith('/api/admin/players/') && !url.includes('/ban') && !url.includes('/unban') && !url.includes('/logout'))
      return mockOk({ player: makePlayer(playerOverrides), characters: chars, recent_tickets: tickets })
    if (url.includes('/essence/history'))
      return mockOk({ current_balance: 5000 })
    if (url.includes('/inventory'))
      return mockOk({ equipped: [], bag: [], bag_count: 0, bag_capacity: 20, artifacts: [] })
    return mockOk({})
  })
  mockedApi.post.mockImplementation(() => mockOk({}))
  mockedApi.patch.mockImplementation(() => mockOk({}))
}

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

describe('PlayerDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    setupDefaultMocks()
  })

  // --- Loading / Error / Empty states ---

  it('shows loading state before data arrives', () => {
    mockedApi.get.mockImplementation(() => new Promise(() => {}))
    renderWithRouter()
    expect(screen.getByText('Loading player detail...')).toBeDefined()
  })

  it('shows error state on API failure', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/api/admin/me') return mockOk({ email: 'a@b.com', is_owner: false })
      return mockFail()
    })

    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to load player detail')).toBeDefined()
    })
  })

  it('shows error when API returns null player (triggers JS error)', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/api/admin/me') return mockOk({ email: 'a@b.com', is_owner: false })
      // null player causes data.player.alias to throw
      return mockOk({ player: null, characters: [], recent_tickets: [] })
    })

    renderWithRouter()

    await waitFor(() => {
      // The component hits an error accessing null.alias, which lands in the catch block
      expect(screen.getByText(/Error:/)).toBeDefined()
    })
  })

  // --- Player identity rendering ---

  it('renders player alias and email after loading', async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('TestHero')).toBeDefined()
    })
    expect(screen.getByText('player@test.com')).toBeDefined()
  })

  it('renders firebase UID', async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('UID: uid_abc123')).toBeDefined()
    })
  })

  it('displays google_display_name when alias is null', async () => {
    setupDefaultMocks({ alias: null })
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Test Player')).toBeDefined()
    })
  })

  it('displays "New Player" when alias and display name are both null', async () => {
    setupDefaultMocks({ alias: null, google_display_name: null })
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('New Player')).toBeDefined()
    })
  })

  // --- Status badges ---

  it('shows Active badge for non-banned player', async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeDefined()
    })
  })

  it('shows Banned badge and ban reason for banned player', async () => {
    setupDefaultMocks({ is_banned: true, ban_reason: 'Cheating detected' })
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Banned')).toBeDefined()
    })
    expect(screen.getByText('Reason: Cheating detected')).toBeDefined()
  })

  // --- Action buttons ---

  it('shows "Ban Player" button for non-banned player', async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Ban Player')).toBeDefined()
    })
  })

  it('shows "Unban Player" button for banned player', async () => {
    setupDefaultMocks({ is_banned: true, ban_reason: 'Spam' }, [], [])
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Unban Player')).toBeDefined()
    })
  })

  it('Ban Player button opens ban modal', async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Ban Player')).toBeDefined()
    })

    fireEvent.click(screen.getByText('Ban Player'))

    expect(screen.getByText('Ban Player: TestHero')).toBeDefined()
    expect(screen.getByPlaceholderText('Enter reason for account suspension...')).toBeDefined()
  })

  it('Confirm Ban button is disabled when reason is too short', async () => {
    renderWithRouter()
    await waitFor(() => expect(screen.getByText('Ban Player')).toBeDefined())

    fireEvent.click(screen.getByText('Ban Player'))

    const confirmBtn = screen.getByText('Confirm Ban')
    expect(confirmBtn).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText('Enter reason for account suspension...'), {
      target: { value: 'short' },
    })
    expect(confirmBtn).toBeDisabled()
  })

  it('Confirm Ban calls API when reason is long enough', async () => {
    renderWithRouter()
    await waitFor(() => expect(screen.getByText('Ban Player')).toBeDefined())

    fireEvent.click(screen.getByText('Ban Player'))

    fireEvent.change(screen.getByPlaceholderText('Enter reason for account suspension...'), {
      target: { value: 'This player was caught cheating multiple times' },
    })

    fireEvent.click(screen.getByText('Confirm Ban'))

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/api/admin/players/10/ban',
        { reason: 'This player was caught cheating multiple times' }
      )
    })
  })

  it('Unban button calls POST to unban endpoint', async () => {
    setupDefaultMocks({ is_banned: true, ban_reason: 'Test ban' }, [], [])
    renderWithRouter()

    await waitFor(() => expect(screen.getByText('Unban Player')).toBeDefined())

    fireEvent.click(screen.getByText('Unban Player'))

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/api/admin/players/10/unban')
    })
  })

  it('Force Logout calls POST to logout endpoint', async () => {
    renderWithRouter()
    await waitFor(() => expect(screen.getByText('Force Logout')).toBeDefined())

    fireEvent.click(screen.getByText('Force Logout'))

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith('/api/admin/players/10/logout')
    })
  })

  // --- Edit Alias ---

  it('Edit Alias button opens alias modal', async () => {
    renderWithRouter()
    await waitFor(() => expect(screen.getByText('Edit Alias')).toBeDefined())

    fireEvent.click(screen.getByText('Edit Alias'))

    expect(screen.getByText('Update Player Alias')).toBeDefined()
    expect(screen.getByPlaceholderText('Enter new alias...')).toBeDefined()
  })

  it('Save Alias calls PATCH to update alias', async () => {
    renderWithRouter()
    await waitFor(() => expect(screen.getByText('Edit Alias')).toBeDefined())

    fireEvent.click(screen.getByText('Edit Alias'))

    fireEvent.change(screen.getByPlaceholderText('Enter new alias...'), {
      target: { value: 'NewAlias' },
    })

    fireEvent.click(screen.getByText('Save Alias'))

    await waitFor(() => {
      expect(mockedApi.patch).toHaveBeenCalledWith(
        '/api/admin/players/10',
        { alias: 'NewAlias' }
      )
    })
  })

  // --- Permissions ---

  it('shows permission toggles when viewer is owner', async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('Permissions (Owner Only)')).toBeDefined()
    })
    expect(screen.getByText('System Admin')).toBeDefined()
    expect(screen.getByText('Game Admin')).toBeDefined()
  })

  it('hides permission toggles when viewer is not owner', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/api/admin/me')
        return mockOk({ email: 'admin@test.com', is_owner: false })
      if (url.startsWith('/api/admin/players/'))
        return mockOk({ player: makePlayer(), characters: [], recent_tickets: [] })
      return mockOk({})
    })

    renderWithRouter()

    await waitFor(() => expect(screen.getByText('TestHero')).toBeDefined())
    expect(screen.queryByText('Permissions (Owner Only)')).toBeNull()
  })

  // --- Characters ---

  it('renders character name, level, class, and stats', async () => {
    renderWithRouter()

    await waitFor(() => expect(screen.getByText('Arion')).toBeDefined())
    expect(screen.getByText('Level 25')).toBeDefined()
    expect(screen.getByText('Warrior')).toBeDefined()
    expect(screen.getByText('STR: 50')).toBeDefined()
    expect(screen.getByText('AGI: 30')).toBeDefined()
    expect(screen.getByText('INT: 20')).toBeDefined()
  })

  it('shows empty character message when no characters', async () => {
    setupDefaultMocks({}, [], [])
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('No characters created yet.')).toBeDefined()
    })
  })

  it('renders character action buttons', async () => {
    renderWithRouter()
    await waitFor(() => expect(screen.getByText('Arion')).toBeDefined())

    expect(screen.getByText('Edit Character')).toBeDefined()
    expect(screen.getByText('Craft Item')).toBeDefined()
    expect(screen.getByText('Adjust Essence')).toBeDefined()
    expect(screen.getByText('Edit Progression')).toBeDefined()
    expect(screen.getByText('Edit Skills')).toBeDefined()
  })

  it('shows essence balance for character', async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText(/Essence:/)).toBeDefined()
    })
  })

  // --- Tickets ---

  it('renders ticket subject and status', async () => {
    renderWithRouter()

    await waitFor(() => expect(screen.getByText('Cannot login')).toBeDefined())
    expect(screen.getByText('open')).toBeDefined()
  })

  it('shows empty tickets message when no tickets', async () => {
    setupDefaultMocks({}, [makeCharacter()], [])
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText('No support tickets found.')).toBeDefined()
    })
  })

  // --- Account info section ---

  it('renders Account Information section with player ID', async () => {
    renderWithRouter()

    await waitFor(() => expect(screen.getByText('Account Information')).toBeDefined())
    expect(screen.getByText('Player ID')).toBeDefined()
  })

  // --- Finance widget ---

  it('renders finance widget', async () => {
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByTestId('finance-widget')).toBeDefined()
    })
  })

  // --- Activity Timeline modal ---

  it('Activity Timeline button opens timeline modal', async () => {
    renderWithRouter()
    await waitFor(() => expect(screen.getByText('Activity Timeline')).toBeDefined())

    fireEvent.click(screen.getByText('Activity Timeline'))

    expect(screen.getByTestId('timeline-modal')).toBeDefined()
  })

  // --- Inventory expansion ---

  it('inventory section expands on click and fetches data', async () => {
    renderWithRouter()
    await waitFor(() => expect(screen.getByText('Arion')).toBeDefined())

    const toggles = document.querySelectorAll('.char-inventory-toggle')
    expect(toggles.length).toBe(1)

    fireEvent.click(toggles[0])

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/api/admin/characters/20/inventory')
    })
  })
})
