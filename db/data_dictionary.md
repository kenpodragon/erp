# ERP Database Data Dictionary

This document serves as the single source of truth for the Elysium Rising mmorPg (ERP) database schema and its evolution.

---

## 🛠️ Maintenance Mandate
**CRITICAL:** Any change to the database schema, including new `.sql` migrations or manual updates to existing tables, **MUST** be reflected in this document immediately. 
- Update the **Migration History** section with a summary of the change.
- Update the **Current Schema Definition** section with new/modified tables or columns.

---

## 📜 Migration History

| Migration | Title | Summary of Changes |
| :--- | :--- | :--- |
| `001` | Initial Schema Consolidation | Consolidated all previous migrations (001-029) into a single schema initialization file. Covers narrative, player, character, and gameplay systems. |
| `002` | Initial Data Consolidation | Consolidated all initial seed data, character classes, artifacts, skills, and configurations into a single initialization file. |
| `034` | Dream Item System Schema | Created `gear_slots`, `item_prefixes`, `item_qualities`, `item_lore_tags`, `item_type_bases`, `item_suffixes` tables. Added dream item columns to `inventory_items`. Added `enforce_inventory_slot_cap` trigger on `player_inventory`. |
| `035` | Dream Item System Seed Data | Seeded 3 gear slots, 15 prefixes, 10 qualities, 15 lore tags, 16 type bases (6 weapons, 5 armor, 5 trinkets), 15 suffixes. Added `game_configs` keys: `run_achievement_config`, `rarity_weight_book_1/2/3`, `gear_slot_weights_combat/narrative`. |
| `036` | Game Configs Categorize | Categorized uncategorized `game_configs` entries and inserted missing economy configs (`gold_to_essence_base_rate`, `gold_to_essence_growth_factor`). |
| `037` | Content Expansion (2.4 CRUD) | Created `attack_types` (13 types), `entity_attack_types` junction, `type_base_attack_types` junction. Expanded `gear_slots` (3→16 MMORPG set). Expanded `benefit_effect_data` (13→60: 30 pos, 15 mixed, 15 neg). Expanded item components: prefixes (15→60), qualities (10→60), lore_tags (15→60), suffixes (15→60), type_bases (16→86, 5+ per slot). Added weapon→attack type mappings. Assigned entity attack types by entity_type. Updated `gear_slot_weights_combat/narrative` configs for 16 slots. |
| `038` | Combat Entity Attack Types | Assigned lore-appropriate attack types to 4 combat entities: Sludge Stalker (1: melee), Ether Voidling (1: void), Rust Guardian (3: melee/construct/thermal), Cosmic Remnant (5: akashic/void/gravitic/psychic/corruption). Re-added 4 missing benefit effects (golden_click_pct, dark_ritual_multiplier, energize_multiplier, reload_pct). |
| `039` | Audio & Music System | Created `atmospheres` and `audio_configs` tables. Added `atmosphere_id INTEGER FK atmospheres` to `books`, `chapters`, `scene_gameplay_data`. Added `unique_boss_theme_id INTEGER FK atmospheres` and `death_sfx_key VARCHAR(100)` to `entity_gameplay_data`. Added `activate_sfx_key VARCHAR(100)` to `skills`. Added `master_volume SMALLINT DEFAULT 80` and `master_muted BOOLEAN DEFAULT FALSE` to `player_settings`. Added `archetype_id INTEGER FK atmospheres` to `locations`. Data migration: `master_muted = NOT audio_enabled`. Seeded 13 atmosphere archetypes + 3 Training Grounds variations (16 rows), 11 SFX presets, 3 book-level atmosphere assignments. |
| `040` | Seed Music Definitions & Extended SFX | Populated `music_definitions` JSONB on all 16 existing atmosphere rows (13 archetypes + 3 training variations). Each definition contains 4 states: explore, combat, boss, mystery with oscillator sequences, drum patterns, and effects. Added 5 unique boss theme atmospheres (Boss: Pallid Mask, Tower Guardian, Void Entity, Glitch Lord, Final Ascent) with `archetype = NULL`. Added 6 extended SFX presets: `sfx_player_hit` (combat), `sfx_dark_ritual` (combat), `sfx_ui_hover` (ui), `sfx_ui_error` (ui), `sfx_beat_reveal` (narrative), `sfx_gold` (progression). Total atmospheres: 21. Total audio_configs: 17. |
| `041` | Anti-Cheat Configuration Seeds | Inserted 4 `game_configs` keys: `wave_validation_tolerance` (2.0), `session_gold_tolerance` (3.0), `cps_warning_threshold_seconds` (5), `cps_warning_cooldown_seconds` (10). Category: `anti-cheat`. |
| `042` | Discovery System Tables | Created `player_entity_discovery` table (per-player entity encounter/kill tracking with rank cache). Created `player_discovery_log` table (skill/item/effect discovery tracking). Added `entity_family VARCHAR(100)` column to `entities` table. Created indexes: `idx_ped_player`, `idx_ped_entity`, `idx_ped_player_rank`, `idx_pdl_player`, `idx_pdl_player_type`, `idx_entities_family`. |
| `043` | Discovery Configuration Seeds | Inserted 5 `game_configs` keys: `codex_rank_e` (1), `codex_rank_c` (25), `codex_rank_a` (100), `codex_rank_ss` (500), `rare_spawn_base_chance` (0.005). Category: `discovery`. |
| `044` | Chat System Tables & Configuration | Created `chat_channels` table (VARCHAR PK, multi-channel support). Seeded `global` channel. Inserted 5 `game_configs` keys: `chat_buffer_size` (200), `chat_rate_limit_per_minute` (20), `chat_heartbeat_interval_s` (30), `broadcast_rarity_min` (4), `broadcast_rate_limit_per_minute` (10). Category: `social`. |
| `045` | Chat Mute Columns | Added `chat_muted BOOLEAN NOT NULL DEFAULT FALSE` and `chat_muted_until VARCHAR(50) DEFAULT NULL` to `player_settings`. Supports admin mute/timed-mute of players from chat (REC 2.6.4). |
| `046` | Artifact System (Home Base 2.7) | Renamed `artifacts` → `artifacts_legacy`, `player_collections` → `player_collections_legacy`. Created 7 tables: `curated_artifacts`, `curated_artifact_tiers`, `artifact_type_bases`, `artifact_prefixes`, `artifact_suffixes`, `player_artifacts`, `shard_transactions`. Added columns to `story_beats` (hidden_lore_text, lore_intelligence_threshold), `player_scene_records` (total_damage_dealt, best_session_damage), `player_story_sessions` (deaths), `player_meta_progression` (shard_balance, total_shards_earned, active_training_sessions). Seeded 55 artifact components + 50 curated artifacts + 250 tier rows. Migrated legacy data. |
| `047` | Achievement & Title System (Home Base 2.7) | Created 4 tables: `titles`, `achievements`, `player_achievements`, `player_titles`. Added `equipped_title_id` FK to `player_characters`. Added `akashic_last_visited_at`, `gallery_last_visited_at`, `achievements_last_visited_at` to `player_settings`. Seeded 20 titles, 90 achievements with parent chains and title reward links. |
| `048` | Leaderboard Cache & Configs (Home Base 2.7) | Created `leaderboard_cache` table. Seeded 13 `game_configs` keys: 7 artifact generation configs, 2 leaderboard configs, 4 achievement milestone rewards. |

