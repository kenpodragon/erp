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

*Note: Individual migration history (001-029) has been archived in `db/old/` for historical reference.*

---

## 📊 Current Schema Definition

### 1. Narrative Engine (Book Data)

| Table | Description |
| :--- | :--- |
| `books` | Top-level container for the book series. Includes `transition_lore_text`. **2.4:** Added `recommended_level INTEGER` and `min_level INTEGER` for level-gated progression. |
| `chapters` | Chapters within a book, containing raw text and processing status. Includes `transition_lore_text`. **2.4:** Added `recommended_level INTEGER` and `min_level INTEGER` for level-gated progression. |
| `scenes` | Narrative nodes within chapters, linked to locations. Includes `scene_type` and `boss_config`. |
| `story_beats` | The smallest narrative units within a scene. Includes `content_image_path`, `audio_path`, and `audio_duration_seconds`. |
| `locations` | Master list of canonical locations within the Tower. |
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
| `player_settings` | User-specific preferences (volume, speed, audio toggles, font size, UI scale). |
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
| `scene_gameplay_data` | Gameplay-specific metadata for scenes (required time, background sprite). |
| `entity_gameplay_data` | Gameplay-specific stats for entities (HP, gold, sprite key). |
| `player_story_sessions` | Active combat session state (zone, wave, gold, progress). |
| `session_upgrades` | Temporary upgrades purchased during a Story Mode run. |
| `boss_completions` | Tracks unique boss kills per player for gating and rewards. |
| `scene_audio_sync` | Mapping of audio timestamps to assets (currently unused). |

### 6. Inventory & Collections

| Table | Description |
| :--- | :--- |
| `inventory_items` | Master templates for equipment, consumables, and materials. **2.4.2:** Added `item_code VARCHAR(60)` (5-part procedural code: PREFIX_QUALITY_LORETAG_TYPE_SUFFIX), `item_level INTEGER DEFAULT 1` (power level capped at chapter.recommended_level), `min_char_level INTEGER DEFAULT 1` (minimum character level to equip), `stat_requirements JSONB DEFAULT '{}'` (minimum stat values to equip), `gear_slot_id INTEGER FK gear_slots` (which gear slot this item occupies), `is_dream_item BOOLEAN DEFAULT FALSE` (TRUE for procedurally generated items), `acquired_from VARCHAR(100)` (source context: 'dream_drop', 'admin_grant', etc.). |
| `player_inventory` | Instances of items owned and equipped by characters. **2.4.2:** New trigger `trg_enforce_inventory_slot_cap` enforces max 10 non-equipped items per character. |
| `artifacts` | Unique lore-based items providing global passive bonuses. |
| `player_collections` | Tracks which unique artifacts a character has uncovered. |

### 7. Skills & Training (2.3)

| Table | Description |
| :--- | :--- |
| `stat_definitions` | Definitions for core and dynamic character/enemy stats. |
| `benefit_effect_data` | Metadata for skill and item effects (multipliers, additions). |
| `skills` | Definitions for active and passive skills, including cooldowns, costs, and unlock gates. **2.4:** Added `display_name VARCHAR(100)`, `level_0_xp_requirement INTEGER`, `class_id INTEGER FK character_classes`, `is_class_exclusive BOOLEAN`, `idle_level_scaling JSONB`, `effect_type VARCHAR(50)`. |
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

---

*(Note: For specific column metadata and types, refer to `db/001_init_db_tables.sql`.)*
