-- Parallax Background SVG Elements: Cosmic Battleground Theme
-- Generated: 2026-03-28
-- Category: bg_element_def (definitions), bg_component (slots)

BEGIN;

-- ============================================================================
-- 1. COSMIC TITAN DEBRIS
--    Skeletal mechanical debris from cosmic battles
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_cosmic_titan_debris',
  'bg_element_def',
  'Cosmic Titan Debris',
  'Skeletal mechanical debris from cosmic battles — gears, shards, and trailing sparks',
  '{"base_width": 35, "base_height": 40, "anchor": {"x": 0.5, "y": 1.0}, "palette": {"primary": "#AA8844", "secondary": "#778899", "accent": "#FF8833"}, "slots": ["gear", "metal_shard", "spark_trail"]}',
  '["cosmic", "battleground", "mechanical", "debris"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- gear slots (3 variants)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_cosmic_titan_debris_gear_1',
  'bg_component',
  'Titan Gear A',
  'Large broken cog with missing teeth',
  '{"parent": "elem_def_cosmic_titan_debris", "slot": "gear", "variant": 1, "svg": "<path d=\"M0 -12 L4 -10 L6 -14 L10 -8 L14 -10 L12 -4 L16 0 L12 4 L14 10 L10 8 L6 14 L4 10 L0 12 L-4 10 L-6 14 L-10 8 L-12 4 L-16 0 L-12 -4 L-10 -8 Z\" fill=\"#AA8844\" opacity=\"0.85\"/>", "z_index": 1}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_cosmic_titan_debris_gear_2',
  'bg_component',
  'Titan Gear B',
  'Small intact cog half-buried',
  '{"parent": "elem_def_cosmic_titan_debris", "slot": "gear", "variant": 2, "svg": "<path d=\"M0 -8 L3 -6 L5 -9 L7 -5 L9 -6 L8 -2 L11 0 L8 2 L9 6 L7 5 L5 9 L3 6 L0 8 L-3 6 L-5 9 L-7 5 L-8 2 L-11 0 L-8 -2 L-7 -5 Z\" fill=\"#AA8844\" opacity=\"0.7\"/>", "z_index": 1}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_cosmic_titan_debris_gear_3',
  'bg_component',
  'Titan Gear C',
  'Cracked gear fragment, jagged edge',
  '{"parent": "elem_def_cosmic_titan_debris", "slot": "gear", "variant": 3, "svg": "<path d=\"M0 -10 L5 -7 L8 -12 L10 -5 L6 0 L10 4 L7 8 L3 5 L0 10 L-4 6 L-8 3 Z\" fill=\"#AA8844\" opacity=\"0.75\"/>", "z_index": 1}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- metal_shard slots (3 variants)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_cosmic_titan_debris_metal_shard_1',
  'bg_component',
  'Metal Shard A',
  'Twisted steel plate fragment',
  '{"parent": "elem_def_cosmic_titan_debris", "slot": "metal_shard", "variant": 1, "svg": "<path d=\"M-2 -15 L3 -12 L5 -5 L2 0 L6 8 L1 12 L-3 5 L-5 -3 Z\" fill=\"#778899\" opacity=\"0.8\"/>", "z_index": 2}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_cosmic_titan_debris_metal_shard_2',
  'bg_component',
  'Metal Shard B',
  'Curved hull plating, bent and scorched',
  '{"parent": "elem_def_cosmic_titan_debris", "slot": "metal_shard", "variant": 2, "svg": "<path d=\"M-4 -10 Q2 -14 6 -8 L8 -2 Q4 2 6 8 L0 6 Q-2 2 -6 4 L-4 -10 Z\" fill=\"#778899\" opacity=\"0.75\"/>", "z_index": 2}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_cosmic_titan_debris_metal_shard_3',
  'bg_component',
  'Metal Shard C',
  'Narrow spike of torn metal',
  '{"parent": "elem_def_cosmic_titan_debris", "slot": "metal_shard", "variant": 3, "svg": "<path d=\"M0 -18 L2 -10 L4 -4 L1 6 L-1 6 L-4 -4 L-2 -10 Z\" fill=\"#778899\" opacity=\"0.7\"/>", "z_index": 2}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- spark_trail slots (2 variants) — stroke-based
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_cosmic_titan_debris_spark_trail_1',
  'bg_component',
  'Spark Trail A',
  'Arcing spark line from sheared metal',
  '{"parent": "elem_def_cosmic_titan_debris", "slot": "spark_trail", "variant": 1, "svg": "<path d=\"M-8 -4 Q-2 -10 4 -6 Q8 -2 6 4 Q4 8 10 6\" fill=\"none\" stroke=\"#FF8833\" stroke-width=\"1.5\" stroke-linecap=\"round\" opacity=\"0.9\"/>", "z_index": 3}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_cosmic_titan_debris_spark_trail_2',
  'bg_component',
  'Spark Trail B',
  'Short burst of sparks fanning outward',
  '{"parent": "elem_def_cosmic_titan_debris", "slot": "spark_trail", "variant": 2, "svg": "<path d=\"M0 0 L-6 -8 M0 0 L-2 -10 M0 0 L3 -9 M0 0 L7 -6\" fill=\"none\" stroke=\"#FF8833\" stroke-width=\"1\" stroke-linecap=\"round\" opacity=\"0.85\"/>", "z_index": 3}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 2. VOID MONOLITH
