# Economy & Anti-Cheat Specification

## Purpose
Economy, Anti-Cheat & Discovery defines server-authoritative validation mechanisms that protect the game economy from manipulation, a social chat system, a discovery/codex system for entities and items, new player onboarding, UI accessibility (reduce motion), and the foundation for future anti-automation enforcement. All corrections are silent and server-side; anomalies are logged for admin review without auto-tickets.

## Requirements

### Requirement: Wave Completion Validation
The system SHALL validate `waves_completed_delta` on every `/tick` request against the player's theoretical maximum DPS ceiling multiplied by a configurable tolerance (`wave_validation_tolerance`, default 2.0x). Excess waves SHALL be clamped to the plausible maximum.

#### Scenario: Implausible wave count clamped
- GIVEN a player with auto DPS of 100 and `wave_validation_tolerance = 2.0`
- WHEN a `/tick` reports completing 500 waves in 1 second when max plausible is 10
- THEN the server clamps waves_completed_delta to 20 (10 × 2.0) and logs an anomaly event

#### Scenario: Burst damage within tolerance accepted
- GIVEN a player who lands a critical skill combo
- WHEN `/tick` reports wave completions within the 2.0x tolerance buffer
- THEN all waves are accepted without clamping

### Requirement: Session Gold Integrity Check
The system SHALL verify total `session_gold` at `/complete` against a plausibility ceiling derived from session duration, highest zone, and player DPS. If gold exceeds the ceiling by more than `session_gold_tolerance` (default 3.0x), the server SHALL correct it down to the plausible maximum and log the anomaly.

#### Scenario: Excessive session gold corrected
- GIVEN a 10-minute session where max plausible gold is 5,000
- WHEN `/complete` is called reporting 50,000 gold
- THEN gold is corrected to 5,000 and an `anti_cheat_anomaly` event is logged with reported and corrected values

### Requirement: CPS Rate Limiting with Client Feedback
The system SHALL enforce a `click_rate_cap` (default 20 CPS). When a `/tick` returns `cps_valid: false`, the `GoldOdometer` SHALL flash red (Tier 1). If violations persist beyond `cps_warning_threshold_seconds`, a non-blocking toast SHALL display: "Excessive automated clicking detected. Max {CPS_CAP} CPS is recorded." (Tier 2).

#### Scenario: Tier 1 visual feedback on CPS violation
- GIVEN a player clicking at 30 CPS
- WHEN the `/tick` response returns `cps_valid: false`
- THEN the GoldOdometer component flashes red for a brief duration

#### Scenario: Tier 2 toast after sustained violations
- GIVEN `cps_warning_threshold_seconds = 10` and a player continuously clicking at 30 CPS
- WHEN 10 seconds of violations have elapsed
- THEN a non-blocking toast appears warning about the CPS cap

### Requirement: Anomaly Logging
The system SHALL log all anti-cheat anomalies to `activity_events` with `event_type = 'anti_cheat_anomaly'`. Each log SHALL include player_id, session_id, anomaly type, reported value, corrected value, and timestamp. Anomaly events SHALL be filterable in the admin activity log viewer.

#### Scenario: All anomaly types are logged
- GIVEN any of: CPS violation, gold correction, wave clamp, session integrity correction, or uniform click interval detection
- WHEN the anomaly occurs
- THEN an `activity_events` record is created with the full payload

### Requirement: Reduce Motion Accessibility
The system SHALL store a `reduce_motion` preference in `player.settings` JSONB. When enabled, all animated components (BottomAnimatedBanner, CombatStage particles/shake, SkillsHotbar glow, GoldOdometer scroll, NarrativeReveal particles) SHALL suppress animations. The `BottomAnimatedBanner` SHALL be replaced with a static bar to avoid unnecessary WebGL context creation.

#### Scenario: Reduce motion suppresses PixiJS banner
- GIVEN a player with `reduce_motion: true`
- WHEN the game loads
- THEN BottomAnimatedBanner is not mounted; a static `[ClassIcon] CharacterName Lv.{level}` bar renders instead

### Requirement: Discovery System (Akashic Codex)
The system SHALL track per-player entity encounters and kills in `player_entity_discovery`. Rank SHALL progress NULL → E → C → A → SS based on kill count thresholds from `game_configs`. The system SHALL also track discovered skills, item components, and effects in `player_discovery_log`. Skills and item components SHALL be auto-discovered on first purchase or acquisition, displaying a "New" badge until viewed. The Hub SHALL display global discovery progress counters (X/Y entities discovered, X/Y skills unlocked, overall completion %).

#### Scenario: Entity rank advances on kill threshold
- GIVEN rank thresholds `codex_rank_e=1`, `codex_rank_c=25`
- WHEN a player kills an entity for the 25th time
- THEN the entity's `rank` column updates to 'C' in `player_entity_discovery`

#### Scenario: Item component discovered on first possession
- GIVEN a player receives an item containing a prefix they have never seen
- WHEN the item is delivered to their inventory
- THEN a `player_discovery_log` record is created for `discovery_type='item_prefix'`

#### Scenario: Skill discovered on first purchase
- GIVEN a player purchases a skill they have never owned before
- WHEN the purchase is confirmed
- THEN a `player_discovery_log` record is created with `discovery_type='skill'` and `is_new = true`

#### Scenario: Hub discovery counter reflects progress
- GIVEN a player has discovered 47 of 200 entities and 8 of 34 skills
- WHEN the Hub overview panel loads
- THEN it SHALL display "47/200 Entities" and "8/34 Skills" and an overall completion percentage

