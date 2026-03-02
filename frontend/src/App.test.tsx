import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { signInWithPopup } from 'firebase/auth'

// Mock game layout to avoid PixiJS resolution issues in tests
vi.mock('./game/MainGameLayout', () => ({
  default: () => <div data-testid="mock-game-layout">Game Layout Mock</div>
}));

// App uses useNavigate/useLocation so we render inside MemoryRouter
// (main.tsx wraps with BrowserRouter, but tests use MemoryRouter)
const renderApp = (initialEntries = ['/']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>
  )

describe('Frontend App', () => {
  const originalFetch = global.fetch;

  beforeAll(() => {
    global.fetch = vi.fn(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Mock API', database: 'connected' })
      }) as Promise<Response>
    );
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('renders the NavBar brand and splash hero', () => {
    renderApp()
    // "Elysium" and "Rising" appear in both NavBar and SplashPage hero
    expect(screen.getAllByText('Elysium').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Rising').length).toBeGreaterThanOrEqual(1)
  })


  it('shows splash page with CTA when not authenticated', () => {
    renderApp()
    expect(screen.getAllByText('Begin Your Ascent').length).toBeGreaterThanOrEqual(1)
  })

  it('shows Login button in NavBar when not authenticated', () => {
    renderApp()
    expect(screen.getByRole('button', { name: /Login/i })).toBeDefined()
  })

  it('calls signInWithPopup when CTA is clicked', async () => {
    renderApp()
    const ctaButtons = screen.getAllByText('Begin Your Ascent')
    fireEvent.click(ctaButtons[0])
    expect(signInWithPopup).toHaveBeenCalled()
  })
})
