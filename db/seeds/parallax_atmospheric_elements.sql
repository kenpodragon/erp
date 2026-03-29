-- ============================================================================
-- Parallax Background System: Phase 6 — Atmospheric Elements
-- 6 element types: fog_bank, light_shaft, rain, spark_cluster, dust_mote, haze_band
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. FOG BANK — rolling fog layers (80x20)
-- ============================================================================

-- Definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_fog_bank', 'bg_element_def', 'Fog Bank', 'Rolling fog layers that drift across the scene',
  '{"type": "element_definition", "element_type": "fog_bank", "components": {"body": ["elem_fog_bank_body_a", "elem_fog_bank_body_b", "elem_fog_bank_body_c"], "wisp": ["elem_fog_bank_wisp_a", "elem_fog_bank_wisp_b", "elem_fog_bank_wisp_c"], "edge": ["elem_fog_bank_edge_a", "elem_fog_bank_edge_b"]}, "anchor": {"x": 0.5, "y": 0.5}, "base_width": 80, "base_height": 20}',
  '["atmospheric", "weather", "fog"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Body variants (main fog mass)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_fog_bank_body_a', 'bg_component', 'Fog Bank Body A', 'Dense rolling fog mass',
  '{"type": "bg_component", "slot": "body", "svg_paths": [{"d": "M0 10 Q10 2 20 8 Q40 0 60 7 Q75 3 80 10 Q70 16 50 14 Q30 19 10 15 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#DDDDDD", "variance": 0.15}}}',
  '["atmospheric", "fog"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_fog_bank_body_b', 'bg_component', 'Fog Bank Body B', 'Billowing fog cloud',
  '{"type": "bg_component", "slot": "body", "svg_paths": [{"d": "M0 12 Q15 4 30 9 Q45 2 55 8 Q70 4 80 11 Q65 18 40 16 Q20 20 0 12 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#CCCCCC", "variance": 0.18}}}',
  '["atmospheric", "fog"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_fog_bank_body_c', 'bg_component', 'Fog Bank Body C', 'Thin stretched fog layer',
  '{"type": "bg_component", "slot": "body", "svg_paths": [{"d": "M0 10 Q20 5 40 9 Q60 6 80 10 Q60 14 40 12 Q20 15 0 10 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#E0E0E0", "variance": 0.15}}}',
  '["atmospheric", "fog"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Wisp variants (trailing wisps)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_fog_bank_wisp_a', 'bg_component', 'Fog Bank Wisp A', 'Curling fog tendril',
  '{"type": "bg_component", "slot": "wisp", "svg_paths": [{"d": "M0 10 Q8 6 16 9 Q24 5 32 8 Q28 12 20 11 Q10 14 0 10 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#E8E8E8", "variance": 0.20}}}',
  '["atmospheric", "fog"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_fog_bank_wisp_b', 'bg_component', 'Fog Bank Wisp B', 'Drifting fog strand',
  '{"type": "bg_component", "slot": "wisp", "svg_paths": [{"d": "M0 8 Q12 4 24 7 Q18 12 10 10 Q5 11 0 8 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#F0F0F0", "variance": 0.20}}}',
  '["atmospheric", "fog"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_fog_bank_wisp_c', 'bg_component', 'Fog Bank Wisp C', 'Faint trailing mist',
  '{"type": "bg_component", "slot": "wisp", "svg_paths": [{"d": "M0 6 Q10 3 20 5 Q15 9 8 8 Q3 9 0 6 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#F5F5F5", "variance": 0.25}}}',
  '["atmospheric", "fog"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Edge variants (fog boundary)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_fog_bank_edge_a', 'bg_component', 'Fog Bank Edge A', 'Soft fog boundary',
  '{"type": "bg_component", "slot": "edge", "svg_paths": [{"d": "M0 10 Q20 4 40 8 Q60 3 80 10 L80 14 Q60 10 40 13 Q20 9 0 14 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#E5E5E5", "variance": 0.20}}}',
  '["atmospheric", "fog"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_fog_bank_edge_b', 'bg_component', 'Fog Bank Edge B', 'Ragged fog fringe',
  '{"type": "bg_component", "slot": "edge", "svg_paths": [{"d": "M0 10 Q10 6 25 9 Q40 5 55 8 Q70 4 80 10 L80 12 Q65 8 50 11 Q35 7 15 11 Q5 8 0 12 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#D8D8D8", "variance": 0.18}}}',
  '["atmospheric", "fog"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 2. LIGHT SHAFT — volumetric light beams (15x60)