### Requirement: Random Rare Entity Spawns
The system SHALL maintain a rare entity pool with no fixed scene associations. Each wave SHALL have a config-driven spawn chance (`rare_entity_spawn_chance`, default 0.01) to replace a regular enemy with a rare entity. When a rare entity spawns, a visual indicator (VFX flash or distinct color border) SHALL alert the player.

#### Scenario: Rare entity spawns mid-wave
- GIVEN `rare_entity_spawn_chance = 0.05` and a player in any story mode scene
- WHEN a wave begins
- THEN there is a 5% chance one enemy slot is replaced by a rare entity from the pool

#### Scenario: Rare entity drop broadcast
- GIVEN a player defeats a rare entity
- WHEN the kill is registered
- THEN the chat system MAY broadcast a system message if the drop is sufficiently rare (controlled by `rare_drop_broadcast_threshold`)

### Requirement: Welcome Modal and Interactive Tutorial
The system SHALL display a version-tracked Welcome Modal combining a changelog summary and a tutorial link on first login after a new version. Players who dismiss it SHALL NOT see it again for that version. The system SHALL provide a 7-step coach-mark overlay tutorial that is skippable and replayable from settings, with no in-game rewards attached.

#### Scenario: Welcome modal auto-display on new version
- GIVEN a player logs in after a game version increment
- WHEN their stored `last_seen_version` does not match the current version
- THEN the Welcome Modal is shown; `last_seen_version` is updated on dismiss

#### Scenario: Tutorial replay from settings
- GIVEN a player who has already completed the tutorial
- WHEN they navigate to Settings and select "Replay Tutorial"
- THEN the 7-step coach-mark overlay restarts from step 1

### Requirement: Chat System
The system SHALL provide a WebSocket chat endpoint (`/ws/chat`) requiring Firebase JWT authentication. Messages SHALL be stored in a rolling in-memory buffer (configurable size, default 200). A server-side Aho-Corasick profanity filter SHALL replace blocked content with `*****`. Per-player message rate limiting SHALL be enforced via `chat_rate_limit_per_minute`. Admins SHALL be able to mute players, manage channels, and monitor chat via the admin panel. The system SHALL broadcast rate-limited system messages for milestone events (boss clears, chapter completions, rare drops).

#### Scenario: Unauthenticated connection rejected
- GIVEN a WebSocket connection attempt without a valid Firebase JWT
- WHEN the connection is initiated
- THEN the server closes the connection immediately

#### Scenario: Profanity filtered before broadcast
- GIVEN a player sends a message containing a word in the blocklist
- WHEN the server processes the message
- THEN the blocked word is replaced with `*****` before broadcasting to all connected players

#### Scenario: System broadcast on boss clear
- GIVEN a player defeats a chapter boss for the first time
- WHEN the boss kill is processed
- THEN a system message SHALL be broadcast to the global channel, rate-limited to prevent spam

#### Scenario: Admin mutes a player
- GIVEN an admin sets `chat_muted = true` on a player with a `chat_muted_until` timestamp
- WHEN the muted player sends a chat message before the expiry
- THEN the server rejects the message with a "You are muted" response without broadcasting

## Design

### Anti-Cheat Algorithm (Wave Validation)
```
theoretical_dps = auto_dps + click_dps_rate + active_skill_contributions
max_waves = floor(theoretical_dps * elapsed_s / zone_hp(current_zone))
allowed_waves = floor(max_waves * wave_validation_tolerance)
if waves_completed_delta > allowed_waves: clamp + log anomaly
```

### Reduce Motion Priority Chain
1. `player.settings.reduce_motion` (explicit user toggle) — highest priority
2. OS `prefers-reduced-motion` media query — baseline
3. Default: motion ON

CSS class `.reduce-motion` applied to `<body>` when toggle is active.

### Chat Architecture
- FastAPI native WebSocket, no external broker
- In-memory rolling buffer only — no DB persistence for messages
- `chat_channels` table stores channel metadata only (multi-channel schema, only `global` active)
- Client reconnects with exponential backoff; receives buffer on reconnect

### Module Structure
- Anti-cheat: extends `backend/routes/story_mode.py` (`/tick`, `/complete`)
- Reduce Motion: `PATCH /api/players/me/settings`, `frontend/src/game/components/BottomAnimatedBanner.tsx`
- Discovery: `backend/routes/discovery.py`, `backend/services/discovery_service.py`
- Chat: `backend/routes/chat.py` (WebSocket), `backend/services/chat_service.py`

## Schema

**Migrations 041–045** (applied).

### New Tables

| Table | Migration | Purpose |
|:---|:---|:---|
| `player_entity_discovery` | 042 | Per-player entity encounter/kill/rank tracking |
| `player_discovery_log` | 042 | Per-player skill/item component discovery log |
| `chat_channels` | 044 | Channel metadata (global channel seeded) |

### Table: `player_entity_discovery`
- `(player_id, entity_id)` UNIQUE
- `encounters`, `kills` INTEGER counters
- `rank` VARCHAR(2) denormalized cache: NULL / 'E' / 'C' / 'A' / 'SS'
- `is_new` BOOLEAN badge flag, cleared on codex view

### Table: `chat_channels`
- `id` VARCHAR(50) PK (e.g., 'global')
- `channel_type` VARCHAR(20): 'global', 'chapter', 'book', 'custom'
- `is_active` BOOLEAN

### Anti-Cheat Config Keys (migration 041)
`wave_validation_tolerance=2.0`, `session_gold_tolerance=3.0`, `cps_warning_threshold_seconds=10`, `uniform_click_detection_window=5`

### Player Settings Extension (migration 045)
`players` gains `chat_muted BOOLEAN` and `chat_muted_until TIMESTAMPTZ` columns.
