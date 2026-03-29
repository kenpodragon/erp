-- ============================================================================
-- Parallax Futuristic/Medical Elements
-- Background element definitions + SVG sub-component variants
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. MEDICAL POD
-- ============================================================================

-- Element definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_medical_pod', 'bg_element_def', 'Medical Pod', 'Stasis/hospice pod with life support displays and glowing viewport',
  '{"type":"element_definition","element_type":"medical_pod","components":{"housing":["elem_medical_pod_housing_a","elem_medical_pod_housing_b","elem_medical_pod_housing_c"],"window":["elem_medical_pod_window_a","elem_medical_pod_window_b"],"display":["elem_medical_pod_display_a","elem_medical_pod_display_b"],"glow":["elem_medical_pod_glow_a","elem_medical_pod_glow_b"]},"anchor":{"x":0.5,"y":1.0},"base_width":20,"base_height":45}',
  '["parallax","futuristic","medical"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Housing variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_medical_pod_housing_a', 'bg_component', 'Pod Housing — Upright Capsule', 'Tall rounded capsule housing with side rails',
  '{"type":"bg_component","slot":"housing","svg_paths":[{"d":"M3 45 L3 8 Q3 0 10 0 Q17 0 17 8 L17 45 Z","fill":"{color}"},{"d":"M1 45 L1 10 L3 10 L3 45 Z","fill":"{color_dark}"},{"d":"M17 10 L19 10 L19 45 L17 45 Z","fill":"{color_dark}"},{"d":"M5 42 L15 42 L15 45 L5 45 Z","fill":"{color_dark}"}],"color_slots":{"color":{"base":"#667788","variance":0.1},"color_dark":{"base":"#4A5566","variance":0.1}}}',
  '["parallax","component","housing","futuristic","medical"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_medical_pod_housing_b', 'bg_component', 'Pod Housing — Angled Slab', 'Angular slab-style pod housing with beveled edges',
  '{"type":"bg_component","slot":"housing","svg_paths":[{"d":"M4 45 L2 10 L6 2 L14 2 L18 10 L16 45 Z","fill":"{color}"},{"d":"M2 10 L6 2 L6 10 Z","fill":"{highlight}"},{"d":"M18 10 L14 2 L14 10 Z","fill":"{highlight}"},{"d":"M4 43 L16 43 L16 45 L4 45 Z","fill":"{color_dark}"}],"color_slots":{"color":{"base":"#667788","variance":0.1},"color_dark":{"base":"#4A5566","variance":0.1},"highlight":{"base":"#7A8899","variance":0.1}}}',
  '["parallax","component","housing","futuristic","medical"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_medical_pod_housing_c', 'bg_component', 'Pod Housing — Rounded Pod', 'Smooth oval pod housing with wide base',
  '{"type":"bg_component","slot":"housing","svg_paths":[{"d":"M2 45 L2 15 Q2 0 10 0 Q18 0 18 15 L18 45 Z","fill":"{color}"},{"d":"M2 15 Q2 0 10 0 Q18 0 18 15 Z","fill":"{highlight}"},{"d":"M3 40 L17 40 L17 45 L3 45 Z","fill":"{color_dark}"}],"color_slots":{"color":{"base":"#667788","variance":0.1},"color_dark":{"base":"#4A5566","variance":0.1},"highlight":{"base":"#778899","variance":0.1}}}',
  '["parallax","component","housing","futuristic","medical"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Window variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_medical_pod_window_a', 'bg_component', 'Pod Window — Oval Viewport', 'Rounded oval viewport with amber tint',
  '{"type":"bg_component","slot":"window","svg_paths":[{"d":"M6 12 Q6 8 10 8 Q14 8 14 12 Q14 22 10 22 Q6 22 6 12 Z","fill":"{color}","opacity":0.6},{"d":"M7 10 Q7 9 10 9 Q12 9 12 11 L12 12 Q10 10 7 10 Z","fill":"{highlight}","opacity":0.4}],"color_slots":{"color":{"base":"#CCAA66","variance":0.15},"highlight":{"base":"#EEDD99","variance":0.1}}}',
  '["parallax","component","window","futuristic","medical"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_medical_pod_window_b', 'bg_component', 'Pod Window — Rectangular Slit', 'Narrow horizontal viewport slit',
  '{"type":"bg_component","slot":"window","svg_paths":[{"d":"M5 14 L15 14 L15 20 L5 20 Z","fill":"{color}","opacity":0.6},{"d":"M5 14 L15 14 L15 15 L5 15 Z","fill":"{highlight}","opacity":0.4}],"color_slots":{"color":{"base":"#CCAA66","variance":0.15},"highlight":{"base":"#EEDD99","variance":0.1}}}',
  '["parallax","component","window","futuristic","medical"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Display variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_medical_pod_display_a', 'bg_component', 'Pod Display — Heartbeat Line', 'Small screen showing vital signs waveform',
  '{"type":"bg_component","slot":"display","svg_paths":[{"d":"M5 28 L8 28 L8 32 L5 32 Z","fill":"{bg}"},{"d":"M5 30 L6 30 L6.5 28.5 L7 31 L7.5 29.5 L8 30","fill":"none","stroke":"{color}","stroke_width":0.5}],"color_slots":{"color":{"base":"#44FF66","variance":0.2},"bg":{"base":"#112211","variance":0.05}}}',
  '["parallax","component","display","futuristic","medical"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_medical_pod_display_b', 'bg_component', 'Pod Display — Data Bars', 'Small screen showing horizontal data bars',
  '{"type":"bg_component","slot":"display","svg_paths":[{"d":"M12 28 L16 28 L16 32 L12 32 Z","fill":"{bg}"},{"d":"M12.5 29 L15 29 L15 29.5 L12.5 29.5 Z","fill":"{color}"},{"d":"M12.5 30 L14 30 L14 30.5 L12.5 30.5 Z","fill":"{color}"},{"d":"M12.5 31 L15.5 31 L15.5 31.5 L12.5 31.5 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#44FF66","variance":0.2},"bg":{"base":"#112211","variance":0.05}}}',
  '["parallax","component","display","futuristic","medical"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Glow variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_medical_pod_glow_a', 'bg_component', 'Pod Glow — Soft Halo', 'Diffuse blue glow around the pod base',
  '{"type":"bg_component","slot":"glow","svg_paths":[{"d":"M0 35 Q10 30 20 35 Q10 40 0 35 Z","fill":"{color}","opacity":0.15}],"color_slots":{"color":{"base":"#4488CC","variance":0.15}}}',
  '["parallax","component","glow","futuristic","medical"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_medical_pod_glow_b', 'bg_component', 'Pod Glow — Vertical Strip', 'Vertical glowing strip along pod edge',
  '{"type":"bg_component","slot":"glow","svg_paths":[{"d":"M1 10 L3 10 L3 40 L1 40 Z","fill":"{color}","opacity":0.2},{"d":"M17 10 L19 10 L19 40 L17 40 Z","fill":"{color}","opacity":0.2}],"color_slots":{"color":{"base":"#4488CC","variance":0.15}}}',
  '["parallax","component","glow","futuristic","medical"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 2. CRUMBLING TOWER
