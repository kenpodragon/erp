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
| `049` | Shard Purchases & Stripe Integration (3.1) | Created 3 tables: `shard_packages`, `payment_orders`, `stripe_webhook_events`. Added `stripe_customer_id`, `first_purchase_claimed`, `account_flag` columns to `players`. Seeded 6 `game_configs` keys (category: economy): stripe_first_purchase_multiplier, payment_poll_max_attempts, payment_poll_interval_ms, reconciliation_lookback_hours, checkout_expiration_minutes, refund_eligible_days. |
| `050` | Subscription System — Elysium Ascendant (3.2) | Created 2 tables: `player_subscriptions`, `subscription_stipend_log`. Added `is_ascendant BOOLEAN`, `cumulative_subscription_months INTEGER` columns to `players`. Seeded 10 subscription titles, 11 subscription/economy achievements, 11 `game_configs` keys (category: subscription). |
| `051` | Elysium Emporium (3.3) | Created 5 tables: `shop_items`, `shop_bundles`, `shop_bundle_items`, `player_shop_items`, `player_active_boosters`. Added `equipped_flair_id`, `equipped_badge_id`, `equipped_avatar_id` columns to `players`. Added `equipped_skin_id` column to `player_characters`. Widened `shard_transactions` source_type CHECK constraint (+shop_purchase, +admin_refund). Seeded 32 shop items (6 skins, 5 flair, 4 badges, 8 avatars, 9 boosters), 3 bundles + 9 bundle item mappings, 9 `game_configs` keys (category: economy). |
| `053` | Dreamwalker's Bazaar (3.5) | Created 4 tables: `marketplace_listings`, `marketplace_trades`, `marketplace_notifications`, `marketplace_price_history`. Added `marketplace_slots_purchased INTEGER` to `players`. Added `marketplace_listing_id INTEGER FK` to `player_artifacts` and `player_inventory`. Updated `enforce_inventory_slot_cap()` trigger to exclude marketplace-listed items from slot count. Widened `shard_transactions` source_type CHECK (+marketplace_purchase, +marketplace_sale). Widened `shop_items` category CHECK (+marketplace_permit). Seeded 7 Bazaar Permits, 4 titles, 9 achievements with parent chains and title rewards, 15 `game_configs` keys (8 marketplace + 7 salvage). |
| `054` | Admin Finance Dashboard | Created `admin_shard_adjustments` table (admin-initiated shard grant/debit audit trail: player_id, admin_email, adjust_type, amount, reason, balance_before/after, shard_txn_id FK). 3 indexes (player, admin, created_at). Seeded 5 `game_configs` keys (category: marketplace_anomaly): anomaly_price_multiplier_threshold (10), anomaly_rapid_relist_count (5), anomaly_rapid_relist_window_minutes (60), anomaly_wash_trade_count (3), anomaly_wash_trade_window_hours (24). |
| `055` | Asset Registry | Created `asset_registry` table (id, asset_key UNIQUE, category, display_name, description, render_definition JSONB, tags JSONB/GIN, source, created_at, updated_at + trigger). Indexes: asset_key, category, source, tags GIN, display_name. Renamed `shop_items.icon_path` → `icon_asset_key`, `shop_bundles.icon_path` → `icon_asset_key`. Seeded 21 migrated filesystem assets + ~140 placeholder icons for existing sprite_key values. |
| `057` | Backgrounds & Wave Configs (5.2) | Created `backgrounds` table (id, name UNIQUE, description, background_key UNIQUE, parallax_config JSONB, time_of_day, mood, color_palette JSONB, created_at, updated_at + trigger). Created `scene_wave_configs` table (id, scene_id FK UNIQUE scenes CASCADE, max_enemies_per_wave, wave_count, spawn_interval_ms, scaling_factor, hp_multiplier, gold_multiplier, entity_pool JSONB, boss_entity_id FK entities SET NULL, created_at, updated_at + trigger). Added `background_id INTEGER FK backgrounds SET NULL` to `scene_gameplay_data` with data migration from `background_sprite_key`. Added `description TEXT` to `locations` (if not exists). |
| `058` | Entity Classification | Created `entity_types`, `entity_families`, `visual_behaviors` tables. Extended `attack_types` with `visual_behavior_id` FK and `stat_multipliers` JSONB. Migrated `entities.entity_type` (VARCHAR) → `entity_type_id` (FK) and `entities.entity_family` (VARCHAR) → `entity_family_id` (FK). Seeded 9 entity types, 5 visual behaviors, and attack type → behavior mappings. |
| `059` | Banner & Scaling Editor (5.4) | Added `stat_weights JSONB` to `visual_behaviors`. Created `wave_presets` (name, config JSONB, is_default, sort_order), `wave_preset_assignments` (wave_preset_id FK, book_id/chapter_id with exactly-one-target CHECK + partial unique indexes), `difficulty_curves` (name, curve_data JSONB, is_default, sort_order), `difficulty_presets` (name, difficulty_curve_id FK, wave_preset_id FK, config_snapshot JSONB, is_active). Added `difficulty_curve_id INTEGER FK difficulty_curves ON DELETE SET NULL` to `books`. Seeded 5 behavior stat_weights, 1 "Standard" wave preset, 1 "Standard Ramp" 10-chapter difficulty curve, 4 `game_configs` keys (category: waves). |
| `060` | Dev Audit Status (5.6) | Added `status` VARCHAR(20) NOT NULL DEFAULT 'open' to `dev_content_audit`. Migrated `resolved` boolean data (TRUE→'resolved', FALSE→'open'). Dropped `resolved` column. Added indexes `idx_dev_content_audit_status` and `idx_dev_content_audit_type`. |

*Note: Individual migration history (001-029) has been archived in `db/old/` for historical reference.*

---

## 📊 Current Schema Definition

### 1. Narrative Engine (Book Data)

