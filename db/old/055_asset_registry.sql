-- Migration 055: Asset Registry & Shop Column Rename
-- Creates centralized asset_registry table and migrates shop_items/shop_bundles icon_path -> icon_asset_key.

-- =============================================================================
-- 1. CREATE TABLE asset_registry
-- =============================================================================

CREATE TABLE IF NOT EXISTS asset_registry (
    id                  SERIAL PRIMARY KEY,
    asset_key           VARCHAR(150) NOT NULL UNIQUE,
    category            VARCHAR(50) NOT NULL,
    display_name        VARCHAR(200),
    description         TEXT,
    render_definition   JSONB NOT NULL DEFAULT '{}',
    tags                JSONB NOT NULL DEFAULT '[]',
    source              VARCHAR(50) NOT NULL DEFAULT 'admin',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary lookup: asset_key is the main query path
CREATE INDEX IF NOT EXISTS idx_ar_asset_key ON asset_registry(asset_key);

-- Category filtering (admin grid view)
CREATE INDEX IF NOT EXISTS idx_ar_category ON asset_registry(category);

-- Source filtering (find generator vs manual entries)
CREATE INDEX IF NOT EXISTS idx_ar_source ON asset_registry(source);

-- Tag search (GIN index for JSONB array containment queries)
CREATE INDEX IF NOT EXISTS idx_ar_tags ON asset_registry USING GIN(tags);

-- Text search on display_name for admin search bar
CREATE INDEX IF NOT EXISTS idx_ar_display_name ON asset_registry(display_name);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION trg_asset_registry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_asset_registry_updated_at ON asset_registry;
CREATE TRIGGER trg_asset_registry_updated_at
    BEFORE UPDATE ON asset_registry
    FOR EACH ROW
    EXECUTE FUNCTION trg_asset_registry_updated_at();


-- =============================================================================
-- 2. ALTER TABLE: Rename icon_path -> icon_asset_key
-- =============================================================================

ALTER TABLE shop_items RENAME COLUMN icon_path TO icon_asset_key;
ALTER TABLE shop_bundles RENAME COLUMN icon_path TO icon_asset_key;


-- =============================================================================
-- 3. DATA MIGRATION: Convert file paths to asset keys
-- =============================================================================

UPDATE shop_items
SET icon_asset_key = CASE
    WHEN category = 'skin' THEN 'skin_' || LOWER(REPLACE(item_key, ' ', '_'))
    WHEN category = 'flair' THEN 'flair_' || LOWER(REPLACE(item_key, ' ', '_'))
    WHEN category = 'badge' THEN 'badge_' || LOWER(REPLACE(item_key, ' ', '_'))
    WHEN category = 'avatar' THEN 'avatar_' || LOWER(REPLACE(item_key, ' ', '_'))
    WHEN category = 'booster' THEN 'ui_booster_' || LOWER(REPLACE(item_key, ' ', '_'))
    ELSE icon_asset_key
END
WHERE icon_asset_key IS NOT NULL;


-- =============================================================================
-- 4. SEED DATA: Entity Sprites (4 entries)
-- =============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES
('enemy_sludge', 'entity_sprite', 'Sludge Stalker',
 'Toxic slime entity from the early chapters. Amorphous green-brown blob.',
 '{
   "version": 1,
   "base_shape": "circle",
   "radius": 18,
   "fill_color": "#5a7a3a",
   "stroke_color": "#3a5a2a",
   "stroke_width": 2,
   "features": [
     {"type": "eyes", "shape": "circle", "count": 2, "radius": 2, "color": "#ccff00", "glow": true, "offset_y": -4, "spacing": 10},
     {"type": "drip", "shape": "ellipse", "count": 3, "color": "#4a6a2a88", "offset_y": 14, "width_range": [4, 8]}
   ],
   "shadow": {"enabled": true, "offset_y": 20, "scale_x": 1.3, "opacity": 0.25},
   "size_category": "medium"
 }'::jsonb,
 '["book_1", "chapter_1", "melee"]'::jsonb,
 'migrated'),

