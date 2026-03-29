-- ============================================================================
-- Parallax Background System: Dream Plane / Akashic Realm Elements
-- 5 element types: akashic_pillar, info_stream, escher_arch, color_wave, memory_fragment
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. AKASHIC PILLAR — Impossible architecture columns extending infinitely (15x90)
-- ============================================================================

-- Definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_akashic_pillar', 'bg_element_def', 'Akashic Pillar', 'Impossible architecture columns extending infinitely into the dream plane',
  '{"type": "element_definition", "element_type": "akashic_pillar", "components": {"column": ["elem_akashic_pillar_column_a", "elem_akashic_pillar_column_b", "elem_akashic_pillar_column_c"], "glyph_band": ["elem_akashic_pillar_glyph_band_a", "elem_akashic_pillar_glyph_band_b"], "glow": ["elem_akashic_pillar_glow_a", "elem_akashic_pillar_glow_b"]}, "anchor": {"x": 0.5, "y": 1.0}, "base_width": 15, "base_height": 90}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Column variants (main pillar structure)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_akashic_pillar_column_a', 'bg_component', 'Akashic Pillar Column A', 'Straight ethereal column with slight taper',
  '{"type": "bg_component", "slot": "column", "svg_paths": [{"d": "M4 0 Q3 20 2 45 Q1 70 3 90 L12 90 Q14 70 13 45 Q12 20 11 0 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#2A1A4A", "variance": 0.25}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_akashic_pillar_column_b', 'bg_component', 'Akashic Pillar Column B', 'Twisted impossible column',
  '{"type": "bg_component", "slot": "column", "svg_paths": [{"d": "M5 0 Q1 25 3 45 Q7 65 2 90 L13 90 Q8 65 12 45 Q14 25 10 0 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#2E1E50", "variance": 0.25}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_akashic_pillar_column_c', 'bg_component', 'Akashic Pillar Column C', 'Fluted dream column with ridges',
  '{"type": "bg_component", "slot": "column", "svg_paths": [{"d": "M3 0 Q2 30 4 60 Q3 80 3 90 L12 90 Q12 80 11 60 Q13 30 12 0 Z", "fill": "{color}"}, {"d": "M7 0 L7 90 Q8 60 8 30 Q7 10 7 0 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#261646", "variance": 0.22}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Glyph band variants (inscribed rune bands)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_akashic_pillar_glyph_band_a', 'bg_component', 'Akashic Pillar Glyph Band A', 'Horizontal band of glowing glyphs',
  '{"type": "bg_component", "slot": "glyph_band", "svg_paths": [{"d": "M2 30 Q4 28 7 30 Q10 28 13 30 L13 34 Q10 32 7 34 Q4 32 2 34 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#CCCCDD", "variance": 0.20}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_akashic_pillar_glyph_band_b', 'bg_component', 'Akashic Pillar Glyph Band B', 'Spiraling glyph inscription',
  '{"type": "bg_component", "slot": "glyph_band", "svg_paths": [{"d": "M3 55 Q5 52 8 54 Q11 52 12 55 L12 59 Q9 57 6 59 Q4 57 3 59 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#BBBBCC", "variance": 0.22}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Glow variants (ethereal light emanating from pillar)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_akashic_pillar_glow_a', 'bg_component', 'Akashic Pillar Glow A', 'Warm inner radiance',
  '{"type": "bg_component", "slot": "glow", "svg_paths": [{"d": "M5 20 Q3 40 5 60 Q7 80 7 90 L8 90 Q10 80 10 60 Q12 40 10 20 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#FFDDAA", "variance": 0.25}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_akashic_pillar_glow_b', 'bg_component', 'Akashic Pillar Glow B', 'Faint pulsing aura',
  '{"type": "bg_component", "slot": "glow", "svg_paths": [{"d": "M4 10 Q1 45 4 70 Q6 85 7 90 L8 90 Q11 85 11 70 Q14 45 11 10 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#FFCC88", "variance": 0.28}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 2. INFO STREAM — Flowing rivers of information/data (60x20)
