-- =============================================================================
-- 003_sample_content_data.sql
-- Generic sample content data for a bare-minimum working server
-- 1-2 rows per content table with placeholder/generic values
-- For production: skip this and use content generators to populate from
-- your own source material (books, entities, audio, sprites, etc.)
-- =============================================================================

-- Disable triggers to handle circular FK constraints during seed load
SET session_replication_role = replica;

-- ============================================================
-- ATMOSPHERES (no FK deps)
-- ============================================================
-- Data for Name: atmospheres; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.atmospheres VALUES (1, 'Default Calm', 'default_calm', 'A neutral, ambient atmosphere for exploration', '{}', 100, 'C', 'major', 4, NULL, now(), now());
INSERT INTO public.atmospheres VALUES (2, 'Default Tension', 'default_tension', 'A tense atmosphere for combat encounters', '{}', 120, 'A', 'minor', 4, NULL, now(), now());

-- ============================================================
-- VISUAL BEHAVIORS (no FK deps)
-- ============================================================
-- Data for Name: visual_behaviors; Type: TABLE DATA; Schema: public; Owner: -

-- Cols: id, name, display_name, description, animation_config, sort_order, created_at, updated_at, stat_weights
INSERT INTO public.visual_behaviors VALUES (1, 'grounded_melee', 'Grounded Melee', 'Close-range ground-based combat', '{"y_offset": 0, "attack_vfx": "slash_arc", "idle_animation": "idle_bounce", "speed_modifier": 1.0, "attack_animation": "melee_swing", "movement_pattern": "walk"}', 1, now(), now(), NULL);
INSERT INTO public.visual_behaviors VALUES (2, 'ranged_flying', 'Ranged Flying', 'Airborne ranged attacker', '{"y_offset": -30, "attack_vfx": "projectile", "idle_animation": "hover", "speed_modifier": 1.2, "attack_animation": "ranged_cast", "movement_pattern": "fly"}', 2, now(), now(), NULL);

-- ============================================================
-- AUDIO CONFIGS (no FK deps)
-- ============================================================
-- Data for Name: audio_configs; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.audio_configs VALUES (1, 'sfx_click', 'combat', 'Player Click', '{"decay_ms": 30, "attack_ms": 2, "noise_mix": 0.05, "release_ms": 48, "duration_ms": 80, "frequency_end": 440, "sustain_level": 0.2, "frequency_start": 660, "oscillator_type": "square"}', 0.6, 0.08, true, now(), now());
INSERT INTO public.audio_configs VALUES (2, 'sfx_enemy_hit', 'combat', 'Enemy Hit', '{"decay_ms": 50, "attack_ms": 1, "noise_mix": 0.15, "release_ms": 60, "duration_ms": 100, "frequency_end": 200, "sustain_level": 0.3, "frequency_start": 400, "oscillator_type": "sawtooth"}', 0.5, 0.1, true, now(), now());

-- ============================================================
-- BACKGROUNDS (no FK deps)
-- ============================================================
-- Data for Name: backgrounds; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.backgrounds VALUES (1, 'bg_default', NULL, 'bg_default', '{}', NULL, NULL, NULL, now(), now());

-- ============================================================
-- BENEFIT EFFECT DATA (no FK deps)
-- ============================================================
-- Data for Name: benefit_effect_data; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.benefit_effect_data VALUES (1, 'click_damage_bonus', 'Click Damage Bonus', 'Increases the damage dealt per manual click.', 'percentage_add', NULL, NULL, 'combat', now(), now());
INSERT INTO public.benefit_effect_data VALUES (2, 'auto_dps_bonus', 'Auto DPS Bonus', 'Increases passive damage per second.', 'percentage_add', NULL, NULL, 'combat', now(), now());

-- ============================================================
-- WAVE PRESETS (no FK deps)
-- ============================================================
-- Data for Name: wave_presets; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.wave_presets VALUES (1, 'Standard', 'Default wave configuration', '{"wave_count": 10, "hp_multiplier": 1.0, "spawn_pattern": "uniform", "scaling_factor": 1.0, "gold_multiplier": 1.0, "spawn_interval_ms": 2000, "max_enemies_per_wave": 5}', true, 1, now(), now());