('enemy_voidling', 'entity_sprite', 'Ether Voidling',
 'Purple-black spectral entity that phases in and out of reality.',
 '{
   "version": 1,
   "base_shape": "circle",
   "radius": 16,
   "fill_color": "#2a1a3e",
   "stroke_color": "#6a3a8e",
   "stroke_width": 1,
   "features": [
     {"type": "eyes", "shape": "circle", "count": 1, "radius": 4, "color": "#ff3333", "glow": true, "offset_y": -2},
     {"type": "aura", "shape": "circle", "radius": 24, "color": "#6a3a8e22", "pulse": true, "pulse_speed": 0.8}
   ],
   "shadow": {"enabled": true, "offset_y": 18, "scale_x": 1.0, "opacity": 0.15},
   "size_category": "small"
 }'::jsonb,
 '["book_1", "void"]'::jsonb,
 'migrated'),

('enemy_guardian', 'entity_sprite', 'Rust Guardian',
 'Large mechanical construct. Armored and slow.',
 '{
   "version": 1,
   "base_shape": "rect",
   "width": 32,
   "height": 36,
   "corner_radius": 4,
   "fill_color": "#8a6a4a",
   "stroke_color": "#6a4a2a",
   "stroke_width": 3,
   "features": [
     {"type": "eyes", "shape": "rect", "count": 2, "width": 5, "height": 3, "color": "#ff8800", "glow": true, "offset_y": -8, "spacing": 14},
     {"type": "rivets", "shape": "circle", "count": 4, "radius": 2, "color": "#554433", "positions": [[-10,-4],[10,-4],[-10,8],[10,8]]}
   ],
   "shadow": {"enabled": true, "offset_y": 22, "scale_x": 1.4, "opacity": 0.35},
   "size_category": "large"
 }'::jsonb,
 '["book_1", "melee", "construct", "thermal"]'::jsonb,
 'migrated'),

('enemy_remnant', 'entity_sprite', 'Cosmic Remnant',
 'Fragmented multi-dimensional entity shifting between colors.',
 '{
   "version": 1,
   "base_shape": "circle",
   "radius": 22,
   "fill_color": "#3a2a5a",
   "stroke_color": "#8a6aaa",
   "stroke_width": 2,
   "features": [
     {"type": "eyes", "shape": "circle", "count": 3, "radius": 2, "color": "#00ffff", "glow": true, "offset_y": -4, "spacing": 8},
     {"type": "fragments", "shape": "triangle", "count": 5, "size": 6, "color": "#6a4a8a88", "orbit_radius": 28, "orbit_speed": 0.3},
     {"type": "aura", "shape": "circle", "radius": 30, "color": "#8a6aaa15", "pulse": true, "pulse_speed": 0.4}
   ],
   "shadow": {"enabled": true, "offset_y": 24, "scale_x": 1.2, "opacity": 0.2},
   "size_category": "large"
 }'::jsonb,
 '["book_1", "akashic", "void", "gravitic", "psychic", "corruption"]'::jsonb,
 'migrated');


-- =============================================================================
-- 5. SEED DATA: Class Sprite (1 entry)
-- =============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES
('class_vessel', 'class_sprite', 'Vessel (Base)',
 'Default player character sprite for the Vessel class.',
 '{
   "version": 1,
   "body": {
     "shape": "humanoid",
     "width": 16,
     "height": 28,
     "fill_color": "#d4af37",
     "head_radius": 6,
     "head_color": "#ccbbaa"
   },
   "layers": [
     {"slot": "armor", "shape": "rect", "width": 14, "height": 16, "fill_color": "#8a7a3a", "offset_y": 2, "min_level": 10},
     {"slot": "head", "shape": "circle", "radius": 7, "fill_color": "#aa9a3a", "offset_y": -14, "min_level": 30},
     {"slot": "weapon", "shape": "line", "length": 14, "color": "#c4bf57", "width": 2, "offset_x": 9, "min_level": 5}
   ],
   "level_aura": {
     "enabled": true,
     "thresholds": [
       {"level": 21, "color": "#cd7f32"},
       {"level": 41, "color": "#c0c0c0"},
       {"level": 61, "color": "#ffd700"},
       {"level": 81, "color": "#00ffff"}
     ]
   }
 }'::jsonb,
 '["vessel", "player"]'::jsonb,
 'migrated');


