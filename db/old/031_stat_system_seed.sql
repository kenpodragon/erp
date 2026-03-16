-- Migration 031: Stat System Seed Data (2.4.0)
-- Seeds: stat_definitions (STR/AGI/INT), idle_skill_stat_contributions, class_stat_affinities,
--        character_classes.visual_config, game_configs (category/impact + new keys), chapters.recommended_level

-- ═══════════════════════════════════════════════════════
-- §3.1 Ensure stat_definitions rows for STR/AGI/INT exist
-- ═══════════════════════════════════════════════════════
INSERT INTO stat_definitions (name, display_name, value_type, min_value, max_value, description, category) VALUES
    ('strength',     'Strength',     'integer', 0, 9999, 'Increases click damage floor and physical resistance',    'combat'),
    ('agility',      'Agility',      'integer', 0, 9999, 'Increases attack speed and critical hit chance',          'combat'),
    ('intelligence', 'Intelligence', 'integer', 0, 9999, 'Increases skill power and reduces cooldowns',             'combat')
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════
-- §3.2 Seed idle_skill_stat_contributions
-- ═══════════════════════════════════════════════════════

-- Attack → Strength (0.5 per level)
INSERT INTO idle_skill_stat_contributions (idle_skill_id, stat_id, coefficient, description)
SELECT s.id, sd.id, 0.5, 'Attack level × 0.5 → Strength (click damage floor)'
FROM skills s, stat_definitions sd
WHERE s.name = 'Attack' AND sd.name = 'strength'
ON CONFLICT (idle_skill_id, stat_id) DO NOTHING;

-- Precision → Agility (0.5 per level)
INSERT INTO idle_skill_stat_contributions (idle_skill_id, stat_id, coefficient, description)
SELECT s.id, sd.id, 0.5, 'Precision level × 0.5 → Agility (crit chance and speed)'
FROM skills s, stat_definitions sd
WHERE s.name = 'Precision' AND sd.name = 'agility'
ON CONFLICT (idle_skill_id, stat_id) DO NOTHING;

-- Magic → Intelligence (0.5 per level)
INSERT INTO idle_skill_stat_contributions (idle_skill_id, stat_id, coefficient, description)
SELECT s.id, sd.id, 0.5, 'Magic level × 0.5 → Intelligence (skill power and cooldowns)'
FROM skills s, stat_definitions sd
WHERE s.name = 'Magic' AND sd.name = 'intelligence'
ON CONFLICT (idle_skill_id, stat_id) DO NOTHING;

-- Lore: no direct contribution row — handled via class_stat_affinities.lore_weight

-- ═══════════════════════════════════════════════════════
-- §3.3 Seed class_stat_affinities
-- ═══════════════════════════════════════════════════════

-- DRIFTER: Primary=STR, Secondary=AGI
-- Lore: 60% to STR, 40% to AGI
-- Level bonus: +1.0 STR/level, +0.5 AGI/level (≈ +1 every 2 levels)
INSERT INTO class_stat_affinities (class_id, stat_id, base_value, lore_weight, level_bonus_per_level)
SELECT cc.id, sd.id, val.base, val.lore_w, val.lvl_bonus
FROM character_classes cc,
     stat_definitions sd,
     (VALUES
         ('strength',     15, 0.60, 1.0),
         ('agility',      10, 0.40, 0.5),
         ('intelligence',  5, 0.00, 0.0)
     ) AS val(stat_name, base, lore_w, lvl_bonus)
WHERE cc.name = 'Drifter' AND sd.name = val.stat_name
ON CONFLICT (class_id, stat_id) DO UPDATE
    SET base_value = EXCLUDED.base_value,
        lore_weight = EXCLUDED.lore_weight,
        level_bonus_per_level = EXCLUDED.level_bonus_per_level;

-- ENGINEER: Primary=AGI, Secondary=STR
-- Lore: 60% to AGI, 40% to STR
-- Level bonus: +1.0 AGI/level, +0.5 STR/level
INSERT INTO class_stat_affinities (class_id, stat_id, base_value, lore_weight, level_bonus_per_level)
SELECT cc.id, sd.id, val.base, val.lore_w, val.lvl_bonus
FROM character_classes cc,
     stat_definitions sd,
     (VALUES
         ('strength',      5, 0.40, 0.5),
         ('agility',      15, 0.60, 1.0),
         ('intelligence', 10, 0.00, 0.0)
     ) AS val(stat_name, base, lore_w, lvl_bonus)
