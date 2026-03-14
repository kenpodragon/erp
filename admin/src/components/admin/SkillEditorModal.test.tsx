import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SkillEditorModal from './SkillEditorModal';
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

const mockSkillsResponse = {
  skills: [
    {
      skill_id: 1,
      skill_name: 'Power Strike',
      category: 'combat',
      class_exclusive: false,
      current_level: 5,
      current_xp: 120.5,
      has_skill_record: true,
      prerequisites_met: true,
      prerequisites: [],
    },
    {
      skill_id: 2,
      skill_name: 'Shield Bash',
      category: 'combat',
      class_exclusive: true,
      current_level: 3,
      current_xp: 45.0,
      has_skill_record: true,
      prerequisites_met: true,
      prerequisites: [
        { skill_id: 1, skill_name: 'Power Strike', required_level: 3, current_level: 5, met: true },
      ],
    },
    {
      skill_id: 3,
      skill_name: 'Whirlwind',
      category: 'combat',
      class_exclusive: true,
      current_level: null,
      current_xp: null,
      has_skill_record: false,
      prerequisites_met: false,
      prerequisites: [
        { skill_id: 2, skill_name: 'Shield Bash', required_level: 5, current_level: 3, met: false },
      ],
    },
    {
      skill_id: 4,
      skill_name: 'Meditation',
      category: 'utility',
      class_exclusive: false,
      current_level: 2,
      current_xp: 30.0,
      has_skill_record: true,
      prerequisites_met: true,
      prerequisites: [],
    },
  ],
};

const defaultProps = {
  characterId: 10,
  characterName: 'Arion',
  className: 'Warrior',
  onClose: vi.fn(),
  onSave: vi.fn(),
};

describe('SkillEditorModal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSkillsResponse),
    });
    (api.patch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ updated: 1 }),
    });
  });

  it('renders skill table with levels', async () => {
    render(<SkillEditorModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Skill Name')).toBeDefined();
      expect(screen.getByText('Power Strike')).toBeDefined();
      expect(screen.getByText('Shield Bash')).toBeDefined();
      expect(screen.getByText('Whirlwind')).toBeDefined();
      expect(screen.getByText('Meditation')).toBeDefined();
    });
  });

  it('shows locked skills with unmet prerequisites', async () => {
    render(<SkillEditorModal {...defaultProps} />);
    await waitFor(() => expect(screen.getByText('Whirlwind')).toBeDefined());

    // Whirlwind should show unmet prerequisite detail
    await waitFor(() => {
      expect(screen.getByText(/Needs: Shield Bash Lv5/)).toBeDefined();
    });

    // Whirlwind's level input should be disabled
    const rows = document.querySelectorAll('.sem-row-locked');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('reset all requires double confirmation', async () => {
    render(<SkillEditorModal {...defaultProps} />);
    await waitFor(() => expect(screen.getByText('Reset All to Level 1')).toBeDefined());

    // First click opens first confirmation
    fireEvent.click(screen.getByText('Reset All to Level 1'));
    await waitFor(() => {
      expect(screen.getByText('Reset All Skills?')).toBeDefined();
      expect(screen.getByText('Yes, Reset')).toBeDefined();
    });

    // Second click triggers step 2
    fireEvent.click(screen.getByText('Yes, Reset'));
    await waitFor(() => {
      expect(screen.getByText('Are you absolutely sure?')).toBeDefined();
      expect(screen.getByText('Confirm Reset')).toBeDefined();
    });
  });
});
