# Elysium Rising API Reference

> **Audience:** Backend developers and API consumers. Technical endpoint reference with HTTP methods, paths, request/response schemas.
> For the admin dashboard user guide, see [`admin/docs/API_GUIDE.md`](../../admin/docs/API_GUIDE.md).

> Generated from backend route scan. Serves as developer reference and simulation bot contract.
>
> **Base URL:** `http://localhost:8000` (dev) | `https://play.does-god-exist.org` (prod)
>
> **Auth:** Firebase JWT in `Authorization: Bearer <token>` header unless noted otherwise.
>
> **Middleware:** Maintenance mode blocks all `/api/*` except `/api/config/public` and `/api/admin/*` when `ops.maintenance_mode` is enabled.

---

## Table of Contents

- [1. Public (No Auth)](#1-public-no-auth)
- [2. Authentication](#2-authentication)
- [3. Player Profile](#3-player-profile)
- [4. Characters](#4-characters)
- [5. Game Content](#5-game-content)
- [6. Story Mode (Combat Loop B)](#6-story-mode-combat-loop-b) **[SIMULATION-CRITICAL]**
- [7. Idle Training (Loop A)](#7-idle-training-loop-a) **[SIMULATION-CRITICAL]**
- [8. Character Progression](#8-character-progression) **[SIMULATION-CRITICAL]**
- [9. Inventory](#9-inventory)
- [10. Discovery & Registry](#10-discovery--registry)
- [11. Home Base](#11-home-base)
- [12. Audio](#12-audio)
- [13. Chat](#13-chat)
- [14. Shop (Shard Store)](#14-shop-shard-store)
- [15. Payments (Stripe)](#15-payments-stripe)
- [16. Subscriptions](#16-subscriptions)
- [17. Donations](#17-donations)
- [18. Marketplace (P2P Trading)](#18-marketplace-p2p-trading)
- [19. Support](#19-support)
- [20. Webhooks](#20-webhooks)
- [21. Admin Endpoints](#21-admin-endpoints)

---

## 1. Public (No Auth)

**Router:** `routes/public.py` | **Prefix:** none | **Auth:** None

### `GET /`
**Response:** Welcome message with endpoint listing.

### `GET /health`
**Response:** `{ status, database, database_error, environment }` — DB connectivity check.

### `GET /hello`
**Response:** `{ message: "Hello from the ERP Backend!" }`

### `GET /api/config/public`
**Auth:** None (exempt from maintenance mode)
**Response:** Public configuration keys the frontend needs before auth:
- `ops.maintenance_mode`, `ops.maintenance_message`
- `ops.announcement_banner`, `ops.announcement_type`
- Feature flags, game version

---

## 2. Authentication

**Router:** `routes/auth.py` | **Prefix:** `/api/auth` | **Tags:** `auth`

### `POST /api/auth/login`
**Auth:** Firebase JWT (validates token, upserts player)
**Request Body:** None (token provides identity)
**Response:** Full player profile with characters, settings, `is_new_player` flag.
**Notes:** Creates Player, PlayerSettings, PlayerMetaProgression on first login. Returns existing character list if any. Logs `login` activity event.

### `POST /api/auth/logout`
**Auth:** Player
**Response:** `{ message: "Logged out" }`
**Notes:** Logs `logout` activity event. Server-side is stateless (Firebase tokens are client-managed).

---

## 3. Player Profile

**Router:** `routes/players.py` | **Prefix:** `/api/players` | **Tags:** `players`

### `GET /api/players/me`
**Auth:** Player
**Response:** Full player profile with settings (display name, avatar, narration WPM, theme, etc.).

### `POST /api/players/me/reset`
**Auth:** Player
**Response:** Confirmation of account reset.
**Notes:** Deletes character, progress, essence, inventory, and related data. Irreversible.

### `GET /api/players/check-alias`
**Auth:** Player
**Query:** `alias` (string) — The display name to check.
**Response:** `{ available: bool, reason?: string }` — Profanity filter applied.

### `PATCH /api/players/me`
**Auth:** Player
**Request Body:** Partial update fields (display_name, bio, etc.)
**Response:** Updated player profile.
**Notes:** Profanity filter on display name. Sanitizes text inputs.

### `POST /api/players/me/avatar`
**Auth:** Player
**Request Body:** `UploadFile` (multipart form)
**Response:** `{ avatar_url }` — Stored in `/uploads/`.

### `POST /api/players/me/accept-terms`
**Auth:** Player
**Response:** Confirmation. Sets `terms_accepted_at`.

### `PATCH /api/players/me/settings`
**Auth:** Player
**Request Body:** Partial settings update (narration_wpm, theme, sfx_volume, etc.)
**Response:** Updated settings object.

---

## 4. Characters

**Router:** `routes/characters.py` | **Prefix:** `/api/players/me/characters` | **Tags:** `characters`

### `POST /api/players/me/characters/`
**Auth:** Player
**Request Body:** `{ character_name: string, class_id: int }`
**Response:** Created character with base stats, progress, and essence records.
**Notes:** MVP: one character per player. Profanity filter on name. Initializes PlayerProgress (Book 1, Chapter 1, Scene 1, Beat 1), PlayerEssence, and copies class base stats.

### `GET /api/players/me/characters/`
**Auth:** Player
**Response:** Array of player's characters with class info.

### `DELETE /api/players/me/characters/{character_id}`
**Auth:** Player
**Response:** Confirmation of deletion.
**Notes:** Cascades to progress, essence, inventory, skill levels, story sessions.

### `GET /api/players/me/characters/{character_id}`
**Auth:** Player
**Response:** Single character detail with class info.

---

## 5. Game Content

**Router:** `routes/game.py` | **Prefix:** `/api/game` | **Tags:** `game`

### `GET /api/game/classes`
**Auth:** None (public)
**Response:** Array of available `CharacterClass` records (name, description, base stats).

### `GET /api/game/map`
**Auth:** Player
**Response:** Full book > chapter > scene hierarchy with player progress states.
- Each scene has `status`: `mastered` | `in_progress` | `available` | `locked`
- Boss nodes (chapter_boss, book_boss) appended at end of chapter scene lists
- Boss unlock requires mastering all normal scenes in chapter/book
- Includes `gameplay_data` per scene and completion percentages

### `POST /api/game/debug/advance`
**Auth:** Player
**Response:** Updated progress record.
**Notes:** DEBUG endpoint. Advances beat/scene/chapter/book by 1. Rule of 4 structure.

### `GET /api/game/stat-definitions`
**Auth:** Player
**Response:** Array of all `StatDefinition` records.

### `GET /api/game/scenes/{scene_id}`
**Auth:** Player
**Response:** Scene detail with story beats and gameplay_data.

### `GET /api/game/artifacts`
**Auth:** Player
**Response:** All artifacts with `unlocked` boolean per current character.

### `GET /api/game/leaderboards`
**Auth:** Player
**Query:** `type` (`progression` | `essence`), `limit` (default 10)
**Response:** Ranked list of players by progression or essence balance.

### `GET /api/game/journal`
**Auth:** Player
**Response:** Scene summaries for all completed scenes (narrative journal).

### `GET /api/game/enemies/encountered`
**Auth:** Player
**Response:** All enemy entities with gameplay data.

### `GET /api/game/assets/batch`
**Auth:** None (assets are not secret)
**Query:** `keys` (comma-separated asset keys, max 50)
**Response:** `{ items: [{ asset_key, category, render_definition, display_name, tags }] }`

### `POST /api/game/audit`
**Auth:** None
**Request Body:** `FrontendAuditReport`
- `audit_type` (string, max 50) — e.g. `"missing_asset"`
- `asset_key` (string, max 150)
- `category` (string, max 50)
- `source` (string, default `"frontend_renderer"`)

**Response:** 204 No Content
**Notes:** Fire-and-forget missing-asset reports from frontend. Deduplicates on (audit_type, entity_name).

---

## 6. Story Mode (Combat Loop B)

**Router:** `routes/story_mode.py` | **Prefix:** `/api/game/story` | **Tags:** `story_mode`

> **SIMULATION-CRITICAL**: These endpoints drive the core combat/clicker loop. The simulation bot will call these in sequence: `start` -> repeated `tick` -> `upgrade`/`skill` -> `complete`.

### Constants & Config
- `DEFAULT_HP_SCALING = 1.55`
- `DEFAULT_CPS_CAP = 20` (clicks per second)
- `DEFAULT_WPM = 200` (words per minute for narrative timing)
- `DEFAULT_CLICK_STRENGTH = 10`

### `GET /api/game/story/configs`
**Auth:** Player
**Response:** Flat `{ key: value }` dict of all `GameConfig` entries for the combat engine.
**Key configs:** `click_rate_cap`, `hp_scaling`, `upgrade_cost_scaling`, `base_click_upgrade_cost`, `base_auto_dps_upgrade_cost`, `codex_rank_*` thresholds, `milestone_*` settings.

### `GET /api/game/story/scenes/{scene_id}/narrative`
**Auth:** Player
**Response:** Story beats for the scene with:
- `word_count` per beat
- `display_delay_seconds` based on player's WPM setting
- `total_estimated_seconds` from SceneGameplayData
**Notes:** Respects `PlayerSettings.narration_wpm` override.

### `GET /api/game/story/scenes/{scene_id}/enemies`
**Auth:** Player
**Response:** Enemy entities for scene with gameplay data (HP, gold, attack type, stat block).
**Notes:** Falls back to stat injection if EntityGameplayData missing. Logs content audit for missing data.

### `POST /api/game/story/session/start`
**Auth:** Player
**Request Body:** `SessionStartRequest`
- `scene_id` (int) — Scene to enter

**Response:** Session object:
```json
{
  "session_id": "uuid",
  "scene_id": 1,
  "current_zone": 1,
  "current_wave": 1,
  "gold": 0,
  "total_clicks": 0,
  "total_kills": 0,
  "status": "active",
  "upgrades": [],
  "active_skills": [],
  "dark_ritual_multiplier": 1.0,
  "narrative_progress_pct": 0.0,
  "click_strength": 10,
  "created_at": "...",
  "resumed": false
}
```
**Notes:** Creates or resumes an active session. Only one active session per player — if an existing active session exists for the same scene, it resumes it. If an active session exists for a different scene, returns 409. Character's click_strength stat is loaded for the session.

### `GET /api/game/story/session/{session_id}`
**Auth:** Player
**Response:** Full session state including upgrades, computed multipliers, zone HP/gold values.
**Notes:** Computes `click_mult`, `auto_mult` from session upgrades using milestone bonus system.

### `POST /api/game/story/session/{session_id}/tick`
**Auth:** Player
**Request Body:** `TickRequest`
- `clicks` (int) — Clicks since last tick
- `elapsed_ms` (int) — Milliseconds since last tick
- `zone` (int) — Current zone
- `wave` (int) — Current wave
- `gold_delta` (float) — Client-reported gold earned this tick
- `waves_completed_delta` (int) — Waves completed since last tick
- `entity_encounters` (optional list) — `[{ entity_id, encounters, kills }]`
- `item_discoveries` (optional list) — `[{ type, reference_id }]`

**Response:** Updated session state with validated values.

**Anti-Cheat Behaviors:**
1. **CPS Clamping:** If `clicks / elapsed_s > click_rate_cap` (default 20), clicks are clamped to `cap * elapsed_s`. Logs `cps_violation` anomaly.
2. **Wave Completion Validation (2.6.1):** Server calculates max possible waves based on character DPS, zone HP, and elapsed time. If reported waves exceed theoretical max, they are clamped. Logs `wave_clamp` anomaly.
3. **Gold Correction:** Server computes expected gold from validated kills/waves using `_calc_zone_gold(zone)`. Client-reported `gold_delta` is replaced with server-calculated value. Logs `gold_correction` anomaly if discrepancy detected.
4. **Discovery Recording (2.6.2):** Entity encounters and item discoveries are recorded server-side for the codex/bestiary system.

### `POST /api/game/story/session/{session_id}/upgrade`
**Auth:** Player
**Request Body:** `UpgradeRequest`
- `upgrade_type` (string) — `click_dmg` | `auto_dps` | `skill_unlock` | `skill_level`
- `target_id` (int, optional) — Skill ID for skill upgrades
- `quantity` (int, default 1) — Levels to purchase (x1/x10/x100/MAX)

**Response:** Updated upgrade state with new level, cost for next, and updated multipliers.

**Notes:**
- Cost formula: `base_cost * (scaling ^ current_level)` per level, summed for quantity.
- Scaling default: `1.07` per level.
- Base costs configurable: `base_click_upgrade_cost` (10), `base_auto_dps_upgrade_cost` (25), `base_skill_unlock_cost` (50), `base_skill_level_upgrade_cost` (100).
- **Magic level gates** for hotbar skills: specific skills require Magic skill at certain levels (hardcoded gates per 2.3 spec).
- Milestone bonuses at configurable intervals (default every 25 levels starting at 200) grant bonus multiplier.

### `POST /api/game/story/session/{session_id}/skill`
**Auth:** Player
**Request Body:** `SkillActivateRequest`
- `skill_id` (int) — Skill to activate

**Response:** `{ skill_id, skill_name, benefits, dark_ritual_multiplier, activated: true }`

**Notes:** Skill must be purchased (`skill_unlock` upgrade) in current session. Special handling for `dark_ritual_multiplier` — multiplicatively stacks on the session.

### `POST /api/game/story/session/{session_id}/narrative`
**Auth:** Player
**Request Body:** `NarrativeUpdateRequest`
- `progress_pct` (float) — 0.0 to 100.0

**Response:** Updated narrative progress percentage (clamped to 0.0-100.0).

**Notes:** Tracks how far through the scene's story beats the player has read. Used for scene completion validation.

### `POST /api/game/story/session/{session_id}/complete`
**Auth:** Player
**Request Body:** None

**Response:** Completion summary:
```json
{
  "essence_earned": 150,
  "gold_earned": 5000,
  "total_clicks": 1234,
  "total_kills": 567,
  "zones_cleared": 10,
  "duration_seconds": 300,
  "progress_advanced": true,
  "new_book": 1, "new_chapter": 1, "new_scene": 2,
  "boss_defeated": false,
  "item_drop": null,
  "achievements_earned": [],
  "system_broadcast": true
}
```

**Anti-Cheat Behaviors:**
- **Gold correction:** Final gold is server-validated against accumulated tick data.
- **Essence calculation:** Based on zones cleared, wave progress, and configurable multipliers. Subscriber multipliers applied.
- **Progress advancement:** Moves PlayerProgress to next scene/chapter/book based on linear progression.
- **Boss completion:** Records BossCompletion for chapter_boss/book_boss scenes.
- **Item drops:** Rolls for loot drops based on scene gameplay data and drop tables.
- **System broadcast:** Fires chat notification for notable completions (boss kills, book completions).

### `GET /api/game/story/chapter/{chapter_id}/transition`
**Auth:** Player
**Response:** Chapter transition narrative data.

### `GET /api/game/story/book/{book_id}/transition`
**Auth:** Player
**Response:** Book transition narrative data.

---

## 7. Idle Training (Loop A)

**Router:** `routes/game_training.py` | **Prefix:** `/api/game/training` | **Tags:** `Idle Training`

> **SIMULATION-CRITICAL**: Idle training runs offline. The bot should call `start`, wait, then check `status`/`offline-report`.

### Constants
- **Milestone rewards:** Level 25 = 250 Essence, 50 = 500, 75 = 1000, 99 = 2500
- **Level cap:** 99 per skill
- **XP formula:** RuneScape-style: `floor(sum(i + 300 * 2^(i/7)) / 4)` for levels 1-99
- **Offline cap:** Configurable, default 24 hours

### `GET /api/game/training/status`
**Auth:** Player
**Response:**
```json
{
  "essence_pct": 0.75,
  "essence_balance": 750,
  "essence_capacity": 1000,
  "essence_drain_per_tick": 5,
  "xp_rate_modifier": 1.0,
  "skills": [{
    "skill_id": 1,
    "skill_name": "Strength",
    "flavor_title": "...",
    "level": 45,
    "current_xp": 12345,
    "next_level_xp": 15000,
    "is_active_training": true,
    "is_in_active_mode": false,
    "active_action": { "id": 1, "name": "...", "interval_ms": 3000, "xp_per_action": 10, "level_required": 5 },
    "is_unlocked": true,
    "affinity_multiplier": 1.25,
    "prerequisites_met": true,
    "prerequisites": []
  }]
}
```
**Notes:** Initializes CharacterSkillLevel records if missing. Checks unlock gates based on PlayerProgress. Evaluates prerequisites (2.4.1). Affinity multiplier 1.25x when class matches skill name.

### `GET /api/game/training/offline-report`
**Auth:** Player
**Response:** `{ has_report: bool, report?: OfflineReport }`

**OfflineReport fields:**
- `offline_duration_seconds`, `cap_hours`
- `skill_name`, `action_name`, `actions_completed`
- `xp_earned`, `potential_xp`, `affinity_applied`
- `old_level`, `new_level`, `levels_gained`
- `essence_consumed`, `remaining_essence`
- `character_xp` (character-level XP earned from idle training)
- `milestones` (crossed milestone thresholds with essence rewards)
- `achievements_earned`

**Notes:** Calculates offline progress using granular essence drain simulation (10 chunks). Applies Ascendant subscriber XP/essence multipliers. Grants milestone essence rewards at level thresholds. Awards character XP proportional to idle XP.

### `POST /api/game/training/start`
**Auth:** Player
**Request Body:** `StartTrainingRequest`
- `skill_id` (int) — Skill to train
- `action_id` (int) — Action within that skill

**Response:** `{ status: "success" }`
**Notes:** Stops any currently active training first. Applies offline calc for previous training before switching. Sets `last_offline_calc_at` to now.

### `POST /api/game/training/stop`
**Auth:** Player
**Response:** `{ status: "success" }`
**Notes:** Stops all active training. Applies offline calc before stopping.

### `POST /api/game/training/switch-action`
**Auth:** Player
**Request Body:** `SwitchActionRequest`
- `skill_id` (int)
- `action_id` (int) — New action to switch to

**Response:** `{ status: "success" }`
**Notes:** Applies offline calc, then switches action within same skill. Skill must already be actively training.

### `POST /api/game/training/active-mode/enter`
**Auth:** Player
**Response:** `{ status: "success" }`
**Notes:** Enters active (real-time) training mode. Requires active idle training. Sets `is_in_active_mode = true`.

### `POST /api/game/training/active-mode/exit`
**Auth:** Player
**Request Body:** `ExitActiveModeRequest`
- `xp_earned` (int) — XP earned during active mode session (client-reported)

**Response:** `{ status: "success" }`
**Notes:** Adds XP, recalculates level, resets to idle mode. Resets `last_offline_calc_at` to now.

### `GET /api/game/training/actions/{skill_id}`
**Auth:** Player
**Response:** Array of `SkillAction` records for the skill, ordered by `sort_order`.
**Fields per action:** `id`, `name`, `display_name`, `interval_ms`, `xp_per_action`, `level_required`, `sort_order`.

---

## 8. Character Progression

**Router:** `routes/character_progression.py` | **Prefix:** `/api/game` | **Tags:** `character_progression`

> **SIMULATION-CRITICAL**: Stats and levels affect combat damage calculations.

### `GET /api/game/character/stats`
**Auth:** Player
**Response:**
```json
{
  "character_id": 1,
  "character_level": 25,
  "stats": [{
    "stat_id": 1,
    "name": "strength",
    "display_name": "Strength",
    "total": 150,
    "base": 10,
    "class_name": "Warrior"
  }]
}
```
**Notes:** Forces recalculation of all character stats before returning. Includes class affinity base values.

### `GET /api/game/character/level`
**Auth:** Player
**Response:**
```json
{
  "character_id": 1,
  "level": 25,
  "character_xp": 625000,
  "xp_to_next_level": 51000,
  "xp_for_current_level": 625000,
  "xp_for_next_level": 676000,
  "level_cap": 99
}
```
**Notes:** XP formula: `k * level^2` where k = `char_level_xp_factor` (default 1000). Cap from `char_level_cap` (default 99).

### `GET /api/game/skills/tree`
**Auth:** Player
**Response:** `{ character_id, skills: [...] }` — Full skill tree with lock/unlock/prerequisite status.
**Notes:** Forces stat recalculation for prerequisite evaluation. Includes unlock conditions, current levels, and dependency chains.

---

## 9. Inventory

**Router:** `routes/inventory.py` | **Prefix:** `/api/game/inventory` | **Tags:** `inventory`

**Max bag slots:** 10

### `GET /api/game/inventory`
**Auth:** Player
**Response:** Full inventory: equipped items, stored items, gear slot definitions, and stat bonuses.

### `POST /api/game/inventory/equip`
**Auth:** Player
**Request Body:** `EquipRequest`
- `inventory_id` (int)

**Response:** Updated inventory state.
**Notes:** Validates gear slot compatibility. Recalculates character stats after equip.

### `POST /api/game/inventory/unequip`
**Auth:** Player
**Request Body:** `UnequipRequest`
- `inventory_id` (int)

**Response:** Updated inventory state.
**Notes:** Requires free bag slot. Recalculates character stats.

### `DELETE /api/game/inventory/{id}`
**Auth:** Player
**Response:** Confirmation.
**Notes:** Only unequipped items can be discarded.

### `POST /api/game/inventory/keep-drop`
**Auth:** Player
**Request Body:** Item drop details.
**Response:** Item added to inventory.
**Notes:** For keeping loot drops after scene completion.

### `POST /api/game/inventory/dismiss-drop`
**Auth:** Player
**Request Body:** Item drop details.
**Response:** Acknowledgement.
**Notes:** No-op — player chose not to keep the drop.

---

## 10. Discovery & Registry

**Router:** `routes/discovery.py` | **Prefix:** `/api/game/registry` | **Tags:** `discovery`

### `GET /api/game/registry/entities`
**Auth:** Player
**Query:** Filters (type, family, search, etc.)
**Response:** Paginated entity bestiary with discovery status, kill counts, and rank-gated info.

### `GET /api/game/registry/entities/{entity_id}`
**Auth:** Player
**Response Model:** `EntityDetail` — Full entity detail with rank-gated fields (base_description, base_hp, base_gold, stat_block, hidden_lore).
**Notes:** Rank computed from kill count using configurable thresholds: SS (500), A (100), C (lower).

### `GET /api/game/registry/library`
**Auth:** Player
**Response Model:** `LibraryResponse` — Grouped discovery items (skills, item prefixes/suffixes/qualities, lore tags, effects).

### `GET /api/game/registry/stats`
**Auth:** Player
**Response Model:** `StatsResponse` — Completion percentages and totals for entities and library items.

### `POST /api/game/registry/unlock-batch`
**Auth:** Player
**Request Body:** Batch of discovery items to unlock.
**Response Model:** `UnlockBatchResponse` — Results of batch unlock operation.

### `PATCH /api/game/registry/clear-new`
**Auth:** Player
**Response:** Clears "new" badge flags on discovered items.

---

## 11. Home Base

**Router:** `routes/home_base.py` | **Prefix:** `/api/game/home-base` | **Tags:** `home-base`

### `GET /api/game/home-base/akashic-log`
**Auth:** Player
**Response:** Player activity log (Akashic Log) — recent events, achievements, milestones.

### `GET /api/game/home-base/artifacts`
**Auth:** Player
**Response:** Artifact collection with unlock status and tier progress.

### `POST /api/game/home-base/artifacts/mark-visited`
**Auth:** Player
**Response:** Marks artifact as viewed (clears notification badge).

### `GET /api/game/home-base/leaderboard/{category}`
**Auth:** Player
**Response:** Leaderboard for the given category (progression, essence, etc.).

### `GET /api/game/home-base/achievements`
**Auth:** Player
**Response:** All achievements with completion status, progress, and rewards.

### `POST /api/game/home-base/achievements/mark-visited`
**Auth:** Player
**Response:** Marks achievements as viewed.

### `GET /api/game/home-base/titles`
**Auth:** Player
**Response:** Available titles the player has earned.

### `PATCH /api/game/home-base/title`
**Auth:** Player
**Request Body:** `{ title_id: int }`
**Response:** Updated active title.

### `GET /api/game/home-base/summary`
**Auth:** Player
**Response:** Home base dashboard summary (stats, recent activity, quick links).

---

## 12. Audio

**Router:** `routes/audio.py` | **Prefix:** `/api/game/audio` | **Tags:** `audio`

### `GET /api/game/audio/atmosphere`
**Auth:** Player
**Query Params:**
- `scene_id` (optional) — Scene ID to resolve atmosphere for
- `archetype` (optional) — Archetype name for direct lookup (e.g. `training_grounds`)
- `boss_entity_id` (optional) — Boss entity ID for unique theme override

**Response:** Atmosphere definition with music layers, ambient sounds, and combat music.

**Resolution hierarchy:**
1. Boss override (`entity_gameplay_data.unique_boss_theme_id`)
2. Scene level (`scene_gameplay_data.atmosphere_id`)
3. Chapter level (`chapters.atmosphere_id`)
4. Book level (`books.atmosphere_id`)
5. Global fallback

### `GET /api/game/audio/sfx-configs`
**Auth:** Player
**Response:** All SFX preset definitions (click sounds, combat effects, UI sounds).

---

## 13. Chat

**Router:** `routes/chat.py` | **Prefix:** none | **Tags:** `chat`

### `WebSocket /ws/chat`
**Auth:** Firebase token via `token` query parameter
**Protocol:** WebSocket

**Message types (client -> server):**
- `chat_message` — Send a chat message to a channel
- `join_channel` — Subscribe to a channel
- `leave_channel` — Unsubscribe

**Message types (server -> client):**
- `chat_message` — Incoming chat message
- `system_broadcast` — System announcements (boss kills, achievements, etc.)

**Notes:** Requires Firebase auth token. Profanity filter applied to messages. Rate-limited system broadcasts.

---

## 14. Shop (Shard Store)

**Router:** `routes/shop.py` | **Prefix:** `/api/shop` | **Tags:** `shop`

### `GET /api/shop/catalog`
**Auth:** Player
**Response:** Shop catalog with items and bundles available for purchase (with Shard currency).

### `POST /api/shop/purchase`
**Auth:** Player
**Request Body:** `PurchaseRequest` — `{ item_id: int }`
**Response:** Purchase result.
**Notes:** Deducts Shards. Checks for active story session (some items restricted during combat).

### `POST /api/shop/purchase-bundle`
**Auth:** Player
**Request Body:** `PurchaseBundleRequest` — `{ bundle_id: int }`
**Response:** Bundle purchase result.

### `POST /api/shop/equip`
**Auth:** Player
**Request Body:** `EquipRequest` — `{ item_id: int }`
**Response:** Equipped cosmetic/flair.

### `POST /api/shop/unequip`
**Auth:** Player
**Request Body:** `UnequipRequest` — `{ slot: string }`
**Response:** Unequipped cosmetic.

### `GET /api/shop/collection`
**Auth:** Player
**Response:** Player's owned shop items collection.

### `GET /api/shop/boosters`
**Auth:** Player
**Response:** Currently active boosters with remaining time.

### `POST /api/shop/booster-ping`
**Auth:** Player
**Request Body:** `BoosterPingRequest` — `{ elapsed_seconds: int }`
**Response:** Updated booster timers.
**Notes:** Client pings to track booster elapsed time.

---

## 15. Payments (Stripe)

**Router:** `routes/payments.py` | **Prefix:** `/api/payments` | **Tags:** `payments`

### `POST /api/payments/checkout`
**Auth:** Player
**Request Body:** `CheckoutRequest` — `{ package_id: int }`
**Response:** Stripe Checkout Session URL.
**Notes:** Creates PaymentOrder, Stripe Customer (if needed), and Checkout Session. Shard packages have configurable bonus amounts.

### `GET /api/payments/packages`
**Auth:** Player
**Response:** Available Shard packages with prices and bonus amounts.

### `GET /api/payments/status`
**Auth:** Player
**Response:** Recent payment/order status.

### `GET /api/payments/transactions`
**Auth:** Player
**Query:** Pagination params
**Response:** Shard transaction history.

---

## 16. Subscriptions

**Router:** `routes/subscriptions.py` | **Prefix:** `/api/subscriptions` | **Tags:** `subscriptions`

### `POST /api/subscriptions/create`
**Auth:** Player
**Request Body:** `SubscribeRequest` — `{ plan_key: string }` (`ascendant_monthly` | `ascendant_annual`)
**Response:** Stripe Checkout Session URL for subscription.
**Notes:** Creates Stripe Customer and Subscription Checkout. Ascendant tier grants XP/essence multipliers.

### `GET /api/subscriptions/status`
**Auth:** Player
**Response:** Current subscription status, plan, multipliers, stipend info.
**Notes:** Resolves lazy status (checks Stripe for actual state if DB is stale).

### `POST /api/subscriptions/cancel`
**Auth:** Player
**Response:** Cancellation confirmation (cancels at period end).

### `POST /api/subscriptions/reactivate`
**Auth:** Player
**Response:** Reactivation confirmation (if canceled but still in period).

### `POST /api/subscriptions/switch`
**Auth:** Player
**Request Body:** `SwitchRequest` — `{ new_plan_key: string }`
**Response:** Plan switch confirmation (proration handled by Stripe).

---

## 17. Donations

**Router:** `routes/donations.py` | **Prefix:** `/api/donations` | **Tags:** `donations`

### `POST /api/donations/create-session`
**Auth:** Player
**Request Body:** `CreateSessionRequest` — `{ amount_cents: int }`
**Response:** Stripe Checkout Session URL for donation.

### `GET /api/donations/status`
**Auth:** Player
**Response:** Patron status (total donated, tier, benefits).

### `GET /api/donations/history`
**Auth:** Player
**Response:** Donation history.

### `PATCH /api/donations/visibility`
**Auth:** Player
**Request Body:** `VisibilityRequest` — `{ visible: bool }`
**Response:** Updated visibility preference (show/hide on patron wall).

---

## 18. Marketplace (P2P Trading)

**Router:** `routes/marketplace.py` | **Prefix:** `/api/marketplace` | **Tags:** `marketplace`

### `GET /api/marketplace/browse`
**Auth:** Player
**Query:** Filters (item_type, price range, search, pagination)
**Response:** Active marketplace listings.

### `POST /api/marketplace/list`
**Auth:** Player
**Request Body:** `CreateListingRequest` — `{ item_type, item_ref_id, price_shards }`
**Response:** Created listing.
**Notes:** Rate-limited.

### `POST /api/marketplace/buy`
**Auth:** Player
**Request Body:** `BuyRequest` — `{ listing_id }`
**Response:** Trade result.
**Notes:** Rate-limited. Deducts Shards, creates trade record.

### `POST /api/marketplace/cancel`
**Auth:** Player
**Request Body:** `CancelRequest` — `{ listing_id }`
**Response:** Cancelled listing.

### `POST /api/marketplace/adjust-price`
**Auth:** Player
**Request Body:** `AdjustPriceRequest` — `{ listing_id, new_price }`
**Response:** Updated listing.

### `GET /api/marketplace/my-listings`
**Auth:** Player
**Response:** Player's active listings.

### `GET /api/marketplace/trade-history`
**Auth:** Player
**Response:** Player's trade history.

### `GET /api/marketplace/notifications`
**Auth:** Player
**Response:** Trade notifications (sold items, purchases, etc.).

### `POST /api/marketplace/notifications/read`
**Auth:** Player
**Request Body:** `MarkReadRequest` — `{ notification_ids: [int] }`
**Response:** Marked as read.

### `POST /api/marketplace/salvage`
**Auth:** Player
**Request Body:** `SalvageRequest` — `{ item_type, item_ref_id }`
**Response:** Salvage result (Shards gained).

### `POST /api/marketplace/salvage-bulk`
**Auth:** Player
**Request Body:** `BulkSalvageRequest` — `{ items: [{ item_type, item_ref_id }] }`
**Response:** Bulk salvage results.

### `POST /api/marketplace/salvage-preview`
**Auth:** Player
**Request Body:** `SalvagePreviewRequest` — `{ items: [{ item_type, item_ref_id }] }`
**Response:** Preview of Shards to be gained (no action taken).

### `POST /api/marketplace/claim`
**Auth:** Player
**Request Body:** `ClaimRequest` — `{ trade_id, action, replace_item_id? }`
**Response:** Claim result (accept trade item or discard).

---

## 19. Support

**Router:** `routes/support.py` | **Prefix:** `/api/support` | **Tags:** `support`

### `POST /api/support/tickets`
**Auth:** Player
**Request Body:** `{ subject, message, category }` — Categories: `bug_report`, `account_issue`, `payment_issue`, `feedback`, `other`
**Response:** Created ticket.
**Notes:** Sanitizes text. Logs activity event.

### `GET /api/support/tickets`
**Auth:** Player
**Response:** Player's tickets (paginated).

### `GET /api/support/tickets/{ticket_id}`
**Auth:** Player
**Response:** Ticket detail with replies.
**Notes:** Auto-closes resolved tickets after 7 days.

### `POST /api/support/tickets/{ticket_id}/replies`
**Auth:** Player
**Request Body:** `{ message }`
**Response:** Created reply.

### `PATCH /api/support/tickets/{ticket_id}/reopen`
**Auth:** Player
**Response:** Reopened ticket.

### `PATCH /api/support/tickets/{ticket_id}/close`
**Auth:** Player
**Response:** Closed ticket.

---

## 20. Webhooks

**Router:** `routes/webhooks.py` | **Prefix:** `/api/webhooks` | **Tags:** `webhooks`

### `POST /api/webhooks/stripe`
**Auth:** Stripe signature verification (`STRIPE_WEBHOOK_SECRET`) — no Firebase auth
**Request Body:** Raw Stripe event payload

**Handled Events:**
- `checkout.session.completed` — Credit Shards for payment orders; activate subscriptions
- `invoice.paid` — Renew subscriptions
- `invoice.payment_failed` — Mark subscription past due
- `customer.subscription.deleted` — Expire subscriptions
- `charge.refunded` — Debit Shards for refunded payments; refund subscriptions
- `charge.dispute.created` — Handle payment disputes

**Notes:** Idempotent — records `StripeWebhookEvent` to prevent reprocessing. Logs `ActivityEvent` for all payment-related actions.

---

## 21. Admin Endpoints

All admin endpoints require `get_current_admin` authentication (Firebase JWT + admin role). Prefixed with `/api/admin/` (exempt from maintenance mode). Most write operations log to the audit trail.

### 21.1 Access Control
**Router:** `routes/admin_access.py` | **Prefix:** `/api/admin`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/ping` | Admin auth check |
| GET | `/api/admin/me` | Current admin profile |
| GET | `/api/admin/permissions/admins` | List admin users |
| PATCH | `/api/admin/players/{player_id}/permissions` | Update player permissions |
| GET | `/api/admin/access-control` | List access control rules |
| POST | `/api/admin/access-control/emails` | Add email whitelist entry |
| DELETE | `/api/admin/access-control/emails/{email}` | Remove email whitelist |
| POST | `/api/admin/access-control/ips` | Add IP whitelist entry |
| DELETE | `/api/admin/access-control/ips/{ip}` | Remove IP whitelist |

### 21.2 Analytics
**Router:** `routes/admin_analytics.py` | **Prefix:** `/api/admin`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/analytics/overview` | Dashboard overview metrics |
| GET | `/api/admin/analytics/dau` | Daily active users chart |
| GET | `/api/admin/analytics/registrations` | Registration trend |
| GET | `/api/admin/analytics/chapter-distribution` | Player chapter distribution |
| GET | `/api/admin/analytics/events` | Activity events stream |
| GET | `/api/admin/audit-log` | Admin audit log |

### 21.3 Characters & Items
**Router:** `routes/admin_characters.py` | **Prefix:** `/api/admin/characters` (+ `/api/admin` for items/timeline)

| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/api/admin/characters/{character_id}` | Update character |
| GET | `/api/admin/characters/{character_id}/stats` | Character stat block |
| POST | `/api/admin/characters/{character_id}/items/craft` | Craft item for character |
| GET | `/api/admin/characters/{character_id}/inventory` | Character inventory |
| POST | `/api/admin/characters/{character_id}/essence` | Grant/deduct essence |
| GET | `/api/admin/characters/{character_id}/essence/history` | Essence transaction history |
| PATCH | `/api/admin/characters/{character_id}/progression` | Update player progress |
| GET | `/api/admin/characters/{character_id}/boss-completions` | Boss completion records |
| DELETE | `/api/admin/characters/{character_id}/boss-completions` | Clear boss completions |
| POST | `/api/admin/characters/{character_id}/boss-completions/reset` | Reset boss completions |
| GET | `/api/admin/characters/{character_id}/skills` | Character skill levels |
| PATCH | `/api/admin/characters/{character_id}/skills` | Update skill levels |
| GET | `/api/admin/items/components` | Item component definitions |
| PATCH | `/api/admin/items/{item_id}` | Update item |
| DELETE | `/api/admin/items/{item_id}` | Delete item |
| PATCH | `/api/admin/artifacts/{artifact_id}` | Update artifact |
| GET | `/api/admin/content-tree` | Full content tree (books > chapters > scenes) |
| GET | `/api/admin/players/{player_id}/timeline` | Player event timeline |

### 21.4 Config
**Router:** `routes/admin_config.py` | **Prefix:** `/api/admin/config`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/config/` | All server config entries |
| PATCH | `/api/admin/config/{key}` | Update config value |
| POST | `/api/admin/config/{key}/reset` | Reset config to default |
| GET | `/api/admin/config/auth-bypass/status` | Auth bypass status |

### 21.5 Game Configuration
**Router:** `routes/admin_game.py` | **Prefix:** `/api/admin/game`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/game/configs` | All game configs (GameConfig table) |
| PATCH | `/api/admin/game/configs/{key}/meta` | Update config metadata |
| PATCH | `/api/admin/game/configs/{key}/value` | Update config value |
| GET | `/api/admin/game/configs/categories` | Config categories |
| GET | `/api/admin/game/stats` | Stat definitions |
| POST | `/api/admin/game/stats` | Create stat definition |
| PATCH | `/api/admin/game/stats/{stat_id}` | Update stat |
| DELETE | `/api/admin/game/stats/{stat_id}` | Delete stat |
| GET | `/api/admin/game/classes` | Character classes |
| POST | `/api/admin/game/classes` | Create class |
| PATCH | `/api/admin/game/classes/{class_id}` | Update class |
| DELETE | `/api/admin/game/classes/{class_id}` | Delete class |
| GET | `/api/admin/game/skills` | Skills list |
| POST | `/api/admin/game/skills` | Create skill |
| PATCH | `/api/admin/game/skills/{skill_id}` | Update skill |
| DELETE | `/api/admin/game/skills/{skill_id}` | Delete skill |

### 21.6 Content Management
**Router:** `routes/admin_content.py` | **Prefix:** `/api/admin/content`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/content/books` | List books |
| GET | `/api/admin/content/books/{book_id}` | Book detail |
| POST | `/api/admin/content/books` | Create book |
| PATCH | `/api/admin/content/books/{book_id}` | Update book |
| DELETE | `/api/admin/content/books/{book_id}` | Delete book |
| GET | `/api/admin/content/chapters` | List chapters |
| GET | `/api/admin/content/chapters/{chapter_id}` | Chapter detail |
| POST | `/api/admin/content/chapters` | Create chapter |
| PATCH | `/api/admin/content/chapters/{chapter_id}` | Update chapter |
| DELETE | `/api/admin/content/chapters/{chapter_id}` | Delete chapter |
| GET | `/api/admin/content/scenes` | List scenes |
| GET | `/api/admin/content/scenes/{scene_id}` | Scene detail |
| POST | `/api/admin/content/scenes` | Create scene |
| PATCH | `/api/admin/content/scenes/{scene_id}` | Update scene |
| DELETE | `/api/admin/content/scenes/{scene_id}` | Delete scene |
| GET | `/api/admin/content/backgrounds` | Scene backgrounds |
| GET | `/api/admin/content/backgrounds/{bg_id}` | Background detail |
| POST | `/api/admin/content/backgrounds` | Create background |
| PATCH | `/api/admin/content/backgrounds/{bg_id}` | Update background |
| DELETE | `/api/admin/content/backgrounds/{bg_id}` | Delete background |
| GET | `/api/admin/content/wave-configs` | List wave configs |
| POST | `/api/admin/content/wave-configs/bulk-template` | Bulk create from template |
| PATCH | `/api/admin/content/wave-configs/bulk-multipliers` | Bulk update multipliers |
| POST | `/api/admin/content/wave-configs/auto-populate/{scene_id}` | Auto-populate for scene |
| GET | `/api/admin/content/wave-configs/{scene_id}` | Wave config for scene |
| PUT | `/api/admin/content/wave-configs/{scene_id}` | Replace wave config |
| DELETE | `/api/admin/content/wave-configs/{scene_id}` | Delete wave config |

### 21.7 Content - Locations
**Router:** `routes/admin_content_locations.py` | **Prefix:** `/api/admin/content`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/content/locations` | List locations |
| GET | `/api/admin/content/locations/types` | Location types |
| GET | `/api/admin/content/locations/{id}` | Location detail |
| POST | `/api/admin/content/locations` | Create location |
| PATCH | `/api/admin/content/locations/{id}` | Update location |
| DELETE | `/api/admin/content/locations/{id}` | Delete (blocked if referenced) |
| POST | `/api/admin/content/locations/{id}/aliases` | Add alias |
| DELETE | `/api/admin/content/locations/{id}/aliases/{alias_id}` | Remove alias |
| GET | `/api/admin/content/location-scenes` | List location-scene mappings |
| POST | `/api/admin/content/location-scenes` | Create mapping |
| PATCH | `/api/admin/content/location-scenes/{id}` | Update mapping |
| DELETE | `/api/admin/content/location-scenes/{id}` | Delete mapping |

### 21.8 Content - Entities
**Router:** `routes/admin_content_entities.py` | **Prefix:** `/api/admin/content`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/content/entities` | List entities |
| GET | `/api/admin/content/entities/families` | Entity families |
| GET | `/api/admin/content/entities/{entity_id}` | Entity detail |
| POST | `/api/admin/content/entities` | Create entity |
| PATCH | `/api/admin/content/entities/{entity_id}` | Update entity |
| DELETE | `/api/admin/content/entities/{entity_id}` | Delete entity |
| GET | `/api/admin/content/entities/{entity_id}/aliases` | Entity aliases |
| POST | `/api/admin/content/entities/{entity_id}/aliases` | Add alias |
| DELETE | `/api/admin/content/entities/{entity_id}/aliases/{alias_id}` | Remove alias |
| GET | `/api/admin/content/entities/{entity_id}/scene-appearances` | Scene appearances |
| POST | `/api/admin/content/entities/{entity_id}/scene-appearances` | Add scene appearance |
| DELETE | `/api/admin/content/entities/{entity_id}/scene-appearances/{id}` | Remove appearance |
| GET | `/api/admin/content/gear-slots` | Gear slot definitions |
| POST | `/api/admin/content/gear-slots` | Create gear slot |
| PATCH | `/api/admin/content/gear-slots/{slot_id}` | Update gear slot |
| DELETE | `/api/admin/content/gear-slots/{slot_id}` | Delete gear slot |

### 21.9 Classification
**Router:** `routes/admin_classification.py` | **Prefix:** `/api/admin/classification`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/classification/entity-types` | List entity types |
| POST | `/api/admin/classification/entity-types` | Create type |
| PATCH | `/api/admin/classification/entity-types/{type_id}` | Update type |
| DELETE | `/api/admin/classification/entity-types/{type_id}` | Delete (409 if entities exist) |
| GET | `/api/admin/classification/entity-families` | List families |
| POST | `/api/admin/classification/entity-families` | Create family |
| PATCH | `/api/admin/classification/entity-families/{family_id}` | Update family |
| DELETE | `/api/admin/classification/entity-families/{family_id}` | Delete family |
| GET | `/api/admin/classification/visual-behaviors` | List visual behaviors |
| POST | `/api/admin/classification/visual-behaviors` | Create behavior |
| PATCH | `/api/admin/classification/visual-behaviors/{behavior_id}` | Update behavior |
| DELETE | `/api/admin/classification/visual-behaviors/{behavior_id}` | Delete behavior |
| GET | `/api/admin/classification/attack-types` | List attack types |
| PATCH | `/api/admin/classification/attack-types/{attack_type_id}` | Update attack type |
| GET | `/api/admin/classification/bulk-assign/entities` | Preview bulk assignment |
| POST | `/api/admin/classification/bulk-assign` | Bulk assign classifications |
| GET | `/api/admin/classification/audit` | Classification audit |
| POST | `/api/admin/classification/apply-template` | Apply classification template |

### 21.10 Scaling & Difficulty
**Router:** `routes/admin_scaling.py` | **Prefix:** `/api/admin/scaling`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/scaling/wave-presets` | List wave presets |
| POST | `/api/admin/scaling/wave-presets` | Create preset |
| PATCH | `/api/admin/scaling/wave-presets/{preset_id}` | Update preset |
| DELETE | `/api/admin/scaling/wave-presets/{preset_id}` | Delete preset |
| GET | `/api/admin/scaling/wave-presets/{preset_id}/assignments` | Preset assignments |
| POST | `/api/admin/scaling/wave-presets/{preset_id}/assignments` | Add assignment |
| DELETE | `/api/admin/scaling/wave-presets/assignments/{assignment_id}` | Remove assignment |
| POST | `/api/admin/scaling/wave-presets/{preset_id}/apply-to-scenes` | Apply to scenes |
| GET | `/api/admin/scaling/difficulty-curves` | List curves |
| POST | `/api/admin/scaling/difficulty-curves` | Create curve |
| PATCH | `/api/admin/scaling/difficulty-curves/{curve_id}` | Update curve |
| DELETE | `/api/admin/scaling/difficulty-curves/{curve_id}` | Delete curve |
| PATCH | `/api/admin/scaling/difficulty-curves/{curve_id}/assign-book` | Assign curve to book |
| GET | `/api/admin/scaling/presets` | Config presets |
| POST | `/api/admin/scaling/presets` | Create preset |
| PATCH | `/api/admin/scaling/presets/{preset_id}` | Update preset |
| DELETE | `/api/admin/scaling/presets/{preset_id}` | Delete preset |
| GET | `/api/admin/scaling/presets/capture-current` | Capture current config as preset |
| POST | `/api/admin/scaling/presets/{preset_id}/apply` | Apply preset |

### 21.11 Audio
**Router:** `routes/admin_audio.py` | **Prefix:** `/api/admin`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/atmospheres` | List atmospheres |
| GET | `/api/admin/atmospheres/{id}` | Atmosphere detail |
| POST | `/api/admin/atmospheres` | Create atmosphere |
| PUT | `/api/admin/atmospheres/{id}` | Update atmosphere |
| DELETE | `/api/admin/atmospheres/{id}` | Delete (if unreferenced) |
| PUT | `/api/admin/atmospheres/{id}/music` | Replace music definitions |
| POST | `/api/admin/atmospheres/batch-assign` | Batch assign to scenes |
| GET | `/api/admin/audio-configs` | SFX configs |
| PUT | `/api/admin/audio-configs/{id}` | Update SFX config |

### 21.12 Assets
**Router:** `routes/admin_assets.py` | **Prefix:** `/api/admin/assets`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/assets/` | List assets |
| GET | `/api/admin/assets/orphans/missing` | Missing asset references |
| GET | `/api/admin/assets/orphans/unused` | Unused assets |
| GET | `/api/admin/assets/batch` | Batch lookup |
| POST | `/api/admin/assets/bulk` | Bulk create/update |
| GET | `/api/admin/assets/{asset_key}` | Asset detail |
| POST | `/api/admin/assets/` | Create asset |
| PUT | `/api/admin/assets/{asset_key}` | Update asset |
| DELETE | `/api/admin/assets/{asset_key}` | Delete asset |

### 21.13 Players
**Router:** `routes/admin_players.py` | **Prefix:** `/api/admin/players`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/players/` | List players (search, filter, paginate) |
| GET | `/api/admin/players/{player_id}` | Player detail |
| POST | `/api/admin/players/{player_id}/ban` | Ban player |
| POST | `/api/admin/players/{player_id}/unban` | Unban player |
| POST | `/api/admin/players/{player_id}/logout` | Force logout |
| PATCH | `/api/admin/players/{player_id}` | Update player |

### 21.14 Support
**Router:** `routes/admin_support.py` | **Prefix:** `/api/admin/support`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/support/tickets` | List all tickets |
| GET | `/api/admin/support/tickets/{ticket_id}` | Ticket detail |
| PATCH | `/api/admin/support/tickets/{ticket_id}` | Update ticket status |
| POST | `/api/admin/support/tickets/{ticket_id}/replies` | Admin reply |
| POST | `/api/admin/support/tickets/{ticket_id}/notes` | Internal note |

### 21.15 Chat
**Router:** `routes/admin_chat.py` | **Prefix:** `/api/admin/chat`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/chat/channels` | List channels |
| PATCH | `/api/admin/chat/channels/{channel_id}` | Update channel |
| POST | `/api/admin/chat/mute` | Mute a player |
| GET | `/api/admin/chat/player/{player_id}/status` | Player chat status |

### 21.16 Home Base
**Router:** `routes/admin_home_base.py` | **Prefix:** `/api/admin/home-base`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/home-base/artifacts` | List artifacts |
| GET | `/api/admin/home-base/artifacts/{artifact_id}` | Artifact detail |
| POST | `/api/admin/home-base/artifacts` | Create artifact |
| PUT | `/api/admin/home-base/artifacts/{artifact_id}` | Update artifact |
| DELETE | `/api/admin/home-base/artifacts/{artifact_id}` | Delete artifact |
| PUT | `/api/admin/home-base/artifacts/{artifact_id}/tiers` | Update artifact tiers |
| POST | `/api/admin/home-base/artifacts/bulk-assign` | Bulk assign artifacts |
| GET | `/api/admin/home-base/achievements` | List achievements |
| GET | `/api/admin/home-base/achievements/{achievement_id}` | Achievement detail |
| POST | `/api/admin/home-base/achievements` | Create achievement |
| PUT | `/api/admin/home-base/achievements/{achievement_id}` | Update achievement |
| DELETE | `/api/admin/home-base/achievements/{achievement_id}` | Delete achievement |
| POST | `/api/admin/home-base/achievements/player-override` | Override player achievement |
| GET | `/api/admin/home-base/achievements/analytics` | Achievement analytics |

### 21.17 Finance
**Router:** `routes/admin_finance.py` | **Prefix:** `/api/admin/finance`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/finance/overview` | Financial overview |
| GET | `/api/admin/finance/revenue-chart` | Revenue chart data |
| GET | `/api/admin/finance/shard-economy` | Shard economy metrics |
| GET | `/api/admin/finance/shard-flow-chart` | Shard flow chart |
| GET | `/api/admin/finance/subscription-metrics` | Subscription metrics |
| GET | `/api/admin/finance/shop-analytics` | Shop analytics |
| GET | `/api/admin/finance/marketplace-analytics` | Marketplace analytics |
| GET | `/api/admin/finance/donation-analytics` | Donation analytics |
| POST | `/api/admin/finance/shard-adjust` | Manual shard adjustment |
| GET | `/api/admin/finance/player-shard-summary/{player_id}` | Player shard summary |
| POST | `/api/admin/finance/initiate-refund` | Initiate refund |
| GET | `/api/admin/finance/disputes` | List disputes |
| POST | `/api/admin/finance/disputes/{player_id}/resolve` | Resolve dispute |
| GET | `/api/admin/finance/disputes/{player_id}/investigate` | Investigate dispute |
| GET | `/api/admin/finance/marketplace-anomalies` | Marketplace anomalies |
| GET | `/api/admin/finance/alt-warnings` | Alt account warnings |

### 21.18 Payments
**Router:** `routes/admin_payments.py` | **Prefix:** `/api/admin/payments`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/payments/reconcile` | Reconcile payments with Stripe |
| POST | `/api/admin/payments/poll-refunds` | Poll for pending refunds |
| POST | `/api/admin/payments/check-balances` | Check shard balance integrity |
| GET | `/api/admin/payments/webhook-events` | List webhook events |

### 21.19 Subscriptions
**Router:** `routes/admin_subscriptions.py` | **Prefix:** `/api/admin/subscriptions`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/subscriptions/` | List subscriptions |
| POST | `/api/admin/subscriptions/{player_id}/gift` | Gift subscription |
| POST | `/api/admin/subscriptions/{sub_id}/extend` | Extend subscription |
| POST | `/api/admin/subscriptions/{sub_id}/force-cancel` | Force cancel |
| PATCH | `/api/admin/subscriptions/{sub_id}/streak` | Update login streak |

### 21.20 Shop
**Router:** `routes/admin_shop.py` | **Prefix:** `/api/admin/shop`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/shop/items` | List shop items |
| POST | `/api/admin/shop/items` | Create shop item |
| PUT | `/api/admin/shop/items/{item_id}` | Update shop item |
| DELETE | `/api/admin/shop/items/{item_id}` | Delete shop item |
| GET | `/api/admin/shop/bundles` | List bundles |
| POST | `/api/admin/shop/bundles` | Create bundle |
| PUT | `/api/admin/shop/bundles/{bundle_id}` | Update bundle |
| POST | `/api/admin/shop/player/{player_id}/refund` | Refund player item |
| GET | `/api/admin/shop/player/{player_id}/items` | Player shop items |

### 21.21 Donations
**Router:** `routes/admin_donations.py` | **Prefix:** `/api/admin/donations`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/donations` | List donations |
| GET | `/api/admin/donations/stats` | Donation stats |
| GET | `/api/admin/donations/player/{player_id}` | Player donation history |

### 21.22 Marketplace
**Router:** `routes/admin_marketplace.py` | **Prefix:** `/api/admin/marketplace`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/marketplace/listings` | List all marketplace listings |
| DELETE | `/api/admin/marketplace/listings/{listing_id}` | Remove listing |
| GET | `/api/admin/marketplace/trades` | List trades |
| GET | `/api/admin/marketplace/stats` | Marketplace stats |
| GET | `/api/admin/marketplace/player/{player_id}` | Player marketplace activity |
| POST | `/api/admin/marketplace/reverse-trade/{trade_id}` | Reverse a trade |

### 21.23 Dev Audit
**Router:** `routes/admin_dev_audit.py` | **Prefix:** `/api/admin/dev-audit`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/dev-audit` | List audit records |
| GET | `/api/admin/dev-audit/summary` | Audit summary |
| GET | `/api/admin/dev-audit/filter-options` | Filter options |
| PATCH | `/api/admin/dev-audit/{record_id}` | Update record status |
| POST | `/api/admin/dev-audit/bulk-status` | Bulk update status |

---

## Appendix A: Endpoint Count Summary

| Domain | Endpoints |
|--------|-----------|
| Public | 4 |
| Auth | 2 |
| Players | 7 |
| Characters | 4 |
| Game Content | 10 |
| Story Mode | 12 |
| Idle Training | 8 |
| Character Progression | 3 |
| Inventory | 6 |
| Discovery | 6 |
| Home Base | 9 |
| Audio | 2 |
| Chat | 1 (WebSocket) |
| Shop | 8 |
| Payments | 4 |
| Subscriptions | 5 |
| Donations | 4 |
| Marketplace | 13 |
| Support | 6 |
| Webhooks | 1 |
| **Admin (total)** | **~130** |
| **Grand Total** | **~245** |

## Appendix B: Simulation Bot Flow

The simulation bot (Phase 3) should follow this sequence:

1. **Auth:** `POST /api/auth/login` (Firebase token)
2. **Character:** `POST /api/players/me/characters/` (if `is_new_player`)
3. **Training Start:** `POST /api/game/training/start` (begin idle loop)
4. **Combat Session:**
   a. `GET /api/game/story/configs` (load config)
   b. `POST /api/game/story/session/start` (enter scene)
   c. Loop: `POST /api/game/story/session/{session_id}/tick` (every N seconds)
   d. `POST /api/game/story/session/{session_id}/upgrade` (when gold allows)
   e. `POST /api/game/story/session/{session_id}/skill` (when unlocked)
   f. `POST /api/game/story/session/{session_id}/narrative` (track story progress)
   g. `POST /api/game/story/session/{session_id}/complete` (finalize)
5. **Check Progress:** `GET /api/game/character/stats`, `GET /api/game/character/level`
6. **Offline Report:** `GET /api/game/training/offline-report`
7. **Repeat** from step 4 with next scene from `GET /api/game/map`