-- ============================================================================

-- Definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_info_stream', 'bg_element_def', 'Info Stream', 'Flowing rivers of information and data coursing through the Akashic Realm',
  '{"type": "element_definition", "element_type": "info_stream", "components": {"stream": ["elem_info_stream_stream_a", "elem_info_stream_stream_b", "elem_info_stream_stream_c"], "particle": ["elem_info_stream_particle_a", "elem_info_stream_particle_b", "elem_info_stream_particle_c"], "glow": ["elem_info_stream_glow_a", "elem_info_stream_glow_b"]}, "anchor": {"x": 0.5, "y": 0.5}, "base_width": 60, "base_height": 20}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Stream variants (main flowing body)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_info_stream_stream_a', 'bg_component', 'Info Stream Flow A', 'Smooth winding data river',
  '{"type": "bg_component", "slot": "stream", "svg_paths": [{"d": "M0 10 Q10 4 20 8 Q30 3 40 9 Q50 5 60 10 Q50 15 40 12 Q30 17 20 13 Q10 16 0 10 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#3344AA", "variance": 0.22}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_info_stream_stream_b', 'bg_component', 'Info Stream Flow B', 'Turbulent data current',
  '{"type": "bg_component", "slot": "stream", "svg_paths": [{"d": "M0 12 Q8 6 18 10 Q28 2 38 7 Q48 4 60 8 Q52 14 42 12 Q32 18 22 14 Q12 19 0 12 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#2E3E9E", "variance": 0.25}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_info_stream_stream_c', 'bg_component', 'Info Stream Flow C', 'Branching tributary of data',
  '{"type": "bg_component", "slot": "stream", "svg_paths": [{"d": "M0 10 Q15 5 30 10 Q45 6 60 10 Q45 14 30 11 Q15 15 0 10 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#3A4AB0", "variance": 0.20}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Particle variants (data fragments in the stream)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_info_stream_particle_a', 'bg_component', 'Info Stream Particle A', 'Bright data glyphs flowing',
  '{"type": "bg_component", "slot": "particle", "svg_paths": [{"d": "M10 8 L12 6 L14 8 L12 10 Z", "fill": "{color}"}, {"d": "M30 7 L32 5 L34 7 L32 9 Z", "fill": "{color}"}, {"d": "M48 9 L50 7 L52 9 L50 11 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#EEEEFF", "variance": 0.20}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_info_stream_particle_b', 'bg_component', 'Info Stream Particle B', 'Crimson data pulses',
  '{"type": "bg_component", "slot": "particle", "svg_paths": [{"d": "M8 10 A1.5 1.5 0 1 1 11 10 A1.5 1.5 0 1 1 8 10 Z", "fill": "{color}"}, {"d": "M25 8 A1 1 0 1 1 27 8 A1 1 0 1 1 25 8 Z", "fill": "{color}"}, {"d": "M44 11 A1.2 1.2 0 1 1 46.4 11 A1.2 1.2 0 1 1 44 11 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#CC3344", "variance": 0.25}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_info_stream_particle_c', 'bg_component', 'Info Stream Particle C', 'Tiny floating data motes',
  '{"type": "bg_component", "slot": "particle", "svg_paths": [{"d": "M15 9 A0.8 0.8 0 1 1 16.6 9 A0.8 0.8 0 1 1 15 9 Z", "fill": "{color}"}, {"d": "M35 10 A0.6 0.6 0 1 1 36.2 10 A0.6 0.6 0 1 1 35 10 Z", "fill": "{color}"}, {"d": "M52 8 A0.9 0.9 0 1 1 53.8 8 A0.9 0.9 0 1 1 52 8 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#DDDDEF", "variance": 0.22}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Glow variants (ambient stream luminescence)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_info_stream_glow_a', 'bg_component', 'Info Stream Glow A', 'Soft cobalt underglow',
  '{"type": "bg_component", "slot": "glow", "svg_paths": [{"d": "M0 10 Q15 2 30 8 Q45 3 60 10 Q45 18 30 13 Q15 19 0 10 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#4455BB", "variance": 0.28}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_info_stream_glow_b', 'bg_component', 'Info Stream Glow B', 'Pulsing edge luminance',
  '{"type": "bg_component", "slot": "glow", "svg_paths": [{"d": "M0 10 Q20 5 40 10 Q55 6 60 10 Q55 14 40 11 Q20 15 0 10 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#5566CC", "variance": 0.30}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 3. ESCHER ARCH — Impossible geometry archways (30x50)
