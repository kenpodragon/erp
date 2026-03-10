import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PackageCard from './PackageCard';
import type { ShardPackage } from './ShopTab';

const basePackage: ShardPackage = {
  id: 1,
  tier_key: 'starter',
  name: 'Starter Pack',
  price_cents: 499,
  price_display: '$4.99',
  base_shards: 500,
  bonus_pct: 0,
  total_shards: 500,
  is_best_value: false,
  max_purchases: null,
  purchases_remaining: null,
};

describe('PackageCard', () => {
  it('renders package name, shards, and price', () => {
    render(
      <PackageCard
        package_={basePackage}
        firstPurchaseAvailable={false}
        disabled={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('Starter Pack')).toBeTruthy();
    expect(screen.getByText('500')).toBeTruthy();
    expect(screen.getByText('$4.99')).toBeTruthy();
  });

  it('shows bonus badge when bonus_pct > 0', () => {
    const bonusPkg = { ...basePackage, bonus_pct: 20 };

    render(
      <PackageCard
        package_={bonusPkg}
        firstPurchaseAvailable={false}
        disabled={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('+20% Bonus')).toBeTruthy();
  });

  it('does not show bonus badge when bonus_pct is 0', () => {
    render(
      <PackageCard
        package_={basePackage}
        firstPurchaseAvailable={false}
        disabled={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.queryByText(/Bonus/)).toBeNull();
  });

  it('shows "BEST VALUE" badge when is_best_value', () => {
    const bestPkg = { ...basePackage, is_best_value: true };

    render(
      <PackageCard
        package_={bestPkg}
        firstPurchaseAvailable={false}
        disabled={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('BEST VALUE')).toBeTruthy();
  });

  it('shows "2x SHARDS!" when firstPurchaseAvailable', () => {
    render(
      <PackageCard
        package_={basePackage}
        firstPurchaseAvailable={true}
        disabled={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('2x SHARDS!')).toBeTruthy();
    // Should show doubled shards (500 * 2 = 1,000)
    expect(screen.getByText('1,000')).toBeTruthy();
  });

  it('shows remaining count for limited packages', () => {
    const limitedPkg = { ...basePackage, max_purchases: 3, purchases_remaining: 2 };

    render(
      <PackageCard
        package_={limitedPkg}
        firstPurchaseAvailable={false}
        disabled={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('2 remaining')).toBeTruthy();
  });

  it('shows "Sold Out" when purchases_remaining is 0', () => {
    const soldOutPkg = { ...basePackage, max_purchases: 1, purchases_remaining: 0 };

    render(
      <PackageCard
        package_={soldOutPkg}
        firstPurchaseAvailable={false}
        disabled={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('Sold Out')).toBeTruthy();
  });

  it('applies disabled styling when disabled prop is true', () => {
    const onClick = vi.fn();

    const { container } = render(
      <PackageCard
        package_={basePackage}
        firstPurchaseAvailable={false}
        disabled={true}
        onClick={onClick}
      />
    );

    const card = container.querySelector('.package-card');
    expect(card?.className).toContain('disabled');

    fireEvent.click(card!);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('calls onClick when clicked and not disabled', () => {
    const onClick = vi.fn();

    const { container } = render(
      <PackageCard
        package_={basePackage}
        firstPurchaseAvailable={false}
        disabled={false}
        onClick={onClick}
      />
    );

    const card = container.querySelector('.package-card');
    fireEvent.click(card!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClick on Enter key when not disabled', () => {
    const onClick = vi.fn();

    const { container } = render(
      <PackageCard
        package_={basePackage}
        firstPurchaseAvailable={false}
        disabled={false}
        onClick={onClick}
      />
    );

    const card = container.querySelector('.package-card');
    fireEvent.keyDown(card!, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
