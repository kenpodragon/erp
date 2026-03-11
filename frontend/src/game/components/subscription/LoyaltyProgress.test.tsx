import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoyaltyProgress } from './LoyaltyProgress';

describe('LoyaltyProgress', () => {
  it('renders heading and both tracks', () => {
    render(<LoyaltyProgress streak={0} cumulative={0} />);
    expect(screen.getByText('Loyalty Progress')).toBeTruthy();
    expect(screen.getByText('Streak Bonuses')).toBeTruthy();
    expect(screen.getByText('Lifetime Titles')).toBeTruthy();
  });

  it('renders streak milestone labels', () => {
    render(<LoyaltyProgress streak={0} cumulative={0} />);
    expect(screen.getByText('3mo')).toBeTruthy();
    // 6mo, 12mo appear in both tracks, so use getAllByText
    expect(screen.getAllByText('6mo').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('12mo').length).toBeGreaterThanOrEqual(1);
  });

  it('marks earned streak milestones', () => {
    const { container } = render(<LoyaltyProgress streak={6} cumulative={0} />);
    const earned = container.querySelectorAll('.loyalty-earned');
    // streak=6 should earn 3mo and 6mo = 2 streak nodes
    expect(earned.length).toBeGreaterThanOrEqual(2);
  });

  it('marks earned cumulative milestones', () => {
    const { container } = render(<LoyaltyProgress streak={0} cumulative={12} />);
    const earned = container.querySelectorAll('.loyalty-earned');
    // cumulative=12 should earn 1mo, 6mo, 12mo = 3 cumulative nodes
    expect(earned.length).toBeGreaterThanOrEqual(3);
  });

  it('displays title names for cumulative milestones', () => {
    render(<LoyaltyProgress streak={0} cumulative={0} />);
    expect(screen.getByText('the Patron')).toBeTruthy();
    expect(screen.getByText('the Devoted')).toBeTruthy();
    expect(screen.getByText('Elysium Incarnate')).toBeTruthy();
  });
});
