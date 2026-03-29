-- ============================================================================
-- Parallax Shared Elements — Phase 2
-- Background element definitions + SVG sub-component variants
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. POWER LINE
-- ============================================================================

-- Element definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_power_line', 'bg_element_def', 'Power Line', 'Urban power line with pole, wires, and insulators',
  '{"type":"element_definition","element_type":"power_line","components":{"pole":["elem_power_line_pole_a","elem_power_line_pole_b","elem_power_line_pole_c"],"wire":["elem_power_line_wire_a","elem_power_line_wire_b","elem_power_line_wire_c"],"insulator":["elem_power_line_insulator_a","elem_power_line_insulator_b"]},"anchor":{"x":0.5,"y":1.0},"base_width":40,"base_height":90}',
  '["parallax","urban","infrastructure","shared"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Pole variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_power_line_pole_a', 'bg_component', 'Power Pole — Wooden', 'Tapered wooden utility pole',
  '{"type":"bg_component","slot":"pole","svg_paths":[{"d":"M18 0 L16 85 L24 85 L22 0 Z","fill":"{color}"},{"d":"M17 20 L23 20 L23 22 L17 22 Z","fill":"{color_dark}"},{"d":"M17 50 L23 50 L23 52 L17 52 Z","fill":"{color_dark}"},{"d":"M10 10 L30 10 L30 12 L10 12 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#8B7355","variance":0.15},"color_dark":{"base":"#6B5335","variance":0.1}}}',
  '["parallax","component","pole"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_power_line_pole_b', 'bg_component', 'Power Pole — Metal', 'Straight galvanized steel pole',
  '{"type":"bg_component","slot":"pole","svg_paths":[{"d":"M18 0 L17 85 L23 85 L22 0 Z","fill":"{color}"},{"d":"M16 0 L24 0 L23 3 L17 3 Z","fill":"{highlight}"},{"d":"M15 8 L25 8 L25 10 L15 10 Z","fill":"{color}"},{"d":"M17 30 L23 30 L23 32 L17 32 Z","fill":"{color_dark}"}],"color_slots":{"color":{"base":"#708090","variance":0.1},"color_dark":{"base":"#556070","variance":0.1},"highlight":{"base":"#90A0B0","variance":0.1}}}',
  '["parallax","component","pole"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_power_line_pole_c', 'bg_component', 'Power Pole — Concrete', 'Thick concrete utility pole',
  '{"type":"bg_component","slot":"pole","svg_paths":[{"d":"M16 0 L14 85 L26 85 L24 0 Z","fill":"{color}"},{"d":"M15 40 L25 40 L25 42 L15 42 Z","fill":"{color_dark}"},{"d":"M12 8 L28 8 L28 10 L12 10 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#A0A0A0","variance":0.1},"color_dark":{"base":"#808080","variance":0.1}}}',
  '["parallax","component","pole"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Wire variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_power_line_wire_a', 'bg_component', 'Wire — Slight Sag', 'Gently sagging power line wire',
  '{"type":"bg_component","slot":"wire","svg_paths":[{"d":"M0 10 Q20 18 40 10","fill":"none","stroke":"{color}","stroke_width":1}],"color_slots":{"color":{"base":"#333333","variance":0.1}}}',
  '["parallax","component","wire"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_power_line_wire_b', 'bg_component', 'Wire — Heavy Sag', 'Deeply sagging double wire',
  '{"type":"bg_component","slot":"wire","svg_paths":[{"d":"M0 8 Q20 24 40 8","fill":"none","stroke":"{color}","stroke_width":1},{"d":"M0 12 Q20 26 40 12","fill":"none","stroke":"{color}","stroke_width":1}],"color_slots":{"color":{"base":"#2A2A2A","variance":0.1}}}',
  '["parallax","component","wire"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_power_line_wire_c', 'bg_component', 'Wire — Taut', 'Nearly straight taut wire pair',
  '{"type":"bg_component","slot":"wire","svg_paths":[{"d":"M0 10 Q20 13 40 10","fill":"none","stroke":"{color}","stroke_width":1},{"d":"M0 14 Q20 16 40 14","fill":"none","stroke":"{color}","stroke_width":1}],"color_slots":{"color":{"base":"#383838","variance":0.1}}}',
  '["parallax","component","wire"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Insulator variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_power_line_insulator_a', 'bg_component', 'Insulator — Ceramic Stack', 'Stacked ceramic disc insulator',
  '{"type":"bg_component","slot":"insulator","svg_paths":[{"d":"M8 0 L12 0 L12 3 L8 3 Z","fill":"{color}"},{"d":"M7 3 L13 3 L13 5 L7 5 Z","fill":"{color}"},{"d":"M8 5 L12 5 L12 8 L8 8 Z","fill":"{color_dark}"}],"color_slots":{"color":{"base":"#C8B898","variance":0.15},"color_dark":{"base":"#A09070","variance":0.1}}}',
  '["parallax","component","insulator"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_power_line_insulator_b', 'bg_component', 'Insulator — Pin Type', 'Simple pin-style insulator',
  '{"type":"bg_component","slot":"insulator","svg_paths":[{"d":"M9 0 L11 0 L11 4 L9 4 Z","fill":"{color_dark}"},{"d":"M7 4 L13 4 Q13 7 10 7 Q7 7 7 4 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#B8A888","variance":0.15},"color_dark":{"base":"#706050","variance":0.1}}}',
  '["parallax","component","insulator"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 2. VEHICLE
