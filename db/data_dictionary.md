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

*Note: Individual migration history (001-029) has been archived in `db/old/` for historical reference.*

---

## 📊 Current Schema Definition

### 1. Narrative Engine (Book Data)

| Table | Description |
| :--- | :--- |
| `books` | Top-level container for the book series. Includes `transition_lore_text`. |
| `chapters` | Chapters within a book, containing raw text and processing status. Includes `transition_lore_text`. |
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
| `character_classes` | Definitions for player classes (Engineer, Conduit, Drifter, Vessel). |
| `player_characters` | Instances of characters owned by players, tracking level and stats. |

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
| `inventory_items` | Master templates for equipment, consumables, and materials. |
| `player_inventory` | Instances of items owned and equipped by characters. |
| `artifacts` | Unique lore-based items providing global passive bonuses. |
| `player_collections` | Tracks which unique artifacts a character has uncovered. |

### 7. Skills & Training (2.3)

| Table | Description |
| :--- | :--- |
| `stat_definitions` | Definitions for core and dynamic character/enemy stats. |
| `benefit_effect_data` | Metadata for skill and item effects (multipliers, additions). |
| `skills` | Definitions for active and passive skills, including cooldowns, costs, and unlock gates. |
| `skill_actions` | Catalog of trainable sub-actions within each idle skill (XP, interval, lore). |
| `character_skill_levels` | Per-character skill XP and level. Tracks active idle training state. |
| `dev_content_audit` | Auto-logged entries for missing assets or stats detected during gameplay. |

### 8. Support & Administration

| Table | Description |
| :--- | :--- |
| `support_tickets` | Player-submitted help requests and bug reports. |
| `support_replies` | Conversations within support tickets (player and admin). |
| `support_attachments` | Files uploaded to support tickets. |
| `admin_whitelist_emails` | Email-based access control for the Admin Panel. |
| `admin_whitelist_ips` | IP-based access control for the Admin Panel. |
| `server_config` | **Operational/admin settings** (maintenance mode, rate limits). |
| `game_configs` | **Game-specific tuning** (scaling factors, caps, rates). |
| `activity_events` | Granular player activity log for anti-cheat and analytics. |
| `admin_audit_log` | Detailed log of all administrative actions. |

---

*(Note: For specific column metadata and types, refer to `db/001_init_db_tables.sql`.)*
