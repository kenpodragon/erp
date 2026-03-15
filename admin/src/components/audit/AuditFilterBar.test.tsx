import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import AuditFilterBar from './AuditFilterBar'

const mockFilterOptions = {
  audit_types: [
    { value: 'missing_stat', count: 5 },
    { value: 'missing_entity', count: 2 },
  ],
  entity_types: [
    { value: 'enemy', count: 5 },
    { value: 'scene', count: 2 },
  ],
  statuses: ['open', 'acknowledged', 'in_progress', 'resolved', 'wont_fix'],
}

const emptyFilters = {
  audit_type: null,
  status: null,
  entity_type: null,
  search: '',
  date_from: null,
  date_to: null,
}

describe('AuditFilterBar', () => {
  it('renders type, status, and entity type dropdowns', () => {
    const onChange = vi.fn()
    render(<AuditFilterBar filters={emptyFilters} filterOptions={mockFilterOptions} onChange={onChange} />)

    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Entity Type')).toBeInTheDocument()
  })

  it('renders search input', () => {
    const onChange = vi.fn()
    render(<AuditFilterBar filters={emptyFilters} filterOptions={mockFilterOptions} onChange={onChange} />)

    expect(screen.getByPlaceholderText('Entity name, field...')).toBeInTheDocument()
  })

  it('renders date pickers', () => {
    const onChange = vi.fn()
    render(<AuditFilterBar filters={emptyFilters} filterOptions={mockFilterOptions} onChange={onChange} />)

    expect(screen.getByText('From')).toBeInTheDocument()
    expect(screen.getByText('To')).toBeInTheDocument()
  })

  it('changing type dropdown calls onChange with updated filters', () => {
    const onChange = vi.fn()
    render(<AuditFilterBar filters={emptyFilters} filterOptions={mockFilterOptions} onChange={onChange} />)

    const typeSelect = screen.getByText('Type').closest('label')!.querySelector('select')!
    fireEvent.change(typeSelect, { target: { value: 'missing_stat' } })

    expect(onChange).toHaveBeenCalledWith({ ...emptyFilters, audit_type: 'missing_stat' })
  })

  it('search input is debounced', () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    render(<AuditFilterBar filters={emptyFilters} filterOptions={mockFilterOptions} onChange={onChange} />)

    const searchInput = screen.getByPlaceholderText('Entity name, field...')
    fireEvent.change(searchInput, { target: { value: 'goblin' } })

    // Not called immediately
    expect(onChange).not.toHaveBeenCalled()

    // Called after debounce
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(onChange).toHaveBeenCalledWith({ ...emptyFilters, search: 'goblin' })

    vi.useRealTimers()
  })

  it('clear button resets all filters', () => {
    const onChange = vi.fn()
    const activeFilters = {
      audit_type: 'missing_stat',
      status: 'open',
      entity_type: 'enemy',
      search: 'goblin',
      date_from: '2026-01-01',
      date_to: '2026-03-15',
    }
    render(<AuditFilterBar filters={activeFilters} filterOptions={mockFilterOptions} onChange={onChange} />)

    const clearButton = screen.getByText('Clear Filters')
    fireEvent.click(clearButton)

    expect(onChange).toHaveBeenCalledWith(emptyFilters)
  })

  it('does not show clear button when no filters are active', () => {
    const onChange = vi.fn()
    render(<AuditFilterBar filters={emptyFilters} filterOptions={mockFilterOptions} onChange={onChange} />)

    expect(screen.queryByText('Clear Filters')).not.toBeInTheDocument()
  })
})