*Note: Individual migration history (001-029) has been archived in `db/old/` for historical reference.*

---

## 📊 Current Schema Definition

### 1. Narrative Engine (Book Data)

| Table | Description |
| :--- | :--- |
| `books` | Top-level container for the book series. Includes `transition_lore_text`. **2.4:** Added `recommended_level INTEGER` and `min_level INTEGER` for level-gated progression. **2.5:** Added `atmosphere_id INTEGER FK atmospheres` for book-wide audio fallback. |
| `chapters` | Chapters within a book, containing raw text and processing status. Includes `transition_lore_text`. **2.4:** Added `recommended_level INTEGER` and `min_level INTEGER` for level-gated progression. **2.5:** Added `atmosphere_id INTEGER FK atmospheres` for chapter-level audio. |
| `scenes` | Narrative nodes within chapters, linked to locations. Includes `scene_type` and `boss_config`. |
| `story_beats` | The smallest narrative units within a scene. Includes `content_image_path`, `audio_path`, and `audio_duration_seconds`. |
| `locations` | Master list of canonical locations within the Tower. **2.5:** Added `archetype_id INTEGER FK atmospheres` for atmosphere classification. |
| `entities` | Master list of characters, enemies, and neutral figures from the lore. |
| `entity_aliases` | Alternate names or titles for entities. |
| `entity_scene_appearances` | Tracks which entities appear in which scenes and their roles. |
| `entity_beat_appearances` | Tracks entity presence at the beat level for precise sync. |
| `location_aliases` | Alternate names for locations. |
| `location_scene_appearances` | Atmosphere and visual deltas for locations within specific scenes. |
| `semantic_tags` | AI-extracted metadata (emotions, sounds, objects) for story beats. |

### 2. Processing & AI Workflow

| Table | Description |
| :--- | :--- |
| `processing_runs` | Tracks the history and status of automated book parsing jobs. |
| `review_items` | Queued items for manual admin review (missing lore, parsing errors). |

### 3. Player & Account Systems

| Table | Description |
| :--- | :--- |
| `players` | Core user account data, roles (`is_owner`, `is_system_admin`, `is_game_admin`), and status. |
| `player_settings` | User-specific preferences (volume, speed, audio toggles, font size, UI scale). **2.5:** Added `master_volume SMALLINT DEFAULT 80` (0-100) and `master_muted BOOLEAN DEFAULT FALSE`. Note: `audio_enabled` is deprecated in favor of `master_muted`. **2.6:** Added `chat_muted BOOLEAN DEFAULT FALSE` and `chat_muted_until VARCHAR(50)` for admin chat mute support. |
| `character_classes` | Definitions for player classes (Engineer, Conduit, Drifter, Vessel). **2.4:** Added `visual_config JSONB` for class visual identity (colors, avatar, particles, PixiJS tints). |
| `player_characters` | Instances of characters owned by players, tracking level and stats. **2.4:** Added `character_xp BIGINT DEFAULT 0`. Deprecated columns: `strength`, `agility`, `intelligence` (use `character_stats` table instead). |

