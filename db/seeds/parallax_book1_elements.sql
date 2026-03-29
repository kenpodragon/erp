-- ============================================================================
-- Book 1 Sci-Fi Element Definitions & Components (Phase 3)
-- Parallax background sub-component data for dystopian megacity scenes
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. NEON SIGN — glowing signs on buildings (35x15)
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_def_neon_sign', 'bg_element_def', 'Neon Sign', 'Glowing advertisement signs mounted on building facades',
  '{"type":"element_definition","element_type":"neon_sign","components":{"frame":["elem_neon_sign_frame_a","elem_neon_sign_frame_b","elem_neon_sign_frame_c"],"text":["elem_neon_sign_text_a","elem_neon_sign_text_b"],"glow":["elem_neon_sign_glow_a","elem_neon_sign_glow_b"]},"anchor":{"x":0.5,"y":1.0},"base_width":35,"base_height":15}',
  '["book1","sci-fi","neon","sign","building"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- frame variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_neon_sign_frame_a', 'bg_component', 'Neon Sign Frame A', 'Rectangular metal frame with rounded corners',
  '{"type":"bg_component","slot":"frame","svg_paths":[{"d":"M2 0 Q0 0 0 2 L0 13 Q0 15 2 15 L33 15 Q35 15 35 13 L35 2 Q35 0 33 0 Z","fill":"{color}"},{"d":"M1 1 L34 1 L34 14 L1 14 Z","fill":"{color_dark}"}],"color_slots":{"color":{"base":"#555555","variance":0.1},"color_dark":{"base":"#222222","variance":0.05}}}',
  '["book1","sci-fi","neon","frame"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_neon_sign_frame_b', 'bg_component', 'Neon Sign Frame B', 'Angular industrial frame with bracket mounts',
  '{"type":"bg_component","slot":"frame","svg_paths":[{"d":"M0 2 L5 0 L30 0 L35 2 L35 13 L30 15 L5 15 L0 13 Z","fill":"{color}"},{"d":"M2 2 L33 2 L33 13 L2 13 Z","fill":"{color_dark}"}],"color_slots":{"color":{"base":"#4A4A4A","variance":0.1},"color_dark":{"base":"#1A1A1A","variance":0.05}}}',
  '["book1","sci-fi","neon","frame"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_neon_sign_frame_c', 'bg_component', 'Neon Sign Frame C', 'Slim border frame with neon trim accent',
  '{"type":"bg_component","slot":"frame","svg_paths":[{"d":"M0 0 L35 0 L35 15 L0 15 Z","fill":"{color_dark}"},{"d":"M0.5 0.5 L34.5 0.5 L34.5 14.5 L0.5 14.5 Z","fill":"none","stroke":"{neon}","stroke-width":"0.8"}],"color_slots":{"color_dark":{"base":"#181818","variance":0.05},"neon":{"base":"#00FFAA","variance":0.15}}}',
  '["book1","sci-fi","neon","frame"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- text variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_neon_sign_text_a', 'bg_component', 'Neon Sign Text A', 'Horizontal neon bar lines suggesting text',
  '{"type":"bg_component","slot":"text","svg_paths":[{"d":"M5 5 L25 5","fill":"none","stroke":"{neon}","stroke-width":"1.2"},{"d":"M8 8 L20 8","fill":"none","stroke":"{neon}","stroke-width":"0.8"},{"d":"M10 11 L22 11","fill":"none","stroke":"{neon}","stroke-width":"0.6"}],"color_slots":{"neon":{"base":"#FF3366","variance":0.2}}}',
  '["book1","sci-fi","neon","text"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_neon_sign_text_b', 'bg_component', 'Neon Sign Text B', 'Block character shapes in neon',
  '{"type":"bg_component","slot":"text","svg_paths":[{"d":"M6 4 L10 4 L10 7 L6 7 Z","fill":"{neon}"},{"d":"M12 4 L16 4 L16 7 L12 7 Z","fill":"{neon}"},{"d":"M18 4 L24 4 L24 7 L18 7 Z","fill":"{neon}"},{"d":"M8 9 L20 9 L20 12 L8 12 Z","fill":"{neon_alt}"}],"color_slots":{"neon":{"base":"#4488FF","variance":0.15},"neon_alt":{"base":"#00FFAA","variance":0.15}}}',
  '["book1","sci-fi","neon","text"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- glow variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_neon_sign_glow_a', 'bg_component', 'Neon Sign Glow A', 'Soft radial glow behind sign',
  '{"type":"bg_component","slot":"glow","svg_paths":[{"d":"M5 3 Q17.5 -2 30 3 Q37 7.5 30 12 Q17.5 17 5 12 Q-2 7.5 5 3 Z","fill":"{glow}","opacity":"0.25"}],"color_slots":{"glow":{"base":"#FF3366","variance":0.2}}}',
  '["book1","sci-fi","neon","glow"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_neon_sign_glow_b', 'bg_component', 'Neon Sign Glow B', 'Vertical light spill from sign edges',
  '{"type":"bg_component","slot":"glow","svg_paths":[{"d":"M3 0 L7 0 L5 15 L1 15 Z","fill":"{glow}","opacity":"0.15"},{"d":"M28 0 L32 0 L34 15 L30 15 Z","fill":"{glow}","opacity":"0.15"}],"color_slots":{"glow":{"base":"#4488FF","variance":0.2}}}',
  '["book1","sci-fi","neon","glow"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 2. FIRE ESCAPE — metal stairways on buildings (15x60)
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_def_fire_escape', 'bg_element_def', 'Fire Escape', 'Metal emergency stairways bolted to building exteriors',
  '{"type":"element_definition","element_type":"fire_escape","components":{"rail":["elem_fire_escape_rail_a","elem_fire_escape_rail_b","elem_fire_escape_rail_c"],"steps":["elem_fire_escape_steps_a","elem_fire_escape_steps_b"],"platform":["elem_fire_escape_platform_a","elem_fire_escape_platform_b"]},"anchor":{"x":0.5,"y":0.0},"base_width":15,"base_height":60}',
  '["book1","sci-fi","fire_escape","building","metal"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- rail variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_fire_escape_rail_a', 'bg_component', 'Fire Escape Rail A', 'Straight vertical rails with cross braces',
  '{"type":"bg_component","slot":"rail","svg_paths":[{"d":"M1 0 L1 60","fill":"none","stroke":"{color}","stroke-width":"1"},{"d":"M14 0 L14 60","fill":"none","stroke":"{color}","stroke-width":"1"},{"d":"M1 15 L14 15 M1 30 L14 30 M1 45 L14 45","fill":"none","stroke":"{color}","stroke-width":"0.6"}],"color_slots":{"color":{"base":"#555555","variance":0.1}}}',
  '["book1","sci-fi","fire_escape","rail"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_fire_escape_rail_b', 'bg_component', 'Fire Escape Rail B', 'Diagonal-braced rails with rust patches',
  '{"type":"bg_component","slot":"rail","svg_paths":[{"d":"M2 0 L2 60","fill":"none","stroke":"{color}","stroke-width":"1.2"},{"d":"M13 0 L13 60","fill":"none","stroke":"{color}","stroke-width":"1.2"},{"d":"M2 10 L13 20 M13 20 L2 30 M2 30 L13 40 M13 40 L2 50","fill":"none","stroke":"{color_dark}","stroke-width":"0.5"}],"color_slots":{"color":{"base":"#665544","variance":0.15},"color_dark":{"base":"#443322","variance":0.1}}}',
  '["book1","sci-fi","fire_escape","rail"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_fire_escape_rail_c', 'bg_component', 'Fire Escape Rail C', 'Thin pipe rails with horizontal bars',
  '{"type":"bg_component","slot":"rail","svg_paths":[{"d":"M0 0 L0 60","fill":"none","stroke":"{color}","stroke-width":"0.8"},{"d":"M15 0 L15 60","fill":"none","stroke":"{color}","stroke-width":"0.8"},{"d":"M0 10 L15 10 M0 20 L15 20 M0 30 L15 30 M0 40 L15 40 M0 50 L15 50","fill":"none","stroke":"{color}","stroke-width":"0.4"}],"color_slots":{"color":{"base":"#4A4A4A","variance":0.1}}}',
  '["book1","sci-fi","fire_escape","rail"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- steps variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_fire_escape_steps_a', 'bg_component', 'Fire Escape Steps A', 'Evenly spaced flat treads',
  '{"type":"bg_component","slot":"steps","svg_paths":[{"d":"M2 5 L13 5 M2 10 L13 10 M2 15 L13 15 M2 20 L13 20 M2 25 L13 25 M2 30 L13 30 M2 35 L13 35 M2 40 L13 40 M2 45 L13 45 M2 50 L13 50 M2 55 L13 55","fill":"none","stroke":"{color}","stroke-width":"0.8"}],"color_slots":{"color":{"base":"#666666","variance":0.1}}}',
  '["book1","sci-fi","fire_escape","steps"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_fire_escape_steps_b', 'bg_component', 'Fire Escape Steps B', 'Zigzag stairway pattern between platforms',
  '{"type":"bg_component","slot":"steps","svg_paths":[{"d":"M3 2 L12 8 L3 14 L12 20 L3 26 L12 32 L3 38 L12 44 L3 50 L12 56","fill":"none","stroke":"{color}","stroke-width":"0.7"}],"color_slots":{"color":{"base":"#5A5A5A","variance":0.1}}}',
  '["book1","sci-fi","fire_escape","steps"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- platform variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_fire_escape_platform_a', 'bg_component', 'Fire Escape Platform A', 'Solid rectangular landing platforms',
  '{"type":"bg_component","slot":"platform","svg_paths":[{"d":"M0 14 L15 14 L15 16 L0 16 Z","fill":"{color}"},{"d":"M0 29 L15 29 L15 31 L0 31 Z","fill":"{color}"},{"d":"M0 44 L15 44 L15 46 L0 46 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#4A4A4A","variance":0.1}}}',
  '["book1","sci-fi","fire_escape","platform"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_fire_escape_platform_b', 'bg_component', 'Fire Escape Platform B', 'Grated platforms with visible gaps',
  '{"type":"bg_component","slot":"platform","svg_paths":[{"d":"M0 14 L15 14 L15 16.5 L0 16.5 Z","fill":"{color}","opacity":"0.7"},{"d":"M0 29 L15 29 L15 31.5 L0 31.5 Z","fill":"{color}","opacity":"0.7"},{"d":"M0 44 L15 44 L15 46.5 L0 46.5 Z","fill":"{color}","opacity":"0.7"}],"color_slots":{"color":{"base":"#555555","variance":0.1}}}',
  '["book1","sci-fi","fire_escape","platform"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 3. SURVEILLANCE CAMERA — mounted cameras (12x10)
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_def_surveillance_camera', 'bg_element_def', 'Surveillance Camera', 'Corporate surveillance cameras mounted on walls and poles',
  '{"type":"element_definition","element_type":"surveillance_camera","components":{"mount":["elem_surveillance_camera_mount_a","elem_surveillance_camera_mount_b"],"body":["elem_surveillance_camera_body_a","elem_surveillance_camera_body_b","elem_surveillance_camera_body_c"],"lens":["elem_surveillance_camera_lens_a","elem_surveillance_camera_lens_b"]},"anchor":{"x":0.0,"y":0.5},"base_width":12,"base_height":10}',
  '["book1","sci-fi","surveillance","camera","corporate"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- mount variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_surveillance_camera_mount_a', 'bg_component', 'Camera Mount A', 'L-shaped wall bracket',
  '{"type":"bg_component","slot":"mount","svg_paths":[{"d":"M0 2 L0 0 L2 0 L2 4 L4 4 L4 6 L2 6 L2 5 L0 5 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#444444","variance":0.1}}}',
  '["book1","sci-fi","surveillance","mount"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_surveillance_camera_mount_b', 'bg_component', 'Camera Mount B', 'Articulated arm mount',
  '{"type":"bg_component","slot":"mount","svg_paths":[{"d":"M0 1 L0 0 L1.5 0 L1.5 3 L3 2.5 L4 4 L4 6 L3 7.5 L1.5 7 L1.5 10 L0 10 L0 9 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#3A3A3A","variance":0.1}}}',
  '["book1","sci-fi","surveillance","mount"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- body variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_surveillance_camera_body_a', 'bg_component', 'Camera Body A', 'Compact dome camera',
  '{"type":"bg_component","slot":"body","svg_paths":[{"d":"M4 3 A4 3 0 0 1 10 3 L10 7 A4 3 0 0 1 4 7 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#333333","variance":0.1}}}',
  '["book1","sci-fi","surveillance","body"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_surveillance_camera_body_b', 'bg_component', 'Camera Body B', 'Cylindrical bullet camera',
  '{"type":"bg_component","slot":"body","svg_paths":[{"d":"M3 3.5 L10 3.5 Q12 5 10 6.5 L3 6.5 Q1 5 3 3.5 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#2A2A2A","variance":0.1}}}',
  '["book1","sci-fi","surveillance","body"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_surveillance_camera_body_c', 'bg_component', 'Camera Body C', 'Angular box camera with fins',
  '{"type":"bg_component","slot":"body","svg_paths":[{"d":"M3 3 L11 3 L12 5 L11 7 L3 7 L2 5 Z","fill":"{color}"},{"d":"M3 2 L5 2 L5 3 L3 3 Z","fill":"{color_dark}"},{"d":"M3 7 L5 8 L3 8 Z","fill":"{color_dark}"}],"color_slots":{"color":{"base":"#383838","variance":0.1},"color_dark":{"base":"#222222","variance":0.05}}}',
  '["book1","sci-fi","surveillance","body"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- lens variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_surveillance_camera_lens_a', 'bg_component', 'Camera Lens A', 'Small red indicator lens',
  '{"type":"bg_component","slot":"lens","svg_paths":[{"d":"M9 4.5 A1 1 0 1 1 9 4.501 Z","fill":"{neon}"},{"d":"M9 4.5 A1.8 1.8 0 1 1 9 4.501 Z","fill":"{neon}","opacity":"0.2"}],"color_slots":{"neon":{"base":"#FF3333","variance":0.1}}}',
  '["book1","sci-fi","surveillance","lens"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_surveillance_camera_lens_b', 'bg_component', 'Camera Lens B', 'Wide blue scanning lens',
  '{"type":"bg_component","slot":"lens","svg_paths":[{"d":"M8 4 L12 5 L8 6 Z","fill":"{neon}"},{"d":"M8 3.5 L12 5 L8 6.5 Z","fill":"{neon}","opacity":"0.15"}],"color_slots":{"neon":{"base":"#4488FF","variance":0.15}}}',
  '["book1","sci-fi","surveillance","lens"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 4. MONITOR BANK — rows of screens (40x30)
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_def_monitor_bank', 'bg_element_def', 'Monitor Bank', 'Rows of surveillance or data monitors',
  '{"type":"element_definition","element_type":"monitor_bank","components":{"frame":["elem_monitor_bank_frame_a","elem_monitor_bank_frame_b","elem_monitor_bank_frame_c"],"screen":["elem_monitor_bank_screen_a","elem_monitor_bank_screen_b","elem_monitor_bank_screen_c"],"stand":["elem_monitor_bank_stand_a","elem_monitor_bank_stand_b"]},"anchor":{"x":0.5,"y":1.0},"base_width":40,"base_height":30}',
  '["book1","sci-fi","monitor","screen","corporate"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- frame variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_monitor_bank_frame_a', 'bg_component', 'Monitor Frame A', 'Grid of rectangular bezels 3x2',
  '{"type":"bg_component","slot":"frame","svg_paths":[{"d":"M1 1 L13 1 L13 13 L1 13 Z","fill":"{color}"},{"d":"M15 1 L27 1 L27 13 L15 13 Z","fill":"{color}"},{"d":"M29 1 L39 1 L39 13 L29 13 Z","fill":"{color}"},{"d":"M1 15 L13 15 L13 27 L1 27 Z","fill":"{color}"},{"d":"M15 15 L27 15 L27 27 L15 27 Z","fill":"{color}"},{"d":"M29 15 L39 15 L39 27 L29 27 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#333333","variance":0.08}}}',
  '["book1","sci-fi","monitor","frame"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_monitor_bank_frame_b', 'bg_component', 'Monitor Frame B', 'Wide-screen single row of 4 monitors',
  '{"type":"bg_component","slot":"frame","svg_paths":[{"d":"M0 5 L9 5 L9 25 L0 25 Z","fill":"{color}"},{"d":"M11 5 L20 5 L20 25 L11 25 Z","fill":"{color}"},{"d":"M22 5 L31 5 L31 25 L22 25 Z","fill":"{color}"},{"d":"M33 5 L40 5 L40 25 L33 25 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#2E2E2E","variance":0.08}}}',
  '["book1","sci-fi","monitor","frame"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_monitor_bank_frame_c', 'bg_component', 'Monitor Frame C', 'Stacked asymmetric screens',
  '{"type":"bg_component","slot":"frame","svg_paths":[{"d":"M2 2 L25 2 L25 16 L2 16 Z","fill":"{color}"},{"d":"M27 2 L38 2 L38 10 L27 10 Z","fill":"{color}"},{"d":"M27 12 L38 12 L38 20 L27 20 Z","fill":"{color}"},{"d":"M2 18 L18 18 L18 28 L2 28 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#383838","variance":0.08}}}',
  '["book1","sci-fi","monitor","frame"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- screen variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_monitor_bank_screen_a', 'bg_component', 'Monitor Screen A', 'Blue data readout glow',
  '{"type":"bg_component","slot":"screen","svg_paths":[{"d":"M2 2 L12 2 L12 12 L2 12 Z","fill":"{glow}","opacity":"0.6"},{"d":"M16 2 L26 2 L26 12 L16 12 Z","fill":"{glow}","opacity":"0.4"},{"d":"M30 2 L38 2 L38 12 L30 12 Z","fill":"{glow}","opacity":"0.7"},{"d":"M2 16 L12 16 L12 26 L2 26 Z","fill":"{glow}","opacity":"0.5"},{"d":"M16 16 L26 16 L26 26 L16 26 Z","fill":"{glow}","opacity":"0.3"}],"color_slots":{"glow":{"base":"#4488FF","variance":0.2}}}',
  '["book1","sci-fi","monitor","screen"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_monitor_bank_screen_b', 'bg_component', 'Monitor Screen B', 'Green terminal display',
  '{"type":"bg_component","slot":"screen","svg_paths":[{"d":"M2 2 L12 2 L12 12 L2 12 Z","fill":"{glow}","opacity":"0.5"},{"d":"M16 2 L26 2 L26 12 L16 12 Z","fill":"{glow}","opacity":"0.7"},{"d":"M30 2 L38 2 L38 12 L30 12 Z","fill":"{glow}","opacity":"0.4"},{"d":"M2 16 L12 16 L12 26 L2 26 Z","fill":"{glow}","opacity":"0.6"},{"d":"M16 16 L26 16 L26 26 L16 26 Z","fill":"{glow}","opacity":"0.5"}],"color_slots":{"glow":{"base":"#00FFAA","variance":0.2}}}',
  '["book1","sci-fi","monitor","screen"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_monitor_bank_screen_c', 'bg_component', 'Monitor Screen C', 'Mixed static and active screens',
  '{"type":"bg_component","slot":"screen","svg_paths":[{"d":"M2 2 L12 2 L12 12 L2 12 Z","fill":"{glow}","opacity":"0.8"},{"d":"M16 2 L26 2 L26 12 L16 12 Z","fill":"{off}","opacity":"0.3"},{"d":"M30 2 L38 2 L38 12 L30 12 Z","fill":"{glow}","opacity":"0.6"},{"d":"M2 16 L12 16 L12 26 L2 26 Z","fill":"{off}","opacity":"0.2"},{"d":"M16 16 L26 16 L26 26 L16 26 Z","fill":"{glow}","opacity":"0.7"}],"color_slots":{"glow":{"base":"#FF3366","variance":0.15},"off":{"base":"#222233","variance":0.05}}}',
  '["book1","sci-fi","monitor","screen"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- stand variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_monitor_bank_stand_a', 'bg_component', 'Monitor Stand A', 'Simple desk surface',
  '{"type":"bg_component","slot":"stand","svg_paths":[{"d":"M0 28 L40 28 L40 30 L0 30 Z","fill":"{color}"},{"d":"M5 30 L8 30 L8 30 L5 30 Z","fill":"{color_dark}"},{"d":"M32 30 L35 30 L35 30 L32 30 Z","fill":"{color_dark}"}],"color_slots":{"color":{"base":"#444444","variance":0.1},"color_dark":{"base":"#333333","variance":0.05}}}',
  '["book1","sci-fi","monitor","stand"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_monitor_bank_stand_b', 'bg_component', 'Monitor Stand B', 'Wall-mounted rack arms',
  '{"type":"bg_component","slot":"stand","svg_paths":[{"d":"M5 0 L7 0 L7 30 L5 30 Z","fill":"{color}"},{"d":"M33 0 L35 0 L35 30 L33 30 Z","fill":"{color}"},{"d":"M7 5 L33 5 L33 6 L7 6 Z","fill":"{color_dark}"}],"color_slots":{"color":{"base":"#3A3A3A","variance":0.1},"color_dark":{"base":"#2A2A2A","variance":0.05}}}',
  '["book1","sci-fi","monitor","stand"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 5. SATELLITE DISH — rooftop dishes (25x25)
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_def_satellite_dish', 'bg_element_def', 'Satellite Dish', 'Communication dishes on rooftops and towers',
  '{"type":"element_definition","element_type":"satellite_dish","components":{"dish":["elem_satellite_dish_dish_a","elem_satellite_dish_dish_b","elem_satellite_dish_dish_c"],"arm":["elem_satellite_dish_arm_a","elem_satellite_dish_arm_b"],"base_mount":["elem_satellite_dish_base_mount_a","elem_satellite_dish_base_mount_b"]},"anchor":{"x":0.5,"y":1.0},"base_width":25,"base_height":25}',
  '["book1","sci-fi","satellite","dish","rooftop","communication"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- dish variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_satellite_dish_dish_a', 'bg_component', 'Satellite Dish A', 'Classic parabolic dish shape',
  '{"type":"bg_component","slot":"dish","svg_paths":[{"d":"M2 12 Q12.5 0 23 12 L20 14 Q12.5 5 5 14 Z","fill":"{color}"},{"d":"M4 13 Q12.5 4 21 13","fill":"none","stroke":"{highlight}","stroke-width":"0.5"}],"color_slots":{"color":{"base":"#555555","variance":0.1},"highlight":{"base":"#777777","variance":0.1}}}',
  '["book1","sci-fi","satellite","dish"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_satellite_dish_dish_b', 'bg_component', 'Satellite Dish B', 'Flat panel array dish',
  '{"type":"bg_component","slot":"dish","svg_paths":[{"d":"M3 8 L22 8 L20 15 L5 15 Z","fill":"{color}"},{"d":"M5 9 L20 9 M5 11 L20 11 M5 13 L20 13","fill":"none","stroke":"{color_dark}","stroke-width":"0.4"}],"color_slots":{"color":{"base":"#4A4A4A","variance":0.1},"color_dark":{"base":"#333333","variance":0.08}}}',
  '["book1","sci-fi","satellite","dish"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_satellite_dish_dish_c', 'bg_component', 'Satellite Dish C', 'Hexagonal mesh dish',
  '{"type":"bg_component","slot":"dish","svg_paths":[{"d":"M12.5 3 L22 8 L22 15 L12.5 18 L3 15 L3 8 Z","fill":"{color}"},{"d":"M7 8 L18 8 M5 11 L20 11 M7 14 L18 14","fill":"none","stroke":"{highlight}","stroke-width":"0.3"}],"color_slots":{"color":{"base":"#505050","variance":0.1},"highlight":{"base":"#6A6A6A","variance":0.1}}}',
  '["book1","sci-fi","satellite","dish"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- arm variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_satellite_dish_arm_a', 'bg_component', 'Satellite Arm A', 'Straight feed arm with receiver',
  '{"type":"bg_component","slot":"arm","svg_paths":[{"d":"M12.5 13 L12.5 6","fill":"none","stroke":"{color}","stroke-width":"0.8"},{"d":"M11 5 L14 5 L14 7 L11 7 Z","fill":"{neon}"}],"color_slots":{"color":{"base":"#444444","variance":0.1},"neon":{"base":"#FF3333","variance":0.15}}}',
  '["book1","sci-fi","satellite","arm"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_satellite_dish_arm_b', 'bg_component', 'Satellite Arm B', 'Triple-strut support arm',
  '{"type":"bg_component","slot":"arm","svg_paths":[{"d":"M8 14 L12.5 7 M17 14 L12.5 7 M12.5 14 L12.5 7","fill":"none","stroke":"{color}","stroke-width":"0.5"},{"d":"M11.5 6 L13.5 6 L13.5 8 L11.5 8 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#3A3A3A","variance":0.1}}}',
  '["book1","sci-fi","satellite","arm"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- base_mount variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_satellite_dish_base_mount_a', 'bg_component', 'Satellite Base A', 'Tripod mount base',
  '{"type":"bg_component","slot":"base_mount","svg_paths":[{"d":"M12 15 L12 23","fill":"none","stroke":"{color}","stroke-width":"1.2"},{"d":"M7 23 L17 23 L18 25 L6 25 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#444444","variance":0.1}}}',
  '["book1","sci-fi","satellite","base"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_satellite_dish_base_mount_b', 'bg_component', 'Satellite Base B', 'Concrete pedestal mount',
  '{"type":"bg_component","slot":"base_mount","svg_paths":[{"d":"M11 15 L14 15 L14 21 L11 21 Z","fill":"{color}"},{"d":"M8 21 L17 21 L17 25 L8 25 Z","fill":"{color_dark}"}],"color_slots":{"color":{"base":"#4A4A4A","variance":0.1},"color_dark":{"base":"#555555","variance":0.1}}}',
  '["book1","sci-fi","satellite","base"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 6. HOSPICE POD — medical stasis pods (20x35)
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_def_hospice_pod', 'bg_element_def', 'Hospice Pod', 'Medical stasis pods for patient containment and healing',
  '{"type":"element_definition","element_type":"hospice_pod","components":{"shell":["elem_hospice_pod_shell_a","elem_hospice_pod_shell_b","elem_hospice_pod_shell_c"],"window":["elem_hospice_pod_window_a","elem_hospice_pod_window_b"],"tubing":["elem_hospice_pod_tubing_a","elem_hospice_pod_tubing_b"]},"anchor":{"x":0.5,"y":1.0},"base_width":20,"base_height":35}',
  '["book1","sci-fi","hospice","pod","medical"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- shell variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_hospice_pod_shell_a', 'bg_component', 'Hospice Shell A', 'Rounded capsule shell with seam lines',
  '{"type":"bg_component","slot":"shell","svg_paths":[{"d":"M3 5 Q3 0 10 0 Q17 0 17 5 L17 30 Q17 35 10 35 Q3 35 3 30 Z","fill":"{color}"},{"d":"M4 10 L16 10 M4 20 L16 20","fill":"none","stroke":"{color_dark}","stroke-width":"0.4"}],"color_slots":{"color":{"base":"#444455","variance":0.1},"color_dark":{"base":"#333344","variance":0.05}}}',
  '["book1","sci-fi","hospice","shell"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_hospice_pod_shell_b', 'bg_component', 'Hospice Shell B', 'Angular coffin-like shell with rivets',
  '{"type":"bg_component","slot":"shell","svg_paths":[{"d":"M4 2 L16 2 L18 6 L18 29 L16 33 L4 33 L2 29 L2 6 Z","fill":"{color}"},{"d":"M4 4 A0.5 0.5 0 1 1 4.01 4 M16 4 A0.5 0.5 0 1 1 16.01 4 M4 31 A0.5 0.5 0 1 1 4.01 31 M16 31 A0.5 0.5 0 1 1 16.01 31","fill":"{highlight}"}],"color_slots":{"color":{"base":"#3A3A4A","variance":0.1},"highlight":{"base":"#666677","variance":0.1}}}',
  '["book1","sci-fi","hospice","shell"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_hospice_pod_shell_c', 'bg_component', 'Hospice Shell C', 'Sleek modern pod with light strip',
  '{"type":"bg_component","slot":"shell","svg_paths":[{"d":"M3 3 Q10 0 17 3 L17 32 Q10 35 3 32 Z","fill":"{color}"},{"d":"M10 1 L10 34","fill":"none","stroke":"{neon}","stroke-width":"0.6","opacity":"0.5"}],"color_slots":{"color":{"base":"#404050","variance":0.1},"neon":{"base":"#00FFAA","variance":0.15}}}',
  '["book1","sci-fi","hospice","shell"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- window variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_hospice_pod_window_a', 'bg_component', 'Hospice Window A', 'Oval viewport with frost effect',
  '{"type":"bg_component","slot":"window","svg_paths":[{"d":"M7 8 Q10 5 13 8 Q14 12 13 16 Q10 19 7 16 Q6 12 7 8 Z","fill":"{glass}","opacity":"0.5"},{"d":"M8 9 Q10 7 12 9","fill":"none","stroke":"#FFFFFF","stroke-width":"0.3","opacity":"0.4"}],"color_slots":{"glass":{"base":"#88CCEE","variance":0.15}}}',
  '["book1","sci-fi","hospice","window"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_hospice_pod_window_b', 'bg_component', 'Hospice Window B', 'Rectangular slit viewport',
  '{"type":"bg_component","slot":"window","svg_paths":[{"d":"M6 10 L14 10 L14 18 L6 18 Z","fill":"{glass}","opacity":"0.4"},{"d":"M6.5 10.5 L13.5 10.5 L13.5 17.5 L6.5 17.5 Z","fill":"none","stroke":"{highlight}","stroke-width":"0.3"}],"color_slots":{"glass":{"base":"#88BBDD","variance":0.15},"highlight":{"base":"#AADDFF","variance":0.1}}}',
  '["book1","sci-fi","hospice","window"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- tubing variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_hospice_pod_tubing_a', 'bg_component', 'Hospice Tubing A', 'Coiled tubes from top and bottom',
  '{"type":"bg_component","slot":"tubing","svg_paths":[{"d":"M5 0 Q2 3 5 5 Q8 7 5 10","fill":"none","stroke":"{color}","stroke-width":"0.8"},{"d":"M15 0 Q18 2 15 4","fill":"none","stroke":"{color}","stroke-width":"0.8"},{"d":"M8 32 Q5 33 8 35","fill":"none","stroke":"{neon}","stroke-width":"0.6"}],"color_slots":{"color":{"base":"#555566","variance":0.1},"neon":{"base":"#00FFAA","variance":0.2}}}',
  '["book1","sci-fi","hospice","tubing"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_hospice_pod_tubing_b', 'bg_component', 'Hospice Tubing B', 'Straight clinical lines with drip nodes',
  '{"type":"bg_component","slot":"tubing","svg_paths":[{"d":"M3 5 L0 5 L0 0","fill":"none","stroke":"{color}","stroke-width":"0.7"},{"d":"M17 8 L20 8 L20 0","fill":"none","stroke":"{color}","stroke-width":"0.7"},{"d":"M0 2 A0.8 0.8 0 1 1 0.01 2","fill":"{neon}"},{"d":"M20 3 A0.8 0.8 0 1 1 20.01 3","fill":"{neon}"}],"color_slots":{"color":{"base":"#606070","variance":0.1},"neon":{"base":"#FF3366","variance":0.15}}}',
  '["book1","sci-fi","hospice","tubing"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 7. CONDUIT PIPE — industrial piping (45x12)
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_def_conduit_pipe', 'bg_element_def', 'Conduit Pipe', 'Industrial piping running along walls and ceilings',
  '{"type":"element_definition","element_type":"conduit_pipe","components":{"pipe":["elem_conduit_pipe_pipe_a","elem_conduit_pipe_pipe_b","elem_conduit_pipe_pipe_c"],"joint":["elem_conduit_pipe_joint_a","elem_conduit_pipe_joint_b","elem_conduit_pipe_joint_c"],"valve":["elem_conduit_pipe_valve_a","elem_conduit_pipe_valve_b"]},"anchor":{"x":0.5,"y":0.5},"base_width":45,"base_height":12}',
  '["book1","sci-fi","conduit","pipe","industrial"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- pipe variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_conduit_pipe_pipe_a', 'bg_component', 'Conduit Pipe A', 'Thick main pipe with highlight',
  '{"type":"bg_component","slot":"pipe","svg_paths":[{"d":"M0 3 L45 3 L45 9 L0 9 Z","fill":"{color}"},{"d":"M0 4 L45 4","fill":"none","stroke":"{highlight}","stroke-width":"0.5"}],"color_slots":{"color":{"base":"#4A4A4A","variance":0.1},"highlight":{"base":"#666666","variance":0.1}}}',
  '["book1","sci-fi","conduit","pipe"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_conduit_pipe_pipe_b', 'bg_component', 'Conduit Pipe B', 'Twin parallel pipes',
  '{"type":"bg_component","slot":"pipe","svg_paths":[{"d":"M0 2 L45 2 L45 5 L0 5 Z","fill":"{color}"},{"d":"M0 7 L45 7 L45 10 L0 10 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#555555","variance":0.1}}}',
  '["book1","sci-fi","conduit","pipe"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_conduit_pipe_pipe_c', 'bg_component', 'Conduit Pipe C', 'Corrugated flexible conduit',
  '{"type":"bg_component","slot":"pipe","svg_paths":[{"d":"M0 4 L45 4 L45 8 L0 8 Z","fill":"{color}"},{"d":"M3 4 L3 8 M6 4 L6 8 M9 4 L9 8 M12 4 L12 8 M15 4 L15 8 M18 4 L18 8 M21 4 L21 8 M24 4 L24 8 M27 4 L27 8 M30 4 L30 8 M33 4 L33 8 M36 4 L36 8 M39 4 L39 8 M42 4 L42 8","fill":"none","stroke":"{color_dark}","stroke-width":"0.3"}],"color_slots":{"color":{"base":"#505050","variance":0.1},"color_dark":{"base":"#3A3A3A","variance":0.08}}}',
  '["book1","sci-fi","conduit","pipe"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- joint variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_conduit_pipe_joint_a', 'bg_component', 'Conduit Joint A', 'Flanged bolted joints',
  '{"type":"bg_component","slot":"joint","svg_paths":[{"d":"M10 2 L12 2 L12 10 L10 10 Z","fill":"{color}"},{"d":"M22 2 L24 2 L24 10 L22 10 Z","fill":"{color}"},{"d":"M34 2 L36 2 L36 10 L34 10 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#666666","variance":0.1}}}',
  '["book1","sci-fi","conduit","joint"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_conduit_pipe_joint_b', 'bg_component', 'Conduit Joint B', 'Welded ring joints',
  '{"type":"bg_component","slot":"joint","svg_paths":[{"d":"M11 2.5 L13 2.5 L13 9.5 L11 9.5 Z","fill":"{highlight}","opacity":"0.6"},{"d":"M25 2.5 L27 2.5 L27 9.5 L25 9.5 Z","fill":"{highlight}","opacity":"0.6"}],"color_slots":{"highlight":{"base":"#777777","variance":0.1}}}',
  '["book1","sci-fi","conduit","joint"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_conduit_pipe_joint_c', 'bg_component', 'Conduit Joint C', 'Elbow connector with warning stripe',
  '{"type":"bg_component","slot":"joint","svg_paths":[{"d":"M15 1 L18 1 L18 11 L15 11 Z","fill":"{color}"},{"d":"M15.5 3 L17.5 3 L17.5 4 L15.5 4 Z","fill":"{neon}"},{"d":"M15.5 7 L17.5 7 L17.5 8 L15.5 8 Z","fill":"{neon}"}],"color_slots":{"color":{"base":"#555555","variance":0.1},"neon":{"base":"#FFAA00","variance":0.15}}}',
  '["book1","sci-fi","conduit","joint"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- valve variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_conduit_pipe_valve_a', 'bg_component', 'Conduit Valve A', 'Round handwheel valve',
  '{"type":"bg_component","slot":"valve","svg_paths":[{"d":"M21 2 L24 2 L24 10 L21 10 Z","fill":"{color}"},{"d":"M22.5 0 A2.5 2.5 0 1 1 22.501 0 Z","fill":"{highlight}"},{"d":"M22.5 0 L22.5 2","fill":"none","stroke":"{color}","stroke-width":"0.6"}],"color_slots":{"color":{"base":"#5A5A5A","variance":0.1},"highlight":{"base":"#FF3333","variance":0.15}}}',
  '["book1","sci-fi","conduit","valve"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_conduit_pipe_valve_b', 'bg_component', 'Conduit Valve B', 'Lever-action gate valve',
  '{"type":"bg_component","slot":"valve","svg_paths":[{"d":"M20 3 L25 3 L25 9 L20 9 Z","fill":"{color}"},{"d":"M22 1 L23 1 L24 3 L21 3 Z","fill":"{highlight}"}],"color_slots":{"color":{"base":"#555566","variance":0.1},"highlight":{"base":"#FFAA00","variance":0.15}}}',
  '["book1","sci-fi","conduit","valve"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 8. CORPORATE TOWER — tall buildings in silhouette (30x90)
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_def_corporate_tower', 'bg_element_def', 'Corporate Tower', 'Towering corporate skyscrapers forming the skyline',
  '{"type":"element_definition","element_type":"corporate_tower","components":{"facade":["elem_corporate_tower_facade_a","elem_corporate_tower_facade_b","elem_corporate_tower_facade_c"],"windows":["elem_corporate_tower_windows_a","elem_corporate_tower_windows_b","elem_corporate_tower_windows_c"],"antenna":["elem_corporate_tower_antenna_a","elem_corporate_tower_antenna_b"]},"anchor":{"x":0.5,"y":1.0},"base_width":30,"base_height":90}',
  '["book1","sci-fi","corporate","tower","building","skyline"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- facade variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_corporate_tower_facade_a', 'bg_component', 'Tower Facade A', 'Stepped pyramid skyscraper',
  '{"type":"bg_component","slot":"facade","svg_paths":[{"d":"M5 90 L5 30 L0 30 L0 20 L10 10 L20 10 L30 20 L30 30 L25 30 L25 90 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#2A2A33","variance":0.1}}}',
  '["book1","sci-fi","corporate","facade"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_corporate_tower_facade_b', 'bg_component', 'Tower Facade B', 'Sleek rectangular monolith',
  '{"type":"bg_component","slot":"facade","svg_paths":[{"d":"M3 90 L3 5 Q3 0 8 0 L22 0 Q27 0 27 5 L27 90 Z","fill":"{color}"},{"d":"M3 5 L27 5","fill":"none","stroke":"{highlight}","stroke-width":"0.3"}],"color_slots":{"color":{"base":"#222233","variance":0.08},"highlight":{"base":"#444455","variance":0.1}}}',
  '["book1","sci-fi","corporate","facade"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_corporate_tower_facade_c', 'bg_component', 'Tower Facade C', 'Tapered spire tower',
  '{"type":"bg_component","slot":"facade","svg_paths":[{"d":"M8 90 L8 20 L5 20 L15 0 L25 20 L22 20 L22 90 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#252535","variance":0.1}}}',
  '["book1","sci-fi","corporate","facade"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- windows variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_corporate_tower_windows_a', 'bg_component', 'Tower Windows A', 'Grid of lit office windows',
  '{"type":"bg_component","slot":"windows","svg_paths":[{"d":"M8 15 L11 15 L11 18 L8 18 Z","fill":"{glow}","opacity":"0.6"},{"d":"M13 15 L16 15 L16 18 L13 18 Z","fill":"{glow}","opacity":"0.3"},{"d":"M18 15 L21 15 L21 18 L18 18 Z","fill":"{glow}","opacity":"0.7"},{"d":"M8 25 L11 25 L11 28 L8 28 Z","fill":"{glow}","opacity":"0.4"},{"d":"M13 25 L16 25 L16 28 L13 28 Z","fill":"{glow}","opacity":"0.8"},{"d":"M18 25 L21 25 L21 28 L18 28 Z","fill":"{glow}","opacity":"0.5"},{"d":"M8 40 L11 40 L11 43 L8 43 Z","fill":"{glow}","opacity":"0.6"},{"d":"M13 40 L16 40 L16 43 L13 43 Z","fill":"{glow}","opacity":"0.4"},{"d":"M18 55 L21 55 L21 58 L18 58 Z","fill":"{glow}","opacity":"0.7"},{"d":"M8 70 L11 70 L11 73 L8 73 Z","fill":"{glow}","opacity":"0.5"},{"d":"M18 70 L21 70 L21 73 L18 73 Z","fill":"{glow}","opacity":"0.3"}],"color_slots":{"glow":{"base":"#FFCC66","variance":0.2}}}',
  '["book1","sci-fi","corporate","windows"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_corporate_tower_windows_b', 'bg_component', 'Tower Windows B', 'Blue-tinted corporate glass',
  '{"type":"bg_component","slot":"windows","svg_paths":[{"d":"M7 20 L23 20 L23 23 L7 23 Z","fill":"{glow}","opacity":"0.3"},{"d":"M7 30 L23 30 L23 33 L7 33 Z","fill":"{glow}","opacity":"0.5"},{"d":"M7 45 L23 45 L23 48 L7 48 Z","fill":"{glow}","opacity":"0.2"},{"d":"M7 60 L23 60 L23 63 L7 63 Z","fill":"{glow}","opacity":"0.4"},{"d":"M7 75 L23 75 L23 78 L7 78 Z","fill":"{glow}","opacity":"0.6"}],"color_slots":{"glow":{"base":"#4488FF","variance":0.15}}}',
  '["book1","sci-fi","corporate","windows"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_corporate_tower_windows_c', 'bg_component', 'Tower Windows C', 'Sparse emergency-lit windows',
  '{"type":"bg_component","slot":"windows","svg_paths":[{"d":"M10 35 L13 35 L13 38 L10 38 Z","fill":"{glow}","opacity":"0.8"},{"d":"M17 50 L20 50 L20 53 L17 53 Z","fill":"{neon}","opacity":"0.6"},{"d":"M9 65 L12 65 L12 68 L9 68 Z","fill":"{glow}","opacity":"0.4"},{"d":"M19 80 L22 80 L22 83 L19 83 Z","fill":"{neon}","opacity":"0.5"}],"color_slots":{"glow":{"base":"#FFCC66","variance":0.2},"neon":{"base":"#FF3366","variance":0.15}}}',
  '["book1","sci-fi","corporate","windows"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- antenna variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_corporate_tower_antenna_a', 'bg_component', 'Tower Antenna A', 'Blinking spire antenna',
  '{"type":"bg_component","slot":"antenna","svg_paths":[{"d":"M14.5 10 L15.5 10 L15.5 0 L14.5 0 Z","fill":"{color}"},{"d":"M15 0 A1 1 0 1 1 15.01 0 Z","fill":"{neon}"}],"color_slots":{"color":{"base":"#444444","variance":0.1},"neon":{"base":"#FF3333","variance":0.15}}}',
  '["book1","sci-fi","corporate","antenna"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_corporate_tower_antenna_b', 'bg_component', 'Tower Antenna B', 'Lattice communication tower',
  '{"type":"bg_component","slot":"antenna","svg_paths":[{"d":"M13 10 L15 0 L17 10","fill":"none","stroke":"{color}","stroke-width":"0.5"},{"d":"M13.5 5 L16.5 5 M14 8 L16 8","fill":"none","stroke":"{color}","stroke-width":"0.3"},{"d":"M15 1 A0.8 0.8 0 1 1 15.01 1 Z","fill":"{neon}"}],"color_slots":{"color":{"base":"#555555","variance":0.1},"neon":{"base":"#FF3333","variance":0.1}}}',
  '["book1","sci-fi","corporate","antenna"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 9. CHAIN FENCE — industrial security fencing (40x30)
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_def_chain_fence', 'bg_element_def', 'Chain Fence', 'Industrial chain-link security fencing',
  '{"type":"element_definition","element_type":"chain_fence","components":{"post":["elem_chain_fence_post_a","elem_chain_fence_post_b"],"mesh":["elem_chain_fence_mesh_a","elem_chain_fence_mesh_b","elem_chain_fence_mesh_c"],"barb":["elem_chain_fence_barb_a","elem_chain_fence_barb_b"]},"anchor":{"x":0.5,"y":1.0},"base_width":40,"base_height":30}',
  '["book1","sci-fi","chain","fence","security","industrial"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- post variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_chain_fence_post_a', 'bg_component', 'Fence Post A', 'Round metal pipe posts',
  '{"type":"bg_component","slot":"post","svg_paths":[{"d":"M0 3 L1.5 3 L1.5 30 L0 30 Z","fill":"{color}"},{"d":"M19 3 L20.5 3 L20.5 30 L19 30 Z","fill":"{color}"},{"d":"M38.5 3 L40 3 L40 30 L38.5 30 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#5A5A5A","variance":0.1}}}',
  '["book1","sci-fi","chain","post"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_chain_fence_post_b', 'bg_component', 'Fence Post B', 'Angled I-beam posts',
  '{"type":"bg_component","slot":"post","svg_paths":[{"d":"M0 3 L2 3 L2 30 L0 30 Z","fill":"{color}"},{"d":"M0.5 3 L1.5 3 L1.5 30 L0.5 30 Z","fill":"{highlight}"},{"d":"M19 3 L21 3 L21 30 L19 30 Z","fill":"{color}"},{"d":"M38 3 L40 3 L40 30 L38 30 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#4A4A4A","variance":0.1},"highlight":{"base":"#666666","variance":0.1}}}',
  '["book1","sci-fi","chain","post"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- mesh variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_chain_fence_mesh_a', 'bg_component', 'Fence Mesh A', 'Diamond chain-link pattern',
  '{"type":"bg_component","slot":"mesh","svg_paths":[{"d":"M2 5 L5 8 L2 11 M5 8 L8 5 L11 8 L8 11 L5 14 L2 17 M8 11 L11 14 L14 11 L17 8 L14 5 M11 14 L14 17 L17 14 L20 11 L17 8 M14 17 L17 20 L20 17 L23 14 L20 11 M17 20 L20 23 L23 20 L26 17 L23 14 M20 23 L23 26 L26 23 L29 20 L26 17 M23 26 L26 29 L29 26 L32 23 L29 20 M26 29 L29 30 M32 23 L35 20 L38 23","fill":"none","stroke":"{color}","stroke-width":"0.3","opacity":"0.6"}],"color_slots":{"color":{"base":"#777777","variance":0.15}}}',
  '["book1","sci-fi","chain","mesh"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_chain_fence_mesh_b', 'bg_component', 'Fence Mesh B', 'Horizontal wire rows',
  '{"type":"bg_component","slot":"mesh","svg_paths":[{"d":"M2 6 L38 6 M2 10 L38 10 M2 14 L38 14 M2 18 L38 18 M2 22 L38 22 M2 26 L38 26","fill":"none","stroke":"{color}","stroke-width":"0.4"},{"d":"M10 6 L10 26 M20 6 L20 26 M30 6 L30 26","fill":"none","stroke":"{color}","stroke-width":"0.3"}],"color_slots":{"color":{"base":"#666666","variance":0.12}}}',
  '["book1","sci-fi","chain","mesh"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_chain_fence_mesh_c', 'bg_component', 'Fence Mesh C', 'Solid panel fence with slits',
  '{"type":"bg_component","slot":"mesh","svg_paths":[{"d":"M2 5 L38 5 L38 28 L2 28 Z","fill":"{color}","opacity":"0.4"},{"d":"M5 8 L5 25 M10 8 L10 25 M15 8 L15 25 M20 8 L20 25 M25 8 L25 25 M30 8 L30 25 M35 8 L35 25","fill":"none","stroke":"{color_dark}","stroke-width":"0.3"}],"color_slots":{"color":{"base":"#555555","variance":0.1},"color_dark":{"base":"#3A3A3A","variance":0.08}}}',
  '["book1","sci-fi","chain","mesh"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- barb variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_chain_fence_barb_a', 'bg_component', 'Fence Barb A', 'Coiled razor wire along top',
  '{"type":"bg_component","slot":"barb","svg_paths":[{"d":"M0 3 Q5 0 10 3 Q15 6 20 3 Q25 0 30 3 Q35 6 40 3","fill":"none","stroke":"{color}","stroke-width":"0.6"},{"d":"M3 2 L4 0 M8 4 L9 2 M13 2 L14 0 M18 4 L19 2 M23 2 L24 0 M28 4 L29 2 M33 2 L34 0 M38 4 L39 2","fill":"none","stroke":"{color}","stroke-width":"0.3"}],"color_slots":{"color":{"base":"#888888","variance":0.1}}}',
  '["book1","sci-fi","chain","barb"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_chain_fence_barb_b', 'bg_component', 'Fence Barb B', 'Electrified wire with glow',
  '{"type":"bg_component","slot":"barb","svg_paths":[{"d":"M0 3 L40 3","fill":"none","stroke":"{color}","stroke-width":"0.5"},{"d":"M0 3 L40 3","fill":"none","stroke":"{neon}","stroke-width":"1.5","opacity":"0.2"},{"d":"M5 2 L7 4 M15 4 L17 2 M25 2 L27 4 M35 4 L37 2","fill":"none","stroke":"{neon}","stroke-width":"0.4"}],"color_slots":{"color":{"base":"#777777","variance":0.1},"neon":{"base":"#4488FF","variance":0.2}}}',
  '["book1","sci-fi","chain","barb"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 10. WINDOW FRAME — lit/dark building windows (12x15)
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_def_window_frame', 'bg_element_def', 'Window Frame', 'Individual building windows with varying light states',
  '{"type":"element_definition","element_type":"window_frame","components":{"frame":["elem_window_frame_frame_a","elem_window_frame_frame_b","elem_window_frame_frame_c"],"glass":["elem_window_frame_glass_a","elem_window_frame_glass_b","elem_window_frame_glass_c"],"sill":["elem_window_frame_sill_a","elem_window_frame_sill_b"]},"anchor":{"x":0.5,"y":0.5},"base_width":12,"base_height":15}',
  '["book1","sci-fi","window","building"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- frame variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_window_frame_frame_a', 'bg_component', 'Window Frame A', 'Simple rectangular frame',
  '{"type":"bg_component","slot":"frame","svg_paths":[{"d":"M0 0 L12 0 L12 15 L0 15 Z","fill":"{color}"},{"d":"M1 1 L11 1 L11 13 L1 13 Z","fill":"{color_dark}"}],"color_slots":{"color":{"base":"#444444","variance":0.1},"color_dark":{"base":"#1A1A1A","variance":0.05}}}',
  '["book1","sci-fi","window","frame"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_window_frame_frame_b', 'bg_component', 'Window Frame B', 'Arched top window frame',
  '{"type":"bg_component","slot":"frame","svg_paths":[{"d":"M0 4 Q0 0 6 0 Q12 0 12 4 L12 15 L0 15 Z","fill":"{color}"},{"d":"M1 4.5 Q1 1 6 1 Q11 1 11 4.5 L11 13 L1 13 Z","fill":"{color_dark}"}],"color_slots":{"color":{"base":"#4A4A4A","variance":0.1},"color_dark":{"base":"#1E1E1E","variance":0.05}}}',
  '["book1","sci-fi","window","frame"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_window_frame_frame_c', 'bg_component', 'Window Frame C', 'Cross-divided four-pane frame',
  '{"type":"bg_component","slot":"frame","svg_paths":[{"d":"M0 0 L12 0 L12 15 L0 15 Z","fill":"{color}"},{"d":"M1 1 L5.5 1 L5.5 6.5 L1 6.5 Z","fill":"{color_dark}"},{"d":"M6.5 1 L11 1 L11 6.5 L6.5 6.5 Z","fill":"{color_dark}"},{"d":"M1 7.5 L5.5 7.5 L5.5 13 L1 13 Z","fill":"{color_dark}"},{"d":"M6.5 7.5 L11 7.5 L11 13 L6.5 13 Z","fill":"{color_dark}"}],"color_slots":{"color":{"base":"#555555","variance":0.1},"color_dark":{"base":"#1A1A22","variance":0.05}}}',
  '["book1","sci-fi","window","frame"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- glass variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_window_frame_glass_a', 'bg_component', 'Window Glass A', 'Warm interior light',
  '{"type":"bg_component","slot":"glass","svg_paths":[{"d":"M1.5 1.5 L10.5 1.5 L10.5 12.5 L1.5 12.5 Z","fill":"{glow}","opacity":"0.6"}],"color_slots":{"glow":{"base":"#FFCC66","variance":0.25}}}',
  '["book1","sci-fi","window","glass"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_window_frame_glass_b', 'bg_component', 'Window Glass B', 'Dark/unlit glass with reflection',
  '{"type":"bg_component","slot":"glass","svg_paths":[{"d":"M1.5 1.5 L10.5 1.5 L10.5 12.5 L1.5 12.5 Z","fill":"{glass}","opacity":"0.15"},{"d":"M2 2 L5 5","fill":"none","stroke":"#FFFFFF","stroke-width":"0.3","opacity":"0.2"}],"color_slots":{"glass":{"base":"#88CCEE","variance":0.1}}}',
  '["book1","sci-fi","window","glass"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_window_frame_glass_c', 'bg_component', 'Window Glass C', 'Neon-tinted display screen glow',
  '{"type":"bg_component","slot":"glass","svg_paths":[{"d":"M1.5 1.5 L10.5 1.5 L10.5 12.5 L1.5 12.5 Z","fill":"{neon}","opacity":"0.35"},{"d":"M3 4 L9 4 M3 7 L7 7 M3 10 L8 10","fill":"none","stroke":"{neon}","stroke-width":"0.3","opacity":"0.5"}],"color_slots":{"neon":{"base":"#00FFAA","variance":0.2}}}',
  '["book1","sci-fi","window","glass"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- sill variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_window_frame_sill_a', 'bg_component', 'Window Sill A', 'Protruding concrete ledge',
  '{"type":"bg_component","slot":"sill","svg_paths":[{"d":"M-1 13 L13 13 L13 15 L-1 15 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#555555","variance":0.1}}}',
  '["book1","sci-fi","window","sill"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_window_frame_sill_b', 'bg_component', 'Window Sill B', 'Metal drip edge sill',
  '{"type":"bg_component","slot":"sill","svg_paths":[{"d":"M0 13 L12 13 L12 14 L0 14 Z","fill":"{color}"},{"d":"M0 14 L12 14.5","fill":"none","stroke":"{highlight}","stroke-width":"0.3"}],"color_slots":{"color":{"base":"#4A4A4A","variance":0.1},"highlight":{"base":"#666666","variance":0.1}}}',
  '["book1","sci-fi","window","sill"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 11. SMOKE STACK — industrial chimneys (15x70)
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_def_smoke_stack', 'bg_element_def', 'Smoke Stack', 'Industrial chimneys belching smoke into the sky',
  '{"type":"element_definition","element_type":"smoke_stack","components":{"stack":["elem_smoke_stack_stack_a","elem_smoke_stack_stack_b","elem_smoke_stack_stack_c"],"smoke":["elem_smoke_stack_smoke_a","elem_smoke_stack_smoke_b","elem_smoke_stack_smoke_c"],"band":["elem_smoke_stack_band_a","elem_smoke_stack_band_b"]},"anchor":{"x":0.5,"y":1.0},"base_width":15,"base_height":70}',
  '["book1","sci-fi","smoke","stack","industrial","chimney"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- stack variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_smoke_stack_stack_a', 'bg_component', 'Smoke Stack A', 'Straight cylindrical chimney',
  '{"type":"bg_component","slot":"stack","svg_paths":[{"d":"M4 5 L11 5 L11 70 L4 70 Z","fill":"{color}"},{"d":"M5 5 L5 70","fill":"none","stroke":"{highlight}","stroke-width":"0.4"}],"color_slots":{"color":{"base":"#3A3A3A","variance":0.1},"highlight":{"base":"#555555","variance":0.1}}}',
  '["book1","sci-fi","smoke","stack"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_smoke_stack_stack_b', 'bg_component', 'Smoke Stack B', 'Tapered chimney widening at base',
  '{"type":"bg_component","slot":"stack","svg_paths":[{"d":"M5 5 L10 5 L12 70 L3 70 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#444444","variance":0.1}}}',
  '["book1","sci-fi","smoke","stack"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_smoke_stack_stack_c', 'bg_component', 'Smoke Stack C', 'Reinforced industrial stack with ribs',
  '{"type":"bg_component","slot":"stack","svg_paths":[{"d":"M3 5 L12 5 L12 70 L3 70 Z","fill":"{color}"},{"d":"M3 20 L12 20 M3 35 L12 35 M3 50 L12 50 M3 65 L12 65","fill":"none","stroke":"{highlight}","stroke-width":"0.6"}],"color_slots":{"color":{"base":"#383838","variance":0.1},"highlight":{"base":"#505050","variance":0.1}}}',
  '["book1","sci-fi","smoke","stack"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- smoke variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_smoke_stack_smoke_a', 'bg_component', 'Smoke Plume A', 'Thick billowing smoke cloud',
  '{"type":"bg_component","slot":"smoke","svg_paths":[{"d":"M6 5 Q3 0 7 -3 Q10 -6 8 -10 Q12 -8 14 -12","fill":"none","stroke":"{color}","stroke-width":"3","opacity":"0.3"},{"d":"M8 4 Q5 -1 9 -5 Q12 -9 10 -14","fill":"none","stroke":"{color}","stroke-width":"2","opacity":"0.2"}],"color_slots":{"color":{"base":"#888888","variance":0.2}}}',
  '["book1","sci-fi","smoke","plume"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_smoke_stack_smoke_b', 'bg_component', 'Smoke Plume B', 'Thin wispy exhaust trail',
  '{"type":"bg_component","slot":"smoke","svg_paths":[{"d":"M7 5 Q6 2 8 -1 Q10 -4 7 -8 Q5 -11 8 -15","fill":"none","stroke":"{color}","stroke-width":"1.5","opacity":"0.25"}],"color_slots":{"color":{"base":"#999999","variance":0.2}}}',
  '["book1","sci-fi","smoke","plume"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_smoke_stack_smoke_c', 'bg_component', 'Smoke Plume C', 'Toxic green-tinged emissions',
  '{"type":"bg_component","slot":"smoke","svg_paths":[{"d":"M7 5 Q4 1 8 -3 Q11 -7 7 -11 Q4 -14 9 -18","fill":"none","stroke":"{color}","stroke-width":"2.5","opacity":"0.2"},{"d":"M8 3 Q6 0 9 -4 Q11 -8 8 -12","fill":"none","stroke":"{neon}","stroke-width":"1","opacity":"0.15"}],"color_slots":{"color":{"base":"#777777","variance":0.15},"neon":{"base":"#00FF88","variance":0.2}}}',
  '["book1","sci-fi","smoke","plume","toxic"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- band variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_smoke_stack_band_a', 'bg_component', 'Stack Band A', 'Red warning stripes',
  '{"type":"bg_component","slot":"band","svg_paths":[{"d":"M3 8 L12 8 L12 11 L3 11 Z","fill":"{neon}"},{"d":"M3 55 L12 55 L12 58 L3 58 Z","fill":"{neon}"}],"color_slots":{"neon":{"base":"#FF3333","variance":0.15}}}',
  '["book1","sci-fi","smoke","band"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_smoke_stack_band_b', 'bg_component', 'Stack Band B', 'Yellow hazard bands',
  '{"type":"bg_component","slot":"band","svg_paths":[{"d":"M3 12 L12 12 L12 14 L3 14 Z","fill":"{neon}"},{"d":"M3 30 L12 30 L12 32 L3 32 Z","fill":"{neon}"},{"d":"M3 48 L12 48 L12 50 L3 50 Z","fill":"{neon}"}],"color_slots":{"neon":{"base":"#FFAA00","variance":0.15}}}',
  '["book1","sci-fi","smoke","band"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 12. ROOFTOP ANTENNA — communication arrays (10x50)
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_def_rooftop_antenna', 'bg_element_def', 'Rooftop Antenna', 'Communication antenna arrays on rooftops',
  '{"type":"element_definition","element_type":"rooftop_antenna","components":{"mast":["elem_rooftop_antenna_mast_a","elem_rooftop_antenna_mast_b","elem_rooftop_antenna_mast_c"],"dish":["elem_rooftop_antenna_dish_a","elem_rooftop_antenna_dish_b"],"wire":["elem_rooftop_antenna_wire_a","elem_rooftop_antenna_wire_b"]},"anchor":{"x":0.5,"y":1.0},"base_width":10,"base_height":50}',
  '["book1","sci-fi","rooftop","antenna","communication"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- mast variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_rooftop_antenna_mast_a', 'bg_component', 'Antenna Mast A', 'Straight thin mast with crossbars',
  '{"type":"bg_component","slot":"mast","svg_paths":[{"d":"M4.5 0 L5.5 0 L5.5 50 L4.5 50 Z","fill":"{color}"},{"d":"M2 10 L8 10 M2 25 L8 25 M2 40 L8 40","fill":"none","stroke":"{color}","stroke-width":"0.4"}],"color_slots":{"color":{"base":"#555555","variance":0.1}}}',
  '["book1","sci-fi","rooftop","mast"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_rooftop_antenna_mast_b', 'bg_component', 'Antenna Mast B', 'Lattice tower mast',
  '{"type":"bg_component","slot":"mast","svg_paths":[{"d":"M3 50 L5 0 L7 50","fill":"none","stroke":"{color}","stroke-width":"0.6"},{"d":"M3.5 10 L6.5 10 M3.8 20 L6.2 20 M4 30 L6 30 M4.2 40 L5.8 40","fill":"none","stroke":"{color}","stroke-width":"0.3"},{"d":"M3.5 10 L6.2 20 M6.5 10 L3.8 20 M3.8 20 L6 30 M6.2 20 L4 30","fill":"none","stroke":"{color}","stroke-width":"0.2"}],"color_slots":{"color":{"base":"#4A4A4A","variance":0.1}}}',
  '["book1","sci-fi","rooftop","mast"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_rooftop_antenna_mast_c', 'bg_component', 'Antenna Mast C', 'Thick industrial pole with platform',
  '{"type":"bg_component","slot":"mast","svg_paths":[{"d":"M4 5 L6 5 L6 50 L4 50 Z","fill":"{color}"},{"d":"M1 15 L9 15 L9 16 L1 16 Z","fill":"{highlight}"},{"d":"M2 35 L8 35 L8 36 L2 36 Z","fill":"{highlight}"}],"color_slots":{"color":{"base":"#505050","variance":0.1},"highlight":{"base":"#666666","variance":0.1}}}',
  '["book1","sci-fi","rooftop","mast"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- dish variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_rooftop_antenna_dish_a', 'bg_component', 'Antenna Dish A', 'Small side-mounted dish',
  '{"type":"bg_component","slot":"dish","svg_paths":[{"d":"M6 12 L10 10 L10 16 Z","fill":"{color}"},{"d":"M10 13 A0.5 0.5 0 1 1 10.01 13 Z","fill":"{neon}"}],"color_slots":{"color":{"base":"#555555","variance":0.1},"neon":{"base":"#FF3333","variance":0.15}}}',
  '["book1","sci-fi","rooftop","dish"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_rooftop_antenna_dish_b', 'bg_component', 'Antenna Dish B', 'Panel array element',
  '{"type":"bg_component","slot":"dish","svg_paths":[{"d":"M0 8 L4 8 L4 14 L0 14 Z","fill":"{color}"},{"d":"M0 9 L4 9 M0 11 L4 11 M0 13 L4 13","fill":"none","stroke":"{highlight}","stroke-width":"0.2"}],"color_slots":{"color":{"base":"#4A4A4A","variance":0.1},"highlight":{"base":"#666666","variance":0.1}}}',
  '["book1","sci-fi","rooftop","dish"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- wire variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_rooftop_antenna_wire_a', 'bg_component', 'Antenna Wire A', 'Guy wires to anchors',
  '{"type":"bg_component","slot":"wire","svg_paths":[{"d":"M5 5 L0 50","fill":"none","stroke":"{color}","stroke-width":"0.3"},{"d":"M5 5 L10 50","fill":"none","stroke":"{color}","stroke-width":"0.3"}],"color_slots":{"color":{"base":"#777777","variance":0.15}}}',
  '["book1","sci-fi","rooftop","wire"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_rooftop_antenna_wire_b', 'bg_component', 'Antenna Wire B', 'Drooping cable loops between points',
  '{"type":"bg_component","slot":"wire","svg_paths":[{"d":"M5 10 Q0 18 5 25 Q10 32 5 40","fill":"none","stroke":"{color}","stroke-width":"0.4"},{"d":"M5 15 Q8 20 5 25","fill":"none","stroke":"{color}","stroke-width":"0.3"}],"color_slots":{"color":{"base":"#666666","variance":0.12}}}',
  '["book1","sci-fi","rooftop","wire"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

COMMIT;
