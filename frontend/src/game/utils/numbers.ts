/**
 * Large number formatting utilities for Story Mode.
 *
 * Display rule: show 2 decimal places for suffixed numbers (e.g. "12.55 Qa").
 * Suffix order: K, M, B, T, Qa, Qi, Sx, Sp, Oc, No, then aa, ab … zz.
 */

const SUFFIXES = [
  '', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
  'aa', 'ab', 'ac', 'ad', 'ae', 'af', 'ag', 'ah', 'ai', 'aj', 'ak', 'al', 'am',
  'an', 'ao', 'ap', 'aq', 'ar', 'as', 'at', 'au', 'av', 'aw', 'ax', 'ay', 'az',
  'ba', 'bb', 'bc', 'bd', 'be', 'bf', 'bg', 'bh', 'bi', 'bj', 'bk', 'bl', 'bm',
  'bn', 'bo', 'bp', 'bq', 'br', 'bs', 'bt', 'bu', 'bv', 'bw', 'bx', 'by', 'bz'
];

/** Standard human-readable large number formatting. */
export function formatNumber(n: number): string {
  if (n < 1000) return Math.floor(n).toString();
  
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier === 0) return Math.floor(n).toString();

  const suffix = SUFFIXES[tier] || `e${tier * 3}`;
  const scale = Math.pow(10, tier * 3);
  const scaled = n / scale;

  return scaled.toFixed(2) + ' ' + suffix;
}

/** Gold specific formatting (no decimals if possible). */
export function formatGold(n: number): string {
  if (n < 10000) return Math.floor(n).toString();
  return formatNumber(n);
}

/**
 * Geometric series cost for 'count' upgrades.
 * Formula: base × (scaling^level) × (scaling^count - 1) / (scaling - 1)
 */
export function upgradeCost(base: number, currentLevel: number, count: number, scaling = 1.07): number {
  if (count <= 0) return 0;
  const cost = base * Math.pow(scaling, currentLevel) * (Math.pow(scaling, count) - 1) / (scaling - 1);
  return Math.ceil(cost);
}

/**
 * Max affordable units of an upgrade.
 * Formula: floor( log_scaling( (Gold × (scaling - 1) / (base × scaling^level)) + 1 ) )
 */
export function maxAffordable(base: number, currentLevel: number, gold: number, scaling = 1.07): number {
  if (gold < base * Math.pow(scaling, currentLevel)) return 0;
  const num = (gold * (scaling - 1)) / (base * Math.pow(scaling, currentLevel)) + 1;
  return Math.floor(Math.log(num) / Math.log(scaling));
}

/** HP for a monster at a given zone. */
export function zoneHp(zone: number, scalingFactor = 1.55): number {
  return 10 * (Math.pow(scalingFactor, zone - 1) + zone - 1);
}
/** Gold per monster kill at a given zone. */
export function zoneGold(zone: number): number {
  return zone * 5;
}

/** 
 * Calculate flat damage contribution from upgrade level.
 * Logic: 1 damage per level.
 */
export function calculateUpgradeDamage(level: number): number {
  return level;
}

/** 
 * Calculate damage multiplier based on track level. 
...
 * Includes base multiplier (1 + level * step) and milestone bonuses.
 * Milestone: 4x every 25 levels starting at 200.
 * Grand Milestone: 10x every 1000 levels.
 */
export function calculateDmgMultiplier(level: number, step = 0.05, mStart = 200, mInterval = 25): number {
  // Base linear multiplier
  let mult = 1.0 + (level * step);
  
  // 4x bonus every milestone_interval levels starting at milestone_start
  if (level >= mStart) {
    const milestones = Math.floor((level - (mStart - mInterval)) / mInterval);
    mult *= Math.pow(4, milestones);
  }
  
  // 10x bonus every 1000 levels
  const grandMilestones = Math.floor(level / 1000);
  mult *= Math.pow(10, grandMilestones);
  
  return mult;
}
