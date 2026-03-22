-- Migration 061: Seed entity_gameplay_data for all entities
-- Provides base_hp, base_gold, and sprite_key based on entity type tiers.
-- Scene progression scaling (scene_hp_scaling_base in game_configs) applies on top.
-- Also adds max_scene_base_hp game_config for safety capping.
--
-- Base HP tiers (before scene scaling):
--   environment:    5-10   (background elements)
--   object:         8-15   (inanimate things)
--   event:          8-15   (abstract events)
--   manifestation: 10-25   (ethereal, moderate)
--   other:         10-30   (catch-all)
--   character:     15-35   (people, varied)
--   creature:      20-50   (monsters, core combat)
--   group:         30-60   (packs/organizations)
--   enemy:         40-80   (dedicated enemies, hardest)
--
-- Gold tiers scale similarly but at ~40% of HP ratio.
-- Sprite keys are type-based defaults until real sprites are created.
-- Uses deterministic seeding: hash of entity_id for reproducible variation within range.

BEGIN;

-- Seed entity_gameplay_data for all entities that don't already have a row.
-- Uses entity_type to determine base_hp/base_gold tier with per-entity variation
-- via modulo on entity_id for deterministic spread within the range.
INSERT INTO entity_gameplay_data (entity_id, base_hp, base_gold, sprite_key)
SELECT
    e.id,
    -- base_hp: tier range based on entity type, varied by entity_id
    CASE et.name
        WHEN 'environment'    THEN 5  + (e.id % 6)        -- 5-10
        WHEN 'object'         THEN 8  + (e.id % 8)        -- 8-15
        WHEN 'event'          THEN 8  + (e.id % 8)        -- 8-15
        WHEN 'manifestation'  THEN 10 + (e.id % 16)       -- 10-25
        WHEN 'other'          THEN 10 + (e.id % 21)       -- 10-30
        WHEN 'character'      THEN 15 + (e.id % 21)       -- 15-35
        WHEN 'creature'       THEN 20 + (e.id % 31)       -- 20-50
        WHEN 'group'          THEN 30 + (e.id % 31)       -- 30-60
        WHEN 'enemy'          THEN 40 + (e.id % 41)       -- 40-80
        ELSE                       10 + (e.id % 16)       -- 10-25 fallback
    END,
    -- base_gold: ~40% of HP tier ratio
    CASE et.name
        WHEN 'environment'    THEN 2  + (e.id % 3)        -- 2-4
        WHEN 'object'         THEN 3  + (e.id % 4)        -- 3-6
        WHEN 'event'          THEN 3  + (e.id % 4)        -- 3-6
        WHEN 'manifestation'  THEN 4  + (e.id % 7)        -- 4-10
        WHEN 'other'          THEN 4  + (e.id % 9)        -- 4-12
        WHEN 'character'      THEN 6  + (e.id % 9)        -- 6-14
        WHEN 'creature'       THEN 8  + (e.id % 13)       -- 8-20
        WHEN 'group'          THEN 12 + (e.id % 13)       -- 12-24
        WHEN 'enemy'          THEN 16 + (e.id % 17)       -- 16-32
        ELSE                       4  + (e.id % 7)        -- 4-10 fallback
    END,
    -- sprite_key: type-based default
    CASE et.name
        WHEN 'environment'    THEN 'enemy_environment'
        WHEN 'object'         THEN 'enemy_object'
        WHEN 'event'          THEN 'enemy_event'
        WHEN 'manifestation'  THEN 'enemy_manifestation'
        WHEN 'character'      THEN 'enemy_character'
        WHEN 'creature'       THEN 'enemy_creature'
        WHEN 'group'          THEN 'enemy_group'
        WHEN 'enemy'          THEN 'enemy_hostile'
        ELSE                       'enemy_default'
    END
FROM entities e
JOIN entity_types et ON et.id = e.entity_type_id
WHERE NOT EXISTS (
    SELECT 1 FROM entity_gameplay_data egd WHERE egd.entity_id = e.id
);

-- Add max_scene_base_hp game_config for safety capping
-- Cap = this value * scene_hp_multiplier. At scene 1: cap=500, scene 580: cap=~2.4M
INSERT INTO game_configs (key, value_json, category, description)
VALUES ('max_scene_base_hp', '500', 'game', 'Max base HP cap per scene before scene scaling. Effective cap = this * scene_hp_multiplier. Prevents data errors from making early scenes impossible.')
ON CONFLICT (key) DO UPDATE SET value_json = EXCLUDED.value_json, description = EXCLUDED.description;

COMMIT;
