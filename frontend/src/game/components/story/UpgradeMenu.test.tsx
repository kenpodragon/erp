import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UpgradeMenu from './UpgradeMenu';
import type { StorySession } from '../../GameContext';
import type { SkillTreeEntry } from './StoryModeDashboard';
import { api } from '../../../api';

const mockUpdateStorySession = vi.fn();

vi.mock('../../GameContext', () => ({
  useGame: () => ({
    updateStorySession: mockUpdateStorySession,
  })
}));

const baseSession: StorySession = {
  sessionId: 'test-session',
  sceneId: 1,
  chapterId: 1,
  currentZone: 1,
  currentWave: 0,
  sessionGold: 100,
  darkRitualMultiplier: 1.0,
  narrativeProgressPct: 0,
  wavesComplete: false,
  previouslyCompleted: false,
  characterStrength: 100,
  autoDpsPerSecond: 50,
  clickUpgradeLevel: 0,
  autoUpgradeLevel: 0,
  clickDmgMultiplier: 1.0,
  autoDpsMultiplier: 1.0,
  goldDropMultiplier: 1.0,
  isBossSession: false,
  bossType: null,
  bossConfig: null,
  isReplay: false,
};

const makeSkillEntry = (overrides: Partial<SkillTreeEntry> = {}): SkillTreeEntry => ({
  skill_id: 100,
  name: 'TestSkill',
  display_name: 'Test Skill',
  category: 'active',
  description: 'A test active skill',
  is_class_exclusive: false,
  effect_type: 'click_dmg_boost',
  idle_level: 5,
  idle_xp: 1000,
  max_session_level: 3,
  prerequisites_met: true,
  prerequisites: [],
  at_level_0: false,
  level_0_xp_requirement: 0,
  idle_level_scaling: null,
  ...overrides,
});

describe('UpgradeMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.post as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        click_dmg_multiplier: 1.1,
        auto_dps_multiplier: 1.2,
      }),
    });
  });

  it('renders qty buttons', () => {
    render(<UpgradeMenu session={baseSession} gameConfigs={{}} skillTree={[]} />);
    expect(screen.getByText('×1')).toBeDefined();
    expect(screen.getByText('×10')).toBeDefined();
    expect(screen.getByText('MAX')).toBeDefined();
  });

  it('renders upgrade tracks', () => {
    render(<UpgradeMenu session={baseSession} gameConfigs={{}} skillTree={[]} />);
    expect(screen.getByText('Click Damage')).toBeDefined();
    expect(screen.getByText('Auto-DPS')).toBeDefined();
  });

  it('toggles quantity on click', () => {
    render(<UpgradeMenu session={baseSession} gameConfigs={{}} skillTree={[]} />);
    const q10 = screen.getByText('×10');
    fireEvent.click(q10);
    expect(q10.classList.contains('upgrade-qty-btn--active')).toBe(true);
  });

  it('shows cost based on quantity', () => {
    render(<UpgradeMenu session={baseSession} gameConfigs={{
      base_click_upgrade_cost: 5
    }} skillTree={[]} />);
    expect(screen.getByText('★ 5')).toBeDefined();
  });

  it('disables upgrade row when unaffordable', () => {
    const poorSession = { ...baseSession, sessionGold: 1 };
    render(<UpgradeMenu session={poorSession} gameConfigs={{
      base_click_upgrade_cost: 10
    }} skillTree={[]} />);
    const clickRow = screen.getByText('Click Damage').closest('.upgrade-row');
    expect(clickRow?.classList.contains('upgrade-row--disabled')).toBe(true);
  });

  it('calls API and updates session on upgrade click', async () => {
    render(<UpgradeMenu session={baseSession} gameConfigs={{
      base_click_upgrade_cost: 5
    }} skillTree={[]} />);
    const clickRow = screen.getByText('Click Damage').closest('.upgrade-row');
    fireEvent.click(clickRow!);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/game/story/session/test-session/upgrade', {
        upgrade_type: 'click_dmg',
        quantity: 1,
      });
      expect(mockUpdateStorySession).toHaveBeenCalledWith(expect.objectContaining({ clickDmgMultiplier: 1.1 }));
    });
  });

  // --- Skill tree integration tests ---

  it('shows ACTIVE SKILLS section when skill tree has active skills', () => {
    const skills = [makeSkillEntry()];
    render(<UpgradeMenu session={baseSession} gameConfigs={{}} skillTree={skills} />);
    expect(screen.getByText('ACTIVE SKILLS')).toBeDefined();
    expect(screen.getByText('Test Skill')).toBeDefined();
  });

  it('does not show ACTIVE SKILLS section when skill tree is empty', () => {
    render(<UpgradeMenu session={baseSession} gameConfigs={{}} skillTree={[]} />);
    expect(screen.queryByText('ACTIVE SKILLS')).toBeNull();
  });

  it('shows READY badge for skill with prerequisites met', () => {
    const skills = [makeSkillEntry({ prerequisites_met: true, at_level_0: false })];
    render(<UpgradeMenu session={baseSession} gameConfigs={{}} skillTree={skills} />);
    expect(screen.getByText('READY')).toBeDefined();
  });

  it('shows LOCKED badge for skill with prerequisites not met', () => {
    const skills = [makeSkillEntry({
      prerequisites_met: false,
      prerequisites: [{ type: 'idle_skill_level', ref_id: 1, required: 10, current: 3, met: false, hint: 'Attack Level 10 required' }],
    })];
    render(<UpgradeMenu session={baseSession} gameConfigs={{}} skillTree={skills} />);
    expect(screen.getByText('LOCKED')).toBeDefined();
  });

  it('shows prerequisite hint for locked skill', () => {
    const skills = [makeSkillEntry({
      prerequisites_met: false,
      prerequisites: [{ type: 'idle_skill_level', ref_id: 1, required: 10, current: 3, met: false, hint: 'Attack Level 10 required' }],
    })];
    render(<UpgradeMenu session={baseSession} gameConfigs={{}} skillTree={skills} />);
    expect(screen.getByText('Attack Level 10 required')).toBeDefined();
  });

  it('shows Level 0 XP progress for skill at level 0', () => {
    const skills = [makeSkillEntry({
      at_level_0: true,
      idle_xp: 500,
      level_0_xp_requirement: 1500,
    })];
    render(<UpgradeMenu session={baseSession} gameConfigs={{}} skillTree={skills} />);
    expect(screen.getByText('XP: 500/1500 to unlock')).toBeDefined();
  });

  it('hides class-exclusive skills from UpgradeMenu active skills section', () => {
    const skills = [
      makeSkillEntry({ name: 'Universal', display_name: 'Universal Skill', is_class_exclusive: false }),
      makeSkillEntry({ skill_id: 200, name: 'ClassOnly', display_name: 'Class Skill', is_class_exclusive: true }),
    ];
    render(<UpgradeMenu session={baseSession} gameConfigs={{}} skillTree={skills} />);
    expect(screen.getByText('Universal Skill')).toBeDefined();
    expect(screen.queryByText('Class Skill')).toBeNull();
  });

  it('shows idle level for active skill', () => {
    const skills = [makeSkillEntry({ idle_level: 15 })];
    render(<UpgradeMenu session={baseSession} gameConfigs={{}} skillTree={skills} />);
    expect(screen.getByText(/Idle Lv 15/)).toBeDefined();
  });
});
