-- 061: Update background asset definitions with more visually distinct colors
-- The original definitions used extremely dark colors (#050510, #0a0a1a) that were
-- nearly indistinguishable from the Pixi Application background (#080810).
-- These updates use brighter gradients and more visible elements while maintaining
-- the chapter-specific color themes.

-- Chapter 1: Dark Industrial — warmer charcoal with visible stars/nebula
UPDATE asset_registry SET render_definition = '{
  "version": 2, "layer": "far", "scroll_factor": 0.1, "width": 512, "height": 150, "seamless": true,
  "gradient": {
    "type": "linear", "direction": "vertical",
    "stops": [{"offset": 0.0, "color": "#0c0c20"}, {"offset": 0.4, "color": "#141428"}, {"offset": 1.0, "color": "#101020"}]
  },
  "elements": [
    {"type": "stars", "count": 35, "min_radius": 0.5, "max_radius": 2.0, "color": "#ffffff55", "twinkle": true, "seed": 101},
    {"type": "nebula", "x": 300, "y": 40, "radius": 80, "color": "#2a1a4530"}
  ]
}'::jsonb, updated_at = NOW()
WHERE asset_key = 'bg_ch1_far';

UPDATE asset_registry SET render_definition = '{
  "version": 2, "layer": "mid", "scroll_factor": 0.5, "width": 512, "height": 150, "seamless": true,
  "gradient": {
    "type": "linear", "direction": "vertical",
    "stops": [{"offset": 0.0, "color": "#00000000"}, {"offset": 0.5, "color": "#10102000"}, {"offset": 0.75, "color": "#181830cc"}, {"offset": 1.0, "color": "#181830"}]
  },
  "elements": [
    {"type": "building", "x": 50, "width": 40, "height": 80, "color": "#141425"},
    {"type": "building", "x": 150, "width": 60, "height": 100, "color": "#111120"},
    {"type": "building", "x": 280, "width": 35, "height": 70, "color": "#161630"},
    {"type": "building", "x": 400, "width": 50, "height": 90, "color": "#131322"},
    {"type": "pipe", "x1": 90, "y1": 60, "x2": 150, "y2": 50, "color": "#252545", "width": 3}
  ]
}'::jsonb, updated_at = NOW()
WHERE asset_key = 'bg_ch1_mid';

-- Chapter 2: Deep Blue — teal-blue industrial
UPDATE asset_registry SET render_definition = '{
  "version": 2, "layer": "far", "scroll_factor": 0.1, "width": 512, "height": 150, "seamless": true,
  "gradient": {
    "type": "linear", "direction": "vertical",
    "stops": [{"offset": 0.0, "color": "#0e2040"}, {"offset": 0.4, "color": "#153050"}, {"offset": 1.0, "color": "#1a3555"}]
  },
  "elements": [
    {"type": "stars", "count": 22, "min_radius": 0.5, "max_radius": 1.5, "color": "#aaddff55", "twinkle": true, "seed": 201},
    {"type": "nebula", "x": 200, "y": 50, "radius": 90, "color": "#2a558030"}
  ]
}'::jsonb, updated_at = NOW()
WHERE asset_key = 'bg_ch2_far';

UPDATE asset_registry SET render_definition = '{
  "version": 2, "layer": "mid", "scroll_factor": 0.5, "width": 512, "height": 150, "seamless": true,
  "gradient": {
    "type": "linear", "direction": "vertical",
    "stops": [{"offset": 0.0, "color": "#00000000"}, {"offset": 0.5, "color": "#0e204000"}, {"offset": 0.75, "color": "#153050cc"}, {"offset": 1.0, "color": "#1a3555"}]
  },
  "elements": [
    {"type": "building", "x": 40, "width": 50, "height": 85, "color": "#122a42"},
    {"type": "building", "x": 180, "width": 45, "height": 95, "color": "#0e2035"},
    {"type": "building", "x": 320, "width": 55, "height": 75, "color": "#102538"},
    {"type": "pipe", "x1": 40, "x2": 180, "y1": 55, "y2": 45, "color": "#2a4560", "width": 4},
    {"type": "pipe", "x1": 180, "x2": 320, "y1": 45, "y2": 55, "color": "#2a4560", "width": 3},
    {"type": "pipe", "x1": 320, "x2": 450, "y1": 70, "y2": 60, "color": "#203850", "width": 3}
  ]
}'::jsonb, updated_at = NOW()
WHERE asset_key = 'bg_ch2_mid';