-- ============================================================
-- ENTITY FAMILIES (no FK deps)
-- ============================================================
-- Data for Name: entity_families; Type: TABLE DATA; Schema: public; Owner: -

-- Cols: id, name, display_name, description, icon_key, lore_reference, base_stat_template, sort_order, created_at, updated_at
INSERT INTO public.entity_families VALUES (1, 'Sample Family', 'sample_family', 'A generic entity family for testing', NULL, NULL, NULL, 0, now(), now());

-- ============================================================
-- BOOKS (depends on: atmospheres, difficulty_curves)
-- ============================================================
-- Data for Name: books; Type: TABLE DATA; Schema: public; Owner: -

-- Cols: id, book_number, title, source_file, created_at, updated_at, transition_lore_text, recommended_level, min_level, atmosphere_id, difficulty_curve_id
INSERT INTO public.books VALUES (1, 1, 'Sample Book One', 'sample_book_1.docx', now(), now(), 'The first volume concludes. What lies ahead is uncertain.', 1, 1, 1, NULL);

-- ============================================================
-- CHAPTERS (depends on: books, atmospheres)
-- ============================================================
-- Data for Name: chapters; Type: TABLE DATA; Schema: public; Owner: -

-- Cols: id, book_id, chapter_number, title, raw_text, sort_order, processing_status, created_at, updated_at, transition_lore_text, recommended_level, min_level, atmosphere_id
INSERT INTO public.chapters VALUES (1, 1, 1, 'Chapter 1: The Beginning', 'The story opens in a quiet town where something extraordinary is about to happen.', 1, 'complete', now(), now(), NULL, 1, 1, 1);
INSERT INTO public.chapters VALUES (2, 1, 2, 'Chapter 2: The Journey', 'The protagonist sets off on a path that will change everything.', 2, 'complete', now(), now(), NULL, 2, 1, 2);

-- ============================================================
-- LOCATIONS (depends on: atmospheres, scenes -- circular with scenes)
-- ============================================================
-- Data for Name: locations; Type: TABLE DATA; Schema: public; Owner: -

-- Cols: id, canonical_name, location_type, base_visual, base_auditory, base_olfactory, base_tactile, base_atmosphere, first_appearance_scene_id, ai_provider, ai_model_id, created_at, updated_at, archetype_id, description
INSERT INTO public.locations VALUES (1, 'Town Square', 'settlement', 'A bustling central plaza surrounded by shops and a fountain', NULL, NULL, NULL, 'Warm sunlight, cobblestones, the hum of daily life', NULL, 'system', 'sample', now(), now(), 1, 'The central hub of the starting town.');
INSERT INTO public.locations VALUES (2, 'Dark Forest', 'wilderness', 'A dense forest where shadows move between ancient trees', NULL, NULL, NULL, 'Damp earth, rustling leaves, distant howls', NULL, 'system', 'sample', now(), now(), 2, 'A dangerous woodland area for early encounters.');

-- ============================================================
-- SCENES (depends on: chapters, locations)
-- ============================================================
-- Data for Name: scenes; Type: TABLE DATA; Schema: public; Owner: -

-- Cols: id, chapter_id, scene_number, title, summary, raw_text, sort_order, primary_location_id, has_hard_break, created_at, updated_at, scene_type, boss_config
INSERT INTO public.scenes VALUES (1, 1, 1, 'Arrival at Town Square', 'The protagonist arrives at the town square and meets the first ally.', NULL, 1, 1, false, now(), now(), 'normal', NULL);
INSERT INTO public.scenes VALUES (2, 1, 2, 'Into the Dark Forest', 'The party ventures into the forest to face their first challenge.', NULL, 2, 2, false, now(), now(), 'normal', NULL);
INSERT INTO public.scenes VALUES (3, 2, 1, 'The Road Ahead', 'Setting out from town, the journey truly begins.', NULL, 1, 1, false, now(), now(), 'normal', NULL);
INSERT INTO public.scenes VALUES (4, 2, 2, 'Ambush at the Clearing', 'Enemies spring from the underbrush in a sudden attack.', NULL, 2, 2, false, now(), now(), 'normal', NULL);

