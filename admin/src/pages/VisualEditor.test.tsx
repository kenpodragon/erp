import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VisualEditor from './VisualEditor';
import { api } from '../api';

vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockMovementTypes = [
  { id: 1, name: 'ground', y_offset_min: 0, y_offset_max: 0, bob_amplitude: 0, bob_frequency: 0, speed_multiplier: 1.0, trail_effect: 'none' },
  { id: 2, name: 'flying', y_offset_min: -20, y_offset_max: -10, bob_amplitude: 3, bob_frequency: 1.5, speed_multiplier: 1.2, trail_effect: 'sparkle' },
];

const mockSizeClasses = [
  { id: 1, name: 'small', scale_min: 0.5, scale_max: 0.8, width_base: 20, height_base: 20, hitbox_radius: 10, hp_bar_width: 30, sort_order: 1 },
];

const mockArmorClasses = [
  { id: 1, code: 'light', display_name: 'Light Armor', overlay_opacity: 0.2, texture_pattern: 'cloth', glow_intensity: 0, weight_class: 'light' },
];

describe('VisualEditor', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Reset URL so tab state doesn't leak between tests
    window.history.replaceState({}, '', window.location.pathname);
    // Default: return movement types for first tab
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('movement-types')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockMovementTypes) });
      if (url.includes('size-classes')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSizeClasses) });
      if (url.includes('armor-classes')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockArmorClasses) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    (api.post as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 99 }) });
    (api.put as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: 1 }) });
    (api.delete as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) });
  });

  it('renders the title and tabs', async () => {
    render(<VisualEditor />);
    expect(screen.getByText('Visual Editor')).toBeDefined();
    expect(screen.getByText('Movement Types')).toBeDefined();
    expect(screen.getByText('Size Classes')).toBeDefined();
    expect(screen.getByText('Animation Styles')).toBeDefined();
    expect(screen.getByText('Silhouette Types')).toBeDefined();
    expect(screen.getByText('Armor Classes')).toBeDefined();
  });

  it('loads and displays movement types by default', async () => {
    render(<VisualEditor />);
    await waitFor(() => {
      expect(screen.getByText('ground')).toBeDefined();
      expect(screen.getByText('flying')).toBeDefined();
    });
    expect(api.get).toHaveBeenCalledWith('/api/admin/visual/movement-types');
  });

  it('switches tabs and fetches new data', async () => {
    render(<VisualEditor />);
    await waitFor(() => expect(screen.getByText('ground')).toBeDefined());

    fireEvent.click(screen.getByText('Size Classes'));
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/admin/visual/size-classes');
      expect(screen.getByText('small')).toBeDefined();
    });
  });

  it('shows add modal when clicking add button', async () => {
    render(<VisualEditor />);
    await waitFor(() => expect(screen.getByText('ground')).toBeDefined());

    fireEvent.click(screen.getByText(/\+ Add/));
    expect(screen.getByText('Create')).toBeDefined();
    // Modal h3 title is present
    expect(screen.getByRole('heading', { level: 3 })).toBeDefined();
  });

  it('shows edit modal when clicking edit button', async () => {
    render(<VisualEditor />);
    await waitFor(() => expect(screen.getByText('ground')).toBeDefined());

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);
    expect(screen.getByText(/Edit Movement Type$/i)).toBeDefined();
    expect(screen.getByText('Save')).toBeDefined();
  });

  it('shows delete confirmation', async () => {
    render(<VisualEditor />);
    await waitFor(() => expect(screen.getByText('ground')).toBeDefined());

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);
    expect(screen.getByText('Confirm')).toBeDefined();
  });

  it('handles API errors gracefully', async () => {
    (api.get as any).mockResolvedValue({ ok: false, status: 500 });
    render(<VisualEditor />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load/)).toBeDefined();
    });
  });

  it('shows row count', async () => {
    render(<VisualEditor />);
    await waitFor(() => {
      expect(screen.getByText('2 rows')).toBeDefined();
    });
  });

  it('renders boolean columns as Yes/No', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('silhouette-types')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 1, name: 'humanoid', body_shape: 'bipedal', body_ratio_w: 1, body_ratio_h: 2, has_limbs: true, limb_count: 4, has_head: true, has_wings: false, has_eye_glow: true },
          ]),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    render(<VisualEditor />);
    fireEvent.click(screen.getByText('Silhouette Types'));
    await waitFor(() => {
      const yesCells = screen.getAllByText('Yes');
      expect(yesCells.length).toBeGreaterThanOrEqual(1);
    });
  });
});