-- ============================================================================

-- Definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_light_shaft', 'bg_element_def', 'Light Shaft', 'Volumetric light beams streaming through gaps',
  '{"type": "element_definition", "element_type": "light_shaft", "components": {"beam": ["elem_light_shaft_beam_a", "elem_light_shaft_beam_b", "elem_light_shaft_beam_c"], "particle": ["elem_light_shaft_particle_a", "elem_light_shaft_particle_b"], "glow": ["elem_light_shaft_glow_a", "elem_light_shaft_glow_b"]}, "anchor": {"x": 0.5, "y": 0.0}, "base_width": 15, "base_height": 60}',
  '["atmospheric", "light"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Beam variants (main light cone)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_light_shaft_beam_a', 'bg_component', 'Light Shaft Beam A', 'Straight vertical light beam',
  '{"type": "bg_component", "slot": "beam", "svg_paths": [{"d": "M5 0 L10 0 L13 60 L2 60 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#FFEEAA", "variance": 0.20}}}',
  '["atmospheric", "light"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_light_shaft_beam_b', 'bg_component', 'Light Shaft Beam B', 'Diagonal light beam',
  '{"type": "bg_component", "slot": "beam", "svg_paths": [{"d": "M7 0 L12 0 Q14 30 15 60 L0 60 Q3 30 7 0 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#FFFFCC", "variance": 0.18}}}',
  '["atmospheric", "light"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_light_shaft_beam_c', 'bg_component', 'Light Shaft Beam C', 'Wide fanning light cone',
  '{"type": "bg_component", "slot": "beam", "svg_paths": [{"d": "M6 0 L9 0 Q12 20 15 60 L0 60 Q3 20 6 0 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#FFF5CC", "variance": 0.22}}}',
  '["atmospheric", "light"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Particle variants (dust in the beam)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_light_shaft_particle_a', 'bg_component', 'Light Shaft Particle A', 'Tiny floating motes in the beam',
  '{"type": "bg_component", "slot": "particle", "svg_paths": [{"d": "M4 15 A1 1 0 1 1 6 15 A1 1 0 1 1 4 15 Z", "fill": "{color}"}, {"d": "M8 30 A0.8 0.8 0 1 1 9.6 30 A0.8 0.8 0 1 1 8 30 Z", "fill": "{color}"}, {"d": "M6 45 A1.2 1.2 0 1 1 8.4 45 A1.2 1.2 0 1 1 6 45 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#FFFFFF", "variance": 0.15}}}',
  '["atmospheric", "light", "particle"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_light_shaft_particle_b', 'bg_component', 'Light Shaft Particle B', 'Scattered bright specks',
  '{"type": "bg_component", "slot": "particle", "svg_paths": [{"d": "M3 20 A0.6 0.6 0 1 1 4.2 20 A0.6 0.6 0 1 1 3 20 Z", "fill": "{color}"}, {"d": "M10 35 A0.9 0.9 0 1 1 11.8 35 A0.9 0.9 0 1 1 10 35 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#FFEECC", "variance": 0.20}}}',
  '["atmospheric", "light", "particle"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Glow variants (soft halo around beam)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_light_shaft_glow_a', 'bg_component', 'Light Shaft Glow A', 'Soft warm halo',
  '{"type": "bg_component", "slot": "glow", "svg_paths": [{"d": "M0 10 Q7.5 0 15 10 Q7.5 25 0 10 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#FFEEAA", "variance": 0.25}}}',
  '["atmospheric", "light"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_light_shaft_glow_b', 'bg_component', 'Light Shaft Glow B', 'Diffuse radial glow',
  '{"type": "bg_component", "slot": "glow", "svg_paths": [{"d": "M2 5 Q7.5 0 13 5 Q15 15 7.5 20 Q0 15 2 5 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#FFFFDD", "variance": 0.22}}}',
  '["atmospheric", "light"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 3. RAIN — rain streaks (20x40)
