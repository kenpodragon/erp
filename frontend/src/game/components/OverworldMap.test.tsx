import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OverworldMap from './OverworldMap';
import { api } from '../../api';

// Mock useGame context
vi.mock('../GameContext', () => ({
  useGame: vi.fn(() => ({
    enterScene: vi.fn(),
    setVisualChapter: vi.fn(),
  })),
}));

// Mock API
vi.mock('../../api', () => ({
  api: {
    get: vi.fn(),
  },
}));

describe('OverworldMap Component', () => {
  const mockMapData = [
    {
      id: 1,
      title: 'Book 1: The First Descent',
      book_number: 1,
      status: 'available',
      progress: 25,
      chapters: [
        {
          id: 1,
          chapter_number: 1,
          title: 'Chapter 1: The Gate',
          progress: 50,
          scenes: [
            {
              id: 1,
              chapter_id: 1,
              name: 'Scene 1',
              title: 'The Threshold',
              sort_order: 1,
              status: 'mastered',
            },
            {
              id: 2,
              chapter_id: 1,
              name: 'Scene 2',
              title: 'The Inner Sanctum',
              sort_order: 2,
              status: 'in_progress',
            },
            {
              id: 3,
              chapter_id: 1,
              name: 'Scene 3',
              title: 'The Breach',
              sort_order: 3,
              status: 'available',
            },
            {
              id: 4,
              chapter_id: 1,
              name: 'Scene 4',
              title: 'The Void',
              sort_order: 4,
              status: 'locked',
            },
          ],
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (api.get as any).mockReturnValue(new Promise(() => {})); // Never resolves
    render(<OverworldMap />);
    expect(screen.getByText('Loading Map...')).toBeDefined();
  });

  it('renders mastered and in_progress states correctly', async () => {
    (api.get as any).mockResolvedValue({
      ok: true,
      json: async () => mockMapData,
    });

    render(<OverworldMap />);

    // Wait for data to load
    await waitFor(() => expect(screen.queryByText('Loading Map...')).toBeNull());

    // Verify Mastered scene (Scene 1-1)
    const masteredNode = screen.getByText('The Threshold').closest('.scene-node');
    expect(masteredNode?.classList.contains('mastered')).toBe(true);
    expect(screen.getByText('★')).toBeDefined(); // Mastery star

    // Verify In Progress scene (Scene 1-2)
    const inProgressNode = screen.getByText('The Inner Sanctum').closest('.scene-node');
    expect(inProgressNode?.classList.contains('in_progress')).toBe(true);
    const pulseDot = inProgressNode?.querySelector('.pulse-dot');
    expect(pulseDot).toBeDefined();

    // Verify Available scene (Scene 1-3)
    const availableNode = screen.getByText('The Breach').closest('.scene-node');
    expect(availableNode?.classList.contains('available')).toBe(true);

    // Verify Locked scene (Scene 1-4)
    const lockedNode = screen.getByText('The Void').closest('.scene-node');
    expect(lockedNode?.classList.contains('locked')).toBe(true);
    expect(screen.getByText('🔒')).toBeDefined();
  });

  it('renders book navigation sidebar with progress', async () => {
    (api.get as any).mockResolvedValue({
      ok: true,
      json: async () => mockMapData,
    });

    render(<OverworldMap />);

    await waitFor(() => expect(screen.queryByText('Loading Map...')).toBeNull());

    expect(screen.getByText('Chronicles')).toBeDefined();
    expect(screen.getByText('The First Descent')).toBeDefined();
    expect(screen.getByText('25%')).toBeDefined();
  });

  it('renders chapter rows with progress', async () => {
    (api.get as any).mockResolvedValue({
      ok: true,
      json: async () => mockMapData,
    });

    render(<OverworldMap />);

    await waitFor(() => expect(screen.queryByText('Loading Map...')).toBeNull());

    expect(screen.getByText('Chapter 1: The Gate')).toBeDefined();
    expect(screen.getByText('50%')).toBeDefined();
  });
});
