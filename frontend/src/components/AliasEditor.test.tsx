import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AliasEditor } from './AliasEditor';
import { api } from '../api';

// Already mocked in setupTests.ts but we need to control return values
vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
  }
}));

describe('AliasEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with current alias', () => {
    render(<AliasEditor currentAlias="HeroOne" onSave={() => {}} />);
    expect(screen.getByPlaceholderText(/Enter your hero name/i)).toHaveValue('HeroOne');
  });

  it('validates alias length and characters', async () => {
    render(<AliasEditor currentAlias="HeroOne" onSave={() => {}} />);
    const input = screen.getByPlaceholderText(/Enter your hero name/i);

    // Too short
    fireEvent.change(input, { target: { value: 'Hi' } });
    await waitFor(() => {
      expect(screen.getByText(/Too short/i)).toBeTruthy();
    });

    // Valid format but needs server check
    (api.get as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ available: true })
    });

    fireEvent.change(input, { target: { value: 'NewHero' } });
    await waitFor(() => {
      expect(screen.getByText(/Alias available/i)).toBeTruthy();
    });
  });

  it('calls onSave after successful update', async () => {
    const onSaveSpy = vi.fn();
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ available: true })
    });
    (api.patch as any).mockResolvedValue({ ok: true });

    render(<AliasEditor currentAlias="HeroOne" onSave={onSaveSpy} />);
    const input = screen.getByPlaceholderText(/Enter your hero name/i);
    
    fireEvent.change(input, { target: { value: 'NewHero' } });
    
    await waitFor(() => {
      expect(screen.getByText(/Alias available/i)).toBeTruthy();
    });

    const button = screen.getByRole('button', { name: /Update Alias/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/api/players/me', { alias: 'NewHero' });
      expect(onSaveSpy).toHaveBeenCalledWith('NewHero');
    });
  });

  it('displays error if alias is taken', async () => {
    (api.get as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ available: false, reason: 'Already taken' })
    });

    render(<AliasEditor currentAlias="HeroOne" onSave={() => {}} />);
    const input = screen.getByPlaceholderText(/Enter your hero name/i);
    
    fireEvent.change(input, { target: { value: 'TakenName' } });
    
    await waitFor(() => {
      expect(screen.getByText(/Already taken/i)).toBeTruthy();
    });

    const button = screen.getByRole('button', { name: /Update Alias/i });
    expect(button).toBeDisabled();
  });
});