-- ============================================================================

-- Definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_escher_arch', 'bg_element_def', 'Escher Arch', 'Impossible geometry archways that defy spatial logic',
  '{"type": "element_definition", "element_type": "escher_arch", "components": {"arch": ["elem_escher_arch_arch_a", "elem_escher_arch_arch_b", "elem_escher_arch_arch_c"], "inner": ["elem_escher_arch_inner_a", "elem_escher_arch_inner_b"], "shadow": ["elem_escher_arch_shadow_a", "elem_escher_arch_shadow_b"]}, "anchor": {"x": 0.5, "y": 1.0}, "base_width": 30, "base_height": 50}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Arch variants (main structure)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_escher_arch_arch_a', 'bg_component', 'Escher Arch Frame A', 'Classic impossible arch',
  '{"type": "bg_component", "slot": "arch", "svg_paths": [{"d": "M3 50 L3 15 Q3 2 15 2 Q27 2 27 15 L27 50 L23 50 L23 18 Q23 8 15 8 Q7 8 7 18 L7 50 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#3A2A5A", "variance": 0.22}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_escher_arch_arch_b', 'bg_component', 'Escher Arch Frame B', 'Twisted perspective arch',
  '{"type": "bg_component", "slot": "arch", "svg_paths": [{"d": "M5 50 L2 18 Q2 3 15 1 Q28 3 28 18 L25 50 L21 50 L24 20 Q24 9 15 7 Q6 9 6 20 L9 50 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#3E2E5E", "variance": 0.25}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_escher_arch_arch_c', 'bg_component', 'Escher Arch Frame C', 'Pointed gothic dream arch',
  '{"type": "bg_component", "slot": "arch", "svg_paths": [{"d": "M4 50 L4 20 Q4 5 15 0 Q26 5 26 20 L26 50 L22 50 L22 22 Q22 10 15 6 Q8 10 8 22 L8 50 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#362656", "variance": 0.23}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Inner variants (void within the arch)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_escher_arch_inner_a', 'bg_component', 'Escher Arch Inner A', 'Glowing violet interior void',
  '{"type": "bg_component", "slot": "inner", "svg_paths": [{"d": "M9 50 L9 20 Q9 10 15 10 Q21 10 21 20 L21 50 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#6644AA", "variance": 0.25}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_escher_arch_inner_b', 'bg_component', 'Escher Arch Inner B', 'Deep recursive void',
  '{"type": "bg_component", "slot": "inner", "svg_paths": [{"d": "M10 50 L10 22 Q10 12 15 12 Q20 12 20 22 L20 50 Q17 45 15 42 Q13 45 10 50 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#5533AA", "variance": 0.28}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Shadow variants (cast shadows for depth)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_escher_arch_shadow_a', 'bg_component', 'Escher Arch Shadow A', 'Deep shadow on left side',
  '{"type": "bg_component", "slot": "shadow", "svg_paths": [{"d": "M3 50 L3 15 Q3 2 10 2 L7 8 Q7 8 7 18 L7 50 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#1A0A2A", "variance": 0.20}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_escher_arch_shadow_b', 'bg_component', 'Escher Arch Shadow B', 'Ground shadow pool',
  '{"type": "bg_component", "slot": "shadow", "svg_paths": [{"d": "M2 48 Q8 44 15 44 Q22 44 28 48 Q22 50 15 50 Q8 50 2 48 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#140820", "variance": 0.22}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 4. COLOR WAVE — Undulating waves of pure color energy (80x15)
