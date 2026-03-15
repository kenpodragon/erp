import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import StatusDropdown from './StatusDropdown'

describe('StatusDropdown', () => {
  it('renders select with current status selected', () => {
    const onChange = vi.fn()
    render(<StatusDropdown currentStatus="open" recordId={1} onChange={onChange} />)

    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('open')
  })

  it('shows all 5 status options', () => {
    const onChange = vi.fn()
    render(<StatusDropdown currentStatus="open" recordId={1} onChange={onChange} />)

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(5)
    expect(options.map((o) => (o as HTMLOptionElement).value)).toEqual([
      'open',
      'acknowledged',
      'in_progress',
      'resolved',
      'wont_fix',
    ])
  })

  it('displays formatted labels', () => {
    const onChange = vi.fn()
    render(<StatusDropdown currentStatus="open" recordId={1} onChange={onChange} />)

    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Acknowledged')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Resolved')).toBeInTheDocument()
    expect(screen.getByText('Wont Fix')).toBeInTheDocument()
  })

  it('calling onChange fires the parent callback with recordId and new status', () => {
    const onChange = vi.fn()
    render(<StatusDropdown currentStatus="open" recordId={7} onChange={onChange} />)

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'resolved' } })

    expect(onChange).toHaveBeenCalledWith(7, 'resolved')
  })

  it('has appropriate class for current status', () => {
    const onChange = vi.fn()
    render(<StatusDropdown currentStatus="in_progress" recordId={1} onChange={onChange} />)

    const select = screen.getByRole('combobox')
    expect(select.className).toContain('status-dropdown')
    expect(select.className).toContain('bg-in_progress')
  })
})
