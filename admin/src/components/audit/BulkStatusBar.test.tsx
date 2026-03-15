import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import BulkStatusBar from './BulkStatusBar'

describe('BulkStatusBar', () => {
  it('is not visible when selectedIds is empty', () => {
    const { container } = render(
      <BulkStatusBar selectedIds={[]} onBulkUpdate={vi.fn()} onClearSelection={vi.fn()} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('shows selected count when items are selected', () => {
    render(
      <BulkStatusBar selectedIds={[1, 2, 3]} onBulkUpdate={vi.fn()} onClearSelection={vi.fn()} />
    )
    expect(screen.getByText('3 selected')).toBeInTheDocument()
  })

  it('shows confirmation dialog when Apply clicked and calls onBulkUpdate on confirm', () => {
    const onBulkUpdate = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(
      <BulkStatusBar selectedIds={[1, 2]} onBulkUpdate={onBulkUpdate} onClearSelection={vi.fn()} />
    )

    fireEvent.click(screen.getByText('Apply'))

    expect(window.confirm).toHaveBeenCalledWith(
      'Update 2 records to "Acknowledged"?'
    )
    expect(onBulkUpdate).toHaveBeenCalledWith('acknowledged')

    vi.restoreAllMocks()
  })

  it('does not call onBulkUpdate when confirmation is cancelled', () => {
    const onBulkUpdate = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(
      <BulkStatusBar selectedIds={[1]} onBulkUpdate={onBulkUpdate} onClearSelection={vi.fn()} />
    )

    fireEvent.click(screen.getByText('Apply'))

    expect(window.confirm).toHaveBeenCalled()
    expect(onBulkUpdate).not.toHaveBeenCalled()

    vi.restoreAllMocks()
  })

  it('calls onBulkUpdate with selected status after confirmation', () => {
    const onBulkUpdate = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(
      <BulkStatusBar selectedIds={[1, 2]} onBulkUpdate={onBulkUpdate} onClearSelection={vi.fn()} />
    )

    // Change the dropdown to resolved
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'resolved' } })

    fireEvent.click(screen.getByText('Apply'))

    expect(onBulkUpdate).toHaveBeenCalledWith('resolved')

    vi.restoreAllMocks()
  })

  it('Clear Selection button calls onClearSelection', () => {
    const onClearSelection = vi.fn()

    render(
      <BulkStatusBar selectedIds={[1, 2]} onBulkUpdate={vi.fn()} onClearSelection={onClearSelection} />
    )

    fireEvent.click(screen.getByText('Clear Selection'))

    expect(onClearSelection).toHaveBeenCalled()
  })
})
