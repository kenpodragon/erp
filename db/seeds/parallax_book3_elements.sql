-- ============================================================================
-- Book 3: Reality Degradation — Parallax Background Elements (Phase 5)
-- 10 element types with sub-component variants
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. VOID CRACK — Fractures in reality
--    Slots: crack(3), glow(3), particle(2) | base: 20x50
-- ============================================================================

-- Definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_def_void_crack', 'bg_element_def', 'Void Crack', 'Fractures in reality where the void bleeds through',
  '{"type": "element_definition", "element_type": "void_crack", "components": {"crack": ["elem_void_crack_crack_a", "elem_void_crack_crack_b", "elem_void_crack_crack_c"], "glow": ["elem_void_crack_glow_a", "elem_void_crack_glow_b", "elem_void_crack_glow_c"], "particle": ["elem_void_crack_particle_a", "elem_void_crack_particle_b"]}, "anchor": {"x": 0.5, "y": 0.5}, "base_width": 20, "base_height": 50}',
  '["book3", "cosmic", "void", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- crack variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_void_crack_crack_a', 'bg_component', 'Void Crack - Crack A', 'Jagged vertical fracture line',
  '{"type": "bg_component", "slot": "crack", "svg_paths": [{"d": "M10 0 L12 8 L8 18 L13 28 L9 38 L11 50", "fill": "none", "stroke": "{color}", "stroke_width": 2}], "color_slots": {"color": {"base": "#8800FF", "variance": 0.2}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_void_crack_crack_b', 'bg_component', 'Void Crack - Crack B', 'Branching fracture with fork',
  '{"type": "bg_component", "slot": "crack", "svg_paths": [{"d": "M10 0 L8 12 L12 25 L7 35 L10 50", "fill": "none", "stroke": "{color}", "stroke_width": 2}, {"d": "M12 25 L17 32 L15 40", "fill": "none", "stroke": "{color}", "stroke_width": 1}], "color_slots": {"color": {"base": "#6600CC", "variance": 0.25}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_void_crack_crack_c', 'bg_component', 'Void Crack - Crack C', 'Wide zigzag fracture',
  '{"type": "bg_component", "slot": "crack", "svg_paths": [{"d": "M10 0 L14 10 L6 20 L15 30 L8 40 L12 50", "fill": "none", "stroke": "{color}", "stroke_width": 3}], "color_slots": {"color": {"base": "#8800FF", "variance": 0.15}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- glow variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_void_crack_glow_a', 'bg_component', 'Void Crack - Glow A', 'Soft purple emanation along crack',
  '{"type": "bg_component", "slot": "glow", "svg_paths": [{"d": "M8 5 Q4 25 8 45 L12 45 Q16 25 12 5 Z", "fill": "{color}", "opacity": 0.3}], "color_slots": {"color": {"base": "#8800FF", "variance": 0.2}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_void_crack_glow_b', 'bg_component', 'Void Crack - Glow B', 'Pulsing pink void light',
  '{"type": "bg_component", "slot": "glow", "svg_paths": [{"d": "M6 10 Q2 25 6 40 L14 40 Q18 25 14 10 Z", "fill": "{color}", "opacity": 0.25}], "color_slots": {"color": {"base": "#FF0066", "variance": 0.2}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_void_crack_glow_c', 'bg_component', 'Void Crack - Glow C', 'Narrow intense glow strip',
  '{"type": "bg_component", "slot": "glow", "svg_paths": [{"d": "M9 2 Q7 25 9 48 L11 48 Q13 25 11 2 Z", "fill": "{color}", "opacity": 0.4}], "color_slots": {"color": {"base": "#6600CC", "variance": 0.15}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- particle variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_void_crack_particle_a', 'bg_component', 'Void Crack - Particle A', 'Drifting void motes',
  '{"type": "bg_component", "slot": "particle", "svg_paths": [{"d": "M3 10 L4 11 L3 12 L2 11 Z", "fill": "{color}", "opacity": 0.6}, {"d": "M15 30 L16 31 L15 32 L14 31 Z", "fill": "{color}", "opacity": 0.5}, {"d": "M8 42 L9 43 L8 44 L7 43 Z", "fill": "{color}", "opacity": 0.7}], "color_slots": {"color": {"base": "#EEEEFF", "variance": 0.3}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_void_crack_particle_b', 'bg_component', 'Void Crack - Particle B', 'Sparking void fragments',
  '{"type": "bg_component", "slot": "particle", "svg_paths": [{"d": "M5 15 L7 14 L6 17 Z", "fill": "{color}", "opacity": 0.5}, {"d": "M16 35 L18 34 L17 37 Z", "fill": "{color}", "opacity": 0.6}], "color_slots": {"color": {"base": "#FF0066", "variance": 0.25}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 2. GLITCH ARTIFACT — Digital corruption
--    Slots: block(3), scanline(3), noise(2) | base: 25x20
-- ============================================================================

-- Definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_def_glitch_artifact', 'bg_element_def', 'Glitch Artifact', 'Digital corruption fragments disrupting reality',
  '{"type": "element_definition", "element_type": "glitch_artifact", "components": {"block": ["elem_glitch_artifact_block_a", "elem_glitch_artifact_block_b", "elem_glitch_artifact_block_c"], "scanline": ["elem_glitch_artifact_scanline_a", "elem_glitch_artifact_scanline_b", "elem_glitch_artifact_scanline_c"], "noise": ["elem_glitch_artifact_noise_a", "elem_glitch_artifact_noise_b"]}, "anchor": {"x": 0.5, "y": 0.5}, "base_width": 25, "base_height": 20}',
  '["book3", "cosmic", "glitch", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- block variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_glitch_artifact_block_a', 'bg_component', 'Glitch Artifact - Block A', 'Offset rectangular corruption blocks',
  '{"type": "bg_component", "slot": "block", "svg_paths": [{"d": "M2 4 L10 4 L10 8 L2 8 Z", "fill": "{color}", "opacity": 0.7}, {"d": "M14 10 L22 10 L22 14 L14 14 Z", "fill": "{color}", "opacity": 0.5}], "color_slots": {"color": {"base": "#00FF88", "variance": 0.25}}}',
  '["book3", "cosmic", "glitch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_glitch_artifact_block_b', 'bg_component', 'Glitch Artifact - Block B', 'Staggered thin corruption strips',
  '{"type": "bg_component", "slot": "block", "svg_paths": [{"d": "M0 3 L8 3 L8 5 L0 5 Z", "fill": "{color}", "opacity": 0.6}, {"d": "M12 7 L25 7 L25 9 L12 9 Z", "fill": "{color}", "opacity": 0.8}, {"d": "M5 13 L18 13 L18 15 L5 15 Z", "fill": "{color}", "opacity": 0.5}], "color_slots": {"color": {"base": "#FF0066", "variance": 0.3}}}',
  '["book3", "cosmic", "glitch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_glitch_artifact_block_c', 'bg_component', 'Glitch Artifact - Block C', 'Large displaced block',
  '{"type": "bg_component", "slot": "block", "svg_paths": [{"d": "M4 2 L20 2 L20 12 L4 12 Z", "fill": "{color}", "opacity": 0.4}], "color_slots": {"color": {"base": "#0044FF", "variance": 0.2}}}',
  '["book3", "cosmic", "glitch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- scanline variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_glitch_artifact_scanline_a', 'bg_component', 'Glitch Artifact - Scanline A', 'Horizontal interference lines',
  '{"type": "bg_component", "slot": "scanline", "svg_paths": [{"d": "M0 5 L25 5", "fill": "none", "stroke": "{color}", "stroke_width": 1}, {"d": "M0 10 L25 10", "fill": "none", "stroke": "{color}", "stroke_width": 1}, {"d": "M0 15 L25 15", "fill": "none", "stroke": "{color}", "stroke_width": 1}], "color_slots": {"color": {"base": "#EEEEFF", "variance": 0.15}}}',
  '["book3", "cosmic", "glitch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_glitch_artifact_scanline_b', 'bg_component', 'Glitch Artifact - Scanline B', 'Broken scanlines with gaps',
  '{"type": "bg_component", "slot": "scanline", "svg_paths": [{"d": "M0 6 L10 6", "fill": "none", "stroke": "{color}", "stroke_width": 1}, {"d": "M15 6 L25 6", "fill": "none", "stroke": "{color}", "stroke_width": 1}, {"d": "M3 12 L20 12", "fill": "none", "stroke": "{color}", "stroke_width": 1}], "color_slots": {"color": {"base": "#00FF88", "variance": 0.2}}}',
  '["book3", "cosmic", "glitch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_glitch_artifact_scanline_c', 'bg_component', 'Glitch Artifact - Scanline C', 'Thick static band',
  '{"type": "bg_component", "slot": "scanline", "svg_paths": [{"d": "M0 8 L25 8 L25 12 L0 12 Z", "fill": "{color}", "opacity": 0.3}], "color_slots": {"color": {"base": "#8800FF", "variance": 0.2}}}',
  '["book3", "cosmic", "glitch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- noise variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_glitch_artifact_noise_a', 'bg_component', 'Glitch Artifact - Noise A', 'Scattered pixel noise',
  '{"type": "bg_component", "slot": "noise", "svg_paths": [{"d": "M3 3 L4 3 L4 4 L3 4 Z", "fill": "{color}", "opacity": 0.6}, {"d": "M18 7 L19 7 L19 8 L18 8 Z", "fill": "{color}", "opacity": 0.4}, {"d": "M10 15 L11 15 L11 16 L10 16 Z", "fill": "{color}", "opacity": 0.7}, {"d": "M22 2 L23 2 L23 3 L22 3 Z", "fill": "{color}", "opacity": 0.5}], "color_slots": {"color": {"base": "#EEEEFF", "variance": 0.3}}}',
  '["book3", "cosmic", "glitch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_glitch_artifact_noise_b', 'bg_component', 'Glitch Artifact - Noise B', 'Dense corruption static',
  '{"type": "bg_component", "slot": "noise", "svg_paths": [{"d": "M6 2 L7 2 L7 3 L6 3 Z", "fill": "{color}", "opacity": 0.5}, {"d": "M14 5 L15 5 L15 6 L14 6 Z", "fill": "{color}", "opacity": 0.6}, {"d": "M2 11 L3 11 L3 12 L2 12 Z", "fill": "{color}", "opacity": 0.4}, {"d": "M20 14 L21 14 L21 15 L20 15 Z", "fill": "{color}", "opacity": 0.7}, {"d": "M11 18 L12 18 L12 19 L11 19 Z", "fill": "{color}", "opacity": 0.3}], "color_slots": {"color": {"base": "#00FF88", "variance": 0.25}}}',
  '["book3", "cosmic", "glitch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 3. FRACTURE LINE — Geometric breaks in space
--    Slots: line(3), shard(3), edge_glow(2) | base: 30x35
-- ============================================================================

-- Definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_def_fracture_line', 'bg_element_def', 'Fracture Line', 'Geometric breaks where space itself has shattered',
  '{"type": "element_definition", "element_type": "fracture_line", "components": {"line": ["elem_fracture_line_line_a", "elem_fracture_line_line_b", "elem_fracture_line_line_c"], "shard": ["elem_fracture_line_shard_a", "elem_fracture_line_shard_b", "elem_fracture_line_shard_c"], "edge_glow": ["elem_fracture_line_edge_glow_a", "elem_fracture_line_edge_glow_b"]}, "anchor": {"x": 0.5, "y": 0.5}, "base_width": 30, "base_height": 35}',
  '["book3", "cosmic", "reality", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- line variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_fracture_line_line_a', 'bg_component', 'Fracture Line - Line A', 'Sharp diagonal fracture',
  '{"type": "bg_component", "slot": "line", "svg_paths": [{"d": "M2 0 L15 12 L10 22 L20 35", "fill": "none", "stroke": "{color}", "stroke_width": 2}], "color_slots": {"color": {"base": "#EEEEFF", "variance": 0.15}}}',
  '["book3", "cosmic", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_fracture_line_line_b', 'bg_component', 'Fracture Line - Line B', 'Multi-segment angular break',
  '{"type": "bg_component", "slot": "line", "svg_paths": [{"d": "M5 0 L8 8 L22 15 L18 25 L25 35", "fill": "none", "stroke": "{color}", "stroke_width": 2}, {"d": "M8 8 L3 14", "fill": "none", "stroke": "{color}", "stroke_width": 1}], "color_slots": {"color": {"base": "#EEEEFF", "variance": 0.2}}}',
  '["book3", "cosmic", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_fracture_line_line_c', 'bg_component', 'Fracture Line - Line C', 'Straight clean break with offset',
  '{"type": "bg_component", "slot": "line", "svg_paths": [{"d": "M15 0 L15 14 L18 16 L18 35", "fill": "none", "stroke": "{color}", "stroke_width": 3}], "color_slots": {"color": {"base": "#0044FF", "variance": 0.15}}}',
  '["book3", "cosmic", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- shard variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_fracture_line_shard_a', 'bg_component', 'Fracture Line - Shard A', 'Triangular reality fragment',
  '{"type": "bg_component", "slot": "shard", "svg_paths": [{"d": "M12 8 L18 12 L14 18 Z", "fill": "{color}", "opacity": 0.4}], "color_slots": {"color": {"base": "#110022", "variance": 0.2}}}',
  '["book3", "cosmic", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_fracture_line_shard_b', 'bg_component', 'Fracture Line - Shard B', 'Displaced diamond fragment',
  '{"type": "bg_component", "slot": "shard", "svg_paths": [{"d": "M20 14 L24 18 L20 22 L16 18 Z", "fill": "{color}", "opacity": 0.5}], "color_slots": {"color": {"base": "#0044FF", "variance": 0.25}}}',
  '["book3", "cosmic", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_fracture_line_shard_c', 'bg_component', 'Fracture Line - Shard C', 'Long thin splinter',
  '{"type": "bg_component", "slot": "shard", "svg_paths": [{"d": "M8 5 L10 6 L9 16 L7 15 Z", "fill": "{color}", "opacity": 0.35}], "color_slots": {"color": {"base": "#8800FF", "variance": 0.2}}}',
  '["book3", "cosmic", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- edge_glow variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_fracture_line_edge_glow_a', 'bg_component', 'Fracture Line - Edge Glow A', 'Soft glow along fracture edge',
  '{"type": "bg_component", "slot": "edge_glow", "svg_paths": [{"d": "M1 0 Q8 12 14 22 Q18 28 22 35 L20 35 Q16 28 12 22 Q6 12 3 0 Z", "fill": "{color}", "opacity": 0.2}], "color_slots": {"color": {"base": "#8800FF", "variance": 0.2}}}',
  '["book3", "cosmic", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_fracture_line_edge_glow_b', 'bg_component', 'Fracture Line - Edge Glow B', 'Bright cosmic edge light',
  '{"type": "bg_component", "slot": "edge_glow", "svg_paths": [{"d": "M14 0 Q16 10 17 18 Q18 26 19 35 L17 35 Q16 26 15 18 Q14 10 12 0 Z", "fill": "{color}", "opacity": 0.3}], "color_slots": {"color": {"base": "#0044FF", "variance": 0.15}}}',
  '["book3", "cosmic", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 4. COSMIC EYE — Eldritch watching eyes
--    Slots: iris(3), pupil(2), lash(2) | base: 20x15
-- ============================================================================

-- Definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_def_cosmic_eye', 'bg_element_def', 'Cosmic Eye', 'Eldritch eyes watching from beyond the veil',
  '{"type": "element_definition", "element_type": "cosmic_eye", "components": {"iris": ["elem_cosmic_eye_iris_a", "elem_cosmic_eye_iris_b", "elem_cosmic_eye_iris_c"], "pupil": ["elem_cosmic_eye_pupil_a", "elem_cosmic_eye_pupil_b"], "lash": ["elem_cosmic_eye_lash_a", "elem_cosmic_eye_lash_b"]}, "anchor": {"x": 0.5, "y": 0.5}, "base_width": 20, "base_height": 15}',
  '["book3", "cosmic", "void", "eldritch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- iris variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_cosmic_eye_iris_a', 'bg_component', 'Cosmic Eye - Iris A', 'Almond-shaped void iris',
  '{"type": "bg_component", "slot": "iris", "svg_paths": [{"d": "M2 7 Q10 1 18 7 Q10 13 2 7 Z", "fill": "{color}", "opacity": 0.6}], "color_slots": {"color": {"base": "#8800FF", "variance": 0.2}}}',
  '["book3", "cosmic", "eldritch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_cosmic_eye_iris_b', 'bg_component', 'Cosmic Eye - Iris B', 'Wide staring iris',
  '{"type": "bg_component", "slot": "iris", "svg_paths": [{"d": "M1 7 Q10 0 19 7 Q10 14 1 7 Z", "fill": "{color}", "opacity": 0.5}], "color_slots": {"color": {"base": "#0044FF", "variance": 0.25}}}',
  '["book3", "cosmic", "eldritch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_cosmic_eye_iris_c', 'bg_component', 'Cosmic Eye - Iris C', 'Narrow slit iris',
  '{"type": "bg_component", "slot": "iris", "svg_paths": [{"d": "M3 7 Q10 3 17 7 Q10 11 3 7 Z", "fill": "{color}", "opacity": 0.7}], "color_slots": {"color": {"base": "#FF0066", "variance": 0.2}}}',
  '["book3", "cosmic", "eldritch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- pupil variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_cosmic_eye_pupil_a', 'bg_component', 'Cosmic Eye - Pupil A', 'Vertical slit pupil',
  '{"type": "bg_component", "slot": "pupil", "svg_paths": [{"d": "M9 4 Q10 3 11 4 L11 10 Q10 11 9 10 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#110022", "variance": 0.15}}}',
  '["book3", "cosmic", "eldritch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_cosmic_eye_pupil_b', 'bg_component', 'Cosmic Eye - Pupil B', 'Round void pupil',
  '{"type": "bg_component", "slot": "pupil", "svg_paths": [{"d": "M8 5 Q10 3 12 5 Q14 7 12 9 Q10 11 8 9 Q6 7 8 5 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#110022", "variance": 0.1}}}',
  '["book3", "cosmic", "eldritch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- lash variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_cosmic_eye_lash_a', 'bg_component', 'Cosmic Eye - Lash A', 'Wispy tendrils around eye',
  '{"type": "bg_component", "slot": "lash", "svg_paths": [{"d": "M4 4 L2 1", "fill": "none", "stroke": "{color}", "stroke_width": 1}, {"d": "M10 2 L10 0", "fill": "none", "stroke": "{color}", "stroke_width": 1}, {"d": "M16 4 L18 1", "fill": "none", "stroke": "{color}", "stroke_width": 1}], "color_slots": {"color": {"base": "#6600CC", "variance": 0.2}}}',
  '["book3", "cosmic", "eldritch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_cosmic_eye_lash_b', 'bg_component', 'Cosmic Eye - Lash B', 'Curved eldritch lashes',
  '{"type": "bg_component", "slot": "lash", "svg_paths": [{"d": "M5 3 Q3 0 1 2", "fill": "none", "stroke": "{color}", "stroke_width": 1}, {"d": "M15 3 Q17 0 19 2", "fill": "none", "stroke": "{color}", "stroke_width": 1}, {"d": "M5 11 Q3 14 1 12", "fill": "none", "stroke": "{color}", "stroke_width": 1}, {"d": "M15 11 Q17 14 19 12", "fill": "none", "stroke": "{color}", "stroke_width": 1}], "color_slots": {"color": {"base": "#8800FF", "variance": 0.25}}}',
  '["book3", "cosmic", "eldritch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 5. VOID TENDRIL — Reaching tendrils of void
--    Slots: tendril(3), tip(2), aura(2) | base: 15x60
-- ============================================================================

-- Definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_def_void_tendril', 'bg_element_def', 'Void Tendril', 'Dark tendrils reaching from the void between worlds',
  '{"type": "element_definition", "element_type": "void_tendril", "components": {"tendril": ["elem_void_tendril_tendril_a", "elem_void_tendril_tendril_b", "elem_void_tendril_tendril_c"], "tip": ["elem_void_tendril_tip_a", "elem_void_tendril_tip_b"], "aura": ["elem_void_tendril_aura_a", "elem_void_tendril_aura_b"]}, "anchor": {"x": 0.5, "y": 0.0}, "base_width": 15, "base_height": 60}',
  '["book3", "cosmic", "void", "eldritch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- tendril variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_void_tendril_tendril_a', 'bg_component', 'Void Tendril - Tendril A', 'Sinuous curving tendril',
  '{"type": "bg_component", "slot": "tendril", "svg_paths": [{"d": "M7 0 Q3 15 9 30 Q4 45 8 60", "fill": "none", "stroke": "{color}", "stroke_width": 3}], "color_slots": {"color": {"base": "#110022", "variance": 0.15}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_void_tendril_tendril_b', 'bg_component', 'Void Tendril - Tendril B', 'Thinning whip-like tendril',
  '{"type": "bg_component", "slot": "tendril", "svg_paths": [{"d": "M8 0 Q12 20 6 40 Q10 50 7 60", "fill": "none", "stroke": "{color}", "stroke_width": 2}], "color_slots": {"color": {"base": "#6600CC", "variance": 0.2}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_void_tendril_tendril_c', 'bg_component', 'Void Tendril - Tendril C', 'Thick pulsing tendril',
  '{"type": "bg_component", "slot": "tendril", "svg_paths": [{"d": "M5 0 Q2 15 8 30 Q14 45 7 60 L9 60 Q16 45 10 30 Q4 15 7 0 Z", "fill": "{color}", "opacity": 0.7}], "color_slots": {"color": {"base": "#110022", "variance": 0.15}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- tip variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_void_tendril_tip_a', 'bg_component', 'Void Tendril - Tip A', 'Pointed barbed tip',
  '{"type": "bg_component", "slot": "tip", "svg_paths": [{"d": "M6 52 L8 60 L10 52 L8 54 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#8800FF", "variance": 0.2}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_void_tendril_tip_b', 'bg_component', 'Void Tendril - Tip B', 'Forked tendril end',
  '{"type": "bg_component", "slot": "tip", "svg_paths": [{"d": "M8 50 L5 58 L7 55 L8 60 L9 55 L11 58 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#FF0066", "variance": 0.25}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- aura variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_void_tendril_aura_a', 'bg_component', 'Void Tendril - Aura A', 'Dark energy haze around tendril',
  '{"type": "bg_component", "slot": "aura", "svg_paths": [{"d": "M3 5 Q0 30 5 55 L11 55 Q15 30 12 5 Z", "fill": "{color}", "opacity": 0.15}], "color_slots": {"color": {"base": "#8800FF", "variance": 0.2}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_void_tendril_aura_b', 'bg_component', 'Void Tendril - Aura B', 'Pulsing corruption aura',
  '{"type": "bg_component", "slot": "aura", "svg_paths": [{"d": "M2 10 Q-1 30 4 50 L12 50 Q15 30 13 10 Z", "fill": "{color}", "opacity": 0.1}], "color_slots": {"color": {"base": "#FF0066", "variance": 0.25}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 6. BROKEN MIRROR — Shattered reflective surfaces
