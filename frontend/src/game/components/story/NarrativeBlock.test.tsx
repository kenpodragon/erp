import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import NarrativeBlock from './NarrativeBlock';
import { api } from '../../../api';

const mockBeats = {
  beats: [
    { id: 1, beat_number: 1, text: 'Beat 1', display_delay_seconds: 1, word_count: 1, image_path: null },
    { id: 2, beat_number: 2, text: 'Beat 2', display_delay_seconds: 2, word_count: 1, image_path: null },
  ]
};

describe('NarrativeBlock', () => {
  const onComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBeats),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders loading state initially', async () => {
    await act(async () => {
      render(<NarrativeBlock sceneId={1} onComplete={onComplete} />);
    });
    expect(screen.queryByRole('aside')).toBeDefined();
  });

  it('fetches narrative beats on mount', async () => {
    await act(async () => {
      render(<NarrativeBlock sceneId={1} onComplete={onComplete} />);
    });
    expect(api.get).toHaveBeenCalledWith('/api/game/story/scenes/1/narrative');
  });

  it('reveals beats sequentially based on display_delay_seconds', async () => {
    vi.useFakeTimers();
    await act(async () => {
      render(<NarrativeBlock sceneId={1} onComplete={onComplete} />);
    });
    
    await act(async () => {
      await vi.runAllTicks();
    });

    // Initially 0 beats visible
    expect(screen.queryByText('Beat 1')).toBeNull();

    // Advance 2s for first beat (due to 2s floor in component)
    await act(async () => {
      vi.advanceTimersByTime(2001);
    });
    expect(screen.getByText('Beat 1')).toBeDefined();
    expect(screen.queryByText('Beat 2')).toBeNull();

    // Advance 2s more for second beat
    await act(async () => {
      vi.advanceTimersByTime(2001);
    });
    expect(screen.getByText('Beat 2')).toBeDefined();
  });

  it('calls onComplete after all beats are shown', async () => {
    vi.useFakeTimers();
    await act(async () => {
      render(<NarrativeBlock sceneId={1} onComplete={onComplete} />);
    });
    
    await act(async () => {
      await vi.runAllTicks();
    });

    // Total delay: 2s + 2s + 0.5s buffer
    await act(async () => {
      vi.advanceTimersByTime(4501);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByText('— End of Scene Narrative —')).toBeDefined();
  });

  it('renders images when image_path is provided', async () => {
    const mockBeatsWithImage = {
      beats: [
        { id: 3, beat_number: 3, text: 'Image Beat', display_delay_seconds: 0.5, word_count: 1, image_path: '/assets/test.png' }
      ]
    };
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBeatsWithImage),
    });

    vi.useFakeTimers();
    await act(async () => {
      render(<NarrativeBlock sceneId={1} onComplete={onComplete} />);
    });
    
    await act(async () => {
      await vi.runAllTicks();
    });

    await act(async () => {
      vi.advanceTimersByTime(2001);
    });

    const img = screen.getByAltText('Story beat 3');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('/assets/test.png');
  });

  it('prevents right-click and dragging on story images', async () => {
    const mockBeatsWithImage = {
      beats: [
        { id: 3, beat_number: 3, text: 'Image Beat', display_delay_seconds: 0.1, word_count: 1, image_path: '/assets/test.png' }
      ]
    };
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBeatsWithImage),
    });

    vi.useFakeTimers();
    await act(async () => {
      render(<NarrativeBlock sceneId={1} onComplete={onComplete} />);
    });
    
    await act(async () => {
      await vi.runAllTicks();
    });

    await act(async () => {
      vi.advanceTimersByTime(2001);
    });

    const img = screen.getByAltText('Story beat 3');
    const contextMenuEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    await act(async () => {
      img.dispatchEvent(contextMenuEvent);
    });
    expect(contextMenuEvent.defaultPrevented).toBe(true);
    expect(img.getAttribute('draggable')).toBe('false');
  });
});