| Table | Description |
| :--- | :--- |
| `books` | Top-level container for the book series. Includes `transition_lore_text`. **2.4:** Added `recommended_level INTEGER` and `min_level INTEGER` for level-gated progression. **2.5:** Added `atmosphere_id INTEGER FK atmospheres` for book-wide audio fallback. **5.4:** Added `difficulty_curve_id INTEGER FK difficulty_curves ON DELETE SET NULL` for per-book difficulty curve assignment. |
| `chapters` | Chapters within a book, containing raw text and processing status. Includes `transition_lore_text`. **2.4:** Added `recommended_level INTEGER` and `min_level INTEGER` for level-gated progression. **2.5:** Added `atmosphere_id INTEGER FK atmospheres` for chapter-level audio. |
| `scenes` | Narrative nodes within chapters, linked to locations. Includes `scene_type` and `boss_config`. |
| `story_beats` | The smallest narrative units within a scene. Includes `content_image_path`, `audio_path`, and `audio_duration_seconds`. |
| `locations` | Master list of canonical locations within the Tower. **2.5:** Added `archetype_id INTEGER FK atmospheres` for atmosphere classification. |
| `entities` | Master list of characters, enemies, and neutral figures from the lore. **5.3:** Replaced `entity_type VARCHAR(50)` with `entity_type_id INTEGER FK entity_types ON DELETE RESTRICT`. Replaced `entity_family VARCHAR(100)` with `entity_family_id INTEGER FK entity_families ON DELETE SET NULL`. |
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
| `players` | Core user account data, roles (`is_owner`, `is_system_admin`, `is_game_admin`), and status. **3.1:** Added `stripe_customer_id VARCHAR(255) UNIQUE NULL` (Stripe Customer ID), `first_purchase_claimed BOOLEAN DEFAULT FALSE` (2x first-purchase bonus used permanently), `account_flag VARCHAR(30) NULL` ('dispute' blocks purchases). **3.3:** Added `equipped_flair_id INTEGER FK shop_items`, `equipped_badge_id INTEGER FK shop_items`, `equipped_avatar_id INTEGER FK shop_items` for account-wide cosmetic equip. **3.5:** Added `marketplace_slots_purchased INTEGER NOT NULL DEFAULT 0` (extra Bazaar listing slots purchased via permits). |
| `player_settings` | User-specific preferences (volume, speed, audio toggles, font size, UI scale). **2.5:** Added `master_volume SMALLINT DEFAULT 80` (0-100) and `master_muted BOOLEAN DEFAULT FALSE`. Note: `audio_enabled` is deprecated in favor of `master_muted`. **2.6:** Added `chat_muted BOOLEAN DEFAULT FALSE` and `chat_muted_until VARCHAR(50)` for admin chat mute support. |
| `character_classes` | Definitions for player classes (Engineer, Conduit, Drifter, Vessel). **2.4:** Added `visual_config JSONB` for class visual identity (colors, avatar, particles, PixiJS tints). |
| `player_characters` | Instances of characters owned by players, tracking level and stats. **2.4:** Added `character_xp BIGINT DEFAULT 0`. Deprecated columns: `strength`, `agility`, `intelligence` (use `character_stats` table instead). **3.3:** Added `equipped_skin_id INTEGER FK shop_items` for character-level skin equip. |

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
| `player_inventory` | Instances of items owned and equipped by characters. **2.4.2:** New trigger `trg_enforce_inventory_slot_cap` enforces max 10 non-equipped items per character. **3.5:** Added `marketplace_listing_id INTEGER FK marketplace_listings ON DELETE SET NULL` (NULL = not listed). Index: `idx_pi_marketplace`. Trigger updated to exclude marketplace-listed items from slot cap count. |
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
| `dev_content_audit` | Auto-logged entries for missing assets or stats detected during gameplay. **5.6:** Replaced `resolved` (BOOLEAN) with `status` (VARCHAR(20), values: open/acknowledged/in_progress/resolved/wont_fix). Added indexes `idx_dev_content_audit_status` and `idx_dev_content_audit_type`. |

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
| `attack_types` | Combat attack type definitions. Columns: `id SERIAL PK`, `name VARCHAR(50) UNIQUE`, `display_name VARCHAR(100)`, `description TEXT`, `is_physical BOOLEAN DEFAULT FALSE`, `lore_reference TEXT`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`. **5.3:** Added `visual_behavior_id INTEGER FK visual_behaviors ON DELETE SET NULL` and `stat_multipliers JSONB` (nullable). Seeded with 13 types: melee, ranged, akashic, aerial, psychic, nanite, phase, void, resonance, construct, thermal, gravitic, corruption. |
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
- ~~`entities.entity_family VARCHAR(100)`~~ — **Replaced in 5.3** by `entity_family_id INTEGER FK entity_families ON DELETE SET NULL`. Species/family grouping (e.g., 'Wraith', 'Golem'). NULL = standalone entry in Codex. Index: `idx_entities_family`.

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
| `player_artifacts` | Artifacts owned by player characters (both curated and generated). Columns: `id SERIAL PK`, `player_id INTEGER FK players ON DELETE CASCADE`, `character_id INTEGER FK player_characters ON DELETE CASCADE`, `artifact_type VARCHAR(20) NOT NULL` CHECK IN ('curated', 'generated'), `curated_artifact_id INTEGER FK curated_artifacts` (NULL for generated), `artifact_code VARCHAR(100)` (NULL for curated; PREFIX_TYPE_SUFFIX for generated), `name VARCHAR(200) NOT NULL`, `rarity VARCHAR(10) NOT NULL` CHECK IN ('common', 'uncommon', 'rare', 'epic', 'cosmic'), `icon_sprite_key VARCHAR(100)`, `stat_bonuses JSONB NOT NULL DEFAULT '{}'`, `is_new BOOLEAN DEFAULT TRUE`, `acquired_from VARCHAR(100)`, `acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`. UNIQUE on `(character_id, artifact_type, curated_artifact_id)` and `(character_id, artifact_code)`. **3.5:** Added `marketplace_listing_id INTEGER FK marketplace_listings ON DELETE SET NULL` (NULL = not listed). Index: `idx_pa_marketplace`. |
| `shard_transactions` | Premium currency audit trail. Columns: `id SERIAL PK`, `player_id INTEGER FK players ON DELETE CASCADE`, `amount INTEGER NOT NULL`, `balance_after INTEGER NOT NULL`, `transaction_type VARCHAR(30) NOT NULL` CHECK IN ('purchase', 'reward', 'spend', 'refund', 'admin_grant', 'admin_deduct'), `source_type VARCHAR(30)` CHECK IN ('purchase', 'reward', 'spend', 'refund', 'admin_grant', 'admin_deduct', 'subscription_stipend', 'subscription_refund', 'shop_purchase', 'admin_refund', 'donation', 'achievement', 'dispute', 'dispute_reversal', 'marketplace_purchase', 'marketplace_sale'), `reference_type VARCHAR(50)`, `reference_id INTEGER`, `description TEXT`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`. Index on `(player_id, created_at DESC)`. **3.3:** Widened `source_type` CHECK (+shop_purchase, +admin_refund). **3.4:** Added 'donation'. **3.5:** Added 'marketplace_purchase', 'marketplace_sale'. |

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