-- ============================================================================

-- Definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_rain', 'bg_element_def', 'Rain', 'Falling rain streaks and splashes',
  '{"type": "element_definition", "element_type": "rain", "components": {"streak": ["elem_rain_streak_a", "elem_rain_streak_b", "elem_rain_streak_c"], "splash": ["elem_rain_splash_a", "elem_rain_splash_b", "elem_rain_splash_c"], "drop": ["elem_rain_drop_a", "elem_rain_drop_b"]}, "anchor": {"x": 0.5, "y": 0.0}, "base_width": 20, "base_height": 40}',
  '["atmospheric", "weather", "rain"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Streak variants (falling rain lines)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_rain_streak_a', 'bg_component', 'Rain Streak A', 'Thin diagonal rain line',
  '{"type": "bg_component", "slot": "streak", "svg_paths": [{"d": "M10 0 L10.3 0 L8.3 40 L8 40 Z", "fill": "{color}"}, {"d": "M15 5 L15.3 5 L13.3 38 L13 38 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#7799BB", "variance": 0.18}}}',
  '["atmospheric", "weather", "rain"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_rain_streak_b', 'bg_component', 'Rain Streak B', 'Heavy rain strands',
  '{"type": "bg_component", "slot": "streak", "svg_paths": [{"d": "M5 0 L5.5 0 L3.5 40 L3 40 Z", "fill": "{color}"}, {"d": "M12 3 L12.5 3 L10.5 40 L10 40 Z", "fill": "{color}"}, {"d": "M18 1 L18.4 1 L16.4 36 L16 36 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#6688AA", "variance": 0.15}}}',
  '["atmospheric", "weather", "rain"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_rain_streak_c', 'bg_component', 'Rain Streak C', 'Fine misty rain',
  '{"type": "bg_component", "slot": "streak", "svg_paths": [{"d": "M8 2 L8.2 2 L7.2 30 L7 30 Z", "fill": "{color}"}, {"d": "M14 0 L14.2 0 L13.2 35 L13 35 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#88AACC", "variance": 0.20}}}',
  '["atmospheric", "weather", "rain"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Splash variants (impact splashes)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_rain_splash_a', 'bg_component', 'Rain Splash A', 'Small impact crown',
  '{"type": "bg_component", "slot": "splash", "svg_paths": [{"d": "M8 38 Q10 34 12 38 Q10 36 8 38 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#99BBDD", "variance": 0.18}}}',
  '["atmospheric", "weather", "rain"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_rain_splash_b', 'bg_component', 'Rain Splash B', 'Wide splash ring',
  '{"type": "bg_component", "slot": "splash", "svg_paths": [{"d": "M6 39 Q8 35 10 39 Q12 35 14 39 Q10 37 6 39 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#AACCEE", "variance": 0.20}}}',
  '["atmospheric", "weather", "rain"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_rain_splash_c', 'bg_component', 'Rain Splash C', 'Tiny bounce droplet',
  '{"type": "bg_component", "slot": "splash", "svg_paths": [{"d": "M9 37 Q10 34 11 37 Q10 36 9 37 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#88AACC", "variance": 0.22}}}',
  '["atmospheric", "weather", "rain"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Drop variants (individual drops)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_rain_drop_a', 'bg_component', 'Rain Drop A', 'Round raindrop',
  '{"type": "bg_component", "slot": "drop", "svg_paths": [{"d": "M10 5 Q11 3 12 5 Q11 7 10 5 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#7799BB", "variance": 0.18}}}',
  '["atmospheric", "weather", "rain"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_rain_drop_b', 'bg_component', 'Rain Drop B', 'Elongated falling drop',
  '{"type": "bg_component", "slot": "drop", "svg_paths": [{"d": "M10 8 Q11 5 12 8 L11 12 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#6688AA", "variance": 0.15}}}',
  '["atmospheric", "weather", "rain"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 4. SPARK CLUSTER — electrical sparks (15x15)