### 4. Core Character State (Live)

| Table | Description |
| :--- | :--- |
| `player_progress` | The current "Save Point" for a character's narrative journey. |
| `player_essence` | Live currency balance and passive generation rates for a character. |
| `player_meta_progression` | Permanent currency (Elysium Essence) and meta-stats earned from active play. |

### 5. Game Mechanics (Loop 2.0 & Story Mode)

| Table | Description |
| :--- | :--- |
| `scene_gameplay_data` | Gameplay-specific metadata for scenes (required time, background sprite). **2.5:** Added `atmosphere_id INTEGER FK atmospheres` for scene-level audio. |
| `entity_gameplay_data` | Gameplay-specific stats for entities (HP, gold, sprite key). **2.5:** Added `unique_boss_theme_id INTEGER FK atmospheres` for boss music override and `death_sfx_key VARCHAR(100)` referencing `audio_configs.config_key`. |
| `player_story_sessions` | Active combat session state (zone, wave, gold, progress). |
| `session_upgrades` | Temporary upgrades purchased during a Story Mode run. |
| `boss_completions` | Tracks unique boss kills per player for gating and rewards. |
| `scene_audio_sync` | Mapping of audio timestamps to assets (currently unused). |

### 6. Inventory & Collections

| Table | Description |
| :--- | :--- |
| `inventory_items` | Master templates for equipment, consumables, and materials. **2.4.2:** Added `item_code VARCHAR(60)` (5-part procedural code: PREFIX_QUALITY_LORETAG_TYPE_SUFFIX), `item_level INTEGER DEFAULT 1` (power level capped at chapter.recommended_level), `min_char_level INTEGER DEFAULT 1` (minimum character level to equip), `stat_requirements JSONB DEFAULT '{}'` (minimum stat values to equip), `gear_slot_id INTEGER FK gear_slots` (which gear slot this item occupies), `is_dream_item BOOLEAN DEFAULT FALSE` (TRUE for procedurally generated items), `acquired_from VARCHAR(100)` (source context: 'dream_drop', 'admin_grant', etc.). |
| `player_inventory` | Instances of items owned and equipped by characters. **2.4.2:** New trigger `trg_enforce_inventory_slot_cap` enforces max 10 non-equipped items per character. |
| `artifacts_legacy` | *(Renamed from `artifacts` in 046)* Original lore-based items providing global passive bonuses. Superseded by `curated_artifacts` + `player_artifacts`. |
| `player_collections_legacy` | *(Renamed from `player_collections` in 046)* Original tracking of uncovered artifacts. Superseded by `player_artifacts`. |

### 7. Skills & Training (2.3)

| Table | Description |
| :--- | :--- |
| `stat_definitions` | Definitions for core and dynamic character/enemy stats. |
| `benefit_effect_data` | Metadata for skill and item effects (multipliers, additions). |
| `skills` | Definitions for active and passive skills, including cooldowns, costs, and unlock gates. **2.4:** Added `display_name VARCHAR(100)`, `level_0_xp_requirement INTEGER`, `class_id INTEGER FK character_classes`, `is_class_exclusive BOOLEAN`, `idle_level_scaling JSONB`, `effect_type VARCHAR(50)`. **2.5:** Added `activate_sfx_key VARCHAR(100)` referencing `audio_configs.config_key`. |
| `skill_actions` | Catalog of trainable sub-actions within each idle skill (XP, interval, lore). |
| `character_skill_levels` | Per-character skill XP and level. Tracks active idle training state. **2.4:** Added `max_session_level INTEGER DEFAULT 0`. |
| `dev_content_audit` | Auto-logged entries for missing assets or stats detected during gameplay. |

### 8. Support & Administration

| Table | Description |
| :--- | :--- |
| `support_tickets` | Player-submitted help requests and bug reports. |
| `support_replies` | Conversations within support tickets (player and admin). |
| `support_attachments` | Files uploaded to support tickets. |
| `admin_whitelist_emails` | Email-based access control for the Admin Panel. |
| `admin_whitelist_ips` | IP-based access control for the Admin Panel. |
| `server_config` | **Operational/admin settings** (maintenance mode, rate limits). **2.4:** Added `game_impact TEXT`. |
| `game_configs` | **Game-specific tuning** (scaling factors, caps, rates). **2.4:** Added `category VARCHAR(50)`, `game_impact TEXT`, `updated_by INTEGER FK players`. |
| `activity_events` | Granular player activity log for anti-cheat and analytics. |
| `admin_audit_log` | Detailed log of all administrative actions. |

### 9. Character Progression (2.4)

