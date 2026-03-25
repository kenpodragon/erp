import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AssetRegistry from './AssetRegistry'
import { api } from '../api'

// Mock AssetPreview (uses canvas/PixiJS internals)
vi.mock('../components/AssetPreview', () => ({
  default: ({ category }: { category: string }) => (
    <div data-testid="asset-preview">{category}</div>
  ),
}))

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const mockedApi = api as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

function makeAsset(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    asset_key: 'enemy_slime',
    category: 'entity_sprite',
    display_name: 'Slime',
    description: 'A basic slime',
    render_definition: { base_shape: 'circle' },
    tags: ['book_1', 'melee'],
    source: 'admin',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeListResponse(items: unknown[] = [makeAsset()], total?: number) {
  return {
    items,
    total: total ?? items.length,
    page: 1,
    page_size: 50,
  }
}

function mockOk(body: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
}

function mockFail(status = 500, body: unknown = { detail: 'Server error' }) {
  return Promise.resolve({ ok: false, status, json: () => Promise.resolve(body) })
}

/* ------------------------------------------------------------------ */
/* Setup                                                               */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  vi.clearAllMocks()
  mockedApi.get.mockImplementation((url: string) => {
    if (url.startsWith('/api/admin/assets/orphans/missing'))
      return mockOk({ missing: [] })
    if (url.startsWith('/api/admin/assets/orphans/unused'))
      return mockOk({ unused: [] })
    if (url.startsWith('/api/admin/assets/?'))
      return mockOk(makeListResponse())
    return mockOk({ ...makeAsset(), reference_count: 0 })
  })
  mockedApi.post.mockImplementation(() => mockOk(makeAsset()))
  mockedApi.put.mockImplementation(() => mockOk(makeAsset()))
  mockedApi.delete.mockImplementation(() => mockOk({}))
})

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