-- ============================================================================

-- Definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_color_wave', 'bg_element_def', 'Color Wave', 'Undulating waves of pure color energy rippling through the dream plane',
  '{"type": "element_definition", "element_type": "color_wave", "components": {"wave": ["elem_color_wave_wave_a", "elem_color_wave_wave_b", "elem_color_wave_wave_c"], "crest": ["elem_color_wave_crest_a", "elem_color_wave_crest_b"], "shimmer": ["elem_color_wave_shimmer_a", "elem_color_wave_shimmer_b"]}, "anchor": {"x": 0.5, "y": 0.5}, "base_width": 80, "base_height": 15}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Wave variants (main undulating body)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_color_wave_wave_a', 'bg_component', 'Color Wave Body A', 'Smooth sinusoidal energy wave',
  '{"type": "bg_component", "slot": "wave", "svg_paths": [{"d": "M0 8 Q10 2 20 7 Q30 12 40 7 Q50 2 60 7 Q70 12 80 8 L80 10 Q70 14 60 9 Q50 4 40 9 Q30 14 20 9 Q10 4 0 10 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#8844CC", "variance": 0.25}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_color_wave_wave_b', 'bg_component', 'Color Wave Body B', 'Choppy energy interference pattern',
  '{"type": "bg_component", "slot": "wave", "svg_paths": [{"d": "M0 7 Q8 3 16 6 Q24 10 32 5 Q40 1 48 6 Q56 11 64 6 Q72 2 80 7 L80 10 Q72 5 64 9 Q56 14 48 9 Q40 4 32 8 Q24 13 16 9 Q8 6 0 10 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#7A3ABB", "variance": 0.28}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_color_wave_wave_c', 'bg_component', 'Color Wave Body C', 'Gentle rolling energy swell',
  '{"type": "bg_component", "slot": "wave", "svg_paths": [{"d": "M0 8 Q20 3 40 8 Q60 13 80 8 L80 10 Q60 15 40 10 Q20 5 0 10 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#9955DD", "variance": 0.22}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Crest variants (bright wave peaks)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_color_wave_crest_a', 'bg_component', 'Color Wave Crest A', 'Magenta cresting energy',
  '{"type": "bg_component", "slot": "crest", "svg_paths": [{"d": "M18 7 Q20 3 22 7 Z", "fill": "{color}"}, {"d": "M38 7 Q40 2 42 7 Z", "fill": "{color}"}, {"d": "M58 7 Q60 3 62 7 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#CC44AA", "variance": 0.25}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_color_wave_crest_b', 'bg_component', 'Color Wave Crest B', 'Bright peaked energy bursts',
  '{"type": "bg_component", "slot": "crest", "svg_paths": [{"d": "M10 6 Q12 2 14 6 Q12 4 10 6 Z", "fill": "{color}"}, {"d": "M48 5 Q50 1 52 5 Q50 3 48 5 Z", "fill": "{color}"}, {"d": "M70 6 Q72 2 74 6 Q72 4 70 6 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#DD55BB", "variance": 0.28}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Shimmer variants (sparkle highlights)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_color_wave_shimmer_a', 'bg_component', 'Color Wave Shimmer A', 'Gold glitter points along wave',
  '{"type": "bg_component", "slot": "shimmer", "svg_paths": [{"d": "M15 6 L16 4 L17 6 L16 8 Z", "fill": "{color}"}, {"d": "M35 5 L36 3 L37 5 L36 7 Z", "fill": "{color}"}, {"d": "M55 6 L56 4 L57 6 L56 8 Z", "fill": "{color}"}, {"d": "M72 5 L73 3 L74 5 L73 7 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#FFCC44", "variance": 0.30}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_color_wave_shimmer_b', 'bg_component', 'Color Wave Shimmer B', 'Scattered golden sparks',
  '{"type": "bg_component", "slot": "shimmer", "svg_paths": [{"d": "M8 7 A0.8 0.8 0 1 1 9.6 7 A0.8 0.8 0 1 1 8 7 Z", "fill": "{color}"}, {"d": "M28 5 A0.6 0.6 0 1 1 29.2 5 A0.6 0.6 0 1 1 28 5 Z", "fill": "{color}"}, {"d": "M62 6 A0.7 0.7 0 1 1 63.4 6 A0.7 0.7 0 1 1 62 6 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#FFD855", "variance": 0.28}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 5. MEMORY FRAGMENT — Floating crystallized memory shards (12x18)