-- ============================================================================

-- Element definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_vehicle', 'bg_element_def', 'Vehicle', 'Abandoned or parked vehicles',
  '{"type":"element_definition","element_type":"vehicle","components":{"body":["elem_vehicle_body_a","elem_vehicle_body_b","elem_vehicle_body_c"],"wheels":["elem_vehicle_wheels_a","elem_vehicle_wheels_b","elem_vehicle_wheels_c"],"detail":["elem_vehicle_detail_a","elem_vehicle_detail_b","elem_vehicle_detail_c"]},"anchor":{"x":0.5,"y":1.0},"base_width":50,"base_height":30}',
  '["parallax","urban","vehicle","shared"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Body variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_vehicle_body_a', 'bg_component', 'Vehicle Body — Sedan', 'Compact sedan silhouette',
  '{"type":"bg_component","slot":"body","svg_paths":[{"d":"M5 18 L5 12 L15 12 L18 6 L35 6 L40 12 L48 12 L48 18 Z","fill":"{color}"},{"d":"M18 6 L20 12 L33 12 L35 6 Z","fill":"{glass}"}],"color_slots":{"color":{"base":"#5A6A7A","variance":0.2},"glass":{"base":"#304050","variance":0.1}}}',
  '["parallax","component","body"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_vehicle_body_b', 'bg_component', 'Vehicle Body — Van', 'Boxy van silhouette',
  '{"type":"bg_component","slot":"body","svg_paths":[{"d":"M3 20 L3 6 L40 6 L45 10 L45 20 Z","fill":"{color}"},{"d":"M30 7 L38 7 L40 11 L30 11 Z","fill":"{glass}"}],"color_slots":{"color":{"base":"#7A7060","variance":0.2},"glass":{"base":"#354555","variance":0.1}}}',
  '["parallax","component","body"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_vehicle_body_c', 'bg_component', 'Vehicle Body — Truck', 'Pickup truck silhouette',
  '{"type":"bg_component","slot":"body","svg_paths":[{"d":"M2 20 L2 10 L20 10 L22 5 L35 5 L35 10 L48 10 L48 20 Z","fill":"{color}"},{"d":"M22 5 L24 10 L33 10 L35 5 Z","fill":"{glass}"},{"d":"M2 10 L18 10 L18 20 L2 20 Z","fill":"{color_dark}"}],"color_slots":{"color":{"base":"#8A6A5A","variance":0.2},"color_dark":{"base":"#6A4A3A","variance":0.15},"glass":{"base":"#304555","variance":0.1}}}',
  '["parallax","component","body"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Wheel variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_vehicle_wheels_a', 'bg_component', 'Wheels — Standard Round', 'Normal round tires',
  '{"type":"bg_component","slot":"wheels","svg_paths":[{"d":"M12 22 A4 4 0 1 1 12 14 A4 4 0 1 1 12 22 Z","fill":"{color}"},{"d":"M12 20 A2 2 0 1 1 12 16 A2 2 0 1 1 12 20 Z","fill":"{hub}"},{"d":"M38 22 A4 4 0 1 1 38 14 A4 4 0 1 1 38 22 Z","fill":"{color}"},{"d":"M38 20 A2 2 0 1 1 38 16 A2 2 0 1 1 38 20 Z","fill":"{hub}"}],"color_slots":{"color":{"base":"#2A2A2A","variance":0.1},"hub":{"base":"#555555","variance":0.1}}}',
  '["parallax","component","wheels"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_vehicle_wheels_b', 'bg_component', 'Wheels — Flat Tire', 'Deflated uneven wheels',
  '{"type":"bg_component","slot":"wheels","svg_paths":[{"d":"M8 22 Q10 14 16 18 Q14 22 8 22 Z","fill":"{color}"},{"d":"M34 22 Q36 15 42 18 Q40 22 34 22 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#222222","variance":0.1}}}',
  '["parallax","component","wheels"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_vehicle_wheels_c', 'bg_component', 'Wheels — Missing Front', 'Rear wheel only, front on blocks',
  '{"type":"bg_component","slot":"wheels","svg_paths":[{"d":"M10 20 L14 20 L14 22 L10 22 Z","fill":"{block}"},{"d":"M38 22 A4 4 0 1 1 38 14 A4 4 0 1 1 38 22 Z","fill":"{color}"},{"d":"M38 20 A2 2 0 1 1 38 16 A2 2 0 1 1 38 20 Z","fill":"{hub}"}],"color_slots":{"color":{"base":"#2A2A2A","variance":0.1},"hub":{"base":"#555555","variance":0.1},"block":{"base":"#888888","variance":0.1}}}',
  '["parallax","component","wheels"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Detail variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_vehicle_detail_a', 'bg_component', 'Detail — Rust Patches', 'Oxidation spots on body panels',
  '{"type":"bg_component","slot":"detail","svg_paths":[{"d":"M10 10 Q13 9 14 12 Q11 13 10 10 Z","fill":"{rust}"},{"d":"M30 14 Q33 13 32 16 Q29 15 30 14 Z","fill":"{rust}"}],"color_slots":{"rust":{"base":"#8B4513","variance":0.2}}}',
  '["parallax","component","detail"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_vehicle_detail_b', 'bg_component', 'Detail — Cracked Window', 'Spider-web crack pattern on glass',
  '{"type":"bg_component","slot":"detail","svg_paths":[{"d":"M26 8 L28 6 M26 8 L24 7 M26 8 L27 10 M26 8 L25 9","fill":"none","stroke":"{crack}","stroke_width":0.5}],"color_slots":{"crack":{"base":"#AABBCC","variance":0.1}}}',
  '["parallax","component","detail"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_vehicle_detail_c', 'bg_component', 'Detail — Dented Panel', 'Body panel dent with shadow',
  '{"type":"bg_component","slot":"detail","svg_paths":[{"d":"M20 12 Q23 14 26 12 Q23 15 20 12 Z","fill":"{shadow}"},{"d":"M21 12 Q23 13 25 12","fill":"none","stroke":"{highlight}","stroke_width":0.5}],"color_slots":{"shadow":{"base":"#00000030","variance":0.05},"highlight":{"base":"#FFFFFF20","variance":0.05}}}',
  '["parallax","component","detail"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 3. DUMPSTER
