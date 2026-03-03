import { describe, it, expect } from 'vitest';
import { formatNumber, formatGold, upgradeCost, maxAffordable, zoneHp, zoneGold } from './numbers';

describe('formatNumber', () => {
  it('formats values under 1000 as integers', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(42.9)).toBe('42');
  });

  it('formats K suffix', () => {
    expect(formatNumber(1000)).toBe('1.00 K');
    expect(formatNumber(12550)).toBe('12.55 K');
  });

  it('formats M suffix', () => {
    expect(formatNumber(1_500_000)).toBe('1.50 M');
  });

  it('formats B suffix', () => {
    expect(formatNumber(2_300_000_000)).toBe('2.30 B');
  });

  it('formats T suffix', () => {
    expect(formatNumber(1e12)).toBe('1.00 T');
  });

  it('formats Qa suffix', () => {
    expect(formatNumber(1e15)).toBe('1.00 Qa');
  });

  it('handles negative numbers', () => {
    expect(formatNumber(-5000)).toBe('-5.00 K');
  });

  it('returns "0" for NaN/Infinity', () => {
    expect(formatNumber(NaN)).toBe('0');
    expect(formatNumber(Infinity)).toBe('0');
  });
});

describe('formatGold', () => {
  it('shows integers below 1000', () => {
    expect(formatGold(500)).toBe('500');
    expect(formatGold(0)).toBe('0');
  });

  it('delegates to formatNumber above 1000', () => {
    expect(formatGold(2000)).toBe('2.00 K');
  });
});

describe('upgradeCost', () => {
  it('returns base cost at level 0, qty 1', () => {
    const cost = upgradeCost(10, 0, 1);
    expect(cost).toBeCloseTo(10, 0);
  });

  it('scales with 1.07 per level', () => {
    const cost = upgradeCost(10, 1, 1);
    expect(cost).toBe(11); // ceil(10 * 1.07) = 11
  });

  it('sums multiple quantities', () => {
    const costOne = upgradeCost(10, 0, 1);
    const costTwo = upgradeCost(10, 1, 1);
    expect(upgradeCost(10, 0, 2)).toBe(costOne + costTwo);
  });
});

describe('maxAffordable', () => {
  it('returns 0 when gold is 0', () => {
    expect(maxAffordable(10, 0, 0)).toBe(0);
  });

  it('returns correct count for exact gold', () => {
    const gold = upgradeCost(10, 0, 3);
    expect(maxAffordable(10, 0, gold)).toBe(3);
  });

  it('does not exceed what can be bought', () => {
    const n = maxAffordable(10, 0, 100);
    const spent = upgradeCost(10, 0, n);
    expect(spent).toBeLessThanOrEqual(100);
    const spentNext = upgradeCost(10, 0, n + 1);
    expect(spentNext).toBeGreaterThan(100);
  });
});

describe('zoneHp', () => {
  it('calculates HP for zone 1 correctly', () => {
    // 10 * (1.55^0 + 1 - 1) = 10 * 1 = 10
    expect(zoneHp(1)).toBeCloseTo(10, 4);
  });

  it('increases with zone number', () => {
    expect(zoneHp(2)).toBeGreaterThan(zoneHp(1));
    expect(zoneHp(10)).toBeGreaterThan(zoneHp(5));
  });

  it('respects custom scaling factor', () => {
    const hp1 = zoneHp(5, 1.55);
    const hp2 = zoneHp(5, 2.0);
    expect(hp2).toBeGreaterThan(hp1);
  });
});

describe('zoneGold', () => {
  it('uses exponential scaling', () => {
    expect(zoneGold(1)).toBeCloseTo(5, 4);
    expect(zoneGold(10)).toBeGreaterThan(50); // should be around 56.78
  });
});
