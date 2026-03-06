import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import GoldOdometer from './GoldOdometer';

describe('GoldOdometer', () => {
  it('renders gold value below 1000 as integer', () => {
    render(<GoldOdometer gold={500} />);
    expect(screen.getByText('500')).toBeDefined();
  });

  it('renders formatted gold for values >= 1000', () => {
    render(<GoldOdometer gold={5000} />);
    expect(screen.getByText('5.00 K')).toBeDefined();
  });

  it('renders the gold star icon', () => {
    const { container } = render(<GoldOdometer gold={0} />);
    expect(container.querySelector('.gold-icon')).not.toBeNull();
  });

  it('starts without the roll animation class', () => {
    const { container } = render(<GoldOdometer gold={100} />);
    const valueEl = container.querySelector('.gold-value');
    expect(valueEl?.classList.contains('gold-value--roll')).toBe(false);
  });

  it('applies CPS warning class when cpsValid is false', () => {
    const { container } = render(<GoldOdometer gold={100} cpsValid={false} />);
    const wrapper = container.querySelector('.gold-odometer');
    expect(wrapper?.classList.contains('gold-odometer--cps-warning')).toBe(true);
  });

  it('does not apply CPS warning class when cpsValid is true', () => {
    const { container } = render(<GoldOdometer gold={100} cpsValid={true} />);
    const wrapper = container.querySelector('.gold-odometer');
    expect(wrapper?.classList.contains('gold-odometer--cps-warning')).toBe(false);
  });

  it('does not apply CPS warning class by default (cpsValid omitted)', () => {
    const { container } = render(<GoldOdometer gold={100} />);
    const wrapper = container.querySelector('.gold-odometer');
    expect(wrapper?.classList.contains('gold-odometer--cps-warning')).toBe(false);
  });

  // 2.6.0: reduce-motion tests
  it('renders instant value when reduceMotion is true', () => {
    render(<GoldOdometer gold={999} reduceMotion={true} />);
    expect(screen.getByText('999')).toBeDefined();
  });

  it('does not show flyout delta when reduceMotion is true', () => {
    const { container, rerender } = render(<GoldOdometer gold={100} reduceMotion={true} />);
    rerender(<GoldOdometer gold={200} reduceMotion={true} />);
    const flyout = container.querySelector('.gold-delta-flyout');
    expect(flyout).toBeNull();
  });
});