-- ============================================================================

-- Definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_spark_cluster', 'bg_element_def', 'Spark Cluster', 'Electrical sparks and arcing energy',
  '{"type": "element_definition", "element_type": "spark_cluster", "components": {"spark": ["elem_spark_cluster_spark_a", "elem_spark_cluster_spark_b", "elem_spark_cluster_spark_c"], "arc": ["elem_spark_cluster_arc_a", "elem_spark_cluster_arc_b"], "glow": ["elem_spark_cluster_glow_a", "elem_spark_cluster_glow_b"]}, "anchor": {"x": 0.5, "y": 0.5}, "base_width": 15, "base_height": 15}',
  '["atmospheric", "particle", "energy"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Spark variants (bright points)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_spark_cluster_spark_a', 'bg_component', 'Spark A', 'Bright spark point with rays',
  '{"type": "bg_component", "slot": "spark", "svg_paths": [{"d": "M7.5 5 L8 7 L10 7.5 L8 8 L7.5 10 L7 8 L5 7.5 L7 7 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#FFCC44", "variance": 0.20}}}',
  '["atmospheric", "particle", "energy"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_spark_cluster_spark_b', 'bg_component', 'Spark B', 'Small hot spark',
  '{"type": "bg_component", "slot": "spark", "svg_paths": [{"d": "M7 6 L8 7 L7.5 9 L6.5 7.5 Z", "fill": "{color}"}, {"d": "M10 4 L11 5 L10.5 6.5 L9.5 5.5 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#FFAA44", "variance": 0.22}}}',
  '["atmospheric", "particle", "energy"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_spark_cluster_spark_c', 'bg_component', 'Spark C', 'Scattered micro sparks',
  '{"type": "bg_component", "slot": "spark", "svg_paths": [{"d": "M5 5 A0.8 0.8 0 1 1 6.6 5 A0.8 0.8 0 1 1 5 5 Z", "fill": "{color}"}, {"d": "M9 8 A0.6 0.6 0 1 1 10.2 8 A0.6 0.6 0 1 1 9 8 Z", "fill": "{color}"}, {"d": "M11 3 A0.5 0.5 0 1 1 12 3 A0.5 0.5 0 1 1 11 3 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#FFD466", "variance": 0.25}}}',
  '["atmospheric", "particle", "energy"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Arc variants (electrical arcs)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_spark_cluster_arc_a', 'bg_component', 'Spark Arc A', 'Jagged electrical arc',
  '{"type": "bg_component", "slot": "arc", "svg_paths": [{"d": "M3 7 L5 5 L7 8 L9 4 L11 7 L12 6", "fill": "none", "stroke": "{color}", "stroke_width": 0.5}], "color_slots": {"color": {"base": "#FFCC44", "variance": 0.20}}}',
  '["atmospheric", "particle", "energy"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_spark_cluster_arc_b', 'bg_component', 'Spark Arc B', 'Branching lightning fork',
  '{"type": "bg_component", "slot": "arc", "svg_paths": [{"d": "M4 10 L6 7 L8 9 L10 5 L12 7", "fill": "none", "stroke": "{color}", "stroke_width": 0.4}, {"d": "M8 9 L9 11 L10 10", "fill": "none", "stroke": "{color}", "stroke_width": 0.3}], "color_slots": {"color": {"base": "#FFBB33", "variance": 0.22}}}',
  '["atmospheric", "particle", "energy"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Glow variants (ambient glow around sparks)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_spark_cluster_glow_a', 'bg_component', 'Spark Glow A', 'Warm ambient glow',
  '{"type": "bg_component", "slot": "glow", "svg_paths": [{"d": "M4 4 Q7.5 2 11 4 Q13 7.5 11 11 Q7.5 13 4 11 Q2 7.5 4 4 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#FFDD88", "variance": 0.25}}}',
  '["atmospheric", "particle", "energy"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_spark_cluster_glow_b', 'bg_component', 'Spark Glow B', 'Faint orange haze',
  '{"type": "bg_component", "slot": "glow", "svg_paths": [{"d": "M3 5 Q7.5 1 12 5 Q14 7.5 12 10 Q7.5 14 3 10 Q1 7.5 3 5 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#FFCC77", "variance": 0.22}}}',
  '["atmospheric", "particle", "energy"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 5. DUST MOTE — floating dust particles (25x25)