--    Towering void-black monoliths with sickly iridescence
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_void_monolith',
  'bg_element_def',
  'Void Monolith',
  'Towering void-black monoliths with sickly iridescence and creeping shadow smoke',
  '{"base_width": 20, "base_height": 70, "anchor": {"x": 0.5, "y": 1.0}, "palette": {"primary": "#110022", "secondary": "#88AACC", "accent": "#330044", "secondary_variance": 0.3}, "slots": ["monolith", "shimmer", "shadow_smoke"]}',
  '["cosmic", "battleground", "void", "monolith"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- monolith slots (3 variants)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_void_monolith_monolith_1',
  'bg_component',
  'Monolith A',
  'Tall rectangular obelisk, slightly tapered',
  '{"parent": "elem_def_void_monolith", "slot": "monolith", "variant": 1, "svg": "<path d=\"M-8 0 L-6 -60 L0 -68 L6 -60 L8 0 Z\" fill=\"#110022\" opacity=\"0.95\"/>", "z_index": 1}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_void_monolith_monolith_2',
  'bg_component',
  'Monolith B',
  'Broken spire with jagged top',
  '{"parent": "elem_def_void_monolith", "slot": "monolith", "variant": 2, "svg": "<path d=\"M-7 0 L-5 -50 L-2 -58 L2 -62 L6 -48 L7 0 Z\" fill=\"#110022\" opacity=\"0.9\"/>", "z_index": 1}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_void_monolith_monolith_3',
  'bg_component',
  'Monolith C',
  'Leaning slab, cracked through the middle',
  '{"parent": "elem_def_void_monolith", "slot": "monolith", "variant": 3, "svg": "<path d=\"M-9 0 L-7 -45 L-3 -55 L1 -65 L5 -55 L9 -40 L10 0 Z\" fill=\"#110022\" opacity=\"0.92\"/>", "z_index": 1}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- shimmer slots (2 variants) — stroke-based iridescence
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_void_monolith_shimmer_1',
  'bg_component',
  'Shimmer A',
  'Vertical iridescent streak along monolith face',
  '{"parent": "elem_def_void_monolith", "slot": "shimmer", "variant": 1, "svg": "<path d=\"M-2 -10 Q0 -35 1 -55 Q2 -60 0 -65\" fill=\"none\" stroke=\"#88AACC\" stroke-width=\"1.2\" opacity=\"0.4\"/>", "z_index": 2}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_void_monolith_shimmer_2',
  'bg_component',
  'Shimmer B',
  'Diagonal iridescent vein across surface',
  '{"parent": "elem_def_void_monolith", "slot": "shimmer", "variant": 2, "svg": "<path d=\"M-5 -8 Q-1 -25 3 -40 Q5 -50 2 -58\" fill=\"none\" stroke=\"#88AACC\" stroke-width=\"1\" opacity=\"0.35\"/>", "z_index": 2}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- shadow_smoke slots (2 variants) — stroke-based wisps
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_void_monolith_shadow_smoke_1',
  'bg_component',
  'Shadow Smoke A',
  'Curling shadow wisps rising from base',
  '{"parent": "elem_def_void_monolith", "slot": "shadow_smoke", "variant": 1, "svg": "<path d=\"M-6 0 Q-10 -8 -4 -14 Q2 -20 -2 -26 Q-6 -30 -3 -36\" fill=\"none\" stroke=\"#330044\" stroke-width=\"2\" stroke-linecap=\"round\" opacity=\"0.5\"/>", "z_index": 0}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_void_monolith_shadow_smoke_2',
  'bg_component',
  'Shadow Smoke B',
  'Thin tendril coiling around monolith',
  '{"parent": "elem_def_void_monolith", "slot": "shadow_smoke", "variant": 2, "svg": "<path d=\"M4 -2 Q8 -10 2 -18 Q-4 -24 3 -30 Q8 -36 5 -42\" fill=\"none\" stroke=\"#330044\" stroke-width=\"1.5\" stroke-linecap=\"round\" opacity=\"0.45\"/>", "z_index": 0}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 3. SMOLDERING RUIN
