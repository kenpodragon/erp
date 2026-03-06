import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import WelcomeModal from './WelcomeModal';

const CHANGELOG_DATA = [
  {
    version: '2.6.0',
    date: '2026-03-06',
    title: 'Version 2.6 — Social & Discovery',
    entries: [
      { type: 'feature', text: 'Global Chat system' },
      { type: 'improvement', text: 'Etheric Registry bestiary' },
      { type: 'fix', text: 'Gold display rounding' },
    ],
  },
];

const LS_KEY = 'last_seen_changelog_version';

describe('WelcomeModal', () => {
  let onClose: ReturnType<typeof vi.fn>;
  let onStartTutorial: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onClose = vi.fn();
    onStartTutorial = vi.fn();
    localStorage.clear();

    // Default: fetch returns changelog data
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(CHANGELOG_DATA),
    });
  });

  it('renders with changelog entries when version is unseen', async () => {
    render(<WelcomeModal onClose={onClose} onStartTutorial={onStartTutorial} />);

    await waitFor(() => {
      expect(screen.getByText('Version 2.6 — Social & Discovery')).toBeDefined();
    });

    expect(screen.getByText('Global Chat system')).toBeDefined();
    expect(screen.getByText('Etheric Registry bestiary')).toBeDefined();
    expect(screen.getByText('Gold display rounding')).toBeDefined();
  });

  it('does not render when version was already seen', async () => {
    localStorage.setItem(LS_KEY, '2.6.0');

    const { container } = render(
      <WelcomeModal onClose={onClose} onStartTutorial={onStartTutorial} />
    );

    // Wait for the fetch to complete and effect to run
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Modal should not be visible
    expect(container.querySelector('.welcome-modal-overlay')).toBeNull();
  });

  it('calls onClose when close button is clicked', async () => {
    render(<WelcomeModal onClose={onClose} onStartTutorial={onStartTutorial} />);

    await waitFor(() => {
      expect(screen.getByText('Version 2.6 — Social & Discovery')).toBeDefined();
    });

    fireEvent.click(screen.getByLabelText('Close'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(LS_KEY)).toBe('2.6.0');
  });

  it('calls onClose when "Got it" dismiss button is clicked', async () => {
    render(<WelcomeModal onClose={onClose} onStartTutorial={onStartTutorial} />);

    await waitFor(() => {
      expect(screen.getByText('Got it')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Got it'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(LS_KEY)).toBe('2.6.0');
  });

  it('calls onStartTutorial when "Start Tutorial" is clicked', async () => {
    render(<WelcomeModal onClose={onClose} onStartTutorial={onStartTutorial} />);

    await waitFor(() => {
      expect(screen.getByText('Start Tutorial')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Start Tutorial'));

    expect(onStartTutorial).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(localStorage.getItem(LS_KEY)).toBe('2.6.0');
  });

  it('does not render when fetch fails', async () => {
    (global.fetch as any).mockResolvedValue({ ok: false });

    const { container } = render(
      <WelcomeModal onClose={onClose} onStartTutorial={onStartTutorial} />
    );

    // Give effect time to settle
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(container.querySelector('.welcome-modal-overlay')).toBeNull();
  });
});
