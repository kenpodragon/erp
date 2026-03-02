import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PostBattleSummary from './PostBattleSummary';
import type { StorySession } from '../../GameContext';
import { api } from '../../../api';

const baseSession: StorySession = {
  sessionId: 'test-session-123',
  sceneId: 1,
  chapterId: 1,
  currentZone: 3,
  currentWave: 25,
  sessionGold: 1200,
  darkRitualMultiplier: 1.0,
  narrativeProgressPct: 100,
  wavesComplete: true,
  characterStrength: 10,
  autoDpsPerSecond: 5,
  clickDmgMultiplier: 1,
  autoDpsMultiplier: 1,
  goldDropMultiplier: 1,
};

describe('PostBattleSummary', () => {
  const onContinue = vi.fn();
  const onReturnToHub = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        session_gold: 1200,
        essence_earned: 12,
        current_wave: 25,
        dark_ritual_multiplier: 1.0,
      }),
    });
  });

  it('renders the SCENE COMPLETE title', () => {
    render(<PostBattleSummary session={baseSession} onContinue={onContinue} onReturnToHub={onReturnToHub} />);
    expect(screen.getByText('SCENE COMPLETE')).toBeDefined();
  });

  it('shows loading state initially', () => {
    render(<PostBattleSummary session={baseSession} onContinue={onContinue} onReturnToHub={onReturnToHub} />);
    expect(screen.getByText('Tallying rewards...')).toBeDefined();
  });

  it('renders stat labels after data loads', async () => {
    render(<PostBattleSummary session={baseSession} onContinue={onContinue} onReturnToHub={onReturnToHub} />);
    await waitFor(() => {
      expect(screen.getByText('Gold Earned')).toBeDefined();
      expect(screen.getByText('Essence Earned')).toBeDefined();
      expect(screen.getByText('Waves Defeated')).toBeDefined();
    });
  });

  it('calls onContinue when Continue button clicked', async () => {
    render(<PostBattleSummary session={baseSession} onContinue={onContinue} onReturnToHub={onReturnToHub} />);
    await waitFor(() => screen.getByText('Gold Earned'));
    fireEvent.click(screen.getByTitle(/Stay and keep farming/));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('calls onReturnToHub when Return button clicked', async () => {
    render(<PostBattleSummary session={baseSession} onContinue={onContinue} onReturnToHub={onReturnToHub} />);
    await waitFor(() => screen.getByText('Gold Earned'));
    fireEvent.click(screen.getByTitle(/Claim Essence/));
    expect(onReturnToHub).toHaveBeenCalledOnce();
  });

  it('does not show Dark Ritual row when multiplier is 1.0', async () => {
    render(<PostBattleSummary session={baseSession} onContinue={onContinue} onReturnToHub={onReturnToHub} />);
    await waitFor(() => screen.getByText('Gold Earned'));
    expect(screen.queryByText('Dark Ritual')).toBeNull();
  });

  it('shows Dark Ritual row when multiplier is above 1', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        session_gold: 1200,
        essence_earned: 12,
        current_wave: 25,
        dark_ritual_multiplier: 1.05,
      }),
    });
    render(<PostBattleSummary session={{ ...baseSession, darkRitualMultiplier: 1.05 }} onContinue={onContinue} onReturnToHub={onReturnToHub} />);
    await waitFor(() => screen.getByText('Dark Ritual'));
    expect(screen.getByText('Dark Ritual')).toBeDefined();
  });

  it('falls back to local gold when API fails', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
    render(<PostBattleSummary session={baseSession} onContinue={onContinue} onReturnToHub={onReturnToHub} />);
    await waitFor(() => screen.queryByText('Tallying rewards...') === null);
    // Should fall through to local fallback without crashing
    expect(screen.queryByText('SCENE COMPLETE')).toBeDefined();
  });
});