-- ============================================================
-- ACHIEVEMENTS (self-referencing: parent_achievement_id -> achievements.id)
-- ============================================================
-- Data for Name: achievements; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.achievements VALUES (1, 'First Blood', 'Defeat your first enemy.', 'combat', 'achievement_default', 'cumulative', 'total_enemies_killed', 1.00, NULL, 1, 0, NULL, 0, true, now(), now());
INSERT INTO public.achievements VALUES (2, 'Adventurer', 'Complete your first scene.', 'discovery', 'achievement_default', 'cumulative', 'scenes_completed', 1.00, NULL, 1, 0, NULL, 1, true, now(), now());

-- ============================================================
-- TITLES (depends on: achievements)
-- ============================================================
-- Data for Name: titles; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.titles VALUES (1, 'the Brave', 'suffix', 1, now(), NULL);
INSERT INTO public.titles VALUES (2, 'Novice', 'prefix', 1, now(), 2);

-- ============================================================
-- CURATED ARTIFACTS (no FK deps to content tables)
-- ============================================================
-- Data for Name: curated_artifacts; Type: TABLE DATA; Schema: public; Owner: -

-- Cols: id, name, description, lore_text, icon_sprite_key, source_type, source_id, source_hint, base_drop_chance, synergy_set_id, is_active, created_at, updated_at
INSERT INTO public.curated_artifacts VALUES (1, 'Ancient Pendant', 'A weathered pendant that hums with latent power.', 'Found in the ruins of a forgotten civilization, this pendant resonates with whoever holds it.', 'artifact_default', 'boss', NULL, 'Drops from chapter bosses.', 0.01, NULL, true, now(), now());
INSERT INTO public.curated_artifacts VALUES (2, 'Iron Ward', 'A heavy iron sigil etched with protective runes.', 'Forged in the old style, this ward has protected many adventurers before you.', 'artifact_default', 'chapter', NULL, 'Found in hidden areas.', 0.01, NULL, true, now(), now());

-- ============================================================
-- CURATED ARTIFACT TIERS (depends on: curated_artifacts)
-- ============================================================
-- Data for Name: curated_artifact_tiers; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.curated_artifact_tiers VALUES (1, 1, 'common', '{"strength": 3, "vitality": 2}', NULL, 1.0000);
INSERT INTO public.curated_artifact_tiers VALUES (2, 1, 'rare', '{"strength": 8, "vitality": 5, "agility": 3}', NULL, 0.5000);
INSERT INTO public.curated_artifact_tiers VALUES (3, 2, 'common', '{"vitality": 5, "wisdom": 2}', NULL, 1.0000);
INSERT INTO public.curated_artifact_tiers VALUES (4, 2, 'rare', '{"vitality": 12, "wisdom": 6, "intelligence": 3}', NULL, 0.5000);

-- ============================================================
-- ENTITIES (depends on: entity_types, entity_families, scenes)
-- ============================================================
-- Data for Name: entities; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.entities VALUES (1, 'Test Entity Alpha', false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'system', 'sample', now(), now(), 1, 1);
INSERT INTO public.entities VALUES (2, 'Test Entity Beta', true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'system', 'sample', now(), now(), 2, 1);

-- ============================================================
-- ENTITY ALIASES (depends on: entities)
-- ============================================================
-- Data for Name: entity_aliases; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.entity_aliases VALUES (1, 1, 'Alpha', NULL);
INSERT INTO public.entity_aliases VALUES (2, 2, 'Beta', NULL);

-- ============================================================
-- ENTITY ATTACK TYPES (depends on: entities, attack_types)
-- ============================================================
-- Data for Name: entity_attack_types; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.entity_attack_types VALUES (1, 1, 1, true, now());
INSERT INTO public.entity_attack_types VALUES (2, 2, 1, true, now());

-- ============================================================
-- ENTITY GAMEPLAY DATA (depends on: entities, atmospheres)
-- ============================================================
-- Data for Name: entity_gameplay_data; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.entity_gameplay_data VALUES (1, 1, 'entity_default', 100, 10, 1, '{}', now(), now(), NULL, NULL);
INSERT INTO public.entity_gameplay_data VALUES (2, 2, 'entity_default', 500, 50, 3, '{}', now(), now(), NULL, NULL);

