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
});
