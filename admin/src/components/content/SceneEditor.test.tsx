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
  default: ({ value, onChange, optional }: any) => (
    <div data-testid="cascading-picker">
      <select data-testid="picker-book" value={value.bookId || ''} onChange={e => onChange({ bookId: e.target.value ? Number(e.target.value) : undefined })}>
        <option value="">All</option>
        <option value="1">Book 1</option>
      </select>
      <select data-testid="picker-chapter" value={value.chapterId || ''} onChange={e => onChange({ bookId: value.bookId, chapterId: e.target.value ? Number(e.target.value) : undefined })}>
        <option value="">All</option>
        <option value="10">Ch 1</option>
      </select>
    </div>
  ),
}))

vi.mock('./shared/LocationPicker', () => ({
  default: ({ value, onChange }: any) => <select data-testid="location-picker" value={value || ''} onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}><option value="">None</option></select>,
}))

vi.mock('./shared/AssetPicker', () => ({
  default: ({ value, onChange, category }: any) => (
    <select data-testid={`asset-picker-${category}`} value={value || ''} onChange={e => onChange(e.target.value || null)}>
      <option value="">None</option>
      <option value="bg_forest">Forest</option>
    </select>
  ),
}))

vi.mock('./shared/AtmospherePicker', () => ({
  default: ({ value, onChange }: any) => (
    <select data-testid="atmosphere-picker" value={value || ''} onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}>
      <option value="">None</option>
    </select>
  ),
}))

vi.mock('./shared/EntityPicker', () => ({
  default: ({ value, onChange }: any) => (
    <select data-testid="entity-picker" value={value || ''} onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}>
      <option value="">None</option>
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

vi.mock('./WaveConfigPanel', () => ({
  default: ({ sceneId }: any) => <div data-testid="wave-config-panel">WaveConfig for {sceneId}</div>,
}))

import { api } from '../../api'
import SceneEditor from './SceneEditor'

function mockResponse(data: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: () => Promise.resolve(data) }
}

const SCENES = [
  { id: 100, chapter_id: 10, scene_number: 1, sort_order: 0, title: 'Intro', summary: 'Opening scene', scene_type: 'narrative', location_id: null, location_name: null, hard_break: false, raw_text: null, duration: null, background_key: null, boss_scene: false, atmosphere_id: null, boss_entity_id: null, boss_timer_seconds: null, boss_interrupts: [], beats_count: 3, entities_count: 2 },
  { id: 101, chapter_id: 10, scene_number: 2, sort_order: 1, title: 'Boss Fight', summary: null, scene_type: 'chapter_boss', location_id: null, location_name: null, hard_break: false, raw_text: null, duration: 60, background_key: null, boss_scene: true, atmosphere_id: null, boss_entity_id: 5, boss_timer_seconds: 120, boss_interrupts: [{ type: 'click_burst', interval: 10, duration: 5, difficulty: 1 }], beats_count: 0, entities_count: 1 },
]

describe('SceneEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path.includes('/api/admin/content/scenes')) return Promise.resolve(mockResponse(SCENES) as Response)
      if (path.includes('/api/admin/content/books')) return Promise.resolve(mockResponse([]) as Response)
      if (path.includes('/api/admin/content/chapters')) return Promise.resolve(mockResponse([]) as Response)
      return Promise.resolve(mockResponse([]) as Response)
    })
    vi.mocked(api.post).mockResolvedValue(mockResponse({ id: 102 }) as Response)
    vi.mocked(api.patch).mockResolvedValue(mockResponse({ ok: true }) as Response)
    vi.mocked(api.delete).mockResolvedValue(mockResponse({ ok: true }) as Response)
  })

  it('renders and loads scenes from API', async () => {
    render(<SceneEditor />)

    await waitFor(() => {
      expect(screen.getByText('Intro')).toBeInTheDocument()
      expect(screen.getByText('Boss Fight')).toBeInTheDocument()
    })

    expect(screen.getByText('2 scenes')).toBeInTheDocument()
  })

  it('filters by chapter and scene_type', async () => {
    render(<SceneEditor />)

    await waitFor(() => screen.getByText('Intro'))

    // Change scene type filter
    const typeSelect = screen.getByDisplayValue('All Types')
    fireEvent.change(typeSelect, { target: { value: 'combat' } })

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('scene_type=combat'))
    })
  })

  it('creates scene with gameplay data', async () => {
    render(<SceneEditor />)

    await waitFor(() => screen.getByText('Intro'))

    fireEvent.click(screen.getByText('+ New Scene'))

    await waitFor(() => {
      expect(screen.getByText('Create Scene')).toBeInTheDocument()
    })

    // Should have the Gameplay section
    expect(screen.getByText('Gameplay')).toBeInTheDocument()

    // Background picker should be present
    expect(screen.getByTestId('asset-picker-background')).toBeInTheDocument()

    // Atmosphere picker should be present
    expect(screen.getByTestId('atmosphere-picker')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/admin/content/scenes',
        expect.objectContaining({ scene_type: 'narrative' })
      )
    })
  })

  it('updates scene core fields', async () => {
    render(<SceneEditor />)

    await waitFor(() => screen.getByText('Intro'))

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Edit Scene #100')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/api/admin/content/scenes/100',
        expect.objectContaining({ title: 'Intro', scene_type: 'narrative' })
      )
    })
  })

  it('boss config section appears for boss scenes', async () => {
    render(<SceneEditor />)

    await waitFor(() => screen.getByText('Boss Fight'))

    // Edit the boss scene
    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[1])

    await waitFor(() => {
      expect(screen.getByText('Edit Scene #101')).toBeInTheDocument()
    })

    // Boss Config section should be visible for boss scenes
    expect(screen.getByText(/Boss Config/)).toBeInTheDocument()
  })

  it('gameplay panel shows background and atmosphere pickers', async () => {
    render(<SceneEditor />)

    await waitFor(() => screen.getByText('Intro'))

    const editButtons = screen.getAllByText('Edit')
    fireEvent.click(editButtons[0])

    await waitFor(() => screen.getByText('Edit Scene #100'))

    // Gameplay section should have background and atmosphere pickers
    expect(screen.getByText('Gameplay')).toBeInTheDocument()
    expect(screen.getByText('Background')).toBeInTheDocument()
    expect(screen.getByText('Atmosphere')).toBeInTheDocument()
    expect(screen.getByTestId('asset-picker-background')).toBeInTheDocument()
    expect(screen.getByTestId('atmosphere-picker')).toBeInTheDocument()
  })

  it('delete blocked when beats exist', async () => {
    render(<SceneEditor />)

    await waitFor(() => screen.getByText('Intro'))

    // Delete the first scene (beats_count: 3)
    const deleteButtons = screen.getAllByText('Delete')
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.getByTestId('delete-dialog')).toBeInTheDocument()
    })

    expect(screen.getByText('Blocked')).toBeInTheDocument()
    expect(screen.getByText('3 beats')).toBeInTheDocument()
  })
})