-- ============================================================
-- STORY BEATS (depends on: scenes, locations)
-- ============================================================
-- Data for Name: story_beats; Type: TABLE DATA; Schema: public; Owner: -

-- Cols: id, scene_id, beat_number, summary, raw_text, sort_order, location_id, intensity, pacing, timeline_context, created_at, updated_at, content_image_path, audio_path, audio_duration_seconds, hidden_lore_text, lore_intelligence_threshold
INSERT INTO public.story_beats VALUES (1, 1, 1, 'Introduction to the world', 'The sun hung low over the town square, casting long shadows across the cobblestones. A stranger walked through the gate, travel-worn and uncertain. This was the beginning of something no one could have predicted.', 1, 1, NULL, NULL, NULL, now(), now(), NULL, NULL, 0, NULL, NULL);
INSERT INTO public.story_beats VALUES (2, 2, 1, 'Entering the forest', 'The canopy closed overhead like a dark curtain. Every sound was amplified — the snap of a twig, the rustle of unseen creatures. The path narrowed ahead, and the air grew thick with the scent of damp moss.', 2, 2, NULL, NULL, NULL, now(), now(), NULL, NULL, 0, NULL, NULL);

-- ============================================================
-- ENTITY BEAT APPEARANCES (depends on: entities, story_beats)
-- ============================================================
-- Data for Name: entity_beat_appearances; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.entity_beat_appearances VALUES (1, 1, 1, 'ally', true, 'Present during the opening scene.', now());
INSERT INTO public.entity_beat_appearances VALUES (2, 2, 2, 'enemy', true, 'Lurking in the forest.', now());

-- ============================================================
-- ENTITY SCENE APPEARANCES (depends on: entities, scenes)
-- ============================================================
-- Data for Name: entity_scene_appearances; Type: TABLE DATA; Schema: public; Owner: -

-- Cols: id, entity_id, scene_id, role, is_present, description_delta, emotional_state_delta, equipment_delta, exit_reason, entry_context, relationships, ai_provider, ai_model_id, created_at, updated_at
INSERT INTO public.entity_scene_appearances VALUES (1, 1, 1, 'ally', true, NULL, 'First encounter in the town square.', NULL, NULL, NULL, NULL, 'system', 'sample', now(), now());
INSERT INTO public.entity_scene_appearances VALUES (2, 2, 2, 'enemy', true, NULL, 'Forest ambush encounter.', NULL, NULL, NULL, NULL, 'system', 'sample', now(), now());

-- ============================================================
-- LOCATION ALIASES (depends on: locations)
-- ============================================================
-- Data for Name: location_aliases; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.location_aliases VALUES (1, 1, 'The Square', NULL);
INSERT INTO public.location_aliases VALUES (2, 2, 'The Woods', NULL);

-- ============================================================
-- LOCATION SCENE APPEARANCES (depends on: locations, scenes)
-- ============================================================
-- Data for Name: location_scene_appearances; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.location_scene_appearances VALUES (1, 1, 1, NULL, NULL, NULL, NULL, NULL, 'system', 'sample', now(), now());
INSERT INTO public.location_scene_appearances VALUES (2, 2, 2, NULL, NULL, NULL, NULL, NULL, 'system', 'sample', now(), now());

-- ============================================================
-- SCENE GAMEPLAY DATA (depends on: scenes, atmospheres, backgrounds)
-- ============================================================
-- Data for Name: scene_gameplay_data; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.scene_gameplay_data VALUES (1, 1, 100, 1, false, NULL, NULL, NULL, NULL);
INSERT INTO public.scene_gameplay_data VALUES (2, 2, 200, 2, false, NULL, NULL, NULL, NULL);

-- ============================================================
-- SEMANTIC TAGS (depends on: story_beats)
-- ============================================================
-- Data for Name: semantic_tags; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.semantic_tags VALUES (1, 1, 'theme', 'beginning', NULL, 'The start of the adventure.', 'system', 'sample', now(), now());
INSERT INTO public.semantic_tags VALUES (2, 2, 'emotion', 'tension', NULL, 'A sense of danger in the forest.', 'system', 'sample', now(), now());

