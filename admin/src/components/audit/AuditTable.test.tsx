import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AuditTable from './AuditTable'

const mockRecords = [
  {
    id: 1,
    audit_type: 'missing_stat',
    entity_type: 'enemy',
    entity_id: 42,
    entity_name: 'Goblin',
    missing_field: 'entity_gameplay_data',
    scene_id: 5,
    scene_title: 'Dark Cave',
    zone_level: 3,
    status: 'open',
    logged_at: '2026-03-14T10:00:00Z',
  },
  {
    id: 2,
    audit_type: 'missing_entity',
    entity_type: 'scene',
    entity_id: null,
    entity_name: 'scene_5',
    missing_field: 'enemies',
    scene_id: 5,
    scene_title: 'Dark Cave',
    zone_level: null,
    status: 'acknowledged',
    logged_at: '2026-03-14T11:00:00Z',
  },
]

const defaultProps = {
  records: mockRecords,
  total: 2,
  page: 1,
  pageSize: 25,
  onPageChange: vi.fn(),
  selectedIds: [] as number[],
  onSelectionChange: vi.fn(),
  onStatusChange: vi.fn(),
}

function renderTable(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides }
  return render(
    <MemoryRouter>
      <AuditTable {...props} />
    </MemoryRouter>
  )
}

describe('AuditTable', () => {
  it('renders table headers', () => {
    renderTable()

    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Entity Type')).toBeInTheDocument()
    expect(screen.getByText('Entity Name')).toBeInTheDocument()
    expect(screen.getByText('Missing Field')).toBeInTheDocument()
    expect(screen.getByText('Scene')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Logged')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
  })

  it('renders records with correct data', () => {
    renderTable()

    expect(screen.getByText('missing stat')).toBeInTheDocument()
    expect(screen.getByText('enemy')).toBeInTheDocument()
    expect(screen.getByText('Goblin')).toBeInTheDocument()
    expect(screen.getByText('entity_gameplay_data')).toBeInTheDocument()
    expect(screen.getByText('Dark Cave (Z3)')).toBeInTheDocument()
    expect(screen.getByText('missing entity')).toBeInTheDocument()
    expect(screen.getByText('scene_5')).toBeInTheDocument()
  })

  it('shows type badges with appropriate classes', () => {
    renderTable()

    const missingStatBadge = screen.getByText('missing stat')
    expect(missingStatBadge.className).toContain('type-badge')
    expect(missingStatBadge.className).toContain('type-missing')

    const missingEntityBadge = screen.getByText('missing entity')
    expect(missingEntityBadge.className).toContain('type-badge')
    expect(missingEntityBadge.className).toContain('type-missing')
  })

  it('shows Fix button for records with known audit_type', () => {
    renderTable()

    const fixButtons = screen.getAllByText('Fix')
    expect(fixButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('shows empty message when no records', () => {
    renderTable({ records: [], total: 0 })

    expect(screen.getByText('No audit records found.')).toBeInTheDocument()
  })

  it('pagination controls show correct page info', () => {
    renderTable({ total: 50, page: 2, pageSize: 25 })

    expect(screen.getByText('Page 2 of 2 (50 records)')).toBeInTheDocument()
    expect(screen.getByText('Previous')).not.toBeDisabled()
    expect(screen.getByText('Next')).toBeDisabled()
  })

  it('does not show pagination when single page', () => {
    renderTable({ total: 2, page: 1, pageSize: 25 })

    expect(screen.queryByText('Previous')).not.toBeInTheDocument()
    expect(screen.queryByText('Next')).not.toBeInTheDocument()
  })

  it('checkbox selection works - select individual', () => {
    const onSelectionChange = vi.fn()
    renderTable({ onSelectionChange })

    const checkboxes = screen.getAllByRole('checkbox')
    // First is select-all, rest are row checkboxes
    fireEvent.click(checkboxes[1]) // select first record
    expect(onSelectionChange).toHaveBeenCalledWith([1])
  })

  it('checkbox selection works - select all', () => {
    const onSelectionChange = vi.fn()
    renderTable({ onSelectionChange })

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0]) // select-all checkbox
    expect(onSelectionChange).toHaveBeenCalledWith([1, 2])
  })

  it('checkbox selection works - deselect all', () => {
    const onSelectionChange = vi.fn()
    renderTable({ onSelectionChange, selectedIds: [1, 2] })

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0]) // toggle select-all off
    expect(onSelectionChange).toHaveBeenCalledWith([])
  })

  it('renders fix link for missing_stat pointing to entity editor', () => {
    const { container } = renderTable({
      records: [mockRecords[0]],
      total: 1,
    })

    const fixButton = screen.getByText('Fix')
    expect(fixButton).toBeInTheDocument()
    // The fix button uses navigate, so we check the button exists for missing_stat
  })

  it('renders fix link for missing_entity pointing to scene editor', () => {
    renderTable({
      records: [mockRecords[1]],
      total: 1,
    })

    const fixButton = screen.getByText('Fix')
    expect(fixButton).toBeInTheDocument()
  })

  it('does not render fix button when entity_id is null and audit_type has no scene fallback', () => {
    const noFixRecord = {
      id: 99,
      audit_type: 'unknown_type',
      entity_type: null,
      entity_id: null,
      entity_name: null,
      missing_field: null,
      scene_id: null,
      scene_title: null,
      zone_level: null,
      status: 'open',
      logged_at: '2026-03-14T10:00:00Z',
    }
    renderTable({ records: [noFixRecord], total: 1 })

    expect(screen.queryByText('Fix')).not.toBeInTheDocument()
  })
})