-- ============================================================================

-- Element definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_dumpster', 'bg_element_def', 'Dumpster', 'Industrial waste containers',
  '{"type":"element_definition","element_type":"dumpster","components":{"body":["elem_dumpster_body_a","elem_dumpster_body_b","elem_dumpster_body_c"],"lid":["elem_dumpster_lid_a","elem_dumpster_lid_b"],"detail":["elem_dumpster_detail_a","elem_dumpster_detail_b"]},"anchor":{"x":0.5,"y":1.0},"base_width":30,"base_height":25}',
  '["parallax","urban","container","shared"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Body variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_dumpster_body_a', 'bg_component', 'Dumpster Body — Standard', 'Rectangular steel dumpster',
  '{"type":"bg_component","slot":"body","svg_paths":[{"d":"M2 8 L4 22 L26 22 L28 8 Z","fill":"{color}"},{"d":"M2 8 L28 8 L28 10 L2 10 Z","fill":"{color_dark}"}],"color_slots":{"color":{"base":"#4A6A4A","variance":0.15},"color_dark":{"base":"#3A5A3A","variance":0.1}}}',
  '["parallax","component","body"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_dumpster_body_b', 'bg_component', 'Dumpster Body — Rusted', 'Corroded dumpster with uneven sides',
  '{"type":"bg_component","slot":"body","svg_paths":[{"d":"M3 8 L5 23 L25 22 L27 8 Z","fill":"{color}"},{"d":"M3 8 L27 8 L27 10 L3 10 Z","fill":"{color_dark}"},{"d":"M10 14 Q13 13 14 16 Q11 17 10 14 Z","fill":"{rust}"}],"color_slots":{"color":{"base":"#5A5040","variance":0.15},"color_dark":{"base":"#4A4030","variance":0.1},"rust":{"base":"#8B5A2B","variance":0.2}}}',
  '["parallax","component","body"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_dumpster_body_c', 'bg_component', 'Dumpster Body — Blue Commercial', 'Blue commercial waste bin',
  '{"type":"bg_component","slot":"body","svg_paths":[{"d":"M2 7 L3 22 L27 22 L28 7 Z","fill":"{color}"},{"d":"M2 7 L28 7 L28 9 L2 9 Z","fill":"{highlight}"}],"color_slots":{"color":{"base":"#3A5A8A","variance":0.15},"highlight":{"base":"#4A6A9A","variance":0.1}}}',
  '["parallax","component","body"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Lid variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_dumpster_lid_a', 'bg_component', 'Dumpster Lid — Closed', 'Flat closed lid',
  '{"type":"bg_component","slot":"lid","svg_paths":[{"d":"M1 7 L29 7 L29 9 L1 9 Z","fill":"{color}"},{"d":"M13 7 L17 7 L17 6 L13 6 Z","fill":"{handle}"}],"color_slots":{"color":{"base":"#3A5A3A","variance":0.1},"handle":{"base":"#555555","variance":0.1}}}',
  '["parallax","component","lid"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_dumpster_lid_b', 'bg_component', 'Dumpster Lid — Open', 'Lid propped open at angle',
  '{"type":"bg_component","slot":"lid","svg_paths":[{"d":"M1 8 L15 8 L15 9 L1 9 Z","fill":"{color}"},{"d":"M15 8 L28 2 L29 3 L15 9 Z","fill":"{color}"},{"d":"M20 4 L22 3 L22 2 L20 3 Z","fill":"{handle}"}],"color_slots":{"color":{"base":"#3A5A3A","variance":0.1},"handle":{"base":"#555555","variance":0.1}}}',
  '["parallax","component","lid"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Detail variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_dumpster_detail_a', 'bg_component', 'Dumpster Detail — Stain Drip', 'Dripping stain streak',
  '{"type":"bg_component","slot":"detail","svg_paths":[{"d":"M8 10 L9 10 L9 18 Q8.5 20 8 18 Z","fill":"{stain}"},{"d":"M20 11 L21 11 L21 16 Q20.5 17 20 16 Z","fill":"{stain}"}],"color_slots":{"stain":{"base":"#3A3020","variance":0.15}}}',
  '["parallax","component","detail"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_dumpster_detail_b', 'bg_component', 'Dumpster Detail — Dent', 'Impact dent on side panel',
  '{"type":"bg_component","slot":"detail","svg_paths":[{"d":"M12 13 Q15 16 18 13 Q15 17 12 13 Z","fill":"{shadow}"}],"color_slots":{"shadow":{"base":"#00000025","variance":0.05}}}',
  '["parallax","component","detail"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 4. FENCE