--    Slots: frame(2), shard(3), reflection(2) | base: 20x25
-- ============================================================================

-- Definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_def_broken_mirror', 'bg_element_def', 'Broken Mirror', 'Shattered reflective surfaces showing impossible reflections',
  '{"type": "element_definition", "element_type": "broken_mirror", "components": {"frame": ["elem_broken_mirror_frame_a", "elem_broken_mirror_frame_b"], "shard": ["elem_broken_mirror_shard_a", "elem_broken_mirror_shard_b", "elem_broken_mirror_shard_c"], "reflection": ["elem_broken_mirror_reflection_a", "elem_broken_mirror_reflection_b"]}, "anchor": {"x": 0.5, "y": 0.5}, "base_width": 20, "base_height": 25}',
  '["book3", "cosmic", "reality", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- frame variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_broken_mirror_frame_a', 'bg_component', 'Broken Mirror - Frame A', 'Rectangular cracked frame',
  '{"type": "bg_component", "slot": "frame", "svg_paths": [{"d": "M2 2 L18 2 L18 23 L2 23 Z", "fill": "none", "stroke": "{color}", "stroke_width": 2}], "color_slots": {"color": {"base": "#EEEEFF", "variance": 0.15}}}',
  '["book3", "cosmic", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_broken_mirror_frame_b', 'bg_component', 'Broken Mirror - Frame B', 'Irregular broken frame outline',
  '{"type": "bg_component", "slot": "frame", "svg_paths": [{"d": "M3 1 L17 2 L19 22 L4 24 Z", "fill": "none", "stroke": "{color}", "stroke_width": 2}], "color_slots": {"color": {"base": "#6600CC", "variance": 0.2}}}',
  '["book3", "cosmic", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- shard variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_broken_mirror_shard_a', 'bg_component', 'Broken Mirror - Shard A', 'Large triangular shard',
  '{"type": "bg_component", "slot": "shard", "svg_paths": [{"d": "M4 4 L12 3 L8 14 Z", "fill": "{color}", "opacity": 0.3}], "color_slots": {"color": {"base": "#EEEEFF", "variance": 0.2}}}',
  '["book3", "cosmic", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_broken_mirror_shard_b', 'bg_component', 'Broken Mirror - Shard B', 'Irregular quadrilateral shard',
  '{"type": "bg_component", "slot": "shard", "svg_paths": [{"d": "M10 8 L17 6 L16 16 L12 18 Z", "fill": "{color}", "opacity": 0.25}], "color_slots": {"color": {"base": "#0044FF", "variance": 0.2}}}',
  '["book3", "cosmic", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_broken_mirror_shard_c', 'bg_component', 'Broken Mirror - Shard C', 'Small displaced fragment',
  '{"type": "bg_component", "slot": "shard", "svg_paths": [{"d": "M5 16 L9 14 L10 20 L6 21 Z", "fill": "{color}", "opacity": 0.35}], "color_slots": {"color": {"base": "#8800FF", "variance": 0.25}}}',
  '["book3", "cosmic", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- reflection variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_broken_mirror_reflection_a', 'bg_component', 'Broken Mirror - Reflection A', 'Ghostly light reflection',
  '{"type": "bg_component", "slot": "reflection", "svg_paths": [{"d": "M6 6 L9 5 L8 9 Z", "fill": "{color}", "opacity": 0.5}], "color_slots": {"color": {"base": "#EEEEFF", "variance": 0.15}}}',
  '["book3", "cosmic", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_broken_mirror_reflection_b', 'bg_component', 'Broken Mirror - Reflection B', 'Streak of impossible light',
  '{"type": "bg_component", "slot": "reflection", "svg_paths": [{"d": "M13 10 L15 9 L14 15 L12 14 Z", "fill": "{color}", "opacity": 0.4}], "color_slots": {"color": {"base": "#FF0066", "variance": 0.2}}}',
  '["book3", "cosmic", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 7. STATIC FIELD — Areas of visual noise
--    Slots: field(3), spark(3), border(2) | base: 30x25
-- ============================================================================

-- Definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_def_static_field', 'bg_element_def', 'Static Field', 'Areas where reality dissolves into visual noise',
  '{"type": "element_definition", "element_type": "static_field", "components": {"field": ["elem_static_field_field_a", "elem_static_field_field_b", "elem_static_field_field_c"], "spark": ["elem_static_field_spark_a", "elem_static_field_spark_b", "elem_static_field_spark_c"], "border": ["elem_static_field_border_a", "elem_static_field_border_b"]}, "anchor": {"x": 0.5, "y": 0.5}, "base_width": 30, "base_height": 25}',
  '["book3", "cosmic", "glitch", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- field variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_static_field_field_a', 'bg_component', 'Static Field - Field A', 'Rectangular noise zone',
  '{"type": "bg_component", "slot": "field", "svg_paths": [{"d": "M3 3 L27 3 L27 22 L3 22 Z", "fill": "{color}", "opacity": 0.15}], "color_slots": {"color": {"base": "#110022", "variance": 0.2}}}',
  '["book3", "cosmic", "glitch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_static_field_field_b', 'bg_component', 'Static Field - Field B', 'Irregular dissolving zone',
  '{"type": "bg_component", "slot": "field", "svg_paths": [{"d": "M5 2 L25 4 L28 20 L2 23 Z", "fill": "{color}", "opacity": 0.12}], "color_slots": {"color": {"base": "#8800FF", "variance": 0.25}}}',
  '["book3", "cosmic", "glitch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_static_field_field_c', 'bg_component', 'Static Field - Field C', 'Circular static zone',
  '{"type": "bg_component", "slot": "field", "svg_paths": [{"d": "M15 2 Q28 5 27 12 Q26 22 15 23 Q4 22 3 12 Q2 5 15 2 Z", "fill": "{color}", "opacity": 0.1}], "color_slots": {"color": {"base": "#0044FF", "variance": 0.2}}}',
  '["book3", "cosmic", "glitch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- spark variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_static_field_spark_a', 'bg_component', 'Static Field - Spark A', 'Bright point sparks',
  '{"type": "bg_component", "slot": "spark", "svg_paths": [{"d": "M8 6 L9 5 L10 6 L9 7 Z", "fill": "{color}", "opacity": 0.8}, {"d": "M20 15 L21 14 L22 15 L21 16 Z", "fill": "{color}", "opacity": 0.6}], "color_slots": {"color": {"base": "#EEEEFF", "variance": 0.3}}}',
  '["book3", "cosmic", "glitch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_static_field_spark_b', 'bg_component', 'Static Field - Spark B', 'Cross-shaped sparks',
  '{"type": "bg_component", "slot": "spark", "svg_paths": [{"d": "M14 8 L15 6 L16 8 L15 10 Z", "fill": "{color}", "opacity": 0.7}, {"d": "M6 18 L7 16 L8 18 L7 20 Z", "fill": "{color}", "opacity": 0.5}], "color_slots": {"color": {"base": "#00FF88", "variance": 0.25}}}',
  '["book3", "cosmic", "glitch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_static_field_spark_c', 'bg_component', 'Static Field - Spark C', 'Elongated flash sparks',
  '{"type": "bg_component", "slot": "spark", "svg_paths": [{"d": "M22 5 L24 4 L23 7 Z", "fill": "{color}", "opacity": 0.6}, {"d": "M10 19 L12 18 L11 21 Z", "fill": "{color}", "opacity": 0.7}], "color_slots": {"color": {"base": "#FF0066", "variance": 0.3}}}',
  '["book3", "cosmic", "glitch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- border variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_static_field_border_a', 'bg_component', 'Static Field - Border A', 'Flickering field boundary',
  '{"type": "bg_component", "slot": "border", "svg_paths": [{"d": "M3 3 L27 3 L27 22 L3 22 Z", "fill": "none", "stroke": "{color}", "stroke_width": 1}], "color_slots": {"color": {"base": "#00FF88", "variance": 0.2}}}',
  '["book3", "cosmic", "glitch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_static_field_border_b', 'bg_component', 'Static Field - Border B', 'Dashed degraded boundary',
  '{"type": "bg_component", "slot": "border", "svg_paths": [{"d": "M3 3 L12 3", "fill": "none", "stroke": "{color}", "stroke_width": 1}, {"d": "M18 3 L27 3 L27 10", "fill": "none", "stroke": "{color}", "stroke_width": 1}, {"d": "M27 16 L27 22 L18 22", "fill": "none", "stroke": "{color}", "stroke_width": 1}, {"d": "M12 22 L3 22 L3 16", "fill": "none", "stroke": "{color}", "stroke_width": 1}], "color_slots": {"color": {"base": "#8800FF", "variance": 0.2}}}',
  '["book3", "cosmic", "glitch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 8. DIMENSIONAL TEAR — Rips between dimensions
--    Slots: tear(3), edge(3), portal_glow(2) | base: 25x45
-- ============================================================================

-- Definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_def_dimensional_tear', 'bg_element_def', 'Dimensional Tear', 'Rips in the fabric of space revealing other dimensions',
  '{"type": "element_definition", "element_type": "dimensional_tear", "components": {"tear": ["elem_dimensional_tear_tear_a", "elem_dimensional_tear_tear_b", "elem_dimensional_tear_tear_c"], "edge": ["elem_dimensional_tear_edge_a", "elem_dimensional_tear_edge_b", "elem_dimensional_tear_edge_c"], "portal_glow": ["elem_dimensional_tear_portal_glow_a", "elem_dimensional_tear_portal_glow_b"]}, "anchor": {"x": 0.5, "y": 0.5}, "base_width": 25, "base_height": 45}',
  '["book3", "cosmic", "void", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- tear variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_dimensional_tear_tear_a', 'bg_component', 'Dimensional Tear - Tear A', 'Vertical rip with ragged edges',
  '{"type": "bg_component", "slot": "tear", "svg_paths": [{"d": "M10 2 L14 8 L9 15 L15 22 L10 30 L13 38 L11 45", "fill": "none", "stroke": "{color}", "stroke_width": 3}], "color_slots": {"color": {"base": "#EEEEFF", "variance": 0.15}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_dimensional_tear_tear_b', 'bg_component', 'Dimensional Tear - Tear B', 'Wide gaping tear',
  '{"type": "bg_component", "slot": "tear", "svg_paths": [{"d": "M12 0 L16 10 L8 18 L14 28 L10 38 L12 45 L13 38 L9 28 L15 18 L7 10 Z", "fill": "{color}", "opacity": 0.8}], "color_slots": {"color": {"base": "#110022", "variance": 0.15}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_dimensional_tear_tear_c', 'bg_component', 'Dimensional Tear - Tear C', 'Thin precision cut',
  '{"type": "bg_component", "slot": "tear", "svg_paths": [{"d": "M12 0 L13 15 L12 25 L13 40 L12 45", "fill": "none", "stroke": "{color}", "stroke_width": 2}], "color_slots": {"color": {"base": "#0044FF", "variance": 0.2}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- edge variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_dimensional_tear_edge_a', 'bg_component', 'Dimensional Tear - Edge A', 'Curling torn edge left',
  '{"type": "bg_component", "slot": "edge", "svg_paths": [{"d": "M10 5 Q6 12 9 20 Q5 28 10 35", "fill": "none", "stroke": "{color}", "stroke_width": 1}], "color_slots": {"color": {"base": "#8800FF", "variance": 0.2}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_dimensional_tear_edge_b', 'bg_component', 'Dimensional Tear - Edge B', 'Curling torn edge right',
  '{"type": "bg_component", "slot": "edge", "svg_paths": [{"d": "M14 5 Q18 12 15 20 Q19 28 14 35", "fill": "none", "stroke": "{color}", "stroke_width": 1}], "color_slots": {"color": {"base": "#6600CC", "variance": 0.2}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_dimensional_tear_edge_c', 'bg_component', 'Dimensional Tear - Edge C', 'Jagged crackling edges both sides',
  '{"type": "bg_component", "slot": "edge", "svg_paths": [{"d": "M8 8 L6 12 L9 16 L5 22", "fill": "none", "stroke": "{color}", "stroke_width": 1}, {"d": "M16 8 L18 12 L15 16 L19 22", "fill": "none", "stroke": "{color}", "stroke_width": 1}], "color_slots": {"color": {"base": "#FF0066", "variance": 0.25}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- portal_glow variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_dimensional_tear_portal_glow_a', 'bg_component', 'Dimensional Tear - Portal Glow A', 'Cosmic light bleeding through',
  '{"type": "bg_component", "slot": "portal_glow", "svg_paths": [{"d": "M8 5 Q4 22 8 40 L16 40 Q20 22 16 5 Z", "fill": "{color}", "opacity": 0.2}], "color_slots": {"color": {"base": "#0044FF", "variance": 0.2}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_dimensional_tear_portal_glow_b', 'bg_component', 'Dimensional Tear - Portal Glow B', 'Void energy emanation',
  '{"type": "bg_component", "slot": "portal_glow", "svg_paths": [{"d": "M6 8 Q2 22 6 38 L18 38 Q22 22 18 8 Z", "fill": "{color}", "opacity": 0.15}], "color_slots": {"color": {"base": "#8800FF", "variance": 0.25}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 9. REALITY SEAM — Stitched reality patches