WHERE cc.name = 'Engineer' AND sd.name = val.stat_name
ON CONFLICT (class_id, stat_id) DO UPDATE
    SET base_value = EXCLUDED.base_value,
        lore_weight = EXCLUDED.lore_weight,
        level_bonus_per_level = EXCLUDED.level_bonus_per_level;

-- CONDUIT: Primary=INT, Secondary=AGI
-- Lore: 60% to INT, 40% to AGI
-- Level bonus: +1.0 INT/level, +0.5 AGI/level
INSERT INTO class_stat_affinities (class_id, stat_id, base_value, lore_weight, level_bonus_per_level)
SELECT cc.id, sd.id, val.base, val.lore_w, val.lvl_bonus
FROM character_classes cc,
     stat_definitions sd,
     (VALUES
         ('strength',      5, 0.00, 0.0),
         ('agility',      10, 0.40, 0.5),
         ('intelligence', 15, 0.60, 1.0)
     ) AS val(stat_name, base, lore_w, lvl_bonus)
WHERE cc.name = 'Conduit' AND sd.name = val.stat_name
ON CONFLICT (class_id, stat_id) DO UPDATE
    SET base_value = EXCLUDED.base_value,
        lore_weight = EXCLUDED.lore_weight,
        level_bonus_per_level = EXCLUDED.level_bonus_per_level;

-- VESSEL: Balanced — equal lore distribution, equal level bonus
-- Lore: 33% to STR, 33% to AGI, 34% to INT (≈ equal)
-- Level bonus: +0.33/level to each (≈ +1 per 3 levels per stat)
INSERT INTO class_stat_affinities (class_id, stat_id, base_value, lore_weight, level_bonus_per_level)
SELECT cc.id, sd.id, val.base, val.lore_w, val.lvl_bonus
FROM character_classes cc,
     stat_definitions sd,
     (VALUES
         ('strength',     10, 0.33, 0.33),
         ('agility',      10, 0.33, 0.33),
         ('intelligence', 10, 0.34, 0.34)
     ) AS val(stat_name, base, lore_w, lvl_bonus)
WHERE cc.name = 'Vessel' AND sd.name = val.stat_name
ON CONFLICT (class_id, stat_id) DO UPDATE
    SET base_value = EXCLUDED.base_value,
        lore_weight = EXCLUDED.lore_weight,
        level_bonus_per_level = EXCLUDED.level_bonus_per_level;

-- ═══════════════════════════════════════════════════════
-- §3.4 Seed character_classes.visual_config
-- ═══════════════════════════════════════════════════════

-- Drifter: crimson/blood-red — liminal threshold spaces
UPDATE character_classes SET visual_config = '{
    "primary_color": "#DC143C",
    "secondary_color": "#8B0000",
    "damage_text_color": "#FF6B6B",
    "particle_tint": "#FF4444",
    "avatar_url": "/assets/classes/drifter_avatar.png",
    "border_glow_intensity": 0.6,
    "idle_sprite_tint": "#FFCCCC"
}'::jsonb WHERE name = 'Drifter' AND visual_config IS NULL;

-- Engineer: steel blue — cold steel of the Eternal Engine
UPDATE character_classes SET visual_config = '{
    "primary_color": "#4682B4",
    "secondary_color": "#2F4F6F",
    "damage_text_color": "#87CEEB",
    "particle_tint": "#5B9BD5",
    "avatar_url": "/assets/classes/engineer_avatar.png",
    "border_glow_intensity": 0.5,
    "idle_sprite_tint": "#CCE5FF"
}'::jsonb WHERE name = 'Engineer' AND visual_config IS NULL;

-- Conduit: amethyst/purple — Akashic energy luminescence
UPDATE character_classes SET visual_config = '{
    "primary_color": "#9B59B6",
    "secondary_color": "#6C3483",
    "damage_text_color": "#D2B4DE",
    "particle_tint": "#A569BD",
    "avatar_url": "/assets/classes/conduit_avatar.png",
    "border_glow_intensity": 0.7,
    "idle_sprite_tint": "#E8DAEF"
}'::jsonb WHERE name = 'Conduit' AND visual_config IS NULL;

-- Vessel: goldenrod — divine radiance of channeled entities
UPDATE character_classes SET visual_config = '{
    "primary_color": "#DAA520",
    "secondary_color": "#B8860B",
    "damage_text_color": "#FFD700",
    "particle_tint": "#FFC125",
    "avatar_url": "/assets/classes/vessel_avatar.png",
    "border_glow_intensity": 0.8,
    "idle_sprite_tint": "#FFF8DC"
}'::jsonb WHERE name = 'Vessel' AND visual_config IS NULL;

