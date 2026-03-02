import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AudioPlayer from './AudioPlayer';

// HTMLMediaElement is not implemented in jsdom
beforeEach(() => {
  window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
  window.HTMLMediaElement.prototype.pause = vi.fn();
  window.HTMLMediaElement.prototype.load = vi.fn();
});

describe('AudioPlayer', () => {
  it('renders track label', () => {
    render(<AudioPlayer />);
    // Default first track is Exploration
    expect(screen.getByText('Exploration')).toBeDefined();
  });

  it('renders play button initially', () => {
    render(<AudioPlayer />);
    expect(screen.getByTitle('Play')).toBeDefined();
  });

  it('toggles to pause button when play is clicked', async () => {
    render(<AudioPlayer />);
    const playBtn = screen.getByTitle('Play');
    fireEvent.click(playBtn);
    expect(screen.getByTitle('Pause')).toBeDefined();
  });

  it('cycles to next track on next button click', () => {
    render(<AudioPlayer />);
    const nextBtn = screen.getByTitle('Next track');
    fireEvent.click(nextBtn);
    expect(screen.getByText('Combat')).toBeDefined();
  });

  it('cycles to previous track on prev button click', () => {
    render(<AudioPlayer />);
    // From Exploration, prev wraps to Boss (last track)
    const prevBtn = screen.getByTitle('Previous track');
    fireEvent.click(prevBtn);
    expect(screen.getByText('Boss')).toBeDefined();
  });

  it('shows the default speed (1×)', () => {
    render(<AudioPlayer />);
    expect(screen.getByTitle('Playback speed')).toBeDefined();
    expect(screen.getByTitle('Playback speed').textContent).toBe('1×');
  });

  it('cycles speed on speed button click', () => {
    render(<AudioPlayer />);
    const speedBtn = screen.getByTitle('Playback speed');
    fireEvent.click(speedBtn);
    expect(speedBtn.textContent).toBe('1.5×');
  });

  it('renders the waveform bars', () => {
    const { container } = render(<AudioPlayer />);
    const bars = container.querySelectorAll('.audio-wave-bar');
    expect(bars.length).toBe(5);
  });

  it('adds active class to waveform when playing', () => {
    const { container } = render(<AudioPlayer />);
    const wave = container.querySelector('.audio-wave');
    expect(wave?.classList.contains('audio-wave--active')).toBe(false);
    fireEvent.click(screen.getByTitle('Play'));
    expect(wave?.classList.contains('audio-wave--active')).toBe(true);
  });
});