-- ============================================================
-- TYPE BASE ATTACK TYPES (depends on: item_type_bases, attack_types)
-- These link item bases to their associated attack types
-- ============================================================
-- Data for Name: type_base_attack_types; Type: TABLE DATA; Schema: public; Owner: -

INSERT INTO public.type_base_attack_types VALUES (1, 1, 1, now());

-- ============================================================
-- WAVE PRESET ASSIGNMENTS (depends on: wave_presets, books, chapters)
-- ============================================================
-- Data for Name: wave_preset_assignments; Type: TABLE DATA; Schema: public; Owner: -

-- Cols: id, wave_preset_id, book_id, chapter_id, created_at, updated_at
INSERT INTO public.wave_preset_assignments VALUES (1, 1, 1, NULL, now(), now());

-- ============================================================
-- ASSET REGISTRY (no FK deps)
-- ============================================================
-- Data for Name: asset_registry; Type: TABLE DATA; Schema: public; Owner: -

-- Cols: id, asset_key, category, display_name, description, render_definition, tags, source, created_at, updated_at
INSERT INTO public.asset_registry VALUES (1, 'entity_default', 'entity_sprite', 'Default Entity', 'A generic placeholder entity sprite.', '{"radius": 18, "shadow": {"enabled": true, "opacity": 0.25, "scale_x": 1.3, "offset_y": 20}, "version": 1}', '[]', 'system', now(), now());
INSERT INTO public.asset_registry VALUES (2, 'bg_default', 'background', 'Default Background', 'A generic placeholder background.', '{"version": 1}', '[]', 'system', now(), now());

-- ============================================================
-- SAMPLE ELEMENT DEFINITIONS & COMPONENTS (parallax background system)
-- Category: bg_element_def = element type definition (assembly blueprint)
-- Category: bg_component = individual SVG sub-component variant
-- ============================================================

-- Element definition: streetlight
INSERT INTO public.asset_registry VALUES (3, 'elem_def_streetlight', 'bg_element_def', 'Streetlight', 'Dystopian streetlight element with pole, lamp, and base slots.', '{"type": "element_definition", "element_type": "streetlight", "components": {"pole": ["elem_streetlight_pole_a", "elem_streetlight_pole_b", "elem_streetlight_pole_c"], "lamp": ["elem_streetlight_lamp_a", "elem_streetlight_lamp_b"], "base": ["elem_streetlight_base_a", "elem_streetlight_base_b", "elem_streetlight_base_c"]}, "anchor": {"x": 0.5, "y": 1.0}, "base_width": 20, "base_height": 80}', '["shared", "urban"]', 'system', now(), now());

