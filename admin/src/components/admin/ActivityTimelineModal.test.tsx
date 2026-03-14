import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ActivityTimelineModal from './ActivityTimelineModal';
import { api } from '../../api';

vi.mock('../../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockTimelineResponse = {
  events: [
    {
      timestamp: '2026-03-14T10:30:00Z',
      category: 'gameplay',
      type: 'session_complete',
      summary: 'Completed Scene 3 in Chapter 1',
      detail: { waves: 5, gold: 1200, deaths: 0 },
    },
    {
      timestamp: '2026-03-14T09:15:00Z',
      category: 'economy',
      type: 'item_acquired',
      summary: 'Acquired rare item "Blade of Dusk"',
      detail: { item_id: 42, rarity: 'rare' },
    },
    {
      timestamp: '2026-03-13T22:00:00Z',
      category: 'admin',
      type: 'essence_adjustment',
      summary: 'Admin granted 500 essence',
      detail: { amount: 500, admin: 'admin@test.com' },
    },
  ],
  next_cursor: '2026-03-12T00:00:00Z',
  has_more: true,
};

const mockPage2Response = {
  events: [
    {
      timestamp: '2026-03-12T18:00:00Z',
      category: 'social',
      type: 'chat_message',
      summary: 'Sent message in global chat',
      detail: {},
    },
  ],
  next_cursor: null,
  has_more: false,
};

const defaultProps = {
  playerId: 10,
  playerAlias: 'Arion',
  onClose: vi.fn(),
};

describe('ActivityTimelineModal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('before=')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPage2Response) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTimelineResponse) });
    });
  });

  it('renders events grouped by date', async () => {
    render(<ActivityTimelineModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Completed Scene 3 in Chapter 1')).toBeDefined();
      expect(screen.getByText('Acquired rare item "Blade of Dusk"')).toBeDefined();
      expect(screen.getByText('Admin granted 500 essence')).toBeDefined();
    });

    // Should have date separators (grouped by date)
    const dateSeparators = document.querySelectorAll('.atm-date-separator');
    expect(dateSeparators.length).toBeGreaterThanOrEqual(1);
  });

  it('category filter toggles work', async () => {
    render(<ActivityTimelineModal {...defaultProps} />);
    await waitFor(() => expect(screen.getByText('Filters:')).toBeDefined());

    // All 5 category checkboxes should be present
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(5);

    // All should be checked by default
    checkboxes.forEach(cb => {
      expect((cb as HTMLInputElement).checked).toBe(true);
    });

    // Uncheck gameplay filter — this triggers a re-fetch
    fireEvent.click(checkboxes[0]);
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(false);

    // API should be called again with updated categories
    await waitFor(() => {
      const calls = (api.get as any).mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall).not.toContain('gameplay');
    });
  });

  it('load more pagination works', async () => {
    render(<ActivityTimelineModal {...defaultProps} />);
    await waitFor(() => expect(screen.getByText('Load More')).toBeDefined());

    fireEvent.click(screen.getByText('Load More'));

    await waitFor(() => {
      // Page 2 event should now be visible
      expect(screen.getByText('Sent message in global chat')).toBeDefined();
    });

    // "Load More" should disappear since has_more is false on page 2
    await waitFor(() => {
      expect(screen.queryByText('Load More')).toBeNull();
    });
  });
});