-- =============================================================================
-- 6. SEED DATA: Backgrounds (8 entries)
-- =============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES
-- Chapter 1: dark industrial
('bg_ch1_far', 'background', 'Chapter 1 Far Layer',
 'Deep space vista with subtle star field.',
 '{
   "version": 1,
   "layer": "far",
   "scroll_factor": 0.1,
   "width": 512,
   "height": 150,
   "gradient": {
     "type": "linear",
     "direction": "vertical",
     "stops": [
       {"offset": 0.0, "color": "#050510"},
       {"offset": 0.4, "color": "#0a0a1a"},
       {"offset": 1.0, "color": "#080818"}
     ]
   },
   "elements": [
     {"type": "stars", "count": 25, "min_radius": 0.5, "max_radius": 1.5, "color": "#ffffff33", "twinkle": true, "seed": 101},
     {"type": "nebula", "x": 300, "y": 40, "radius": 60, "color": "#1a0a3015", "blur": 20}
   ],
   "seamless": true
 }'::jsonb,
 '["book_1", "chapter_1", "far"]'::jsonb,
 'migrated'),

('bg_ch1_mid', 'background', 'Chapter 1 Mid Layer',
 'Dark industrial structures silhouetted against far layer.',
 '{
   "version": 1,
   "layer": "mid",
   "scroll_factor": 0.5,
   "width": 512,
   "height": 150,
   "gradient": {
     "type": "linear",
     "direction": "vertical",
     "stops": [
       {"offset": 0.0, "color": "#00000000"},
       {"offset": 0.6, "color": "#0a0a1500"},
       {"offset": 0.8, "color": "#0d0d20cc"},
       {"offset": 1.0, "color": "#0d0d20"}
     ]
   },
   "elements": [
     {"type": "building", "x": 50, "width": 40, "height": 80, "color": "#0a0a15", "y_align": "bottom"},
     {"type": "building", "x": 150, "width": 60, "height": 100, "color": "#08080f", "y_align": "bottom"},
     {"type": "building", "x": 280, "width": 35, "height": 70, "color": "#0c0c18", "y_align": "bottom"},
     {"type": "building", "x": 400, "width": 50, "height": 90, "color": "#0a0a12", "y_align": "bottom"},
     {"type": "pipe", "x1": 90, "y1": 60, "x2": 150, "y2": 50, "color": "#15152a", "width": 3}
   ],
   "seamless": true
 }'::jsonb,
 '["book_1", "chapter_1", "mid"]'::jsonb,
 'migrated'),

-- Chapter 2: blue-tinted industrial/pipe
('bg_ch2_far', 'background', 'Chapter 2 Far Layer',
 'Deep blue void with distant industrial glow.',
 '{
   "version": 1,
   "layer": "far",
   "scroll_factor": 0.1,
   "width": 512,
   "height": 150,
   "gradient": {
     "type": "linear",
     "direction": "vertical",
     "stops": [
       {"offset": 0.0, "color": "#0a1a2a"},
       {"offset": 0.4, "color": "#0d1f30"},
       {"offset": 1.0, "color": "#15253a"}
     ]
   },
   "elements": [
     {"type": "stars", "count": 18, "min_radius": 0.5, "max_radius": 1.2, "color": "#aaccff33", "twinkle": true, "seed": 201},
     {"type": "nebula", "x": 200, "y": 50, "radius": 80, "color": "#1a3a5a18", "blur": 25}
   ],
   "seamless": true
 }'::jsonb,
 '["book_1", "chapter_2", "far"]'::jsonb,
 'migrated'),

('bg_ch2_mid', 'background', 'Chapter 2 Mid Layer',
 'Blue-tinted pipe structures and industrial catwalks.',
 '{
   "version": 1,
   "layer": "mid",
   "scroll_factor": 0.5,
   "width": 512,
   "height": 150,
   "gradient": {
     "type": "linear",
     "direction": "vertical",
     "stops": [
       {"offset": 0.0, "color": "#00000000"},
       {"offset": 0.6, "color": "#0a1a2a00"},
       {"offset": 0.8, "color": "#0d1f30cc"},
       {"offset": 1.0, "color": "#15253a"}
     ]
   },
   "elements": [
     {"type": "building", "x": 40, "width": 50, "height": 85, "color": "#0d1a28", "y_align": "bottom"},
     {"type": "building", "x": 180, "width": 45, "height": 95, "color": "#0a1520", "y_align": "bottom"},
     {"type": "building", "x": 320, "width": 55, "height": 75, "color": "#0c1825", "y_align": "bottom"},
     {"type": "pipe", "x1": 40, "y1": 55, "x2": 180, "y2": 45, "color": "#1a2a40", "width": 4},
     {"type": "pipe", "x1": 180, "y1": 45, "x2": 320, "y2": 55, "color": "#1a2a40", "width": 3},
     {"type": "pipe", "x1": 320, "y1": 70, "x2": 450, "y2": 60, "color": "#152535", "width": 3}
   ],
   "seamless": true
 }'::jsonb,
 '["book_1", "chapter_2", "mid"]'::jsonb,
 'migrated'),

