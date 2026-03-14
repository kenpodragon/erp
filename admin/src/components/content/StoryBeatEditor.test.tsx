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

vi.mock('./shared/CascadingPicker', () => ({
  default: ({ value, onChange }: any) => (
    <div data-testid="cascading-picker">
      <select data-testid="picker-scene" value={value.sceneId || ''} onChange={e => onChange({ ...value, sceneId: e.target.value ? Number(e.target.value) : undefined })}>
        <option value="">-- Select Scene --</option>
        <option value="100">Scene 1</option>
      </select>
    </div>
  ),
}))

vi.mock('./shared/LocationPicker', () => ({
  default: ({ value, onChange }: any) => <select data-testid="location-picker"><option value="">None</option></select>,
}))

vi.mock('./shared/AssetPicker', () => ({
  default: ({ value, onChange }: any) => <select data-testid="asset-picker"><option value="">None</option></select>,
}))

vi.mock('./shared/DeleteConfirmDialog', () => ({
  default: ({ resourceName, isBlocked, onConfirm, onCancel }: any) => (
    <div data-testid="delete-dialog">
      <span>{resourceName}</span>
      <button onClick={onConfirm}>Confirm Delete</button>
      <button onClick={onCancel}>Cancel Delete</button>
    </div>
  ),
}))

vi.mock('./EntityBeatMapper', () => ({
  default: ({ beatId }: any) => <div data-testid="entity-beat-mapper">Mapper for {beatId}</div>,
}))

import { api } from '../../api'
import StoryBeatEditor from './StoryBeatEditor'

function mockResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: () => Promise.resolve(data) }
}

const BEATS = [
  { id: 1000, scene_id: 100, beat_number: 1, sort_order: 0, summary: 'Hero enters the tower', raw_text: 'The hero steps into the darkness.', intensity: 3, pacing: 'slow', timeline_context: 'dawn', location_id: null, int_threshold: null, hidden_text: null, image_asset_key: null, audio_path: null, audio_duration: null },
  { id: 1001, scene_id: 100, beat_number: 2, sort_order: 1, summary: 'First encounter', raw_text: null, intensity: 4, pacing: 'building', timeline_context: null, location_id: null, int_threshold: null, hidden_text: 'Secret lore here', image_asset_key: null, audio_path: null, audio_duration: null },
]

describe('StoryBeatEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/api/admin/content/beats?scene_id=100')) return Promise.resolve(mockResponse(BEATS) as Response)
      if (path.includes('/api/admin/content/semantic-tags')) return Promise.resolve(mockResponse([]) as Response)
      if (path.includes('/api/admin/content/books')) return Promise.resolve(mockResponse([]) as Response)
      return Promise.resolve(mockResponse([]) as Response)
    })
    vi.mocked(api.post).mockResolvedValue(mockResponse({ id: 1002 }) as Response)
    vi.mocked(api.patch).mockResolvedValue(mockResponse({ ok: true }) as Response)
    vi.mocked(api.delete).mockResolvedValue(mockResponse({ ok: true }) as Response)
  })

  it('renders and loads beats', async () => {
    render(<StoryBeatEditor initialSceneId={100} />)

    await waitFor(() => {
      expect(screen.getByText(/Hero enters the tower/)).toBeInTheDocument()
      expect(screen.getByText(/First encounter/)).toBeInTheDocument()
    })

    expect(screen.getByText('2 beats')).toBeInTheDocument()
  })

  it('filters by scene', async () => {
    render(<StoryBeatEditor />)

    // Without a scene selected, should show empty message
    expect(screen.getByText('Select a scene to view beats.')).toBeInTheDocument()

    // No beats API call should have been made without a scene
    expect(api.get).not.toHaveBeenCalledWith(expect.stringContaining('/api/admin/content/beats'))
  })

  it('creates new beat', async () => {
    render(<StoryBeatEditor initialSceneId={100} />)

    await waitFor(() => screen.getByText(/Hero enters the tower/))

    fireEvent.click(screen.getByText('+ New Beat'))

    await waitFor(() => {
      expect(screen.getByText('Create Beat')).toBeInTheDocument()
    })

    // Fill in summary - use getAllByText since "Summary" appears in both table header and form label
    const summaryLabels = screen.getAllByText('Summary')
    const summaryLabel = summaryLabels.find(el => el.classList.contains('form-label'))!
    const summaryTextarea = summaryLabel.closest('.form-field')!.querySelector('textarea')!
    await userEvent.type(summaryTextarea, 'A new encounter begins')

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/admin/content/beats',
        expect.objectContaining({ summary: 'A new encounter begins', scene_id: 100 })
      )
    })
  })

  it('updates beat with narrative text', async () => {
    render(<StoryBeatEditor initialSceneId={100} />)

    await waitFor(() => screen.getByText(/Hero enters the tower/))

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Edit Beat #1000')).toBeInTheDocument()
    })

    // The raw text textarea should have the existing content
    expect(screen.getByDisplayValue('The hero steps into the darkness.')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/api/admin/content/beats/1000',
        expect.objectContaining({
          summary: 'Hero enters the tower',
          raw_text: 'The hero steps into the darkness.',
        })
      )
    })
  })

  it('reorder mode sends PATCH /beats/reorder', async () => {
    render(<StoryBeatEditor initialSceneId={100} />)

    await waitFor(() => screen.getByText(/Hero enters the tower/))

    // Enter reorder mode
    fireEvent.click(screen.getByText('Reorder'))

    // Should show "Done Reordering" button
    expect(screen.getByText('Done Reordering')).toBeInTheDocument()

    // Move second beat up
    const downButtons = screen.getAllByText('v')
    fireEvent.click(downButtons[0])

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/api/admin/content/beats/reorder',
        expect.arrayContaining([
          expect.objectContaining({ id: expect.any(Number), sort_order: expect.any(Number) }),
        ])
      )
    })
  })

  it('delete blocked when references exist', async () => {
    render(<StoryBeatEditor initialSceneId={100} />)

    await waitFor(() => screen.getByText(/Hero enters the tower/))

    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByTestId('delete-dialog')).toBeInTheDocument()
    })

    // The dialog should show with the beat name
    expect(screen.getByText('Beat #1')).toBeInTheDocument()
  })
})
