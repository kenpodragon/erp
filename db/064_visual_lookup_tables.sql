-- Migration 064: Visual Lookup Tables for Banner Visual System
-- Creates 5 lookup tables with seed data referenced by entity_gameplay_data, item_type_bases, etc.

-- ============================================================================
-- 1. MOVEMENT TYPES
-- ============================================================================
CREATE TABLE IF NOT EXISTS movement_types (
    id            SERIAL PRIMARY KEY,
    name          TEXT UNIQUE NOT NULL,
    description   TEXT,
    y_offset_min  REAL DEFAULT 0,
    y_offset_max  REAL DEFAULT 0,
    bob_amplitude REAL DEFAULT 0,
    bob_frequency REAL DEFAULT 1.0,
    speed_multiplier REAL DEFAULT 1.0,
    can_change_lane  BOOLEAN DEFAULT FALSE,
    trail_effect  TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO movement_types (name, description, y_offset_min, y_offset_max, bob_amplitude, bob_frequency, speed_multiplier, can_change_lane, trail_effect)
VALUES
    ('ground',   'Walks/crawls on the ground plane',         0,  0, 0, 1.0, 1.0, FALSE, NULL),
    ('hover',    'Floats slightly above ground with shadow',  15, 30, 4, 0.8, 0.9, FALSE, 'shadow'),
    ('flying',   'High altitude flight with lane changes',    40, 70, 8, 1.2, 1.3, TRUE,  NULL),
    ('burrowing','Partially submerged with particle effects', -5,  0, 2, 0.5, 0.7, FALSE, 'particles'),
    ('teleport', 'Blinks between positions with afterimage',   0,  0, 0, 1.0, 0.5, TRUE,  'afterimage')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. SIZE CLASSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS size_classes (
    id               SERIAL PRIMARY KEY,
    name             TEXT UNIQUE NOT NULL,
    description      TEXT,
    scale_min        REAL NOT NULL,
    scale_max        REAL NOT NULL,
    width_base       REAL NOT NULL,
    height_base      REAL NOT NULL,
    hitbox_radius    REAL NOT NULL,
    hp_bar_width     REAL NOT NULL,
    hp_bar_offset_y  REAL DEFAULT -8,
    name_tag_visible BOOLEAN DEFAULT TRUE,
    sort_order       INTEGER DEFAULT 0,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO size_classes (name, description, scale_min, scale_max, width_base, height_base, hitbox_radius, hp_bar_width, sort_order)
VALUES
    ('tiny',   'Very small creatures (insects, wisps)',   0.4, 0.6, 12, 14,  8, 16, 1),
    ('small',  'Small creatures (rats, imps)',            0.7, 0.9, 18, 22, 12, 22, 2),
    ('medium', 'Standard humanoid-sized',                1.0, 1.2, 24, 30, 16, 28, 3),
    ('large',  'Large creatures (ogres, bears)',          1.3, 1.6, 32, 40, 22, 36, 4),
    ('huge',   'Massive creatures (dragons, giants)',     1.8, 2.2, 44, 54, 30, 48, 5)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. ANIMATION STYLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS animation_styles (
    id                   SERIAL PRIMARY KEY,
    name                 TEXT UNIQUE NOT NULL,
    description          TEXT,
    idle_scale_x         REAL DEFAULT 1.0,
    idle_scale_y         REAL DEFAULT 1.0,
    idle_cycle_ms        INTEGER DEFAULT 2000,
    idle_translate_x     REAL DEFAULT 0,
    idle_translate_y     REAL DEFAULT 0,
    attack_recoil        REAL DEFAULT 3.0,
    death_style          TEXT DEFAULT 'fade',
    death_duration_ms    INTEGER DEFAULT 400,
    death_particle_count INTEGER DEFAULT 8,
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO animation_styles (name, description, idle_scale_x, idle_scale_y, idle_cycle_ms, idle_translate_x, idle_translate_y, attack_recoil, death_style, death_duration_ms, death_particle_count)
VALUES
    ('ooze',    'Slow squishing blob motion',         1.15, 0.88, 2000, 0,  0, 2.0, 'dissolve', 500,  6),
    ('stalk',   'Subtle side-to-side prowl',          1.0,  1.0,  1500, -4, 0, 4.0, 'fade',     400,  8),
    ('pulse',   'Rhythmic uniform pulsing',           1.05, 1.05, 2500, 0,  0, 2.0, 'shatter',  600, 12),
    ('aggro',   'Fast aggressive bobbing',            1.0,  1.0,  1000, 0, -3, 5.0, 'explode',  300, 15),
    ('flap',    'Wing-beat vertical motion',          1.0,  1.0,  800,  0, -4, 3.0, 'fade',     400, 10),
    ('swarm',   'Jittery multi-unit drift',           1.0,  1.0,  2000, 2,  0, 1.0, 'dissolve', 500, 20),
    ('slither', 'Horizontal wave undulation',         1.08, 1.0,  1800, 2,  0, 2.0, 'shrink',   400,  6)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 4. SILHOUETTE TYPES
-- ============================================================================
CREATE TABLE IF NOT EXISTS silhouette_types (
    id              SERIAL PRIMARY KEY,
    name            TEXT UNIQUE NOT NULL,
    description     TEXT,
    body_shape      TEXT NOT NULL,
    body_ratio_w    REAL DEFAULT 1.0,
    body_ratio_h    REAL DEFAULT 1.0,
    corner_radius   REAL DEFAULT 0.1,
    has_limbs       BOOLEAN DEFAULT FALSE,
    limb_count      INTEGER DEFAULT 0,
    has_head        BOOLEAN DEFAULT FALSE,
    has_wings       BOOLEAN DEFAULT FALSE,
    has_weapon_slot BOOLEAN DEFAULT FALSE,
    has_eye_glow    BOOLEAN DEFAULT FALSE,
    sub_unit_count  INTEGER DEFAULT 1,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO silhouette_types (name, description, body_shape, body_ratio_w, body_ratio_h, corner_radius, has_limbs, limb_count, has_head, has_wings, has_weapon_slot, has_eye_glow, sub_unit_count)
VALUES
    ('blob',      'Amorphous shapeless mass',        'ellipse', 1.2, 0.7, 0.5, FALSE, 0, FALSE, FALSE, FALSE, FALSE, 1),
    ('quadruped', 'Four-legged beast',               'rect',    1.4, 0.8, 0.1, TRUE,  4, TRUE,  FALSE, FALSE, TRUE,  1),
    ('biped',     'Two-legged humanoid',             'rect',    0.7, 1.3, 0.1, TRUE,  2, TRUE,  FALSE, TRUE,  FALSE, 1),
    ('orb',       'Floating sphere with eye glow',   'circle',  1.0, 1.0, 1.0, FALSE, 0, FALSE, FALSE, FALSE, TRUE,  1),
    ('winged',    'Winged flying creature',          'ellipse', 1.5, 0.6, 0.3, FALSE, 0, TRUE,  TRUE,  FALSE, TRUE,  1),
    ('cluster',   'Multi-unit swarm cluster',        'multi',   0.8, 0.8, 0.2, FALSE, 0, FALSE, FALSE, FALSE, FALSE, 4)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 5. ARMOR CLASSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS armor_classes (
    id              SERIAL PRIMARY KEY,
    code            TEXT UNIQUE NOT NULL,
    display_name    TEXT NOT NULL,
    description     TEXT,
    overlay_opacity REAL DEFAULT 0.6,
    color_tint_base TEXT,
    texture_pattern TEXT DEFAULT 'solid',
    glow_intensity  REAL DEFAULT 0,
    outline_width   REAL DEFAULT 1.0,
    weight_class    TEXT DEFAULT 'medium',
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO armor_classes (code, display_name, description, overlay_opacity, color_tint_base, texture_pattern, glow_intensity, outline_width, weight_class, sort_order)
VALUES
    ('cloth',   'Cloth',   'Light fabric wrappings',              0.4,  '#645040', 'solid',      0,   0.5, 'light',  1),
    ('leather', 'Leather', 'Tanned hide armor',                   0.55, '#8b5a2b', 'solid',      0,   1.0, 'light',  2),
    ('chain',   'Chain',   'Interlocking metal rings',            0.5,  '#b4b4b4', 'crosshatch', 0,   1.0, 'medium', 3),
    ('plate',   'Plate',   'Heavy forged metal plates',           0.65, '#c8c8dc', 'gradient',   0.1, 1.5, 'heavy',  4),
    ('divine',  'Divine',  'Blessed golden armor',                0.5,  '#ffd700', 'shimmer',    0.8, 1.0, 'medium', 5),
    ('magic',   'Magic',   'Arcane-infused protective garments',  0.45, '#8844cc', 'shimmer',    0.6, 0.5, 'light',  6),
    ('bone',    'Bone',    'Skeletal plating and spurs',          0.55, '#b4aa8c', 'solid',      0,   1.0, 'medium', 7),
    ('shadow',  'Shadow',  'Dark ethereal wrappings',             0.35, '#28283c', 'solid',      0.2, 0.5, 'light',  8)
ON CONFLICT (code) DO NOTHING;
