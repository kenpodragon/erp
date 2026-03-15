import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock the api module used by child components
vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

// Mock NarrativeEditor since it's imported directly
vi.mock('../components/content/NarrativeEditor', () => ({
  default: () => <div data-testid="narrative-editor">NarrativeEditor Mock</div>,
}))

// Mock ContentEditor (lazy loaded)
vi.mock('./ContentEditor', () => ({
  default: () => <div data-testid="content-editor">ContentEditor Mock</div>,
}))

import WorldBuilder from './WorldBuilder'

describe('WorldBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with Narrative Editor tab active by default', () => {
    render(<WorldBuilder />)

    // Both tabs should be visible
    expect(screen.getByText('Narrative Editor')).toBeInTheDocument()
    expect(screen.getByText('Content Editor')).toBeInTheDocument()

    // Narrative editor should be rendered by default
    expect(screen.getByTestId('narrative-editor')).toBeInTheDocument()

    // The Narrative Editor tab should have the active class
    const narrativeTab = screen.getByText('Narrative Editor')
    expect(narrativeTab.className).toContain('admin-tab--active')
  })

  it('can switch between Narrative Editor and Content Editor tabs', async () => {
    render(<WorldBuilder />)

    // Initially Narrative Editor is shown
    expect(screen.getByTestId('narrative-editor')).toBeInTheDocument()

    // Click Content Editor tab
    fireEvent.click(screen.getByText('Content Editor'))

    // Content Editor should now be shown
    await waitFor(() => {
      expect(screen.getByTestId('content-editor')).toBeInTheDocument()
    })

    // Narrative Editor should no longer be in the DOM
    expect(screen.queryByTestId('narrative-editor')).not.toBeInTheDocument()

    // The Content Editor tab should be active
    const contentTab = screen.getByText('Content Editor')
    expect(contentTab.className).toContain('admin-tab--active')

    // Switch back to Narrative Editor
    fireEvent.click(screen.getByText('Narrative Editor'))

    await waitFor(() => {
      expect(screen.getByTestId('narrative-editor')).toBeInTheDocument()
    })
  })
})
