import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProgressionEditorModal from './ProgressionEditorModal';
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

const mockContentTree = {
  books: [
    {
      id: 1,
      book_number: 1,
      title: 'The Awakening',
      chapters: [
        {
          id: 1,
          chapter_number: 1,
          title: 'The Beginning',
          scenes: [
            { id: 1, sort_order: 1, title: 'Arrival', scene_type: 'normal' },
            { id: 2, sort_order: 2, title: 'First Steps', scene_type: 'normal' },
            { id: 3, sort_order: 9999, title: 'Guardian of Dawn', scene_type: 'chapter_boss' },
          ],
        },
        {
          id: 2,
          chapter_number: 2,
          title: 'Into Darkness',
          scenes: [
            { id: 4, sort_order: 1, title: 'The Descent', scene_type: 'normal' },
          ],
        },
      ],
    },
    {
      id: 2,
      book_number: 2,
      title: 'The Ascent',
      chapters: [
        {
          id: 3,
          chapter_number: 1,
          title: 'New Dawn',
          scenes: [
            { id: 5, sort_order: 1, title: 'Rebirth', scene_type: 'normal' },
          ],
        },
      ],
    },
  ],
};

const mockBossCompletions = {
  completions: [
    {
      scene_id: 3,
      scene_title: 'Guardian of Dawn',
      chapter_title: 'The Beginning',
      completed_at: '2026-03-05T12:00:00Z',
    },
  ],
};

const defaultProps = {
  characterId: 10,
  characterName: 'Arion',
  currentPosition: { book: 1, chapter: 1, scene: 1 },
  onClose: vi.fn(),
  onSave: vi.fn(),
};

describe('ProgressionEditorModal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/content-tree')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockContentTree) });
      if (url.includes('/boss-completions')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBossCompletions) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    (api.patch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    (api.post as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  });

  it('renders cascading dropdowns for book, chapter, scene', async () => {
    render(<ProgressionEditorModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByLabelText('Book:')).toBeDefined();
      expect(screen.getByLabelText('Chapter:')).toBeDefined();
      expect(screen.getByLabelText('Scene:')).toBeDefined();
      expect(screen.getByText(/Book 1: The Awakening/)).toBeDefined();
      expect(screen.getByText(/Chapter 1: The Beginning/)).toBeDefined();
    });
  });

  it('shows advancing/rewinding indicator when position changes', async () => {
    render(<ProgressionEditorModal {...defaultProps} />);
    await waitFor(() => expect(screen.getByLabelText('Chapter:')).toBeDefined());

    // Change to chapter 2 (advancing)
    const chapterSelect = screen.getByLabelText('Chapter:');
    fireEvent.change(chapterSelect, { target: { value: '2' } });

    await waitFor(() => {
      expect(screen.getByText('Advancing:')).toBeDefined();
    });
  });

  it('boss completion checkboxes toggle selection', async () => {
    render(<ProgressionEditorModal {...defaultProps} />);
    await waitFor(() => expect(screen.getByText('Boss Completions')).toBeDefined());

    // Find the boss checkbox
    const bossCheckbox = screen.getByRole('checkbox');
    expect((bossCheckbox as HTMLInputElement).checked).toBe(false);

    fireEvent.click(bossCheckbox);
    expect((bossCheckbox as HTMLInputElement).checked).toBe(true);

    // Reset button should appear
    await waitFor(() => {
      expect(screen.getByText('Reset Selected Bosses (1)')).toBeDefined();
    });
  });
});
