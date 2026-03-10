import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../../../api';
import PaymentStatus from './PaymentStatus';

describe('PaymentStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows polling indicator initially', async () => {
    // Return pending so it stays in polling state
    vi.mocked(api.get).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'pending' }),
      } as Response)
    );

    render(
      <PaymentStatus
        sessionId="sess_123"
        onComplete={vi.fn()}
        onTimeout={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Payment Processing...')).toBeTruthy();
    });

    expect(screen.getByText('Please wait while we confirm your purchase.')).toBeTruthy();
  });

  it('shows success state when status is "completed"', async () => {
    vi.mocked(api.get).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          status: 'completed',
          shards_granted: 500,
          new_balance: 1500,
        }),
      } as Response)
    );

    render(
      <PaymentStatus
        sessionId="sess_123"
        onComplete={vi.fn()}
        onTimeout={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Payment Successful!')).toBeTruthy();
    });

    expect(screen.getByText('+500 Shards')).toBeTruthy();
  });

  it('calls onComplete after success auto-dismiss delay', async () => {
    const onComplete = vi.fn();

    vi.mocked(api.get).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          status: 'completed',
          shards_granted: 500,
          new_balance: 1500,
        }),
      } as Response)
    );

    render(
      <PaymentStatus
        sessionId="sess_123"
        onComplete={onComplete}
        onTimeout={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Payment Successful!')).toBeTruthy();
    });

    // Advance past the 2500ms auto-dismiss timeout
    vi.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(500, 1500);
    });
  });

  it('shows timeout state and dismiss button after max attempts', async () => {
    let callCount = 0;
    vi.mocked(api.get).mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'pending' }),
      } as Response);
    });

    render(
      <PaymentStatus
        sessionId="sess_789"
        onComplete={vi.fn()}
        onTimeout={vi.fn()}
      />
    );

    // Wait for first poll
    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });

    // Advance through all 20 poll intervals (3s each)
    for (let i = 0; i < 25; i++) {
      vi.advanceTimersByTime(3000);
      await waitFor(() => {});
    }

    await waitFor(() => {
      expect(screen.getByText('Still Processing')).toBeTruthy();
    });

    expect(screen.getByText('Dismiss')).toBeTruthy();
  });

  it('calls onTimeout when Dismiss is clicked after timeout', async () => {
    const onTimeout = vi.fn();

    vi.mocked(api.get).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'pending' }),
      } as Response)
    );

    render(
      <PaymentStatus
        sessionId="sess_789"
        onComplete={vi.fn()}
        onTimeout={onTimeout}
      />
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });

    // Advance through all poll intervals
    for (let i = 0; i < 25; i++) {
      vi.advanceTimersByTime(3000);
      await waitFor(() => {});
    }

    await waitFor(() => {
      expect(screen.getByText('Dismiss')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Dismiss'));
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('polls the correct API endpoint', async () => {
    vi.mocked(api.get).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'pending' }),
      } as Response)
    );

    render(
      <PaymentStatus
        sessionId="sess_abc"
        onComplete={vi.fn()}
        onTimeout={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/payments/status/sess_abc');
    });
  });
});
