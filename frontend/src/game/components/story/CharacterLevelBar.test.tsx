import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CharacterLevelBar from './CharacterLevelBar';

const mockLevelResponse = {
  character_id: 1,
  level: 5,
  character_xp: 30000,
  xp_to_next_level: 6000,
  xp_for_current_level: 25000,
  xp_for_next_level: 36000,
  level_cap: 99,
};

vi.mock('../../../api', () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from '../../../api';

describe('CharacterLevelBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders level badge', async () => {
    (api.get as any).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockLevelResponse) });

    render(<CharacterLevelBar />);

    await waitFor(() => {
      expect(screen.getByText('Lv 5')).toBeDefined();
    });
  });

  it('shows XP to next', async () => {
    (api.get as any).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockLevelResponse) });

    render(<CharacterLevelBar />);

    await waitFor(() => {
      expect(screen.getByText(/to next/)).toBeDefined();
    });
  });

  it('shows MAX at level cap', async () => {
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...mockLevelResponse, level: 99, level_cap: 99 }),
    });

    render(<CharacterLevelBar />);

    await waitFor(() => {
      expect(screen.getByText('MAX')).toBeDefined();
    });
  });

  it('renders nothing on API error', async () => {
    (api.get as any).mockResolvedValue({ ok: false });

    const { container } = render(<CharacterLevelBar />);

    await waitFor(() => {
      expect(container.innerHTML).toBe('');
    });
  });
});
