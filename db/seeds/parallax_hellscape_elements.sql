-- =============================================================================
-- Parallax Background Elements: Hellscape / Corruption Theme
-- Generated: 2026-03-28
-- Theme: Oppressive hellscape — charred spires, molten cracks, twisted remains,
--         volcanic ash, corruption growths, reality collapse
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. HELLSCAPE SPIRE — Twisted organic/mechanical spires from corrupted ground
-- =============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_hellscape_spire',
  'bg_element_def',
  'Hellscape Spire',
  'Twisted organic/mechanical spires rising from corrupted ground. Jagged silhouettes with inner glow suggesting molten cores.',
  '{
    "type": "parallax_element",
    "base_size": {"w": 15, "h": 70},
    "anchor": {"x": 0.5, "y": 1.0},
    "slots": {
      "spire": {"count": 3, "z_order": 1},
      "tendril": {"count": 2, "z_order": 2},
      "glow": {"count": 2, "z_order": 0}
    },
    "palette": {
      "charred_black": "#221111",
      "corruption_red": "#CC2200",
      "inner_glow": "#FF4400"
    },
    "variance": 0.25
  }',
  '["hellscape", "corruption", "spire", "vertical", "silhouette"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Spire slot components
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_hellscape_spire_spire_a',
  'bg_component',
  'Hellscape Spire - Spire A',
  'Tall jagged spire, narrow peak with irregular edges.',
  '{
    "slot": "spire",
    "parent_def": "elem_def_hellscape_spire",
    "svg_paths": [
      {"d": "M7 70 L5 35 Q3 20 4 10 L7 0 L10 8 Q11 22 9 35 L12 70 Z", "fill": "#221111", "opacity": 1.0}
    ],
    "variance": 0.25
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_hellscape_spire_spire_b',
  'bg_component',
  'Hellscape Spire - Spire B',
  'Crooked spire leaning with barbed protrusions.',
  '{
    "slot": "spire",
    "parent_def": "elem_def_hellscape_spire",
    "svg_paths": [
      {"d": "M6 70 L3 40 L1 30 Q2 18 5 5 L8 2 L11 15 Q10 28 12 38 L10 70 Z", "fill": "#221111", "opacity": 0.95},
      {"d": "M3 40 L0 35 L2 32 Z", "fill": "#CC2200", "opacity": 0.7}
    ],
    "variance": 0.3
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_hellscape_spire_spire_c',
  'bg_component',
  'Hellscape Spire - Spire C',
  'Thick base spire tapering to a wickedly sharp point.',
  '{
    "slot": "spire",
    "parent_def": "elem_def_hellscape_spire",
    "svg_paths": [
      {"d": "M4 70 L2 50 Q1 30 3 15 L7 0 L11 12 Q13 28 12 48 L14 70 Z", "fill": "#221111", "opacity": 1.0},
      {"d": "M6 50 Q5 35 7 15 L8 14 Q9 33 8 48 Z", "fill": "#CC2200", "opacity": 0.3}
    ],
    "variance": 0.2
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Tendril slot components
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_hellscape_spire_tendril_a',
  'bg_component',
  'Hellscape Spire - Tendril A',
  'Organic tendril curling outward from the spire base.',
  '{
    "slot": "tendril",
    "parent_def": "elem_def_hellscape_spire",
    "svg_paths": [
      {"d": "M7 65 Q2 55 0 45 Q1 42 4 44 Q6 52 7 58 Z", "fill": "#CC2200", "opacity": 0.8}
    ],
    "variance": 0.3
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_hellscape_spire_tendril_b',
  'bg_component',
  'Hellscape Spire - Tendril B',
  'Whip-like tendril reaching upward with hooked tip.',
  '{
    "slot": "tendril",
    "parent_def": "elem_def_hellscape_spire",
    "svg_paths": [
      {"d": "M8 60 Q13 50 15 38 Q14 35 12 37 Q11 47 8 55 Z", "fill": "#CC2200", "opacity": 0.75}
    ],
    "variance": 0.25
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Glow slot components
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_hellscape_spire_glow_a',
  'bg_component',
  'Hellscape Spire - Glow A',
  'Diffuse inner glow radiating from spire core.',
  '{
    "slot": "glow",
    "parent_def": "elem_def_hellscape_spire",
    "svg_paths": [
      {"d": "M5 55 Q3 35 6 15 L9 14 Q12 33 10 53 Z", "fill": "#FF4400", "opacity": 0.2}
    ],
    "blend_mode": "screen",
    "variance": 0.2
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_hellscape_spire_glow_b',
  'bg_component',
  'Hellscape Spire - Glow B',
  'Concentrated hot glow at spire tip.',
  '{
    "slot": "glow",
    "parent_def": "elem_def_hellscape_spire",
    "svg_paths": [
      {"d": "M6 12 Q5 5 7 0 L8 1 Q10 6 9 13 Z", "fill": "#FF4400", "opacity": 0.35}
    ],
    "blend_mode": "screen",
    "variance": 0.2
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;


