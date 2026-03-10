import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PurchaseConfirmModal from './PurchaseConfirmModal';
import type { ShardPackage } from './ShopTab';

const mockPackage: ShardPackage = {
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

describe('PurchaseConfirmModal', () => {
  it('renders package details', () => {
    render(
      <PurchaseConfirmModal
        package_={mockPackage}
        firstPurchaseAvailable={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Confirm Purchase')).toBeTruthy();
    expect(screen.getByText('Starter Pack')).toBeTruthy();
    expect(screen.getByText('$4.99')).toBeTruthy();
    expect(screen.getByText('500')).toBeTruthy();
  });

  it('shows 2x bonus text when firstPurchaseAvailable', () => {
    render(
      <PurchaseConfirmModal
        package_={mockPackage}
        firstPurchaseAvailable={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Includes 2x first-purchase bonus!')).toBeTruthy();
    // Should show doubled shards (500 * 2 = 1,000)
    expect(screen.getByText('1,000')).toBeTruthy();
  });

  it('does not show 2x bonus text when firstPurchaseAvailable is false', () => {
    render(
      <PurchaseConfirmModal
        package_={mockPackage}
        firstPurchaseAvailable={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.queryByText(/first-purchase bonus/)).toBeNull();
  });

  it('calls onConfirm when "Proceed to Payment" clicked', () => {
    const onConfirm = vi.fn();

    render(
      <PurchaseConfirmModal
        package_={mockPackage}
        firstPurchaseAvailable={false}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Proceed to Payment'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when "Cancel" clicked', () => {
    const onCancel = vi.fn();

    render(
      <PurchaseConfirmModal
        package_={mockPackage}
        firstPurchaseAvailable={false}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when overlay is clicked', () => {
    const onCancel = vi.fn();

    const { container } = render(
      <PurchaseConfirmModal
        package_={mockPackage}
        firstPurchaseAvailable={false}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    const overlay = container.querySelector('.pcm-overlay');
    fireEvent.click(overlay!);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows age disclaimer', () => {
    render(
      <PurchaseConfirmModal
        package_={mockPackage}
        firstPurchaseAvailable={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('You must be 18 or older to make purchases.')).toBeTruthy();
    expect(screen.getByText(/All purchases are final/)).toBeTruthy();
  });
});
