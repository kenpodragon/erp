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
The system SHALL track per-player entity encounters and kills in `player_entity_discovery`. Rank SHALL progress NULL → E → C → A → SS based on kill count thresholds from `game_configs`. The system SHALL also track discovered skills, item components, and effects in `player_discovery_log`.

#### Scenario: Entity rank advances on kill threshold
- GIVEN rank thresholds `codex_rank_e=1`, `codex_rank_c=25`
- WHEN a player kills an entity for the 25th time
- THEN the entity's `rank` column updates to 'C' in `player_entity_discovery`

#### Scenario: Item component discovered on first possession
- GIVEN a player receives an item containing a prefix they have never seen
- WHEN the item is delivered to their inventory
- THEN a `player_discovery_log` record is created for `discovery_type='item_prefix'`

### Requirement: Chat System
The system SHALL provide a WebSocket chat endpoint (`/ws/chat`) requiring Firebase JWT authentication. Messages SHALL be stored in a rolling in-memory buffer (configurable size, default 200). A server-side Aho-Corasick profanity filter SHALL replace blocked content with `*****`. Per-player message rate limiting SHALL be enforced via `chat_rate_limit_per_minute`.

#### Scenario: Unauthenticated connection rejected
- GIVEN a WebSocket connection attempt without a valid Firebase JWT
- WHEN the connection is initiated
- THEN the server closes the connection immediately

#### Scenario: Profanity filtered before broadcast
- GIVEN a player sends a message containing a word in the blocklist
- WHEN the server processes the message
- THEN the blocked word is replaced with `*****` before broadcasting to all connected players

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