-- ============================================================================

-- Element definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_fence', 'bg_element_def', 'Fence', 'Chain-link or wooden fences',
  '{"type":"element_definition","element_type":"fence","components":{"post":["elem_fence_post_a","elem_fence_post_b","elem_fence_post_c"],"panel":["elem_fence_panel_a","elem_fence_panel_b","elem_fence_panel_c"],"damage":["elem_fence_damage_a","elem_fence_damage_b","elem_fence_damage_c"]},"anchor":{"x":0.5,"y":1.0},"base_width":40,"base_height":35}',
  '["parallax","urban","barrier","shared"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Post variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_fence_post_a', 'bg_component', 'Fence Post — Metal Pipe', 'Round metal pipe post',
  '{"type":"bg_component","slot":"post","svg_paths":[{"d":"M18 0 L22 0 L22 35 L18 35 Z","fill":"{color}"},{"d":"M17 0 L23 0 L23 2 L17 2 Z","fill":"{highlight}"}],"color_slots":{"color":{"base":"#707070","variance":0.1},"highlight":{"base":"#909090","variance":0.1}}}',
  '["parallax","component","post"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_fence_post_b', 'bg_component', 'Fence Post — Wooden 4x4', 'Square wooden fence post',
  '{"type":"bg_component","slot":"post","svg_paths":[{"d":"M17 0 L23 0 L23 35 L17 35 Z","fill":"{color}"},{"d":"M17 0 L20 0 L20 35 L17 35 Z","fill":"{color_dark}"}],"color_slots":{"color":{"base":"#9A8A6A","variance":0.15},"color_dark":{"base":"#7A6A4A","variance":0.15}}}',
  '["parallax","component","post"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_fence_post_c', 'bg_component', 'Fence Post — Concrete Bollard', 'Squat concrete post',
  '{"type":"bg_component","slot":"post","svg_paths":[{"d":"M16 2 L24 2 L23 35 L17 35 Z","fill":"{color}"},{"d":"M15 0 L25 0 L25 3 L15 3 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#A0A0A0","variance":0.1}}}',
  '["parallax","component","post"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Panel variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_fence_panel_a', 'bg_component', 'Fence Panel — Chain Link', 'Diamond-pattern chain link mesh',
  '{"type":"bg_component","slot":"panel","svg_paths":[{"d":"M0 5 L40 5 L40 30 L0 30 Z","fill":"{mesh}"},{"d":"M0 5 L5 10 L0 15 M5 10 L10 5 M5 10 L10 15 L5 20 L0 25 M10 15 L15 10 L10 5 M15 10 L20 5 M15 10 L20 15 L15 20 M20 15 L25 10 L20 5 M25 10 L30 5 M25 10 L30 15 L25 20 M30 15 L35 10 L30 5 M35 10 L40 5 M35 10 L40 15 L35 20 L30 25 L35 30 M40 25 L35 20 M5 20 L10 25 L5 30 M10 25 L15 20 M15 20 L20 25 L15 30 M20 25 L25 20 M25 20 L30 25 L25 30 M30 25 L35 20","fill":"none","stroke":"{wire}","stroke_width":0.5}],"color_slots":{"mesh":{"base":"#50505010","variance":0.05},"wire":{"base":"#888888","variance":0.1}}}',
  '["parallax","component","panel"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_fence_panel_b', 'bg_component', 'Fence Panel — Wood Slats', 'Vertical wooden slat fence',
  '{"type":"bg_component","slot":"panel","svg_paths":[{"d":"M1 5 L5 5 L5 30 L1 30 Z","fill":"{color}"},{"d":"M8 5 L12 5 L12 30 L8 30 Z","fill":"{color_dark}"},{"d":"M15 5 L19 5 L19 30 L15 30 Z","fill":"{color}"},{"d":"M22 5 L26 5 L26 30 L22 30 Z","fill":"{color_dark}"},{"d":"M29 5 L33 5 L33 30 L29 30 Z","fill":"{color}"},{"d":"M36 5 L40 5 L40 30 L36 30 Z","fill":"{color_dark}"}],"color_slots":{"color":{"base":"#9A8A6A","variance":0.15},"color_dark":{"base":"#8A7A5A","variance":0.15}}}',
  '["parallax","component","panel"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_fence_panel_c', 'bg_component', 'Fence Panel — Corrugated Metal', 'Wavy corrugated sheet metal',
  '{"type":"bg_component","slot":"panel","svg_paths":[{"d":"M0 5 Q5 3 10 5 Q15 7 20 5 Q25 3 30 5 Q35 7 40 5 L40 30 Q35 28 30 30 Q25 32 20 30 Q15 28 10 30 Q5 32 0 30 Z","fill":"{color}"},{"d":"M0 5 Q5 3 10 5 Q15 7 20 5 Q25 3 30 5 Q35 7 40 5","fill":"none","stroke":"{highlight}","stroke_width":0.5}],"color_slots":{"color":{"base":"#6A7A7A","variance":0.1},"highlight":{"base":"#8A9A9A","variance":0.1}}}',
  '["parallax","component","panel"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Damage variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_fence_damage_a', 'bg_component', 'Fence Damage — Hole', 'Torn opening in fence',
  '{"type":"bg_component","slot":"damage","svg_paths":[{"d":"M12 12 Q16 10 20 14 Q18 18 14 20 Q10 16 12 12 Z","fill":"{gap}"}],"color_slots":{"gap":{"base":"#00000000","variance":0}}}',
  '["parallax","component","damage"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_fence_damage_b', 'bg_component', 'Fence Damage — Bent Section', 'Fence pushed inward',
  '{"type":"bg_component","slot":"damage","svg_paths":[{"d":"M15 10 Q20 15 25 10 L25 25 Q20 20 15 25 Z","fill":"{shadow}"}],"color_slots":{"shadow":{"base":"#00000020","variance":0.05}}}',
  '["parallax","component","damage"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_fence_damage_c', 'bg_component', 'Fence Damage — Missing Slat', 'Gap where a slat is broken off',
  '{"type":"bg_component","slot":"damage","svg_paths":[{"d":"M18 5 L22 5 L22 30 L18 30 Z","fill":"{gap}"},{"d":"M18 22 L22 22 L21 30 L19 30 Z","fill":"{broken}"}],"color_slots":{"gap":{"base":"#00000000","variance":0},"broken":{"base":"#8A7A5A","variance":0.15}}}',
  '["parallax","component","damage"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 5. MOON
