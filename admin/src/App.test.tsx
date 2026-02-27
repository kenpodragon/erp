import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'
import { signInWithPopup } from 'firebase/auth'

describe('Admin App', () => {
  it('renders the application title', () => {
    render(<App />)
    expect(screen.getByText(/ERP Admin/i)).toBeDefined()
  })

  it('shows login button when not authenticated', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /Login with Google \(Admin\)/i })).toBeDefined()
  })

  it('calls handleLogin when admin login button is clicked', async () => {
    render(<App />)
    const loginButton = screen.getByRole('button', { name: /Login with Google \(Admin\)/i })
    fireEvent.click(loginButton)
    
    expect(signInWithPopup).toHaveBeenCalled()
  })
})
