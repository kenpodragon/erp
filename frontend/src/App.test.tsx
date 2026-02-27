import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'
import { signInWithPopup } from 'firebase/auth'

describe('Frontend App', () => {
  it('renders the application title', () => {
    render(<App />)
    expect(screen.getByText(/ERP Frontend/i)).toBeDefined()
  })

  it('shows login button when not authenticated', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /Login with Google/i })).toBeDefined()
  })

  it('calls handleLogin when button is clicked', async () => {
    render(<App />)
    const loginButton = screen.getByRole('button', { name: /Login with Google/i })
    fireEvent.click(loginButton)
    
    // signInWithPopup should have been called
    expect(signInWithPopup).toHaveBeenCalled()
  })
})
