import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharacterEditorModal from './CharacterEditorModal';
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

vi.mock('./StatBreakdownPanel', () => ({
  default: () => <div data-testid="stat-breakdown">StatBreakdownPanel</div>,
}));

const mockStatsResponse = {
  character_id: 10,
  character_name: 'Arion',
  level: 25,
  xp: 48000,
  class_id: 1,
  class_name: 'Warrior',
  strength: 50,
  agility: 30,
  intelligence: 20,
  equipment_warnings: [],
};

const mockClassesResponse = {
  classes: [
    { id: 1, name: 'Warrior' },
    { id: 2, name: 'Mage' },
    { id: 3, name: 'Ranger' },
  ],
};

const defaultProps = {
  characterId: 10,
  onClose: vi.fn(),
  onSave: vi.fn(),
};

describe('CharacterEditorModal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/stats')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockStatsResponse) });
      if (url.includes('/classes')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockClassesResponse) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    (api.patch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 10 }) });
  });

  it('renders with character data from GET /stats', async () => {
    render(<CharacterEditorModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Edit Character - Arion')).toBeDefined();
      expect(screen.getByDisplayValue('Arion')).toBeDefined();
      expect(screen.getByDisplayValue('25')).toBeDefined();
      expect(screen.getByDisplayValue('48000')).toBeDefined();
    });
  });

  it('allows editing name, level, and XP fields', async () => {
    render(<CharacterEditorModal {...defaultProps} />);
    await waitFor(() => expect(screen.getByDisplayValue('Arion')).toBeDefined());

    const nameInput = screen.getByLabelText('Character Name');
    fireEvent.change(nameInput, { target: { value: 'Arion the Bold' } });
    expect((nameInput as HTMLInputElement).value).toBe('Arion the Bold');

    const levelInput = screen.getByLabelText('Level');
    fireEvent.change(levelInput, { target: { value: '30' } });
    expect((levelInput as HTMLInputElement).value).toBe('30');

    const xpInput = screen.getByLabelText('XP');
    fireEvent.change(xpInput, { target: { value: '60000' } });
    expect((xpInput as HTMLInputElement).value).toBe('60000');
  });

  it('shows confirmation dialog on class change', async () => {
    render(<CharacterEditorModal {...defaultProps} />);
    await waitFor(() => expect(screen.getByDisplayValue('Arion')).toBeDefined());

    const classSelect = screen.getByLabelText('Class');
    fireEvent.change(classSelect, { target: { value: '2' } });

    await waitFor(() => {
      expect(screen.getByText('Confirm Class Change')).toBeDefined();
      expect(screen.getByText('Confirm Change')).toBeDefined();
    });
  });

  it('sends PATCH with changed fields only on save', async () => {
    render(<CharacterEditorModal {...defaultProps} />);
    await waitFor(() => expect(screen.getByDisplayValue('Arion')).toBeDefined());

    // Change only the name
    const nameInput = screen.getByLabelText('Character Name');
    fireEvent.change(nameInput, { target: { value: 'Arion Reborn' } });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/api/admin/characters/10', {
        character_name: 'Arion Reborn',
      });
    });
  });
});