| Table | Description |
| :--- | :--- |
| `idle_skill_stat_contributions` | Maps idle skills to the stats they contribute to. Columns: `idle_skill_id INTEGER FK skills`, `stat_id INTEGER FK stat_definitions`, `coefficient NUMERIC(6,4)`, `description TEXT`. Determines how idle skill levels feed into computed character stats. |
| `class_stat_affinities` | Per-class per-stat configuration defining baseline values and scaling. Columns: `class_id INTEGER FK character_classes`, `stat_id INTEGER FK stat_definitions`, `base_value INTEGER`, `lore_weight NUMERIC`, `level_bonus_per_level NUMERIC`. Controls how each class grows differently per stat. |
| `character_stats` | Computed and cached stat totals for each character. Columns: `character_id INTEGER FK player_characters`, `stat_id INTEGER FK stat_definitions`, `computed_total INTEGER`, `last_computed_at TIMESTAMP`. Replaces deprecated inline stat columns on `player_characters`. |
| `player_scene_records` | Per-player per-scene personal bests and run statistics. Columns: `player_id INTEGER FK players`, `scene_id INTEGER FK scenes`, `best_wave INTEGER`, `best_time_seconds INTEGER`, `total_enemies_killed BIGINT`, `total_runs INTEGER`, `first_completed_at TIMESTAMP`. |
| `skill_prerequisites` | Unified prerequisite tree for skill unlocks. Columns: `skill_id INTEGER FK skills`, `prerequisite_type VARCHAR(30)` (CHECK IN: `idle_skill_level`, `active_skill_level`, `stat_value`, `character_level`, `scene_cleared`), `ref_id INTEGER`, `min_value INTEGER`, `display_hint TEXT`. Flexible gating system for both active and idle skills. |

### 10. Dream Item System (2.4.2)

| Table | Description |
| :--- | :--- |
| `gear_slots` | Defines equippable gear slots. **037:** Expanded from 3 (weapon, armor, trinket) to 16 MMORPG slots (head, neck, shoulders, chest, hands, wrist_1, wrist_2, finger_1, finger_2, legs, feet, main_hand, off_hand, back, trinket, waist). Renamed: weapon→main_hand, armor→chest. Columns: `id SERIAL PK`, `name VARCHAR(50) UNIQUE`, `display_name VARCHAR(100)`, `description TEXT`, `sort_order INTEGER`, `created_at TIMESTAMPTZ`. |
| `item_prefixes` | Adjective flavor components for procedural item names. Contributes stat bonuses. Columns: `id SERIAL PK`, `code VARCHAR(8) UNIQUE`, `display_name VARCHAR(50)`, `stat_bonuses JSONB` (e.g. `{"strength": 2, "agility": 1}`), `lore_reference TEXT`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`. **Trigger:** `trg_item_prefixes_updated_at` auto-sets `updated_at` on UPDATE. **037:** Expanded from 15 to 60 (30 positive, 15 neutral/mixed with negative stat tradeoffs, 15 negative). |
| `item_qualities` | Name-only flavor descriptors with no stat effect. Cosmetic/narrative component. Columns: `id SERIAL PK`, `code VARCHAR(8) UNIQUE`, `display_name VARCHAR(50)`, `lore_reference TEXT`, `created_at TIMESTAMPTZ`. **037:** Expanded from 10 to 60 (30 positive, 15 neutral/mixed, 15 negative). |
| `item_lore_tags` | Middle lore-name component for item naming. Columns: `id SERIAL PK`, `code VARCHAR(8) UNIQUE`, `display_name VARCHAR(50)`, `narrative_context TEXT`, `created_at TIMESTAMPTZ`. **037:** Expanded from 15 to 60 (30 positive, 15 neutral, 15 negative). |
| `item_type_bases` | Core item types per gear slot with stat ranges for procedural generation. Columns: `id SERIAL PK`, `code VARCHAR(8) UNIQUE`, `display_name VARCHAR(50)`, `gear_slot_id INTEGER FK gear_slots`, `base_stat_range JSONB`, `lore_reference TEXT`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`. **037:** Expanded from 16 to 86 types: 5+ per gear slot, 15 weapons (3+ per attack type), additional chest/trinket types. |
| `item_suffixes` | Suffix name components ("of the Ascendant") with stat bonuses. Columns: `id SERIAL PK`, `code VARCHAR(8) UNIQUE`, `display_name VARCHAR(100)`, `stat_bonuses JSONB`, `lore_reference TEXT`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`. **037:** Expanded from 15 to 60 (30 positive, 15 neutral/mixed, 15 negative). |

#### Dream Item `game_configs` Keys (seeded in 035)

| Key | Category | Description |
| :--- | :--- | :--- |
| `run_achievement_config` | `drops` | JSON array of run achievements that can trigger dream item drops. Each entry defines `id`, `display` name, `description`, `threshold_type` (e.g. `completion_time_seconds`, `enemies_killed`, `max_wave_reached`, `death_count`, `boss_killed`, `personal_best_wave`), `threshold_value`, and `drop_chance_pct`. 6 achievements seeded: Swift Passage, Enemy Slayer, Wave Climber, Flawless Execution, Boss Slayer, High Tide. |
| `rarity_weight_book_1` | `drops` | Rarity distribution weights for Book 1 dream items: common 60, uncommon 25, rare 10, epic 4, cosmic 1. |
| `rarity_weight_book_2` | `drops` | Rarity distribution weights for Book 2 dream items: common 50, uncommon 27, rare 14, epic 7, cosmic 2. |
| `rarity_weight_book_3` | `drops` | Rarity distribution weights for Book 3 dream items: common 40, uncommon 28, rare 18, epic 10, cosmic 4. |
| `gear_slot_weights_combat` | `drops` | Gear slot selection weights for combat scenes. **037:** Updated for 16 slots (main_hand 20, chest 10, head 8, legs 8, off_hand 10, etc.). |
| `gear_slot_weights_narrative` | `drops` | Gear slot selection weights for narrative scenes. **037:** Updated for 16 slots (trinket 8, main_hand 10, head 8, etc.). |

### 11. Attack Type System (2.4 Content CRUD, Migration 037)

| Table | Description |
| :--- | :--- |
| `attack_types` | Combat attack type definitions. Columns: `id SERIAL PK`, `name VARCHAR(50) UNIQUE`, `display_name VARCHAR(100)`, `description TEXT`, `is_physical BOOLEAN DEFAULT FALSE`, `lore_reference TEXT`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`. Seeded with 13 types: melee, ranged, akashic, aerial, psychic, nanite, phase, void, resonance, construct, thermal, gravitic, corruption. |
| `entity_attack_types` | Many-to-many junction: entities to attack types. Columns: `id SERIAL PK`, `entity_id INTEGER FK entities ON DELETE CASCADE`, `attack_type_id INTEGER FK attack_types ON DELETE CASCADE`, `is_primary BOOLEAN DEFAULT FALSE`, `created_at TIMESTAMPTZ`. UNIQUE constraint on `(entity_id, attack_type_id)`. |
| `type_base_attack_types` | Many-to-many junction: item type bases to attack types (for weapons). Columns: `id SERIAL PK`, `type_base_id INTEGER FK item_type_bases ON DELETE CASCADE`, `attack_type_id INTEGER FK attack_types ON DELETE CASCADE`, `created_at TIMESTAMPTZ`. UNIQUE constraint on `(type_base_id, attack_type_id)`. |