### 16. Shard Purchases & Stripe Integration (3.1, Migration 049)

| Table | Description |
| :--- | :--- |
| `shard_packages` | Purchasable shard bundles (6 tiers), admin-configurable. Columns: `id SERIAL PK`, `tier_key VARCHAR(30) UNIQUE` (starter, small, medium, large, premium, ultimate), `name VARCHAR(100)`, `description VARCHAR(255)` (optional marketing text), `price_cents INTEGER` (USD cents), `base_shards INTEGER` (before bonus), `bonus_pct INTEGER` (volume bonus %), `total_shards INTEGER` (pre-calculated with bonus), `sort_order INTEGER`, `is_active BOOLEAN` (soft-disable), `is_best_value BOOLEAN` (UI badge), `max_purchases_per_player INTEGER NULL` (per-player cap; NULL=unlimited), `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`. |
| `payment_orders` | Tracks Stripe checkout lifecycle. One row per purchase attempt. Columns: `id SERIAL PK`, `player_id INTEGER FK players`, `package_id INTEGER FK shard_packages`, `status VARCHAR(20)` (pending/completed/expired/refunded/disputed), `stripe_checkout_session_id VARCHAR(255) UNIQUE` (idempotency key), `stripe_payment_intent_id VARCHAR(255)`, `stripe_charge_id VARCHAR(255)`, `idempotency_key UUID UNIQUE`, `price_cents INTEGER` (snapshot at purchase time), `shards_credited INTEGER` (total credited incl bonus), `shards_refunded INTEGER` (cumulative refunded), `is_first_purchase BOOLEAN` (triggered 2x bonus), `created_at TIMESTAMPTZ`, `completed_at TIMESTAMPTZ`, `refunded_at TIMESTAMPTZ`, `expired_at TIMESTAMPTZ`. |
| `stripe_webhook_events` | Raw Stripe event log for debugging and deduplication. Columns: `id SERIAL PK`, `stripe_event_id VARCHAR(255) UNIQUE` (Stripe event ID), `event_type VARCHAR(100)` (e.g. checkout.session.completed), `payload JSONB` (full event data), `processed BOOLEAN` (handled flag), `processing_error TEXT` (error if failed), `created_at TIMESTAMPTZ`, `processed_at TIMESTAMPTZ`. |

**Column Additions (049, players):**
- `players.stripe_customer_id VARCHAR(255) UNIQUE NULL` — Stripe Customer ID, lazily created on first checkout.
- `players.first_purchase_claimed BOOLEAN DEFAULT FALSE` — Whether the 2x first-purchase shard bonus has been used (permanent, one-time).
- `players.account_flag VARCHAR(30) NULL` — Account-level flag; `'dispute'` blocks further purchases.

#### Economy `game_configs` Keys (seeded in 049)

| Key | Category | Description |
| :--- | :--- | :--- |
| `stripe_first_purchase_multiplier` | `economy` | Multiplier applied to first shard purchase (2). |
| `payment_poll_max_attempts` | `economy` | Max client polling attempts after checkout redirect (20). |
| `payment_poll_interval_ms` | `economy` | Milliseconds between client poll requests (1500). |
| `reconciliation_lookback_hours` | `economy` | Hours to look back for stale pending orders during reconciliation (24). |
| `checkout_expiration_minutes` | `economy` | Minutes before a pending checkout session expires (30). |
| `refund_eligible_days` | `economy` | Days after purchase within which a refund may be considered (14). |

---

### 17. Subscription System — Elysium Ascendant (3.2, Migration 050)

| Table | Description |
| :--- | :--- |
| `player_subscriptions` | Subscription lifecycle tracking. Columns: `id SERIAL PK`, `player_id INTEGER FK players NOT NULL`, `stripe_subscription_id VARCHAR(255)` (NULL for admin gifts), `stripe_price_id VARCHAR(255)`, `plan_key VARCHAR(30) NOT NULL` ('ascendant_monthly', 'ascendant_annual'), `status VARCHAR(20) DEFAULT 'active'` CHECK IN ('active', 'canceling', 'past_due', 'expired'), `source VARCHAR(20) DEFAULT 'stripe'` ('stripe', 'admin_gift'), `subscription_start_date TIMESTAMPTZ`, `current_period_start TIMESTAMPTZ`, `current_period_end TIMESTAMPTZ`, `cancel_at_period_end BOOLEAN DEFAULT FALSE`, `continuous_streak INTEGER DEFAULT 0` (resets on lapse, drives boost scaling), `grace_period_start TIMESTAMPTZ`, `grace_deadline TIMESTAMPTZ` (next US business day 23:59:59 UTC), `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`. Indexes: `idx_ps_player_status`, `idx_ps_stripe_sub`, `idx_ps_status`, `idx_ps_period_end`. Auto-`updated_at` trigger. |
| `subscription_stipend_log` | Monthly shard stipend crediting log (idempotent via period_key). Columns: `id SERIAL PK`, `subscription_id INTEGER FK player_subscriptions ON DELETE CASCADE NOT NULL`, `player_id INTEGER FK players NOT NULL`, `period_key VARCHAR(7) NOT NULL` (YYYY-MM format), `shards_credited INTEGER NOT NULL`, `stripe_invoice_id VARCHAR(255)`, `period_start TIMESTAMPTZ`, `created_at TIMESTAMPTZ DEFAULT NOW()`. UNIQUE on `(subscription_id, period_key)`. Indexes: `idx_ssl_sub`, `idx_ssl_player_period`. |

**Column Additions (050, players):**
- `players.is_ascendant BOOLEAN DEFAULT FALSE` — Set TRUE when active subscription exists; FALSE on expiry.
- `players.cumulative_subscription_months INTEGER DEFAULT 0` — Lifetime total months subscribed (never resets; drives permanent title rewards).

