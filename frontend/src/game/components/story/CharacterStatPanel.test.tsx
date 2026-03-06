import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CharacterStatPanel from './CharacterStatPanel';

const mockStatsResponse = {
  character_id: 1,
  character_level: 5,
  stats: [
    { stat_id: 1, name: 'strength', display_name: 'Strength', total: 42, base: 15, class_name: 'Drifter' },
    { stat_id: 2, name: 'agility', display_name: 'Agility', total: 38, base: 10, class_name: 'Drifter' },
    { stat_id: 3, name: 'intelligence', display_name: 'Intelligence', total: 25, base: 8, class_name: 'Drifter' },
  ],
};

vi.mock('../../../api', () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from '../../../api';

describe('CharacterStatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders stat abbreviations and values', async () => {
    (api.get as any).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockStatsResponse) });

    render(<CharacterStatPanel />);

    await waitFor(() => {
      expect(screen.getByText('STR')).toBeDefined();
      expect(screen.getByText('42')).toBeDefined();
      expect(screen.getByText('AGI')).toBeDefined();
      expect(screen.getByText('38')).toBeDefined();
      expect(screen.getByText('INT')).toBeDefined();
      expect(screen.getByText('25')).toBeDefined();
    });
  });

  it('renders nothing on API error', async () => {
    (api.get as any).mockResolvedValue({ ok: false });

    const { container } = render(<CharacterStatPanel />);

    await waitFor(() => {
      expect(container.innerHTML).toBe('');
    });
  });

  it('shows CHARACTER STATS title', async () => {
    (api.get as any).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockStatsResponse) });

    render(<CharacterStatPanel />);

    await waitFor(() => {
      expect(screen.getByText('CHARACTER STATS')).toBeDefined();
    });
  });
});