-- Chapter 3: Purple Crystalline — violet nebula swirls
UPDATE asset_registry SET render_definition = '{
  "version": 2, "layer": "far", "scroll_factor": 0.1, "width": 512, "height": 150, "seamless": true,
  "gradient": {
    "type": "linear", "direction": "vertical",
    "stops": [{"offset": 0.0, "color": "#251545"}, {"offset": 0.4, "color": "#2a1a50"}, {"offset": 1.0, "color": "#352060"}]
  },
  "elements": [
    {"type": "stars", "count": 35, "min_radius": 0.5, "max_radius": 2.0, "color": "#ddaaff55", "twinkle": true, "seed": 301},
    {"type": "nebula", "x": 150, "y": 35, "radius": 100, "color": "#5530803a"},
    {"type": "nebula", "x": 380, "y": 60, "radius": 60, "color": "#4020702a"}
  ]
}'::jsonb, updated_at = NOW()
WHERE asset_key = 'bg_ch3_far';

UPDATE asset_registry SET render_definition = '{
  "version": 2, "layer": "mid", "scroll_factor": 0.5, "width": 512, "height": 150, "seamless": true,
  "gradient": {
    "type": "linear", "direction": "vertical",
    "stops": [{"offset": 0.0, "color": "#00000000"}, {"offset": 0.5, "color": "#25154500"}, {"offset": 0.75, "color": "#2a1a50cc"}, {"offset": 1.0, "color": "#352060"}]
  },
  "elements": [
    {"type": "building", "x": 60, "width": 20, "height": 100, "color": "#281548"},
    {"type": "building", "x": 130, "width": 15, "height": 80, "color": "#301a55"},
    {"type": "building", "x": 250, "width": 25, "height": 110, "color": "#241242"},
    {"type": "building", "x": 370, "width": 18, "height": 70, "color": "#2c1850"},
    {"type": "building", "x": 440, "width": 22, "height": 90, "color": "#281548"}
  ]
}'::jsonb, updated_at = NOW()
WHERE asset_key = 'bg_ch3_mid';

-- Chapter 4: Volcanic Red — deep crimson with ember glow
UPDATE asset_registry SET render_definition = '{
  "version": 2, "layer": "far", "scroll_factor": 0.1, "width": 512, "height": 150, "seamless": true,
  "gradient": {
    "type": "linear", "direction": "vertical",
    "stops": [{"offset": 0.0, "color": "#3a1212"}, {"offset": 0.4, "color": "#451818"}, {"offset": 1.0, "color": "#502020"}]
  },
  "elements": [
    {"type": "stars", "count": 15, "min_radius": 0.5, "max_radius": 1.2, "color": "#ff885555", "twinkle": true, "seed": 401},
    {"type": "nebula", "x": 250, "y": 45, "radius": 80, "color": "#7a2a2a35"},
    {"type": "nebula", "x": 420, "y": 30, "radius": 50, "color": "#6a1a1a28"}
  ]
}'::jsonb, updated_at = NOW()
WHERE asset_key = 'bg_ch4_far';

UPDATE asset_registry SET render_definition = '{
  "version": 2, "layer": "mid", "scroll_factor": 0.5, "width": 512, "height": 150, "seamless": true,
  "gradient": {
    "type": "linear", "direction": "vertical",
    "stops": [{"offset": 0.0, "color": "#00000000"}, {"offset": 0.5, "color": "#3a121200"}, {"offset": 0.75, "color": "#451818cc"}, {"offset": 1.0, "color": "#502020"}]
  },
  "elements": [
    {"type": "building", "x": 30, "width": 55, "height": 90, "color": "#3a1010"},
    {"type": "building", "x": 160, "width": 40, "height": 105, "color": "#350c0c"},
    {"type": "building", "x": 290, "width": 60, "height": 80, "color": "#3c1212"},
    {"type": "building", "x": 420, "width": 45, "height": 95, "color": "#3a1010"},
    {"type": "pipe", "x1": 85, "x2": 160, "y1": 50, "y2": 40, "color": "#552a2a", "width": 4},
    {"type": "pipe", "x1": 290, "x2": 420, "y1": 60, "y2": 50, "color": "#4a2020", "width": 3}
  ]
}'::jsonb, updated_at = NOW()
WHERE asset_key = 'bg_ch4_mid';