-- =============================================================================
-- 2. MOLTEN CRACK — Lava/molten energy seeping through cracked ground
-- =============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_molten_crack',
  'bg_element_def',
  'Molten Crack',
  'Lava and molten energy seeping through cracked and fractured ground. Horizontal fissures with intense heat glow.',
  '{
    "type": "parallax_element",
    "base_size": {"w": 35, "h": 12},
    "anchor": {"x": 0.5, "y": 0.5},
    "slots": {
      "crack": {"count": 3, "z_order": 2},
      "lava": {"count": 3, "z_order": 1},
      "heat_shimmer": {"count": 2, "z_order": 3}
    },
    "palette": {
      "crack_dark": "#331100",
      "lava_orange": "#FF6600",
      "heat_yellow": "#FFAA22"
    },
    "variance": 0.25
  }',
  '["hellscape", "corruption", "ground", "horizontal", "lava"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Crack slot components
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_molten_crack_crack_a',
  'bg_component',
  'Molten Crack - Crack A',
  'Wide jagged fissure splitting the ground.',
  '{
    "slot": "crack",
    "parent_def": "elem_def_molten_crack",
    "svg_paths": [
      {"d": "M0 5 L5 4 L10 6 L18 3 L25 5 L30 4 L35 6 L35 8 L28 7 L20 9 L12 7 L5 8 L0 7 Z", "fill": "#331100", "opacity": 1.0}
    ],
    "variance": 0.25
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_molten_crack_crack_b',
  'bg_component',
  'Molten Crack - Crack B',
  'Narrow branching crack with sharp angles.',
  '{
    "slot": "crack",
    "parent_def": "elem_def_molten_crack",
    "svg_paths": [
      {"d": "M2 6 L8 5 L12 3 L15 5 L20 4 L25 6 L28 5 L28 7 L22 8 L17 6 L13 8 L8 7 L2 8 Z", "fill": "#331100", "opacity": 0.95}
    ],
    "variance": 0.3
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_molten_crack_crack_c',
  'bg_component',
  'Molten Crack - Crack C',
  'Deep central fissure widening at the middle.',
  '{
    "slot": "crack",
    "parent_def": "elem_def_molten_crack",
    "svg_paths": [
      {"d": "M5 5 L12 4 L15 3 L20 2 L22 4 L30 5 L30 8 L24 7 L20 9 L16 10 L12 8 L5 7 Z", "fill": "#331100", "opacity": 1.0}
    ],
    "variance": 0.2
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Lava slot components
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_molten_crack_lava_a',
  'bg_component',
  'Molten Crack - Lava A',
  'Bright molten flow visible through the fissure.',
  '{
    "slot": "lava",
    "parent_def": "elem_def_molten_crack",
    "svg_paths": [
      {"d": "M3 6 L10 5 L18 4 L24 5 L32 6 L32 7 L25 6 L18 7 L10 6 L3 7 Z", "fill": "#FF6600", "opacity": 0.9}
    ],
    "variance": 0.2
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_molten_crack_lava_b',
  'bg_component',
  'Molten Crack - Lava B',
  'Pulsing lava pool at crack intersection.',
  '{
    "slot": "lava",
    "parent_def": "elem_def_molten_crack",
    "svg_paths": [
      {"d": "M12 4 Q15 2 18 4 Q20 6 18 8 Q15 10 12 8 Q10 6 12 4 Z", "fill": "#FF6600", "opacity": 0.85},
      {"d": "M14 5 Q16 3 17 5 Q18 7 16 8 Q14 7 14 5 Z", "fill": "#FFAA22", "opacity": 0.6}
    ],
    "variance": 0.25
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_molten_crack_lava_c',
  'bg_component',
  'Molten Crack - Lava C',
  'Thin bright lava veins branching from main flow.',
  '{
    "slot": "lava",
    "parent_def": "elem_def_molten_crack",
    "svg_paths": [
      {"d": "M8 5 L12 6 L16 5 L20 6 L24 5", "stroke": "#FF6600", "stroke_width": 1.2, "fill": "none", "opacity": 0.8},
      {"d": "M14 6 L16 8 L18 7", "stroke": "#FFAA22", "stroke_width": 0.8, "fill": "none", "opacity": 0.6}
    ],
    "variance": 0.3
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Heat shimmer slot components
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_molten_crack_heat_shimmer_a',
  'bg_component',
  'Molten Crack - Heat Shimmer A',
  'Rising heat distortion above the crack.',
  '{
    "slot": "heat_shimmer",
    "parent_def": "elem_def_molten_crack",
    "svg_paths": [
      {"d": "M10 4 Q12 1 14 3 Q16 0 18 2 Q20 0 22 3", "stroke": "#FFAA22", "stroke_width": 0.6, "fill": "none", "opacity": 0.25}
    ],
    "blend_mode": "screen",
    "variance": 0.3
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_molten_crack_heat_shimmer_b',
  'bg_component',
  'Molten Crack - Heat Shimmer B',
  'Wider diffuse heat haze over molten area.',
  '{
    "slot": "heat_shimmer",
    "parent_def": "elem_def_molten_crack",
    "svg_paths": [
      {"d": "M8 3 Q12 0 16 2 Q20 -1 24 1 Q28 0 30 3", "stroke": "#FFAA22", "stroke_width": 0.8, "fill": "none", "opacity": 0.15}
    ],
    "blend_mode": "screen",
    "variance": 0.25
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;