--    Slots: seam(3), stitch(2), patch(2) | base: 35x10
-- ============================================================================

-- Definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_def_reality_seam', 'bg_element_def', 'Reality Seam', 'Visible seams where reality has been poorly repaired',
  '{"type": "element_definition", "element_type": "reality_seam", "components": {"seam": ["elem_reality_seam_seam_a", "elem_reality_seam_seam_b", "elem_reality_seam_seam_c"], "stitch": ["elem_reality_seam_stitch_a", "elem_reality_seam_stitch_b"], "patch": ["elem_reality_seam_patch_a", "elem_reality_seam_patch_b"]}, "anchor": {"x": 0.5, "y": 0.5}, "base_width": 35, "base_height": 10}',
  '["book3", "cosmic", "reality", "glitch"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- seam variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_reality_seam_seam_a', 'bg_component', 'Reality Seam - Seam A', 'Horizontal wavy seam',
  '{"type": "bg_component", "slot": "seam", "svg_paths": [{"d": "M0 5 Q9 3 17 5 Q26 7 35 5", "fill": "none", "stroke": "{color}", "stroke_width": 2}], "color_slots": {"color": {"base": "#EEEEFF", "variance": 0.15}}}',
  '["book3", "cosmic", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_reality_seam_seam_b', 'bg_component', 'Reality Seam - Seam B', 'Jagged tear line',
  '{"type": "bg_component", "slot": "seam", "svg_paths": [{"d": "M0 5 L7 3 L14 6 L21 2 L28 7 L35 4", "fill": "none", "stroke": "{color}", "stroke_width": 2}], "color_slots": {"color": {"base": "#8800FF", "variance": 0.2}}}',
  '["book3", "cosmic", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_reality_seam_seam_c', 'bg_component', 'Reality Seam - Seam C', 'Double parallel seam lines',
  '{"type": "bg_component", "slot": "seam", "svg_paths": [{"d": "M0 4 L35 4", "fill": "none", "stroke": "{color}", "stroke_width": 1}, {"d": "M0 6 L35 6", "fill": "none", "stroke": "{color}", "stroke_width": 1}], "color_slots": {"color": {"base": "#6600CC", "variance": 0.15}}}',
  '["book3", "cosmic", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- stitch variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_reality_seam_stitch_a', 'bg_component', 'Reality Seam - Stitch A', 'Cross-stitches holding reality together',
  '{"type": "bg_component", "slot": "stitch", "svg_paths": [{"d": "M5 2 L7 8", "fill": "none", "stroke": "{color}", "stroke_width": 1}, {"d": "M7 2 L5 8", "fill": "none", "stroke": "{color}", "stroke_width": 1}, {"d": "M15 2 L17 8", "fill": "none", "stroke": "{color}", "stroke_width": 1}, {"d": "M17 2 L15 8", "fill": "none", "stroke": "{color}", "stroke_width": 1}, {"d": "M25 2 L27 8", "fill": "none", "stroke": "{color}", "stroke_width": 1}, {"d": "M27 2 L25 8", "fill": "none", "stroke": "{color}", "stroke_width": 1}], "color_slots": {"color": {"base": "#FF0066", "variance": 0.2}}}',
  '["book3", "cosmic", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_reality_seam_stitch_b', 'bg_component', 'Reality Seam - Stitch B', 'Loose dangling stitches',
  '{"type": "bg_component", "slot": "stitch", "svg_paths": [{"d": "M8 3 L10 7 L12 3", "fill": "none", "stroke": "{color}", "stroke_width": 1}, {"d": "M20 3 L22 8 L24 3", "fill": "none", "stroke": "{color}", "stroke_width": 1}], "color_slots": {"color": {"base": "#00FF88", "variance": 0.25}}}',
  '["book3", "cosmic", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- patch variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_reality_seam_patch_a', 'bg_component', 'Reality Seam - Patch A', 'Mismatched reality patch',
  '{"type": "bg_component", "slot": "patch", "svg_paths": [{"d": "M10 1 L20 1 L20 9 L10 9 Z", "fill": "{color}", "opacity": 0.15}], "color_slots": {"color": {"base": "#0044FF", "variance": 0.2}}}',
  '["book3", "cosmic", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_reality_seam_patch_b', 'bg_component', 'Reality Seam - Patch B', 'Slightly offset patch overlay',
  '{"type": "bg_component", "slot": "patch", "svg_paths": [{"d": "M22 0 L32 0 L32 10 L22 10 Z", "fill": "{color}", "opacity": 0.1}], "color_slots": {"color": {"base": "#110022", "variance": 0.2}}}',
  '["book3", "cosmic", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 10. ENTROPY CLUSTER — Decaying matter
