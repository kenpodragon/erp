import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AliasEditor } from './AliasEditor';
import { api } from '../api';

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

  it('renders the current alias with a pencil button in idle state', () => {
    render(<AliasEditor currentAlias="HeroOne" displayName="Google Name" onSave={() => {}} />);
    expect(screen.getByText('HeroOne')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Edit alias/i })).toBeTruthy();
  });

  it('falls back to displayName when alias is null', () => {
    render(<AliasEditor currentAlias={null} displayName="Google Name" onSave={() => {}} />);
    expect(screen.getByText('Google Name')).toBeTruthy();
  });

  it('entering edit mode shows the input', async () => {
    render(<AliasEditor currentAlias="HeroOne" displayName="Google Name" onSave={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Edit alias/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Enter your hero name/i)).toBeTruthy();
    });
  });

  it('validates alias length in edit mode', async () => {
    render(<AliasEditor currentAlias="HeroOne" displayName="Google Name" onSave={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Edit alias/i }));

    const input = screen.getByPlaceholderText(/Enter your hero name/i);
    fireEvent.change(input, { target: { value: 'Hi' } });

    await waitFor(() => {
      expect(screen.getByText(/Too short/i)).toBeTruthy();
    });
  });

  it('shows availability after debounce', async () => {
    (api.get as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ available: true })
    });

    render(<AliasEditor currentAlias="HeroOne" displayName="Google Name" onSave={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Edit alias/i }));

    const input = screen.getByPlaceholderText(/Enter your hero name/i);
    fireEvent.change(input, { target: { value: 'NewHero' } });

    await waitFor(() => {
      expect(screen.getByText(/Alias available/i)).toBeTruthy();
    });
  });

  it('calls onSave and returns to idle on successful save', async () => {
    const onSaveSpy = vi.fn();
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ available: true })
    });
    (api.patch as any).mockResolvedValue({ ok: true });

    render(<AliasEditor currentAlias="HeroOne" displayName="Google Name" onSave={onSaveSpy} />);
    fireEvent.click(screen.getByRole('button', { name: /Edit alias/i }));

    const input = screen.getByPlaceholderText(/Enter your hero name/i);
    fireEvent.change(input, { target: { value: 'NewHero' } });

    await waitFor(() => screen.getByText(/Alias available/i));

    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/api/players/me', { alias: 'NewHero' });
      expect(onSaveSpy).toHaveBeenCalledWith('NewHero');
    });
    // Should return to idle (pencil button visible)
    expect(screen.getByRole('button', { name: /Edit alias/i })).toBeTruthy();
  });

  it('disables Save when alias is taken', async () => {
    (api.get as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ available: false, reason: 'Already taken' })
    });

    render(<AliasEditor currentAlias="HeroOne" displayName="Google Name" onSave={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Edit alias/i }));

    const input = screen.getByPlaceholderText(/Enter your hero name/i);
    fireEvent.change(input, { target: { value: 'TakenName' } });

    await waitFor(() => {
      expect(screen.getByText(/Already taken/i)).toBeTruthy();
    });

    expect(screen.getByRole('button', { name: /^Save$/i })).toBeDisabled();
  });

  it('cancel returns to idle without saving', async () => {
    render(<AliasEditor currentAlias="HeroOne" displayName="Google Name" onSave={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Edit alias/i }));

    expect(screen.getByPlaceholderText(/Enter your hero name/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Edit alias/i })).toBeTruthy();
    });
    expect(api.patch).not.toHaveBeenCalled();
  });
});