-- Streetlight components
INSERT INTO public.asset_registry VALUES (4, 'elem_streetlight_pole_a', 'bg_component', 'Streetlight Pole A', 'Straight narrow pole.', '{"type": "bg_component", "slot": "pole", "svg_paths": [{"d": "M9 0 L9 65 L11 65 L11 0 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#666666", "variance": 0.1}}}', '["streetlight"]', 'system', now(), now());
INSERT INTO public.asset_registry VALUES (5, 'elem_streetlight_pole_b', 'bg_component', 'Streetlight Pole B', 'Slightly tapered pole.', '{"type": "bg_component", "slot": "pole", "svg_paths": [{"d": "M8 0 L9 65 L11 65 L12 0 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#666666", "variance": 0.1}}}', '["streetlight"]', 'system', now(), now());
INSERT INTO public.asset_registry VALUES (6, 'elem_streetlight_pole_c', 'bg_component', 'Streetlight Pole C', 'Pole with bracket detail.', '{"type": "bg_component", "slot": "pole", "svg_paths": [{"d": "M9 0 L9 65 L11 65 L11 0 Z", "fill": "{color}"}, {"d": "M7 15 L13 15 L13 17 L7 17 Z", "fill": "{color_dark}"}], "color_slots": {"color": {"base": "#666666", "variance": 0.1}, "color_dark": {"base": "#444444", "variance": 0.1}}}', '["streetlight"]', 'system', now(), now());
INSERT INTO public.asset_registry VALUES (7, 'elem_streetlight_lamp_a', 'bg_component', 'Streetlight Lamp A', 'Round lamp head.', '{"type": "bg_component", "slot": "lamp", "svg_paths": [{"d": "M4 0 A6 6 0 0 1 16 0 A6 6 0 0 1 4 0 Z", "fill": "{glow}"}, {"d": "M6 -2 L14 -2 L14 0 L6 0 Z", "fill": "{color}"}], "color_slots": {"glow": {"base": "#FFDD88", "variance": 0.15}, "color": {"base": "#888888", "variance": 0.1}}}', '["streetlight"]', 'system', now(), now());
INSERT INTO public.asset_registry VALUES (8, 'elem_streetlight_lamp_b', 'bg_component', 'Streetlight Lamp B', 'Angular lamp head.', '{"type": "bg_component", "slot": "lamp", "svg_paths": [{"d": "M3 0 L17 0 L14 -6 L6 -6 Z", "fill": "{glow}"}, {"d": "M6 -6 L14 -6 L14 -8 L6 -8 Z", "fill": "{color}"}], "color_slots": {"glow": {"base": "#FFDD88", "variance": 0.15}, "color": {"base": "#888888", "variance": 0.1}}}', '["streetlight"]', 'system', now(), now());
INSERT INTO public.asset_registry VALUES (9, 'elem_streetlight_base_a', 'bg_component', 'Streetlight Base A', 'Simple flat base.', '{"type": "bg_component", "slot": "base", "svg_paths": [{"d": "M4 0 L16 0 L16 3 L4 3 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#555555", "variance": 0.1}}}', '["streetlight"]', 'system', now(), now());
INSERT INTO public.asset_registry VALUES (10, 'elem_streetlight_base_b', 'bg_component', 'Streetlight Base B', 'Stepped base.', '{"type": "bg_component", "slot": "base", "svg_paths": [{"d": "M5 0 L15 0 L15 2 L5 2 Z", "fill": "{color}"}, {"d": "M3 2 L17 2 L17 5 L3 5 Z", "fill": "{color_dark}"}], "color_slots": {"color": {"base": "#555555", "variance": 0.1}, "color_dark": {"base": "#333333", "variance": 0.1}}}', '["streetlight"]', 'system', now(), now());
INSERT INTO public.asset_registry VALUES (11, 'elem_streetlight_base_c', 'bg_component', 'Streetlight Base C', 'Rounded base.', '{"type": "bg_component", "slot": "base", "svg_paths": [{"d": "M5 0 Q10 4 15 0 L15 3 L5 3 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#555555", "variance": 0.1}}}', '["streetlight"]', 'system', now(), now());

-- Element definition: cloud
INSERT INTO public.asset_registry VALUES (12, 'elem_def_cloud', 'bg_element_def', 'Cloud', 'Atmospheric cloud element with body and detail slots.', '{"type": "element_definition", "element_type": "cloud", "components": {"body": ["elem_cloud_body_a", "elem_cloud_body_b", "elem_cloud_body_c"], "detail": ["elem_cloud_detail_a", "elem_cloud_detail_b"]}, "anchor": {"x": 0.5, "y": 0.5}, "base_width": 60, "base_height": 25}', '["shared", "atmospheric"]', 'system', now(), now());