describe('AssetRegistry', () => {
  it('fetches assets on mount and renders the table', async () => {
    render(<AssetRegistry />)

    await waitFor(() => {
      expect(screen.getByText('enemy_slime')).toBeDefined()
    })

    const firstCall = mockedApi.get.mock.calls[0][0] as string
    expect(firstCall).toContain('/api/admin/assets/?')
    expect(firstCall).toContain('page=1')
    expect(firstCall).toContain('page_size=50')
  })

  it('renders column headers in the asset table', async () => {
    render(<AssetRegistry />)

    await waitFor(() => {
      expect(screen.getByText('Asset Key')).toBeDefined()
    })
    expect(screen.getByText('Display Name')).toBeDefined()
    expect(screen.getByText('Category')).toBeDefined()
    expect(screen.getByText('Tags')).toBeDefined()
    expect(screen.getByText('Source')).toBeDefined()
    expect(screen.getByText('Actions')).toBeDefined()
  })

  it('shows loading state before data arrives', () => {
    mockedApi.get.mockImplementation(() => new Promise(() => {}))
    render(<AssetRegistry />)
    expect(screen.getByText('Loading assets...')).toBeDefined()
  })

  it('shows empty state when no assets returned', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url.startsWith('/api/admin/assets/?'))
        return mockOk(makeListResponse([], 0))
      return mockOk({})
    })

    render(<AssetRegistry />)

    await waitFor(() => {
      expect(screen.getByText(/No assets found/)).toBeDefined()
    })
  })

  it('shows error message when API fails', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url.startsWith('/api/admin/assets/?'))
        return mockFail()
      return mockOk({})
    })

    render(<AssetRegistry />)

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch assets')).toBeDefined()
    })
  })

  it('renders category filter tabs including All', async () => {
    render(<AssetRegistry />)

    await waitFor(() => {
      expect(screen.getByText('All')).toBeDefined()
    })
    // Use getAllByText since category names appear in both the tab and table badge
    expect(screen.getAllByText('entity sprite').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('item icon')).toBeDefined()
    expect(screen.getByText('background')).toBeDefined()
  })

  it('clicking a category filter triggers API call with category param', async () => {
    render(<AssetRegistry />)

    await waitFor(() => {
      expect(screen.getByText('enemy_slime')).toBeDefined()
    })

    mockedApi.get.mockClear()
    mockedApi.get.mockImplementation((url: string) => {
      if (url.startsWith('/api/admin/assets/?'))
        return mockOk(makeListResponse())
      return mockOk({})
    })

    // Click the category tab (not the table badge) — use the tab container
    const categoryTabs = screen.getAllByText('entity sprite')
    const tabButton = categoryTabs.find(el => el.classList.contains('ar-category-tab'))!
    fireEvent.click(tabButton)

    await waitFor(() => {
      const calls = mockedApi.get.mock.calls.map(c => c[0] as string)
      const assetCall = calls.find(u => u.includes('/api/admin/assets/?'))
      expect(assetCall).toBeDefined()
      expect(assetCall).toContain('category=entity_sprite')
    })
  })

  it('search input triggers debounced API call', async () => {
    render(<AssetRegistry />)

    await waitFor(() => {
      expect(screen.getByText('enemy_slime')).toBeDefined()
    })

    mockedApi.get.mockClear()
    mockedApi.get.mockImplementation((url: string) => {
      if (url.startsWith('/api/admin/assets/?'))
        return mockOk(makeListResponse())
      return mockOk({})
    })

    const searchInput = screen.getByPlaceholderText('Search assets...')
    fireEvent.change(searchInput, { target: { value: 'slime' } })

    // Debounce is 300ms — wait for it to fire naturally
    await waitFor(() => {
      const calls = mockedApi.get.mock.calls.map(c => c[0] as string)
      const searchCall = calls.find(u => u.includes('search=slime'))
      expect(searchCall).toBeDefined()
    }, { timeout: 2000 })
  })

  it('pagination displays total and page info', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url.startsWith('/api/admin/assets/?'))
        return mockOk(makeListResponse([makeAsset()], 75))
      return mockOk({})
    })

    render(<AssetRegistry />)

    await waitFor(() => {
      expect(screen.getByText('75 assets total')).toBeDefined()
    })
    expect(screen.getByText('Page 1 of 2')).toBeDefined()
  })

  it('next page button triggers API call with page=2', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url.startsWith('/api/admin/assets/?'))
        return mockOk(makeListResponse([makeAsset()], 75))
      return mockOk({})
    })

    render(<AssetRegistry />)

    await waitFor(() => {
      expect(screen.getByText('Page 1 of 2')).toBeDefined()
    })

    mockedApi.get.mockClear()
    mockedApi.get.mockImplementation((url: string) => {
      if (url.startsWith('/api/admin/assets/?'))
        return mockOk(makeListResponse([makeAsset({ id: 2, asset_key: 'enemy_bat' })], 75))
      return mockOk({})
    })

    fireEvent.click(screen.getByText('Next'))

    await waitFor(() => {
      const calls = mockedApi.get.mock.calls.map(c => c[0] as string)
      const pageCall = calls.find(u => u.includes('page=2'))
      expect(pageCall).toBeDefined()
    })
  })

  it('prev button is disabled on first page', async () => {
    render(<AssetRegistry />)

    await waitFor(() => {
      expect(screen.getByText('enemy_slime')).toBeDefined()
    })

    const prevBtn = screen.getByText('Prev')
    expect(prevBtn).toBeDisabled()
  })

  it('New Asset button opens create modal', async () => {
    render(<AssetRegistry />)

    await waitFor(() => {
      expect(screen.getByText('enemy_slime')).toBeDefined()
    })

    fireEvent.click(screen.getByText('+ New Asset'))

    expect(screen.getByText('Create Asset')).toBeDefined()
    const keyInput = screen.getByPlaceholderText('e.g., enemy_sludge_stalker')
    expect(keyInput).not.toBeDisabled()
    expect((keyInput as HTMLInputElement).value).toBe('')
  })

  it('edit button opens edit modal with asset data', async () => {
    render(<AssetRegistry />)

    await waitFor(() => {
      expect(screen.getByText('enemy_slime')).toBeDefined()
    })

    fireEvent.click(screen.getByText('Edit'))

    expect(screen.getByText('Edit Asset')).toBeDefined()
    const keyInput = screen.getByPlaceholderText('e.g., enemy_sludge_stalker')
    expect(keyInput).toBeDisabled()
    expect((keyInput as HTMLInputElement).value).toBe('enemy_slime')
  })

  it('delete button opens confirmation dialog', async () => {
    render(<AssetRegistry />)

    await waitFor(() => {
      expect(screen.getByText('enemy_slime')).toBeDefined()
    })

    fireEvent.click(screen.getByText('Del'))

    await waitFor(() => {
      expect(screen.getByText('Delete Asset')).toBeDefined()
    })
  })

  it('confirming delete calls API and refreshes list', async () => {
    render(<AssetRegistry />)

    await waitFor(() => {
      expect(screen.getByText('enemy_slime')).toBeDefined()
    })

    fireEvent.click(screen.getByText('Del'))

    await waitFor(() => {
      expect(screen.getByText('Delete Asset')).toBeDefined()
    })

    mockedApi.get.mockClear()
    mockedApi.get.mockImplementation((url: string) => {
      if (url.startsWith('/api/admin/assets/?'))
        return mockOk(makeListResponse([], 0))
      return mockOk({})
    })

    const deleteButtons = screen.getAllByText('Delete')
    const confirmDeleteBtn = deleteButtons.find(
      btn => btn.closest('.ar-confirm-dialog') !== null
    )!
    fireEvent.click(confirmDeleteBtn)

    await waitFor(() => {
      expect(mockedApi.delete).toHaveBeenCalledWith('/api/admin/assets/enemy_slime')
    })

    await waitFor(() => {
      const getCalls = mockedApi.get.mock.calls.map(c => c[0] as string)
      expect(getCalls.some(u => u.includes('/api/admin/assets/?'))).toBe(true)
    })
  })

  it('orphan detection panel toggles on click', async () => {
    render(<AssetRegistry />)

    await waitFor(() => {
      expect(screen.getByText('enemy_slime')).toBeDefined()
    })

    expect(screen.getByText('Expand')).toBeDefined()

    fireEvent.click(screen.getByText('Orphan Detection'))

    await waitFor(() => {
      expect(screen.getByText('Collapse')).toBeDefined()
    })

    expect(screen.getByText(/Missing Assets/)).toBeDefined()
    expect(screen.getByText(/Unused Assets/)).toBeDefined()
  })

  it('opening orphan panel fetches orphan data', async () => {
    render(<AssetRegistry />)

    await waitFor(() => {
      expect(screen.getByText('enemy_slime')).toBeDefined()
    })

    mockedApi.get.mockClear()
    mockedApi.get.mockImplementation((url: string) => {
      if (url.includes('orphans/missing'))
        return mockOk({
          missing: [{
            asset_key: 'missing_sprite',
            referenced_in: [{ table: 'enemies', column: 'sprite_key', count: 3 }],
            suggested_category: 'entity_sprite',
          }],
        })
      if (url.includes('orphans/unused'))
        return mockOk({ unused: [] })
      return mockOk(makeListResponse())
    })

    fireEvent.click(screen.getByText('Orphan Detection'))

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/api/admin/assets/orphans/missing')
      expect(mockedApi.get).toHaveBeenCalledWith('/api/admin/assets/orphans/unused')
    })

    await waitFor(() => {
      expect(screen.getByText('missing_sprite')).toBeDefined()
    })
  })

  it('create modal save calls api.post with correct body', async () => {
    render(<AssetRegistry />)

    await waitFor(() => {
      expect(screen.getByText('enemy_slime')).toBeDefined()
    })

    fireEvent.click(screen.getByText('+ New Asset'))

    fireEvent.change(screen.getByPlaceholderText('e.g., enemy_sludge_stalker'), {
      target: { value: 'new_asset_key' },
    })
    fireEvent.change(screen.getByPlaceholderText('Human-readable name'), {
      target: { value: 'New Asset' },
    })

    fireEvent.click(screen.getByText('Create'))

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledTimes(1)
      const [url, body] = mockedApi.post.mock.calls[0]
      expect(url).toBe('/api/admin/assets/')
      expect(body.asset_key).toBe('new_asset_key')
      expect(body.display_name).toBe('New Asset')
      expect(body.category).toBe('entity_sprite')
      expect(body.source).toBe('admin')
    })
  })

  it('displays asset tags as chips', async () => {
    render(<AssetRegistry />)

    await waitFor(() => {
      expect(screen.getByText('book_1')).toBeDefined()
      expect(screen.getByText('melee')).toBeDefined()
    })
  })

  it('displays source badge for asset', async () => {
    render(<AssetRegistry />)

    await waitFor(() => {
      const sourceElements = screen.getAllByText('admin')
      expect(sourceElements.length).toBeGreaterThan(0)
    })
  })
})