-- ═══════════════════════════════════════════════════════
-- §3.5 Update game_configs — Add Category and Game Impact Metadata
-- ═══════════════════════════════════════════════════════

-- Progression configs
UPDATE game_configs SET
    category    = 'progression',
    game_impact = 'Character level calculation, stat bonus scaling. Affects character_stats recalculation.'
WHERE key IN ('char_level_xp_factor', 'char_level_cap', 'idle_to_char_xp_ratio',
              'char_xp_per_scene_base');

-- Training configs
UPDATE game_configs SET
    category    = 'training',
    game_impact = 'Idle Training XP rates, Essence drain, offline cap. Affects IdleTraining panel and offline calc.'
WHERE key IN ('idle_offline_cap_hours', 'idle_essence_drain_per_minute',
              'idle_essence_xp_full_threshold', 'idle_essence_xp_mid_threshold',
              'idle_essence_xp_low_threshold', 'idle_essence_xp_critical_threshold',
              'idle_essence_xp_floor_rate', 'idle_active_mode_boss_interval');

-- Combat configs
UPDATE game_configs SET
    category    = 'combat',
    game_impact = 'Story Mode combat engine — click damage, DPS, crit. Affects CombatStage and session stat calc.'
WHERE key IN ('base_click_damage', 'crit_base_multiplier', 'auto_dps_base',
              'zone_hp_scaling', 'zone_gold_scaling');

-- Insert new progression game_configs
INSERT INTO game_configs (key, value_json, description, category, game_impact) VALUES
    ('idle_to_char_xp_ratio',
     '0.1',
     'Fraction of idle training XP that converts to Character XP. 0.1 = 1 char XP per 10 idle XP. Idle training is the primary char XP engine.',
     'progression',
     'Character level accumulation rate. Affects player_characters.character_xp accrual on idle level events.'),

    ('char_level_xp_factor',
     '1000',
     'Quadratic curve factor K. XP to reach level N = K × N². Default 1000.',
     'progression',
     'Character level thresholds. Changing this shifts all level breakpoints. Affects character sheet level bar.'),

    ('char_level_cap',
     '99',
     'Maximum attainable character level. Currently 99.',
     'progression',
     'Hard cap on player_characters.level. Affects XP accrual halt and character sheet display.'),

    ('char_xp_per_scene_base',
     '50',
     'Flat Character XP awarded per Story Mode scene completion. Multiplied by scene difficulty modifier.',
     'progression',
     'Character XP from story play. Affects character level accumulation for active (non-idle) players.'),

    ('lore_pool_coefficient',
     '0.6',
     'Multiplier applied to Lore level to determine the bonus stat pool: pool = floor(lore_level × coeff).',
     'progression',
     'Lore idle skill stat distribution. Affects character_stats recalculation for Lore contributions.'),

    ('run_achievement_config',
     '{"achievements": [{"id": "speed_completion", "display": "Swift Passage", "description": "Complete the scene run in under N minutes", "threshold_type": "completion_time_seconds", "threshold_value": 300, "drop_chance_pct": 15}, {"id": "enemy_slayer", "display": "Enemy Slayer", "description": "Defeat N or more enemies in a single run", "threshold_type": "enemies_killed", "threshold_value": 100, "drop_chance_pct": 10}, {"id": "wave_climber", "display": "Wave Climber", "description": "Reach wave N or higher", "threshold_type": "max_wave_reached", "threshold_value": 50, "drop_chance_pct": 12}, {"id": "perfect_run", "display": "Flawless Execution", "description": "Complete without dying", "threshold_type": "death_count", "threshold_value": 0, "drop_chance_pct": 20}, {"id": "boss_slayer", "display": "Boss Slayer", "description": "Defeat the scene boss", "threshold_type": "boss_killed", "threshold_value": 1, "drop_chance_pct": 25}, {"id": "personal_best", "display": "High Tide", "description": "Reach a personal best wave for this scene", "threshold_type": "personal_best_wave", "threshold_value": 1, "drop_chance_pct": 8}]}',
     'Run completion achievement thresholds and drop chance percentages for Dream Items.',
     'drops',
     'Dream Item drop system. Evaluated on every POST /api/game/story/complete-scene call.'),

    ('rarity_weight_book_1',
     '{"common": 60, "uncommon": 25, "rare": 10, "epic": 4, "cosmic": 1}',
     'Dream Item rarity drop weights for Book 1 chapters. Values are relative weights (not %).',
     'drops',
     'Item rarity distribution in Book 1 scenes. Used by Dream Item generator on scene completion.'),

    ('rarity_weight_book_2',
     '{"common": 50, "uncommon": 27, "rare": 14, "epic": 7, "cosmic": 2}',
     'Dream Item rarity drop weights for Book 2 chapters.',
     'drops',
     'Item rarity distribution in Book 2 scenes.'),

    ('rarity_weight_book_3',
     '{"common": 40, "uncommon": 28, "rare": 18, "epic": 10, "cosmic": 4}',
     'Dream Item rarity drop weights for Book 3 chapters.',
     'drops',
     'Item rarity distribution in Book 3 scenes.')

