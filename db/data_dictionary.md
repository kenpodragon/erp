# ERP Data Dictionary

Generated from live database on 2026-03-22. **109 tables**, PostgreSQL 17.

## Table of Contents

- [achievements](#achievements) (111 rows)
- [activity_events](#activity_events) (297 rows)
- [admin_audit_log](#admin_audit_log) (3 rows)
- [admin_essence_adjustments](#admin_essence_adjustments) (0 rows)
- [admin_shard_adjustments](#admin_shard_adjustments) (0 rows)
- [admin_whitelist_emails](#admin_whitelist_emails) (2 rows)
- [admin_whitelist_ips](#admin_whitelist_ips) (2 rows)
- [animation_styles](#animation_styles) (7 rows)
- [armor_classes](#armor_classes) (8 rows)
- [artifact_prefixes](#artifact_prefixes) (20 rows)
- [artifact_suffixes](#artifact_suffixes) (20 rows)
- [artifact_type_bases](#artifact_type_bases) (15 rows)
- [artifacts_legacy](#artifacts_legacy) (4 rows)
- [asset_registry](#asset_registry) (196 rows)
- [atmospheres](#atmospheres) (21 rows)
- [attack_types](#attack_types) (13 rows)
- [audio_configs](#audio_configs) (17 rows)
- [backgrounds](#backgrounds) (1 rows)
- [benefit_effect_data](#benefit_effect_data) (60 rows)
- [books](#books) (3 rows)
- [boss_completions](#boss_completions) (8 rows)
- [chapters](#chapters) (138 rows)
- [character_classes](#character_classes) (4 rows)
- [character_skill_levels](#character_skill_levels) (22 rows)
- [character_stats](#character_stats) (8 rows)
- [chat_channels](#chat_channels) (1 rows)
- [class_stat_affinities](#class_stat_affinities) (12 rows)
- [curated_artifact_tiers](#curated_artifact_tiers) (250 rows)
- [curated_artifacts](#curated_artifacts) (50 rows)
- [dev_content_audit](#dev_content_audit) (44 rows)
- [difficulty_curves](#difficulty_curves) (1 rows)
- [difficulty_presets](#difficulty_presets) (0 rows)
- [donations](#donations) (0 rows)
- [entities](#entities) (3936 rows)
- [entity_aliases](#entity_aliases) (4187 rows)
- [entity_attack_types](#entity_attack_types) (614 rows)
- [entity_beat_appearances](#entity_beat_appearances) (8500 rows)
- [entity_families](#entity_families) (0 rows)
- [entity_gameplay_data](#entity_gameplay_data) (4 rows)
- [entity_scene_appearances](#entity_scene_appearances) (6434 rows)
- [entity_types](#entity_types) (9 rows)
- [game_configs](#game_configs) (151 rows)
- [gear_slots](#gear_slots) (16 rows)
- [idle_skill_stat_contributions](#idle_skill_stat_contributions) (3 rows)
- [inventory_items](#inventory_items) (2 rows)
- [item_lore_tags](#item_lore_tags) (60 rows)
- [item_prefixes](#item_prefixes) (60 rows)
- [item_qualities](#item_qualities) (60 rows)
- [item_suffixes](#item_suffixes) (60 rows)
- [item_type_bases](#item_type_bases) (90 rows)
- [leaderboard_cache](#leaderboard_cache) (0 rows)
- [location_aliases](#location_aliases) (19 rows)
- [location_scene_appearances](#location_scene_appearances) (586 rows)
- [locations](#locations) (449 rows)
- [movement_types](#movement_types) (5 rows)
- [marketplace_listings](#marketplace_listings) (0 rows)
- [marketplace_notifications](#marketplace_notifications) (0 rows)
- [marketplace_price_history](#marketplace_price_history) (0 rows)
- [marketplace_trades](#marketplace_trades) (0 rows)
- [payment_orders](#payment_orders) (6 rows)
- [player_achievements](#player_achievements) (1 rows)
- [player_active_boosters](#player_active_boosters) (0 rows)
- [player_artifacts](#player_artifacts) (1 rows)
- [player_characters](#player_characters) (3 rows)
- [player_collections_legacy](#player_collections_legacy) (0 rows)
- [player_discovery_log](#player_discovery_log) (0 rows)
- [player_entity_discovery](#player_entity_discovery) (0 rows)
- [player_essence](#player_essence) (2 rows)
- [player_inventory](#player_inventory) (2 rows)
- [player_meta_progression](#player_meta_progression) (2 rows)
- [player_progress](#player_progress) (2 rows)
- [player_scene_records](#player_scene_records) (28 rows)
- [player_settings](#player_settings) (3 rows)
- [player_shop_items](#player_shop_items) (0 rows)
- [player_story_sessions](#player_story_sessions) (175 rows)
- [player_subscriptions](#player_subscriptions) (0 rows)
- [player_titles](#player_titles) (0 rows)
- [players](#players) (4 rows)
- [processing_runs](#processing_runs) (31 rows)
- [review_items](#review_items) (0 rows)
- [scene_audio_sync](#scene_audio_sync) (0 rows)
- [scene_gameplay_data](#scene_gameplay_data) (580 rows)
- [scene_wave_configs](#scene_wave_configs) (0 rows)
- [scenes](#scenes) (724 rows)
- [semantic_tags](#semantic_tags) (6221 rows)
- [server_config](#server_config) (17 rows)
- [session_upgrades](#session_upgrades) (279 rows)
- [shard_packages](#shard_packages) (6 rows)
- [shard_transactions](#shard_transactions) (1 rows)
- [shop_bundle_items](#shop_bundle_items) (9 rows)
- [shop_bundles](#shop_bundles) (3 rows)
- [silhouette_types](#silhouette_types) (6 rows)
- [size_classes](#size_classes) (5 rows)
- [shop_items](#shop_items) (45 rows)
- [skill_actions](#skill_actions) (47 rows)
- [skill_prerequisites](#skill_prerequisites) (40 rows)
- [skills](#skills) (18 rows)
- [stat_definitions](#stat_definitions) (4 rows)
- [story_beats](#story_beats) (2041 rows)
- [stripe_webhook_events](#stripe_webhook_events) (12 rows)
- [subscription_stipend_log](#subscription_stipend_log) (0 rows)
- [support_attachments](#support_attachments) (0 rows)
- [support_replies](#support_replies) (0 rows)
- [support_tickets](#support_tickets) (0 rows)
- [titles](#titles) (39 rows)
- [type_base_attack_types](#type_base_attack_types) (24 rows)
- [visual_behaviors](#visual_behaviors) (5 rows)
- [wave_preset_assignments](#wave_preset_assignments) (0 rows)
- [wave_presets](#wave_presets) (1 rows)

## achievements

**Rows:** 111

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| name | varchar(150) | NO |  |  |
| description | text | NO |  |  |
| category | varchar(20) | NO |  |  |
| icon_sprite_key | varchar(100) | NO | achievement_default |  |
| tracking_type | varchar(20) | NO |  |  |
| tracking_source | varchar(100) | NO |  |  |
| threshold_value | numeric(15,2) | NO | 1 |  |
| parent_achievement_id | integer | YES |  | FK->achievements.id |
| reward_shards | integer | NO | 0 |  |
| reward_essence | integer | NO | 0 |  |
| reward_title_id | integer | YES |  | FK->titles.id |
| sort_order | integer | NO | 0 |  |
| is_active | boolean | NO | true |  |
| created_at | timestamp with time zone | NO | now() |  |
| updated_at | timestamp with time zone | NO | now() |  |

**Foreign Keys:**
- `reward_title_id` -> `titles.id` (ON DELETE SET NULL)
- `parent_achievement_id` -> `achievements.id` (ON DELETE SET NULL)

## activity_events

**Rows:** 297

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | bigint | NO | auto | PK |
| player_id | integer | YES |  | FK->players.id |
| event_type | varchar(50) | NO |  |  |
| event_data | jsonb | YES |  |  |
| ip_address | varchar(45) | YES |  |  |
| user_agent | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |

**Foreign Keys:**
- `player_id` -> `players.id` (ON DELETE SET NULL)

## admin_audit_log

**Rows:** 3

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | bigint | NO | auto | PK |
| admin_email | varchar(255) | NO |  |  |
| action | varchar(50) | NO |  |  |
| target_type | varchar(50) | YES |  |  |
| target_id | varchar(100) | YES |  |  |
| details | jsonb | YES |  |  |
| ip_address | varchar(45) | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |

## admin_essence_adjustments

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| character_id | integer | NO |  | FK->player_characters.id |
| player_id | integer | NO |  | FK->players.id |
| admin_email | varchar(255) | NO |  |  |
| adjustment_type | varchar(10) | NO |  |  |
| amount | double precision | NO |  |  |
| balance_before | double precision | NO |  |  |
| balance_after | double precision | NO |  |  |
| reason | varchar(500) | NO |  |  |
| created_at | timestamp with time zone | NO | now() |  |

**Foreign Keys:**
- `character_id` -> `player_characters.id` (ON DELETE CASCADE)
- `player_id` -> `players.id` (ON DELETE CASCADE)

## admin_shard_adjustments

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| player_id | integer | NO |  | FK->players.id |
| admin_email | varchar(255) | NO |  |  |
| adjust_type | varchar(10) | NO |  |  |
| amount | integer | NO |  |  |
| reason | text | NO |  |  |
| balance_before | bigint | NO |  |  |
| balance_after | bigint | NO |  |  |
| shard_txn_id | integer | YES |  | FK->shard_transactions.id |
| created_at | timestamp with time zone | NO | now() |  |

**Foreign Keys:**
- `player_id` -> `players.id` (ON DELETE CASCADE)
- `shard_txn_id` -> `shard_transactions.id` (ON DELETE SET NULL)

## admin_whitelist_emails

**Rows:** 2

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| email | varchar(255) | NO |  | PK |
| added_by | varchar(255) | YES |  |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |

## admin_whitelist_ips

**Rows:** 2

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| ip_address | varchar(45) | NO |  | PK |
| note | varchar(255) | YES |  |  |
| added_by | varchar(255) | YES |  |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |

## animation_styles

**Rows:** 7

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| name | text | NO |  | UQ |
| description | text | YES |  |  |
| idle_scale_x | real | YES | 1.0 |  |
| idle_scale_y | real | YES | 1.0 |  |
| idle_cycle_ms | integer | YES | 2000 |  |
| idle_translate_x | real | YES | 0 |  |
| idle_translate_y | real | YES | 0 |  |
| attack_recoil | real | YES | 3.0 |  |
| death_style | text | YES | fade |  |
| death_duration_ms | integer | YES | 400 |  |
| death_particle_count | integer | YES | 8 |  |
| created_at | timestamptz | YES | now() |  |

## armor_classes

**Rows:** 8

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| code | text | NO |  | UQ |
| display_name | text | NO |  |  |
| description | text | YES |  |  |
| overlay_opacity | real | YES | 0.6 |  |
| color_tint_base | text | YES |  |  |
| texture_pattern | text | YES | solid |  |
| glow_intensity | real | YES | 0 |  |
| outline_width | real | YES | 1.0 |  |
| weight_class | text | YES | medium |  |
| sort_order | integer | YES | 0 |  |
| created_at | timestamptz | YES | now() |  |

## artifact_prefixes

**Rows:** 20

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| code | varchar(8) | NO |  | UQ |
| display_name | varchar(50) | NO |  |  |
| stat_bonuses | jsonb | NO | {} |  |
| created_at | timestamp with time zone | NO | now() |  |

## artifact_suffixes

**Rows:** 20

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| code | varchar(8) | NO |  | UQ |
| display_name | varchar(100) | NO |  |  |
| stat_bonuses | jsonb | NO | {} |  |
| created_at | timestamp with time zone | NO | now() |  |

## artifact_type_bases

**Rows:** 15

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| code | varchar(8) | NO |  | UQ |
| display_name | varchar(50) | NO |  |  |
| base_stat_range | jsonb | NO |  |  |
| lore_reference | text | YES |  |  |
| created_at | timestamp with time zone | NO | now() |  |

## artifacts_legacy

**Rows:** 4

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| name | varchar(100) | NO |  | UQ |
| description | text | YES |  |  |
| lore_text | text | YES |  |  |
| rarity | varchar(50) | YES | rare |  |
| passive_bonus | jsonb | YES | {} |  |
| sprite_key | varchar(100) | YES |  |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |

## asset_registry

**Rows:** 196

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| asset_key | varchar(150) | NO |  | UQ |
| category | varchar(50) | NO |  |  |
| display_name | varchar(200) | YES |  |  |
| description | text | YES |  |  |
| render_definition | jsonb | NO | {} |  |
| tags | jsonb | NO | [] |  |
| source | varchar(50) | NO | admin |  |
| created_at | timestamp with time zone | NO | now() |  |
| updated_at | timestamp with time zone | NO | now() |  |

## atmospheres

**Rows:** 21

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| name | varchar(255) | NO |  | UQ |
| archetype | varchar(100) | YES |  |  |
| description | text | YES |  |  |
| music_definitions | jsonb | YES | {"boss": null, "combat": null, "explore": null, "mystery": null} |  |
| generator_bpm | integer | YES | 120 |  |
| generator_key | varchar(10) | YES | C |  |
| generator_scale | varchar(50) | YES | minor |  |
| generator_complexity | integer | YES | 5 |  |
| generator_seed | integer | YES |  |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |

## attack_types

**Rows:** 13

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| name | varchar(50) | NO |  | UQ |
| display_name | varchar(100) | NO |  |  |
| description | text | YES |  |  |
| is_physical | boolean | YES | false |  |
| lore_reference | text | YES |  |  |
| created_at | timestamp without time zone | YES | now() |  |
| updated_at | timestamp without time zone | YES | now() |  |
| visual_behavior_id | integer | YES |  | FK->visual_behaviors.id |
| stat_multipliers | jsonb | YES |  |  |
| attack_animation_type | text | YES | melee_swing |  |
| projectile_sprite_key | text | YES |  |  |
| projectile_speed | real | YES | 3.0 |  |
| projectile_color | text | YES |  |  |
| impact_effect | text | YES | flash |  |
| attack_range | real | YES | 30.0 |  |
| cooldown_ms | integer | YES | 2000 |  |
| arc_angle | real | YES | 90 |  |
| trail_type | text | YES |  |  |
| screen_shake | boolean | YES | false |  |

**Foreign Keys:**
- `visual_behavior_id` -> `visual_behaviors.id` (ON DELETE SET NULL)

## audio_configs

**Rows:** 17

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| config_key | varchar(100) | NO |  | UQ |
| category | varchar(50) | NO | sfx |  |
| display_name | varchar(100) | YES |  |  |
| preset_definition | jsonb | NO | {} |  |
| base_volume | double precision | YES | 1.0 |  |
| pitch_variation | double precision | YES | 0.0 |  |
| spatial_enabled | boolean | YES | false |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |

## backgrounds

**Rows:** 1

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| name | varchar(100) | NO |  | UQ |
| description | text | YES |  |  |
| background_key | varchar(100) | NO |  | UQ |
| parallax_config | jsonb | YES | {} |  |
| time_of_day | varchar(50) | YES |  |  |
| mood | varchar(50) | YES |  |  |
| color_palette | jsonb | YES |  |  |
| created_at | timestamp with time zone | NO | now() |  |
| updated_at | timestamp with time zone | NO | now() |  |

## benefit_effect_data

**Rows:** 60

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| effect_key | varchar(100) | NO |  | UQ |
| display_name | varchar(100) | NO |  |  |
| description | text | YES |  |  |
| value_type | varchar(50) | NO |  |  |
| min_value | numeric | YES |  |  |
| max_value | numeric | YES |  |  |
| category | varchar(50) | YES |  |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |

## books

**Rows:** 3

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| book_number | integer | NO |  | UQ |
| title | varchar(255) | NO |  |  |
| source_file | varchar(255) | NO |  |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| transition_lore_text | text | YES |  |  |
| recommended_level | integer | YES |  |  |
| min_level | integer | YES |  |  |
| atmosphere_id | integer | YES |  | FK->atmospheres.id |
| difficulty_curve_id | integer | YES |  | FK->difficulty_curves.id |

**Foreign Keys:**
- `atmosphere_id` -> `atmospheres.id` (ON DELETE SET NULL)
- `difficulty_curve_id` -> `difficulty_curves.id` (ON DELETE SET NULL)

## boss_completions

**Rows:** 8

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| player_id | integer | NO |  | FK->players.id |
| scene_id | integer | NO |  | FK->scenes.id |
| boss_type | text | NO |  |  |
| chapter_id | integer | YES |  | FK->chapters.id |
| book_id | integer | YES |  | FK->books.id |
| session_id | text | YES |  |  |
| completed_at | timestamp with time zone | NO | now() |  |

**Foreign Keys:**
- `book_id` -> `books.id` (ON DELETE SET NULL)
- `chapter_id` -> `chapters.id` (ON DELETE SET NULL)
- `player_id` -> `players.id` (ON DELETE CASCADE)
- `scene_id` -> `scenes.id` (ON DELETE CASCADE)

## chapters

**Rows:** 138

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| book_id | integer | NO |  | UQ, FK->books.id |
| chapter_number | integer | NO |  | UQ |
| title | varchar(255) | YES |  |  |
| raw_text | text | YES |  |  |
| sort_order | integer | NO |  |  |
| processing_status | varchar(50) | YES | not_started |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| transition_lore_text | text | YES |  |  |
| recommended_level | integer | YES |  |  |
| min_level | integer | YES |  |  |
| atmosphere_id | integer | YES |  | FK->atmospheres.id |

**Foreign Keys:**
- `atmosphere_id` -> `atmospheres.id` (ON DELETE SET NULL)
- `book_id` -> `books.id` (ON DELETE CASCADE)

## character_classes

**Rows:** 4

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| name | varchar(50) | NO |  | UQ |
| lore_blurb | text | YES |  |  |
| base_strength | integer | YES | 10 |  |
| base_agility | integer | YES | 10 |  |
| base_intelligence | integer | YES | 10 |  |
| sprite_key | varchar(100) | YES |  |  |
| is_available | boolean | YES | true |  |
| created_at | timestamp with time zone | YES | now() |  |
| updated_at | timestamp with time zone | YES | now() |  |
| visual_config | jsonb | YES |  |  |

## character_skill_levels

**Rows:** 22

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| character_id | integer | NO |  | UQ, FK->player_characters.id |
| skill_id | integer | NO |  | UQ, FK->skills.id |
| level | integer | YES | 1 |  |
| current_xp | numeric | YES | 0 |  |
| created_at | timestamp with time zone | YES | now() |  |
| updated_at | timestamp with time zone | YES | now() |  |
| active_action_id | integer | YES |  | FK->skill_actions.id |
| action_started_at | timestamp with time zone | YES |  |  |
| is_active_training | boolean | NO | false |  |
| is_in_active_mode | boolean | NO | false |  |
| active_mode_started_at | timestamp with time zone | YES |  |  |
| last_offline_calc_at | timestamp with time zone | YES |  |  |
| max_session_level | integer | NO | 0 |  |

**Foreign Keys:**
- `active_action_id` -> `skill_actions.id` (ON DELETE SET NULL)
- `character_id` -> `player_characters.id` (ON DELETE CASCADE)
- `skill_id` -> `skills.id` (ON DELETE CASCADE)

## character_stats

**Rows:** 8

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| character_id | integer | NO |  | UQ, FK->player_characters.id |
| stat_id | integer | NO |  | UQ, FK->stat_definitions.id |
| computed_total | integer | NO | 0 |  |
| last_computed_at | timestamp with time zone | YES | now() |  |

**Foreign Keys:**
- `character_id` -> `player_characters.id` (ON DELETE CASCADE)
- `stat_id` -> `stat_definitions.id` (ON DELETE CASCADE)

## chat_channels

**Rows:** 1

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | varchar(50) | NO |  | PK |
| name | varchar(100) | NO |  |  |
| channel_type | varchar(20) | NO | global |  |
| is_active | boolean | NO | true |  |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |  |
| created_by | integer | YES |  | FK->players.id |

**Foreign Keys:**
- `created_by` -> `players.id` (ON DELETE SET NULL)

## class_stat_affinities

**Rows:** 12

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| class_id | integer | NO |  | UQ, FK->character_classes.id |
| stat_id | integer | NO |  | UQ, FK->stat_definitions.id |
| base_value | integer | NO | 10 |  |
| lore_weight | numeric(5,4) | NO | 0.0 |  |
| level_bonus_per_level | numeric(5,4) | NO | 0.0 |  |
| created_at | timestamp with time zone | YES | now() |  |
| updated_at | timestamp with time zone | YES | now() |  |

**Foreign Keys:**
- `class_id` -> `character_classes.id` (ON DELETE CASCADE)
- `stat_id` -> `stat_definitions.id` (ON DELETE CASCADE)

## curated_artifact_tiers

**Rows:** 250

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| curated_artifact_id | integer | NO |  | UQ, FK->curated_artifacts.id |
| rarity | varchar(20) | NO |  | UQ |
| stat_bonuses | jsonb | NO | {} |  |
| unique_effect_text | text | YES |  |  |
| drop_chance_multiplier | numeric(6,4) | NO | 1.0 |  |

**Foreign Keys:**
- `curated_artifact_id` -> `curated_artifacts.id` (ON DELETE CASCADE)

## curated_artifacts

**Rows:** 50

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| name | varchar(100) | NO |  | UQ |
| description | text | NO |  |  |
| lore_text | text | YES |  |  |
| icon_sprite_key | varchar(100) | NO |  |  |
| source_type | varchar(20) | NO |  |  |
| source_id | integer | YES |  |  |
| source_hint | varchar(255) | NO |  |  |
| base_drop_chance | numeric(6,4) | NO | 0.01 |  |
| synergy_set_id | integer | YES |  |  |
| is_active | boolean | NO | true |  |
| created_at | timestamp with time zone | NO | now() |  |
| updated_at | timestamp with time zone | NO | now() |  |

## dev_content_audit

**Rows:** 44

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| audit_type | varchar(50) | NO |  |  |
| entity_type | varchar(50) | YES |  |  |
| entity_id | integer | YES |  |  |
| entity_name | varchar(255) | YES |  |  |
| missing_field | varchar(100) | YES |  |  |
| scene_id | integer | YES |  | FK->scenes.id |
| zone_level | integer | YES |  |  |
| logged_at | timestamp with time zone | YES | now() |  |
| status | varchar(20) | NO | open |  |

**Foreign Keys:**
- `scene_id` -> `scenes.id` (ON DELETE SET NULL)

## difficulty_curves

**Rows:** 1

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| name | varchar(100) | NO |  | UQ |
| description | text | YES |  |  |
| curve_data | jsonb | NO | {} |  |
| is_default | boolean | NO | false |  |
| sort_order | integer | NO | 0 |  |
| created_at | timestamp with time zone | NO | now() |  |
| updated_at | timestamp with time zone | NO | now() |  |

## difficulty_presets

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| name | varchar(100) | NO |  | UQ |
| description | text | YES |  |  |
| difficulty_curve_id | integer | YES |  | FK->difficulty_curves.id |
| wave_preset_id | integer | YES |  | FK->wave_presets.id |
| config_snapshot | jsonb | NO | {} |  |
| is_active | boolean | NO | false |  |
| created_at | timestamp with time zone | NO | now() |  |
| updated_at | timestamp with time zone | NO | now() |  |

**Foreign Keys:**
- `difficulty_curve_id` -> `difficulty_curves.id` (ON DELETE SET NULL)
- `wave_preset_id` -> `wave_presets.id` (ON DELETE SET NULL)

## donations

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| player_id | integer | NO |  | FK->players.id |
| payment_order_id | integer | NO |  | UQ, FK->payment_orders.id |
| amount_cents | integer | NO |  |  |
| cumulative_total_cents | integer | NO | 0 |  |
| patron_tier | varchar(20) | YES | NULL |  |
| diamond_stars | integer | YES | 0 |  |
| created_at | timestamp with time zone | NO | now() |  |

**Foreign Keys:**
- `payment_order_id` -> `payment_orders.id` (ON DELETE NO ACTION)
- `player_id` -> `players.id` (ON DELETE NO ACTION)

## entities

**Rows:** 3936

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| canonical_name | varchar(255) | NO |  | UQ |
| is_generated | boolean | YES | false |  |
| base_description | text | YES |  |  |
| base_emotional_state | text | YES |  |  |
| base_sounds | text | YES |  |  |
| base_smells | text | YES |  |  |
| base_equipment | text | YES |  |  |
| base_abilities | text | YES |  |  |
| boss_text_references | text | YES |  |  |
| boss_action_quote | text | YES |  |  |
| boss_variant_differences | text | YES |  |  |
| first_appearance_scene_id | integer | YES |  | FK->scenes.id |
| ai_provider | varchar(50) | YES |  |  |
| ai_model_id | varchar(100) | YES |  |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| entity_type_id | integer | NO |  | FK->entity_types.id |
| entity_family_id | integer | YES |  | FK->entity_families.id |

**Foreign Keys:**
- `entity_family_id` -> `entity_families.id` (ON DELETE SET NULL)
- `entity_type_id` -> `entity_types.id` (ON DELETE RESTRICT)
- `first_appearance_scene_id` -> `scenes.id` (ON DELETE SET NULL)

## entity_aliases

**Rows:** 4187

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| entity_id | integer | NO |  | UQ, FK->entities.id |
| alias | varchar(255) | NO |  | UQ |
| context | text | YES |  |  |

**Foreign Keys:**
- `entity_id` -> `entities.id` (ON DELETE CASCADE)

## entity_attack_types

**Rows:** 614

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| entity_id | integer | NO |  | UQ, FK->entities.id |
| attack_type_id | integer | NO |  | UQ, FK->attack_types.id |
| is_primary | boolean | YES | false |  |
| created_at | timestamp without time zone | YES | now() |  |

**Foreign Keys:**
- `attack_type_id` -> `attack_types.id` (ON DELETE CASCADE)
- `entity_id` -> `entities.id` (ON DELETE CASCADE)

## entity_beat_appearances

**Rows:** 8500

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| entity_id | integer | NO |  | UQ, FK->entities.id |
| story_beat_id | integer | NO |  | UQ, FK->story_beats.id |
| role | varchar(50) | YES |  |  |
| is_primary | boolean | YES | false |  |
| beat_context | text | YES |  |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |

**Foreign Keys:**
- `entity_id` -> `entities.id` (ON DELETE CASCADE)
- `story_beat_id` -> `story_beats.id` (ON DELETE CASCADE)

## entity_families

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| name | varchar(100) | NO |  | UQ |
| display_name | varchar(100) | NO |  |  |
| description | text | YES |  |  |
| icon_key | varchar(100) | YES |  |  |
| lore_reference | text | YES |  |  |
| base_stat_template | jsonb | YES |  |  |
| sort_order | integer | NO | 0 |  |
| created_at | timestamp with time zone | NO | now() |  |
| updated_at | timestamp with time zone | NO | now() |  |

## entity_gameplay_data

**Rows:** 4

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| entity_id | integer | NO |  | UQ, FK->entities.id |
| sprite_key | varchar(100) | YES |  |  |
| base_hp | bigint | YES | 0 |  |
| base_gold | bigint | YES | 0 |  |
| appearance_rate | double precision | YES | 1.0 |  |
| stat_block | jsonb | YES | {} |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| unique_boss_theme_id | integer | YES |  | FK->atmospheres.id |
| death_sfx_key | varchar(100) | YES |  |  |
| movement_type_id | integer | YES |  | FK->movement_types.id |
| size_class_id | integer | YES |  | FK->size_classes.id |
| animation_style_id | integer | YES |  | FK->animation_styles.id |
| silhouette_type_id | integer | YES |  | FK->silhouette_types.id |
| color_primary | text | YES |  |  |
| color_secondary | text | YES |  |  |
| primary_attack_type_id | integer | YES |  | FK->attack_types.id |
| secondary_attack_type_id | integer | YES |  | FK->attack_types.id |
| tertiary_attack_type_id | integer | YES |  | FK->attack_types.id |

**Foreign Keys:**
- `unique_boss_theme_id` -> `atmospheres.id` (ON DELETE SET NULL)
- `entity_id` -> `entities.id` (ON DELETE CASCADE)
- `movement_type_id` -> `movement_types.id`
- `size_class_id` -> `size_classes.id`
- `animation_style_id` -> `animation_styles.id`
- `silhouette_type_id` -> `silhouette_types.id`
- `primary_attack_type_id` -> `attack_types.id`
- `secondary_attack_type_id` -> `attack_types.id`
- `tertiary_attack_type_id` -> `attack_types.id`

## entity_scene_appearances

**Rows:** 6434

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| entity_id | integer | NO |  | UQ, FK->entities.id |
| scene_id | integer | NO |  | UQ, FK->scenes.id |
| role | varchar(50) | YES |  |  |
| is_present | boolean | YES | true |  |
| description_delta | text | YES |  |  |
| emotional_state_delta | text | YES |  |  |
| equipment_delta | text | YES |  |  |
| exit_reason | varchar(255) | YES |  |  |
| entry_context | text | YES |  |  |
| relationships | text | YES |  |  |
| ai_provider | varchar(50) | YES |  |  |
| ai_model_id | varchar(100) | YES |  |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |

**Foreign Keys:**
- `entity_id` -> `entities.id` (ON DELETE CASCADE)
- `scene_id` -> `scenes.id` (ON DELETE CASCADE)

## entity_types

**Rows:** 9

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| name | varchar(50) | NO |  | UQ |
| display_name | varchar(100) | NO |  |  |
| description | text | YES |  |  |
| color_hex | varchar(7) | YES |  |  |
| sort_order | integer | NO | 0 |  |
| created_at | timestamp with time zone | NO | now() |  |
| updated_at | timestamp with time zone | NO | now() |  |

## game_configs

**Rows:** 151

*Includes 10 banner scaling configs from migration 068: `banner_base_enemies`, `banner_max_enemies`, `banner_enemies_per_level`, `banner_death_base_rate`, `banner_death_reduction_per_level`, `banner_death_floor`, `banner_kill_speed_base_ms`, `banner_kill_speed_min_ms`, `banner_spawn_rate_base`, `banner_spawn_rate_combat` (category: `banner`).*

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| key | varchar(100) | NO |  | PK |
| value_json | jsonb | NO |  |  |
| description | text | YES |  |  |
| updated_at | timestamp with time zone | YES | now() |  |
| category | varchar(50) | YES | NULL |  |
| game_impact | text | YES |  |  |
| updated_by | integer | YES |  | FK->players.id |

**Foreign Keys:**
- `updated_by` -> `players.id` (ON DELETE SET NULL)

## gear_slots

**Rows:** 16

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| name | varchar(50) | NO |  | UQ |
| display_name | varchar(100) | NO |  |  |
| description | text | YES |  |  |
| sort_order | integer | NO | 0 |  |
| paperdoll_layer | integer | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |

## idle_skill_stat_contributions

**Rows:** 3

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| idle_skill_id | integer | NO |  | UQ, FK->skills.id |
| stat_id | integer | NO |  | UQ, FK->stat_definitions.id |
| coefficient | numeric(6,4) | NO | 0.5 |  |
| description | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| updated_at | timestamp with time zone | YES | now() |  |

**Foreign Keys:**
- `idle_skill_id` -> `skills.id` (ON DELETE CASCADE)
- `stat_id` -> `stat_definitions.id` (ON DELETE CASCADE)

## inventory_items

**Rows:** 2

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| name | varchar(100) | NO |  |  |
| description | text | YES |  |  |
| item_type | varchar(50) | NO |  |  |
| rarity | varchar(50) | YES | common |  |
| base_stats | jsonb | YES | {} |  |
| sprite_key | varchar(100) | YES |  |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| item_code | varchar(60) | YES | NULL |  |
| item_level | integer | NO | 1 |  |
| min_char_level | integer | NO | 1 |  |
| stat_requirements | jsonb | NO | {} |  |
| gear_slot_id | integer | YES |  | FK->gear_slots.id |
| is_dream_item | boolean | NO | false |  |
| acquired_from | varchar(100) | YES | NULL |  |

**Foreign Keys:**
- `gear_slot_id` -> `gear_slots.id` (ON DELETE SET NULL)

## item_lore_tags

**Rows:** 60

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| code | varchar(8) | NO |  | UQ |
| display_name | varchar(50) | NO |  |  |
| narrative_context | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |

## item_prefixes

**Rows:** 60

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| code | varchar(8) | NO |  | UQ |
| display_name | varchar(50) | NO |  |  |
| stat_bonuses | jsonb | NO | {} |  |
| lore_reference | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| updated_at | timestamp with time zone | YES | now() |  |

## item_qualities

**Rows:** 60

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| code | varchar(8) | NO |  | UQ |
| display_name | varchar(50) | NO |  |  |
| lore_reference | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |

## item_suffixes

**Rows:** 60

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| code | varchar(8) | NO |  | UQ |
| display_name | varchar(100) | NO |  |  |
| stat_bonuses | jsonb | NO | {} |  |
| lore_reference | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| updated_at | timestamp with time zone | YES | now() |  |

## item_type_bases

**Rows:** 90

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| code | varchar(8) | NO |  | UQ |
| display_name | varchar(50) | NO |  |  |
| gear_slot_id | integer | NO |  | FK->gear_slots.id |
| base_stat_range | jsonb | NO | {} |  |
| lore_reference | text | YES |  |  |
| armor_class_id | integer | YES |  | FK->armor_classes.id |
| player_attack_animation | text | YES |  |  |
| player_projectile_key | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| updated_at | timestamp with time zone | YES | now() |  |

**Foreign Keys:**
- `gear_slot_id` -> `gear_slots.id` (ON DELETE RESTRICT)
- `armor_class_id` -> `armor_classes.id`

## leaderboard_cache

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| category | varchar(20) | NO |  | UQ |
| rank | integer | NO |  | UQ |
| player_id | integer | NO |  | FK->players.id |
| player_alias | varchar(100) | NO |  |  |
| character_class | varchar(50) | YES |  |  |
| character_level | integer | YES |  |  |
| equipped_title | varchar(100) | YES |  |  |
| metric_value | numeric(15,2) | NO |  |  |
| badge_tier | varchar(10) | YES |  |  |
| updated_at | timestamp with time zone | NO | now() |  |

**Foreign Keys:**
- `player_id` -> `players.id` (ON DELETE CASCADE)

## location_aliases

**Rows:** 19

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| location_id | integer | NO |  | UQ, FK->locations.id |
| alias | varchar(255) | NO |  | UQ |
| context | text | YES |  |  |

**Foreign Keys:**
- `location_id` -> `locations.id` (ON DELETE CASCADE)

## location_scene_appearances

**Rows:** 586

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| location_id | integer | NO |  | UQ, FK->locations.id |
| scene_id | integer | NO |  | UQ, FK->scenes.id |
| visual_delta | text | YES |  |  |
| auditory_delta | text | YES |  |  |
| olfactory_delta | text | YES |  |  |
| tactile_delta | text | YES |  |  |
| atmosphere_delta | text | YES |  |  |
| ai_provider | varchar(50) | YES |  |  |
| ai_model_id | varchar(100) | YES |  |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |

**Foreign Keys:**
- `location_id` -> `locations.id` (ON DELETE CASCADE)
- `scene_id` -> `scenes.id` (ON DELETE CASCADE)

## locations

**Rows:** 449

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| canonical_name | varchar(255) | NO |  | UQ |
| location_type | varchar(50) | YES |  |  |
| base_visual | text | YES |  |  |
| base_auditory | text | YES |  |  |
| base_olfactory | text | YES |  |  |
| base_tactile | text | YES |  |  |
| base_atmosphere | text | YES |  |  |
| first_appearance_scene_id | integer | YES |  | FK->scenes.id |
| ai_provider | varchar(50) | YES |  |  |
| ai_model_id | varchar(100) | YES |  |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| archetype_id | integer | YES |  | FK->atmospheres.id |
| description | text | YES |  |  |

**Foreign Keys:**
- `archetype_id` -> `atmospheres.id` (ON DELETE SET NULL)
- `first_appearance_scene_id` -> `scenes.id` (ON DELETE SET NULL)

## movement_types

**Rows:** 5

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| name | text | NO |  | UQ |
| description | text | YES |  |  |
| y_offset_min | real | YES | 0 |  |
| y_offset_max | real | YES | 0 |  |
| bob_amplitude | real | YES | 0 |  |
| bob_frequency | real | YES | 1.0 |  |
| speed_multiplier | real | YES | 1.0 |  |
| can_change_lane | boolean | YES | false |  |
| trail_effect | text | YES |  |  |
| created_at | timestamptz | YES | now() |  |

## marketplace_listings

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| seller_id | integer | NO |  | FK->players.id |
| buyer_id | integer | YES |  | FK->players.id |
| item_type | varchar(20) | NO |  |  |
| item_ref_id | integer | NO |  |  |
| item_name | varchar(150) | NO |  |  |
| item_rarity | varchar(50) | NO |  |  |
| item_stats | jsonb | NO | {} |  |
| item_icon_key | varchar(100) | YES |  |  |
| item_gear_slot | integer | YES |  | FK->gear_slots.id |
| is_curated | boolean | NO | false |  |
| price_shards | integer | NO |  |  |
| status | varchar(20) | NO | active |  |
| listed_at | timestamp with time zone | NO | now() |  |
| expires_at | timestamp with time zone | NO |  |  |
| sold_at | timestamp with time zone | YES |  |  |
| cancelled_at | timestamp with time zone | YES |  |  |
| expired_at | timestamp with time zone | YES |  |  |
| updated_at | timestamp with time zone | NO | now() |  |

**Foreign Keys:**
- `buyer_id` -> `players.id` (ON DELETE SET NULL)
- `item_gear_slot` -> `gear_slots.id` (ON DELETE SET NULL)
- `seller_id` -> `players.id` (ON DELETE CASCADE)

## marketplace_notifications

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| player_id | integer | NO |  | FK->players.id |
| notification_type | varchar(30) | NO |  |  |
| title | varchar(200) | NO |  |  |
| message | text | NO |  |  |
| related_listing_id | integer | YES |  | FK->marketplace_listings.id |
| is_read | boolean | NO | false |  |
| created_at | timestamp with time zone | NO | now() |  |
| read_at | timestamp with time zone | YES |  |  |

**Foreign Keys:**
- `player_id` -> `players.id` (ON DELETE CASCADE)
- `related_listing_id` -> `marketplace_listings.id` (ON DELETE SET NULL)

## marketplace_price_history

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| listing_id | integer | NO |  | FK->marketplace_listings.id |
| price | integer | NO |  |  |
| old_price | integer | YES |  |  |
| action | varchar(20) | NO |  |  |
| changed_at | timestamp with time zone | NO | now() |  |

**Foreign Keys:**
- `listing_id` -> `marketplace_listings.id` (ON DELETE CASCADE)

## marketplace_trades

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| listing_id | integer | NO |  | FK->marketplace_listings.id |
| buyer_id | integer | NO |  | FK->players.id |
| seller_id | integer | NO |  | FK->players.id |
| item_type | varchar(20) | NO |  |  |
| item_ref_id | integer | NO |  |  |
| item_name | varchar(150) | NO |  |  |
| item_rarity | varchar(50) | NO |  |  |
| price_shards | integer | NO |  |  |
| tax_shards | integer | NO | 0 |  |
| seller_proceeds | integer | NO |  |  |
| claim_status | varchar(20) | NO | claimed |  |
| traded_at | timestamp with time zone | NO | now() |  |

**Foreign Keys:**
- `buyer_id` -> `players.id` (ON DELETE CASCADE)
- `listing_id` -> `marketplace_listings.id` (ON DELETE CASCADE)
- `seller_id` -> `players.id` (ON DELETE CASCADE)

## payment_orders

**Rows:** 6

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| player_id | integer | NO |  | FK->players.id |
| package_id | integer | NO |  | FK->shard_packages.id |
| status | varchar(20) | NO | pending |  |
| stripe_checkout_session_id | varchar(255) | YES |  | UQ |
| stripe_payment_intent_id | varchar(255) | YES | NULL |  |
| stripe_charge_id | varchar(255) | YES | NULL |  |
| idempotency_key | uuid | NO |  | UQ |
| price_cents | integer | NO |  |  |
| shards_credited | integer | YES | 0 |  |
| shards_refunded | integer | YES | 0 |  |
| is_first_purchase | boolean | NO | false |  |
| created_at | timestamp with time zone | NO | now() |  |
| completed_at | timestamp with time zone | YES |  |  |
| refunded_at | timestamp with time zone | YES |  |  |
| expired_at | timestamp with time zone | YES |  |  |

**Foreign Keys:**
- `package_id` -> `shard_packages.id` (ON DELETE RESTRICT)
- `player_id` -> `players.id` (ON DELETE CASCADE)

## player_achievements

**Rows:** 1

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| player_id | integer | NO |  | UQ, FK->players.id |
| achievement_id | integer | NO |  | UQ, FK->achievements.id |
| progress_value | numeric(15,2) | NO | 0 |  |
| is_completed | boolean | NO | false |  |
| is_new | boolean | NO | true |  |
| earned_at | timestamp with time zone | YES |  |  |

**Foreign Keys:**
- `achievement_id` -> `achievements.id` (ON DELETE CASCADE)
- `player_id` -> `players.id` (ON DELETE CASCADE)

## player_active_boosters

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| player_id | integer | NO |  | FK->players.id |
| boost_type | varchar(20) | NO |  |  |
| magnitude | numeric(5,2) | NO |  |  |
| duration_seconds | integer | NO |  |  |
| elapsed_seconds | integer | NO | 0 |  |
| shop_item_id | integer | YES |  | FK->shop_items.id |
| status | varchar(20) | NO | active |  |
| activated_at | timestamp with time zone | NO | now() |  |
| expired_at | timestamp with time zone | YES |  |  |
| updated_at | timestamp with time zone | NO | now() |  |

**Foreign Keys:**
- `player_id` -> `players.id` (ON DELETE CASCADE)
- `shop_item_id` -> `shop_items.id` (ON DELETE SET NULL)

## player_artifacts

**Rows:** 1

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| player_id | integer | NO |  | FK->players.id |
| character_id | integer | NO |  | FK->player_characters.id |
| artifact_type | varchar(20) | NO |  |  |
| curated_artifact_id | integer | YES |  | FK->curated_artifacts.id |
| artifact_code | varchar(60) | YES |  |  |
| name | varchar(150) | NO |  |  |
| rarity | varchar(20) | NO |  |  |
| icon_sprite_key | varchar(100) | NO | artifact_default |  |
| stat_bonuses | jsonb | NO | {} |  |
| acquired_from | varchar(100) | YES |  |  |
| is_new | boolean | NO | true |  |
| acquired_at | timestamp with time zone | NO | now() |  |
| marketplace_listing_id | integer | YES |  | FK->marketplace_listings.id |

**Foreign Keys:**
- `curated_artifact_id` -> `curated_artifacts.id` (ON DELETE SET NULL)
- `character_id` -> `player_characters.id` (ON DELETE CASCADE)
- `marketplace_listing_id` -> `marketplace_listings.id` (ON DELETE SET NULL)
- `player_id` -> `players.id` (ON DELETE CASCADE)

## player_characters

**Rows:** 3

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| player_id | integer | NO |  | FK->players.id |
| class_id | integer | NO |  | FK->character_classes.id |
| character_name | varchar(20) | NO |  |  |
| level | integer | YES | 1 |  |
| strength | integer | YES |  |  |
| agility | integer | YES |  |  |
| intelligence | integer | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| last_played_at | timestamp with time zone | YES | now() |  |
| updated_at | timestamp with time zone | YES | now() |  |
| character_xp | bigint | NO | 0 |  |
| equipped_title_id | integer | YES |  | FK->titles.id |
| equipped_skin_id | integer | YES |  |  |

**Foreign Keys:**
- `class_id` -> `character_classes.id` (ON DELETE RESTRICT)
- `equipped_title_id` -> `titles.id` (ON DELETE SET NULL)
- `player_id` -> `players.id` (ON DELETE CASCADE)

## player_collections_legacy

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| character_id | integer | NO |  | UQ, FK->player_characters.id |
| artifact_id | integer | NO |  | UQ, FK->artifacts_legacy.id |
| unlocked_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |

**Foreign Keys:**
- `artifact_id` -> `artifacts_legacy.id` (ON DELETE CASCADE)
- `character_id` -> `player_characters.id` (ON DELETE CASCADE)

## player_discovery_log

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| player_id | integer | NO |  | UQ, FK->players.id |
| discovery_type | varchar(20) | NO |  | UQ |
| reference_id | integer | NO |  | UQ |
| discovered_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |  |
| is_new | boolean | NO | true |  |

**Foreign Keys:**
- `player_id` -> `players.id` (ON DELETE CASCADE)

## player_entity_discovery

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| player_id | integer | NO |  | UQ, FK->players.id |
| entity_id | integer | NO |  | UQ, FK->entities.id |
| encounters | integer | NO | 0 |  |
| kills | integer | NO | 0 |  |
| rank | varchar(2) | YES | NULL |  |
| first_seen_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |  |
| is_new | boolean | NO | true |  |

**Foreign Keys:**
- `entity_id` -> `entities.id` (ON DELETE CASCADE)
- `player_id` -> `players.id` (ON DELETE CASCADE)

## player_essence

**Rows:** 2

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| player_id | integer | NO |  | FK->players.id |
| character_id | integer | NO |  | UQ, FK->player_characters.id |
| current_balance | numeric(20,4) | NO | 0 |  |
| passive_rate | numeric(20,4) | NO | 0 |  |
| created_at | timestamp with time zone | NO | now() |  |
| updated_at | timestamp with time zone | NO | now() |  |

**Foreign Keys:**
- `character_id` -> `player_characters.id` (ON DELETE CASCADE)
- `player_id` -> `players.id` (ON DELETE CASCADE)

## player_inventory

**Rows:** 2

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| character_id | integer | NO |  | FK->player_characters.id |
| item_id | integer | NO |  | FK->inventory_items.id |
| is_equipped | boolean | YES | false |  |
| equipped_slot | varchar(50) | YES |  |  |
| quantity | integer | YES | 1 |  |
| acquired_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| marketplace_listing_id | integer | YES |  | FK->marketplace_listings.id |

**Foreign Keys:**
- `character_id` -> `player_characters.id` (ON DELETE CASCADE)
- `item_id` -> `inventory_items.id` (ON DELETE CASCADE)
- `marketplace_listing_id` -> `marketplace_listings.id` (ON DELETE SET NULL)

## player_meta_progression

**Rows:** 2

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| player_id | integer | NO |  | PK, FK->players.id |
| elysium_essence | numeric | YES | 0 |  |
| total_essence_earned | numeric | YES | 0 |  |
| spent_essence | numeric | YES | 0 |  |
| updated_at | timestamp with time zone | YES | now() |  |
| shard_balance | bigint | NO | 0 |  |
| total_shards_earned | bigint | NO | 0 |  |
| active_training_sessions | integer | NO | 0 |  |

**Foreign Keys:**
- `player_id` -> `players.id` (ON DELETE CASCADE)

## player_progress

**Rows:** 2

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| player_id | integer | NO |  | FK->players.id |
| character_id | integer | NO |  | UQ, FK->player_characters.id |
| book_number | integer | NO | 1 |  |
| chapter_number | integer | NO | 1 |  |
| scene_number | integer | NO | 1 |  |
| beat_number | integer | NO | 1 |  |
| created_at | timestamp with time zone | NO | now() |  |
| updated_at | timestamp with time zone | NO | now() |  |

**Foreign Keys:**
- `character_id` -> `player_characters.id` (ON DELETE CASCADE)
- `player_id` -> `players.id` (ON DELETE CASCADE)

## player_scene_records

**Rows:** 28

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| player_id | integer | NO |  | UQ, FK->players.id |
| scene_id | integer | NO |  | UQ, FK->scenes.id |
| best_wave | integer | NO | 0 |  |
| best_time_seconds | integer | YES |  |  |
| total_enemies_killed | bigint | NO | 0 |  |
| total_runs | integer | NO | 0 |  |
| first_completed_at | timestamp with time zone | YES |  |  |
| updated_at | timestamp with time zone | YES | now() |  |
| total_damage_dealt | bigint | NO | 0 |  |
| best_session_damage | bigint | NO | 0 |  |

**Foreign Keys:**
- `player_id` -> `players.id` (ON DELETE CASCADE)
- `scene_id` -> `scenes.id` (ON DELETE CASCADE)

## player_settings

**Rows:** 3

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| player_id | integer | NO |  | UQ, FK->players.id |
| audio_enabled | boolean | YES | true |  |
| music_volume | smallint | YES | 80 |  |
| sfx_volume | smallint | YES | 80 |  |
| narration_speed | numeric(2,1) | YES | 1.0 |  |
| updated_at | timestamp with time zone | YES | now() |  |
| narration_wpm | integer | YES | 200 |  |
| narration_font_size | integer | YES | 14 |  |
| narration_block_height | integer | YES | 50 |  |
| ui_scale | double precision | YES | 1.0 |  |
| game_text_scale | double precision | YES | 1.0 |  |
| master_volume | smallint | YES | 80 |  |
| master_muted | boolean | YES | false |  |
| chat_muted | boolean | NO | false |  |
| chat_muted_until | varchar(50) | YES | NULL |  |
| akashic_last_visited_at | timestamp with time zone | YES |  |  |
| gallery_last_visited_at | timestamp with time zone | YES |  |  |
| achievements_last_visited_at | timestamp with time zone | YES |  |  |

**Foreign Keys:**
- `player_id` -> `players.id` (ON DELETE CASCADE)

## player_shop_items

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| player_id | integer | NO |  | FK->players.id |
| shop_item_id | integer | YES |  | FK->shop_items.id |
| source_bundle_id | integer | YES |  | FK->shop_bundles.id |
| status | varchar(20) | NO | owned |  |
| purchased_at | timestamp with time zone | NO | now() |  |
| refunded_at | timestamp with time zone | YES |  |  |

**Foreign Keys:**
- `player_id` -> `players.id` (ON DELETE CASCADE)
- `shop_item_id` -> `shop_items.id` (ON DELETE SET NULL)
- `source_bundle_id` -> `shop_bundles.id` (ON DELETE SET NULL)

## player_story_sessions

**Rows:** 175

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | uuid | NO | uuid_generate_v4() | PK |
| player_id | integer | NO |  | FK->players.id |
| scene_id | integer | YES |  | FK->scenes.id |
| chapter_id | integer | YES |  |  |
| current_zone | integer | YES | 1 |  |
| current_wave | integer | YES | 1 |  |
| session_gold | numeric | YES | 0 |  |
| dark_ritual_multiplier | numeric | YES | 1.0 |  |
| audio_progress_pct | numeric | YES | 0 |  |
| required_waves_finished | boolean | YES | false |  |
| audio_finished | boolean | YES | false |  |
| is_active | boolean | YES | true |  |
| created_at | timestamp with time zone | YES | now() |  |
| updated_at | timestamp with time zone | YES | now() |  |
| narrative_progress_pct | numeric | YES | 0 |  |
| deaths | integer | NO | 0 |  |

**Foreign Keys:**
- `player_id` -> `players.id` (ON DELETE CASCADE)
- `scene_id` -> `scenes.id` (ON DELETE NO ACTION)

## player_subscriptions

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| player_id | integer | NO |  | FK->players.id |
| stripe_subscription_id | varchar(255) | YES | NULL |  |
| stripe_price_id | varchar(255) | YES | NULL |  |
| plan_key | varchar(30) | NO |  |  |
| status | varchar(20) | NO | active |  |
| source | varchar(20) | NO | stripe |  |
| subscription_start_date | timestamp with time zone | NO | now() |  |
| current_period_start | timestamp with time zone | NO |  |  |
| current_period_end | timestamp with time zone | NO |  |  |
| cancel_at_period_end | boolean | NO | false |  |
| continuous_streak | integer | NO | 0 |  |
| grace_period_start | timestamp with time zone | YES |  |  |
| grace_deadline | timestamp with time zone | YES |  |  |
| created_at | timestamp with time zone | NO | now() |  |
| updated_at | timestamp with time zone | NO | now() |  |

**Foreign Keys:**
- `player_id` -> `players.id` (ON DELETE CASCADE)

## player_titles

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| player_id | integer | NO |  | UQ, FK->players.id |
| title_id | integer | NO |  | UQ, FK->titles.id |
| earned_at | timestamp with time zone | NO | now() |  |

**Foreign Keys:**
- `player_id` -> `players.id` (ON DELETE CASCADE)
- `title_id` -> `titles.id` (ON DELETE CASCADE)

## players

**Rows:** 4

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| firebase_uid | varchar(128) | NO |  | UQ |
| email | varchar(255) | NO |  |  |
| google_display_name | varchar(255) | YES |  |  |
| google_avatar_url | text | YES |  |  |
| alias | varchar(20) | YES |  |  |
| custom_avatar_url | text | YES |  |  |
| avatar_preset_key | varchar(50) | YES |  |  |
| terms_accepted_at | timestamp with time zone | YES |  |  |
| is_banned | boolean | YES | false |  |
| banned_at | timestamp with time zone | YES |  |  |
| banned_by | varchar(255) | YES |  |  |
| ban_reason | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| last_login_at | timestamp with time zone | YES | now() |  |
| updated_at | timestamp with time zone | YES | now() |  |
| sessions_invalid_before | timestamp with time zone | YES |  |  |
| is_owner | boolean | YES | false |  |
| is_system_admin | boolean | YES | false |  |
| is_game_admin | boolean | YES | false |  |
| stripe_customer_id | varchar(255) | YES | NULL |  |
| first_purchase_claimed | boolean | NO | false |  |
| account_flag | varchar(30) | YES | NULL |  |
| is_ascendant | boolean | NO | false |  |
| cumulative_subscription_months | integer | NO | 0 |  |
| equipped_flair_id | integer | YES |  |  |
| equipped_badge_id | integer | YES |  |  |
| equipped_avatar_id | integer | YES |  |  |
| cumulative_donation_cents | integer | NO | 0 |  |
| patron_tier | varchar(20) | YES | NULL |  |
| patron_diamond_stars | integer | NO | 0 |  |
| donor_visibility | boolean | NO | false |  |
| marketplace_slots_purchased | integer | NO | 0 |  |

## processing_runs

**Rows:** 31

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| book_id | integer | NO |  | FK->books.id |
| phase | integer | NO |  |  |
| started_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| ended_at | timestamp with time zone | YES |  |  |
| status | varchar(50) | YES | running |  |
| last_completed_chapter_id | integer | YES |  | FK->chapters.id |
| claude_tokens_used | bigint | YES | 0 |  |
| gemini_tokens_used | bigint | YES | 0 |  |
| error_message | text | YES |  |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |

**Foreign Keys:**
- `book_id` -> `books.id` (ON DELETE CASCADE)
- `last_completed_chapter_id` -> `chapters.id` (ON DELETE NO ACTION)

## review_items

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| category | varchar(50) | NO |  |  |
| severity | varchar(20) | YES | info |  |
| title | varchar(500) | NO |  |  |
| description | text | YES |  |  |
| suggested_action | text | YES |  |  |
| affected_entity_id | integer | YES |  | FK->entities.id |
| affected_location_id | integer | YES |  | FK->locations.id |
| affected_scene_id | integer | YES |  | FK->scenes.id |
| affected_beat_id | integer | YES |  | FK->story_beats.id |
| review_status | varchar(50) | YES | pending_review |  |
| reviewer_notes | text | YES |  |  |
| reviewed_at | timestamp with time zone | YES |  |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |

**Foreign Keys:**
- `affected_beat_id` -> `story_beats.id` (ON DELETE SET NULL)
- `affected_entity_id` -> `entities.id` (ON DELETE SET NULL)
- `affected_location_id` -> `locations.id` (ON DELETE SET NULL)
- `affected_scene_id` -> `scenes.id` (ON DELETE SET NULL)

## scene_audio_sync

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| scene_id | integer | NO |  | UQ, FK->scenes.id |
| timestamp_seconds | integer | NO |  | UQ |
| asset_key | varchar(255) | NO |  |  |
| paragraph_index | integer | YES | 0 |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |

**Foreign Keys:**
- `scene_id` -> `scenes.id` (ON DELETE CASCADE)

## scene_gameplay_data

**Rows:** 580

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| scene_id | integer | NO |  | UQ, FK->scenes.id |
| required_time_seconds | integer | NO | 300 |  |
| background_sprite_key | varchar(100) | YES |  |  |
| is_boss_scene | boolean | YES | false |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| atmosphere_id | integer | YES |  | FK->atmospheres.id |
| background_id | integer | YES |  | FK->backgrounds.id |

**Foreign Keys:**
- `atmosphere_id` -> `atmospheres.id` (ON DELETE SET NULL)
- `background_id` -> `backgrounds.id` (ON DELETE SET NULL)
- `scene_id` -> `scenes.id` (ON DELETE CASCADE)

## scene_wave_configs

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| scene_id | integer | NO |  | UQ, FK->scenes.id |
| max_enemies_per_wave | integer | NO | 5 |  |
| wave_count | integer | NO | 10 |  |
| spawn_interval_ms | integer | NO | 2000 |  |
| scaling_factor | double precision | NO | 1.0 |  |
| hp_multiplier | double precision | NO | 1.0 |  |
| gold_multiplier | double precision | NO | 1.0 |  |
| entity_pool | jsonb | NO | [] |  |
| boss_entity_id | integer | YES |  | FK->entities.id |
| created_at | timestamp with time zone | NO | now() |  |
| updated_at | timestamp with time zone | NO | now() |  |

**Foreign Keys:**
- `boss_entity_id` -> `entities.id` (ON DELETE SET NULL)
- `scene_id` -> `scenes.id` (ON DELETE CASCADE)

## scenes

**Rows:** 724

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| chapter_id | integer | NO |  | UQ, FK->chapters.id |
| scene_number | integer | NO |  | UQ |
| title | varchar(255) | YES |  |  |
| summary | text | YES |  |  |
| raw_text | text | YES |  |  |
| sort_order | integer | NO |  |  |
| primary_location_id | integer | YES |  | FK->locations.id |
| has_hard_break | boolean | YES | false |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| scene_type | text | NO | normal |  |
| boss_config | jsonb | YES |  |  |

**Foreign Keys:**
- `chapter_id` -> `chapters.id` (ON DELETE CASCADE)
- `primary_location_id` -> `locations.id` (ON DELETE NO ACTION)

## semantic_tags

**Rows:** 6221

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| story_beat_id | integer | NO |  | FK->story_beats.id |
| category | varchar(50) | NO |  |  |
| value | varchar(100) | NO |  |  |
| canonical_value | varchar(100) | YES |  |  |
| notes | text | YES |  |  |
| ai_provider | varchar(50) | YES |  |  |
| ai_model_id | varchar(100) | YES |  |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |

**Foreign Keys:**
- `story_beat_id` -> `story_beats.id` (ON DELETE CASCADE)

## server_config

**Rows:** 17

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| key | varchar(100) | NO |  | PK |
| value | text | YES |  |  |
| value_type | varchar(20) | YES |  |  |
| category | varchar(50) | YES |  |  |
| description | text | YES |  |  |
| default_value | text | YES |  |  |
| updated_at | timestamp with time zone | YES | now() |  |
| updated_by | varchar(255) | YES |  |  |
| game_impact | text | YES |  |  |

## session_upgrades

**Rows:** 279

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | uuid | NO | uuid_generate_v4() | PK |
| session_id | uuid | YES |  | FK->player_story_sessions.id |
| upgrade_type | varchar(50) | NO |  |  |
| target_id | integer | YES |  |  |
| level | integer | YES | 0 |  |
| total_cost_paid | numeric | YES | 0 |  |
| current_multiplier | numeric | YES | 1.0 |  |

**Foreign Keys:**
- `session_id` -> `player_story_sessions.id` (ON DELETE CASCADE)

## shard_packages

**Rows:** 6

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| tier_key | varchar(30) | NO |  | UQ |
| name | varchar(100) | NO |  |  |
| description | varchar(255) | YES | NULL |  |
| price_cents | integer | NO |  |  |
| base_shards | integer | NO |  |  |
| bonus_pct | integer | NO | 0 |  |
| total_shards | integer | NO |  |  |
| sort_order | integer | NO | 0 |  |
| is_active | boolean | NO | true |  |
| is_best_value | boolean | NO | false |  |
| max_purchases_per_player | integer | YES |  |  |
| created_at | timestamp with time zone | NO | now() |  |
| updated_at | timestamp with time zone | NO | now() |  |

## shard_transactions

**Rows:** 1

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| player_id | integer | NO |  | FK->players.id |
| amount | bigint | NO |  |  |
| balance_after | bigint | NO |  |  |
| source_type | varchar(30) | NO |  |  |
| source_id | integer | YES |  |  |
| description | varchar(255) | YES |  |  |
| created_at | timestamp with time zone | NO | now() |  |

**Foreign Keys:**
- `player_id` -> `players.id` (ON DELETE CASCADE)

## shop_bundle_items

**Rows:** 9

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| bundle_id | integer | NO |  | UQ, FK->shop_bundles.id |
| shop_item_id | integer | NO |  | UQ, FK->shop_items.id |
| sort_order | integer | NO | 0 |  |

**Foreign Keys:**
- `bundle_id` -> `shop_bundles.id` (ON DELETE CASCADE)
- `shop_item_id` -> `shop_items.id` (ON DELETE CASCADE)

## shop_bundles

**Rows:** 3

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| bundle_key | varchar(60) | NO |  | UQ |
| name | varchar(100) | NO |  |  |
| description | text | YES |  |  |
| price_shards | integer | NO |  |  |
| original_price_shards | integer | NO |  |  |
| discount_pct | integer | NO | 20 |  |
| icon_asset_key | varchar(255) | YES | NULL |  |
| is_active | boolean | NO | true |  |
| is_featured | boolean | NO | false |  |
| featured_from | timestamp with time zone | YES |  |  |
| featured_until | timestamp with time zone | YES |  |  |
| available_from | timestamp with time zone | YES |  |  |
| available_until | timestamp with time zone | YES |  |  |
| sort_order | integer | NO | 0 |  |
| created_at | timestamp with time zone | NO | now() |  |
| updated_at | timestamp with time zone | NO | now() |  |

## shop_items

**Rows:** 45

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| item_key | varchar(60) | NO |  | UQ |
| name | varchar(100) | NO |  |  |
| description | text | YES |  |  |
| category | varchar(20) | NO |  |  |
| price_shards | integer | NO |  |  |
| icon_asset_key | varchar(255) | YES | NULL |  |
| class_restriction | integer | YES |  | FK->character_classes.id |
| item_metadata | jsonb | YES |  |  |
| is_active | boolean | NO | true |  |
| is_featured | boolean | NO | false |  |
| featured_from | timestamp with time zone | YES |  |  |
| featured_until | timestamp with time zone | YES |  |  |
| available_from | timestamp with time zone | YES |  |  |
| available_until | timestamp with time zone | YES |  |  |
| sort_order | integer | NO | 0 |  |
| created_at | timestamp with time zone | NO | now() |  |
| updated_at | timestamp with time zone | NO | now() |  |

**Foreign Keys:**
- `class_restriction` -> `character_classes.id` (ON DELETE SET NULL)

## silhouette_types

**Rows:** 6

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| name | text | NO |  | UQ |
| description | text | YES |  |  |
| body_shape | text | NO |  |  |
| body_ratio_w | real | YES | 1.0 |  |
| body_ratio_h | real | YES | 1.0 |  |
| corner_radius | real | YES | 0.1 |  |
| has_limbs | boolean | YES | false |  |
| limb_count | integer | YES | 0 |  |
| has_head | boolean | YES | false |  |
| has_wings | boolean | YES | false |  |
| has_weapon_slot | boolean | YES | false |  |
| has_eye_glow | boolean | YES | false |  |
| sub_unit_count | integer | YES | 1 |  |
| created_at | timestamptz | YES | now() |  |

## size_classes

**Rows:** 5

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| name | text | NO |  | UQ |
| description | text | YES |  |  |
| scale_min | real | NO |  |  |
| scale_max | real | NO |  |  |
| width_base | real | NO |  |  |
| height_base | real | NO |  |  |
| hitbox_radius | real | NO |  |  |
| hp_bar_width | real | NO |  |  |
| hp_bar_offset_y | real | YES | -8 |  |
| name_tag_visible | boolean | YES | true |  |
| sort_order | integer | YES | 0 |  |
| created_at | timestamptz | YES | now() |  |

## skill_actions

**Rows:** 47

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| skill_id | integer | NO |  | UQ, FK->skills.id |
| name | varchar(100) | NO |  | UQ |
| display_name | varchar(150) | NO |  |  |
| lore_description | text | NO |  |  |
| level_required | integer | NO | 1 |  |
| interval_ms | integer | NO | 3000 |  |
| xp_per_action | integer | NO | 10 |  |
| sort_order | integer | NO | 0 |  |
| created_at | timestamp with time zone | YES | now() |  |
| updated_at | timestamp with time zone | YES | now() |  |

**Foreign Keys:**
- `skill_id` -> `skills.id` (ON DELETE CASCADE)

## skill_prerequisites

**Rows:** 40

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| skill_id | integer | NO |  | FK->skills.id |
| prerequisite_type | varchar(30) | NO |  |  |
| ref_id | integer | YES |  |  |
| min_value | integer | NO | 1 |  |
| display_hint | text | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |

**Foreign Keys:**
- `skill_id` -> `skills.id` (ON DELETE CASCADE)

## skills

**Rows:** 18

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| name | varchar(100) | NO |  |  |
| category | varchar(50) | NO |  |  |
| description | text | YES |  |  |
| benefits_json | jsonb | YES | {} |  |
| xp_curve_type | varchar(50) | YES | standard |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| cooldown_type | varchar(20) | YES | individual |  |
| base_cooldown_seconds | integer | YES | 30 |  |
| base_cost_gold | numeric | YES | 100 |  |
| cost_scaling_factor | numeric | YES | 1.15 |  |
| unlock_scene_id | integer | YES |  | FK->scenes.id |
| unlock_display_text | text | YES |  |  |
| idle_flavor_title | varchar(100) | YES |  |  |
| updated_at | timestamp with time zone | YES | now() |  |
| display_name | varchar(100) | YES | NULL |  |
| level_0_xp_requirement | integer | NO | 0 |  |
| class_id | integer | YES |  | FK->character_classes.id |
| is_class_exclusive | boolean | NO | false |  |
| idle_level_scaling | jsonb | YES |  |  |
| effect_type | varchar(50) | YES | NULL |  |
| activate_sfx_key | varchar(100) | YES |  |  |

**Foreign Keys:**
- `class_id` -> `character_classes.id` (ON DELETE SET NULL)
- `unlock_scene_id` -> `scenes.id` (ON DELETE SET NULL)

## stat_definitions

**Rows:** 4

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| name | varchar(100) | NO |  | UQ |
| display_name | varchar(100) | NO |  |  |
| value_type | varchar(50) | NO |  |  |
| min_value | numeric | YES |  |  |
| max_value | numeric | YES |  |  |
| description | text | YES |  |  |
| category | varchar(50) | YES |  |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |

## story_beats

**Rows:** 2041

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| scene_id | integer | NO |  | UQ, FK->scenes.id |
| beat_number | integer | NO |  | UQ |
| summary | varchar(500) | YES |  |  |
| raw_text | text | YES |  |  |
| sort_order | integer | NO |  |  |
| location_id | integer | YES |  | FK->locations.id |
| intensity | smallint | YES |  |  |
| pacing | varchar(50) | YES |  |  |
| timeline_context | varchar(50) | YES |  |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |  |
| content_image_path | varchar(255) | YES | NULL |  |
| audio_path | varchar(255) | YES | NULL |  |
| audio_duration_seconds | integer | NO | 0 |  |
| hidden_lore_text | text | YES |  |  |
| lore_intelligence_threshold | integer | YES |  |  |

**Foreign Keys:**
- `location_id` -> `locations.id` (ON DELETE NO ACTION)
- `scene_id` -> `scenes.id` (ON DELETE CASCADE)

## stripe_webhook_events

**Rows:** 12

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| stripe_event_id | varchar(255) | NO |  | UQ |
| event_type | varchar(100) | NO |  |  |
| payload | jsonb | NO |  |  |
| processed | boolean | NO | false |  |
| processing_error | text | YES |  |  |
| created_at | timestamp with time zone | NO | now() |  |
| processed_at | timestamp with time zone | YES |  |  |

## subscription_stipend_log

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| subscription_id | integer | NO |  | UQ, FK->player_subscriptions.id |
| player_id | integer | NO |  | FK->players.id |
| period_key | varchar(7) | NO |  | UQ |
| shards_credited | integer | NO |  |  |
| stripe_invoice_id | varchar(255) | YES | NULL |  |
| period_start | timestamp with time zone | NO |  |  |
| created_at | timestamp with time zone | NO | now() |  |

**Foreign Keys:**
- `player_id` -> `players.id` (ON DELETE CASCADE)
- `subscription_id` -> `player_subscriptions.id` (ON DELETE CASCADE)

## support_attachments

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| ticket_id | integer | NO |  | FK->support_tickets.id |
| reply_id | integer | YES |  | FK->support_replies.id |
| file_name | varchar(255) | NO |  |  |
| file_path | text | NO |  |  |
| file_size | integer | NO |  |  |
| mime_type | varchar(100) | NO |  |  |
| uploaded_by | integer | YES |  | FK->players.id |
| created_at | timestamp with time zone | YES | now() |  |

**Foreign Keys:**
- `reply_id` -> `support_replies.id` (ON DELETE CASCADE)
- `ticket_id` -> `support_tickets.id` (ON DELETE CASCADE)
- `uploaded_by` -> `players.id` (ON DELETE SET NULL)

## support_replies

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| ticket_id | integer | NO |  | FK->support_tickets.id |
| author_type | varchar(10) | YES |  |  |
| author_id | integer | YES |  |  |
| author_email | varchar(255) | YES |  |  |
| content | text | NO |  |  |
| is_internal_note | boolean | YES | false |  |
| created_at | timestamp with time zone | YES | now() |  |

**Foreign Keys:**
- `ticket_id` -> `support_tickets.id` (ON DELETE CASCADE)

## support_tickets

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| player_id | integer | NO |  | FK->players.id |
| category | varchar(50) | YES |  |  |
| priority | varchar(20) | YES | normal |  |
| subject | varchar(100) | NO |  |  |
| status | varchar(20) | YES | open |  |
| assigned_admin | varchar(255) | YES |  |  |
| created_at | timestamp with time zone | YES | now() |  |
| updated_at | timestamp with time zone | YES | now() |  |
| resolved_at | timestamp with time zone | YES |  |  |
| closed_at | timestamp with time zone | YES |  |  |
| player_last_viewed_at | timestamp with time zone | YES |  |  |
| admin_last_viewed_at | timestamp with time zone | YES |  |  |

**Foreign Keys:**
- `player_id` -> `players.id` (ON DELETE CASCADE)

## titles

**Rows:** 39

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| name | varchar(100) | NO |  | UQ |
| display_format | varchar(10) | NO |  |  |
| sort_order | integer | NO | 0 |  |
| created_at | timestamp with time zone | NO | now() |  |
| achievement_id | integer | YES |  | FK->achievements.id |

**Foreign Keys:**
- `achievement_id` -> `achievements.id` (ON DELETE SET NULL)

## type_base_attack_types

**Rows:** 24

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| type_base_id | integer | NO |  | UQ, FK->item_type_bases.id |
| attack_type_id | integer | NO |  | UQ, FK->attack_types.id |
| created_at | timestamp without time zone | YES | now() |  |

**Foreign Keys:**
- `attack_type_id` -> `attack_types.id` (ON DELETE CASCADE)
- `type_base_id` -> `item_type_bases.id` (ON DELETE CASCADE)

## visual_behaviors

**Rows:** 5

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| name | varchar(50) | NO |  | UQ |
| display_name | varchar(100) | NO |  |  |
| description | text | YES |  |  |
| animation_config | jsonb | NO | {} |  |
| sort_order | integer | NO | 0 |  |
| created_at | timestamp with time zone | NO | now() |  |
| updated_at | timestamp with time zone | NO | now() |  |
| stat_weights | jsonb | YES |  |  |

## wave_preset_assignments

**Rows:** 0

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| wave_preset_id | integer | NO |  | FK->wave_presets.id |
| book_id | integer | YES |  | FK->books.id |
| chapter_id | integer | YES |  | FK->chapters.id |
| created_at | timestamp with time zone | NO | now() |  |
| updated_at | timestamp with time zone | NO | now() |  |

**Foreign Keys:**
- `book_id` -> `books.id` (ON DELETE CASCADE)
- `chapter_id` -> `chapters.id` (ON DELETE CASCADE)
- `wave_preset_id` -> `wave_presets.id` (ON DELETE CASCADE)

## wave_presets

**Rows:** 1

| Column | Type | Nullable | Default | Key |
|--------|------|----------|---------|-----|
| id | integer | NO | auto | PK |
| name | varchar(100) | NO |  | UQ |
| description | text | YES |  |  |
| config | jsonb | NO | {} |  |
| is_default | boolean | NO | false |  |
| sort_order | integer | NO | 0 |  |
| created_at | timestamp with time zone | NO | now() |  |
| updated_at | timestamp with time zone | NO | now() |  |