-- ============================================================================

-- Element definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_crumbling_tower', 'bg_element_def', 'Crumbling Tower', 'Decaying futuristic building with structural damage and broken windows',
  '{"type":"element_definition","element_type":"crumbling_tower","components":{"structure":["elem_crumbling_tower_structure_a","elem_crumbling_tower_structure_b","elem_crumbling_tower_structure_c"],"damage":["elem_crumbling_tower_damage_a","elem_crumbling_tower_damage_b","elem_crumbling_tower_damage_c"],"window":["elem_crumbling_tower_window_a","elem_crumbling_tower_window_b"]},"anchor":{"x":0.5,"y":1.0},"base_width":25,"base_height":80}',
  '["parallax","futuristic","medical"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Structure variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_crumbling_tower_structure_a', 'bg_component', 'Tower Structure — Jagged Top', 'Tall slab with irregular broken top edge',
  '{"type":"bg_component","slot":"structure","svg_paths":[{"d":"M3 80 L3 8 L6 3 L10 6 L14 2 L18 5 L22 8 L22 80 Z","fill":"{color}"},{"d":"M3 80 L3 70 L5 70 L5 80 Z","fill":"{color_dark}"},{"d":"M20 80 L20 65 L22 65 L22 80 Z","fill":"{color_dark}"},{"d":"M3 40 L22 40 L22 42 L3 42 Z","fill":"{color_dark}"}],"color_slots":{"color":{"base":"#777777","variance":0.1},"color_dark":{"base":"#555555","variance":0.1}}}',
  '["parallax","component","structure","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_crumbling_tower_structure_b', 'bg_component', 'Tower Structure — Leaning', 'Slightly tilted tower with cracked facade',
  '{"type":"bg_component","slot":"structure","svg_paths":[{"d":"M5 80 L3 5 L7 0 L20 0 L22 5 L20 80 Z","fill":"{color}"},{"d":"M3 5 L7 0 L7 5 Z","fill":"{highlight}"},{"d":"M5 60 L20 60 L20 62 L5 62 Z","fill":"{color_dark}"},{"d":"M5 30 L20 30 L20 32 L5 32 Z","fill":"{color_dark}"}],"color_slots":{"color":{"base":"#777777","variance":0.1},"color_dark":{"base":"#555555","variance":0.1},"highlight":{"base":"#888888","variance":0.1}}}',
  '["parallax","component","structure","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_crumbling_tower_structure_c', 'bg_component', 'Tower Structure — Stepped Ruin', 'Stepped decreasing floors like a broken ziggurat',
  '{"type":"bg_component","slot":"structure","svg_paths":[{"d":"M2 80 L2 20 L8 20 L8 10 L17 10 L17 20 L23 20 L23 80 Z","fill":"{color}"},{"d":"M8 10 L17 10 L17 12 L8 12 Z","fill":"{highlight}"},{"d":"M2 50 L23 50 L23 52 L2 52 Z","fill":"{color_dark}"}],"color_slots":{"color":{"base":"#777777","variance":0.1},"color_dark":{"base":"#555555","variance":0.1},"highlight":{"base":"#888888","variance":0.1}}}',
  '["parallax","component","structure","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Damage variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_crumbling_tower_damage_a', 'bg_component', 'Tower Damage — Corner Chunk', 'Missing corner chunk exposing rebar',
  '{"type":"bg_component","slot":"damage","svg_paths":[{"d":"M3 15 L8 15 L6 20 L3 18 Z","fill":"{color}"},{"d":"M4 16 L5 16 L5 19 L4 19 Z","fill":"{rebar}"},{"d":"M6 15 L7 15 L7 18 L6 18 Z","fill":"{rebar}"}],"color_slots":{"color":{"base":"#884433","variance":0.15},"rebar":{"base":"#664422","variance":0.1}}}',
  '["parallax","component","damage","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_crumbling_tower_damage_b', 'bg_component', 'Tower Damage — Crack Pattern', 'Diagonal cracks across the facade',
  '{"type":"bg_component","slot":"damage","svg_paths":[{"d":"M10 25 L12 30 L11 35 L13 40","fill":"none","stroke":"{color}","stroke_width":0.8},{"d":"M12 30 L15 32","fill":"none","stroke":"{color}","stroke_width":0.5},{"d":"M11 35 L8 37","fill":"none","stroke":"{color}","stroke_width":0.5}],"color_slots":{"color":{"base":"#884433","variance":0.15}}}',
  '["parallax","component","damage","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_crumbling_tower_damage_c', 'bg_component', 'Tower Damage — Rust Stains', 'Dripping rust stains down the facade',
  '{"type":"bg_component","slot":"damage","svg_paths":[{"d":"M7 20 L8 20 L8.5 35 L7.5 38 L6.5 35 Z","fill":"{color}","opacity":0.5},{"d":"M16 15 L17 15 L17.5 28 L16.5 30 L15.5 28 Z","fill":"{color}","opacity":0.5}],"color_slots":{"color":{"base":"#884433","variance":0.15}}}',
  '["parallax","component","damage","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Window variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_crumbling_tower_window_a', 'bg_component', 'Tower Window — Shattered', 'Broken window with jagged glass shards',
  '{"type":"bg_component","slot":"window","svg_paths":[{"d":"M8 22 L14 22 L14 27 L8 27 Z","fill":"{bg}"},{"d":"M8 22 L10 24 L8 25 Z","fill":"{color}","opacity":0.5},{"d":"M14 22 L12 25 L14 27 Z","fill":"{color}","opacity":0.5}],"color_slots":{"color":{"base":"#AACCEE","variance":0.15},"bg":{"base":"#222222","variance":0.05}}}',
  '["parallax","component","window","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_crumbling_tower_window_b', 'bg_component', 'Tower Window — Dark Void', 'Empty window frame with faint glass reflection',
  '{"type":"bg_component","slot":"window","svg_paths":[{"d":"M8 50 L14 50 L14 55 L8 55 Z","fill":"{bg}"},{"d":"M8 50 L14 50 L14 51 L8 51 Z","fill":"{color}","opacity":0.3}],"color_slots":{"color":{"base":"#AACCEE","variance":0.15},"bg":{"base":"#1A1A1A","variance":0.05}}}',
  '["parallax","component","window","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 3. DIGITAL GLYPH
