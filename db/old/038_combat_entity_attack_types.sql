-- Migration 038: Combat Entity Attack Type Assignments
-- Assigns lore-appropriate attack types to the 4 combat entities (entity_type='enemy')
-- - Regular enemies: 1 attack type
-- - Miniboss (Rust Guardian): 3 attack types
-- - Boss (Cosmic Remnant): 5 attack types
-- Also re-adds 4 original benefit effects that were missing from the DB

BEGIN;

-- =============================================================================
-- 1. COMBAT ENTITY ATTACK TYPE ASSIGNMENTS
-- =============================================================================

-- Sludge Stalker (id=8, regular enemy, HP:100) — physical sludge creature
INSERT INTO entity_attack_types (entity_id, attack_type_id, is_primary)
SELECT 8, id, TRUE FROM attack_types WHERE name = 'melee'
ON CONFLICT (entity_id, attack_type_id) DO NOTHING;

-- Ether Voidling (id=9, regular enemy, HP:50) — ethereal void creature
INSERT INTO entity_attack_types (entity_id, attack_type_id, is_primary)
SELECT 9, id, TRUE FROM attack_types WHERE name = 'void'
ON CONFLICT (entity_id, attack_type_id) DO NOTHING;

-- Rust Guardian (id=10, miniboss, HP:300) — mechanical guardian, 3 attack types
INSERT INTO entity_attack_types (entity_id, attack_type_id, is_primary)
SELECT 10, id, TRUE FROM attack_types WHERE name = 'melee'
ON CONFLICT (entity_id, attack_type_id) DO NOTHING;

INSERT INTO entity_attack_types (entity_id, attack_type_id, is_primary)
SELECT 10, id, FALSE FROM attack_types WHERE name = 'construct'
ON CONFLICT (entity_id, attack_type_id) DO NOTHING;

INSERT INTO entity_attack_types (entity_id, attack_type_id, is_primary)
SELECT 10, id, FALSE FROM attack_types WHERE name = 'thermal'
ON CONFLICT (entity_id, attack_type_id) DO NOTHING;

-- Cosmic Remnant (id=11, boss, HP:200, Gold:50) — cosmic entity, 5 attack types
INSERT INTO entity_attack_types (entity_id, attack_type_id, is_primary)
SELECT 11, id, TRUE FROM attack_types WHERE name = 'akashic'
ON CONFLICT (entity_id, attack_type_id) DO NOTHING;

INSERT INTO entity_attack_types (entity_id, attack_type_id, is_primary)
SELECT 11, id, FALSE FROM attack_types WHERE name = 'void'
ON CONFLICT (entity_id, attack_type_id) DO NOTHING;

INSERT INTO entity_attack_types (entity_id, attack_type_id, is_primary)
SELECT 11, id, FALSE FROM attack_types WHERE name = 'gravitic'
ON CONFLICT (entity_id, attack_type_id) DO NOTHING;

INSERT INTO entity_attack_types (entity_id, attack_type_id, is_primary)
SELECT 11, id, FALSE FROM attack_types WHERE name = 'psychic'
ON CONFLICT (entity_id, attack_type_id) DO NOTHING;

INSERT INTO entity_attack_types (entity_id, attack_type_id, is_primary)
SELECT 11, id, FALSE FROM attack_types WHERE name = 'corruption'
ON CONFLICT (entity_id, attack_type_id) DO NOTHING;

-- =============================================================================
-- 2. RE-ADD MISSING BENEFIT EFFECTS (original 4 from migration 002)
-- =============================================================================
-- These were removed from the DB at some point but are referenced by gameplay code

INSERT INTO benefit_effect_data (effect_key, display_name, description, value_type, min_value, max_value, category)
VALUES
    ('golden_click_pct', 'Golden Click', 'Percentage of gold earned per click as bonus gold.', 'percentage', 0.01, 0.10, 'economy'),
    ('dark_ritual_multiplier', 'Dark Ritual', 'Chapter-wide persistent damage multiplier from Dark Ritual.', 'multiplier', 1.5, 5.0, 'combat'),
    ('energize_multiplier', 'Energize', 'Temporary damage multiplier from Energize skill activation.', 'multiplier', 1.5, 3.0, 'combat'),
    ('reload_pct', 'Reload', 'Percentage of max cooldown instantly recovered on skill use.', 'percentage', 0.10, 0.50, 'utility')
ON CONFLICT (effect_key) DO NOTHING;

COMMIT;
