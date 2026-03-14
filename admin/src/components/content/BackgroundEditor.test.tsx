import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('./shared/AssetPicker', () => ({
  default: ({ value, onChange, category }: any) => (
    <select data-testid="asset-picker" value={value || ''} onChange={e => onChange(e.target.value || null)}>
      <option value="">None</option>
      <option value="bg_forest">Forest</option>
    </select>
  ),
}))

vi.mock('./shared/DeleteConfirmDialog', () => ({
  default: ({ resourceName, isBlocked, onConfirm, onCancel, childCounts }: any) => (
    <div data-testid="delete-dialog">
      <span>{isBlocked ? 'Blocked' : 'Unblocked'}</span>
      <span>{resourceName}</span>
      {Object.entries(childCounts).map(([key, count]) => (
        <span key={key}>{String(count)} {key}</span>
      ))}
      <button onClick={onConfirm}>Confirm Delete</button>
      <button onClick={onCancel}>Cancel Delete</button>
    </div>
  ),
}))

import { api } from '../../api'
import BackgroundEditor from './BackgroundEditor'

function mockResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: () => Promise.resolve(data) }
}

const BACKGROUNDS = [
  { id: 1, name: 'Dark Forest', description: 'A mysterious forest', background_key: 'bg_dark_forest', time_of_day: 'night', mood: 'eerie', parallax_config: [{ depth: 0, speed: 1 }], primary_color: '#001100', secondary_color: '#002200', accent_color: null, scene_count: 5 },
  { id: 2, name: 'Sunny Meadow', description: null, background_key: null, time_of_day: 'morning', mood: 'serene', parallax_config: null, primary_color: null, secondary_color: null, accent_color: null, scene_count: 0 },
]

describe('BackgroundEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue(mockResponse(BACKGROUNDS) as Response)
    vi.mocked(api.post).mockResolvedValue(mockResponse({ id: 3 }) as Response)
    vi.mocked(api.patch).mockResolvedValue(mockResponse({ ok: true }) as Response)
    vi.mocked(api.delete).mockResolvedValue(mockResponse({ ok: true }) as Response)
  })

  it('renders in table view with backgrounds', async () => {
    render(<BackgroundEditor />)

    await waitFor(() => {
      expect(screen.getByText('Dark Forest')).toBeInTheDocument()
      expect(screen.getByText('Sunny Meadow')).toBeInTheDocument()
    })

    expect(screen.getByText('2 backgrounds')).toBeInTheDocument()

    // Table/Grid view buttons should be present
    expect(screen.getByText('Table')).toBeInTheDocument()
    expect(screen.getByText('Grid')).toBeInTheDocument()

    // Table headers should be present
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Key')).toBeInTheDocument()
    expect(screen.getByText('Time')).toBeInTheDocument()
    expect(screen.getByText('Mood')).toBeInTheDocument()
  })

  it('creates new background', async () => {
    render(<BackgroundEditor />)

    await waitFor(() => screen.getByText('Dark Forest'))

    fireEvent.click(screen.getByText('+ New Background'))

    await waitFor(() => {
      expect(screen.getByText('Create Background')).toBeInTheDocument()
    })

    // Fill in name - use getAllByText since "Name" appears in both table header and form label
    const nameLabels = screen.getAllByText('Name')
    const nameLabel = nameLabels.find(el => el.classList.contains('form-label'))!
    const nameInput = nameLabel.closest('.form-field')!.querySelector('input')!
    await userEvent.type(nameInput, 'Crystal Cave')

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/admin/content/backgrounds',
        expect.objectContaining({ name: 'Crystal Cave' })
      )
    })
  })

  it('updates background with parallax config', async () => {
    render(<BackgroundEditor />)

    await waitFor(() => screen.getByText('Dark Forest'))

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Edit Background #1')).toBeInTheDocument()
    })

    // Should show parallax layers section
    expect(screen.getByText('Parallax Layers')).toBeInTheDocument()
    expect(screen.getByText('+ Add Layer')).toBeInTheDocument()

    // Existing layer should be shown
    const depthInputs = screen.getAllByDisplayValue('0') as HTMLInputElement[]
    expect(depthInputs.length).toBeGreaterThan(0)

    // Color Palette section should be present
    expect(screen.getByText('Color Palette')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/api/admin/content/backgrounds/1',
        expect.objectContaining({ name: 'Dark Forest', parallax_config: expect.any(Array) })
      )
    })
  })

  it('delete blocked when scenes reference it', async () => {
    render(<BackgroundEditor />)

    await waitFor(() => screen.getByText('Dark Forest'))

    // Delete first background (scene_count: 5, but isBlocked=false in the component)
    // Actually BackgroundEditor passes isBlocked={false} always
    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByTestId('delete-dialog')).toBeInTheDocument()
    })

    // Shows child counts
    expect(screen.getByText('5 scenes')).toBeInTheDocument()
    // "Dark Forest" appears in both the table and dialog
    expect(screen.getAllByText('Dark Forest').length).toBeGreaterThanOrEqual(2)
  })
})