**Title Seeds (050):** 10 subscription-related titles seeded: the Ascendant (first sub), the Patron (1mo cumulative), the Devoted (6mo), the Eternal Ascendant (12mo), Architect of Elysium (24mo), Voidwalker Ascendant (36mo), Keeper of the Spire (48mo), Elysium Incarnate (60mo), the Steadfast (6mo streak), the Unwavering (12mo streak).

**Achievement Seeds (050):** 11 subscription/economy achievements seeded across 'economics' category with parent chains: First Ascendant, Ascendant Patron, Devoted Subscriber, Eternal Ascendant, Shard Collector (I-III), Big Spender (I-III), Streak Master.

#### Subscription `game_configs` Keys (seeded in 050)

| Key | Category | Description |
| :--- | :--- | :--- |
| `subscription_base_xp_boost` | `subscription` | Base XP multiplier bonus for subscribers (0.15 = +15%). |
| `subscription_base_essence_boost` | `subscription` | Base Essence multiplier bonus for subscribers (0.15 = +15%). |
| `subscription_base_drop_boost` | `subscription` | Base drop rate multiplier bonus for subscribers (0.10 = +10%). |
| `subscription_base_training_boost` | `subscription` | Base idle training speed bonus for subscribers (0.10 = +10%). |
| `subscription_base_stipend_shards` | `subscription` | Monthly shard stipend amount (150). |
| `subscription_streak_bonuses` | `subscription` | JSON array of streak milestone bonuses. Each entry: `months`, `xp_bonus`, `essence_bonus`, `drop_bonus`, `training_bonus`, `stipend_bonus`. 5 tiers at 3/6/12/24/36 months. |
| `subscription_cumulative_milestones` | `subscription` | JSON array of cumulative month → title reward mappings. 7 milestones at 1/6/12/24/36/48/60 months. |
| `subscription_custom_holidays` | `subscription` | JSON array of ISO date strings for custom grace period holidays (default empty). |
| `gift_counts_toward_loyalty` | `subscription` | Whether admin-gifted subscriptions increment loyalty counters ("false"). |
| `stripe_ascendant_monthly_price_id` | `subscription` | Stripe Price ID for monthly plan. |
| `stripe_ascendant_annual_price_id` | `subscription` | Stripe Price ID for annual plan. |

**Grace Period Logic:** On payment failure, grace deadline is set to 23:59:59 UTC of the next US business day after the failure date. Business days exclude weekends, US federal holidays (10 fixed + floating), and custom holidays from `subscription_custom_holidays` config.

**Boost Stacking:** Subscription boosts are applied server-side as multiplicative multipliers to XP, Essence, Drop Rate, and Training Speed. Base boosts + accumulated streak bonuses. Applied in `story_mode.py`, `game_training.py`, `achievement_service.py`, and `artifact_service.py`.

---

### 18. Elysium Emporium — In-Game Shop (3.3, Migration 051)

| Table | Description |
| :--- | :--- |
| `shop_items` | Master catalog of purchasable shop items. Columns: `id SERIAL PK`, `item_key VARCHAR(60) UNIQUE NOT NULL`, `name VARCHAR(100) NOT NULL`, `description TEXT`, `category VARCHAR(20) NOT NULL` CHECK IN ('skin', 'flair', 'badge', 'avatar', 'booster', 'patron_badge', 'patron_flair', 'patron_avatar', 'marketplace_permit'), `price_shards INTEGER NOT NULL` (>0), `icon_path VARCHAR(255)`, `class_restriction INTEGER FK character_classes` (NULL = universal), `item_metadata JSONB` (boosters: `{boost_type, magnitude, duration_seconds}`; skins: `{portrait, avatar_config, battle_bar}`; flair: `{border_color, border_style, icon}`; badges: `{frame_style, primary_color, secondary_color}`), `is_active BOOLEAN DEFAULT TRUE`, `is_featured BOOLEAN DEFAULT FALSE`, `featured_from TIMESTAMPTZ`, `featured_until TIMESTAMPTZ`, `available_from TIMESTAMPTZ`, `available_until TIMESTAMPTZ`, `sort_order INTEGER DEFAULT 0`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`. Indexes: `idx_shop_items_category_active` (category, sort_order WHERE is_active), `idx_shop_items_featured` (is_featured WHERE TRUE), `idx_shop_items_availability` (available windows WHERE available_until NOT NULL). Auto-`updated_at` trigger. 32 items seeded (6 skins, 5 flair, 4 badges, 8 avatars, 9 boosters). |
| `shop_bundles` | Curated bundle packages with discount pricing. Columns: `id SERIAL PK`, `bundle_key VARCHAR(60) UNIQUE NOT NULL`, `name VARCHAR(100) NOT NULL`, `description TEXT`, `price_shards INTEGER NOT NULL` (>0), `original_price_shards INTEGER NOT NULL` (>0), `discount_pct INTEGER DEFAULT 20` (0-100), `icon_path VARCHAR(255)`, `is_active BOOLEAN DEFAULT TRUE`, `is_featured BOOLEAN DEFAULT FALSE`, `featured_from TIMESTAMPTZ`, `featured_until TIMESTAMPTZ`, `available_from TIMESTAMPTZ`, `available_until TIMESTAMPTZ`, `sort_order INTEGER DEFAULT 0`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`. Index: `idx_shop_bundles_active` (is_active, sort_order WHERE is_active). Auto-`updated_at` trigger. 3 bundles seeded. |
| `shop_bundle_items` | Junction table linking bundles to their contained items. Columns: `id SERIAL PK`, `bundle_id INTEGER FK shop_bundles ON DELETE CASCADE NOT NULL`, `shop_item_id INTEGER FK shop_items ON DELETE CASCADE NOT NULL`, `sort_order INTEGER DEFAULT 0`. UNIQUE on `(bundle_id, shop_item_id)`. Index: `idx_bundle_items_bundle` (bundle_id, sort_order). 9 mappings seeded (3 items per bundle). |
| `player_shop_items` | Player ownership of shop items (account-wide). Columns: `id SERIAL PK`, `player_id INTEGER FK players ON DELETE CASCADE NOT NULL`, `shop_item_id INTEGER FK shop_items` (NULL for bundle-only purchases), `source_bundle_id INTEGER FK shop_bundles` (non-NULL if acquired via bundle), `status VARCHAR(20) DEFAULT 'owned'` CHECK IN ('owned', 'refunded'), `purchased_at TIMESTAMPTZ DEFAULT NOW()`, `refunded_at TIMESTAMPTZ`. Indexes: `idx_psi_player_status` (player_id, status WHERE owned), `idx_psi_player_item` (player_id, shop_item_id WHERE owned), `idx_psi_player_bundle` (player_id, source_bundle_id WHERE NOT NULL). Partial UNIQUE: `idx_psi_unique_ownership` (player_id, shop_item_id WHERE owned AND shop_item_id NOT NULL). |
| `player_active_boosters` | Tracks active and expired time-limited boosters. Columns: `id SERIAL PK`, `player_id INTEGER FK players ON DELETE CASCADE NOT NULL`, `boost_type VARCHAR(20) NOT NULL` CHECK IN ('xp', 'essence', 'drop_rate'), `magnitude NUMERIC(5,2) NOT NULL` (>1.0), `duration_seconds INTEGER NOT NULL` (>0), `elapsed_seconds INTEGER DEFAULT 0` (>=0), `shop_item_id INTEGER FK shop_items`, `status VARCHAR(20) DEFAULT 'active'` CHECK IN ('active', 'expired'), `activated_at TIMESTAMPTZ DEFAULT NOW()`, `expired_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ DEFAULT NOW()`. Indexes: `idx_pab_player_active` (player_id, boost_type WHERE active), `idx_pab_player_history` (player_id, activated_at DESC). Auto-`updated_at` trigger. |

