-- Migration 067: Add paperdoll_layer to gear_slots, armor_class + weapon animation to item_type_bases
-- Depends on: 064 (armor_classes table), 065 (gear_slots), 066 (item_type_bases)

BEGIN;

-- ============================================================
-- Part 1: gear_slots gets paperdoll_layer
-- Maps gear slots to visual z-layers for paperdoll rendering.
-- NULL = stat-only slot (no visual representation).
-- ============================================================

ALTER TABLE gear_slots ADD COLUMN IF NOT EXISTS paperdoll_layer INTEGER;

UPDATE gear_slots SET paperdoll_layer = 1 WHERE name = 'back';
UPDATE gear_slots SET paperdoll_layer = 2 WHERE name IN ('legs', 'feet');
UPDATE gear_slots SET paperdoll_layer = 3 WHERE name IN ('chest', 'waist');
UPDATE gear_slots SET paperdoll_layer = 4 WHERE name = 'hands';
UPDATE gear_slots SET paperdoll_layer = 5 WHERE name = 'shoulders';
UPDATE gear_slots SET paperdoll_layer = 6 WHERE name = 'head';
UPDATE gear_slots SET paperdoll_layer = 7 WHERE name IN ('main_hand', 'off_hand');
-- neck, wrist_1, wrist_2, finger_1, finger_2, trinket stay NULL (stat-only)

-- ============================================================
-- Part 2: item_type_bases gets armor_class_id + weapon animation
-- armor_class_id links armor items to their armor class (cloth/leather/chain/plate).
-- player_attack_animation determines the combat animation type.
-- player_projectile_key references a projectile sprite for ranged attacks.
-- NOTE: The full mapping of all 90 item_type_bases will be handled by the generator tool.
-- ============================================================

ALTER TABLE item_type_bases
    ADD COLUMN IF NOT EXISTS armor_class_id INTEGER REFERENCES armor_classes(id),
    ADD COLUMN IF NOT EXISTS player_attack_animation TEXT,
    ADD COLUMN IF NOT EXISTS player_projectile_key TEXT;

-- Map weapon types to attack animations
UPDATE item_type_bases SET player_attack_animation = 'melee_swing' WHERE code IN ('BLADE', 'SWORD', 'AXE', 'DAGGER', 'KNIFE', 'MACE', 'HAMMER');
UPDATE item_type_bases SET player_attack_animation = 'magic_cast' WHERE code IN ('STAFF', 'WAND', 'ORB');
UPDATE item_type_bases SET player_attack_animation = 'ranged_projectile' WHERE code IN ('BOW', 'CROSSBOW', 'THROWN');

-- Map armor types to armor_classes (based on common item names)
UPDATE item_type_bases SET armor_class_id = (SELECT id FROM armor_classes WHERE code = 'cloth') WHERE code IN ('ROBE', 'TUNIC', 'VEST');
UPDATE item_type_bases SET armor_class_id = (SELECT id FROM armor_classes WHERE code = 'leather') WHERE code IN ('JERKIN', 'HIDE');
UPDATE item_type_bases SET armor_class_id = (SELECT id FROM armor_classes WHERE code = 'chain') WHERE code IN ('CUIRASS', 'MAIL');
UPDATE item_type_bases SET armor_class_id = (SELECT id FROM armor_classes WHERE code = 'plate') WHERE code IN ('BREASTPLATE', 'PLATE');

COMMIT;