-- ============================================================================

-- Definition
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_memory_fragment', 'bg_element_def', 'Memory Fragment', 'Floating crystallized memory shards drifting through the Akashic Realm',
  '{"type": "element_definition", "element_type": "memory_fragment", "components": {"crystal": ["elem_memory_fragment_crystal_a", "elem_memory_fragment_crystal_b", "elem_memory_fragment_crystal_c"], "inner_glow": ["elem_memory_fragment_inner_glow_a", "elem_memory_fragment_inner_glow_b"], "trail": ["elem_memory_fragment_trail_a", "elem_memory_fragment_trail_b"]}, "anchor": {"x": 0.5, "y": 0.5}, "base_width": 12, "base_height": 18}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Crystal variants (outer shard shape)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_memory_fragment_crystal_a', 'bg_component', 'Memory Fragment Crystal A', 'Hexagonal memory shard',
  '{"type": "bg_component", "slot": "crystal", "svg_paths": [{"d": "M6 0 L11 4 L11 14 L6 18 L1 14 L1 4 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#CCDDEE", "variance": 0.22}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_memory_fragment_crystal_b', 'bg_component', 'Memory Fragment Crystal B', 'Irregular jagged shard',
  '{"type": "bg_component", "slot": "crystal", "svg_paths": [{"d": "M5 0 L10 3 L12 8 L10 14 L7 18 L2 15 L0 9 L2 3 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#BACCDD", "variance": 0.25}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_memory_fragment_crystal_c', 'bg_component', 'Memory Fragment Crystal C', 'Slender diamond shard',
  '{"type": "bg_component", "slot": "crystal", "svg_paths": [{"d": "M6 0 L10 6 L6 18 L2 6 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#D5E0EE", "variance": 0.20}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Inner glow variants (warm light within the crystal)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_memory_fragment_inner_glow_a', 'bg_component', 'Memory Fragment Inner Glow A', 'Warm amber core light',
  '{"type": "bg_component", "slot": "inner_glow", "svg_paths": [{"d": "M6 5 Q8 7 7 9 Q6 12 5 9 Q4 7 6 5 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#FFAA66", "variance": 0.28}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_memory_fragment_inner_glow_b', 'bg_component', 'Memory Fragment Inner Glow B', 'Pulsing golden heart',
  '{"type": "bg_component", "slot": "inner_glow", "svg_paths": [{"d": "M6 6 Q9 8 7 10 Q5 12 4 9 Q3 7 6 6 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#FF9955", "variance": 0.30}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- Trail variants (fading wake behind the shard)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_memory_fragment_trail_a', 'bg_component', 'Memory Fragment Trail A', 'Silver fading trail',
  '{"type": "bg_component", "slot": "trail", "svg_paths": [{"d": "M6 18 Q4 22 3 28 Q5 25 6 20 Q7 25 9 28 Q8 22 6 18 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#AABBCC", "variance": 0.25}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_memory_fragment_trail_b', 'bg_component', 'Memory Fragment Trail B', 'Wispy dissipating wake',
  '{"type": "bg_component", "slot": "trail", "svg_paths": [{"d": "M5 18 Q3 24 2 30 Q4 26 6 22 Q8 26 10 30 Q9 24 7 18 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#99AABB", "variance": 0.28}}}',
  '["dream", "akashic"]', 'system'
) ON CONFLICT (asset_key) DO NOTHING;

COMMIT;