-- ============================================================================

-- Definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_dust_mote', 'bg_element_def', 'Dust Mote', 'Floating dust particles catching the light',
  '{"type": "element_definition", "element_type": "dust_mote", "components": {"mote": ["elem_dust_mote_mote_a", "elem_dust_mote_mote_b", "elem_dust_mote_mote_c"], "cluster": ["elem_dust_mote_cluster_a", "elem_dust_mote_cluster_b"], "shimmer": ["elem_dust_mote_shimmer_a", "elem_dust_mote_shimmer_b"]}, "anchor": {"x": 0.5, "y": 0.5}, "base_width": 25, "base_height": 25}',
  '["atmospheric", "particle"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Mote variants (individual particles)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_dust_mote_mote_a', 'bg_component', 'Dust Mote A', 'Single floating dust speck',
  '{"type": "bg_component", "slot": "mote", "svg_paths": [{"d": "M12 12 A1.5 1.5 0 1 1 15 12 A1.5 1.5 0 1 1 12 12 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#EEDDCC", "variance": 0.20}}}',
  '["atmospheric", "particle"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_dust_mote_mote_b', 'bg_component', 'Dust Mote B', 'Tiny bright particle',
  '{"type": "bg_component", "slot": "mote", "svg_paths": [{"d": "M11 13 A1 1 0 1 1 13 13 A1 1 0 1 1 11 13 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#FFFFFF", "variance": 0.15}}}',
  '["atmospheric", "particle"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_dust_mote_mote_c', 'bg_component', 'Dust Mote C', 'Warm golden dust speck',
  '{"type": "bg_component", "slot": "mote", "svg_paths": [{"d": "M13 11 A1.2 1.2 0 1 1 15.4 11 A1.2 1.2 0 1 1 13 11 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#FFEEBB", "variance": 0.22}}}',
  '["atmospheric", "particle"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Cluster variants (grouped particles)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_dust_mote_cluster_a', 'bg_component', 'Dust Cluster A', 'Group of drifting motes',
  '{"type": "bg_component", "slot": "cluster", "svg_paths": [{"d": "M6 8 A0.8 0.8 0 1 1 7.6 8 A0.8 0.8 0 1 1 6 8 Z", "fill": "{color}"}, {"d": "M10 6 A1 1 0 1 1 12 6 A1 1 0 1 1 10 6 Z", "fill": "{color}"}, {"d": "M8 14 A0.7 0.7 0 1 1 9.4 14 A0.7 0.7 0 1 1 8 14 Z", "fill": "{color}"}, {"d": "M16 10 A0.9 0.9 0 1 1 17.8 10 A0.9 0.9 0 1 1 16 10 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#EEDDCC", "variance": 0.22}}}',
  '["atmospheric", "particle"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_dust_mote_cluster_b', 'bg_component', 'Dust Cluster B', 'Sparse scattered particles',
  '{"type": "bg_component", "slot": "cluster", "svg_paths": [{"d": "M4 12 A0.6 0.6 0 1 1 5.2 12 A0.6 0.6 0 1 1 4 12 Z", "fill": "{color}"}, {"d": "M14 5 A0.8 0.8 0 1 1 15.6 5 A0.8 0.8 0 1 1 14 5 Z", "fill": "{color}"}, {"d": "M20 15 A0.7 0.7 0 1 1 21.4 15 A0.7 0.7 0 1 1 20 15 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#FFFFFF", "variance": 0.20}}}',
  '["atmospheric", "particle"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Shimmer variants (light-catching glints)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_dust_mote_shimmer_a', 'bg_component', 'Dust Shimmer A', 'Brief light glint',
  '{"type": "bg_component", "slot": "shimmer", "svg_paths": [{"d": "M12 11 L12.5 12.5 L14 13 L12.5 13.5 L12 15 L11.5 13.5 L10 13 L11.5 12.5 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#FFFFFF", "variance": 0.15}}}',
  '["atmospheric", "particle", "light"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_dust_mote_shimmer_b', 'bg_component', 'Dust Shimmer B', 'Soft twinkle',
  '{"type": "bg_component", "slot": "shimmer", "svg_paths": [{"d": "M12 10 L12.3 12 L14 12.5 L12.3 13 L12 15 L11.7 13 L10 12.5 L11.7 12 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#FFEEDD", "variance": 0.20}}}',
  '["atmospheric", "particle", "light"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 6. HAZE BAND — horizontal atmospheric haze (100x10)
