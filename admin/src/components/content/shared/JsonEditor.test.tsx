import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import JsonEditor from './JsonEditor'

describe('JsonEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('structured mode shows key-value rows, can add/remove entries', async () => {
    const onChange = vi.fn()
    const value = { strength: 10, agility: 5 }

    render(<JsonEditor value={value} onChange={onChange} mode="structured" />)

    // Should show Structured button as active
    expect(screen.getByText('Structured')).toBeInTheDocument()
    expect(screen.getByText('Raw JSON')).toBeInTheDocument()

    // Should show key-value rows - keys are in disabled inputs
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[]
    const keyInputs = inputs.filter(i => i.disabled)
    expect(keyInputs.length).toBe(2) // strength and agility keys
    expect(keyInputs[0].value).toBe('strength')
    expect(keyInputs[1].value).toBe('agility')

    // Should show values
    const valueInputs = inputs.filter(i => !i.disabled && i.value !== '')
    expect(valueInputs.some(i => i.value === '10')).toBe(true)
    expect(valueInputs.some(i => i.value === '5')).toBe(true)

    // Should show add button
    expect(screen.getByText('+ Add')).toBeInTheDocument()

    // Add a new key
    const newKeyInput = screen.getByPlaceholderText('New key...')
    await userEvent.type(newKeyInput, 'intelligence')
    fireEvent.click(screen.getByText('+ Add'))

    // onChange should have been called with the new key
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ strength: 10, agility: 5, intelligence: '' })
    )

    // Remove a key - click the x button
    const removeButtons = screen.getAllByTitle('Remove')
    fireEvent.click(removeButtons[0])

    // onChange should have been called without the removed key
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ agility: 5 })
    )
  })
})