### Benefit Effect Expansion (Migration 037)

**037:** `benefit_effect_data` expanded from 13 to 60 entries:
- **30 positive:** Original 13 + health_regen, shield_strength, dodge_chance, xp_bonus, cooldown_reduction, damage_resistance, movement_speed, attack_speed_bonus, lifesteal_pct, multi_hit_chance, essence_efficiency, idle_xp_bonus, wave_skip_chance, boss_damage_bonus, drop_quality_bonus, nano_repair_rate, akashic_insight.
- **15 neutral/mixed:** phase_shift, overcharge, temporal_flux, resonance_feedback, nanite_swarm_aura, void_echo, dream_state, substrate_merge, entropy_field, quantum_uncertainty, parasitic_link, memory_blur, conduit_overflow, graviton_pulse, threshold_instability.
- **15 negative:** corruption_spread, essence_leak, sight_obscured, temporal_stasis, void_sickness, nanite_malfunction, prison_weight, akashic_static, dream_collapse, construct_aggro, etheris_decay, red_hat_sabotage, demiurge_notice, reality_fracture, system_audit.

### 12. Audio & Music System (2.5, Migration 039)

| Table | Description |
| :--- | :--- |
| `atmospheres` | Themed Web Audio API synthesis definitions for procedural music. Columns: `id SERIAL PK`, `name VARCHAR(255) UNIQUE`, `archetype VARCHAR(100)` (one of 13 archetype names; NULL for unique boss themes), `description TEXT`, `music_definitions JSONB` (keys: explore, combat, boss, mystery — each contains oscillator configs, sequences, drum patterns), `generator_bpm INTEGER`, `generator_key VARCHAR(10)`, `generator_scale VARCHAR(50)`, `generator_complexity INTEGER` (1-10), `generator_seed INTEGER`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`. **039:** Seeded with 13 archetypes + 3 Training Grounds variations = 16 rows. **040:** Populated all `music_definitions`, added 5 unique boss themes (archetype=NULL) = 21 total rows. |
| `audio_configs` | Global SFX preset definitions for Web Audio API synthesis. Columns: `id SERIAL PK`, `config_key VARCHAR(100) UNIQUE` (e.g. 'sfx_click', 'sfx_crit'), `category VARCHAR(50)` ('combat', 'progression', 'ui', 'fanfare', 'narrative'), `display_name VARCHAR(100)`, `preset_definition JSONB` (oscillator/envelope params), `base_volume FLOAT` (0.0-1.0), `pitch_variation FLOAT` (max random shift), `spatial_enabled BOOLEAN` (stereo panning), `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`. **039:** Seeded with 11 core SFX presets. **040:** Added 6 extended SFX = 17 total presets. |

**Atmosphere Resolution Hierarchy:** Boss Override (`entity_gameplay_data.unique_boss_theme_id`) > Scene (`scene_gameplay_data.atmosphere_id`) > Chapter (`chapters.atmosphere_id`) > Book (`books.atmosphere_id`) > Global Default (Mundane Dread, logged to `dev_content_audit`).

**Volume Calculation:** `master_volume/100 * category_volume/100 * preset.base_volume`. If `master_muted = TRUE`, all output is 0.

---

### Discovery & Chat System (2.6)

| Table | Description |
| :--- | :--- |
| `player_entity_discovery` | Per-player, per-entity encounter and kill tracking with ranked reveal. Columns: `id SERIAL PK`, `player_id INTEGER FK players`, `entity_id INTEGER FK entities`, `encounters INTEGER DEFAULT 0`, `kills INTEGER DEFAULT 0`, `rank VARCHAR(2)` (NULL/E/C/A/SS — denormalized cache), `first_seen_at TIMESTAMPTZ`, `is_new BOOLEAN DEFAULT TRUE`. UNIQUE constraint on `(player_id, entity_id)`. Indexes: `idx_ped_player`, `idx_ped_entity`, `idx_ped_player_rank`. |
| `player_discovery_log` | Tracks discovered skills, item components, and effects. Columns: `id SERIAL PK`, `player_id INTEGER FK players`, `discovery_type VARCHAR(20)` ('skill', 'item_prefix', 'item_suffix', 'item_quality', 'lore_tag', 'effect'), `reference_id INTEGER` (app-level FK to relevant table), `discovered_at TIMESTAMPTZ`, `is_new BOOLEAN DEFAULT TRUE`. UNIQUE constraint on `(player_id, discovery_type, reference_id)`. Indexes: `idx_pdl_player`, `idx_pdl_player_type`. |
| `chat_channels` | Chat channel metadata. Messages are in-memory only (not persisted). Columns: `id VARCHAR(50) PK`, `name VARCHAR(100)`, `channel_type VARCHAR(20) DEFAULT 'global'` ('global', 'chapter', 'book', 'custom'), `is_active BOOLEAN DEFAULT TRUE`, `created_at TIMESTAMPTZ`, `created_by INTEGER FK players ON DELETE SET NULL`. Default seed: `global` channel. |

**Column Additions (2.6):**
- `entities.entity_family VARCHAR(100)` — Species/family grouping (e.g., 'Wraith', 'Golem'). Populated via `tools/classify_entity_families.py`. NULL = standalone entry in Codex. Index: `idx_entities_family`.

**Codex Rank Thresholds** (from `game_configs`, category: `discovery`): E=1 kill, C=25, A=100, SS=500. Rank determines what info is visible: E=name+image+lore, C=+HP/gold, A=+full stats, SS=+hidden lore.

**Anti-Cheat Anomaly Logging:** Anomalies logged to `activity_events` with `event_type = 'anti_cheat_anomaly'`. `event_data` JSONB contains: `anomaly_type` (cps_violation, gold_correction, wave_clamp, session_integrity), `session_id`, `reported_value`, `corrected_value`, `zone`, `elapsed_ms`.

---

### 13. Home Base Artifact System (2.7, Migration 046)

| Table | Description |
| :--- | :--- |
| `curated_artifacts` | Hand-designed lore artifacts with fixed identities. Columns: `id SERIAL PK`, `name VARCHAR(200) NOT NULL`, `description TEXT`, `lore_text TEXT`, `icon_sprite_key VARCHAR(100)`, `source_type VARCHAR(30)` CHECK IN ('boss', 'mastery', 'quest', 'event', 'hidden'), `source_id INTEGER` (app-level FK to source entity), `source_hint VARCHAR(200)`, `base_drop_chance NUMERIC(5,4) DEFAULT 0.0500`, `is_active BOOLEAN DEFAULT TRUE`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`. 50 curated artifacts seeded across 5 source types. |
| `curated_artifact_tiers` | Per-rarity stat definitions for curated artifacts. Columns: `id SERIAL PK`, `curated_artifact_id INTEGER FK curated_artifacts ON DELETE CASCADE`, `rarity VARCHAR(10)` CHECK IN ('common', 'uncommon', 'rare', 'epic', 'cosmic'), `stat_bonuses JSONB NOT NULL DEFAULT '{}'`, `drop_chance_multiplier NUMERIC(5,4) DEFAULT 1.0`, `created_at TIMESTAMPTZ`. UNIQUE on `(curated_artifact_id, rarity)`. 250 tier rows seeded (5 per artifact). |
| `artifact_type_bases` | Core artifact types for procedural generation (e.g., Shard, Prism, Sigil). Columns: `id SERIAL PK`, `code VARCHAR(20) UNIQUE NOT NULL`, `display_name VARCHAR(100) NOT NULL`, `base_stat_range JSONB NOT NULL DEFAULT '{}'`, `lore_reference TEXT`, `created_at TIMESTAMPTZ`. 15 types seeded. |
| `artifact_prefixes` | Prefix name components for generated artifacts (e.g., Fractured, Luminous). Columns: `id SERIAL PK`, `code VARCHAR(20) UNIQUE NOT NULL`, `display_name VARCHAR(100) NOT NULL`, `stat_bonuses JSONB NOT NULL DEFAULT '{}'`, `lore_reference TEXT`, `created_at TIMESTAMPTZ`. 20 prefixes seeded. |
| `artifact_suffixes` | Suffix name components for generated artifacts (e.g., of the Void, of the Tower). Columns: `id SERIAL PK`, `code VARCHAR(20) UNIQUE NOT NULL`, `display_name VARCHAR(100) NOT NULL`, `stat_bonuses JSONB NOT NULL DEFAULT '{}'`, `lore_reference TEXT`, `created_at TIMESTAMPTZ`. 20 suffixes seeded. |
| `player_artifacts` | Artifacts owned by player characters (both curated and generated). Columns: `id SERIAL PK`, `player_id INTEGER FK players ON DELETE CASCADE`, `character_id INTEGER FK player_characters ON DELETE CASCADE`, `artifact_type VARCHAR(20) NOT NULL` CHECK IN ('curated', 'generated'), `curated_artifact_id INTEGER FK curated_artifacts` (NULL for generated), `artifact_code VARCHAR(100)` (NULL for curated; PREFIX_TYPE_SUFFIX for generated), `name VARCHAR(200) NOT NULL`, `rarity VARCHAR(10) NOT NULL` CHECK IN ('common', 'uncommon', 'rare', 'epic', 'cosmic'), `icon_sprite_key VARCHAR(100)`, `stat_bonuses JSONB NOT NULL DEFAULT '{}'`, `is_new BOOLEAN DEFAULT TRUE`, `acquired_from VARCHAR(100)`, `acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`. UNIQUE on `(character_id, artifact_type, curated_artifact_id)` and `(character_id, artifact_code)`. |
| `shard_transactions` | Premium currency audit trail for future 3.0 monetization. Columns: `id SERIAL PK`, `player_id INTEGER FK players ON DELETE CASCADE`, `amount INTEGER NOT NULL`, `balance_after INTEGER NOT NULL`, `transaction_type VARCHAR(30) NOT NULL` CHECK IN ('purchase', 'reward', 'spend', 'refund', 'admin_grant', 'admin_deduct'), `reference_type VARCHAR(50)`, `reference_id INTEGER`, `description TEXT`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`. Index on `(player_id, created_at DESC)`. |

**Legacy Table Renames (046):**
- `artifacts` → `artifacts_legacy` (original lore artifact definitions)
- `player_collections` → `player_collections_legacy` (original player artifact tracking)

**Column Additions (046):**
- `story_beats.hidden_lore_text TEXT` — Hidden lore revealed at high Intelligence thresholds.
- `story_beats.lore_intelligence_threshold INTEGER` — Minimum Intelligence stat to reveal hidden lore.
- `player_scene_records.total_damage_dealt BIGINT DEFAULT 0` — Cumulative damage across all runs.
- `player_scene_records.best_session_damage BIGINT DEFAULT 0` — Highest single-session damage.
- `player_story_sessions.deaths INTEGER DEFAULT 0` — Death count in current session.
- `player_meta_progression.shard_balance INTEGER DEFAULT 0` — Current premium currency balance.
- `player_meta_progression.total_shards_earned INTEGER DEFAULT 0` — Lifetime shards earned.
- `player_meta_progression.active_training_sessions INTEGER DEFAULT 0` — Currently running idle sessions.

**Artifact Generation Pipeline:** Prefix + TypeBase + Suffix → artifact_code (e.g., `FRACT_SHARD_VOID`). Base stats rolled from type's `base_stat_range`, then prefix/suffix bonuses added, then rarity multiplier applied. Rarity weighted by book number (`artifact_rarity_weight_book_N`). Higher rarity replaces lower; same/lower rarity discarded. Chapter mastery (all non-boss scenes completed) triggers mastery drop chance.

**Artifact Stat Integration:** `recalculate_character_stats()` includes artifact bonuses as step 6 (additive stacking from all `player_artifacts` for the character).

### 14. Achievement & Title System (2.7, Migration 047)

| Table | Description |
| :--- | :--- |
| `titles` | Earnable display titles for player characters. Columns: `id SERIAL PK`, `code VARCHAR(50) UNIQUE NOT NULL`, `display_text VARCHAR(100) NOT NULL`, `title_type VARCHAR(10) NOT NULL` CHECK IN ('prefix', 'suffix'), `description TEXT`, `achievement_id INTEGER FK achievements` (which achievement grants this title), `rarity VARCHAR(10) DEFAULT 'common'` CHECK IN ('common', 'uncommon', 'rare', 'epic', 'cosmic'), `is_active BOOLEAN DEFAULT TRUE`, `created_at TIMESTAMPTZ`. 20 titles seeded. |
| `achievements` | Achievement definitions with tiered parent chains. Columns: `id SERIAL PK`, `code VARCHAR(100) UNIQUE NOT NULL`, `name VARCHAR(200) NOT NULL`, `description TEXT`, `category VARCHAR(30) NOT NULL` CHECK IN ('combat', 'narrative', 'economics', 'idle', 'discovery'), `parent_id INTEGER FK achievements` (self-referencing for tier chains), `tier INTEGER DEFAULT 1`, `threshold_type VARCHAR(50) NOT NULL`, `threshold_value NUMERIC(15,2) NOT NULL`, `reward_essence INTEGER DEFAULT 0`, `reward_title_id INTEGER FK titles`, `icon_sprite_key VARCHAR(100)`, `is_hidden BOOLEAN DEFAULT FALSE`, `is_active BOOLEAN DEFAULT TRUE`, `sort_order INTEGER DEFAULT 0`, `created_at TIMESTAMPTZ`. 90 achievements seeded across 5 categories with parent chains. |
| `player_achievements` | Tracks which achievements each player has earned. Columns: `id SERIAL PK`, `player_id INTEGER FK players ON DELETE CASCADE`, `achievement_id INTEGER FK achievements ON DELETE CASCADE`, `progress NUMERIC(15,2) DEFAULT 0`, `earned_at TIMESTAMPTZ`, `is_new BOOLEAN DEFAULT TRUE`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`. UNIQUE on `(player_id, achievement_id)`. |
| `player_titles` | Tracks which titles each character has unlocked. Columns: `id SERIAL PK`, `player_id INTEGER FK players ON DELETE CASCADE`, `character_id INTEGER FK player_characters ON DELETE CASCADE`, `title_id INTEGER FK titles ON DELETE CASCADE`, `unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`. UNIQUE on `(character_id, title_id)`. |