-- ============================================================================

-- Element definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_digital_glyph', 'bg_element_def', 'Digital Glyph', 'Floating holographic text symbols with scan lines and flicker effects',
  '{"type":"element_definition","element_type":"digital_glyph","components":{"glyph":["elem_digital_glyph_glyph_a","elem_digital_glyph_glyph_b","elem_digital_glyph_glyph_c"],"scan_line":["elem_digital_glyph_scan_line_a","elem_digital_glyph_scan_line_b"],"flicker":["elem_digital_glyph_flicker_a","elem_digital_glyph_flicker_b"]},"anchor":{"x":0.5,"y":0.5},"base_width":15,"base_height":12}',
  '["parallax","futuristic","medical"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Glyph variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_digital_glyph_glyph_a', 'bg_component', 'Glyph — Circuit Symbol', 'Angular circuit-like holographic symbol',
  '{"type":"bg_component","slot":"glyph","svg_paths":[{"d":"M2 6 L5 2 L10 2 L13 6 L10 10 L5 10 Z","fill":"none","stroke":"{color}","stroke_width":0.8},{"d":"M5 6 L10 6","fill":"none","stroke":"{color}","stroke_width":0.5},{"d":"M7.5 2 L7.5 10","fill":"none","stroke":"{color}","stroke_width":0.5}],"color_slots":{"color":{"base":"#44FF88","variance":0.2}}}',
  '["parallax","component","glyph","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_digital_glyph_glyph_b', 'bg_component', 'Glyph — Rune Pattern', 'Mystical-tech rune with angular strokes',
  '{"type":"bg_component","slot":"glyph","svg_paths":[{"d":"M3 10 L7.5 1 L12 10","fill":"none","stroke":"{color}","stroke_width":0.8},{"d":"M5 6 L10 6","fill":"none","stroke":"{color}","stroke_width":0.5},{"d":"M7.5 1 L7.5 12","fill":"none","stroke":"{color}","stroke_width":0.5}],"color_slots":{"color":{"base":"#44FF88","variance":0.2}}}',
  '["parallax","component","glyph","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_digital_glyph_glyph_c', 'bg_component', 'Glyph — Data Matrix', 'Grid of small squares forming a data pattern',
  '{"type":"bg_component","slot":"glyph","svg_paths":[{"d":"M3 3 L6 3 L6 5 L3 5 Z","fill":"{color}","opacity":0.8},{"d":"M7 3 L10 3 L10 5 L7 5 Z","fill":"{color}","opacity":0.5},{"d":"M3 7 L6 7 L6 9 L3 9 Z","fill":"{color}","opacity":0.5},{"d":"M7 7 L10 7 L10 9 L7 9 Z","fill":"{color}","opacity":0.8},{"d":"M11 5 L13 5 L13 7 L11 7 Z","fill":"{color}","opacity":0.6}],"color_slots":{"color":{"base":"#44FF88","variance":0.2}}}',
  '["parallax","component","glyph","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Scan line variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_digital_glyph_scan_line_a', 'bg_component', 'Scan Line — Horizontal Sweep', 'Horizontal scan line sweeping across the glyph',
  '{"type":"bg_component","slot":"scan_line","svg_paths":[{"d":"M0 5 L15 5","fill":"none","stroke":"{color}","stroke_width":0.5,"opacity":0.4},{"d":"M0 7 L15 7","fill":"none","stroke":"{color}","stroke_width":0.3,"opacity":0.2}],"color_slots":{"color":{"base":"#44CCFF","variance":0.15}}}',
  '["parallax","component","scan_line","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_digital_glyph_scan_line_b', 'bg_component', 'Scan Line — Grid Overlay', 'Faint grid pattern overlaying the glyph',
  '{"type":"bg_component","slot":"scan_line","svg_paths":[{"d":"M0 3 L15 3","fill":"none","stroke":"{color}","stroke_width":0.3,"opacity":0.2},{"d":"M0 6 L15 6","fill":"none","stroke":"{color}","stroke_width":0.3,"opacity":0.2},{"d":"M0 9 L15 9","fill":"none","stroke":"{color}","stroke_width":0.3,"opacity":0.2},{"d":"M5 0 L5 12","fill":"none","stroke":"{color}","stroke_width":0.3,"opacity":0.15},{"d":"M10 0 L10 12","fill":"none","stroke":"{color}","stroke_width":0.3,"opacity":0.15}],"color_slots":{"color":{"base":"#44CCFF","variance":0.15}}}',
  '["parallax","component","scan_line","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Flicker variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_digital_glyph_flicker_a', 'bg_component', 'Flicker — Edge Distortion', 'Offset ghost copies at glyph edges',
  '{"type":"bg_component","slot":"flicker","svg_paths":[{"d":"M1 5 L4 1 L9 1 L12 5","fill":"none","stroke":"{color}","stroke_width":0.4,"opacity":0.2},{"d":"M3 7 L6 3 L11 3 L14 7","fill":"none","stroke":"{color}","stroke_width":0.4,"opacity":0.15}],"color_slots":{"color":{"base":"#EEEEFF","variance":0.1}}}',
  '["parallax","component","flicker","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_digital_glyph_flicker_b', 'bg_component', 'Flicker — Static Noise', 'Random small rectangles simulating digital noise',
  '{"type":"bg_component","slot":"flicker","svg_paths":[{"d":"M2 4 L3 4 L3 5 L2 5 Z","fill":"{color}","opacity":0.25},{"d":"M8 2 L9 2 L9 3 L8 3 Z","fill":"{color}","opacity":0.2},{"d":"M11 8 L12 8 L12 9 L11 9 Z","fill":"{color}","opacity":0.3},{"d":"M5 9 L6 9 L6 10 L5 10 Z","fill":"{color}","opacity":0.15}],"color_slots":{"color":{"base":"#EEEEFF","variance":0.1}}}',
  '["parallax","component","flicker","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 4. RUSTED PIPE