-- =============================================================================
-- 3. TWISTED REMAINS — Grotesque biomechanical twisted structures
-- =============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_twisted_remains',
  'bg_element_def',
  'Twisted Remains',
  'Grotesque biomechanical twisted structures. Fused organic and mechanical parts forming disturbing silhouettes.',
  '{
    "type": "parallax_element",
    "base_size": {"w": 25, "h": 30},
    "anchor": {"x": 0.5, "y": 1.0},
    "slots": {
      "mass": {"count": 3, "z_order": 1},
      "limb": {"count": 3, "z_order": 2},
      "eye": {"count": 2, "z_order": 3}
    },
    "palette": {
      "flesh_grey": "#887766",
      "limb_dark": "#554433",
      "eye_red": "#FF0000"
    },
    "variance": 0.25
  }',
  '["hellscape", "corruption", "biomechanical", "horror", "remains"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Mass slot components
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_twisted_remains_mass_a',
  'bg_component',
  'Twisted Remains - Mass A',
  'Central bulbous mass with irregular surface.',
  '{
    "slot": "mass",
    "parent_def": "elem_def_twisted_remains",
    "svg_paths": [
      {"d": "M8 30 Q4 25 3 18 Q2 12 6 8 Q10 5 14 7 Q18 4 20 10 Q22 16 21 22 Q20 28 17 30 Z", "fill": "#887766", "opacity": 1.0}
    ],
    "variance": 0.25
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_twisted_remains_mass_b',
  'bg_component',
  'Twisted Remains - Mass B',
  'Flattened mass with protruding ridges.',
  '{
    "slot": "mass",
    "parent_def": "elem_def_twisted_remains",
    "svg_paths": [
      {"d": "M5 30 Q2 22 4 15 L8 10 Q12 8 16 10 L20 14 Q23 20 22 28 L20 30 Z", "fill": "#887766", "opacity": 0.95},
      {"d": "M8 15 L10 10 L12 12 L14 10 L16 14", "stroke": "#554433", "stroke_width": 1.0, "fill": "none", "opacity": 0.7}
    ],
    "variance": 0.3
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_twisted_remains_mass_c',
  'bg_component',
  'Twisted Remains - Mass C',
  'Tall narrow mass suggesting a warped torso.',
  '{
    "slot": "mass",
    "parent_def": "elem_def_twisted_remains",
    "svg_paths": [
      {"d": "M10 30 Q7 24 6 16 Q5 10 8 5 Q11 2 14 4 Q17 8 18 15 Q19 22 16 30 Z", "fill": "#887766", "opacity": 1.0}
    ],
    "variance": 0.2
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Limb slot components
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_twisted_remains_limb_a',
  'bg_component',
  'Twisted Remains - Limb A',
  'Bent limb reaching upward with claw-like termination.',
  '{
    "slot": "limb",
    "parent_def": "elem_def_twisted_remains",
    "svg_paths": [
      {"d": "M12 22 Q8 16 5 10 Q3 6 1 3 L3 2 Q5 5 7 9 Q10 14 13 20 Z", "fill": "#554433", "opacity": 0.9}
    ],
    "variance": 0.3
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_twisted_remains_limb_b',
  'bg_component',
  'Twisted Remains - Limb B',
  'Segmented limb curving to the right with joint bulges.',
  '{
    "slot": "limb",
    "parent_def": "elem_def_twisted_remains",
    "svg_paths": [
      {"d": "M14 20 Q18 16 21 12 Q23 8 25 5 L24 4 Q22 7 20 11 Q17 15 13 18 Z", "fill": "#554433", "opacity": 0.85},
      {"d": "M20 12 A2 2 0 1 0 22 12 A2 2 0 1 0 20 12 Z", "fill": "#554433", "opacity": 0.6}
    ],
    "variance": 0.25
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_twisted_remains_limb_c',
  'bg_component',
  'Twisted Remains - Limb C',
  'Dragging limb trailing along the ground.',
  '{
    "slot": "limb",
    "parent_def": "elem_def_twisted_remains",
    "svg_paths": [
      {"d": "M10 28 Q6 27 2 28 Q0 29 0 30 L8 30 Q9 29 10 28 Z", "fill": "#554433", "opacity": 0.8}
    ],
    "variance": 0.2
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Eye slot components
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_twisted_remains_eye_a',
  'bg_component',
  'Twisted Remains - Eye A',
  'Single unblinking eye embedded in the mass.',
  '{
    "slot": "eye",
    "parent_def": "elem_def_twisted_remains",
    "svg_paths": [
      {"d": "M11 13 A3 2 0 1 0 17 13 A3 2 0 1 0 11 13 Z", "fill": "#221111", "opacity": 0.9},
      {"d": "M13 13 A1.5 1 0 1 0 16 13 A1.5 1 0 1 0 13 13 Z", "fill": "#FF0000", "opacity": 0.85}
    ],
    "variance": 0.2
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_twisted_remains_eye_b',
  'bg_component',
  'Twisted Remains - Eye B',
  'Cluster of small malevolent eyes.',
  '{
    "slot": "eye",
    "parent_def": "elem_def_twisted_remains",
    "svg_paths": [
      {"d": "M10 10 A1 1 0 1 0 12 10 A1 1 0 1 0 10 10 Z", "fill": "#FF0000", "opacity": 0.7},
      {"d": "M13 8 A1 1 0 1 0 15 8 A1 1 0 1 0 13 8 Z", "fill": "#FF0000", "opacity": 0.6},
      {"d": "M11 12 A0.8 0.8 0 1 0 12.6 12 A0.8 0.8 0 1 0 11 12 Z", "fill": "#FF0000", "opacity": 0.5}
    ],
    "variance": 0.3
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;