**Column Addition (047):**
- `player_characters.equipped_title_id INTEGER FK titles` — Currently equipped display title.

**Column Additions (047, player_settings):**
- `player_settings.akashic_last_visited_at TIMESTAMPTZ` — Last visit to Akashic Log tab.
- `player_settings.gallery_last_visited_at TIMESTAMPTZ` — Last visit to Relic Gallery tab.
- `player_settings.achievements_last_visited_at TIMESTAMPTZ` — Last visit to Achievements tab.

### 15. Leaderboard Cache & Additional Configs (2.7, Migration 048)

| Table | Description |
| :--- | :--- |
| `leaderboard_cache` | Pre-computed server-side rankings. Columns: `id SERIAL PK`, `category VARCHAR(20) NOT NULL` CHECK IN ('vanguard', 'alchemist', 'swift', 'scholar'), `rank INTEGER NOT NULL`, `player_id INTEGER FK players ON DELETE CASCADE`, `player_alias VARCHAR(100) NOT NULL`, `character_class VARCHAR(50)`, `character_level INTEGER`, `equipped_title VARCHAR(100)`, `metric_value NUMERIC(15,2) NOT NULL`, `badge_tier VARCHAR(10)` CHECK IN ('cosmic', 'gold', 'silver', 'bronze'), `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`. UNIQUE on `(category, rank)`. Indexes: `idx_leaderboard_category`, `idx_leaderboard_player`. |

