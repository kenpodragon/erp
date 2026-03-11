import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PaymentWarningBanner } from './PaymentWarningBanner';

describe('PaymentWarningBanner', () => {
  it('renders warning text', () => {
    render(<PaymentWarningBanner graceDeadline={null} />);
    expect(screen.getByText('Payment failed')).toBeTruthy();
    expect(screen.getByText(/update your payment method/)).toBeTruthy();
  });

  it('shows deadline date when provided', () => {
    const futureDate = new Date(Date.now() + 86400000 * 3).toISOString();
    render(<PaymentWarningBanner graceDeadline={futureDate} />);
    expect(screen.getByText(/Benefits active until/)).toBeTruthy();
  });

  it('renders warning icon', () => {
    render(<PaymentWarningBanner graceDeadline={null} />);
    expect(screen.getByText('⚠')).toBeTruthy();
  });
});