-- ============================================================================

-- Element definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_moon', 'bg_element_def', 'Moon', 'Celestial body with craters and glow',
  '{"type":"element_definition","element_type":"moon","components":{"disc":["elem_moon_disc_a","elem_moon_disc_b"],"crater":["elem_moon_crater_a","elem_moon_crater_b"],"glow":["elem_moon_glow_a","elem_moon_glow_b"]},"anchor":{"x":0.5,"y":0.5},"base_width":30,"base_height":30}',
  '["parallax","sky","celestial","shared"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Disc variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_moon_disc_a', 'bg_component', 'Moon Disc — Full', 'Full circular moon',
  '{"type":"bg_component","slot":"disc","svg_paths":[{"d":"M15 1 A14 14 0 1 1 15 29 A14 14 0 1 1 15 1 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#E8E0C8","variance":0.1}}}',
  '["parallax","component","disc"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_moon_disc_b', 'bg_component', 'Moon Disc — Crescent', 'Waning crescent moon',
  '{"type":"bg_component","slot":"disc","svg_paths":[{"d":"M18 1 A14 14 0 1 0 18 29 A10 14 0 1 1 18 1 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#E8E0C8","variance":0.1}}}',
  '["parallax","component","disc"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Crater variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_moon_crater_a', 'bg_component', 'Moon Crater — Large Pair', 'Two prominent craters',
  '{"type":"bg_component","slot":"crater","svg_paths":[{"d":"M10 10 A3 3 0 1 1 10 16 A3 3 0 1 1 10 10 Z","fill":"{shadow}"},{"d":"M18 18 A2 2 0 1 1 18 22 A2 2 0 1 1 18 18 Z","fill":"{shadow}"}],"color_slots":{"shadow":{"base":"#C8C0A8","variance":0.1}}}',
  '["parallax","component","crater"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_moon_crater_b', 'bg_component', 'Moon Crater — Scattered Small', 'Several small surface craters',
  '{"type":"bg_component","slot":"crater","svg_paths":[{"d":"M8 12 A1.5 1.5 0 1 1 8 15 A1.5 1.5 0 1 1 8 12 Z","fill":"{shadow}"},{"d":"M14 8 A1 1 0 1 1 14 10 A1 1 0 1 1 14 8 Z","fill":"{shadow}"},{"d":"M20 16 A1.5 1.5 0 1 1 20 19 A1.5 1.5 0 1 1 20 16 Z","fill":"{shadow}"},{"d":"M12 20 A1 1 0 1 1 12 22 A1 1 0 1 1 12 20 Z","fill":"{shadow}"}],"color_slots":{"shadow":{"base":"#C8C0A8","variance":0.1}}}',
  '["parallax","component","crater"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Glow variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_moon_glow_a', 'bg_component', 'Moon Glow — Soft Halo', 'Wide soft ambient glow',
  '{"type":"bg_component","slot":"glow","svg_paths":[{"d":"M15 -4 A19 19 0 1 1 15 34 A19 19 0 1 1 15 -4 Z","fill":"{glow}"}],"color_slots":{"glow":{"base":"#E8E0C818","variance":0.05}}}',
  '["parallax","component","glow"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_moon_glow_b', 'bg_component', 'Moon Glow — Tight Ring', 'Close bright ring around disc',
  '{"type":"bg_component","slot":"glow","svg_paths":[{"d":"M15 -1 A16 16 0 1 1 15 31 A16 16 0 1 1 15 -1 Z","fill":"{glow}"},{"d":"M15 1 A14 14 0 1 1 15 29 A14 14 0 1 1 15 1 Z","fill":"{inner}"}],"color_slots":{"glow":{"base":"#E8E0C830","variance":0.05},"inner":{"base":"#00000000","variance":0}}}',
  '["parallax","component","glow"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 6. PUDDLE