-- ============================================================================

-- Element definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_rusted_pipe', 'bg_element_def', 'Rusted Pipe', 'Exposed corroded infrastructure piping with joints and drips',
  '{"type":"element_definition","element_type":"rusted_pipe","components":{"pipe":["elem_rusted_pipe_pipe_a","elem_rusted_pipe_pipe_b","elem_rusted_pipe_pipe_c"],"joint":["elem_rusted_pipe_joint_a","elem_rusted_pipe_joint_b"],"drip":["elem_rusted_pipe_drip_a","elem_rusted_pipe_drip_b"]},"anchor":{"x":0.5,"y":1.0},"base_width":50,"base_height":15}',
  '["parallax","futuristic","medical"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Pipe variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_rusted_pipe_pipe_a', 'bg_component', 'Pipe — Straight Run', 'Long horizontal corroded pipe',
  '{"type":"bg_component","slot":"pipe","svg_paths":[{"d":"M0 5 L50 5 L50 10 L0 10 Z","fill":"{color}"},{"d":"M0 5 L50 5 L50 6 L0 6 Z","fill":"{highlight}"},{"d":"M10 7 L18 7 L18 9 L10 9 Z","fill":"{rust}","opacity":0.6},{"d":"M30 6 L40 6 L40 8 L30 8 Z","fill":"{rust}","opacity":0.5}],"color_slots":{"color":{"base":"#885533","variance":0.15},"highlight":{"base":"#997744","variance":0.1},"rust":{"base":"#773322","variance":0.15}}}',
  '["parallax","component","pipe","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_rusted_pipe_pipe_b', 'bg_component', 'Pipe — Sagging Middle', 'Pipe bowing downward in the center',
  '{"type":"bg_component","slot":"pipe","svg_paths":[{"d":"M0 5 Q25 12 50 5 L50 10 Q25 17 0 10 Z","fill":"{color}"},{"d":"M0 5 Q25 12 50 5","fill":"none","stroke":"{highlight}","stroke_width":0.8},{"d":"M15 9 L22 11 L22 13 L15 11 Z","fill":"{rust}","opacity":0.5}],"color_slots":{"color":{"base":"#885533","variance":0.15},"highlight":{"base":"#997744","variance":0.1},"rust":{"base":"#773322","variance":0.15}}}',
  '["parallax","component","pipe","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_rusted_pipe_pipe_c', 'bg_component', 'Pipe — Angled Segment', 'Pipe with a bend running diagonally',
  '{"type":"bg_component","slot":"pipe","svg_paths":[{"d":"M0 3 L20 3 L30 10 L50 10 L50 15 L28 15 L18 8 L0 8 Z","fill":"{color}"},{"d":"M0 3 L20 3 L30 10 L50 10","fill":"none","stroke":"{highlight}","stroke_width":0.8},{"d":"M22 6 L28 10 L28 12 L22 8 Z","fill":"{rust}","opacity":0.5}],"color_slots":{"color":{"base":"#885533","variance":0.15},"highlight":{"base":"#997744","variance":0.1},"rust":{"base":"#773322","variance":0.15}}}',
  '["parallax","component","pipe","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Joint variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_rusted_pipe_joint_a', 'bg_component', 'Pipe Joint — Flange', 'Bolted flange joint connecting pipe sections',
  '{"type":"bg_component","slot":"joint","svg_paths":[{"d":"M23 3 L27 3 L27 12 L23 12 Z","fill":"{color}"},{"d":"M24 4 L24 5 L26 5 L26 4 Z","fill":"{bolt}"},{"d":"M24 10 L24 11 L26 11 L26 10 Z","fill":"{bolt}"}],"color_slots":{"color":{"base":"#554433","variance":0.1},"bolt":{"base":"#666655","variance":0.1}}}',
  '["parallax","component","joint","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_rusted_pipe_joint_b', 'bg_component', 'Pipe Joint — Welded Seam', 'Rough welded connection with bead visible',
  '{"type":"bg_component","slot":"joint","svg_paths":[{"d":"M24 4 L26 4 L26 11 L24 11 Z","fill":"{color}"},{"d":"M23 5 Q25 7 23 10","fill":"none","stroke":"{weld}","stroke_width":0.8},{"d":"M27 5 Q25 7 27 10","fill":"none","stroke":"{weld}","stroke_width":0.8}],"color_slots":{"color":{"base":"#554433","variance":0.1},"weld":{"base":"#665544","variance":0.1}}}',
  '["parallax","component","joint","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Drip variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_rusted_pipe_drip_a', 'bg_component', 'Pipe Drip — Single Drop', 'Single droplet forming at pipe underside',
  '{"type":"bg_component","slot":"drip","svg_paths":[{"d":"M25 10 L25.5 12 Q25 14 24.5 12 Z","fill":"{color}","opacity":0.6},{"d":"M25 14 Q25 15 25 14.5","fill":"{color}","opacity":0.3}],"color_slots":{"color":{"base":"#448844","variance":0.15}}}',
  '["parallax","component","drip","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_rusted_pipe_drip_b', 'bg_component', 'Pipe Drip — Streak', 'Green-tinted moisture streak running down from pipe',
  '{"type":"bg_component","slot":"drip","svg_paths":[{"d":"M15 10 L15.5 10 L16 15 L15 15 Z","fill":"{color}","opacity":0.4},{"d":"M35 10 L35.5 10 L36 13 L35 13 Z","fill":"{color}","opacity":0.35}],"color_slots":{"color":{"base":"#448844","variance":0.15}}}',
  '["parallax","component","drip","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 5. WARNING LIGHT
