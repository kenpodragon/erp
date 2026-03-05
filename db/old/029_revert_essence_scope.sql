-- Migration 029: Revert to Character-Specific Essence
-- Purpose: Restores character-specific essence balances from the global pool.

-- 1. Restore PlayerEssence from MetaProgression (prioritizing character rows)
UPDATE player_essence pe
SET current_balance = pmp.elysium_essence,
    updated_at = NOW()
FROM player_meta_progression pmp
WHERE pe.player_id = pmp.player_id;

-- 2. Zero out the global pool to reflect that it is no longer the active source for training
UPDATE player_meta_progression SET elysium_essence = 0;