--     Slots: core(3), debris(3), energy(2) | base: 20x20
-- ============================================================================

-- Definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_def_entropy_cluster', 'bg_element_def', 'Entropy Cluster', 'Clusters of decaying matter dissolving into void',
  '{"type": "element_definition", "element_type": "entropy_cluster", "components": {"core": ["elem_entropy_cluster_core_a", "elem_entropy_cluster_core_b", "elem_entropy_cluster_core_c"], "debris": ["elem_entropy_cluster_debris_a", "elem_entropy_cluster_debris_b", "elem_entropy_cluster_debris_c"], "energy": ["elem_entropy_cluster_energy_a", "elem_entropy_cluster_energy_b"]}, "anchor": {"x": 0.5, "y": 0.5}, "base_width": 20, "base_height": 20}',
  '["book3", "cosmic", "void", "reality"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- core variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_entropy_cluster_core_a', 'bg_component', 'Entropy Cluster - Core A', 'Dense dark matter core',
  '{"type": "bg_component", "slot": "core", "svg_paths": [{"d": "M8 7 Q12 5 14 8 Q16 12 13 14 Q10 16 7 13 Q5 10 8 7 Z", "fill": "{color}", "opacity": 0.7}], "color_slots": {"color": {"base": "#110022", "variance": 0.15}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_entropy_cluster_core_b', 'bg_component', 'Entropy Cluster - Core B', 'Fractured irregular core',
  '{"type": "bg_component", "slot": "core", "svg_paths": [{"d": "M9 6 L13 7 L15 11 L12 14 L8 12 L7 9 Z", "fill": "{color}", "opacity": 0.6}], "color_slots": {"color": {"base": "#6600CC", "variance": 0.2}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_entropy_cluster_core_c', 'bg_component', 'Entropy Cluster - Core C', 'Hollow decaying shell',
  '{"type": "bg_component", "slot": "core", "svg_paths": [{"d": "M7 7 L13 6 L15 10 L14 14 L8 15 L6 11 Z", "fill": "none", "stroke": "{color}", "stroke_width": 2}], "color_slots": {"color": {"base": "#8800FF", "variance": 0.2}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- debris variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_entropy_cluster_debris_a', 'bg_component', 'Entropy Cluster - Debris A', 'Orbiting fragments',
  '{"type": "bg_component", "slot": "debris", "svg_paths": [{"d": "M3 4 L5 3 L5 5 Z", "fill": "{color}", "opacity": 0.5}, {"d": "M16 3 L18 4 L17 6 Z", "fill": "{color}", "opacity": 0.6}, {"d": "M2 14 L4 13 L3 16 Z", "fill": "{color}", "opacity": 0.4}], "color_slots": {"color": {"base": "#8800FF", "variance": 0.25}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_entropy_cluster_debris_b', 'bg_component', 'Entropy Cluster - Debris B', 'Scattered dissolving chunks',
  '{"type": "bg_component", "slot": "debris", "svg_paths": [{"d": "M1 8 L3 7 L4 9 L2 10 Z", "fill": "{color}", "opacity": 0.5}, {"d": "M17 15 L19 14 L19 17 L17 17 Z", "fill": "{color}", "opacity": 0.4}, {"d": "M14 1 L16 2 L15 4 Z", "fill": "{color}", "opacity": 0.6}], "color_slots": {"color": {"base": "#6600CC", "variance": 0.3}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_entropy_cluster_debris_c', 'bg_component', 'Entropy Cluster - Debris C', 'Fine dust particles',
  '{"type": "bg_component", "slot": "debris", "svg_paths": [{"d": "M2 3 L3 3 L3 4 L2 4 Z", "fill": "{color}", "opacity": 0.4}, {"d": "M18 8 L19 8 L19 9 L18 9 Z", "fill": "{color}", "opacity": 0.5}, {"d": "M5 17 L6 17 L6 18 L5 18 Z", "fill": "{color}", "opacity": 0.3}, {"d": "M15 18 L16 18 L16 19 L15 19 Z", "fill": "{color}", "opacity": 0.6}], "color_slots": {"color": {"base": "#EEEEFF", "variance": 0.3}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

-- energy variants
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_entropy_cluster_energy_a', 'bg_component', 'Entropy Cluster - Energy A', 'Radiating void energy',
  '{"type": "bg_component", "slot": "energy", "svg_paths": [{"d": "M10 0 L11 5 L10 3 L9 5 Z", "fill": "{color}", "opacity": 0.4}, {"d": "M20 10 L15 11 L17 10 L15 9 Z", "fill": "{color}", "opacity": 0.4}, {"d": "M10 20 L9 15 L10 17 L11 15 Z", "fill": "{color}", "opacity": 0.4}, {"d": "M0 10 L5 9 L3 10 L5 11 Z", "fill": "{color}", "opacity": 0.4}], "color_slots": {"color": {"base": "#FF0066", "variance": 0.25}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('elem_entropy_cluster_energy_b', 'bg_component', 'Entropy Cluster - Energy B', 'Swirling entropy field',
  '{"type": "bg_component", "slot": "energy", "svg_paths": [{"d": "M4 4 Q10 2 16 4 Q18 10 16 16 Q10 18 4 16 Q2 10 4 4 Z", "fill": "none", "stroke": "{color}", "stroke_width": 1, "opacity": 0.3}], "color_slots": {"color": {"base": "#8800FF", "variance": 0.2}}}',
  '["book3", "cosmic", "void"]', 'system')
ON CONFLICT (asset_key) DO NOTHING;

COMMIT;
