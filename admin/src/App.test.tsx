import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('Admin App Smoke Test', () => {
  it('renders the application title', () => {
    render(<App />)
    expect(screen.getByText(/ERP Admin/i)).toBeDefined()
  })
})