--    Charred remains of structures
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_smoldering_ruin',
  'bg_element_def',
  'Smoldering Ruin',
  'Charred remains of structures still glowing with embers and drifting ash',
  '{"base_width": 40, "base_height": 30, "anchor": {"x": 0.5, "y": 1.0}, "palette": {"primary": "#332211", "secondary": "#FF6633", "accent": "#888888"}, "slots": ["ruin", "ember", "ash"]}',
  '["cosmic", "battleground", "ruin", "fire"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ruin slots (3 variants)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_smoldering_ruin_ruin_1',
  'bg_component',
  'Ruin A',
  'Collapsed wall section with jutting beams',
  '{"parent": "elem_def_smoldering_ruin", "slot": "ruin", "variant": 1, "svg": "<path d=\"M-18 0 L-16 -12 L-10 -20 L-4 -16 L0 -24 L6 -18 L12 -22 L16 -10 L18 0 Z\" fill=\"#332211\" opacity=\"0.9\"/>", "z_index": 1}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_smoldering_ruin_ruin_2',
  'bg_component',
  'Ruin B',
  'Toppled pillar and rubble pile',
  '{"parent": "elem_def_smoldering_ruin", "slot": "ruin", "variant": 2, "svg": "<path d=\"M-15 0 L-12 -8 L-6 -14 L-2 -10 L4 -18 L10 -12 L14 -6 L16 0 Z\" fill=\"#332211\" opacity=\"0.85\"/>", "z_index": 1}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_smoldering_ruin_ruin_3',
  'bg_component',
  'Ruin C',
  'Heap of charred stone blocks',
  '{"parent": "elem_def_smoldering_ruin", "slot": "ruin", "variant": 3, "svg": "<path d=\"M-14 0 L-12 -6 L-8 -4 L-6 -10 L-2 -8 L2 -14 L8 -10 L12 -8 L14 0 Z\" fill=\"#332211\" opacity=\"0.88\"/>", "z_index": 1}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ember slots (3 variants) — stroke-based glowing particles
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_smoldering_ruin_ember_1',
  'bg_component',
  'Ember A',
  'Cluster of floating ember dots rising upward',
  '{"parent": "elem_def_smoldering_ruin", "slot": "ember", "variant": 1, "svg": "<circle cx=\"-4\" cy=\"-18\" r=\"1\" fill=\"#FF6633\" opacity=\"0.9\"/><circle cx=\"2\" cy=\"-22\" r=\"0.8\" fill=\"#FF6633\" opacity=\"0.7\"/><circle cx=\"-1\" cy=\"-26\" r=\"0.6\" fill=\"#FF6633\" opacity=\"0.5\"/>", "z_index": 3}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_smoldering_ruin_ember_2',
  'bg_component',
  'Ember B',
  'Drifting ember trail curving left',
  '{"parent": "elem_def_smoldering_ruin", "slot": "ember", "variant": 2, "svg": "<path d=\"M4 -14 Q0 -18 -3 -22 Q-6 -26 -8 -28\" fill=\"none\" stroke=\"#FF6633\" stroke-width=\"1\" stroke-dasharray=\"2 3\" stroke-linecap=\"round\" opacity=\"0.8\"/>", "z_index": 3}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_smoldering_ruin_ember_3',
  'bg_component',
  'Ember C',
  'Bright glow at ruin core',
  '{"parent": "elem_def_smoldering_ruin", "slot": "ember", "variant": 3, "svg": "<ellipse cx=\"0\" cy=\"-8\" rx=\"6\" ry=\"3\" fill=\"#FF6633\" opacity=\"0.35\"/><ellipse cx=\"0\" cy=\"-8\" rx=\"3\" ry=\"1.5\" fill=\"#FF6633\" opacity=\"0.6\"/>", "z_index": 2}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ash slots (2 variants) — stroke-based drifting particles
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_smoldering_ruin_ash_1',
  'bg_component',
  'Ash Drift A',
  'Scattered ash flakes drifting right',
  '{"parent": "elem_def_smoldering_ruin", "slot": "ash", "variant": 1, "svg": "<path d=\"M-6 -16 Q-4 -20 -1 -18 M2 -20 Q5 -24 7 -22 M-3 -24 Q0 -28 2 -26\" fill=\"none\" stroke=\"#888888\" stroke-width=\"0.8\" stroke-linecap=\"round\" opacity=\"0.5\"/>", "z_index": 4}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_smoldering_ruin_ash_2',
  'bg_component',
  'Ash Drift B',
  'Dense ash cloud low to the ground',
  '{"parent": "elem_def_smoldering_ruin", "slot": "ash", "variant": 2, "svg": "<ellipse cx=\"-4\" cy=\"-4\" rx=\"10\" ry=\"3\" fill=\"#888888\" opacity=\"0.2\"/><ellipse cx=\"6\" cy=\"-6\" rx=\"8\" ry=\"2\" fill=\"#888888\" opacity=\"0.15\"/>", "z_index": 0}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- ============================================================================