-- ============================================================================

-- Element definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_puddle', 'bg_element_def', 'Puddle', 'Ground water puddles with reflections',
  '{"type":"element_definition","element_type":"puddle","components":{"shape":["elem_puddle_shape_a","elem_puddle_shape_b","elem_puddle_shape_c"],"reflection":["elem_puddle_reflection_a","elem_puddle_reflection_b","elem_puddle_reflection_c"],"ripple":["elem_puddle_ripple_a","elem_puddle_ripple_b","elem_puddle_ripple_c"]},"anchor":{"x":0.5,"y":0.5},"base_width":25,"base_height":10}',
  '["parallax","ground","water","shared"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Shape variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_puddle_shape_a', 'bg_component', 'Puddle Shape — Wide Oval', 'Broad elliptical puddle',
  '{"type":"bg_component","slot":"shape","svg_paths":[{"d":"M2 5 Q6 1 12 2 Q20 1 23 5 Q20 9 12 8 Q6 9 2 5 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#2A3A4A","variance":0.15}}}',
  '["parallax","component","shape"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_puddle_shape_b', 'bg_component', 'Puddle Shape — Narrow Streak', 'Elongated thin puddle',
  '{"type":"bg_component","slot":"shape","svg_paths":[{"d":"M1 5 Q5 3 12 4 Q20 3 24 5 Q20 7 12 6 Q5 7 1 5 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#2A3A4A","variance":0.15}}}',
  '["parallax","component","shape"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_puddle_shape_c', 'bg_component', 'Puddle Shape — Irregular Blob', 'Amorphous puddle shape',
  '{"type":"bg_component","slot":"shape","svg_paths":[{"d":"M4 4 Q8 1 14 3 Q18 1 22 4 Q24 6 20 8 Q14 10 8 8 Q3 7 4 4 Z","fill":"{color}"}],"color_slots":{"color":{"base":"#2A3A4A","variance":0.15}}}',
  '["parallax","component","shape"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Reflection variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_puddle_reflection_a', 'bg_component', 'Puddle Reflection — Sky Gradient', 'Subtle sky color reflection',
  '{"type":"bg_component","slot":"reflection","svg_paths":[{"d":"M6 4 Q12 2 18 4 Q12 6 6 4 Z","fill":"{reflect}"}],"color_slots":{"reflect":{"base":"#4A5A7A30","variance":0.1}}}',
  '["parallax","component","reflection"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_puddle_reflection_b', 'bg_component', 'Puddle Reflection — Light Streak', 'Bright streetlight reflection',
  '{"type":"bg_component","slot":"reflection","svg_paths":[{"d":"M10 4 L14 4 L13 6 L11 6 Z","fill":"{highlight}"}],"color_slots":{"highlight":{"base":"#FFEECC40","variance":0.1}}}',
  '["parallax","component","reflection"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_puddle_reflection_c', 'bg_component', 'Puddle Reflection — Moon Shimmer', 'Soft moonlight shimmer',
  '{"type":"bg_component","slot":"reflection","svg_paths":[{"d":"M8 3 Q12 2 16 3 Q14 5 10 5 Q8 5 8 3 Z","fill":"{glow}"},{"d":"M11 4 L13 4 L13 5 L11 5 Z","fill":"{highlight}"}],"color_slots":{"glow":{"base":"#C8D8E820","variance":0.1},"highlight":{"base":"#E8E8F040","variance":0.1}}}',
  '["parallax","component","reflection"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Ripple variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_puddle_ripple_a', 'bg_component', 'Puddle Ripple — Single Drop', 'One concentric ripple set',
  '{"type":"bg_component","slot":"ripple","svg_paths":[{"d":"M12 5 A2 1 0 1 1 12 7 A2 1 0 1 1 12 5 Z","fill":"none","stroke":"{ripple}","stroke_width":0.3},{"d":"M12 4 A3.5 1.8 0 1 1 12 7.6 A3.5 1.8 0 1 1 12 4 Z","fill":"none","stroke":"{ripple}","stroke_width":0.2}],"color_slots":{"ripple":{"base":"#FFFFFF30","variance":0.05}}}',
  '["parallax","component","ripple"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_puddle_ripple_b', 'bg_component', 'Puddle Ripple — Double Drop', 'Two overlapping ripple centers',
  '{"type":"bg_component","slot":"ripple","svg_paths":[{"d":"M8 5 A2 1 0 1 1 8 7 A2 1 0 1 1 8 5 Z","fill":"none","stroke":"{ripple}","stroke_width":0.3},{"d":"M16 5 A2 1 0 1 1 16 7 A2 1 0 1 1 16 5 Z","fill":"none","stroke":"{ripple}","stroke_width":0.3}],"color_slots":{"ripple":{"base":"#FFFFFF25","variance":0.05}}}',
  '["parallax","component","ripple"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_puddle_ripple_c', 'bg_component', 'Puddle Ripple — Wind Lines', 'Parallel wind-blown surface lines',
  '{"type":"bg_component","slot":"ripple","svg_paths":[{"d":"M4 4 Q12 3 20 4","fill":"none","stroke":"{ripple}","stroke_width":0.3},{"d":"M6 6 Q12 5 18 6","fill":"none","stroke":"{ripple}","stroke_width":0.2},{"d":"M5 7.5 Q12 7 19 7.5","fill":"none","stroke":"{ripple}","stroke_width":0.2}],"color_slots":{"ripple":{"base":"#FFFFFF20","variance":0.05}}}',
  '["parallax","component","ripple"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 7. ROCK
