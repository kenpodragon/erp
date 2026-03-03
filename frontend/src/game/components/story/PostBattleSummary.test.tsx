import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PostBattleSummary from './PostBattleSummary';
import type { StorySession } from '../../GameContext';
import { api } from '../../../api';

const baseSession: StorySession = {
  sessionId: 'test-session',
  sceneId: 1,
  chapterId: 1,
  currentZone: 1,
  currentWave: 25,
  sessionGold: 1178,
  darkRitualMultiplier: 1.0,
  narrativeProgressPct: 100,
  wavesComplete: true,
  characterStrength: 10,
  autoDpsPerSecond: 10,
  clickUpgradeLevel: 0,
  autoUpgradeLevel: 0,
  clickDmgMultiplier: 1.0,
  autoDpsMultiplier: 1.0,
  goldDropMultiplier: 1.0,
};

const baseSummary = {
  session_gold: 1178,
  essence_earned: 12,
  current_wave: 25,
  dark_ritual_multiplier: 1.0,
};

describe('PostBattleSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the SCENE COMPLETE title', async () => {
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(baseSummary),
    });
    await act(async () => {
      render(<PostBattleSummary session={baseSession} onContinue={vi.fn()} onReturnToHub={vi.fn()} />);
    });
    expect(screen.getByText('SCENE COMPLETE')).toBeDefined();
  });

  it('shows loading state initially', () => {
    (api.get as any).mockReturnValue(new Promise(() => {})); // Never resolves
    render(<PostBattleSummary session={baseSession} onContinue={vi.fn()} onReturnToHub={vi.fn()} />);
    expect(screen.getByText('Tallying rewards...')).toBeDefined();
  });

  it('renders stat labels after data loads', async () => {
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(baseSummary),
    });
    await act(async () => {
      render(<PostBattleSummary session={baseSession} onContinue={vi.fn()} onReturnToHub={vi.fn()} />);
    });
    await waitFor(() => {
      expect(screen.getByText('Gold Earned')).toBeDefined();
      expect(screen.getByText('Essence Earned')).toBeDefined();
    });
  });

  it('calls onContinue when Continue button clicked', async () => {
    const onContinue = vi.fn();
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(baseSummary),
    });
    await act(async () => {
      render(<PostBattleSummary session={baseSession} onContinue={onContinue} onReturnToHub={vi.fn()} />);
    });
    // Wait for buttons to appear (after animation)
    await waitFor(() => screen.getByText(/Continue/));
    fireEvent.click(screen.getByText(/Continue/));
    expect(onContinue).toHaveBeenCalled();
  });

  it('calls onReturnToHub when Return button clicked', async () => {
    const onReturn = vi.fn();
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(baseSummary),
    });
    await act(async () => {
      render(<PostBattleSummary session={baseSession} onContinue={vi.fn()} onReturnToHub={onReturn} />);
    });
    await waitFor(() => screen.getByText(/Return to Hub/));
    fireEvent.click(screen.getByText(/Return to Hub/));
    expect(onReturn).toHaveBeenCalled();
  });

  it('does not show Dark Ritual row when multiplier is 1.0', async () => {
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(baseSummary),
    });
    await act(async () => {
      render(<PostBattleSummary session={baseSession} onContinue={vi.fn()} onReturnToHub={vi.fn()} />);
    });
    expect(screen.queryByText('Dark Ritual')).toBeNull();
  });

  it('shows Dark Ritual row when multiplier is above 1', async () => {
    vi.useFakeTimers();
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...baseSummary, dark_ritual_multiplier: 1.05 }),
    });
    
    await act(async () => {
      render(<PostBattleSummary session={{ ...baseSession, darkRitualMultiplier: 1.05 }} onContinue={vi.fn()} onReturnToHub={vi.fn()} />);
    });

    // Fast-forward through gold animation and reveal rewards
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText('Dark Ritual')).toBeDefined();
    vi.useRealTimers();
  });

  it('falls back to local gold when API fails', async () => {
    (api.get as any).mockRejectedValue(new Error('Network Error'));
    await act(async () => {
      render(<PostBattleSummary session={baseSession} onContinue={vi.fn()} onReturnToHub={vi.fn()} />);
    });
    await waitFor(() => {
      // Should show local gold from session prop (1178 formatted)
      expect(screen.getByText(/1.18 K/)).toBeDefined();
    });
  });
});