ON CONFLICT (key) DO NOTHING;

-- Stat effect coefficients (§1.7 of Design doc)
INSERT INTO game_configs (key, value_json, description, category, game_impact) VALUES
    ('str_damage_coefficient', '0.02', '+2% click damage per STR point.', 'combat', 'Story Mode click damage formula. Affects CombatStage click damage calculation.'),
    ('str_resistance_coefficient', '0.5', '0.5 flat damage reduction per STR point from boss attacks.', 'combat', 'Story Mode incoming damage reduction. Affects BossStage damage calculation.'),
    ('agi_speed_coefficient', '0.015', '+1.5% auto-DPS per AGI point.', 'combat', 'Story Mode auto-DPS multiplier. Affects CombatStage auto-attack tick.'),
    ('agi_crit_coefficient', '0.003', '+0.3% crit chance per AGI point.', 'combat', 'Story Mode crit chance. Affects CombatStage critical hit roll.'),
    ('int_power_coefficient', '0.02', '+2% skill power per INT point.', 'combat', 'Story Mode hotbar skill damage/effect scaling. Affects SkillsHotbar activation.'),
    ('int_cooldown_coefficient', '0.005', '-0.5% cooldown per INT point (min 50% of base).', 'combat', 'Story Mode skill cooldown reduction. Affects SkillsHotbar cooldown timers.')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════
-- §3.6 Seed chapters.recommended_level
-- ═══════════════════════════════════════════════════════

-- Book 1 chapters: level 0 → 18 (progressive)
-- Assumes chapters are ordered by sort_order within each book
-- Exact values tuned to: start=0, midpoint=10, end≈18
UPDATE chapters SET recommended_level = sub.rec_level
FROM (
    SELECT c.id,
           ROUND(
               18.0 * (ROW_NUMBER() OVER (PARTITION BY c.book_id ORDER BY c.sort_order) - 1)
               / NULLIF(COUNT(*) OVER (PARTITION BY c.book_id) - 1, 0)
           )::INTEGER AS rec_level
    FROM chapters c
    JOIN books b ON b.id = c.book_id
    WHERE b.book_number = 1
) sub
WHERE chapters.id = sub.id AND chapters.recommended_level IS NULL;

-- Book 2 chapters: level 20 → 55
UPDATE chapters SET recommended_level = sub.rec_level
FROM (
    SELECT c.id,
           (20 + ROUND(
               35.0 * (ROW_NUMBER() OVER (PARTITION BY c.book_id ORDER BY c.sort_order) - 1)
               / NULLIF(COUNT(*) OVER (PARTITION BY c.book_id) - 1, 0)
           ))::INTEGER AS rec_level
    FROM chapters c
    JOIN books b ON b.id = c.book_id
    WHERE b.book_number = 2
) sub
WHERE chapters.id = sub.id AND chapters.recommended_level IS NULL;

-- Book 3 chapters: level 60 → 90 (flattened curve)
UPDATE chapters SET recommended_level = sub.rec_level
FROM (
    SELECT c.id,
           (60 + ROUND(
               30.0 * (ROW_NUMBER() OVER (PARTITION BY c.book_id ORDER BY c.sort_order) - 1)
               / NULLIF(COUNT(*) OVER (PARTITION BY c.book_id) - 1, 0)
           ))::INTEGER AS rec_level
    FROM chapters c
    JOIN books b ON b.id = c.book_id
    WHERE b.book_number = 3
) sub
WHERE chapters.id = sub.id AND chapters.recommended_level IS NULL;

-- Books themselves get start-of-book recommended_level
UPDATE books SET recommended_level = 0  WHERE book_number = 1 AND recommended_level IS NULL;
UPDATE books SET recommended_level = 20 WHERE book_number = 2 AND recommended_level IS NULL;
UPDATE books SET recommended_level = 60 WHERE book_number = 3 AND recommended_level IS NULL;
