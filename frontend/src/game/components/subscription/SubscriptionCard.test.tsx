import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SubscriptionCard } from './SubscriptionCard';

describe('SubscriptionCard', () => {
  it('renders label and price', () => {
    render(
      <SubscriptionCard
        planKey="ascendant_monthly"
        price="$9.99/mo"
        label="Monthly"
        onSubscribe={() => {}}
      />
    );
    expect(screen.getByText('Monthly')).toBeTruthy();
    expect(screen.getByText('$9.99/mo')).toBeTruthy();
  });

  it('renders badge when provided', () => {
    render(
      <SubscriptionCard
        planKey="ascendant_annual"
        price="$99/yr"
        label="Annual"
        badge="2 months free!"
        onSubscribe={() => {}}
      />
    );
    expect(screen.getByText('2 months free!')).toBeTruthy();
  });

  it('calls onSubscribe with planKey on click', () => {
    const onSubscribe = vi.fn();
    render(
      <SubscriptionCard
        planKey="ascendant_monthly"
        price="$9.99/mo"
        label="Monthly"
        onSubscribe={onSubscribe}
      />
    );
    fireEvent.click(screen.getByText('Subscribe'));
    expect(onSubscribe).toHaveBeenCalledWith('ascendant_monthly');
  });

  it('disables button when disabled prop is true', () => {
    render(
      <SubscriptionCard
        planKey="ascendant_monthly"
        price="$9.99/mo"
        label="Monthly"
        onSubscribe={() => {}}
        disabled
      />
    );
    expect(screen.getByText('Subscribe')).toBeDisabled();
  });
});
