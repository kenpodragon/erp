-- Default background layers with visible ground planes and better layer contrast.

BEGIN;

INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES
-- FAR: sky with visible gradient transition — dark top to slightly lighter horizon
('bg_default_far', 'background', 'Default Far Layer', 'Default far background.',
  '{"version": 2, "gradient": {"type": "linear", "direction": "vertical", "stops": [{"offset": 0, "color": "#040410"}, {"offset": 0.4, "color": "#08082a"}, {"offset": 0.7, "color": "#0c0c30"}, {"offset": 0.85, "color": "#121240"}, {"offset": 1, "color": "#181848"}]}, "seed": 7777, "elements": [{"element_type": "cloud", "count": 6, "y_range": [0.08, 0.5], "size_range": [3.0, 5.0], "x_spacing": "random", "opacity": 0.35}, {"element_type": "moon", "count": 1, "y_range": [0.08, 0.18], "size_range": [3.0, 4.0], "x_spacing": "random", "opacity": 0.6}, {"element_type": "haze_band", "count": 3, "y_range": [0.2, 0.7], "size_range": [4.0, 6.0], "x_spacing": "random", "opacity": 0.1}, {"element_type": "dust_mote", "count": 12, "y_range": [0.05, 0.7], "size_range": [1.5, 2.5], "x_spacing": "random", "opacity": 0.25}]}',
  '["default"]', 'system'),

-- MID: visible ground band at bottom — lighter ground color creates horizon
('bg_default_mid', 'background', 'Default Mid Layer', 'Default mid background.',
  '{"version": 2, "gradient": {"type": "linear", "direction": "vertical", "stops": [{"offset": 0, "color": "#00000000"}, {"offset": 0.6, "color": "#00000000"}, {"offset": 0.78, "color": "#0a0a1a33"}, {"offset": 0.88, "color": "#12122844"}, {"offset": 0.93, "color": "#1a1a3866"}, {"offset": 1, "color": "#1e1e40aa"}]}, "seed": 7778, "elements": [{"element_type": "corporate_tower", "count": 5, "y_range": [0.97, 1.0], "size_range": [4.0, 7.0], "x_spacing": "even", "opacity": 0.55}, {"element_type": "streetlight", "count": 6, "y_range": [0.97, 1.0], "size_range": [3.0, 5.0], "x_spacing": "even", "opacity": 0.7}, {"element_type": "power_line", "count": 3, "y_range": [0.95, 1.0], "size_range": [3.5, 5.0], "x_spacing": "even", "opacity": 0.4}, {"element_type": "fog_bank", "count": 3, "y_range": [0.5, 0.8], "size_range": [4.0, 6.0], "x_spacing": "random", "opacity": 0.12}]}',
  '["default"]', 'system'),

-- NEAR: visible ground plane — solid dark ground at bottom 10%
('bg_default_near', 'background', 'Default Near Layer', 'Default near background.',
  '{"version": 2, "gradient": {"type": "linear", "direction": "vertical", "stops": [{"offset": 0, "color": "#00000000"}, {"offset": 0.75, "color": "#00000000"}, {"offset": 0.85, "color": "#0d0d1a22"}, {"offset": 0.92, "color": "#15153055"}, {"offset": 0.96, "color": "#1a1a3888"}, {"offset": 1, "color": "#1e1e40cc"}]}, "seed": 7779, "elements": [{"element_type": "fence", "count": 3, "y_range": [0.96, 1.0], "size_range": [3.5, 5.0], "x_spacing": "even", "opacity": 0.45}, {"element_type": "vehicle", "count": 2, "y_range": [0.97, 1.0], "size_range": [3.5, 5.0], "x_spacing": "random", "flip_chance": 0.5, "opacity": 0.5}, {"element_type": "dumpster", "count": 2, "y_range": [0.97, 1.0], "size_range": [3.0, 4.0], "x_spacing": "random", "opacity": 0.5}, {"element_type": "debris", "count": 8, "y_range": [0.96, 1.0], "size_range": [2.5, 4.0], "x_spacing": "random", "opacity": 0.55}, {"element_type": "rock", "count": 5, "y_range": [0.97, 1.0], "size_range": [2.5, 3.5], "x_spacing": "random", "opacity": 0.5}]}',
  '["default"]', 'system'),

-- BOSS: ominous atmosphere with ground fog
('bg_default_boss', 'background', 'Default Boss Layer', 'Default boss background.',
  '{"version": 2, "gradient": {"type": "radial", "stops": [{"offset": 0, "color": "#150010"}, {"offset": 0.5, "color": "#0a000a"}, {"offset": 1, "color": "#050005"}]}, "seed": 7780, "elements": [{"element_type": "fog_bank", "count": 4, "y_range": [0.4, 0.85], "size_range": [4.0, 6.0], "x_spacing": "random", "opacity": 0.2}, {"element_type": "debris", "count": 6, "y_range": [0.95, 1.0], "size_range": [2.5, 4.0], "x_spacing": "random", "opacity": 0.4}, {"element_type": "spark_cluster", "count": 5, "y_range": [0.3, 0.7], "size_range": [2.5, 3.5], "x_spacing": "random", "opacity": 0.3}, {"element_type": "light_shaft", "count": 2, "y_range": [0.1, 0.5], "size_range": [3.5, 5.5], "x_spacing": "random", "opacity": 0.15}]}',
  '["default"]', 'system')
ON CONFLICT (asset_key) DO UPDATE SET render_definition = EXCLUDED.render_definition;

COMMIT;