**Column Additions (051, players):**
- `players.equipped_flair_id INTEGER DEFAULT NULL` — FK to `shop_items.id`. Account-wide equipped flair cosmetic.
- `players.equipped_badge_id INTEGER DEFAULT NULL` — FK to `shop_items.id`. Account-wide equipped badge cosmetic.
- `players.equipped_avatar_id INTEGER DEFAULT NULL` — FK to `shop_items.id`. Account-wide equipped avatar cosmetic.

**Column Addition (051, player_characters):**
- `player_characters.equipped_skin_id INTEGER DEFAULT NULL` — FK to `shop_items.id`. Character-level equipped skin cosmetic.

**Booster Timer Model:** Elapsed time tracked server-side via `elapsed_seconds`. Frontend sends `POST /api/shop/booster-ping` every 30s during active sessions (Story Mode or Idle Training) with `elapsed_seconds: 30`. Server clamps per-ping to `shop_booster_max_elapsed_per_ping` (anti-cheat). Booster expires when `elapsed_seconds >= duration_seconds` (lazy expiry checked on any booster access). Overlapping booster of same type extends `duration_seconds` and takes `max(magnitude)`.

**Boost Stacking:** `total_multiplier = subscription_multiplier × shop_booster_multiplier` via `get_effective_multipliers()` in `boost_service.py`. Applied in `story_mode.py`, `game_training.py`, `achievement_service.py`.

#### Emporium `game_configs` Keys (seeded in 051)

| Key | Category | Description |
| :--- | :--- | :--- |
| `shop_booster_1hr_price` | `economy` | Default price in shards for 1-hour boosters (75). |
| `shop_booster_8hr_price` | `economy` | Default price in shards for 8-hour boosters (400). |
| `shop_booster_24hr_price` | `economy` | Default price in shards for 24-hour boosters (900). |
| `shop_booster_1hr_magnitude` | `economy` | Multiplier value for 1-hour boosters (1.25). |
| `shop_booster_8hr_magnitude` | `economy` | Multiplier value for 8-hour boosters (1.5). |
| `shop_booster_24hr_magnitude` | `economy` | Multiplier value for 24-hour boosters (2.0). |
| `shop_bundle_default_discount` | `economy` | Default bundle discount percentage (20). |
| `shop_booster_ping_interval_s` | `economy` | Frontend booster ping interval in seconds (30). |
| `shop_booster_max_elapsed_per_ping` | `economy` | Max elapsed seconds accepted per ping — anti-cheat clamp (60). |

---

### 19. Donations — One-Time Support (3.4, Migration 052)

#### Table: `donations`

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| id | SERIAL | PK | Auto-increment primary key |
| player_id | INTEGER | FK → players(id), NOT NULL | Donating player |
| payment_order_id | INTEGER | FK → payment_orders(id), UNIQUE, NOT NULL | Associated payment order |
| amount_cents | INTEGER | NOT NULL, CHECK ≥ 100 | Donation amount in cents |
| cumulative_total_cents | INTEGER | NOT NULL, DEFAULT 0 | Cumulative total snapshot after this donation |
| patron_tier | VARCHAR(20) | DEFAULT NULL | Patron tier snapshot (bronze/silver/gold/diamond) |
| diamond_stars | INTEGER | DEFAULT 0 | Diamond stars snapshot |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Donation timestamp |

**Indexes:** `idx_donations_player` (player_id), `idx_donations_created` (created_at DESC)

#### Columns added to `players` (Migration 052)

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| cumulative_donation_cents | INTEGER | NOT NULL, DEFAULT 0 | Lifetime cumulative donation total in cents |
| patron_tier | VARCHAR(20) | DEFAULT NULL | Current patron tier (bronze/silver/gold/diamond) |
| patron_diamond_stars | INTEGER | NOT NULL, DEFAULT 0 | Number of diamond stars earned |
| donor_visibility | BOOLEAN | NOT NULL, DEFAULT FALSE | Whether player appears on donor leaderboard |

#### `shard_transactions` source_type update (Migration 052)
Added `'donation'` to the CHECK constraint.

#### Seed data (Migration 052)
- 4 patron badges in `shop_items` (patron_badge category)
- 1 patron flair in `shop_items` (patron_flair category)
- 1 patron avatar in `shop_items` (patron_avatar category)
- 5 patron titles in `titles`
- 1 "Patron of Elysium" achievement
- 10 game_configs keys (donations category)

#### Donation `game_configs` Keys (seeded in 052)

