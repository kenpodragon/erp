import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import AuditSummaryCards from './AuditSummaryCards'

const mockSummary = {
  by_status: { open: 5, acknowledged: 2, in_progress: 1, resolved: 3, wont_fix: 0 },
  by_type: { missing_stat: 4, missing_entity: 1 },
  total: 11,
}

describe('AuditSummaryCards', () => {
  it('renders all 5 status cards with correct counts', () => {
    const onStatusFilter = vi.fn()
    render(<AuditSummaryCards summary={mockSummary} onStatusFilter={onStatusFilter} activeStatus={null} />)

    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Acknowledged')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Resolved')).toBeInTheDocument()
    expect(screen.getByText("Won't Fix")).toBeInTheDocument()

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('shows per-type breakdown in Open card', () => {
    const onStatusFilter = vi.fn()
    render(<AuditSummaryCards summary={mockSummary} onStatusFilter={onStatusFilter} activeStatus={null} />)

    expect(screen.getByText('missing stat: 4')).toBeInTheDocument()
    expect(screen.getByText('missing entity: 1')).toBeInTheDocument()
  })

  it('renders nothing when summary is null', () => {
    const onStatusFilter = vi.fn()
    const { container } = render(
      <AuditSummaryCards summary={null} onStatusFilter={onStatusFilter} activeStatus={null} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('clicking a card calls onStatusFilter with correct status', () => {
    const onStatusFilter = vi.fn()
    render(<AuditSummaryCards summary={mockSummary} onStatusFilter={onStatusFilter} activeStatus={null} />)

    fireEvent.click(screen.getByText('Open').closest('.audit-summary-card')!)
    expect(onStatusFilter).toHaveBeenCalledWith('open')

    fireEvent.click(screen.getByText('Resolved').closest('.audit-summary-card')!)
    expect(onStatusFilter).toHaveBeenCalledWith('resolved')
  })

  it('clicking an already-active card calls onStatusFilter(null) to clear', () => {
    const onStatusFilter = vi.fn()
    render(<AuditSummaryCards summary={mockSummary} onStatusFilter={onStatusFilter} activeStatus="open" />)

    fireEvent.click(screen.getByText('Open').closest('.audit-summary-card')!)
    expect(onStatusFilter).toHaveBeenCalledWith(null)
  })

  it('active card has active class', () => {
    const onStatusFilter = vi.fn()
    render(<AuditSummaryCards summary={mockSummary} onStatusFilter={onStatusFilter} activeStatus="open" />)

    const openCard = screen.getByText('Open').closest('.audit-summary-card')!
    expect(openCard.className).toContain('active')
  })
})