-- Chapter 3: purple nebula/crystal
('bg_ch3_far', 'background', 'Chapter 3 Far Layer',
 'Purple nebula swirls with crystalline star clusters.',
 '{
   "version": 1,
   "layer": "far",
   "scroll_factor": 0.1,
   "width": 512,
   "height": 150,
   "gradient": {
     "type": "linear",
     "direction": "vertical",
     "stops": [
       {"offset": 0.0, "color": "#1a0a2a"},
       {"offset": 0.4, "color": "#1f0f30"},
       {"offset": 1.0, "color": "#2a153a"}
     ]
   },
   "elements": [
     {"type": "stars", "count": 30, "min_radius": 0.5, "max_radius": 1.8, "color": "#cc99ff33", "twinkle": true, "seed": 301},
     {"type": "nebula", "x": 150, "y": 35, "radius": 90, "color": "#3a1a5a20", "blur": 30},
     {"type": "nebula", "x": 380, "y": 60, "radius": 50, "color": "#2a0a4a15", "blur": 20}
   ],
   "seamless": true
 }'::jsonb,
 '["book_1", "chapter_3", "far"]'::jsonb,
 'migrated'),

('bg_ch3_mid', 'background', 'Chapter 3 Mid Layer',
 'Crystalline spires and floating rock formations.',
 '{
   "version": 1,
   "layer": "mid",
   "scroll_factor": 0.5,
   "width": 512,
   "height": 150,
   "gradient": {
     "type": "linear",
     "direction": "vertical",
     "stops": [
       {"offset": 0.0, "color": "#00000000"},
       {"offset": 0.6, "color": "#1a0a2a00"},
       {"offset": 0.8, "color": "#1f0f30cc"},
       {"offset": 1.0, "color": "#2a153a"}
     ]
   },
   "elements": [
     {"type": "building", "x": 60, "width": 20, "height": 100, "color": "#1a0a28", "y_align": "bottom"},
     {"type": "building", "x": 130, "width": 15, "height": 80, "color": "#200e30", "y_align": "bottom"},
     {"type": "building", "x": 250, "width": 25, "height": 110, "color": "#180a25", "y_align": "bottom"},
     {"type": "building", "x": 370, "width": 18, "height": 70, "color": "#1c0c2a", "y_align": "bottom"},
     {"type": "building", "x": 440, "width": 22, "height": 90, "color": "#1a0a28", "y_align": "bottom"}
   ],
   "seamless": true
 }'::jsonb,
 '["book_1", "chapter_3", "mid"]'::jsonb,
 'migrated'),

-- Chapter 4: deep red volcanic/industrial
('bg_ch4_far', 'background', 'Chapter 4 Far Layer',
 'Deep red volcanic sky with ember particles.',
 '{
   "version": 1,
   "layer": "far",
   "scroll_factor": 0.1,
   "width": 512,
   "height": 150,
   "gradient": {
     "type": "linear",
     "direction": "vertical",
     "stops": [
       {"offset": 0.0, "color": "#2a0a0a"},
       {"offset": 0.4, "color": "#301010"},
       {"offset": 1.0, "color": "#3a1515"}
     ]
   },
   "elements": [
     {"type": "stars", "count": 12, "min_radius": 0.5, "max_radius": 1.0, "color": "#ff663333", "twinkle": true, "seed": 401},
     {"type": "nebula", "x": 250, "y": 45, "radius": 70, "color": "#5a1a1a20", "blur": 25},
     {"type": "nebula", "x": 420, "y": 30, "radius": 40, "color": "#4a0a0a15", "blur": 15}
   ],
   "seamless": true
 }'::jsonb,
 '["book_1", "chapter_4", "far"]'::jsonb,
 'migrated'),

