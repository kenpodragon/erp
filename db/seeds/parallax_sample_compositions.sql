-- Sample Background Compositions for 3 chapters (end-to-end validation)
-- Chapter 1 (Book 1 — sci-fi dystopia), Chapter 91 (Book 2 — high school), Chapter 114 (Book 3 — reality degradation)

BEGIN;

-- ============================================================
-- Chapter 1: Sci-fi Dystopia — dark cityscape with neon
-- ============================================================

-- Far layer: dark sky with clouds
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('bg_ch1_far', 'background', 'Ch1 Far Layer', 'Chapter 1 far background — dark sky with clouds.',
  '{"version": 2, "gradient": {"type": "linear", "direction": "vertical", "stops": [{"offset": 0, "color": "#050510"}, {"offset": 0.6, "color": "#0a0a2a"}, {"offset": 1, "color": "#111133"}]}, "seed": 1001, "elements": [{"element_type": "cloud", "count": 4, "y_range": [0.1, 0.4], "size_range": [0.8, 1.5], "x_spacing": "random", "opacity": 0.3}, {"element_type": "moon", "count": 1, "y_range": [0.05, 0.15], "size_range": [1.0, 1.2], "x_spacing": "random", "opacity": 0.6}]}',
  '["book1", "sci-fi", "sample"]', 'system')
ON CONFLICT (asset_key) DO UPDATE SET render_definition = EXCLUDED.render_definition;

-- Mid layer: city silhouette with streetlights
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('bg_ch1_mid', 'background', 'Ch1 Mid Layer', 'Chapter 1 mid background — city silhouette.',
  '{"version": 2, "gradient": {"type": "linear", "direction": "vertical", "stops": [{"offset": 0, "color": "#0a0a1a00"}, {"offset": 0.5, "color": "#0a0a1a44"}, {"offset": 1, "color": "#111122"}]}, "seed": 1002, "elements": [{"element_type": "corporate_tower", "count": 3, "y_range": [0.3, 0.7], "size_range": [0.6, 1.0], "x_spacing": "even", "opacity": 0.7}, {"element_type": "streetlight", "count": 5, "y_range": [0.7, 0.95], "size_range": [0.5, 0.8], "x_spacing": "even", "opacity": 0.8}]}',
  '["book1", "sci-fi", "sample"]', 'system')
ON CONFLICT (asset_key) DO UPDATE SET render_definition = EXCLUDED.render_definition;

-- Near layer: ground details with debris and vehicles
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('bg_ch1_near', 'background', 'Ch1 Near Layer', 'Chapter 1 near background — ground debris.',
  '{"version": 2, "gradient": {"type": "linear", "direction": "vertical", "stops": [{"offset": 0, "color": "#00000000"}, {"offset": 0.7, "color": "#0d0d1a88"}, {"offset": 1, "color": "#0d0d1a"}]}, "seed": 1003, "elements": [{"element_type": "debris", "count": 6, "y_range": [0.85, 0.98], "size_range": [0.4, 0.8], "x_spacing": "random", "opacity": 0.7}, {"element_type": "vehicle", "count": 2, "y_range": [0.8, 0.95], "size_range": [0.5, 0.7], "x_spacing": "even", "opacity": 0.6}, {"element_type": "rock", "count": 4, "y_range": [0.9, 0.99], "size_range": [0.3, 0.6], "x_spacing": "random", "opacity": 0.5}]}',
  '["book1", "sci-fi", "sample"]', 'system')
ON CONFLICT (asset_key) DO UPDATE SET render_definition = EXCLUDED.render_definition;

-- Boss layer: intense version with more elements
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('bg_ch1_boss', 'background', 'Ch1 Boss Layer', 'Chapter 1 boss background — intense cityscape.',
  '{"version": 2, "gradient": {"type": "linear", "direction": "vertical", "stops": [{"offset": 0, "color": "#100005"}, {"offset": 0.5, "color": "#1a0010"}, {"offset": 1, "color": "#220015"}]}, "seed": 1004, "elements": [{"element_type": "corporate_tower", "count": 5, "y_range": [0.2, 0.6], "size_range": [0.5, 0.9], "x_spacing": "even", "opacity": 0.5}, {"element_type": "debris", "count": 8, "y_range": [0.8, 0.98], "size_range": [0.3, 0.7], "x_spacing": "random", "opacity": 0.4}]}',
  '["book1", "sci-fi", "boss", "sample"]', 'system')
ON CONFLICT (asset_key) DO UPDATE SET render_definition = EXCLUDED.render_definition;

-- ============================================================
-- Chapter 91: Book 2 — 90s Florida high school
-- ============================================================

