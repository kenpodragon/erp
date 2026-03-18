import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PlayerGuide from './PlayerGuide';

function renderGuide(hash = '') {
  return render(
    <MemoryRouter initialEntries={[`/guide${hash}`]}>
      <PlayerGuide />
    </MemoryRouter>
  );
}

describe('PlayerGuide', () => {
  it('renders the page header', () => {
    renderGuide();
    expect(screen.getByText('Player Guide')).toBeTruthy();
    expect(screen.getByText(/without the hand-holding/)).toBeTruthy();
  });

  it('renders all 10 sidebar sections', () => {
    renderGuide();
    const sections = [
      'Getting Started', 'Game Hub', 'Story Mode', 'Boss Fights',
      'Farm Mode', 'Idle Training', 'Home Base', 'Economy', 'Social', 'Settings & Tips',
    ];
    for (const name of sections) {
      expect(screen.getByRole('button', { name: new RegExp(name) })).toBeTruthy();
    }
  });

  it('shows Getting Started section by default', () => {
    renderGuide();
    expect(screen.getByText('What is Elysium Rising?')).toBeTruthy();
  });

  it('switches sections on sidebar click', async () => {
    renderGuide();
    fireEvent.click(screen.getByRole('button', { name: /Boss Fights/ }));
    await waitFor(() => {
      expect(screen.getByText(/Where do bosses appear/)).toBeTruthy();
    });
  });

  it('renders search input', () => {
    renderGuide();
    expect(screen.getByPlaceholderText('Search the guide...')).toBeTruthy();
  });

  it('filters entries on search', async () => {
    renderGuide();
    const input = screen.getByPlaceholderText('Search the guide...');
    fireEvent.change(input, { target: { value: 'marketplace' } });
    await waitFor(() => {
      expect(screen.getByText(/Search results for/)).toBeTruthy();
    }, { timeout: 1000 });
  });

  it('clears search and returns to section view', async () => {
    renderGuide();
    const input = screen.getByPlaceholderText('Search the guide...');
    fireEvent.change(input, { target: { value: 'boss' } });
    await waitFor(() => {
      expect(screen.getByText(/Search results for/)).toBeTruthy();
    }, { timeout: 1000 });

    // Clear via the × button
    const clearBtn = screen.getByText('×');
    fireEvent.click(clearBtn);
    await waitFor(() => {
      expect(screen.queryByText(/Search results for/)).toBeNull();
    });
  });

  it('renders screenshots with click-to-enlarge hint', () => {
    renderGuide();
    fireEvent.click(screen.getByRole('button', { name: /Boss Fights/ }));
    const hints = screen.getAllByText('Click to enlarge');
    expect(hints.length).toBeGreaterThan(0);
  });

  it('navigates to section via URL hash', () => {
    renderGuide('#economy');
    expect(screen.getByText(/What are Shards/)).toBeTruthy();
  });
});