| Key | Category | Description |
| :--- | :--- | :--- |
| `donation_min_cents` | `donations` | Minimum donation amount in cents (100). |
| `patron_tier_bronze_cents` | `donations` | Cumulative cents for Bronze Patron (500). |
| `patron_tier_silver_cents` | `donations` | Cumulative cents for Silver Patron (2500). |
| `patron_tier_gold_cents` | `donations` | Cumulative cents for Gold Patron (10000). |
| `patron_tier_diamond_cents` | `donations` | Cumulative cents for Diamond Patron (50000). |
| `patron_diamond_star_increment` | `donations` | Additional cents per Diamond star (50000). |
| `patron_diamond_star_display_cap` | `donations` | Maximum stars shown in UI (5). |
| `donor_leaderboard_size` | `donations` | Maximum entries on donor leaderboard (50). |
| `recent_donors_count` | `donations` | Number of recent donors in rotating banner (5). |
| `recent_donors_window_days` | `donations` | Days to look back for recent donors (7). |

---

### 20. Dreamwalker's Bazaar — Player Marketplace (3.5, Migration 053)

#### Table: `marketplace_listings`

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| id | SERIAL | PK | Auto-increment primary key |
| seller_id | INTEGER | FK → players(id) ON DELETE CASCADE, NOT NULL | Listing seller |
| buyer_id | INTEGER | FK → players(id) ON DELETE SET NULL | Buyer (set on sale) |
| item_type | VARCHAR(20) | NOT NULL, CHECK IN ('artifact', 'equipment') | Type of item listed |
| item_ref_id | INTEGER | NOT NULL | App-level FK to `player_artifacts.id` or `player_inventory.id` |
| item_name | VARCHAR(150) | NOT NULL | Snapshot of item name at listing time |
| item_rarity | VARCHAR(50) | NOT NULL | Snapshot of item rarity |
| item_stats | JSONB | NOT NULL, DEFAULT '{}' | Snapshot of item stat bonuses |
| item_icon_key | VARCHAR(100) | | Sprite key for listing thumbnail |
| item_gear_slot | INTEGER | FK → gear_slots(id) ON DELETE SET NULL | Gear slot reference (equipment only) |
| is_curated | BOOLEAN | NOT NULL, DEFAULT FALSE | Whether the listed artifact is curated |
| price_shards | INTEGER | NOT NULL, CHECK >= 1 | Listing price in Shards |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'active', CHECK IN ('active', 'sold', 'expired', 'cancelled') | Listing lifecycle state |
| listed_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | When the item was listed |
| expires_at | TIMESTAMPTZ | NOT NULL | Expiry timestamp (listed_at + duration config) |
| sold_at | TIMESTAMPTZ | | Timestamp of sale |
| cancelled_at | TIMESTAMPTZ | | Timestamp of cancellation |
| expired_at | TIMESTAMPTZ | | Timestamp of expiry processing |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:** `idx_mpl_seller` (seller_id), `idx_mpl_status_expires` (status, expires_at WHERE active), `idx_mpl_item_name_rarity` (item_name, item_rarity WHERE active), `idx_mpl_price` (price_shards WHERE active), `idx_mpl_buyer` (buyer_id WHERE NOT NULL).

#### Table: `marketplace_trades`

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| id | SERIAL | PK | Auto-increment primary key |
| listing_id | INTEGER | FK → marketplace_listings(id) ON DELETE CASCADE, NOT NULL | Source listing |
| buyer_id | INTEGER | FK → players(id) ON DELETE CASCADE, NOT NULL | Buying player |
| seller_id | INTEGER | FK → players(id) ON DELETE CASCADE, NOT NULL | Selling player |
| item_type | VARCHAR(20) | NOT NULL, CHECK IN ('artifact', 'equipment') | Type of traded item |
| item_ref_id | INTEGER | NOT NULL | App-level FK to item |
| item_name | VARCHAR(150) | NOT NULL | Snapshot of traded item name |
| item_rarity | VARCHAR(50) | NOT NULL | Snapshot of traded item rarity |
| price_shards | INTEGER | NOT NULL | Sale price in Shards |
| tax_shards | INTEGER | NOT NULL, DEFAULT 0 | Tax deducted (burned) |
| seller_proceeds | INTEGER | NOT NULL | Net Shards credited to seller |
| claim_status | VARCHAR(20) | NOT NULL, DEFAULT 'claimed', CHECK IN ('claimed', 'pending', 'discarded', 'reversed') | Item claim lifecycle (pending = buyer inventory full) |
| traded_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Trade timestamp |

**Indexes:** `idx_mpt_buyer` (buyer_id), `idx_mpt_seller` (seller_id), `idx_mpt_listing` (listing_id), `idx_mpt_pending_claim` (claim_status WHERE pending), `idx_mpt_traded_at` (traded_at).

#### Table: `marketplace_notifications`

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| id | SERIAL | PK | Auto-increment primary key |
| player_id | INTEGER | FK → players(id) ON DELETE CASCADE, NOT NULL | Notification recipient |
| notification_type | VARCHAR(30) | NOT NULL, CHECK IN ('item_sold', 'listing_expired', 'listing_removed') | Notification category |
| title | VARCHAR(200) | NOT NULL | Notification title |
| message | TEXT | NOT NULL | Notification body text |
| related_listing_id | INTEGER | FK → marketplace_listings(id) ON DELETE SET NULL | Associated listing |
| is_read | BOOLEAN | NOT NULL, DEFAULT FALSE | Read status |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| read_at | TIMESTAMPTZ | | When the notification was read |

**Indexes:** `idx_mpn_player_unread` (player_id WHERE is_read = FALSE), `idx_mpn_created` (created_at).

#### Table: `marketplace_price_history`

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| id | SERIAL | PK | Auto-increment primary key |
| listing_id | INTEGER | FK → marketplace_listings(id) ON DELETE CASCADE, NOT NULL | Associated listing |
| price | INTEGER | NOT NULL | New price value |
| old_price | INTEGER | | Previous price (NULL on initial listing) |
| action | VARCHAR(20) | NOT NULL, CHECK IN ('listed', 'adjusted') | Type of price change |
| changed_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp of price change |

**Indexes:** `idx_mph_listing` (listing_id).

#### Column Additions (053, players)

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| marketplace_slots_purchased | INTEGER | NOT NULL, DEFAULT 0 | Number of extra Bazaar listing slots purchased via permits |

#### Column Additions (053, player_artifacts)

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| marketplace_listing_id | INTEGER | FK → marketplace_listings(id) ON DELETE SET NULL | Links artifact to its active marketplace listing (NULL = not listed) |

