import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BoosterPanel from './BoosterPanel';
import type { ShopItemData } from './ShopItemCard';
import type { ActiveBooster } from '../../GameContext';

const makeBoosterItem = (overrides: Partial<ShopItemData> = {}): ShopItemData => ({
  id: 1,
  name: 'XP Boost 1h',
  description: '1.5x XP for 1 hour',
  price_shards: 100,
  icon_asset_key: 'boost_xp',
  category: 'booster',
  item_metadata: {
    boost_type: 'xp',
    magnitude: 1.5,
    duration_seconds: 3600,
  },
  ...overrides,
});

const makeActiveBooster = (overrides: Partial<ActiveBooster> = {}): ActiveBooster => ({
  boostType: 'xp',
  magnitude: 1.5,
  remainingSeconds: 1800,
  durationSeconds: 3600,
  activatedAt: new Date().toISOString(),
  ...overrides,
});

describe('BoosterPanel', () => {
  it('renders nothing when no booster items', () => {
    const { container } = render(
      <BoosterPanel boosterItems={[]} activeBoosters={[]} balance={1000} onPurchase={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders booster type sections grouped by boost_type', () => {
    const items = [
      makeBoosterItem({ id: 1, item_metadata: { boost_type: 'xp', magnitude: 1.5, duration_seconds: 3600 } }),
      makeBoosterItem({ id: 2, name: 'Essence Boost', item_metadata: { boost_type: 'essence', magnitude: 1.3, duration_seconds: 7200 } }),
    ];

    render(<BoosterPanel boosterItems={items} activeBoosters={[]} balance={1000} onPurchase={vi.fn()} />);

    expect(screen.getByText('XP Boost')).toBeDefined();
    expect(screen.getByText('Essence Boost')).toBeDefined();
  });

  it('shows active badge with magnitude and countdown when booster is active', () => {
    const items = [makeBoosterItem()];
    const active = [makeActiveBooster({ remainingSeconds: 1800 })];

    render(<BoosterPanel boosterItems={items} activeBoosters={active} balance={1000} onPurchase={vi.fn()} />);

    // Should show "1.5x · 30m 0s" or similar
    const badge = document.querySelector('.booster-active-badge');
    expect(badge).toBeDefined();
    expect(badge?.textContent).toContain('1.5x');
    expect(badge?.textContent).toContain('30m');
  });

  it('calls onPurchase when booster option button is clicked', () => {
    const onPurchase = vi.fn();
    const items = [makeBoosterItem()];

    render(<BoosterPanel boosterItems={items} activeBoosters={[]} balance={1000} onPurchase={onPurchase} />);

    const btn = document.querySelector('.booster-option-btn');
    expect(btn).toBeDefined();
    fireEvent.click(btn!);
    expect(onPurchase).toHaveBeenCalledWith(items[0]);
  });

  it('marks button as cant-afford when balance is insufficient', () => {
    const items = [makeBoosterItem({ price_shards: 500 })];

    render(<BoosterPanel boosterItems={items} activeBoosters={[]} balance={100} onPurchase={vi.fn()} />);

    const btn = document.querySelector('.booster-option-btn');
    expect(btn?.className).toContain('cant-afford');
  });

  it('does not mark button as cant-afford when balance is sufficient', () => {
    const items = [makeBoosterItem({ price_shards: 100 })];

    render(<BoosterPanel boosterItems={items} activeBoosters={[]} balance={1000} onPurchase={vi.fn()} />);

    const btn = document.querySelector('.booster-option-btn');
    expect(btn?.className).not.toContain('cant-afford');
  });

  it('shows extension state when purchasing while booster is active', () => {
    // When an active booster exists of the same type, the badge shows remaining time
    // Purchasing extends the duration (handled by backend), but the UI should show
    // that a booster is already active for that type
    const items = [makeBoosterItem()];
    const active = [makeActiveBooster({ remainingSeconds: 600 })]; // 10 minutes left

    render(<BoosterPanel boosterItems={items} activeBoosters={active} balance={1000} onPurchase={vi.fn()} />);

    const badge = document.querySelector('.booster-active-badge');
    expect(badge).toBeDefined();
    expect(badge?.textContent).toContain('1.5x');
    // Badge shows remaining time — purchasing would extend this
    expect(badge?.textContent).toContain('10m');
  });
});
