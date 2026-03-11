import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BoostDisplay } from './BoostDisplay';

const baseBoosts = {
  xp: 1.15,
  essence: 1.15,
  drop_rate: 1.10,
  training_speed: 1.10,
  stipend_shards: 150,
  is_ascendant: true,
  continuous_streak: 0,
  cumulative_months: 1,
};

describe('BoostDisplay', () => {
  it('renders heading and all boost rows', () => {
    render(<BoostDisplay boosts={baseBoosts} />);
    expect(screen.getByText('Active Boosts')).toBeTruthy();
    expect(screen.getByText('XP')).toBeTruthy();
    expect(screen.getByText('Essence')).toBeTruthy();
    expect(screen.getByText('Drop Rate')).toBeTruthy();
    expect(screen.getByText('Training Speed')).toBeTruthy();
    expect(screen.getByText('Monthly Shards')).toBeTruthy();
  });

  it('displays formatted multiplier values', () => {
    render(<BoostDisplay boosts={baseBoosts} />);
    // XP and Essence both show 1.15x; Drop Rate and Training both show 1.10x
    expect(screen.getAllByText('1.15x').length).toBe(2);
    expect(screen.getAllByText('1.10x').length).toBe(2);
    expect(screen.getByText('150')).toBeTruthy();
  });

  it('shows streak bonus when present', () => {
    const boosts = { ...baseBoosts, xp: 1.25 };
    render(<BoostDisplay boosts={boosts} />);
    expect(screen.getByText('+10% streak')).toBeTruthy();
  });
});
