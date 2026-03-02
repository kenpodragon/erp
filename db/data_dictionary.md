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

---

## 📊 Current Schema Definition

### 1. Narrative Engine (Book Data)

| Table | Description |
| :--- | :--- |
| `books` | Top-level container for the book series. |
| `chapters` | Chapters within a book, containing raw text and processing status. |
| `scenes` | Narrative nodes within chapters, linked to locations. |
| `story_beats` | The smallest narrative units within a scene, tracking intensity and pacing. |
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
| `player_story_sessions` | Active combat session state, allowing for "Continue" functionality. |
| `session_upgrades` | Temporary upgrades purchased with gold during a Story Mode run. |
| `player_meta_progression` | Permanent currency (Elysium Essence) earned from active play. |
| `game_configs` | Admin-tunable game settings (scaling, caps, rates). |
| `scene_audio_sync` | Precise mapping of audio timestamps to text assets (PNGs). |

### 8. Support & Administration

| Table | Description |
| :--- | :--- |
| `support_tickets` | Player-submitted help requests and bug reports. |
| `support_replies` | Conversations within support tickets (player and admin). |
| `support_attachments` | Files uploaded to support tickets. |
| `admin_whitelist_emails` | Email-based access control for the Admin Panel. |
| `admin_whitelist_ips` | IP-based access control for the Admin Panel. |
| `server_config` | Legacy system configuration (to be unified with `game_configs`). |
| `activity_events` | Granular player activity log for anti-cheat and analytics. |
| `admin_audit_log` | Detailed log of all administrative actions. |

---

*(Note: For specific column metadata and types, refer to the individual `.sql` migration files in the `/db` directory.)*