-- ============================================================================

-- Element definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_warning_light', 'bg_element_def', 'Warning Light', 'Blinking emergency light with housing and light beam',
  '{"type":"element_definition","element_type":"warning_light","components":{"housing":["elem_warning_light_housing_a","elem_warning_light_housing_b"],"light":["elem_warning_light_light_a","elem_warning_light_light_b","elem_warning_light_light_c"],"beam":["elem_warning_light_beam_a","elem_warning_light_beam_b"]},"anchor":{"x":0.5,"y":0.5},"base_width":8,"base_height":8}',
  '["parallax","futuristic","medical"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Housing variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_warning_light_housing_a', 'bg_component', 'Light Housing — Box Mount', 'Square wall-mounted light housing',
  '{"type":"bg_component","slot":"housing","svg_paths":[{"d":"M1 2 L7 2 L7 6 L1 6 Z","fill":"{color}"},{"d":"M1 2 L7 2 L7 3 L1 3 Z","fill":"{highlight}"},{"d":"M0 4 L1 4 L1 5 L0 5 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#444444","variance":0.1},"highlight":{"base":"#555555","variance":0.1}}}',
  '["parallax","component","housing","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_warning_light_housing_b', 'bg_component', 'Light Housing — Pole Cap', 'Cylindrical housing atop a short pole',
  '{"type":"bg_component","slot":"housing","svg_paths":[{"d":"M3 8 L5 8 L5 5 L3 5 Z","fill":"{color}"},{"d":"M1 5 L7 5 L7 3 L1 3 Z","fill":"{color}"},{"d":"M1 3 L7 3 L7 2 L1 2 Z","fill":"{highlight}"}],"color_slots":{"color":{"base":"#444444","variance":0.1},"highlight":{"base":"#555555","variance":0.1}}}',
  '["parallax","component","housing","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Light variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_warning_light_light_a', 'bg_component', 'Light — Steady Red', 'Solid bright red warning light',
  '{"type":"bg_component","slot":"light","svg_paths":[{"d":"M2 3 L6 3 L6 5 L2 5 Z","fill":"{color}"},{"d":"M3 3.5 L5 3.5 L5 4.5 L3 4.5 Z","fill":"{hot}","opacity":0.8}],"color_slots":{"color":{"base":"#FF2200","variance":0.15},"hot":{"base":"#FF6644","variance":0.1}}}',
  '["parallax","component","light","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_warning_light_light_b', 'bg_component', 'Light — Double Blinker', 'Twin red lights side by side',
  '{"type":"bg_component","slot":"light","svg_paths":[{"d":"M2 3.5 Q2 3 2.5 3 L3.5 3 Q4 3 4 3.5 Q4 4 3.5 4 L2.5 4 Q2 4 2 3.5 Z","fill":"{color}"},{"d":"M4.5 3.5 Q4.5 3 5 3 L6 3 Q6.5 3 6.5 3.5 Q6.5 4 6 4 L5 4 Q4.5 4 4.5 3.5 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#FF2200","variance":0.15}}}',
  '["parallax","component","light","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_warning_light_light_c', 'bg_component', 'Light — Rotating Beacon', 'Round beacon-style rotating light',
  '{"type":"bg_component","slot":"light","svg_paths":[{"d":"M2.5 2.5 A1.5 1.5 0 1 1 5.5 2.5 A1.5 1.5 0 1 1 2.5 2.5 Z","fill":"{color}"},{"d":"M3 2 L5 3 L3 4 Z","fill":"{hot}","opacity":0.7}],"color_slots":{"color":{"base":"#FF2200","variance":0.15},"hot":{"base":"#FF6644","variance":0.1}}}',
  '["parallax","component","light","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Beam variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_warning_light_beam_a', 'bg_component', 'Light Beam — Cone Down', 'Downward cone of amber warning light',
  '{"type":"bg_component","slot":"beam","svg_paths":[{"d":"M3 5 L5 5 L7 8 L1 8 Z","fill":"{color}","opacity":0.15},{"d":"M3.5 5 L4.5 5 L5.5 7 L2.5 7 Z","fill":"{color}","opacity":0.1}],"color_slots":{"color":{"base":"#FFAA00","variance":0.15}}}',
  '["parallax","component","beam","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_warning_light_beam_b', 'bg_component', 'Light Beam — Radial Glow', 'Soft radial glow around the light source',
  '{"type":"bg_component","slot":"beam","svg_paths":[{"d":"M0 0 L8 0 L8 8 L0 8 Z","fill":"{color}","opacity":0.08},{"d":"M1 1 L7 1 L7 7 L1 7 Z","fill":"{color}","opacity":0.06}],"color_slots":{"color":{"base":"#FFAA00","variance":0.15}}}',
  '["parallax","component","beam","futuristic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

COMMIT;
