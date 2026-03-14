import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EssenceAdjustModal from './EssenceAdjustModal';
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

const mockHistoryResponse = {
  current_balance: 5000,
  adjustments: [
    {
      id: 1,
      amount: 2000,
      direction: 'grant',
      reason: 'Bug compensation for lost progress',
      admin_email: 'admin@test.com',
      created_at: '2026-03-10T14:30:00Z',
    },
    {
      id: 2,
      amount: 500,
      direction: 'debit',
      reason: 'Duplicate essence exploit correction',
      admin_email: 'admin@test.com',
      created_at: '2026-03-08T10:00:00Z',
    },
  ],
};

const defaultProps = {
  characterId: 10,
  characterName: 'Arion',
  onClose: vi.fn(),
  onSave: vi.fn(),
};

describe('EssenceAdjustModal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHistoryResponse),
    });
    (api.post as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  it('renders with current balance and adjustment history', async () => {
    render(<EssenceAdjustModal {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/5,000 Essence/)).toBeDefined();
      expect(screen.getByText('Recent Admin Adjustments')).toBeDefined();
      expect(screen.getByText(/\+2,000/)).toBeDefined();
      expect(screen.getByText(/-500/)).toBeDefined();
    });
  });

  it('grant/debit toggle updates preview', async () => {
    render(<EssenceAdjustModal {...defaultProps} />);
    await waitFor(() => expect(screen.getByText(/5,000 Essence/)).toBeDefined());

    // Enter an amount
    const amountInput = screen.getByPlaceholderText('e.g. 5000');
    fireEvent.change(amountInput, { target: { value: '1000' } });

    // Should show preview with grant (default) => 5000 + 1000 = 6000
    await waitFor(() => {
      expect(screen.getByText(/6,000 Essence/)).toBeDefined();
    });

    // Switch to debit
    const debitRadio = screen.getByLabelText('Debit');
    fireEvent.click(debitRadio);

    // Preview should now show 5000 - 1000 = 4000
    await waitFor(() => {
      expect(screen.getByText(/4,000 Essence/)).toBeDefined();
    });
  });

  it('validates reason minimum length', async () => {
    render(<EssenceAdjustModal {...defaultProps} />);
    await waitFor(() => expect(screen.getByText(/5,000 Essence/)).toBeDefined());

    // Enter amount and short reason
    fireEvent.change(screen.getByPlaceholderText('e.g. 5000'), { target: { value: '100' } });
    fireEvent.change(screen.getByPlaceholderText('Describe the reason for this adjustment...'), {
      target: { value: 'short' },
    });

    // Hint should show minimum character requirement
    await waitFor(() => {
      expect(screen.getByText(/min 10 characters/)).toBeDefined();
    });

    // The submit button should be disabled due to reason length
    const submitBtn = screen.getByText('Confirm Adjustment');
    expect(submitBtn.hasAttribute('disabled')).toBe(true);
  });
});