**Index:** `idx_pa_marketplace` (marketplace_listing_id WHERE NOT NULL).

#### Column Additions (053, player_inventory)

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| marketplace_listing_id | INTEGER | FK → marketplace_listings(id) ON DELETE SET NULL | Links equipment to its active marketplace listing (NULL = not listed) |

**Index:** `idx_pi_marketplace` (marketplace_listing_id WHERE NOT NULL).

#### Updated CHECK Constraints (053)

- **`shard_transactions.source_type`:** Added `'marketplace_purchase'`, `'marketplace_sale'`. Full set: `'purchase'`, `'reward'`, `'spend'`, `'refund'`, `'admin_grant'`, `'admin_deduct'`, `'subscription_stipend'`, `'subscription_refund'`, `'shop_purchase'`, `'admin_refund'`, `'donation'`, `'achievement'`, `'dispute'`, `'dispute_reversal'`, `'marketplace_purchase'`, `'marketplace_sale'`.
- **`shop_items.category`:** Added `'marketplace_permit'`. Full set: `'skin'`, `'flair'`, `'badge'`, `'avatar'`, `'booster'`, `'patron_badge'`, `'patron_flair'`, `'patron_avatar'`, `'marketplace_permit'`.

#### Updated Trigger (053)

- **`enforce_inventory_slot_cap()`:** Updated to exclude items with `marketplace_listing_id IS NOT NULL` from the stored-item count. Items listed on the Bazaar do not count against the 10-slot inventory cap.

#### Seed Data (053)

- **7 Bazaar Permits** in `shop_items` (category: `marketplace_permit`): Slots 4-10, prices doubling from 200 to 12,800 Shards.
- **4 Titles** in `titles`: Merchant (prefix), Collector (suffix), Dreamwalker (prefix), Baron (suffix).
- **9 Achievements** in `achievements` (category: `economics`): Open for Business (list 1), Deal Sealed (sell 1), Bazaar Regular (buy 1), Merchant of Elysium (sell 10, parent: Deal Sealed, rewards Merchant title), Master Merchant (sell 50, parent: Merchant of Elysium), The Scrapper (salvage 100), Avid Collector (buy 25, parent: Bazaar Regular, rewards Collector title), Jackpot (single sale >= 5000, rewards Dreamwalker title), Trade Baron (cumulative 10,000 earned, rewards Baron title).
- **15 `game_configs` keys** (8 marketplace + 7 salvage):

#### Marketplace `game_configs` Keys (seeded in 053)

| Key | Category | Description |
| :--- | :--- | :--- |
| `marketplace_tax_rate` | `marketplace` | Transaction tax rate deducted from seller proceeds and burned (0.05 = 5%). |
| `marketplace_listing_duration_hours` | `marketplace` | Listing duration in hours before automatic expiry (24). |
| `marketplace_base_listing_slots` | `marketplace` | Default listing slots per player before permits (3). |
| `marketplace_max_listing_slots` | `marketplace` | Hard cap on total listing slots (10 = 3 base + 7 permits). |
| `marketplace_min_listing_price` | `marketplace` | Minimum listing price in Shards (1). |
| `marketplace_notification_retention_days` | `marketplace` | Days to retain read notifications before purge (30). |
| `bazaar_permit_base_price` | `marketplace` | Price of first Bazaar Permit in Shards (200) — doubles per tier. |
| `bazaar_permit_price_multiplier` | `marketplace` | Price multiplier per subsequent permit purchase (2.0). |

#### Salvage `game_configs` Keys (seeded in 053)

| Key | Category | Description |
| :--- | :--- | :--- |
| `salvage_equipment_common_essence` | `salvage` | Base Essence for salvaging Common equipment (5). |
| `salvage_equipment_uncommon_essence` | `salvage` | Base Essence for salvaging Uncommon equipment (15). |
| `salvage_equipment_rare_essence` | `salvage` | Base Essence for salvaging Rare equipment (50). |
| `salvage_equipment_epic_essence` | `salvage` | Base Essence for salvaging Epic equipment (150). |
| `salvage_equipment_legendary_essence` | `salvage` | Base Essence for salvaging Legendary/Cosmic equipment and artifacts (500). |
| `salvage_artifact_multiplier` | `salvage` | Multiplier for artifact salvage vs equipment base rate (2.0). |
| `salvage_curated_bonus_multiplier` | `salvage` | Additional bonus multiplier for curated artifact salvage (1.15). |

---

### 21. Admin Finance Dashboard (3.6, Migration 054)

#### Table: `admin_shard_adjustments`

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| id | SERIAL | PK | Auto-increment primary key |
| player_id | INTEGER | FK → players(id), NOT NULL | Target player for the adjustment |
| admin_email | VARCHAR(255) | NOT NULL | Admin who made the adjustment |
| adjust_type | VARCHAR(10) | NOT NULL | 'grant' or 'debit' |
| amount | INTEGER | NOT NULL, CHECK > 0 | Adjustment amount (always positive) |
| reason | TEXT | NOT NULL | Required explanation for the adjustment |
| balance_before | BIGINT | NOT NULL | Player shard balance before adjustment |
| balance_after | BIGINT | NOT NULL | Player shard balance after adjustment |
| shard_txn_id | INTEGER | FK → shard_transactions(id) | Linked shard transaction record |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp of adjustment |

**Indexes:** `idx_asa_player` (player_id), `idx_asa_admin` (admin_email), `idx_asa_created` (created_at).

#### Marketplace Anomaly `game_configs` Keys (seeded in 054)

| Key | Category | Description |
| :--- | :--- | :--- |
| `anomaly_price_multiplier_threshold` | `marketplace_anomaly` | Multiplier above average price that flags a listing as anomalous (10). |
| `anomaly_rapid_relist_count` | `marketplace_anomaly` | Number of rapid relists within window that triggers anomaly flag (5). |
| `anomaly_rapid_relist_window_minutes` | `marketplace_anomaly` | Time window in minutes for rapid relist detection (60). |
| `anomaly_wash_trade_count` | `marketplace_anomaly` | Number of trades between same buyer/seller pair that flags wash trading (3). |
| `anomaly_wash_trade_window_hours` | `marketplace_anomaly` | Time window in hours for wash trade detection (24). |

---

### 22. Asset Registry (5.7, Migration 055)