-- =============================================================================
-- 4. ASH CLOUD — Thick volcanic ash clouds and smoke
-- =============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_ash_cloud',
  'bg_element_def',
  'Ash Cloud',
  'Thick volcanic ash clouds and choking smoke. Heavy oppressive forms blotting out the sky with embedded embers.',
  '{
    "type": "parallax_element",
    "base_size": {"w": 50, "h": 25},
    "anchor": {"x": 0.5, "y": 0.5},
    "slots": {
      "cloud": {"count": 3, "z_order": 1},
      "particle": {"count": 2, "z_order": 2},
      "ember": {"count": 2, "z_order": 3}
    },
    "palette": {
      "ash_dark": "#444433",
      "particle_grey": "#666655",
      "ember_orange": "#FF8844"
    },
    "variance": 0.2
  }',
  '["hellscape", "corruption", "atmospheric", "cloud", "ash"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Cloud slot components
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_ash_cloud_cloud_a',
  'bg_component',
  'Ash Cloud - Cloud A',
  'Dense billowing ash mass, heavy and oppressive.',
  '{
    "slot": "cloud",
    "parent_def": "elem_def_ash_cloud",
    "svg_paths": [
      {"d": "M5 18 Q2 14 5 10 Q8 6 15 5 Q22 3 30 6 Q38 4 42 8 Q46 12 44 16 Q42 20 35 20 Q28 22 20 20 Q12 21 5 18 Z", "fill": "#444433", "opacity": 0.85}
    ],
    "variance": 0.2
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_ash_cloud_cloud_b',
  'bg_component',
  'Ash Cloud - Cloud B',
  'Wispy trailing ash tendrils stretching horizontally.',
  '{
    "slot": "cloud",
    "parent_def": "elem_def_ash_cloud",
    "svg_paths": [
      {"d": "M0 12 Q8 8 16 10 Q24 7 32 9 Q40 8 48 11 Q50 13 48 15 Q40 14 32 13 Q24 15 16 14 Q8 16 0 14 Z", "fill": "#444433", "opacity": 0.6}
    ],
    "variance": 0.25
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_ash_cloud_cloud_c',
  'bg_component',
  'Ash Cloud - Cloud C',
  'Towering cumulus-like ash formation with dark underbelly.',
  '{
    "slot": "cloud",
    "parent_def": "elem_def_ash_cloud",
    "svg_paths": [
      {"d": "M10 20 Q8 16 10 12 Q12 6 18 4 Q24 2 30 5 Q36 3 40 8 Q44 12 42 18 Q40 22 35 22 Q25 23 15 22 Z", "fill": "#444433", "opacity": 0.9},
      {"d": "M12 18 Q16 16 22 17 Q28 16 34 17 Q38 18 40 20 L12 20 Z", "fill": "#333322", "opacity": 0.7}
    ],
    "variance": 0.2
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Particle slot components
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_ash_cloud_particle_a',
  'bg_component',
  'Ash Cloud - Particle A',
  'Scattered ash particles drifting downward.',
  '{
    "slot": "particle",
    "parent_def": "elem_def_ash_cloud",
    "svg_paths": [
      {"d": "M12 18 L13 19 L12 20 L11 19 Z", "fill": "#666655", "opacity": 0.5},
      {"d": "M22 20 L23 21 L22 22 L21 21 Z", "fill": "#666655", "opacity": 0.4},
      {"d": "M32 17 L33 18 L32 19 L31 18 Z", "fill": "#666655", "opacity": 0.45},
      {"d": "M40 22 L41 23 L40 24 L39 23 Z", "fill": "#666655", "opacity": 0.35}
    ],
    "variance": 0.3
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_ash_cloud_particle_b',
  'bg_component',
  'Ash Cloud - Particle B',
  'Dense particle cluster near cloud base.',
  '{
    "slot": "particle",
    "parent_def": "elem_def_ash_cloud",
    "svg_paths": [
      {"d": "M18 16 L19 17 L18 18 Z", "fill": "#666655", "opacity": 0.55},
      {"d": "M20 18 L21 19 L20 20 Z", "fill": "#666655", "opacity": 0.4},
      {"d": "M24 15 L25 16 L24 17 Z", "fill": "#666655", "opacity": 0.5},
      {"d": "M28 19 L29 20 L28 21 Z", "fill": "#666655", "opacity": 0.35},
      {"d": "M15 20 L16 21 L15 22 Z", "fill": "#666655", "opacity": 0.3}
    ],
    "variance": 0.25
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Ember slot components
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_ash_cloud_ember_a',
  'bg_component',
  'Ash Cloud - Ember A',
  'Bright embers rising through the ash.',
  '{
    "slot": "ember",
    "parent_def": "elem_def_ash_cloud",
    "svg_paths": [
      {"d": "M16 8 A0.8 0.8 0 1 0 17.6 8 A0.8 0.8 0 1 0 16 8 Z", "fill": "#FF8844", "opacity": 0.7},
      {"d": "M26 5 A0.6 0.6 0 1 0 27.2 5 A0.6 0.6 0 1 0 26 5 Z", "fill": "#FF8844", "opacity": 0.55},
      {"d": "M36 9 A0.7 0.7 0 1 0 37.4 9 A0.7 0.7 0 1 0 36 9 Z", "fill": "#FF8844", "opacity": 0.6}
    ],
    "blend_mode": "screen",
    "variance": 0.3
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_ash_cloud_ember_b',
  'bg_component',
  'Ash Cloud - Ember B',
  'Fading embers trailing from cloud edge.',
  '{
    "slot": "ember",
    "parent_def": "elem_def_ash_cloud",
    "svg_paths": [
      {"d": "M38 12 A0.5 0.5 0 1 0 39 12 A0.5 0.5 0 1 0 38 12 Z", "fill": "#FF8844", "opacity": 0.4},
      {"d": "M42 10 A0.4 0.4 0 1 0 42.8 10 A0.4 0.4 0 1 0 42 10 Z", "fill": "#FF8844", "opacity": 0.3},
      {"d": "M8 11 A0.6 0.6 0 1 0 9.2 11 A0.6 0.6 0 1 0 8 11 Z", "fill": "#FF8844", "opacity": 0.5}
    ],
    "blend_mode": "screen",
    "variance": 0.25
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;