('bg_ch4_mid', 'background', 'Chapter 4 Mid Layer',
 'Volcanic industrial silhouettes with lava glow.',
 '{
   "version": 1,
   "layer": "mid",
   "scroll_factor": 0.5,
   "width": 512,
   "height": 150,
   "gradient": {
     "type": "linear",
     "direction": "vertical",
     "stops": [
       {"offset": 0.0, "color": "#00000000"},
       {"offset": 0.6, "color": "#2a0a0a00"},
       {"offset": 0.8, "color": "#301010cc"},
       {"offset": 1.0, "color": "#3a1515"}
     ]
   },
   "elements": [
     {"type": "building", "x": 30, "width": 55, "height": 90, "color": "#2a0808", "y_align": "bottom"},
     {"type": "building", "x": 160, "width": 40, "height": 105, "color": "#250606", "y_align": "bottom"},
     {"type": "building", "x": 290, "width": 60, "height": 80, "color": "#280a0a", "y_align": "bottom"},
     {"type": "building", "x": 420, "width": 45, "height": 95, "color": "#2a0808", "y_align": "bottom"},
     {"type": "pipe", "x1": 85, "y1": 50, "x2": 160, "y2": 40, "color": "#3a1a1a", "width": 4},
     {"type": "pipe", "x1": 290, "y1": 60, "x2": 420, "y2": 50, "color": "#351515", "width": 3}
   ],
   "seamless": true
 }'::jsonb,
 '["book_1", "chapter_4", "mid"]'::jsonb,
 'migrated');


-- =============================================================================
-- 7. SEED DATA: Avatars (8 entries)
-- =============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES
('avatar_warrior', 'avatar', 'Warrior',
 'Preset warrior avatar — stern face, broad features, steel-gray tones.',
 '{
   "version": 1,
   "size": 128,
   "background_color": "#1a1a2e",
   "face": {"shape": "oval", "width": 65, "height": 72, "fill_color": "#c4a882"},
   "eyes": {"shape": "narrow", "color": "#556677", "size": 7, "glow": false, "spacing": 22},
   "features": [
     {"type": "jaw", "shape": "rect", "width": 55, "height": 15, "color": "#b89872", "offset_y": 25},
     {"type": "brow", "shape": "line", "width": 20, "color": "#8a7a6a", "thickness": 3, "offset_y": -18}
   ],
   "border": {"shape": "circle", "color": "#667788", "width": 3}
 }'::jsonb,
 '["preset", "warrior"]'::jsonb,
 'migrated'),

('avatar_mage', 'avatar', 'Mage',
 'Preset mage avatar — sharp features, glowing blue eyes, arcane glow.',
 '{
   "version": 1,
   "size": 128,
   "background_color": "#0a1a2e",
   "face": {"shape": "oval", "width": 58, "height": 70, "fill_color": "#c4b8a0"},
   "eyes": {"shape": "almond", "color": "#3388ff", "size": 8, "glow": true, "spacing": 20},
   "features": [
     {"type": "brow", "shape": "line", "width": 18, "color": "#5566aa", "thickness": 2, "offset_y": -16},
     {"type": "aura", "shape": "circle", "radius": 60, "color": "#3388ff15", "offset_y": 0}
   ],
   "border": {"shape": "circle", "color": "#3388ff", "width": 3}
 }'::jsonb,
 '["preset", "mage"]'::jsonb,
 'migrated'),

('avatar_rogue', 'avatar', 'Rogue',
 'Preset rogue avatar — hooded, shadowed face, green accents.',
 '{
   "version": 1,
   "size": 128,
   "background_color": "#0a1a0a",
   "face": {"shape": "oval", "width": 55, "height": 65, "fill_color": "#a89878"},
   "eyes": {"shape": "narrow", "color": "#33cc66", "size": 6, "glow": true, "spacing": 18},
   "features": [
     {"type": "hood", "shape": "arc", "width": 70, "height": 40, "color": "#1a2a1a", "offset_y": -30},
     {"type": "shadow", "shape": "rect", "width": 60, "height": 20, "color": "#00000066", "offset_y": -5}
   ],
   "border": {"shape": "circle", "color": "#33aa55", "width": 3}
 }'::jsonb,
 '["preset", "rogue"]'::jsonb,
 'migrated'),

