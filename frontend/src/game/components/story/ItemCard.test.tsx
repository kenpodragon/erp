import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ItemCard from './ItemCard';
import type { ItemData } from './ItemCard';

const baseItem: ItemData = {
  item_id: 1,
  inventory_id: 10,
  name: 'Arcane Pristine Veiled Blade of Shadows',
  rarity: 'rare',
  item_type: 'Blade',
  base_stats: { STR: 15, AGI: 8 },
  item_code: 'ARC_PRI_VEI_BLD_SHA',
  item_level: 5,
  min_char_level: 3,
  stat_requirements: { STR: 5 },
  gear_slot_id: 1,
  is_equipped: false,
  meets_requirements: true,
};

describe('ItemCard', () => {
  it('renders item name and rarity', () => {
    render(<ItemCard item={baseItem} />);
    expect(screen.getByText(baseItem.name)).toBeDefined();
    expect(screen.getByText('Rare')).toBeDefined();
  });

  it('renders item type and level', () => {
    render(<ItemCard item={baseItem} />);
    expect(screen.getByText(/Blade · Lv\.5/)).toBeDefined();
  });

  it('renders stat values', () => {
    render(<ItemCard item={baseItem} />);
    expect(screen.getByText('STR')).toBeDefined();
    expect(screen.getByText('+15')).toBeDefined();
    expect(screen.getByText('AGI')).toBeDefined();
    expect(screen.getByText('+8')).toBeDefined();
  });

  it('applies rarity border class', () => {
    const { container } = render(<ItemCard item={baseItem} />);
    expect(container.querySelector('.item-card--rare')).not.toBeNull();
  });

  it('shows requirement overlay when requirements not met', () => {
    const lockedItem = { ...baseItem, meets_requirements: false };
    const { container } = render(<ItemCard item={lockedItem} />);
    expect(container.querySelector('.item-card-req-overlay')).not.toBeNull();
    expect(screen.getByText('REQUIRES')).toBeDefined();
  });

  it('hides requirement overlay when requirements met', () => {
    const { container } = render(<ItemCard item={baseItem} />);
    expect(container.querySelector('.item-card-req-overlay')).toBeNull();
  });

  it('shows EQUIPPED badge when equipped', () => {
    const equipped = { ...baseItem, is_equipped: true };
    render(<ItemCard item={equipped} />);
    expect(screen.getByText('EQUIPPED')).toBeDefined();
  });

  it('applies selected class when selected', () => {
    const { container } = render(<ItemCard item={baseItem} selected />);
    expect(container.querySelector('.item-card--selected')).not.toBeNull();
  });

  it('fires onClick', () => {
    const onClick = vi.fn();
    render(<ItemCard item={baseItem} onClick={onClick} />);
    fireEvent.click(screen.getByText(baseItem.name));
    expect(onClick).toHaveBeenCalled();
  });

  it('hides stats in compact mode', () => {
    render(<ItemCard item={baseItem} compact />);
    expect(screen.queryByText('+15')).toBeNull();
  });

  it('renders cosmic rarity with correct class', () => {
    const cosmic = { ...baseItem, rarity: 'cosmic' };
    const { container } = render(<ItemCard item={cosmic} />);
    expect(container.querySelector('.item-card--cosmic')).not.toBeNull();
    expect(screen.getByText('Cosmic')).toBeDefined();
  });
});