-- ============================================================================

-- Definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_haze_band', 'bg_element_def', 'Haze Band', 'Wide horizontal atmospheric haze layer',
  '{"type": "element_definition", "element_type": "haze_band", "components": {"band": ["elem_haze_band_band_a", "elem_haze_band_band_b", "elem_haze_band_band_c"], "gradient": ["elem_haze_band_gradient_a", "elem_haze_band_gradient_b"], "shimmer": ["elem_haze_band_shimmer_a", "elem_haze_band_shimmer_b"]}, "anchor": {"x": 0.5, "y": 0.5}, "base_width": 100, "base_height": 10}',
  '["atmospheric", "weather", "haze"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Band variants (main haze body)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_haze_band_band_a', 'bg_component', 'Haze Band A', 'Smooth even haze',
  '{"type": "bg_component", "slot": "band", "svg_paths": [{"d": "M0 5 Q25 2 50 4 Q75 2 100 5 Q75 8 50 6 Q25 8 0 5 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#CCCCDD", "variance": 0.18}}}',
  '["atmospheric", "weather", "haze"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_haze_band_band_b', 'bg_component', 'Haze Band B', 'Undulating haze layer',
  '{"type": "bg_component", "slot": "band", "svg_paths": [{"d": "M0 5 Q15 1 30 4 Q50 2 70 5 Q85 3 100 5 Q85 8 70 6 Q50 9 30 7 Q15 9 0 5 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#DDDDEE", "variance": 0.15}}}',
  '["atmospheric", "weather", "haze"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_haze_band_band_c', 'bg_component', 'Haze Band C', 'Thin wispy haze',
  '{"type": "bg_component", "slot": "band", "svg_paths": [{"d": "M0 5 Q25 3 50 5 Q75 3 100 5 Q75 7 50 5.5 Q25 7 0 5 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#E0E0EE", "variance": 0.20}}}',
  '["atmospheric", "weather", "haze"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Gradient variants (depth-fading bands)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_haze_band_gradient_a', 'bg_component', 'Haze Gradient A', 'Top-heavy fade band',
  '{"type": "bg_component", "slot": "gradient", "svg_paths": [{"d": "M0 3 Q50 0 100 3 L100 5 Q50 4 0 5 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#DDDDEE", "variance": 0.22}}}',
  '["atmospheric", "weather", "haze"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_haze_band_gradient_b', 'bg_component', 'Haze Gradient B', 'Bottom-heavy fade band',
  '{"type": "bg_component", "slot": "gradient", "svg_paths": [{"d": "M0 5 Q50 6 100 5 L100 8 Q50 10 0 8 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#CCCCDD", "variance": 0.20}}}',
  '["atmospheric", "weather", "haze"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Shimmer variants (subtle light play)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_haze_band_shimmer_a', 'bg_component', 'Haze Shimmer A', 'Faint ripple of light in haze',
  '{"type": "bg_component", "slot": "shimmer", "svg_paths": [{"d": "M20 4 Q30 3 40 4.5 Q50 3.5 60 4 Q50 5.5 40 5 Q30 5.5 20 4 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#EEEEFF", "variance": 0.25}}}',
  '["atmospheric", "weather", "haze", "light"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_haze_band_shimmer_b', 'bg_component', 'Haze Shimmer B', 'Subtle brightness variation',
  '{"type": "bg_component", "slot": "shimmer", "svg_paths": [{"d": "M40 4 Q55 2.5 70 4 Q55 5.5 40 4 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#F0F0FF", "variance": 0.22}}}',
  '["atmospheric", "weather", "haze", "light"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

COMMIT;
