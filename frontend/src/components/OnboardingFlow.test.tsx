import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingFlow } from './OnboardingFlow';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockPlayer = {
  id: 1,
  firebase_uid: 'test_uid',
  email: 'test@example.com',
  google_display_name: 'Test User',
  google_avatar_url: 'http://example.com/avatar.jpg',
  alias: null,
  avatar_preset_key: null,
  terms_accepted_at: null,
};

describe('OnboardingFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts at Step 1: Terms of Service', () => {
    render(
      <MemoryRouter>
        <OnboardingFlow player={mockPlayer} onComplete={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Welcome to Elysium Rising/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /I Accept/i })).toBeTruthy();
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
  });

  it('enables checkbox and proceeds to Step 2 after accepting terms', async () => {
    render(
      <MemoryRouter>
        <OnboardingFlow player={mockPlayer} onComplete={() => {}} />
      </MemoryRouter>
    );
    
    const termsContainer = screen.getByText(/Welcome to Elysium Rising/i).parentElement?.querySelector('.terms-container');
    if (termsContainer) {
      Object.defineProperty(termsContainer, 'scrollHeight', { value: 1000, configurable: true });
      Object.defineProperty(termsContainer, 'clientHeight', { value: 500, configurable: true });
      Object.defineProperty(termsContainer, 'scrollTop', { value: 500, configurable: true });
      fireEvent.scroll(termsContainer);
    }

    await waitFor(() => {
      expect(screen.getByRole('checkbox')).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('checkbox'));
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });
    fireEvent.click(screen.getByRole('button', { name: /I Accept/i }));

    await waitFor(() => {
      expect(screen.getByText(/Set Up Your Profile/i)).toBeTruthy();
    });
  });

  it('Step 2: Profile Setup allows entering alias and proceeds to Step 3', async () => {
    render(
      <MemoryRouter>
        <OnboardingFlow player={mockPlayer} onComplete={() => {}} />
      </MemoryRouter>
    );

    // Skip Step 1
    const termsContainer = screen.getByText(/Welcome to Elysium Rising/i).parentElement?.querySelector('.terms-container');
    if (termsContainer) {
      Object.defineProperty(termsContainer, 'scrollHeight', { value: 1000, configurable: true });
      Object.defineProperty(termsContainer, 'clientHeight', { value: 500, configurable: true });
      Object.defineProperty(termsContainer, 'scrollTop', { value: 500, configurable: true });
      fireEvent.scroll(termsContainer);
    }
    await waitFor(() => expect(screen.getByRole('checkbox')).not.toBeDisabled());
    fireEvent.click(screen.getByRole('checkbox'));
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });
    fireEvent.click(screen.getByRole('button', { name: /I Accept/i }));

    await waitFor(() => screen.getByText(/Set Up Your Profile/i));

    // In Step 2: Alias check
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ 
      ok: true, 
      json: () => Promise.resolve({ available: true }) 
    });

    const aliasInput = screen.getByPlaceholderText(/Enter an alias.../i);
    fireEvent.change(aliasInput, { target: { value: 'NewHero' } });

    await waitFor(() => {
      expect(screen.getByText(/Alias available!/i)).toBeTruthy();
    });

    (api.patch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() => {
      // Use getAllByText and pick the H2 one, or just check that it's present
      const headings = screen.getAllByText(/Create Your Character/i);
      expect(headings.length).toBeGreaterThan(0);
      expect(headings[0].tagName).toBe('H2');
    });
  });
});
