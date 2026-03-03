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
| `001` | Book Agent Reader Schema | Created core narrative tables: `books`, `chapters`, `locations`, `scenes`, `story_beats`, `entities`, `entity_aliases`, `entity_scene_appearances`, `entity_beat_appearances`, `location_aliases`, `location_scene_appearances`, `semantic_tags`, `processing_runs`, `review_items`. |
| `002` | Onboarding & Admin | Created `players`, `player_settings`, `character_classes`, `player_characters`, `support_tickets`, `support_replies`, `support_attachments`, `server_config`, `activity_events`, `admin_audit_log`. Seeded initial classes. |
| `003` | Character Game State | Created `player_progress` and `player_essence` tables to track character position and currency. |
| `004` | Support Ticket Updates | Added `player_last_viewed_at` and `admin_last_viewed_at` to `support_tickets`. |
| `005` | Force Logout | Added `sessions_invalid_before` to `players` table. |
| `006` | User Roles | Added granular roles (`is_owner`, `is_system_admin`, `is_game_admin`) to `players`. |
| `007` | Admin Access Control | Created `admin_whitelist_emails` and `admin_whitelist_ips` for dynamic access management. |
| `008` | Admin IP Toggle | Added `ops.admin_ip_whitelist_enabled` to `server_config`. |
| `009` | Rename Classes | Renamed classes to Sci-Fi/Cosmic Horror (e.g., Sentinel -> Engineer). Updated lore and sprite keys. |
| `010` | Game Entities | Created `scene_gameplay_data`, `entity_gameplay_data`, `stat_definitions`, `benefit_effect_data`, and `skills`. Seeded initial stats and skills. |
| `011` | Inventory & Collections | Created `inventory_items`, `player_inventory`, `artifacts`, and `player_collections`. Seeded "Rule of 4" Artifacts. |
| `012` | Standardize Scene Durations | Standardized `required_time_seconds` to 300 across all scenes in `scene_gameplay_data`. |
| `013` | Story Mode State | Created `game_configs`, `player_story_sessions`, `session_upgrades`, and `player_meta_progression`. Added `uuid-ossp` extension. |
| `014` | Skill & Config Refinement | Added cooldown/cost columns to `skills`. Created `scene_audio_sync`. Added `crit_multiplier` and `wave_duration_seconds` to `game_configs`. |
| `015` | Story Mode Additions | Created `dev_content_audit` and `character_skill_levels` tables. Added `narrative_progress_pct` to `player_story_sessions`. Added `narration_wpm` to `player_settings`. Seeded `auto_dps_base`, `gold_drop_bonus`, `click_storm_cps` benefit effects. Seeded "Auto-Strike" idle skill + 9 active Story Mode hotbar skills (Clickstorm, Powersurge, Lucky Strikes, Metal Detector, Golden Clicks, The Dark Ritual, Super Clicks, Energize, Reload). Seeded `base_auto_dps_tick_ms`, `default_player_wpm`, `boss_enrage_seconds`, `primal_boss_chance` game configs. |
| `016` | Story Beats Image Path | Added `content_image_path VARCHAR(255) DEFAULT NULL` to `story_beats`. Hook point for future PNG-based copy-protected narrative assets. NULL for all existing rows; will be populated by the asset pipeline. |
| `017` | Story Beats Audio Columns | Added `audio_path VARCHAR(255) DEFAULT NULL` and `audio_duration_seconds INTEGER NOT NULL DEFAULT 0` to `story_beats`. Syncs DB with ORM model; hooks for future per-beat audio narration and WPM-gating fallback. |
| `018` | Player Settings Polish | Added `narration_font_size`, `narration_block_height`, `ui_scale`, and `game_text_scale` to `player_settings`. Added `first_clear_multiplier` to `game_configs`. |
| `019` | Game Configs Expansion | Moved hardcoded combat/upgrade constants (`monsters_per_zone`, `boss_zone_interval`, `crit_chance`, `auto_dps_tick_ms`, `gcd_ms`, `upgrade_cost_scaling`, `cd_reduction_per_level`, `max_cd_reduction`, `base_click_upgrade_cost`, `base_auto_dps_upgrade_cost`, `base_skill_unlock_cost`, `base_skill_level_upgrade_cost`, `milestone_interval`, `milestone_start`, `click_dmg_mult_per_level`, `auto_dps_mult_per_level`) to `game_configs`. |
| `020` | Fix Meta Progression Timestamp | Renamed `last_updated_at` to `updated_at` in `player_meta_progression` to align with the shared `update_timestamp_column` trigger. |