-- Cloud components
INSERT INTO public.asset_registry VALUES (13, 'elem_cloud_body_a', 'bg_component', 'Cloud Body A', 'Rounded cumulus shape.', '{"type": "bg_component", "slot": "body", "svg_paths": [{"d": "M5 20 Q5 8 15 6 Q20 0 30 4 Q40 0 45 6 Q55 8 55 20 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#CCCCCC", "variance": 0.15}}}', '["cloud"]', 'system', now(), now());
INSERT INTO public.asset_registry VALUES (14, 'elem_cloud_body_b', 'bg_component', 'Cloud Body B', 'Flatter stratus shape.', '{"type": "bg_component", "slot": "body", "svg_paths": [{"d": "M0 18 Q10 10 20 12 Q35 8 45 12 Q55 10 60 18 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#CCCCCC", "variance": 0.15}}}', '["cloud"]', 'system', now(), now());
INSERT INTO public.asset_registry VALUES (15, 'elem_cloud_body_c', 'bg_component', 'Cloud Body C', 'Tall billowing shape.', '{"type": "bg_component", "slot": "body", "svg_paths": [{"d": "M8 22 Q4 12 12 8 Q18 2 28 4 Q36 0 42 6 Q50 10 48 22 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#CCCCCC", "variance": 0.15}}}', '["cloud"]', 'system', now(), now());
INSERT INTO public.asset_registry VALUES (16, 'elem_cloud_detail_a', 'bg_component', 'Cloud Detail A', 'Subtle shadow underside.', '{"type": "bg_component", "slot": "detail", "svg_paths": [{"d": "M10 18 Q20 14 35 15 Q45 14 50 18 Z", "fill": "{shadow}"}], "color_slots": {"shadow": {"base": "#AAAAAA", "variance": 0.1}}}', '["cloud"]', 'system', now(), now());
INSERT INTO public.asset_registry VALUES (17, 'elem_cloud_detail_b', 'bg_component', 'Cloud Detail B', 'Wispy edge detail.', '{"type": "bg_component", "slot": "detail", "svg_paths": [{"d": "M2 20 Q8 16 15 18 Q20 15 25 18", "fill": "none", "stroke": "{wisp}", "stroke_width": 1}], "color_slots": {"wisp": {"base": "#BBBBBB", "variance": 0.1}}}', '["cloud"]', 'system', now(), now());

-- Element definition: debris
INSERT INTO public.asset_registry VALUES (18, 'elem_def_debris', 'bg_element_def', 'Debris', 'Scattered rubble and debris for dystopian scenes.', '{"type": "element_definition", "element_type": "debris", "components": {"chunk": ["elem_debris_chunk_a", "elem_debris_chunk_b", "elem_debris_chunk_c"], "scatter": ["elem_debris_scatter_a", "elem_debris_scatter_b"]}, "anchor": {"x": 0.5, "y": 1.0}, "base_width": 30, "base_height": 15}', '["shared", "urban", "destruction"]', 'system', now(), now());

-- Debris components
INSERT INTO public.asset_registry VALUES (19, 'elem_debris_chunk_a', 'bg_component', 'Debris Chunk A', 'Angular concrete chunk.', '{"type": "bg_component", "slot": "chunk", "svg_paths": [{"d": "M2 12 L8 0 L18 2 L22 10 L15 14 Z", "fill": "{color}"}, {"d": "M8 0 L12 3 L18 2", "fill": "none", "stroke": "{crack}", "stroke_width": 0.5}], "color_slots": {"color": {"base": "#777777", "variance": 0.15}, "crack": {"base": "#555555", "variance": 0.1}}}', '["debris"]', 'system', now(), now());
INSERT INTO public.asset_registry VALUES (20, 'elem_debris_chunk_b', 'bg_component', 'Debris Chunk B', 'Flat rubble slab.', '{"type": "bg_component", "slot": "chunk", "svg_paths": [{"d": "M0 10 L5 4 L20 3 L25 8 L22 12 L3 13 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#777777", "variance": 0.15}}}', '["debris"]', 'system', now(), now());
INSERT INTO public.asset_registry VALUES (21, 'elem_debris_chunk_c', 'bg_component', 'Debris Chunk C', 'Small jagged fragment.', '{"type": "bg_component", "slot": "chunk", "svg_paths": [{"d": "M3 10 L7 1 L14 0 L16 8 L10 12 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#777777", "variance": 0.15}}}', '["debris"]', 'system', now(), now());
INSERT INTO public.asset_registry VALUES (22, 'elem_debris_scatter_a', 'bg_component', 'Debris Scatter A', 'Small pebble scatter.', '{"type": "bg_component", "slot": "scatter", "svg_paths": [{"d": "M2 3 A2 2 0 1 1 6 3 A2 2 0 1 1 2 3 Z", "fill": "{color}"}, {"d": "M12 5 A1.5 1.5 0 1 1 15 5 A1.5 1.5 0 1 1 12 5 Z", "fill": "{color}"}, {"d": "M8 1 A1 1 0 1 1 10 1 A1 1 0 1 1 8 1 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#666666", "variance": 0.2}}}', '["debris"]', 'system', now(), now());
INSERT INTO public.asset_registry VALUES (23, 'elem_debris_scatter_b', 'bg_component', 'Debris Scatter B', 'Dust and gravel scatter.', '{"type": "bg_component", "slot": "scatter", "svg_paths": [{"d": "M1 4 L3 2 L5 4 L3 5 Z", "fill": "{color}"}, {"d": "M9 3 L11 1 L13 3 L11 4 Z", "fill": "{color}"}, {"d": "M6 6 L7 5 L8 6 Z", "fill": "{color}"}], "color_slots": {"color": {"base": "#666666", "variance": 0.2}}}', '["debris"]', 'system', now(), now());

