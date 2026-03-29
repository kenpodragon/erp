-- ============================================================================
-- Book 2 — 90s Florida Parallax Background Elements (Phase 4)
-- 12 element types: school, suburban, office, sports environments
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. LOCKER — School hallway lockers (10x40)
-- ============================================================================

-- Definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_locker', 'bg_element_def', 'Locker', 'Standard school hallway locker',
  '{"type": "element_definition", "element_type": "locker", "components": {"body": ["elem_locker_body_a", "elem_locker_body_b", "elem_locker_body_c"], "door": ["elem_locker_door_a", "elem_locker_door_b", "elem_locker_door_c"], "vent": ["elem_locker_vent_a", "elem_locker_vent_b"]}, "anchor": {"x": 0.5, "y": 1.0}, "base_width": 10, "base_height": 40}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Body variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_locker_body_a', 'bg_component', 'Locker Body A', 'Blue-gray locker body',
  '{"type": "bg_component", "slot": "body", "svg_paths": [{"d": "M0 0 L10 0 L10 40 L0 40 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#5566778", "variance": 0.08}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_locker_body_b', 'bg_component', 'Locker Body B', 'Beige locker body',
  '{"type": "bg_component", "slot": "body", "svg_paths": [{"d": "M0 0 L10 0 L10 40 L0 40 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#CCBB99", "variance": 0.08}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_locker_body_c', 'bg_component', 'Locker Body C', 'Forest green locker body',
  '{"type": "bg_component", "slot": "body", "svg_paths": [{"d": "M0 0 L10 0 L10 40 L0 40 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#446655", "variance": 0.08}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Door variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_locker_door_a', 'bg_component', 'Locker Door A', 'Flat panel door with handle indent',
  '{"type": "bg_component", "slot": "door", "svg_paths": [{"d": "M1 1 L9 1 L9 39 L1 39 Z", "fill": "{panel}"}, {"d": "M7 18 L8 18 L8 22 L7 22 Z", "fill": "{handle}"}], "color_slots": {"panel": {"base": "#667788", "variance": 0.06}, "handle": {"base": "#444444", "variance": 0.05}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_locker_door_b', 'bg_component', 'Locker Door B', 'Recessed panel door',
  '{"type": "bg_component", "slot": "door", "svg_paths": [{"d": "M1 1 L9 1 L9 39 L1 39 Z", "fill": "{panel}"}, {"d": "M2 3 L8 3 L8 37 L2 37 Z", "fill": "{recess}"}], "color_slots": {"panel": {"base": "#778899", "variance": 0.06}, "recess": {"base": "#667788", "variance": 0.05}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_locker_door_c', 'bg_component', 'Locker Door C', 'Door with diagonal brace',
  '{"type": "bg_component", "slot": "door", "svg_paths": [{"d": "M1 1 L9 1 L9 39 L1 39 Z", "fill": "{panel}"}, {"d": "M2 5 L8 35 L8 37 L2 7 Z", "fill": "{brace}"}], "color_slots": {"panel": {"base": "#556677", "variance": 0.06}, "brace": {"base": "#445566", "variance": 0.05}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Vent variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_locker_vent_a', 'bg_component', 'Locker Vent A', 'Three horizontal slats',
  '{"type": "bg_component", "slot": "vent", "svg_paths": [{"d": "M2 2 L8 2 L8 3 L2 3 Z", "fill": "{slat}"}, {"d": "M2 4 L8 4 L8 5 L2 5 Z", "fill": "{slat}"}, {"d": "M2 6 L8 6 L8 7 L2 7 Z", "fill": "{slat}"}], "color_slots": {"slat": {"base": "#333333", "variance": 0.05}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_locker_vent_b', 'bg_component', 'Locker Vent B', 'Perforated grid pattern',
  '{"type": "bg_component", "slot": "vent", "svg_paths": [{"d": "M2 2 L8 2 L8 8 L2 8 Z", "fill": "{bg}"}, {"d": "M3 3 L4 3 L4 4 L3 4 Z M5 3 L6 3 L6 4 L5 4 Z M3 5 L4 5 L4 6 L3 6 Z M5 5 L6 5 L6 6 L5 6 Z", "fill": "{holes}"}], "color_slots": {"bg": {"base": "#444444", "variance": 0.05}, "holes": {"base": "#222222", "variance": 0.03}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 2. CLASSROOM DESK — School desks (25x22)
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_classroom_desk', 'bg_element_def', 'Classroom Desk', 'Standard school desk with attached chair',
  '{"type": "element_definition", "element_type": "classroom_desk", "components": {"top": ["elem_classroom_desk_top_a", "elem_classroom_desk_top_b", "elem_classroom_desk_top_c"], "legs": ["elem_classroom_desk_legs_a", "elem_classroom_desk_legs_b"], "chair": ["elem_classroom_desk_chair_a", "elem_classroom_desk_chair_b"]}, "anchor": {"x": 0.5, "y": 1.0}, "base_width": 25, "base_height": 22}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Top variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_classroom_desk_top_a', 'bg_component', 'Desk Top A', 'Light wood laminate top',
  '{"type": "bg_component", "slot": "top", "svg_paths": [{"d": "M3 8 L25 8 L25 12 L3 12 Z", "fill": "{surface}"}], "color_slots": {"surface": {"base": "#CCAA77", "variance": 0.1}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_classroom_desk_top_b', 'bg_component', 'Desk Top B', 'Dark composite top',
  '{"type": "bg_component", "slot": "top", "svg_paths": [{"d": "M3 8 L25 8 L25 12 L3 12 Z", "fill": "{surface}"}, {"d": "M4 9 L24 9 L24 11 L4 11 Z", "fill": "{edge}"}], "color_slots": {"surface": {"base": "#664433", "variance": 0.08}, "edge": {"base": "#553322", "variance": 0.06}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_classroom_desk_top_c', 'bg_component', 'Desk Top C', 'Gray speckled top',
  '{"type": "bg_component", "slot": "top", "svg_paths": [{"d": "M3 8 L25 8 Q25 9 25 12 L3 12 Q3 9 3 8 Z", "fill": "{surface}"}], "color_slots": {"surface": {"base": "#AAAAAA", "variance": 0.1}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Legs variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_classroom_desk_legs_a', 'bg_component', 'Desk Legs A', 'Tubular steel legs',
  '{"type": "bg_component", "slot": "legs", "svg_paths": [{"d": "M5 12 L6 12 L6 22 L5 22 Z", "fill": "{metal}"}, {"d": "M22 12 L23 12 L23 22 L22 22 Z", "fill": "{metal}"}], "color_slots": {"metal": {"base": "#777777", "variance": 0.06}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_classroom_desk_legs_b', 'bg_component', 'Desk Legs B', 'Angled chrome legs',
  '{"type": "bg_component", "slot": "legs", "svg_paths": [{"d": "M4 12 L6 12 L8 22 L4 22 Z", "fill": "{metal}"}, {"d": "M21 12 L23 12 L23 22 L19 22 Z", "fill": "{metal}"}], "color_slots": {"metal": {"base": "#888888", "variance": 0.06}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Chair variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_classroom_desk_chair_a', 'bg_component', 'Desk Chair A', 'Orange molded plastic chair',
  '{"type": "bg_component", "slot": "chair", "svg_paths": [{"d": "M0 10 L3 10 L3 18 Q1 19 0 18 Z", "fill": "{seat}"}], "color_slots": {"seat": {"base": "#CC6633", "variance": 0.1}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_classroom_desk_chair_b', 'bg_component', 'Desk Chair B', 'Blue plastic chair',
  '{"type": "bg_component", "slot": "chair", "svg_paths": [{"d": "M0 10 L3 10 L3 18 Q1 19 0 18 Z", "fill": "{seat}"}], "color_slots": {"seat": {"base": "#335599", "variance": 0.1}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 3. TROPHY CASE — Glass display cases (20x35)
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_trophy_case', 'bg_element_def', 'Trophy Case', 'Glass trophy display case in school hallway',
  '{"type": "element_definition", "element_type": "trophy_case", "components": {"case": ["elem_trophy_case_case_a", "elem_trophy_case_case_b"], "shelf": ["elem_trophy_case_shelf_a", "elem_trophy_case_shelf_b"], "trophy": ["elem_trophy_case_trophy_a", "elem_trophy_case_trophy_b", "elem_trophy_case_trophy_c"]}, "anchor": {"x": 0.5, "y": 1.0}, "base_width": 20, "base_height": 35}',
  '["book2", "florida", "school", "sports"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Case variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_trophy_case_case_a', 'bg_component', 'Trophy Case A', 'Oak frame glass case',
  '{"type": "bg_component", "slot": "case", "svg_paths": [{"d": "M0 0 L20 0 L20 35 L0 35 Z", "fill": "{frame}"}, {"d": "M2 2 L18 2 L18 33 L2 33 Z", "fill": "{glass}"}], "color_slots": {"frame": {"base": "#885522", "variance": 0.08}, "glass": {"base": "#CCDDEE", "variance": 0.04}}}',
  '["book2", "florida", "school", "sports"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_trophy_case_case_b', 'bg_component', 'Trophy Case B', 'Metal frame glass case',
  '{"type": "bg_component", "slot": "case", "svg_paths": [{"d": "M0 0 L20 0 L20 35 L0 35 Z", "fill": "{frame}"}, {"d": "M1 1 L19 1 L19 34 L1 34 Z", "fill": "{glass}"}], "color_slots": {"frame": {"base": "#666666", "variance": 0.06}, "glass": {"base": "#DDEEFF", "variance": 0.04}}}',
  '["book2", "florida", "school", "sports"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Shelf variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_trophy_case_shelf_a', 'bg_component', 'Trophy Shelf A', 'Glass shelf',
  '{"type": "bg_component", "slot": "shelf", "svg_paths": [{"d": "M3 12 L17 12 L17 13 L3 13 Z", "fill": "{shelf}"}, {"d": "M3 23 L17 23 L17 24 L3 24 Z", "fill": "{shelf}"}], "color_slots": {"shelf": {"base": "#BBCCDD", "variance": 0.04}}}',
  '["book2", "florida", "school", "sports"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_trophy_case_shelf_b', 'bg_component', 'Trophy Shelf B', 'Wood shelf',
  '{"type": "bg_component", "slot": "shelf", "svg_paths": [{"d": "M3 11 L17 11 L17 13 L3 13 Z", "fill": "{shelf}"}, {"d": "M3 22 L17 22 L17 24 L3 24 Z", "fill": "{shelf}"}], "color_slots": {"shelf": {"base": "#AA8855", "variance": 0.06}}}',
  '["book2", "florida", "school", "sports"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Trophy variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_trophy_case_trophy_a', 'bg_component', 'Trophy A', 'Tall cup trophy',
  '{"type": "bg_component", "slot": "trophy", "svg_paths": [{"d": "M8 4 L12 4 L13 8 Q10 10 7 8 Z", "fill": "{cup}"}, {"d": "M9 8 L11 8 L11 11 L9 11 Z", "fill": "{stem}"}, {"d": "M8 11 L12 11 L12 12 L8 12 Z", "fill": "{base_plate}"}], "color_slots": {"cup": {"base": "#DDAA33", "variance": 0.08}, "stem": {"base": "#AA8822", "variance": 0.06}, "base_plate": {"base": "#554422", "variance": 0.05}}}',
  '["book2", "florida", "school", "sports"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_trophy_case_trophy_b', 'bg_component', 'Trophy B', 'Silver plaque award',
  '{"type": "bg_component", "slot": "trophy", "svg_paths": [{"d": "M7 5 L13 5 L13 10 L7 10 Z", "fill": "{plaque}"}, {"d": "M9 10 L11 10 L11 12 L9 12 Z", "fill": "{stand}"}], "color_slots": {"plaque": {"base": "#CCCCCC", "variance": 0.06}, "stand": {"base": "#554433", "variance": 0.05}}}',
  '["book2", "florida", "school", "sports"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_trophy_case_trophy_c', 'bg_component', 'Trophy C', 'Small figurine trophy',
  '{"type": "bg_component", "slot": "trophy", "svg_paths": [{"d": "M9 5 L11 5 L11 9 L9 9 Z", "fill": "{figure}"}, {"d": "M8 9 L12 9 L12 10 L8 10 Z", "fill": "{pedestal}"}], "color_slots": {"figure": {"base": "#DDBB44", "variance": 0.08}, "pedestal": {"base": "#333333", "variance": 0.05}}}',
  '["book2", "florida", "school", "sports"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 4. CEILING TILE — Drop ceiling panels (30x8)
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_ceiling_tile', 'bg_element_def', 'Ceiling Tile', 'Drop ceiling tile panel',
  '{"type": "element_definition", "element_type": "ceiling_tile", "components": {"frame": ["elem_ceiling_tile_frame_a", "elem_ceiling_tile_frame_b", "elem_ceiling_tile_frame_c"], "tile": ["elem_ceiling_tile_tile_a", "elem_ceiling_tile_tile_b", "elem_ceiling_tile_tile_c"], "light": ["elem_ceiling_tile_light_a", "elem_ceiling_tile_light_b"]}, "anchor": {"x": 0.5, "y": 0.0}, "base_width": 30, "base_height": 8}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Frame variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_ceiling_tile_frame_a', 'bg_component', 'Ceiling Frame A', 'White T-bar grid',
  '{"type": "bg_component", "slot": "frame", "svg_paths": [{"d": "M0 0 L30 0 L30 1 L0 1 Z", "fill": "{bar}"}, {"d": "M0 7 L30 7 L30 8 L0 8 Z", "fill": "{bar}"}, {"d": "M15 0 L16 0 L16 8 L15 8 Z", "fill": "{bar}"}], "color_slots": {"bar": {"base": "#EEEEEE", "variance": 0.04}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_ceiling_tile_frame_b', 'bg_component', 'Ceiling Frame B', 'Off-white aged grid',
  '{"type": "bg_component", "slot": "frame", "svg_paths": [{"d": "M0 0 L30 0 L30 1 L0 1 Z", "fill": "{bar}"}, {"d": "M0 7 L30 7 L30 8 L0 8 Z", "fill": "{bar}"}, {"d": "M10 0 L11 0 L11 8 L10 8 Z", "fill": "{bar}"}, {"d": "M20 0 L21 0 L21 8 L20 8 Z", "fill": "{bar}"}], "color_slots": {"bar": {"base": "#DDDDCC", "variance": 0.05}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_ceiling_tile_frame_c', 'bg_component', 'Ceiling Frame C', 'Narrow strip grid',
  '{"type": "bg_component", "slot": "frame", "svg_paths": [{"d": "M0 0 L30 0 L30 0.5 L0 0.5 Z", "fill": "{bar}"}, {"d": "M0 7.5 L30 7.5 L30 8 L0 8 Z", "fill": "{bar}"}], "color_slots": {"bar": {"base": "#DDDDDD", "variance": 0.04}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Tile variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_ceiling_tile_tile_a', 'bg_component', 'Ceiling Tile A', 'Standard white acoustic tile',
  '{"type": "bg_component", "slot": "tile", "svg_paths": [{"d": "M1 1 L14 1 L14 7 L1 7 Z", "fill": "{tile}"}], "color_slots": {"tile": {"base": "#F0F0EE", "variance": 0.04}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_ceiling_tile_tile_b', 'bg_component', 'Ceiling Tile B', 'Yellowed water-stained tile',
  '{"type": "bg_component", "slot": "tile", "svg_paths": [{"d": "M1 1 L14 1 L14 7 L1 7 Z", "fill": "{tile}"}, {"d": "M4 2 Q6 4 8 3 Q7 5 5 5 Z", "fill": "{stain}"}], "color_slots": {"tile": {"base": "#EEEEDD", "variance": 0.05}, "stain": {"base": "#DDCC99", "variance": 0.08}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_ceiling_tile_tile_c', 'bg_component', 'Ceiling Tile C', 'Textured fissured tile',
  '{"type": "bg_component", "slot": "tile", "svg_paths": [{"d": "M1 1 L14 1 L14 7 L1 7 Z", "fill": "{tile}"}, {"d": "M3 3 L5 2 M7 5 L9 4 M11 3 L13 2", "fill": "none", "stroke": "{texture}", "stroke-width": 0.3}], "color_slots": {"tile": {"base": "#F2F2F0", "variance": 0.03}, "texture": {"base": "#DDDDDD", "variance": 0.04}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Light variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_ceiling_tile_light_a', 'bg_component', 'Ceiling Light A', 'Long fluorescent panel',
  '{"type": "bg_component", "slot": "light", "svg_paths": [{"d": "M2 2 L28 2 L28 6 L2 6 Z", "fill": "{housing}"}, {"d": "M3 3 L27 3 L27 5 L3 5 Z", "fill": "{glow}"}], "color_slots": {"housing": {"base": "#CCCCCC", "variance": 0.04}, "glow": {"base": "#FFFFEE", "variance": 0.03}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_ceiling_tile_light_b', 'bg_component', 'Ceiling Light B', 'Square recessed light',
  '{"type": "bg_component", "slot": "light", "svg_paths": [{"d": "M11 1 L19 1 L19 7 L11 7 Z", "fill": "{housing}"}, {"d": "M12 2 L18 2 L18 6 L12 6 Z", "fill": "{glow}"}], "color_slots": {"housing": {"base": "#BBBBBB", "variance": 0.04}, "glow": {"base": "#FFEEDD", "variance": 0.04}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 5. FILING CABINET — Office file cabinets (12x35)
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_filing_cabinet', 'bg_element_def', 'Filing Cabinet', 'Standard office filing cabinet',
  '{"type": "element_definition", "element_type": "filing_cabinet", "components": {"body": ["elem_filing_cabinet_body_a", "elem_filing_cabinet_body_b", "elem_filing_cabinet_body_c"], "drawer": ["elem_filing_cabinet_drawer_a", "elem_filing_cabinet_drawer_b", "elem_filing_cabinet_drawer_c"], "handle": ["elem_filing_cabinet_handle_a", "elem_filing_cabinet_handle_b"]}, "anchor": {"x": 0.5, "y": 1.0}, "base_width": 12, "base_height": 35}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Body variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_filing_cabinet_body_a', 'bg_component', 'Filing Cabinet Body A', 'Gray steel cabinet',
  '{"type": "bg_component", "slot": "body", "svg_paths": [{"d": "M0 0 L12 0 L12 35 L0 35 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#888888", "variance": 0.06}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_filing_cabinet_body_b', 'bg_component', 'Filing Cabinet Body B', 'Putty beige cabinet',
  '{"type": "bg_component", "slot": "body", "svg_paths": [{"d": "M0 0 L12 0 L12 35 L0 35 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#CCBB99", "variance": 0.06}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_filing_cabinet_body_c', 'bg_component', 'Filing Cabinet Body C', 'Black cabinet',
  '{"type": "bg_component", "slot": "body", "svg_paths": [{"d": "M0 0 L12 0 L12 35 L0 35 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#333333", "variance": 0.05}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Drawer variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_filing_cabinet_drawer_a', 'bg_component', 'Filing Drawer A', 'Four equal drawers',
  '{"type": "bg_component", "slot": "drawer", "svg_paths": [{"d": "M1 1 L11 1 L11 8 L1 8 Z", "fill": "{face}"}, {"d": "M1 9 L11 9 L11 16 L1 16 Z", "fill": "{face}"}, {"d": "M1 17 L11 17 L11 24 L1 24 Z", "fill": "{face}"}, {"d": "M1 25 L11 25 L11 32 L1 32 Z", "fill": "{face}"}], "color_slots": {"face": {"base": "#999999", "variance": 0.06}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_filing_cabinet_drawer_b', 'bg_component', 'Filing Drawer B', 'Two large drawers',
  '{"type": "bg_component", "slot": "drawer", "svg_paths": [{"d": "M1 2 L11 2 L11 16 L1 16 Z", "fill": "{face}"}, {"d": "M1 18 L11 18 L11 32 L1 32 Z", "fill": "{face}"}], "color_slots": {"face": {"base": "#AAAAAA", "variance": 0.06}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_filing_cabinet_drawer_c', 'bg_component', 'Filing Drawer C', 'Three drawers with label slots',
  '{"type": "bg_component", "slot": "drawer", "svg_paths": [{"d": "M1 1 L11 1 L11 10 L1 10 Z", "fill": "{face}"}, {"d": "M4 4 L8 4 L8 6 L4 6 Z", "fill": "{label}"}, {"d": "M1 12 L11 12 L11 21 L1 21 Z", "fill": "{face}"}, {"d": "M4 15 L8 15 L8 17 L4 17 Z", "fill": "{label}"}, {"d": "M1 23 L11 23 L11 32 L1 32 Z", "fill": "{face}"}, {"d": "M4 26 L8 26 L8 28 L4 28 Z", "fill": "{label}"}], "color_slots": {"face": {"base": "#999999", "variance": 0.06}, "label": {"base": "#EEEECC", "variance": 0.05}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Handle variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_filing_cabinet_handle_a', 'bg_component', 'Filing Handle A', 'Chrome bar handles',
  '{"type": "bg_component", "slot": "handle", "svg_paths": [{"d": "M4 5 L8 5 L8 6 L4 6 Z", "fill": "{chrome}"}], "color_slots": {"chrome": {"base": "#CCCCCC", "variance": 0.05}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_filing_cabinet_handle_b', 'bg_component', 'Filing Handle B', 'Recessed cup pulls',
  '{"type": "bg_component", "slot": "handle", "svg_paths": [{"d": "M5 5 Q6 4 7 5 L7 6 Q6 7 5 6 Z", "fill": "{pull}"}], "color_slots": {"pull": {"base": "#555555", "variance": 0.05}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 6. PARKING METER — Street meters (8x40)
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_parking_meter', 'bg_element_def', 'Parking Meter', 'Coin-operated street parking meter',
  '{"type": "element_definition", "element_type": "parking_meter", "components": {"pole": ["elem_parking_meter_pole_a", "elem_parking_meter_pole_b"], "meter": ["elem_parking_meter_meter_a", "elem_parking_meter_meter_b", "elem_parking_meter_meter_c"], "base_mount": ["elem_parking_meter_base_mount_a", "elem_parking_meter_base_mount_b"]}, "anchor": {"x": 0.5, "y": 1.0}, "base_width": 8, "base_height": 40}',
  '["book2", "florida", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Pole variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_parking_meter_pole_a', 'bg_component', 'Meter Pole A', 'Straight gray pole',
  '{"type": "bg_component", "slot": "pole", "svg_paths": [{"d": "M3 12 L5 12 L5 36 L3 36 Z", "fill": "{metal}"}], "color_slots": {"metal": {"base": "#777777", "variance": 0.06}}}',
  '["book2", "florida", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_parking_meter_pole_b', 'bg_component', 'Meter Pole B', 'Fluted pole',
  '{"type": "bg_component", "slot": "pole", "svg_paths": [{"d": "M3 12 L5 12 L5 36 L3 36 Z", "fill": "{metal}"}, {"d": "M3.5 14 L3.5 34", "fill": "none", "stroke": "{groove}", "stroke-width": 0.3}], "color_slots": {"metal": {"base": "#888888", "variance": 0.06}, "groove": {"base": "#666666", "variance": 0.04}}}',
  '["book2", "florida", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Meter head variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_parking_meter_meter_a', 'bg_component', 'Meter Head A', 'Classic dome-top meter',
  '{"type": "bg_component", "slot": "meter", "svg_paths": [{"d": "M1 5 L7 5 L7 12 L1 12 Z", "fill": "{body}"}, {"d": "M1 5 Q4 1 7 5 Z", "fill": "{dome}"}, {"d": "M2 7 L6 7 L6 10 L2 10 Z", "fill": "{face}"}], "color_slots": {"body": {"base": "#555555", "variance": 0.06}, "dome": {"base": "#666666", "variance": 0.06}, "face": {"base": "#EEEECC", "variance": 0.04}}}',
  '["book2", "florida", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_parking_meter_meter_b', 'bg_component', 'Meter Head B', 'Rectangular digital meter',
  '{"type": "bg_component", "slot": "meter", "svg_paths": [{"d": "M1 4 L7 4 L7 12 L1 12 Z", "fill": "{body}"}, {"d": "M2 5 L6 5 L6 8 L2 8 Z", "fill": "{screen}"}], "color_slots": {"body": {"base": "#444444", "variance": 0.05}, "screen": {"base": "#99AAAA", "variance": 0.06}}}',
  '["book2", "florida", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_parking_meter_meter_c', 'bg_component', 'Meter Head C', 'Round-face vintage meter',
  '{"type": "bg_component", "slot": "meter", "svg_paths": [{"d": "M1 4 L7 4 L7 13 L1 13 Z", "fill": "{body}"}, {"d": "M4 8 A3 3 0 1 1 4 7.99 Z", "fill": "{face}"}], "color_slots": {"body": {"base": "#666655", "variance": 0.06}, "face": {"base": "#FFEECC", "variance": 0.05}}}',
  '["book2", "florida", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Base mount variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_parking_meter_base_mount_a', 'bg_component', 'Meter Base A', 'Concrete base',
  '{"type": "bg_component", "slot": "base_mount", "svg_paths": [{"d": "M1 36 L7 36 L7 40 L1 40 Z", "fill": "{concrete}"}], "color_slots": {"concrete": {"base": "#999999", "variance": 0.08}}}',
  '["book2", "florida", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_parking_meter_base_mount_b', 'bg_component', 'Meter Base B', 'Flared metal base',
  '{"type": "bg_component", "slot": "base_mount", "svg_paths": [{"d": "M2 36 L6 36 L7 40 L1 40 Z", "fill": "{metal}"}], "color_slots": {"metal": {"base": "#777777", "variance": 0.06}}}',
  '["book2", "florida", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 7. SUBURBAN HOUSE — House silhouettes (50x40)
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_suburban_house', 'bg_element_def', 'Suburban House', 'Florida suburban house silhouette',
  '{"type": "element_definition", "element_type": "suburban_house", "components": {"wall": ["elem_suburban_house_wall_a", "elem_suburban_house_wall_b", "elem_suburban_house_wall_c"], "roof": ["elem_suburban_house_roof_a", "elem_suburban_house_roof_b", "elem_suburban_house_roof_c"], "window": ["elem_suburban_house_window_a", "elem_suburban_house_window_b"]}, "anchor": {"x": 0.5, "y": 1.0}, "base_width": 50, "base_height": 40}',
  '["book2", "florida", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Wall variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_suburban_house_wall_a', 'bg_component', 'House Wall A', 'Stucco beige walls',
  '{"type": "bg_component", "slot": "wall", "svg_paths": [{"d": "M5 15 L45 15 L45 40 L5 40 Z", "fill": "{stucco}"}], "color_slots": {"stucco": {"base": "#DDCCAA", "variance": 0.1}}}',
  '["book2", "florida", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_suburban_house_wall_b', 'bg_component', 'House Wall B', 'Pastel pink stucco',
  '{"type": "bg_component", "slot": "wall", "svg_paths": [{"d": "M5 15 L45 15 L45 40 L5 40 Z", "fill": "{stucco}"}], "color_slots": {"stucco": {"base": "#EECCBB", "variance": 0.08}}}',
  '["book2", "florida", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_suburban_house_wall_c', 'bg_component', 'House Wall C', 'White clapboard siding',
  '{"type": "bg_component", "slot": "wall", "svg_paths": [{"d": "M5 15 L45 15 L45 40 L5 40 Z", "fill": "{siding}"}, {"d": "M5 20 L45 20 M5 25 L45 25 M5 30 L45 30 M5 35 L45 35", "fill": "none", "stroke": "{line}", "stroke-width": 0.3}], "color_slots": {"siding": {"base": "#F0F0EE", "variance": 0.04}, "line": {"base": "#CCCCCC", "variance": 0.04}}}',
  '["book2", "florida", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Roof variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_suburban_house_roof_a', 'bg_component', 'House Roof A', 'Low-pitch shingle roof',
  '{"type": "bg_component", "slot": "roof", "svg_paths": [{"d": "M2 15 L25 2 L48 15 Z", "fill": "{shingle}"}], "color_slots": {"shingle": {"base": "#885544", "variance": 0.1}}}',
  '["book2", "florida", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_suburban_house_roof_b', 'bg_component', 'House Roof B', 'Flat tile roof (Florida style)',
  '{"type": "bg_component", "slot": "roof", "svg_paths": [{"d": "M3 15 L25 5 L47 15 Z", "fill": "{tile}"}], "color_slots": {"tile": {"base": "#CC7755", "variance": 0.1}}}',
  '["book2", "florida", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_suburban_house_roof_c', 'bg_component', 'House Roof C', 'Hip roof gray shingle',
  '{"type": "bg_component", "slot": "roof", "svg_paths": [{"d": "M0 15 L10 5 L40 5 L50 15 Z", "fill": "{shingle}"}], "color_slots": {"shingle": {"base": "#777777", "variance": 0.08}}}',
  '["book2", "florida", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Window variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_suburban_house_window_a', 'bg_component', 'House Window A', 'Double-hung window with shutters',
  '{"type": "bg_component", "slot": "window", "svg_paths": [{"d": "M14 20 L20 20 L20 30 L14 30 Z", "fill": "{glass}"}, {"d": "M12 20 L14 20 L14 30 L12 30 Z", "fill": "{shutter}"}, {"d": "M20 20 L22 20 L22 30 L20 30 Z", "fill": "{shutter}"}], "color_slots": {"glass": {"base": "#99BBDD", "variance": 0.08}, "shutter": {"base": "#335566", "variance": 0.08}}}',
  '["book2", "florida", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_suburban_house_window_b', 'bg_component', 'House Window B', 'Jalousie window (Florida classic)',
  '{"type": "bg_component", "slot": "window", "svg_paths": [{"d": "M15 20 L21 20 L21 30 L15 30 Z", "fill": "{frame}"}, {"d": "M16 21 L20 21 L20 23 L16 23 Z", "fill": "{slat}"}, {"d": "M16 24 L20 24 L20 26 L16 26 Z", "fill": "{slat}"}, {"d": "M16 27 L20 27 L20 29 L16 29 Z", "fill": "{slat}"}], "color_slots": {"frame": {"base": "#EEEEEE", "variance": 0.04}, "slat": {"base": "#AACCDD", "variance": 0.06}}}',
  '["book2", "florida", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 8. OFFICE CUBICLE — Cubicle partitions (30x25)
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_office_cubicle', 'bg_element_def', 'Office Cubicle', 'Standard office cubicle partition',
  '{"type": "element_definition", "element_type": "office_cubicle", "components": {"wall": ["elem_office_cubicle_wall_a", "elem_office_cubicle_wall_b", "elem_office_cubicle_wall_c"], "desk": ["elem_office_cubicle_desk_a", "elem_office_cubicle_desk_b"], "monitor": ["elem_office_cubicle_monitor_a", "elem_office_cubicle_monitor_b"]}, "anchor": {"x": 0.5, "y": 1.0}, "base_width": 30, "base_height": 25}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Wall variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_office_cubicle_wall_a', 'bg_component', 'Cubicle Wall A', 'Gray fabric panel',
  '{"type": "bg_component", "slot": "wall", "svg_paths": [{"d": "M0 0 L30 0 L30 15 L0 15 Z", "fill": "{fabric}"}, {"d": "M0 0 L30 0 L30 1 L0 1 Z", "fill": "{trim}"}], "color_slots": {"fabric": {"base": "#AAAAAA", "variance": 0.06}, "trim": {"base": "#888888", "variance": 0.04}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_office_cubicle_wall_b', 'bg_component', 'Cubicle Wall B', 'Blue-gray fabric panel',
  '{"type": "bg_component", "slot": "wall", "svg_paths": [{"d": "M0 0 L30 0 L30 15 L0 15 Z", "fill": "{fabric}"}, {"d": "M0 0 L30 0 L30 1 L0 1 Z", "fill": "{trim}"}], "color_slots": {"fabric": {"base": "#8899AA", "variance": 0.06}, "trim": {"base": "#667788", "variance": 0.04}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_office_cubicle_wall_c', 'bg_component', 'Cubicle Wall C', 'Mauve fabric panel',
  '{"type": "bg_component", "slot": "wall", "svg_paths": [{"d": "M0 0 L30 0 L30 15 L0 15 Z", "fill": "{fabric}"}, {"d": "M0 0 L30 0 L30 1 L0 1 Z", "fill": "{trim}"}], "color_slots": {"fabric": {"base": "#AA9999", "variance": 0.06}, "trim": {"base": "#887777", "variance": 0.04}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Desk variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_office_cubicle_desk_a', 'bg_component', 'Cubicle Desk A', 'L-shaped laminate desk',
  '{"type": "bg_component", "slot": "desk", "svg_paths": [{"d": "M2 15 L28 15 L28 17 L15 17 L15 20 L2 20 Z", "fill": "{surface}"}], "color_slots": {"surface": {"base": "#BBAA88", "variance": 0.08}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_office_cubicle_desk_b', 'bg_component', 'Cubicle Desk B', 'Straight desk with drawer',
  '{"type": "bg_component", "slot": "desk", "svg_paths": [{"d": "M2 15 L28 15 L28 17 L2 17 Z", "fill": "{surface}"}, {"d": "M20 17 L27 17 L27 22 L20 22 Z", "fill": "{drawer}"}], "color_slots": {"surface": {"base": "#997755", "variance": 0.08}, "drawer": {"base": "#886644", "variance": 0.06}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Monitor variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_office_cubicle_monitor_a', 'bg_component', 'Cubicle Monitor A', 'CRT monitor (90s era)',
  '{"type": "bg_component", "slot": "monitor", "svg_paths": [{"d": "M10 8 L22 8 L22 15 L10 15 Z", "fill": "{housing}"}, {"d": "M11 9 L21 9 L21 14 L11 14 Z", "fill": "{screen}"}, {"d": "M14 15 L18 15 L18 16 L14 16 Z", "fill": "{stand}"}], "color_slots": {"housing": {"base": "#CCCCBB", "variance": 0.05}, "screen": {"base": "#224466", "variance": 0.08}, "stand": {"base": "#BBBBAA", "variance": 0.04}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_office_cubicle_monitor_b', 'bg_component', 'Cubicle Monitor B', 'Smaller beige CRT',
  '{"type": "bg_component", "slot": "monitor", "svg_paths": [{"d": "M12 9 L20 9 L20 15 L12 15 Z", "fill": "{housing}"}, {"d": "M13 10 L19 10 L19 14 L13 14 Z", "fill": "{screen}"}], "color_slots": {"housing": {"base": "#DDDDCC", "variance": 0.05}, "screen": {"base": "#113355", "variance": 0.08}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 9. BLEACHER — Stadium seating (50x30)
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_bleacher', 'bg_element_def', 'Bleacher', 'Stadium bleacher seating',
  '{"type": "element_definition", "element_type": "bleacher", "components": {"seat": ["elem_bleacher_seat_a", "elem_bleacher_seat_b", "elem_bleacher_seat_c"], "rail": ["elem_bleacher_rail_a", "elem_bleacher_rail_b"], "support": ["elem_bleacher_support_a", "elem_bleacher_support_b"]}, "anchor": {"x": 0.5, "y": 1.0}, "base_width": 50, "base_height": 30}',
  '["book2", "florida", "school", "sports"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Seat variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_bleacher_seat_a', 'bg_component', 'Bleacher Seat A', 'Aluminum plank rows',
  '{"type": "bg_component", "slot": "seat", "svg_paths": [{"d": "M5 8 L45 8 L45 10 L5 10 Z", "fill": "{plank}"}, {"d": "M5 14 L45 14 L45 16 L5 16 Z", "fill": "{plank}"}, {"d": "M5 20 L45 20 L45 22 L5 22 Z", "fill": "{plank}"}, {"d": "M5 26 L45 26 L45 28 L5 28 Z", "fill": "{plank}"}], "color_slots": {"plank": {"base": "#BBBBBB", "variance": 0.06}}}',
  '["book2", "florida", "school", "sports"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_bleacher_seat_b', 'bg_component', 'Bleacher Seat B', 'Painted wood benches',
  '{"type": "bg_component", "slot": "seat", "svg_paths": [{"d": "M5 8 L45 8 L45 11 L5 11 Z", "fill": "{bench}"}, {"d": "M5 15 L45 15 L45 18 L5 18 Z", "fill": "{bench}"}, {"d": "M5 22 L45 22 L45 25 L5 25 Z", "fill": "{bench}"}], "color_slots": {"bench": {"base": "#335599", "variance": 0.08}}}',
  '["book2", "florida", "school", "sports"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_bleacher_seat_c', 'bg_component', 'Bleacher Seat C', 'Red stadium seats',
  '{"type": "bg_component", "slot": "seat", "svg_paths": [{"d": "M5 9 L45 9 L45 12 L5 12 Z", "fill": "{seat}"}, {"d": "M5 16 L45 16 L45 19 L5 19 Z", "fill": "{seat}"}, {"d": "M5 23 L45 23 L45 26 L5 26 Z", "fill": "{seat}"}], "color_slots": {"seat": {"base": "#CC3333", "variance": 0.08}}}',
  '["book2", "florida", "school", "sports"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Rail variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_bleacher_rail_a', 'bg_component', 'Bleacher Rail A', 'Pipe railing',
  '{"type": "bg_component", "slot": "rail", "svg_paths": [{"d": "M3 5 L4 5 L4 30 L3 30 Z", "fill": "{pipe}"}, {"d": "M46 5 L47 5 L47 30 L46 30 Z", "fill": "{pipe}"}, {"d": "M3 5 L47 5 L47 6 L3 6 Z", "fill": "{pipe}"}], "color_slots": {"pipe": {"base": "#999999", "variance": 0.06}}}',
  '["book2", "florida", "school", "sports"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_bleacher_rail_b', 'bg_component', 'Bleacher Rail B', 'Chain-link fence rail',
  '{"type": "bg_component", "slot": "rail", "svg_paths": [{"d": "M2 4 L3 4 L3 30 L2 30 Z", "fill": "{post}"}, {"d": "M47 4 L48 4 L48 30 L47 30 Z", "fill": "{post}"}, {"d": "M3 4 L47 4 L47 30 L3 30 Z", "fill": "{mesh}", "fill-opacity": 0.15}], "color_slots": {"post": {"base": "#777777", "variance": 0.05}, "mesh": {"base": "#AAAAAA", "variance": 0.06}}}',
  '["book2", "florida", "school", "sports"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Support variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_bleacher_support_a', 'bg_component', 'Bleacher Support A', 'Diagonal steel bracing',
  '{"type": "bg_component", "slot": "support", "svg_paths": [{"d": "M8 8 L10 8 L5 30 L3 30 Z", "fill": "{steel}"}, {"d": "M40 8 L42 8 L47 30 L45 30 Z", "fill": "{steel}"}], "color_slots": {"steel": {"base": "#888888", "variance": 0.06}}}',
  '["book2", "florida", "school", "sports"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_bleacher_support_b', 'bg_component', 'Bleacher Support B', 'Vertical I-beam supports',
  '{"type": "bg_component", "slot": "support", "svg_paths": [{"d": "M10 8 L12 8 L12 30 L10 30 Z", "fill": "{beam}"}, {"d": "M25 8 L27 8 L27 30 L25 30 Z", "fill": "{beam}"}, {"d": "M38 8 L40 8 L40 30 L38 30 Z", "fill": "{beam}"}], "color_slots": {"beam": {"base": "#777777", "variance": 0.06}}}',
  '["book2", "florida", "school", "sports"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 10. CAFETERIA TABLE — Lunch tables (40x20)
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_cafeteria_table', 'bg_element_def', 'Cafeteria Table', 'School cafeteria lunch table with benches',
  '{"type": "element_definition", "element_type": "cafeteria_table", "components": {"top": ["elem_cafeteria_table_top_a", "elem_cafeteria_table_top_b", "elem_cafeteria_table_top_c"], "bench": ["elem_cafeteria_table_bench_a", "elem_cafeteria_table_bench_b"], "legs": ["elem_cafeteria_table_legs_a", "elem_cafeteria_table_legs_b"]}, "anchor": {"x": 0.5, "y": 1.0}, "base_width": 40, "base_height": 20}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Top variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_cafeteria_table_top_a', 'bg_component', 'Cafeteria Top A', 'Brown laminate folding top',
  '{"type": "bg_component", "slot": "top", "svg_paths": [{"d": "M5 8 L35 8 L35 11 L5 11 Z", "fill": "{surface}"}], "color_slots": {"surface": {"base": "#AA8866", "variance": 0.1}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_cafeteria_table_top_b', 'bg_component', 'Cafeteria Top B', 'Speckled gray surface',
  '{"type": "bg_component", "slot": "top", "svg_paths": [{"d": "M5 8 L35 8 L35 11 L5 11 Z", "fill": "{surface}"}], "color_slots": {"surface": {"base": "#AAAAAA", "variance": 0.08}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_cafeteria_table_top_c', 'bg_component', 'Cafeteria Top C', 'Blue laminate surface',
  '{"type": "bg_component", "slot": "top", "svg_paths": [{"d": "M5 8 L35 8 L35 11 L5 11 Z", "fill": "{surface}"}], "color_slots": {"surface": {"base": "#556688", "variance": 0.08}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Bench variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_cafeteria_table_bench_a', 'bg_component', 'Cafeteria Bench A', 'Attached round-seat benches',
  '{"type": "bg_component", "slot": "bench", "svg_paths": [{"d": "M3 12 L7 12 L7 14 L3 14 Z", "fill": "{seat}"}, {"d": "M17 12 L21 12 L21 14 L17 14 Z", "fill": "{seat}"}, {"d": "M33 12 L37 12 L37 14 L33 14 Z", "fill": "{seat}"}], "color_slots": {"seat": {"base": "#CC6633", "variance": 0.08}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_cafeteria_table_bench_b', 'bg_component', 'Cafeteria Bench B', 'Long continuous bench',
  '{"type": "bg_component", "slot": "bench", "svg_paths": [{"d": "M5 12 L35 12 L35 14 L5 14 Z", "fill": "{bench}"}], "color_slots": {"bench": {"base": "#335599", "variance": 0.08}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Legs variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_cafeteria_table_legs_a', 'bg_component', 'Cafeteria Legs A', 'Folding X-frame legs',
  '{"type": "bg_component", "slot": "legs", "svg_paths": [{"d": "M8 11 L12 11 L14 20 L6 20 Z", "fill": "{metal}"}, {"d": "M28 11 L32 11 L34 20 L26 20 Z", "fill": "{metal}"}], "color_slots": {"metal": {"base": "#777777", "variance": 0.06}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_cafeteria_table_legs_b', 'bg_component', 'Cafeteria Legs B', 'Pedestal base legs',
  '{"type": "bg_component", "slot": "legs", "svg_paths": [{"d": "M9 11 L11 11 L11 18 L9 18 Z", "fill": "{post}"}, {"d": "M6 18 L14 18 L14 20 L6 20 Z", "fill": "{foot}"}, {"d": "M29 11 L31 11 L31 18 L29 18 Z", "fill": "{post}"}, {"d": "M26 18 L34 18 L34 20 L26 20 Z", "fill": "{foot}"}], "color_slots": {"post": {"base": "#888888", "variance": 0.06}, "foot": {"base": "#666666", "variance": 0.05}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 11. WATER FOUNTAIN — Drinking fountains (10x25)
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_water_fountain', 'bg_element_def', 'Water Fountain', 'Wall-mounted drinking fountain',
  '{"type": "element_definition", "element_type": "water_fountain", "components": {"body": ["elem_water_fountain_body_a", "elem_water_fountain_body_b", "elem_water_fountain_body_c"], "basin": ["elem_water_fountain_basin_a", "elem_water_fountain_basin_b"], "spout": ["elem_water_fountain_spout_a", "elem_water_fountain_spout_b"]}, "anchor": {"x": 0.5, "y": 1.0}, "base_width": 10, "base_height": 25}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Body variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_water_fountain_body_a', 'bg_component', 'Fountain Body A', 'Stainless steel body',
  '{"type": "bg_component", "slot": "body", "svg_paths": [{"d": "M1 5 L9 5 L9 25 L1 25 Z", "fill": "{steel}"}], "color_slots": {"steel": {"base": "#BBBBBB", "variance": 0.06}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_water_fountain_body_b', 'bg_component', 'Fountain Body B', 'White porcelain body',
  '{"type": "bg_component", "slot": "body", "svg_paths": [{"d": "M1 5 L9 5 L9 25 L1 25 Z", "fill": "{porcelain}"}], "color_slots": {"porcelain": {"base": "#EEEEDD", "variance": 0.04}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_water_fountain_body_c', 'bg_component', 'Fountain Body C', 'Gray concrete pedestal',
  '{"type": "bg_component", "slot": "body", "svg_paths": [{"d": "M0 8 L10 8 L10 25 L0 25 Z", "fill": "{concrete}"}, {"d": "M2 5 L8 5 L8 8 L2 8 Z", "fill": "{top}"}], "color_slots": {"concrete": {"base": "#999999", "variance": 0.08}, "top": {"base": "#AAAAAA", "variance": 0.06}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Basin variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_water_fountain_basin_a', 'bg_component', 'Fountain Basin A', 'Curved basin',
  '{"type": "bg_component", "slot": "basin", "svg_paths": [{"d": "M2 5 Q5 8 8 5 L8 7 Q5 10 2 7 Z", "fill": "{basin}"}], "color_slots": {"basin": {"base": "#CCCCCC", "variance": 0.05}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_water_fountain_basin_b', 'bg_component', 'Fountain Basin B', 'Rectangular basin',
  '{"type": "bg_component", "slot": "basin", "svg_paths": [{"d": "M2 5 L8 5 L8 8 L2 8 Z", "fill": "{basin}"}, {"d": "M3 6 L7 6 L7 7 L3 7 Z", "fill": "{drain}"}], "color_slots": {"basin": {"base": "#DDDDDD", "variance": 0.05}, "drain": {"base": "#888888", "variance": 0.04}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Spout variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_water_fountain_spout_a', 'bg_component', 'Fountain Spout A', 'Chrome arc spout',
  '{"type": "bg_component", "slot": "spout", "svg_paths": [{"d": "M4 3 Q5 1 6 3 L6 5 L4 5 Z", "fill": "{chrome}"}], "color_slots": {"chrome": {"base": "#DDDDDD", "variance": 0.04}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_water_fountain_spout_b', 'bg_component', 'Fountain Spout B', 'Button-push spout',
  '{"type": "bg_component", "slot": "spout", "svg_paths": [{"d": "M5 3 L6 3 L6 5 L5 5 Z", "fill": "{spout}"}, {"d": "M7 4 L8 4 L8 5 L7 5 Z", "fill": "{button}"}], "color_slots": {"spout": {"base": "#CCCCCC", "variance": 0.04}, "button": {"base": "#888888", "variance": 0.05}}}',
  '["book2", "florida", "school"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 12. FLAGPOLE — Tall flag poles (8x70)
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_flagpole', 'bg_element_def', 'Flagpole', 'Tall outdoor flagpole',
  '{"type": "element_definition", "element_type": "flagpole", "components": {"pole": ["elem_flagpole_pole_a", "elem_flagpole_pole_b", "elem_flagpole_pole_c"], "flag": ["elem_flagpole_flag_a", "elem_flagpole_flag_b", "elem_flagpole_flag_c"], "base_mount": ["elem_flagpole_base_mount_a", "elem_flagpole_base_mount_b"]}, "anchor": {"x": 0.5, "y": 1.0}, "base_width": 8, "base_height": 70}',
  '["book2", "florida", "school", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Pole variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_flagpole_pole_a', 'bg_component', 'Flagpole Pole A', 'Silver aluminum pole',
  '{"type": "bg_component", "slot": "pole", "svg_paths": [{"d": "M3.5 2 L4.5 2 L4.5 60 L3.5 60 Z", "fill": "{metal}"}, {"d": "M3 0 L5 0 L4.5 2 L3.5 2 Z", "fill": "{finial}"}], "color_slots": {"metal": {"base": "#CCCCCC", "variance": 0.04}, "finial": {"base": "#DDAA33", "variance": 0.06}}}',
  '["book2", "florida", "school", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_flagpole_pole_b', 'bg_component', 'Flagpole Pole B', 'White painted pole',
  '{"type": "bg_component", "slot": "pole", "svg_paths": [{"d": "M3.5 2 L4.5 2 L4.5 60 L3.5 60 Z", "fill": "{paint}"}, {"d": "M3.2 0 L4.8 0 L4.5 2 L3.5 2 Z", "fill": "{ball}"}], "color_slots": {"paint": {"base": "#EEEEEE", "variance": 0.03}, "ball": {"base": "#DDDD33", "variance": 0.06}}}',
  '["book2", "florida", "school", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_flagpole_pole_c', 'bg_component', 'Flagpole Pole C', 'Dark bronze pole',
  '{"type": "bg_component", "slot": "pole", "svg_paths": [{"d": "M3.5 3 L4.5 3 L4.5 60 L3.5 60 Z", "fill": "{bronze}"}, {"d": "M3 0 L5 0 L5 3 L3 3 Z", "fill": "{eagle}"}], "color_slots": {"bronze": {"base": "#886644", "variance": 0.06}, "eagle": {"base": "#AA8844", "variance": 0.08}}}',
  '["book2", "florida", "school", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Flag variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_flagpole_flag_a', 'bg_component', 'Flagpole Flag A', 'Stars and stripes silhouette',
  '{"type": "bg_component", "slot": "flag", "svg_paths": [{"d": "M4.5 4 L8 4 Q8 8 7 10 L4.5 10 Z", "fill": "{stripe}"}, {"d": "M4.5 4 L6 4 L6 6 L4.5 6 Z", "fill": "{canton}"}], "color_slots": {"stripe": {"base": "#CC3333", "variance": 0.08}, "canton": {"base": "#224488", "variance": 0.06}}}',
  '["book2", "florida", "school", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_flagpole_flag_b', 'bg_component', 'Flagpole Flag B', 'School pennant',
  '{"type": "bg_component", "slot": "flag", "svg_paths": [{"d": "M4.5 5 L8 5 L6 9 L4.5 9 Z", "fill": "{pennant}"}], "color_slots": {"pennant": {"base": "#335599", "variance": 0.1}}}',
  '["book2", "florida", "school", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_flagpole_flag_c', 'bg_component', 'Flagpole Flag C', 'Florida state flag silhouette',
  '{"type": "bg_component", "slot": "flag", "svg_paths": [{"d": "M4.5 4 L8 4 L8 9 L4.5 9 Z", "fill": "{field}"}, {"d": "M5.5 5.5 L7 5.5 L7 7.5 L5.5 7.5 Z", "fill": "{seal}"}], "color_slots": {"field": {"base": "#EEEEEE", "variance": 0.04}, "seal": {"base": "#CC5533", "variance": 0.08}}}',
  '["book2", "florida", "school", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Base mount variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_flagpole_base_mount_a', 'bg_component', 'Flagpole Base A', 'Concrete pedestal base',
  '{"type": "bg_component", "slot": "base_mount", "svg_paths": [{"d": "M1 60 L7 60 L7 70 L1 70 Z", "fill": "{concrete}"}, {"d": "M0 65 L8 65 L8 70 L0 70 Z", "fill": "{foundation}"}], "color_slots": {"concrete": {"base": "#AAAAAA", "variance": 0.06}, "foundation": {"base": "#999999", "variance": 0.08}}}',
  '["book2", "florida", "school", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_flagpole_base_mount_b', 'bg_component', 'Flagpole Base B', 'Flush ground mount',
  '{"type": "bg_component", "slot": "base_mount", "svg_paths": [{"d": "M2 60 L6 60 L7 68 L1 68 Z", "fill": "{mount}"}, {"d": "M0 68 L8 68 L8 70 L0 70 Z", "fill": "{ground}"}], "color_slots": {"mount": {"base": "#888888", "variance": 0.06}, "ground": {"base": "#778855", "variance": 0.1}}}',
  '["book2", "florida", "school", "suburban"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

COMMIT;