('avatar_cleric', 'avatar', 'Cleric',
 'Preset cleric avatar — serene expression, golden halo, warm tones.',
 '{
   "version": 1,
   "size": 128,
   "background_color": "#1a1a10",
   "face": {"shape": "oval", "width": 60, "height": 68, "fill_color": "#d4b896"},
   "eyes": {"shape": "almond", "color": "#cc9933", "size": 7, "glow": false, "spacing": 20},
   "features": [
     {"type": "halo", "shape": "circle", "radius": 45, "color": "#ffd70033", "offset_y": -35},
     {"type": "brow", "shape": "line", "width": 16, "color": "#aa9060", "thickness": 2, "offset_y": -15}
   ],
   "border": {"shape": "circle", "color": "#ccaa33", "width": 3}
 }'::jsonb,
 '["preset", "cleric"]'::jsonb,
 'migrated'),

('avatar_engineer', 'avatar', 'Engineer',
 'Preset engineer avatar — goggles, copper/brass tones, mechanical details.',
 '{
   "version": 1,
   "size": 128,
   "background_color": "#1a1510",
   "face": {"shape": "oval", "width": 62, "height": 70, "fill_color": "#c4a882"},
   "eyes": {"shape": "circle", "color": "#ff8833", "size": 10, "glow": true, "spacing": 24},
   "features": [
     {"type": "goggles", "shape": "rect", "width": 50, "height": 14, "color": "#886633", "offset_y": -8, "corner_radius": 7},
     {"type": "rivet", "shape": "circle", "count": 2, "radius": 2, "color": "#aa8844", "positions": [[-20, -8], [20, -8]]}
   ],
   "border": {"shape": "circle", "color": "#bb8833", "width": 3}
 }'::jsonb,
 '["preset", "engineer"]'::jsonb,
 'migrated'),

('avatar_conduit', 'avatar', 'Conduit',
 'Preset conduit avatar — ethereal, purple energy lines, glowing features.',
 '{
   "version": 1,
   "size": 128,
   "background_color": "#1a0a2a",
   "face": {"shape": "oval", "width": 58, "height": 68, "fill_color": "#c4b0cc"},
   "eyes": {"shape": "almond", "color": "#aa44ff", "size": 8, "glow": true, "spacing": 20},
   "features": [
     {"type": "energy_lines", "shape": "line", "count": 3, "color": "#aa44ff44", "positions": [[-15, -5, -25, 10], [15, -5, 25, 10], [0, 10, 0, 30]]},
     {"type": "aura", "shape": "circle", "radius": 55, "color": "#aa44ff10", "offset_y": 0}
   ],
   "border": {"shape": "circle", "color": "#9933ee", "width": 3}
 }'::jsonb,
 '["preset", "conduit"]'::jsonb,
 'migrated'),

('avatar_drifter', 'avatar', 'Drifter',
 'Preset drifter avatar — weathered look, cyan accents, wind-worn features.',
 '{
   "version": 1,
   "size": 128,
   "background_color": "#0a1a1a",
   "face": {"shape": "oval", "width": 60, "height": 70, "fill_color": "#b8a080"},
   "eyes": {"shape": "narrow", "color": "#33cccc", "size": 6, "glow": true, "spacing": 20},
   "features": [
     {"type": "scar", "shape": "line", "color": "#aa8866", "positions": [[10, -5, 18, 8]], "thickness": 2},
     {"type": "wind_marks", "shape": "line", "count": 2, "color": "#33cccc22", "positions": [[-30, 0, -20, -5], [20, 0, 30, -5]]}
   ],
   "border": {"shape": "circle", "color": "#33aaaa", "width": 3}
 }'::jsonb,
 '["preset", "drifter"]'::jsonb,
 'migrated'),