-- ============================================================================

-- Element definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_rock', 'bg_element_def', 'Rock', 'Boulders and stones with cracks and moss',
  '{"type":"element_definition","element_type":"rock","components":{"shape":["elem_rock_shape_a","elem_rock_shape_b","elem_rock_shape_c"],"crack":["elem_rock_crack_a","elem_rock_crack_b","elem_rock_crack_c"],"moss":["elem_rock_moss_a","elem_rock_moss_b","elem_rock_moss_c"]},"anchor":{"x":0.5,"y":1.0},"base_width":20,"base_height":18}',
  '["parallax","ground","terrain","shared"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Shape variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_rock_shape_a', 'bg_component', 'Rock Shape — Rounded Boulder', 'Smooth rounded boulder',
  '{"type":"bg_component","slot":"shape","svg_paths":[{"d":"M3 16 Q1 10 5 5 Q10 1 15 4 Q19 2 18 10 Q19 16 3 16 Z","fill":"{color}"},{"d":"M5 5 Q10 3 15 4 Q12 6 7 7 Z","fill":"{highlight}"}],"color_slots":{"color":{"base":"#6A6A6A","variance":0.15},"highlight":{"base":"#8A8A8A","variance":0.1}}}',
  '["parallax","component","shape"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_rock_shape_b', 'bg_component', 'Rock Shape — Angular Chunk', 'Sharp-edged angular rock',
  '{"type":"bg_component","slot":"shape","svg_paths":[{"d":"M2 16 L4 8 L8 3 L14 2 L18 6 L17 16 Z","fill":"{color}"},{"d":"M8 3 L14 2 L12 6 L9 5 Z","fill":"{highlight}"}],"color_slots":{"color":{"base":"#5A5A5A","variance":0.15},"highlight":{"base":"#7A7A7A","variance":0.1}}}',
  '["parallax","component","shape"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_rock_shape_c', 'bg_component', 'Rock Shape — Flat Slab', 'Low wide flat stone',
  '{"type":"bg_component","slot":"shape","svg_paths":[{"d":"M1 16 L2 10 Q6 7 10 8 Q14 6 18 9 L19 16 Z","fill":"{color}"},{"d":"M2 10 Q6 8 10 9 Q14 7 18 9 L17 11 Q12 10 7 11 Z","fill":"{highlight}"}],"color_slots":{"color":{"base":"#7A7A6A","variance":0.15},"highlight":{"base":"#9A9A8A","variance":0.1}}}',
  '["parallax","component","shape"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Crack variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_rock_crack_a', 'bg_component', 'Rock Crack — Vertical Split', 'Deep vertical crevice',
  '{"type":"bg_component","slot":"crack","svg_paths":[{"d":"M10 3 L9 8 L11 12 L10 16","fill":"none","stroke":"{crack}","stroke_width":0.5}],"color_slots":{"crack":{"base":"#3A3A3A","variance":0.1}}}',
  '["parallax","component","crack"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_rock_crack_b', 'bg_component', 'Rock Crack — Branching', 'Forked crack pattern',
  '{"type":"bg_component","slot":"crack","svg_paths":[{"d":"M6 5 L10 9 L14 8","fill":"none","stroke":"{crack}","stroke_width":0.5},{"d":"M10 9 L9 14","fill":"none","stroke":"{crack}","stroke_width":0.4}],"color_slots":{"crack":{"base":"#3A3A3A","variance":0.1}}}',
  '["parallax","component","crack"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_rock_crack_c', 'bg_component', 'Rock Crack — Surface Scratches', 'Shallow surface scratch marks',
  '{"type":"bg_component","slot":"crack","svg_paths":[{"d":"M4 7 L8 9","fill":"none","stroke":"{crack}","stroke_width":0.3},{"d":"M7 5 L11 8","fill":"none","stroke":"{crack}","stroke_width":0.3},{"d":"M12 10 L16 11","fill":"none","stroke":"{crack}","stroke_width":0.3}],"color_slots":{"crack":{"base":"#4A4A4A","variance":0.1}}}',
  '["parallax","component","crack"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Moss variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_rock_moss_a', 'bg_component', 'Rock Moss — Top Patch', 'Moss growing on top surface',
  '{"type":"bg_component","slot":"moss","svg_paths":[{"d":"M6 4 Q8 2 12 3 Q14 4 12 6 Q9 7 6 4 Z","fill":"{moss}"}],"color_slots":{"moss":{"base":"#4A6A3A","variance":0.2}}}',
  '["parallax","component","moss"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_rock_moss_b', 'bg_component', 'Rock Moss — Side Creep', 'Moss creeping up the side',
  '{"type":"bg_component","slot":"moss","svg_paths":[{"d":"M2 14 Q3 10 5 11 Q4 14 2 14 Z","fill":"{moss}"},{"d":"M3 12 Q4 9 6 10 Q5 12 3 12 Z","fill":"{moss_light}"}],"color_slots":{"moss":{"base":"#3A5A2A","variance":0.2},"moss_light":{"base":"#5A7A4A","variance":0.15}}}',
  '["parallax","component","moss"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_rock_moss_c', 'bg_component', 'Rock Moss — Lichen Spots', 'Scattered lichen patches',
  '{"type":"bg_component","slot":"moss","svg_paths":[{"d":"M5 6 A1.5 1.5 0 1 1 5 9 A1.5 1.5 0 1 1 5 6 Z","fill":"{lichen}"},{"d":"M13 8 A1 1 0 1 1 13 10 A1 1 0 1 1 13 8 Z","fill":"{lichen}"},{"d":"M9 11 A1.2 1.2 0 1 1 9 13.4 A1.2 1.2 0 1 1 9 11 Z","fill":"{lichen}"}],"color_slots":{"lichen":{"base":"#8A9A5A","variance":0.2}}}',
  '["parallax","component","moss"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

COMMIT;
