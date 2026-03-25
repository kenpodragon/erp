-- Migration 066: Add visual/animation columns to attack_types
-- These columns drive the frontend AttackRenderer for each attack type.

ALTER TABLE attack_types
    ADD COLUMN IF NOT EXISTS attack_animation_type TEXT DEFAULT 'melee_swing',
    ADD COLUMN IF NOT EXISTS projectile_sprite_key TEXT,
    ADD COLUMN IF NOT EXISTS projectile_speed REAL DEFAULT 3.0,
    ADD COLUMN IF NOT EXISTS projectile_color TEXT,
    ADD COLUMN IF NOT EXISTS impact_effect TEXT DEFAULT 'flash',
    ADD COLUMN IF NOT EXISTS attack_range REAL DEFAULT 30.0,
    ADD COLUMN IF NOT EXISTS cooldown_ms INTEGER DEFAULT 2000,
    ADD COLUMN IF NOT EXISTS arc_angle REAL DEFAULT 90,
    ADD COLUMN IF NOT EXISTS trail_type TEXT,
    ADD COLUMN IF NOT EXISTS screen_shake BOOLEAN DEFAULT FALSE;

-- Melee / slash / strike types → melee_swing, range 30
UPDATE attack_types
SET attack_animation_type = 'melee_swing',
    attack_range = 30.0,
    impact_effect = 'flash',
    cooldown_ms = 1500,
    arc_angle = 90
WHERE name ILIKE '%melee%'
   OR name ILIKE '%slash%'
   OR name ILIKE '%strike%';

-- Ranged / arrow / throw types → ranged_projectile, range 300, speed 4.0
UPDATE attack_types
SET attack_animation_type = 'ranged_projectile',
    attack_range = 300.0,
    projectile_speed = 4.0,
    projectile_sprite_key = 'arrow',
    impact_effect = 'flash',
    cooldown_ms = 2000
WHERE name ILIKE '%ranged%'
   OR name ILIKE '%arrow%'
   OR name ILIKE '%throw%';

-- Magic / spell / bolt types → magic_cast, range 250, speed 2.5, trail glow
UPDATE attack_types
SET attack_animation_type = 'magic_cast',
    attack_range = 250.0,
    projectile_speed = 2.5,
    projectile_color = '#8844ff',
    trail_type = 'glow',
    impact_effect = 'flash',
    cooldown_ms = 2500
WHERE name ILIKE '%magic%'
   OR name ILIKE '%spell%'
   OR name ILIKE '%bolt%';

-- Fire / ice / element types → elemental_projectile, range 250, trail particles
UPDATE attack_types
SET attack_animation_type = 'elemental_projectile',
    attack_range = 250.0,
    projectile_speed = 3.0,
    trail_type = 'particles',
    impact_effect = 'flash',
    cooldown_ms = 2200
WHERE name ILIKE '%fire%'
   OR name ILIKE '%ice%'
   OR name ILIKE '%element%';

-- AoE / burst / area types → aoe_burst, range 100, screen_shake TRUE
UPDATE attack_types
SET attack_animation_type = 'aoe_burst',
    attack_range = 100.0,
    arc_angle = 360,
    screen_shake = TRUE,
    impact_effect = 'flash',
    cooldown_ms = 3000
WHERE name ILIKE '%aoe%'
   OR name ILIKE '%burst%'
   OR name ILIKE '%area%';