-- Far layer: warm sunset sky
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('bg_ch91_far', 'background', 'Ch91 Far Layer', 'Chapter 91 far background — warm Florida sky.',
  '{"version": 2, "gradient": {"type": "linear", "direction": "vertical", "stops": [{"offset": 0, "color": "#1a1040"}, {"offset": 0.4, "color": "#332255"}, {"offset": 0.7, "color": "#553344"}, {"offset": 1, "color": "#664433"}]}, "seed": 9101, "elements": [{"element_type": "cloud", "count": 3, "y_range": [0.05, 0.3], "size_range": [1.0, 2.0], "x_spacing": "random", "opacity": 0.4}]}',
  '["book2", "florida", "sample"]', 'system')
ON CONFLICT (asset_key) DO UPDATE SET render_definition = EXCLUDED.render_definition;

-- Mid layer: school buildings and flagpole
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('bg_ch91_mid', 'background', 'Ch91 Mid Layer', 'Chapter 91 mid background — school grounds.',
  '{"version": 2, "gradient": {"type": "linear", "direction": "vertical", "stops": [{"offset": 0, "color": "#00000000"}, {"offset": 0.6, "color": "#1a1a2a44"}, {"offset": 1, "color": "#1a1a2a"}]}, "seed": 9102, "elements": [{"element_type": "suburban_house", "count": 2, "y_range": [0.4, 0.7], "size_range": [0.6, 0.9], "x_spacing": "even", "opacity": 0.7}, {"element_type": "flagpole", "count": 1, "y_range": [0.3, 0.5], "size_range": [0.7, 0.9], "x_spacing": "random", "opacity": 0.8}, {"element_type": "fence", "count": 3, "y_range": [0.7, 0.85], "size_range": [0.5, 0.7], "x_spacing": "even", "opacity": 0.6}]}',
  '["book2", "florida", "sample"]', 'system')
ON CONFLICT (asset_key) DO UPDATE SET render_definition = EXCLUDED.render_definition;

-- Near layer: ground details
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('bg_ch91_near', 'background', 'Ch91 Near Layer', 'Chapter 91 near background — parking lot details.',
  '{"version": 2, "gradient": {"type": "linear", "direction": "vertical", "stops": [{"offset": 0, "color": "#00000000"}, {"offset": 0.8, "color": "#15152044"}, {"offset": 1, "color": "#151520"}]}, "seed": 9103, "elements": [{"element_type": "parking_meter", "count": 3, "y_range": [0.8, 0.95], "size_range": [0.4, 0.6], "x_spacing": "even", "opacity": 0.7}, {"element_type": "puddle", "count": 4, "y_range": [0.9, 0.98], "size_range": [0.5, 0.8], "x_spacing": "random", "opacity": 0.4}, {"element_type": "rock", "count": 3, "y_range": [0.92, 0.99], "size_range": [0.3, 0.5], "x_spacing": "random", "opacity": 0.5}]}',
  '["book2", "florida", "sample"]', 'system')
ON CONFLICT (asset_key) DO UPDATE SET render_definition = EXCLUDED.render_definition;

-- Boss layer
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('bg_ch91_boss', 'background', 'Ch91 Boss Layer', 'Chapter 91 boss background — dark school.',
  '{"version": 2, "gradient": {"type": "linear", "direction": "vertical", "stops": [{"offset": 0, "color": "#0a0515"}, {"offset": 0.5, "color": "#150a20"}, {"offset": 1, "color": "#1a1025"}]}, "seed": 9104, "elements": [{"element_type": "suburban_house", "count": 3, "y_range": [0.3, 0.6], "size_range": [0.5, 0.8], "x_spacing": "even", "opacity": 0.4}, {"element_type": "streetlight", "count": 4, "y_range": [0.6, 0.9], "size_range": [0.4, 0.7], "x_spacing": "even", "opacity": 0.5}]}',
  '["book2", "florida", "boss", "sample"]', 'system')
ON CONFLICT (asset_key) DO UPDATE SET render_definition = EXCLUDED.render_definition;

-- ============================================================
-- Chapter 114: Book 3 — Reality degradation / cosmic horror
-- ============================================================

-- Far layer: cosmic void
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('bg_ch114_far', 'background', 'Ch114 Far Layer', 'Chapter 114 far background — cosmic void.',
  '{"version": 2, "gradient": {"type": "linear", "direction": "vertical", "stops": [{"offset": 0, "color": "#050005"}, {"offset": 0.3, "color": "#110022"}, {"offset": 0.7, "color": "#0a0030"}, {"offset": 1, "color": "#050015"}]}, "seed": 11401, "elements": [{"element_type": "cosmic_eye", "count": 2, "y_range": [0.1, 0.4], "size_range": [0.6, 1.0], "x_spacing": "random", "opacity": 0.3}, {"element_type": "void_crack", "count": 3, "y_range": [0.1, 0.8], "size_range": [0.5, 1.0], "x_spacing": "random", "opacity": 0.4}]}',
  '["book3", "cosmic", "sample"]', 'system')
ON CONFLICT (asset_key) DO UPDATE SET render_definition = EXCLUDED.render_definition;