---

## 📊 Current Schema Definition

### 1. Narrative Engine (Book Data)

| Table | Description |
| :--- | :--- |
| `books` | Top-level container for the book series. |
| `chapters` | Chapters within a book, containing raw text and processing status. |
| `scenes` | Narrative nodes within chapters, linked to locations. |
| `story_beats` | The smallest narrative units within a scene, tracking intensity and pacing. Includes `content_image_path` (PNG hook, NULL), `audio_path` (per-beat audio, NULL), and `audio_duration_seconds` (WPM-gating fallback, defaults 0). |
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
| `players` | Core user account data, roles, and status. |
| `player_settings` | User-specific preferences (volume, speed, audio toggles). |
| `character_classes` | Definitions for player classes (Engineer, Conduit, etc.). |
| `player_characters` | Instances of characters owned by players, tracking level and stats. |

### 4. Core Character State (Live)

| Table | Description |
| :--- | :--- |
| `player_progress` | The current "Save Point" for a character's narrative journey. |
| `player_essence` | Live currency balance and passive generation rates for a character. |

### 5. Game Mechanics (Loop 2.0)

| Table | Description |
| :--- | :--- |
| `scene_gameplay_data` | Gameplay-specific metadata for scenes (time gate, background). |
| `entity_gameplay_data` | Gameplay-specific stats for entities (HP, gold drop rate). |
| `stat_definitions` | Definitions for core and dynamic character/enemy stats. |
| `benefit_effect_data` | Metadata for skill and item effects (multipliers, additions). |
| `skills` | Definitions for active and passive skills, including cooldowns and costs. |

### 6. Inventory & Collections

| Table | Description |
| :--- | :--- |
| `inventory_items` | Master templates for equipment, consumables, and materials. |
| `player_inventory` | Instances of items owned and equipped by characters. |
| `artifacts` | Unique lore-based items providing global passive bonuses. |
| `player_collections` | Tracks which unique artifacts a character has uncovered. |

### 7. Story Mode (Loop B)

| Table | Description |
| :--- | :--- |
| `player_story_sessions` | Active combat session state, including zone/wave/gold progress and `narrative_progress_pct` (WPM-based, 0–100). |
| `session_upgrades` | Temporary upgrades (click_dmg, auto_dps, skill_unlock) purchased with gold during a Story Mode run. |
| `player_meta_progression` | Permanent currency (Elysium Essence) earned from active play. |
| `game_configs` | **Game-specific tuning** (scaling factors, caps, rates). Distinct from `server_config` (see §8). Managed via admin panel and seeded in migrations. |
| `scene_audio_sync` | Mapping of audio timestamps to text/PNG assets for future Eleven Reader integration (currently unused). |
| `character_skill_levels` | Per-character skill XP and level, bridging Story Mode (auto-DPS calculation) and Idle Training (2.3). Defaults to level 1 if no record exists. |
| `dev_content_audit` | Auto-logged entries for missing enemy sprites, stats, or entities detected during combat session start. Used by the content pipeline to prioritize missing assets. |

### 8. Support & Administration

| Table | Description |
| :--- | :--- |
| `support_tickets` | Player-submitted help requests and bug reports. |
| `support_replies` | Conversations within support tickets (player and admin). |
| `support_attachments` | Files uploaded to support tickets. |
| `admin_whitelist_emails` | Email-based access control for the Admin Panel. |
| `admin_whitelist_ips` | IP-based access control for the Admin Panel. |
| `server_config` | **Operational/admin settings** (maintenance mode, rate limits, feature flags). Managed by admins at runtime. NOT for game tuning — use `game_configs` for that. |
| `activity_events` | Granular player activity log for anti-cheat and analytics. |
| `admin_audit_log` | Detailed log of all administrative actions. |

---

*(Note: For specific column metadata and types, refer to the individual `.sql` migration files in the `/db` directory.)*
