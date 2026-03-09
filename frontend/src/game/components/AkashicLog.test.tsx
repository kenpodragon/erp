import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AkashicLog from './AkashicLog';
import { api } from '../../api';

vi.mock('../../api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

const mockLogData = {
  total_completion_pct: 41.7,
  total_unlocked: 5,
  total_beats: 12,
  books: [
    {
      id: 1,
      book_number: 1,
      title: 'The Pallid Mask',
      completion_pct: 41.7,
      unlocked_beats: 5,
      total_beats: 12,
      chapters: [
        {
          id: 1,
          chapter_number: 1,
          title: 'The Ascent',
          completion_pct: 83.3,
          unlocked_beats: 5,
          total_beats: 6,
          scenes: [
            {
              id: 1,
              scene_number: 1,
              title: 'First Steps',
              summary: 'The journey begins.',
              completed: true,
              first_completed_at: '2026-03-09T10:00:00Z',
              beats: [
                {
                  id: 1, sort_order: 1, content: 'The corridor stretched endlessly.',
                  unlocked: true, has_hidden_lore: true,
                  hidden_lore_text: 'Ancient runes shimmer on the walls.',
                  hidden_lore_unlocked: true, lore_intelligence_threshold: 15,
                  is_new: false,
                },
                {
                  id: 2, sort_order: 2, content: 'A void creature emerged.',
                  unlocked: true, has_hidden_lore: false,
                  hidden_lore_text: null, hidden_lore_unlocked: false,
                  lore_intelligence_threshold: null, is_new: true,
                },
                {
                  id: 3, sort_order: 3, content: 'The gate sealed shut.',
                  unlocked: true, has_hidden_lore: false,
                  hidden_lore_text: null, hidden_lore_unlocked: false,
                  lore_intelligence_threshold: null, is_new: false,
                },
              ],
            },
            {
              id: 2,
              scene_number: 2,
              title: 'The Barrier',
              summary: null,
              completed: false,
              first_completed_at: null,
              beats: [
                {
                  id: 4, sort_order: 1, content: 'Energy crackled.',
                  unlocked: true, has_hidden_lore: false,
                  hidden_lore_text: null, hidden_lore_unlocked: false,
                  lore_intelligence_threshold: null, is_new: false,
                },
                {
                  id: 5, sort_order: 2, content: null,
                  unlocked: false, has_hidden_lore: true,
                  hidden_lore_text: null, hidden_lore_unlocked: false,
                  lore_intelligence_threshold: 20, is_new: false,
                },
              ],
            },
          ],
        },
        {
          id: 2,
          chapter_number: 2,
          title: 'The Descent',
          completion_pct: 0,
          unlocked_beats: 0,
          total_beats: 6,
          scenes: [],
        },
      ],
    },
  ],
};

describe('AkashicLog Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockLogData),
    });
    (api.patch as any).mockResolvedValue({ ok: true });
  });

  it('renders total completion percentage', async () => {
    render(<AkashicLog />);
    await waitFor(() => {
      // Both total and book show 41.7%
      const pctElements = screen.getAllByText('41.7%');
      expect(pctElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders total beat count', async () => {
    render(<AkashicLog />);
    await waitFor(() => {
      expect(screen.getByText('5 / 12 entries deciphered')).toBeDefined();
    });
  });

  it('renders book title', async () => {
    render(<AkashicLog />);
    await waitFor(() => {
      expect(screen.getByText('The Pallid Mask')).toBeDefined();
    });
  });

  it('expands book to show chapters', async () => {
    render(<AkashicLog />);

    // Book auto-expands first book
    await waitFor(() => {
      expect(screen.getByText('The Ascent')).toBeDefined();
      expect(screen.getByText('The Descent')).toBeDefined();
    });
  });

  it('shows chapter completion bars', async () => {
    render(<AkashicLog />);
    await waitFor(() => {
      expect(screen.getByText('83.3%')).toBeDefined();
      expect(screen.getByText('0%')).toBeDefined();
    });
  });

  it('expands chapter to show scenes', async () => {
    render(<AkashicLog />);

    // Wait for chapters, then click first chapter
    const chapterBtn = await screen.findByText('The Ascent');
    fireEvent.click(chapterBtn);

    await waitFor(() => {
      expect(screen.getByText('First Steps')).toBeDefined();
      expect(screen.getByText('The Barrier')).toBeDefined();
    });
  });

  it('shows NEW badge on scenes with new beats', async () => {
    render(<AkashicLog />);

    const chapterBtn = await screen.findByText('The Ascent');
    fireEvent.click(chapterBtn);

    await waitFor(() => {
      // Scene "First Steps" has a beat with is_new=true
      expect(screen.getByText('NEW')).toBeDefined();
    });
  });

  it('shows completed check mark on finished scenes', async () => {
    render(<AkashicLog />);

    const chapterBtn = await screen.findByText('The Ascent');
    fireEvent.click(chapterBtn);

    await waitFor(() => {
      expect(screen.getByText('\u2713')).toBeDefined();
    });
  });

  it('expands scene to show beats and beat detail', async () => {
    render(<AkashicLog />);

    const chapterBtn = await screen.findByText('The Ascent');
    fireEvent.click(chapterBtn);

    const sceneBtn = await screen.findByText('First Steps');
    fireEvent.click(sceneBtn);

    await waitFor(() => {
      expect(screen.getByText('Entry 1')).toBeDefined();
      expect(screen.getByText('Entry 2')).toBeDefined();
    });

    // Click a beat to expand its detail
    fireEvent.click(screen.getByText('Entry 1'));

    await waitFor(() => {
      expect(screen.getByText('The corridor stretched endlessly.')).toBeDefined();
    });
  });

  it('shows hidden lore when unlocked', async () => {
    render(<AkashicLog />);

    const chapterBtn = await screen.findByText('The Ascent');
    fireEvent.click(chapterBtn);
    const sceneBtn = await screen.findByText('First Steps');
    fireEvent.click(sceneBtn);
    fireEvent.click(await screen.findByText('Entry 1'));

    await waitFor(() => {
      expect(screen.getByText('Hidden Knowledge')).toBeDefined();
      expect(screen.getByText('Ancient runes shimmer on the walls.')).toBeDefined();
    });
  });

  it('shows locked indicator for hidden lore below threshold', async () => {
    render(<AkashicLog />);

    const chapterBtn = await screen.findByText('The Ascent');
    fireEvent.click(chapterBtn);
    const sceneBtn = await screen.findByText('The Barrier');
    fireEvent.click(sceneBtn);

    await waitFor(() => {
      // Beat 5 is locked, so it should show [ENCRYPTED]
      expect(screen.getByText('[ENCRYPTED]')).toBeDefined();
    });
  });

  it('filters beats by search query', async () => {
    render(<AkashicLog />);
    await waitFor(() => {
      expect(screen.getByText('The Pallid Mask')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText('Search lore entries...');
    fireEvent.change(searchInput, { target: { value: 'void' } });

    await waitFor(() => {
      expect(screen.getByText('1 result')).toBeDefined();
    });
  });

  it('shows no results message for unmatched search', async () => {
    render(<AkashicLog />);
    await waitFor(() => {
      expect(screen.getByText('The Pallid Mask')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText('Search lore entries...');
    fireEvent.change(searchInput, { target: { value: 'zzzznotfound' } });

    await waitFor(() => {
      expect(screen.getByText(/No entries match/)).toBeDefined();
    });
  });

  it('calls patch to update akashic_last_visited_at on load', async () => {
    render(<AkashicLog />);
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/api/players/me/settings', { akashic_last_visited_at: true });
    });
  });

  it('shows loading state initially', () => {
    (api.get as any).mockReturnValue(new Promise(() => {})); // never resolves
    render(<AkashicLog />);
    expect(screen.getByText('Synchronizing with the Akashic Record...')).toBeDefined();
  });

  it('shows error state on API failure', async () => {
    (api.get as any).mockResolvedValue({ ok: false });
    render(<AkashicLog />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load Akashic Log data.')).toBeDefined();
    });
  });
});