('avatar_vessel', 'avatar', 'Vessel',
 'Preset vessel avatar — luminous, golden glow, radiant features.',
 '{
   "version": 1,
   "size": 128,
   "background_color": "#1a1510",
   "face": {"shape": "oval", "width": 60, "height": 70, "fill_color": "#ddc8a0"},
   "eyes": {"shape": "almond", "color": "#ffd700", "size": 8, "glow": true, "spacing": 20},
   "features": [
     {"type": "halo", "shape": "circle", "radius": 50, "color": "#ffd70022", "offset_y": -30},
     {"type": "aura", "shape": "circle", "radius": 58, "color": "#ffd70010", "offset_y": 0}
   ],
   "border": {"shape": "circle", "color": "#d4af37", "width": 3}
 }'::jsonb,
 '["preset", "vessel"]'::jsonb,
 'migrated');


-- =============================================================================
-- 8. SEED DATA: Default/Placeholder Icons (2 entries)
-- =============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, render_definition, tags, source)
VALUES
('artifact_default', 'artifact_icon', 'Default Artifact',
 '{
   "version": 1,
   "size": 64,
   "background": {"shape": "rounded_rect", "corner_radius": 6, "fill_color": "#1a1a2e", "stroke_color": "#333355", "stroke_width": 2},
   "symbol": {"type": "shape", "shape": "diamond", "size": 20, "fill_color": "#5a5a8a", "stroke_color": "#7a7aaa"},
   "rarity_border": {"common": "#888888", "uncommon": "#33cc33", "rare": "#3388ff", "epic": "#aa44ff", "cosmic": "#ffd700"}
 }'::jsonb,
 '["default", "placeholder"]'::jsonb,
 'seed'),

('achievement_default', 'achievement_icon', 'Default Achievement',
 '{
   "version": 1,
   "size": 64,
   "background": {"shape": "circle", "fill_color": "#1a1a2e", "stroke_color": "#333355", "stroke_width": 2},
   "symbol": {"type": "shape", "shape": "star", "points": 5, "outer_radius": 16, "inner_radius": 8, "fill_color": "#c4a837"},
   "locked_variant": {"grayscale": true, "overlay_color": "#00000088", "lock_icon": true}
 }'::jsonb,
 '["default", "placeholder"]'::jsonb,
 'seed');


-- =============================================================================
-- 9. SEED DATA: Curated Artifact Icons (from curated_artifacts table)
-- =============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, render_definition, tags, source)
SELECT
    ca.icon_sprite_key,
    'artifact_icon',
    ca.name,
    jsonb_build_object(
        'version', 1,
        'size', 64,
        'background', jsonb_build_object(
            'shape', 'rounded_rect',
            'corner_radius', 6,
            'fill_color', '#1a1a2e',
            'stroke_color', '#333355',
            'stroke_width', 2
        ),
        'symbol', jsonb_build_object(
            'type', 'shape',
            'shape', CASE
                WHEN ca.name ILIKE '%shard%' THEN 'diamond'
                WHEN ca.name ILIKE '%core%' THEN 'circle'
                WHEN ca.name ILIKE '%blade%' OR ca.name ILIKE '%edge%' THEN 'triangle'
                WHEN ca.name ILIKE '%crown%' OR ca.name ILIKE '%ring%' THEN 'hexagon'
                ELSE 'diamond'
            END,
            'size', 22,
            'fill_color', CASE
                WHEN ca.name ILIKE '%void%' THEN '#6a3a8e'
                WHEN ca.name ILIKE '%celestial%' OR ca.name ILIKE '%cosmic%' THEN '#ffd700'
                WHEN ca.name ILIKE '%infernal%' OR ca.name ILIKE '%fire%' THEN '#cc3333'
                WHEN ca.name ILIKE '%akashic%' THEN '#33aaaa'
                ELSE '#7a7aaa'
            END
        ),
        'rarity_border', jsonb_build_object(
            'common', '#888888',
            'uncommon', '#33cc33',
            'rare', '#3388ff',
            'epic', '#aa44ff',
            'cosmic', '#ffd700'
        )
    ),
    '["artifact", "curated"]'::jsonb,
    'seed'
FROM curated_artifacts ca
WHERE NOT EXISTS (SELECT 1 FROM asset_registry ar WHERE ar.asset_key = ca.icon_sprite_key);


