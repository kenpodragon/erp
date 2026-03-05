-- Migration 028: Merge Legacy Character Essence into Elysium Essence
-- Purpose: Moves existing character-specific essence balances into the global meta-progression pool.

-- 1. Update PlayerMetaProgression with the sum of character essence
UPDATE player_meta_progression pmp
SET elysium_essence = pmp.elysium_essence + (
    SELECT COALESCE(SUM(pe.current_balance), 0)
    FROM player_essence pe
    WHERE pe.player_id = pmp.player_id
),
total_essence_earned = pmp.total_essence_earned + (
    SELECT COALESCE(SUM(pe.current_balance), 0)
    FROM player_essence pe
    WHERE pe.player_id = pmp.player_id
),
updated_at = NOW()
WHERE EXISTS (
    SELECT 1 FROM player_essence pe WHERE pe.player_id = pmp.player_id
);

-- 2. Insert new MetaProgression rows for players who have essence but no meta row yet
INSERT INTO player_meta_progression (player_id, elysium_essence, total_essence_earned, spent_essence, updated_at)
SELECT pe.player_id, SUM(pe.current_balance), SUM(pe.current_balance), 0, NOW()
FROM player_essence pe
LEFT JOIN player_meta_progression pmp ON pe.player_id = pmp.player_id
WHERE pmp.player_id IS NULL
GROUP BY pe.player_id;

-- 3. Zero out the legacy table to prevent double-migration (but keep table for now just in case)
UPDATE player_essence SET current_balance = 0;
