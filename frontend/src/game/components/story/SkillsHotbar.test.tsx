import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SkillsHotbar from './SkillsHotbar';
import type { StorySession } from '../../GameContext';
import { api } from '../../../api';

const mockUpdateStorySession = vi.fn();
const mockAddBuff = vi.fn();
const mockRemoveBuff = vi.fn();

vi.mock('../../GameContext', () => ({
  useGame: () => ({
    updateStorySession: mockUpdateStorySession,
    addBuff: mockAddBuff,
    removeBuff: mockRemoveBuff,
  })
}));

const baseSession: StorySession = {
  sessionId: 'test-session',
  sceneId: 1,
  chapterId: 1,
  currentZone: 1,
  currentWave: 0,
  sessionGold: 1000,
  darkRitualMultiplier: 1.0,
  narrativeProgressPct: 0,
  wavesComplete: false,
  characterStrength: 100,
  autoDpsPerSecond: 50,
  clickDmgMultiplier: 1.0,
  autoDpsMultiplier: 1.0,
  goldDropMultiplier: 1.0,
};

describe('SkillsHotbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.post as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders all skills initially locked', () => {
    render(<SkillsHotbar session={baseSession} gameConfigs={{}} />);
    const slots = document.querySelectorAll('.skill-slot--locked');
    expect(slots.length).toBe(9);
  });

  it('unlocks a skill when clicked if affordable', async () => {
    render(<SkillsHotbar session={baseSession} gameConfigs={{}} />);
    const clickstorm = screen.getByText('Clickstorm').closest('.skill-slot');
    
    await act(async () => {
      fireEvent.click(clickstorm!);
    });

    expect(api.post).toHaveBeenCalledWith('/api/game/story/session/test-session/upgrade', {
      upgrade_type: 'skill_unlock',
      skill_id: 1001,
    });
    expect(mockUpdateStorySession).toHaveBeenCalledWith({ sessionGold: 950 });
    expect(clickstorm?.classList.contains('skill-slot--locked')).toBe(false);
  });

  it('activates an unlocked skill and starts cooldown', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 2));
    render(<SkillsHotbar session={baseSession} gameConfigs={{}} />);
    const clickstorm = screen.getByText('Clickstorm').closest('.skill-slot');
    
    await act(async () => {
      fireEvent.click(clickstorm!);
    });

    await act(async () => {
      fireEvent.click(clickstorm!);
    });
    
    expect(api.post).toHaveBeenCalledWith('/api/game/story/session/test-session/skill', {
      skill_id: 1001,
      energized: false,
    });

    // Check if cooldown label is present
    expect(document.querySelector('.skill-cd-label')).not.toBeNull();
  });

  it('enforces GCD (Global Cooldown)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 2));
    render(<SkillsHotbar session={baseSession} gameConfigs={{}} />);
    const cs = screen.getByText('Clickstorm').closest('.skill-slot');
    const ps = screen.getByText('Powersurge').closest('.skill-slot');
    
    await act(async () => {
      fireEvent.click(cs!);
      fireEvent.click(ps!);
    });

    await act(async () => {
      fireEvent.click(cs!);
    });
    expect(api.post).toHaveBeenCalledTimes(3); 

    await act(async () => {
      fireEvent.click(ps!);
    });
    expect(api.post).toHaveBeenCalledTimes(3); // Blocked by GCD

    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    await act(async () => {
      fireEvent.click(ps!);
    });
    expect(api.post).toHaveBeenCalledTimes(4); // Success after GCD
  });

  it('applies Energize effect to next skill', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 2));
    render(<SkillsHotbar session={baseSession} gameConfigs={{}} />);
    const en = screen.getByText('Energize').closest('.skill-slot');
    const ps = screen.getByText('Powersurge').closest('.skill-slot');
    
    await act(async () => {
      fireEvent.click(en!);
      fireEvent.click(ps!);
    });

    await act(async () => {
      fireEvent.click(en!);
    });
    
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    await act(async () => {
      fireEvent.click(ps!);
    });
    
    expect(api.post).toHaveBeenCalledWith('/api/game/story/session/test-session/skill', {
      skill_id: 1002,
      energized: true,
    });
  });

  it('handles Reload meta-skill', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 2));
    render(<SkillsHotbar session={baseSession} gameConfigs={{}} />);
    const cs = screen.getByText('Clickstorm').closest('.skill-slot');
    const rl = screen.getByText('Reload').closest('.skill-slot');
    
    await act(async () => {
      fireEvent.click(cs!);
      fireEvent.click(rl!);
    });

    await act(async () => {
      fireEvent.click(cs!);
    });
    
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    await act(async () => {
      fireEvent.click(rl!);
    });

    // Check if cooldown labels are present for both
    const labels = document.querySelectorAll('.skill-cd-label');
    expect(labels.length).toBeGreaterThanOrEqual(2);
  });
});