-- ============================================================
-- EMPTY TABLES (no sample data needed, populated at runtime or by generators)
-- scene_audio_sync, scene_wave_configs
-- ============================================================

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Reset sequences to start after sample data IDs
SELECT setval('achievements_id_seq', (SELECT COALESCE(MAX(id), 0) FROM achievements));
SELECT setval('asset_registry_id_seq', (SELECT COALESCE(MAX(id), 0) FROM asset_registry));
SELECT setval('atmospheres_id_seq', (SELECT COALESCE(MAX(id), 0) FROM atmospheres));
SELECT setval('audio_configs_id_seq', (SELECT COALESCE(MAX(id), 0) FROM audio_configs));
SELECT setval('backgrounds_id_seq', (SELECT COALESCE(MAX(id), 0) FROM backgrounds));
SELECT setval('benefit_effect_data_id_seq', (SELECT COALESCE(MAX(id), 0) FROM benefit_effect_data));
SELECT setval('books_id_seq', (SELECT COALESCE(MAX(id), 0) FROM books));
SELECT setval('chapters_id_seq', (SELECT COALESCE(MAX(id), 0) FROM chapters));
SELECT setval('curated_artifact_tiers_id_seq', (SELECT COALESCE(MAX(id), 0) FROM curated_artifact_tiers));
SELECT setval('curated_artifacts_id_seq', (SELECT COALESCE(MAX(id), 0) FROM curated_artifacts));
SELECT setval('entities_id_seq', (SELECT COALESCE(MAX(id), 0) FROM entities));
SELECT setval('entity_aliases_id_seq', (SELECT COALESCE(MAX(id), 0) FROM entity_aliases));
SELECT setval('entity_attack_types_id_seq', (SELECT COALESCE(MAX(id), 0) FROM entity_attack_types));
SELECT setval('entity_beat_appearances_id_seq', (SELECT COALESCE(MAX(id), 0) FROM entity_beat_appearances));
SELECT setval('entity_families_id_seq', (SELECT COALESCE(MAX(id), 0) FROM entity_families));
SELECT setval('entity_gameplay_data_id_seq', (SELECT COALESCE(MAX(id), 0) FROM entity_gameplay_data));
SELECT setval('entity_scene_appearances_id_seq', (SELECT COALESCE(MAX(id), 0) FROM entity_scene_appearances));
SELECT setval('location_aliases_id_seq', (SELECT COALESCE(MAX(id), 0) FROM location_aliases));
SELECT setval('location_scene_appearances_id_seq', (SELECT COALESCE(MAX(id), 0) FROM location_scene_appearances));
SELECT setval('locations_id_seq', (SELECT COALESCE(MAX(id), 0) FROM locations));
SELECT setval('scene_gameplay_data_id_seq', (SELECT COALESCE(MAX(id), 0) FROM scene_gameplay_data));
SELECT setval('scenes_id_seq', (SELECT COALESCE(MAX(id), 0) FROM scenes));
SELECT setval('semantic_tags_id_seq', (SELECT COALESCE(MAX(id), 0) FROM semantic_tags));
SELECT setval('story_beats_id_seq', (SELECT COALESCE(MAX(id), 0) FROM story_beats));
SELECT setval('titles_id_seq', (SELECT COALESCE(MAX(id), 0) FROM titles));
SELECT setval('visual_behaviors_id_seq', (SELECT COALESCE(MAX(id), 0) FROM visual_behaviors));
SELECT setval('wave_presets_id_seq', (SELECT COALESCE(MAX(id), 0) FROM wave_presets));
