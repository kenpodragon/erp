import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { NavBar } from './NavBar';

const renderWithRouter = (ui: React.ReactElement, initialEntries = ['/']) =>
  render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);

describe('NavBar', () => {
  it('renders brand name', () => {
    renderWithRouter(<NavBar isLoggedIn={false} onLogin={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.getByText('Elysium')).toBeTruthy();
    expect(screen.getByText('Rising')).toBeTruthy();
  });

  it('shows Login button when logged out', () => {
    renderWithRouter(<NavBar isLoggedIn={false} onLogin={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.getByText('Login')).toBeTruthy();
    expect(screen.queryByText('Logout')).toBeNull();
    expect(screen.queryByText('Profile')).toBeNull();
  });

  it('shows Logout button and Profile link when logged in', () => {
    renderWithRouter(<NavBar isLoggedIn={true} onLogin={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.getByText('Logout')).toBeTruthy();
    expect(screen.getByText('Profile')).toBeTruthy();
    expect(screen.queryByText('Login')).toBeNull();
  });

  it('calls onLogin when Login clicked', () => {
    const onLogin = vi.fn();
    renderWithRouter(<NavBar isLoggedIn={false} onLogin={onLogin} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText('Login'));
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it('calls onLogout when Logout clicked', () => {
    const onLogout = vi.fn();
    renderWithRouter(<NavBar isLoggedIn={true} onLogin={vi.fn()} onLogout={onLogout} />);
    fireEvent.click(screen.getByText('Logout'));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('shows Tower and About links for all users', () => {
    renderWithRouter(<NavBar isLoggedIn={false} onLogin={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.getByText('Tower')).toBeTruthy();
    expect(screen.getByText('About')).toBeTruthy();
  });
});