-- 4. BATTLE SCAR
--    Scorch marks and impact craters on the ground
-- ============================================================================

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_def_battle_scar',
  'bg_element_def',
  'Battle Scar',
  'Scorch marks and impact craters seared into the ground from cosmic warfare',
  '{"base_width": 30, "base_height": 15, "anchor": {"x": 0.5, "y": 0.5}, "palette": {"primary": "#221100", "secondary": "#111100", "accent": "#FF4400"}, "slots": ["crater", "scorch", "glow"]}',
  '["cosmic", "battleground", "ground", "scar"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- crater slots (3 variants)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_battle_scar_crater_1',
  'bg_component',
  'Crater A',
  'Round impact crater with raised rim',
  '{"parent": "elem_def_battle_scar", "slot": "crater", "variant": 1, "svg": "<ellipse cx=\"0\" cy=\"0\" rx=\"12\" ry=\"6\" fill=\"#221100\" opacity=\"0.8\"/><ellipse cx=\"0\" cy=\"0\" rx=\"8\" ry=\"4\" fill=\"#1A0D00\" opacity=\"0.9\"/>", "z_index": 1}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_battle_scar_crater_2',
  'bg_component',
  'Crater B',
  'Oblong gouge from a glancing blow',
  '{"parent": "elem_def_battle_scar", "slot": "crater", "variant": 2, "svg": "<path d=\"M-14 -2 Q-8 -6 0 -4 Q8 -2 14 -4 Q12 2 4 4 Q-4 6 -10 3 Z\" fill=\"#221100\" opacity=\"0.75\"/>", "z_index": 1}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_battle_scar_crater_3',
  'bg_component',
  'Crater C',
  'Cluster of small pockmarks',
  '{"parent": "elem_def_battle_scar", "slot": "crater", "variant": 3, "svg": "<ellipse cx=\"-6\" cy=\"-1\" rx=\"4\" ry=\"2\" fill=\"#221100\" opacity=\"0.7\"/><ellipse cx=\"3\" cy=\"1\" rx=\"5\" ry=\"2.5\" fill=\"#221100\" opacity=\"0.75\"/><ellipse cx=\"8\" cy=\"-2\" rx=\"3\" ry=\"1.5\" fill=\"#221100\" opacity=\"0.65\"/>", "z_index": 1}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- scorch slots (2 variants)
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_battle_scar_scorch_1',
  'bg_component',
  'Scorch Mark A',
  'Radiating burn lines from crater center',
  '{"parent": "elem_def_battle_scar", "slot": "scorch", "variant": 1, "svg": "<path d=\"M0 0 L-10 -4 M0 0 L-8 5 M0 0 L12 -2 M0 0 L6 6 M0 0 L-3 -7\" fill=\"none\" stroke=\"#111100\" stroke-width=\"1.5\" stroke-linecap=\"round\" opacity=\"0.6\"/>", "z_index": 0}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_battle_scar_scorch_2',
  'bg_component',
  'Scorch Mark B',
  'Directional blast pattern sweeping right',
  '{"parent": "elem_def_battle_scar", "slot": "scorch", "variant": 2, "svg": "<path d=\"M-12 0 Q-4 -3 4 -1 Q10 1 14 -2 M-10 2 Q-2 0 6 2 Q12 4 15 1\" fill=\"none\" stroke=\"#111100\" stroke-width=\"1.2\" stroke-linecap=\"round\" opacity=\"0.55\"/>", "z_index": 0}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

-- glow slots (2 variants) — stroke-based heat glow
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_battle_scar_glow_1',
  'bg_component',
  'Heat Glow A',
  'Faint orange glow at crater rim',
  '{"parent": "elem_def_battle_scar", "slot": "glow", "variant": 1, "svg": "<ellipse cx=\"0\" cy=\"0\" rx=\"10\" ry=\"5\" fill=\"#FF4400\" opacity=\"0.15\"/><ellipse cx=\"0\" cy=\"0\" rx=\"6\" ry=\"3\" fill=\"#FF4400\" opacity=\"0.25\"/>", "z_index": 2}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES (
  'elem_battle_scar_glow_2',
  'bg_component',
  'Heat Glow B',
  'Pulsing heat line along the deepest gouge',
  '{"parent": "elem_def_battle_scar", "slot": "glow", "variant": 2, "svg": "<path d=\"M-8 0 Q-2 -2 4 0 Q8 2 12 0\" fill=\"none\" stroke=\"#FF4400\" stroke-width=\"1.8\" stroke-linecap=\"round\" opacity=\"0.3\"/>", "z_index": 2}',
  '["cosmic", "battleground"]',
  'system'
) ON CONFLICT (asset_key) DO NOTHING;

COMMIT;
