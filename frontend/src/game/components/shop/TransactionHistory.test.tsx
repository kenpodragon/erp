import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../../api';
import TransactionHistory from './TransactionHistory';

// Mock RefundRequestModal
vi.mock('./RefundRequestModal', () => ({
  default: ({ onClose, onSubmit }: { onClose: () => void; onSubmit: () => void }) => (
    <div data-testid="refund-modal">
      <button onClick={onClose}>Close Refund</button>
      <button onClick={onSubmit}>Submit Refund</button>
    </div>
  ),
}));

const mockTransactionsResponse = {
  transactions: [
    {
      id: 1,
      created_at: '2026-03-10T12:00:00Z',
      source_type: 'purchase',
      description: 'Starter Pack - 500 shards',
      shard_amount: 500,
      balance_after: 500,
      refund_eligible: true,
      stripe_payment_id: 'pi_123',
    },
    {
      id: 2,
      created_at: '2026-03-09T10:00:00Z',
      source_type: 'bonus',
      description: 'First purchase bonus',
      shard_amount: 500,
      balance_after: 1000,
      refund_eligible: false,
    },
  ],
  page: 1,
  page_size: 20,
  total_count: 2,
  total_pages: 1,
};

const mockPaginatedResponse = {
  transactions: [
    {
      id: 1,
      created_at: '2026-03-10T12:00:00Z',
      source_type: 'purchase',
      description: 'Purchase 1',
      shard_amount: 100,
      balance_after: 100,
      refund_eligible: false,
    },
  ],
  page: 1,
  page_size: 20,
  total_count: 40,
  total_pages: 2,
};

describe('TransactionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders transaction rows', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTransactionsResponse),
    } as Response);

    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('Starter Pack - 500 shards')).toBeTruthy();
    });

    expect(screen.getByText('First purchase bonus')).toBeTruthy();
    expect(screen.getByText('Purchase')).toBeTruthy();
    expect(screen.getByText('Bonus')).toBeTruthy();
    // Verify shard amounts are rendered in the table
    const amountCells = document.querySelectorAll('.tx-amount');
    expect(amountCells.length).toBe(2);
  });

  it('shows "Request Refund" for eligible purchases', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTransactionsResponse),
    } as Response);

    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('Request Refund')).toBeTruthy();
    });
  });

  it('does not show refund button for ineligible purchases', async () => {
    const noRefundResponse = {
      ...mockTransactionsResponse,
      transactions: [
        {
          id: 2,
          created_at: '2026-03-09T10:00:00Z',
          source_type: 'bonus',
          description: 'First purchase bonus',
          shard_amount: 500,
          balance_after: 1000,
          refund_eligible: false,
        },
      ],
    };

    vi.mocked(api.get).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(noRefundResponse),
    } as Response);

    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('First purchase bonus')).toBeTruthy();
    });

    expect(screen.queryByText('Request Refund')).toBeNull();
  });

  it('pagination controls render when multiple pages exist', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPaginatedResponse),
    } as Response);

    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('Page 1 of 2')).toBeTruthy();
    });

    expect(screen.getByText('Previous')).toBeDisabled();
    expect(screen.getByText('Next')).not.toBeDisabled();
  });

  it('clicking Next advances the page', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPaginatedResponse),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ...mockPaginatedResponse,
          page: 2,
          transactions: [{
            id: 21,
            created_at: '2026-03-08T12:00:00Z',
            source_type: 'purchase',
            description: 'Purchase 21',
            shard_amount: 200,
            balance_after: 200,
            refund_eligible: false,
          }],
        }),
      } as Response);

    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('Next')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  it('filter dropdown changes the source_type parameter', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTransactionsResponse),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ...mockTransactionsResponse,
          transactions: [mockTransactionsResponse.transactions[0]],
        }),
      } as Response);

    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('Transaction History')).toBeTruthy();
    });

    const select = screen.getByDisplayValue('All Types');
    fireEvent.change(select, { target: { value: 'purchase' } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(2);
    });

    // Second call should include the source_type filter
    const secondCall = vi.mocked(api.get).mock.calls[1][0];
    expect(secondCall).toContain('source_type=purchase');
  });

  it('shows empty state when no transactions', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        transactions: [],
        page: 1,
        page_size: 20,
        total_count: 0,
        total_pages: 1,
      }),
    } as Response);

    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('No transactions found.')).toBeTruthy();
    });
  });

  it('opens refund modal when "Request Refund" is clicked', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTransactionsResponse),
    } as Response);

    render(<TransactionHistory />);

    await waitFor(() => {
      expect(screen.getByText('Request Refund')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Request Refund'));

    expect(screen.getByTestId('refund-modal')).toBeTruthy();
  });
});
