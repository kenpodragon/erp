/**
 * Effect Handler Map — maps skill effect_type strings to client-side handlers.
 *
 * Each handler receives the effect parameters (from benefit_effect_data or
 * idle_level_scaling interpolation) and applies the effect to the combat state.
 *
 * Adding a new effect type:
 *   1. Add a handler function below
 *   2. Register it in EFFECT_HANDLERS
 *   3. The backend must return the effect_type string in the skill tree response
 */

export interface EffectContext {
  /** Current click damage per click */
  clickDamage: number;
  /** Current auto DPS */
  autoDps: number;
  /** Current gold multiplier */
  goldMultiplier: number;
  /** Current crit chance (0-1) */
  critChance: number;
  /** Current crit multiplier */
  critMultiplier: number;
  /** Current damage reduction (0-1) */
  damageReduction: number;
}

export interface EffectResult {
  clickDamageBonus?: number;
  autoDpsBonus?: number;
  goldMultiplierBonus?: number;
  critChanceBonus?: number;
  critMultiplierBonus?: number;
  damageReductionBonus?: number;
  /** One-shot AOE damage to all enemies */
  aoeDamage?: number;
  /** Temporary all-damage multiplier */
  damageMultiplier?: number;
}

type EffectHandler = (
  params: Record<string, number>,
  context: EffectContext,
) => EffectResult;

// --- Handler implementations ---

const handleClickDmgBoost: EffectHandler = (params) => ({
  clickDamageBonus: params.click_damage_bonus || 0,
});

const handleAutoDpsBoost: EffectHandler = (params) => ({
  autoDpsBonus: params.auto_dps_bonus || 0,
});

const handleGoldBoost: EffectHandler = (params) => ({
  goldMultiplierBonus: params.gold_multiplier_bonus || 0,
});

const handleCritBoost: EffectHandler = (params) => ({
  critChanceBonus: (params.crit_bonus_pct || 0) / 100,
});

const handleCooldownReset: EffectHandler = () => ({
  // Cooldown reset is handled at the hotbar level, not via stat bonuses
});

const handleDamageReduction: EffectHandler = (params) => ({
  damageReductionBonus: (params.damage_reduction_pct || 0) / 100,
});

const handleAoeBurst: EffectHandler = (params, context) => ({
  aoeDamage: (params.aoe_damage_multiplier || 1) * context.clickDamage,
});

const handleDamageMultiplier: EffectHandler = (params) => ({
  damageMultiplier: params.damage_multiplier || 1,
});

const handleDarkRitual: EffectHandler = (params) => ({
  damageMultiplier: params.dark_ritual_multiplier || 1.05,
});

// --- Registry ---

export const EFFECT_HANDLERS: Record<string, EffectHandler> = {
  click_dmg_boost: handleClickDmgBoost,
  auto_dps_boost: handleAutoDpsBoost,
  gold_boost: handleGoldBoost,
  crit_boost: handleCritBoost,
  cooldown_reset: handleCooldownReset,
  damage_reduction: handleDamageReduction,
  aoe_burst: handleAoeBurst,
  damage_multiplier: handleDamageMultiplier,
  dark_ritual: handleDarkRitual,
};

/**
 * Apply an effect by type string and parameters.
 * Returns the computed effect result, or null if the effect type is unknown.
 */
export function applyEffect(
  effectType: string,
  params: Record<string, number>,
  context: EffectContext,
): EffectResult | null {
  const handler = EFFECT_HANDLERS[effectType];
  if (!handler) {
    console.warn(`Unknown effect type: ${effectType}`);
    return null;
  }
  return handler(params, context);
}