-- =============================================================================
-- 5. CORRUPTION GROWTH — Organic corruption spreading across surfaces
-- =============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_corruption_growth',
  'bg_element_def',
  'Corruption Growth',
  'Organic corruption spreading across surfaces. Vein-like tendrils radiating from pulsing nodes.',
  '{
    "type": "parallax_element",
    "base_size": {"w": 30, "h": 20},
    "anchor": {"x": 0.5, "y": 1.0},
    "slots": {
      "growth": {"count": 3, "z_order": 1},
      "vein": {"count": 2, "z_order": 2},
      "node": {"count": 2, "z_order": 3}
    },
    "palette": {
      "corruption_purple": "#661144",
      "vein_red": "#AA2233",
      "node_glow": "#FF3366"
    },
    "variance": 0.25
  }',
  '["hellscape", "corruption", "organic", "spreading", "growth"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Growth slot components
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_corruption_growth_growth_a',
  'bg_component',
  'Corruption Growth - Growth A',
  'Base corruption mass creeping along surface.',
  '{
    "slot": "growth",
    "parent_def": "elem_def_corruption_growth",
    "svg_paths": [
      {"d": "M5 20 Q3 16 5 12 Q8 9 12 10 Q16 8 20 10 Q24 9 27 12 Q29 16 27 20 Z", "fill": "#661144", "opacity": 0.9}
    ],
    "variance": 0.25
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_corruption_growth_growth_b',
  'bg_component',
  'Corruption Growth - Growth B',
  'Thin corruption film with irregular edges.',
  '{
    "slot": "growth",
    "parent_def": "elem_def_corruption_growth",
    "svg_paths": [
      {"d": "M2 20 Q1 17 3 15 Q6 12 10 14 Q14 11 18 13 Q22 12 25 15 Q28 17 28 20 Z", "fill": "#661144", "opacity": 0.7}
    ],
    "variance": 0.3
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_corruption_growth_growth_c',
  'bg_component',
  'Corruption Growth - Growth C',
  'Raised corruption mound with bumpy texture.',
  '{
    "slot": "growth",
    "parent_def": "elem_def_corruption_growth",
    "svg_paths": [
      {"d": "M8 20 Q6 14 9 10 Q12 7 15 9 Q18 6 21 9 Q24 12 22 18 L20 20 Z", "fill": "#661144", "opacity": 0.95},
      {"d": "M10 14 Q12 11 14 13 Q16 10 18 12", "stroke": "#551133", "stroke_width": 0.8, "fill": "none", "opacity": 0.6}
    ],
    "variance": 0.2
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Vein slot components
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_corruption_growth_vein_a',
  'bg_component',
  'Corruption Growth - Vein A',
  'Branching veins radiating from center.',
  '{
    "slot": "vein",
    "parent_def": "elem_def_corruption_growth",
    "svg_paths": [
      {"d": "M15 14 Q10 12 5 14 Q3 15 2 18", "stroke": "#AA2233", "stroke_width": 1.2, "fill": "none", "opacity": 0.8},
      {"d": "M15 14 Q20 11 25 13 Q27 14 28 17", "stroke": "#AA2233", "stroke_width": 1.0, "fill": "none", "opacity": 0.75},
      {"d": "M15 14 Q14 10 12 7", "stroke": "#AA2233", "stroke_width": 0.8, "fill": "none", "opacity": 0.6}
    ],
    "variance": 0.3
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_corruption_growth_vein_b',
  'bg_component',
  'Corruption Growth - Vein B',
  'Dense vein network with pulsing rhythm.',
  '{
    "slot": "vein",
    "parent_def": "elem_def_corruption_growth",
    "svg_paths": [
      {"d": "M10 16 Q8 13 6 16 Q4 18 3 20", "stroke": "#AA2233", "stroke_width": 1.0, "fill": "none", "opacity": 0.7},
      {"d": "M10 16 Q12 13 15 12 Q18 11 20 13", "stroke": "#AA2233", "stroke_width": 0.9, "fill": "none", "opacity": 0.65},
      {"d": "M20 13 Q22 11 24 12 Q26 14 27 18", "stroke": "#AA2233", "stroke_width": 0.7, "fill": "none", "opacity": 0.55}
    ],
    "variance": 0.25
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Node slot components
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_corruption_growth_node_a',
  'bg_component',
  'Corruption Growth - Node A',
  'Pulsing corruption node at vein intersection.',
  '{
    "slot": "node",
    "parent_def": "elem_def_corruption_growth",
    "svg_paths": [
      {"d": "M13 13 A3 3 0 1 0 19 13 A3 3 0 1 0 13 13 Z", "fill": "#661144", "opacity": 0.9},
      {"d": "M14.5 13 A1.5 1.5 0 1 0 17.5 13 A1.5 1.5 0 1 0 14.5 13 Z", "fill": "#FF3366", "opacity": 0.6}
    ],
    "blend_mode": "screen",
    "variance": 0.2
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_corruption_growth_node_b',
  'bg_component',
  'Corruption Growth - Node B',
  'Smaller satellite node with faint glow.',
  '{
    "slot": "node",
    "parent_def": "elem_def_corruption_growth",
    "svg_paths": [
      {"d": "M8 16 A2 2 0 1 0 12 16 A2 2 0 1 0 8 16 Z", "fill": "#661144", "opacity": 0.8},
      {"d": "M9 16 A1 1 0 1 0 11 16 A1 1 0 1 0 9 16 Z", "fill": "#FF3366", "opacity": 0.4}
    ],
    "blend_mode": "screen",
    "variance": 0.25
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;