-- =============================================================================
-- 10. SEED DATA: Achievement Icons (from achievements table)
-- =============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, render_definition, tags, source)
SELECT
    a.icon_sprite_key,
    'achievement_icon',
    a.name,
    jsonb_build_object(
        'version', 1,
        'size', 64,
        'background', jsonb_build_object(
            'shape', 'circle',
            'fill_color', CASE a.category
                WHEN 'combat' THEN '#2a1a1a'
                WHEN 'narrative' THEN '#1a1a2a'
                WHEN 'progression' THEN '#1a2a1a'
                WHEN 'social' THEN '#2a2a1a'
                ELSE '#1a1a2e'
            END,
            'stroke_color', CASE a.category
                WHEN 'combat' THEN '#cc3333'
                WHEN 'narrative' THEN '#3388cc'
                WHEN 'progression' THEN '#33cc33'
                WHEN 'social' THEN '#cccc33'
                ELSE '#333355'
            END,
            'stroke_width', 2
        ),
        'symbol', jsonb_build_object(
            'type', 'shape',
            'shape', CASE a.category
                WHEN 'combat' THEN 'triangle'
                WHEN 'narrative' THEN 'diamond'
                WHEN 'progression' THEN 'hexagon'
                WHEN 'social' THEN 'star'
                ELSE 'circle'
            END,
            'size', 18,
            'fill_color', CASE a.category
                WHEN 'combat' THEN '#cc4444'
                WHEN 'narrative' THEN '#4488cc'
                WHEN 'progression' THEN '#44cc44'
                WHEN 'social' THEN '#cccc44'
                ELSE '#7a7aaa'
            END
        ),
        'locked_variant', jsonb_build_object(
            'grayscale', true,
            'overlay_color', '#00000088',
            'lock_icon', true
        )
    ),
    jsonb_build_array('achievement', a.category),
    'seed'
FROM achievements a
WHERE a.icon_sprite_key != 'achievement_default'
  AND NOT EXISTS (SELECT 1 FROM asset_registry ar WHERE ar.asset_key = a.icon_sprite_key);


-- =============================================================================
-- 11. SEED DATA: Shop Item Icons (from shop_items with non-null icon_asset_key)
-- =============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, render_definition, tags, source)
SELECT
    si.icon_asset_key,
    CASE si.category
        WHEN 'skin' THEN 'skin'
        WHEN 'flair' THEN 'flair'
        WHEN 'badge' THEN 'badge'
        WHEN 'avatar' THEN 'avatar'
        ELSE 'ui_icon'
    END,
    si.name,
    jsonb_build_object(
        'version', 1,
        'size', 64,
        'background', jsonb_build_object(
            'shape', 'rounded_rect',
            'corner_radius', 6,
            'fill_color', CASE si.category
                WHEN 'skin' THEN '#1a1a2e'
                WHEN 'flair' THEN '#1a2a1a'
                WHEN 'badge' THEN '#2a1a1a'
                WHEN 'avatar' THEN '#1a1a1a'
                WHEN 'booster' THEN '#1a2a2a'
                ELSE '#1a1a2e'
            END,
            'stroke_color', CASE si.category
                WHEN 'skin' THEN '#5555aa'
                WHEN 'flair' THEN '#55aa55'
                WHEN 'badge' THEN '#aa5555'
                WHEN 'avatar' THEN '#888888'
                WHEN 'booster' THEN '#55aaaa'
                ELSE '#333355'
            END,
            'stroke_width', 2
        ),
        'symbol', jsonb_build_object(
            'type', 'shape',
            'shape', CASE si.category
                WHEN 'skin' THEN 'diamond'
                WHEN 'flair' THEN 'star'
                WHEN 'badge' THEN 'hexagon'
                WHEN 'avatar' THEN 'circle'
                WHEN 'booster' THEN 'triangle'
                ELSE 'circle'
            END,
            'size', 20,
            'fill_color', CASE si.category
                WHEN 'skin' THEN '#7a7acc'
                WHEN 'flair' THEN '#7acc7a'
                WHEN 'badge' THEN '#cc7a7a'
                WHEN 'avatar' THEN '#aaaaaa'
                WHEN 'booster' THEN '#7acccc'
                ELSE '#7a7aaa'
            END
        )
    ),
    jsonb_build_array('shop', si.category),
    'seed'
FROM shop_items si
WHERE si.icon_asset_key IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM asset_registry ar WHERE ar.asset_key = si.icon_asset_key);
