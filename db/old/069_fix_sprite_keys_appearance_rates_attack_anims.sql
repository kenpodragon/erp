-- Migration 069: Fix sprite key mapping, appearance rate diversity, and attack animation types
-- Applied directly to DB on 2026-03-25; this file records the changes for reproducibility.

-- ============================================================
-- Fix 1: Sprite Key Mapping (SPR.A2/A3)
-- Update 3,300 entity_gameplay_data.sprite_key values from 'entity_sprite_XXXX'
-- to match actual asset_registry keys (pattern: spr_{slug}_{entity_id})
-- ============================================================
UPDATE entity_gameplay_data egd
SET sprite_key = ar.asset_key
FROM asset_registry ar
WHERE ar.category = 'entity_sprite'
  AND ar.asset_key ~ ('_' || egd.entity_id::text || '$')
  AND ar.asset_key LIKE 'spr_%'
  AND egd.sprite_key LIKE 'entity_sprite_%';

-- ============================================================
-- Fix 2: Appearance Rate Diversity (EGD.A5)
-- Boss entities (appearing in chapter_boss/book_boss scenes) get 0.15
-- Non-boss entities get diverse rates 0.3-1.0 based on entity_id % 8
-- ============================================================
UPDATE entity_gameplay_data egd SET appearance_rate = 0.15
FROM entity_scene_appearances esa
JOIN scenes s ON esa.scene_id = s.id
WHERE s.scene_type IN ('chapter_boss', 'book_boss')
  AND esa.entity_id = egd.entity_id;

UPDATE entity_gameplay_data SET appearance_rate =
  ROUND((0.3 + (entity_id % 8) * 0.1)::numeric, 2)
WHERE entity_id NOT IN (
    SELECT DISTINCT esa.entity_id
    FROM entity_scene_appearances esa
    JOIN scenes s ON esa.scene_id = s.id
    WHERE s.scene_type IN ('chapter_boss', 'book_boss')
);

-- ============================================================
-- Fix 3: Attack Animation Types (ATK.7)
-- Each of the 13 attack types now has a unique, thematically appropriate animation
-- ============================================================
UPDATE attack_types SET attack_animation_type = 'melee_swing'       WHERE id = 1;  -- melee
UPDATE attack_types SET attack_animation_type = 'ranged_shot'       WHERE id = 2;  -- ranged
UPDATE attack_types SET attack_animation_type = 'magic_beam'        WHERE id = 3;  -- akashic
UPDATE attack_types SET attack_animation_type = 'ranged_volley'     WHERE id = 4;  -- aerial
UPDATE attack_types SET attack_animation_type = 'magic_burst'       WHERE id = 5;  -- psychic
UPDATE attack_types SET attack_animation_type = 'swarm_cloud'       WHERE id = 6;  -- nanite
UPDATE attack_types SET attack_animation_type = 'phase_shift'       WHERE id = 7;  -- phase
UPDATE attack_types SET attack_animation_type = 'void_pulse'        WHERE id = 8;  -- void
UPDATE attack_types SET attack_animation_type = 'resonance_wave'    WHERE id = 9;  -- resonance
UPDATE attack_types SET attack_animation_type = 'construct_slam'    WHERE id = 10; -- construct
UPDATE attack_types SET attack_animation_type = 'thermal_blast'     WHERE id = 11; -- thermal
UPDATE attack_types SET attack_animation_type = 'gravity_crush'     WHERE id = 12; -- gravitic
UPDATE attack_types SET attack_animation_type = 'corruption_drain'  WHERE id = 13; -- corruption