#### Table: `asset_registry`

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| id | SERIAL | PK | Auto-increment primary key |
| asset_key | VARCHAR(150) | UNIQUE, NOT NULL | Canonical identifier. Format: `{prefix}_{name}` (e.g., `enemy_sludge`, `bg_ch1_far`). Referenced by `sprite_key` / `icon_sprite_key` columns across game tables. |
| category | VARCHAR(50) | NOT NULL | Asset type: `entity_sprite`, `class_sprite`, `background`, `item_icon`, `artifact_icon`, `achievement_icon`, `skill_icon`, `avatar`, `skin`, `badge`, `flair`, `spell_effect`, `ui_icon`, `narrative_image`, `portrait`. Validated at application level. |
| display_name | VARCHAR(200) | NULL | Human-readable name for admin display. |
| description | TEXT | NULL | Optional longer description or notes. |
| render_definition | JSONB | NOT NULL, DEFAULT `'{}'` | Procedural rendering payload. Contains shapes, colors, sizes, features — everything needed to render the asset at runtime via Canvas 2D / PixiJS. Structure varies by category. |
| tags | JSONB | NOT NULL, DEFAULT `'[]'` | Freeform label array for filtering. Queried with `@>` containment. Examples: `["book_1", "chapter_3", "void"]`. |
| source | VARCHAR(50) | NOT NULL, DEFAULT `'admin'` | Origin: `seed` (migration), `admin` (manual), `generator` (C_ pipeline), `migrated` (converted from filesystem). |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Row creation timestamp. |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last modification. Auto-updated via `trg_asset_registry_updated_at` trigger. |

**Indexes:** `idx_ar_asset_key` (asset_key), `idx_ar_category` (category), `idx_ar_source` (source), `idx_ar_tags` (GIN on tags), `idx_ar_display_name` (display_name).

#### Modified Tables (055)

| Table | Change |
|:---|:---|
| `shop_items` | Renamed `icon_path VARCHAR(255)` → `icon_asset_key VARCHAR(255)`. Now stores `asset_registry.asset_key` reference instead of filesystem path. |
| `shop_bundles` | Renamed `icon_path VARCHAR(255)` → `icon_asset_key VARCHAR(255)`. Same semantics change as `shop_items`. |

---

### 24. Entity Classification System (5.3, Migration 058)

| Table | Description |
| :--- | :--- |
| `entity_types` | Entity classification type lookup table (replaces VARCHAR `entity_type` on entities). Columns: `id SERIAL PK`, `name VARCHAR(50) UNIQUE`, `display_name VARCHAR(100)`, `description TEXT`, `color_hex VARCHAR(7)`, `sort_order INTEGER`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`. Seeded with 9 types: enemy, creature, character, manifestation, object, group, environment, event, other. |
| `entity_families` | Entity family/species grouping lookup table with stat templates (replaces VARCHAR `entity_family` on entities). Columns: `id SERIAL PK`, `name VARCHAR(100) UNIQUE`, `display_name VARCHAR(100)`, `description TEXT`, `icon_key VARCHAR(100)`, `lore_reference TEXT`, `base_stat_template JSONB`, `sort_order INTEGER`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`. |
| `visual_behaviors` | Admin-configurable visual rendering behaviors for battle banner entities. Columns: `id SERIAL PK`, `name VARCHAR(50) UNIQUE`, `display_name VARCHAR(100)`, `description TEXT`, `animation_config JSONB NOT NULL`, `sort_order INTEGER`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`. Seeded with 5 behaviors: grounded_melee, grounded_ranged, airborne, magic_caster, hybrid. **5.4:** Added `stat_weights JSONB` for stat-to-visual weight mapping per behavior. |

---

### 23. Admin Essence Adjustments (5.1, Migration 056)

#### Table: `admin_essence_adjustments`

| Column | Type | Constraints | Description |
|:---|:---|:---|:---|
| id | SERIAL | PK | Auto-increment primary key |
| character_id | INTEGER | FK → player_characters(id) CASCADE, NOT NULL | Target character |
| player_id | INTEGER | FK → players(id) CASCADE, NOT NULL | Owning player (denormalized for fast player-level queries) |
| admin_email | VARCHAR(255) | NOT NULL | Admin who performed the adjustment |
| adjustment_type | VARCHAR(10) | NOT NULL, CHECK IN ('grant', 'debit') | Direction of adjustment |
| amount | DOUBLE PRECISION | NOT NULL, CHECK > 0 | Adjustment amount (always positive) |
| balance_before | DOUBLE PRECISION | NOT NULL | Essence balance before adjustment |
| balance_after | DOUBLE PRECISION | NOT NULL | Essence balance after adjustment |
| reason | VARCHAR(500) | NOT NULL | Required audit reason |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

**Indexes:** `idx_admin_essence_adj_character` (character_id), `idx_admin_essence_adj_player` (player_id), `idx_admin_essence_adj_created` (created_at DESC).

---

### 25. Scaling & Difficulty (5.4, Migration 059)

| Table | Description |
| :--- | :--- |
| `wave_presets` | Named reusable wave configuration templates as JSONB. Fields: name (unique), description, config JSONB, is_default, sort_order. Inheritance chain: scene → chapter → book → global default. |
| `wave_preset_assignments` | Links wave presets to books or chapters. Exactly one of book_id/chapter_id must be non-null (CHECK). Partial unique indexes ensure each book/chapter has at most one preset. |
| `difficulty_curves` | Named difficulty curve profiles with multi-dimension per-chapter multipliers (hp, gold, wave_density, spawn_speed). Books reference by FK. |
| `difficulty_presets` | Named bundles of game_configs snapshot + difficulty_curve FK + wave_preset FK for A/B testing difficulty configurations. At most one active at a time. |

#### Wave `game_configs` Keys (seeded in 059)

| Key | Category | Description |
| :--- | :--- | :--- |
| `wave_default_max_enemies` | `waves` | Default max enemies per wave (fallback) |
| `wave_default_wave_count` | `waves` | Default waves per scene (fallback) |
| `wave_default_spawn_interval_ms` | `waves` | Default spawn interval ms (fallback) |
| `wave_default_spawn_pattern` | `waves` | Default spawn distribution pattern (fallback) |

---

*(Note: For specific column metadata and types, refer to `db/001_init_db_tables.sql`.)*