#### Home Base `game_configs` Keys (seeded in 048)

| Key | Category | Description |
| :--- | :--- | :--- |
| `artifact_gen_drop_chance_scene` | `artifacts` | Base drop chance (0.05) for generated artifact on scene complete. |
| `artifact_gen_drop_chance_boss` | `artifacts` | Base drop chance (0.15) for generated artifact on boss kill. |
| `artifact_gen_drop_chance_mastery` | `artifacts` | Base drop chance (0.30) for generated artifact on chapter mastery. |
| `artifact_rarity_weight_book_1` | `artifacts` | Rarity weights for generated artifacts in Book 1: common 70, uncommon 20, rare 8, epic 1.8, cosmic 0.2. |
| `artifact_rarity_weight_book_2` | `artifacts` | Rarity weights for generated artifacts in Book 2: common 60, uncommon 25, rare 11, epic 3.5, cosmic 0.5. |
| `artifact_rarity_weight_book_3` | `artifacts` | Rarity weights for generated artifacts in Book 3: common 50, uncommon 27, rare 15, epic 6, cosmic 2. |
| `artifact_rarity_stat_multiplier` | `artifacts` | Stat multiplier per rarity: common 1.0, uncommon 1.2, rare 1.5, epic 2.0, cosmic 3.0. |
| `leaderboard_refresh_interval_min` | `leaderboard` | Minutes between leaderboard cache refresh (5). |
| `leaderboard_top_n` | `leaderboard` | Number of entries to cache per category (100). |
| `achievement_milestone_essence_25` | `achievements` | Essence reward for Level 25 idle training milestone (50). |
| `achievement_milestone_essence_50` | `achievements` | Essence reward for Level 50 idle training milestone (200). |
| `achievement_milestone_essence_75` | `achievements` | Essence reward for Level 75 idle training milestone (500). |
| `achievement_milestone_essence_99` | `achievements` | Essence reward for Level 99 idle training milestone (2000). |

---

*(Note: For specific column metadata and types, refer to `db/001_init_db_tables.sql`.)*
