import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminHelp from './AdminHelp';

function renderHelp(hash = '') {
  return render(
    <MemoryRouter initialEntries={[`/help${hash}`]}>
      <AdminHelp />
    </MemoryRouter>
  );
}

describe('AdminHelp', () => {
  it('renders the page header', () => {
    renderHelp();
    expect(screen.getByText('Admin Help')).toBeTruthy();
    expect(screen.getByText(/Quick reference/)).toBeTruthy();
  });

  it('renders all 8 sidebar sections', () => {
    renderHelp();
    const sections = [
      'Dashboard', 'Player Management', 'Support Tickets', 'World Builder',
      'Game Tuning', 'Audio & Music', 'Finance & Economy', 'System & Admin',
    ];
    for (const name of sections) {
      expect(screen.getByRole('button', { name: new RegExp(name) })).toBeTruthy();
    }
  });

  it('shows Dashboard section by default', () => {
    renderHelp();
    expect(screen.getByText(/What do the dashboard stats show/)).toBeTruthy();
  });

  it('switches sections on sidebar click', async () => {
    renderHelp();
    fireEvent.click(screen.getByRole('button', { name: /World Builder/ }));
    await waitFor(() => {
      expect(screen.getByText(/What are the four main tabs/)).toBeTruthy();
    });
  });

  it('filters entries on search', async () => {
    renderHelp();
    const input = screen.getByPlaceholderText('Search help...');
    fireEvent.change(input, { target: { value: 'player' } });
    await waitFor(() => {
      expect(screen.getByText(/Search results for/)).toBeTruthy();
    }, { timeout: 1000 });
  });

  it('navigates to section via URL hash', () => {
    renderHelp('#system');
    expect(screen.getByText(/What can I change in Server Config/)).toBeTruthy();
  });

  it('renders screenshots with click-to-enlarge hint', () => {
    renderHelp();
    const hints = screen.getAllByText('Click to enlarge');
    expect(hints.length).toBeGreaterThan(0);
  });
});