-- Mid layer: fractured reality
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('bg_ch114_mid', 'background', 'Ch114 Mid Layer', 'Chapter 114 mid background — fractured reality.',
  '{"version": 2, "gradient": {"type": "linear", "direction": "vertical", "stops": [{"offset": 0, "color": "#00000000"}, {"offset": 0.5, "color": "#0a001544"}, {"offset": 1, "color": "#0a0015"}]}, "seed": 11402, "elements": [{"element_type": "glitch_artifact", "count": 4, "y_range": [0.2, 0.7], "size_range": [0.4, 0.8], "x_spacing": "random", "opacity": 0.5}, {"element_type": "fracture_line", "count": 3, "y_range": [0.3, 0.8], "size_range": [0.6, 1.2], "x_spacing": "random", "opacity": 0.6}, {"element_type": "dimensional_tear", "count": 1, "y_range": [0.2, 0.5], "size_range": [0.8, 1.0], "x_spacing": "random", "opacity": 0.4}]}',
  '["book3", "cosmic", "sample"]', 'system')
ON CONFLICT (asset_key) DO UPDATE SET render_definition = EXCLUDED.render_definition;

-- Near layer: entropy and void tendrils
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('bg_ch114_near', 'background', 'Ch114 Near Layer', 'Chapter 114 near background — entropy at ground.',
  '{"version": 2, "gradient": {"type": "linear", "direction": "vertical", "stops": [{"offset": 0, "color": "#00000000"}, {"offset": 0.7, "color": "#08001044"}, {"offset": 1, "color": "#080010"}]}, "seed": 11403, "elements": [{"element_type": "void_tendril", "count": 3, "y_range": [0.6, 0.95], "size_range": [0.5, 0.9], "x_spacing": "random", "opacity": 0.5}, {"element_type": "entropy_cluster", "count": 4, "y_range": [0.85, 0.98], "size_range": [0.4, 0.7], "x_spacing": "random", "opacity": 0.6}, {"element_type": "static_field", "count": 2, "y_range": [0.7, 0.9], "size_range": [0.5, 0.8], "x_spacing": "random", "opacity": 0.3}]}',
  '["book3", "cosmic", "sample"]', 'system')
ON CONFLICT (asset_key) DO UPDATE SET render_definition = EXCLUDED.render_definition;

-- Boss layer: intense cosmic horror
INSERT INTO asset_registry (asset_key, category, display_name, description, render_definition, tags, source)
VALUES ('bg_ch114_boss', 'background', 'Ch114 Boss Layer', 'Chapter 114 boss background — cosmic horror.',
  '{"version": 2, "gradient": {"type": "radial", "stops": [{"offset": 0, "color": "#1a0030"}, {"offset": 0.5, "color": "#0a0020"}, {"offset": 1, "color": "#050010"}]}, "seed": 11404, "elements": [{"element_type": "cosmic_eye", "count": 3, "y_range": [0.1, 0.5], "size_range": [0.4, 0.8], "x_spacing": "random", "opacity": 0.3}, {"element_type": "void_crack", "count": 5, "y_range": [0.1, 0.9], "size_range": [0.4, 0.9], "x_spacing": "random", "opacity": 0.35}, {"element_type": "void_tendril", "count": 4, "y_range": [0.5, 0.95], "size_range": [0.4, 0.8], "x_spacing": "random", "opacity": 0.3}]}',
  '["book3", "cosmic", "boss", "sample"]', 'system')
ON CONFLICT (asset_key) DO UPDATE SET render_definition = EXCLUDED.render_definition;

-- ============================================================
-- Wire up FK columns: backgrounds → asset_registry
-- ============================================================

-- Chapter 1 (background id=110)
UPDATE backgrounds SET
  far_asset_key = 'bg_ch1_far',
  mid_asset_key = 'bg_ch1_mid',
  near_asset_key = 'bg_ch1_near',
  boss_asset_key = 'bg_ch1_boss'
WHERE id = 110;

-- Chapter 91 (background id=53)
UPDATE backgrounds SET
  far_asset_key = 'bg_ch91_far',
  mid_asset_key = 'bg_ch91_mid',
  near_asset_key = 'bg_ch91_near',
  boss_asset_key = 'bg_ch91_boss'
WHERE id = 53;

-- Chapter 114 (background id=69)
UPDATE backgrounds SET
  far_asset_key = 'bg_ch114_far',
  mid_asset_key = 'bg_ch114_mid',
  near_asset_key = 'bg_ch114_near',
  boss_asset_key = 'bg_ch114_boss'
WHERE id = 69;

-- ============================================================
-- Wire up scenes.background_id for the 3 sample chapters
-- ============================================================

UPDATE scenes SET background_id = 110 WHERE chapter_id = 1;
UPDATE scenes SET background_id = 53 WHERE chapter_id = 91;
UPDATE scenes SET background_id = 69 WHERE chapter_id = 114;

COMMIT;