-- =============================================================================
-- 6. REALITY COLLAPSE — Reality peeling apart in layers
-- =============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_reality_collapse',
  'bg_element_def',
  'Reality Collapse',
  'Final reality degradation — reality peeling apart in layers. Fragments of space tear away revealing void beneath. Stroke-based tears and bleeds.',
  '{
    "type": "parallax_element",
    "base_size": {"w": 25, "h": 40},
    "anchor": {"x": 0.5, "y": 0.5},
    "slots": {
      "fragment": {"count": 3, "z_order": 2},
      "void_bleed": {"count": 3, "z_order": 0},
      "stutter": {"count": 2, "z_order": 3}
    },
    "palette": {
      "fragment_grey": "#AAAAAA",
      "fragment_grey_variance": 0.3,
      "void_purple": "#6600AA",
      "stutter_white": "#FFFFFF"
    },
    "variance": 0.3
  }',
  '["hellscape", "corruption", "reality", "void", "collapse", "final"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Fragment slot components
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_reality_collapse_fragment_a',
  'bg_component',
  'Reality Collapse - Fragment A',
  'Large angular fragment of reality peeling away.',
  '{
    "slot": "fragment",
    "parent_def": "elem_def_reality_collapse",
    "svg_paths": [
      {"d": "M8 10 L14 8 L18 12 L20 20 L16 25 L10 22 L6 16 Z", "fill": "#AAAAAA", "opacity": 0.7},
      {"d": "M8 10 L14 8 L18 12 L20 20 L16 25 L10 22 L6 16 Z", "stroke": "#888888", "stroke_width": 0.8, "fill": "none", "opacity": 0.9}
    ],
    "color_variance": 0.3,
    "variance": 0.3
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_reality_collapse_fragment_b',
  'bg_component',
  'Reality Collapse - Fragment B',
  'Small sharp shard splitting off.',
  '{
    "slot": "fragment",
    "parent_def": "elem_def_reality_collapse",
    "svg_paths": [
      {"d": "M4 5 L8 3 L10 7 L7 10 L3 8 Z", "fill": "#BBBBBB", "opacity": 0.6},
      {"d": "M4 5 L8 3 L10 7 L7 10 L3 8 Z", "stroke": "#999999", "stroke_width": 0.6, "fill": "none", "opacity": 0.8}
    ],
    "color_variance": 0.3,
    "variance": 0.3
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_reality_collapse_fragment_c',
  'bg_component',
  'Reality Collapse - Fragment C',
  'Thin sliver of reality curling at edges.',
  '{
    "slot": "fragment",
    "parent_def": "elem_def_reality_collapse",
    "svg_paths": [
      {"d": "M15 15 L20 12 L22 18 L21 28 L17 30 L14 24 Z", "fill": "#999999", "opacity": 0.65},
      {"d": "M15 15 L20 12 L22 18 L21 28 L17 30 L14 24 Z", "stroke": "#777777", "stroke_width": 0.7, "fill": "none", "opacity": 0.85}
    ],
    "color_variance": 0.3,
    "variance": 0.25
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Void bleed slot components
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_reality_collapse_void_bleed_a',
  'bg_component',
  'Reality Collapse - Void Bleed A',
  'Deep void bleeding through the tear in reality.',
  '{
    "slot": "void_bleed",
    "parent_def": "elem_def_reality_collapse",
    "svg_paths": [
      {"d": "M6 8 Q10 5 14 9 Q18 6 20 12 Q22 18 18 24 Q14 28 10 25 Q6 20 4 14 Z", "fill": "#6600AA", "opacity": 0.8}
    ],
    "variance": 0.2
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_reality_collapse_void_bleed_b',
  'bg_component',
  'Reality Collapse - Void Bleed B',
  'Narrow void tendril seeping through a crack.',
  '{
    "slot": "void_bleed",
    "parent_def": "elem_def_reality_collapse",
    "svg_paths": [
      {"d": "M12 5 Q14 10 13 18 Q12 25 14 32 Q15 36 13 38", "stroke": "#6600AA", "stroke_width": 2.5, "fill": "none", "opacity": 0.7},
      {"d": "M12 5 Q14 10 13 18 Q12 25 14 32 Q15 36 13 38", "stroke": "#440077", "stroke_width": 1.2, "fill": "none", "opacity": 0.9}
    ],
    "variance": 0.3
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_reality_collapse_void_bleed_c',
  'bg_component',
  'Reality Collapse - Void Bleed C',
  'Expanding void pool consuming the base.',
  '{
    "slot": "void_bleed",
    "parent_def": "elem_def_reality_collapse",
    "svg_paths": [
      {"d": "M5 30 Q8 26 12 28 Q16 25 20 28 Q22 30 20 34 Q16 36 12 35 Q8 34 5 30 Z", "fill": "#6600AA", "opacity": 0.75},
      {"d": "M8 30 Q11 28 14 30 Q17 28 19 30", "stroke": "#440077", "stroke_width": 1.0, "fill": "none", "opacity": 0.6}
    ],
    "variance": 0.25
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Stutter slot components
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_reality_collapse_stutter_a',
  'bg_component',
  'Reality Collapse - Stutter A',
  'Reality stutter — flickering white lines where space glitches.',
  '{
    "slot": "stutter",
    "parent_def": "elem_def_reality_collapse",
    "svg_paths": [
      {"d": "M8 10 L10 8 L11 12 L9 14", "stroke": "#FFFFFF", "stroke_width": 0.6, "fill": "none", "opacity": 0.5},
      {"d": "M14 18 L16 15 L17 20 L15 22", "stroke": "#FFFFFF", "stroke_width": 0.5, "fill": "none", "opacity": 0.4},
      {"d": "M6 25 L8 22 L9 27", "stroke": "#FFFFFF", "stroke_width": 0.4, "fill": "none", "opacity": 0.3}
    ],
    "blend_mode": "screen",
    "variance": 0.3
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_reality_collapse_stutter_b',
  'bg_component',
  'Reality Collapse - Stutter B',
  'Intense stutter burst — concentrated reality fracture.',
  '{
    "slot": "stutter",
    "parent_def": "elem_def_reality_collapse",
    "svg_paths": [
      {"d": "M12 16 L14 12 L15 18 L13 20 Z", "fill": "#FFFFFF", "opacity": 0.3},
      {"d": "M11 14 L16 13", "stroke": "#FFFFFF", "stroke_width": 0.8, "fill": "none", "opacity": 0.6},
      {"d": "M13 11 L12 21", "stroke": "#FFFFFF", "stroke_width": 0.6, "fill": "none", "opacity": 0.45}
    ],
    "blend_mode": "screen",
    "variance": 0.25
  }',
  '["hellscape", "corruption"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

COMMIT;
