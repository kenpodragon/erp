import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DeleteConfirmDialog from './DeleteConfirmDialog'

describe('DeleteConfirmDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows blocked state when childCounts > 0 and isBlocked, confirm button disabled', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
      <DeleteConfirmDialog
        resourceType="Book"
        resourceName="First Tower"
        childCounts={{ chapters: 5, scenes: 20 }}
        isBlocked={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )

    // Should show the resource type and name
    expect(screen.getByText('Delete Book')).toBeInTheDocument()
    expect(screen.getByText('First Tower')).toBeInTheDocument()

    // Should show blocked message
    expect(screen.getByText('Cannot delete: child records exist.')).toBeInTheDocument()

    // Should show child counts
    expect(screen.getByText('5 chapters')).toBeInTheDocument()
    expect(screen.getByText('20 scenes')).toBeInTheDocument()

    // Delete button should NOT be rendered when blocked
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()

    // Should NOT show the "type DELETE" input when blocked
    expect(screen.queryByPlaceholderText('DELETE')).not.toBeInTheDocument()

    // Cancel button should work
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('shows unblocked state, requires typing "DELETE" to enable confirm', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
      <DeleteConfirmDialog
        resourceType="Scene"
        resourceName="Intro Scene"
        childCounts={{}}
        isBlocked={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )

    // Should show the dialog
    expect(screen.getByText('Delete Scene')).toBeInTheDocument()
    expect(screen.getByText('Intro Scene')).toBeInTheDocument()

    // Should show the DELETE input
    const input = screen.getByPlaceholderText('DELETE')
    expect(input).toBeInTheDocument()

    // Delete button should exist but be disabled
    const deleteBtn = screen.getByRole('button', { name: 'Delete' })
    expect(deleteBtn).toBeDisabled()

    // Typing wrong text keeps it disabled
    fireEvent.change(input, { target: { value: 'DELET' } })
    expect(deleteBtn).toBeDisabled()

    // Typing DELETE enables it
    fireEvent.change(input, { target: { value: 'DELETE' } })
    expect(deleteBtn).not.toBeDisabled()

    // Clicking confirm calls onConfirm
    fireEvent.click(deleteBtn)
    expect(onConfirm).toHaveBeenCalled()
  })
})
