# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

## REC_2: Game Loop 2.0 (The Towers of Elysium)
**Note:** Initial implementation focuses on "The Rule of 4": 4 classes, 4 enemies, 4 skills, 4 scenes per chapter. All data must be server-authoritative and DB-driven.   

- [ ] **2.6 — Economy, Anti-Cheat & Discovery** *(Ref: `docs/recs/2.6_ECONOMY_ANTICHEAT.md`, Design: `2.6_ECONOMY_ANTICHEAT_DESIGN.md`, Schema: `2.6_ECONOMY_ANTICHEAT_SCHEMA.md`)*
    - [x] **Currency Conversion:** Implement Session Gold -> Essence/Resources. (Completed in 2.2/2.4)
    - [x] **Baseline Anti-Cheat:** CPS clamping, gold verification, server-authoritative state. (Completed in 2.2)

    - [ ] **2.6.0 — Animation Toggle (Reduce Motion)** *(Design §1)*
        - [ ] **Backend:** No migration needed — `reduce_motion` stored in existing `player.settings` JSONB via `PATCH /api/players/me/settings`.
        - [ ] **Frontend — Settings Toggle:** Add "Reduce Motion" toggle to Game Settings modal (`TopBar.tsx`). Cache in `localStorage` for instant access.
        - [ ] **Frontend — CSS Integration:** Add `body.reduce-motion` class; implement `prefers-reduced-motion` media query baseline + user override logic.
        - [ ] **Frontend — Banner Replacement:** When enabled, skip `BottomAnimatedBanner` mount entirely; render static bar (`[ClassIcon] CharName Lv.X`, dark panel, same height).
        - [ ] **Frontend — VFX Suppression:** Pass `reduceMotion` prop to `CombatStage` (hide floating damage, coin particles, screen shake), `SkillsHotbar` (static highlight only), `GoldOdometer` (instant value update), `PostBattleSummary` (instant reveal), `NarrativeReveal` (hide star particles), `BossStage` (static indicators).
        - [ ] **Tests:** Vitest tests for settings toggle, CSS class application, and component suppression behavior.

    - [ ] **2.6.1 — Anti-Cheat Hardening** *(Design §2)*
        - [ ] **Migration 041:** `db/041_anticheat_configs.sql` — Insert `wave_validation_tolerance`, `session_gold_tolerance`, `cps_warning_threshold_seconds`, `cps_warning_cooldown_seconds` into `game_configs`.
        - [ ] **Backend — Wave Validation:** Add DPS ceiling calculation to `/tick` in `story_mode.py` — project auto DPS after X waves, calculate max click DPS at cap, compute decaying wave clear rate, clamp `waves_completed_delta` if it exceeds `max_waves × wave_validation_tolerance`. Recalculate `gold_delta` from clamped waves.
        - [ ] **Backend — Session Integrity:** Add plausibility check to `/complete` in `story_mode.py` — verify `session_gold` against `max_gold_per_second × duration × session_gold_tolerance`. Correct down and recalculate essence if exceeded.
        - [ ] **Backend — Anomaly Logging:** Log `anti_cheat_anomaly` events to `activity_events` for: CPS violations, gold corrections, wave clamping, session integrity corrections. Payload: `player_id`, `session_id`, anomaly type, reported/corrected values, zone, elapsed_ms.
        - [ ] **Frontend — CPS State Machine:** Implement NORMAL→FLASHING→WARNING→COOLDOWN state machine in `StoryMode.tsx`. FLASHING: red border on `GoldOdometer` when `cps_valid: false`. WARNING: non-blocking toast after sustained violations (`cps_warning_threshold_seconds`). COOLDOWN: clear after valid ticks for `cps_warning_cooldown_seconds`.
        - [ ] **Backend Tests:** pytest cases for wave validation (normal, cheating, edge cases), session integrity check, anomaly event creation.
        - [ ] **Frontend Tests:** Vitest tests for CPS state machine transitions.

    - [ ] **2.6.2 — Discovery System (Akashic Records)** *(Design §3)*
        - [ ] **Migration 042:** `db/042_discovery_tables.sql` — Create `player_entity_discovery` table (player_id, entity_id, encounters, kills, rank, first_seen_at, is_new), `player_discovery_log` table (player_id, discovery_type, reference_id, discovered_at, is_new), add `entity_family VARCHAR(100)` column to `entities`, create indexes.
        - [ ] **Migration 043:** `db/043_discovery_configs.sql` — Insert discovery `game_configs`: `codex_rank_e/c/a/ss`, `rare_spawn_base_chance`.
        - [ ] **Backend — SQLModel Models:** Create `backend/models/discovery.py` with `PlayerEntityDiscovery` and `PlayerDiscoveryLog` models. Add `entity_family` field to Entity model in `backend/models/gameplay.py`.
        - [ ] **Backend — Discovery Routes:** Create `backend/routes/discovery.py` with endpoints: `GET /api/game/registry/entities` (paginated, visibility-filtered), `GET /api/game/registry/entities/{id}` (rank-gated detail), `GET /api/game/registry/library` (skills/items), `GET /api/game/registry/stats` (counters), `POST /api/game/registry/unlock-batch` (batch discoveries), `PATCH /api/game/registry/clear-new` (clear badges).
        - [ ] **Backend — Tick Extension:** Extend `/tick` request model with optional `entity_encounters` and `item_discoveries` fields. Process discovery data in tick handler: upsert `player_entity_discovery` (encounters/kills/rank), insert `player_discovery_log`. Return `new_ranks` and `new_discoveries` count in response.
        - [ ] **Backend — Visibility Logic:** Implement Mist/Grey/Revealed status based on player chapter progress vs entity's chapter. Rank reveal gating (E→name/image, C→HP/gold, A→full stats, SS→hidden lore).
        - [ ] **Backend — Random Spawn Engine:** Query rare entity pool (no `entity_scene_appearances` record). Spawn check per wave: `base_chance × book_modifier × chapter_modifier`. Return rare spawn entity data in tick response when triggered.
        - [ ] **Frontend — Etheric Registry UI:** Create `EthericRegistry.tsx` in Home Base Hub — entity list with Mist/Grey/Revealed states, family grouping tabs, per-variant detail with rank-gated progressive reveal, kill/encounter counters.
        - [ ] **Frontend — Skill & Item Library:** Create `DiscoveryLibrary.tsx` — skill and item discovery list with "New" badges (clear on view), full mechanical breakdown per entry.
        - [ ] **Frontend — Discovery Counters:** Add discovery progress summary to Home Base Hub (X/Y entities, skills, items, completion %).
        - [ ] **Frontend — Rare Spawn VFX:** Add glow/border visual indicator on `CombatStage` when a rare spawn appears. Track encounter immediately.
        - [ ] **Frontend — Tick Integration:** Accumulate entity encounters/kills between ticks. Flush with next tick call. Handle `new_ranks` in response (rank-up animation/notification).
        - [ ] **Frontend — Static WIKI Pages:** Create `frontend/src/pages/wiki/` with `HowToPlay.tsx`, `StatGuide.tsx`, `CombatGuide.tsx`, `IdleGuide.tsx`, `CurrencyGuide.tsx`, `EffectsGuide.tsx`. Create shared `HelpIcon` component for contextual "?" links.
        - [ ] **Tool — Entity Family Classifier:** Create `tools/classify_entity_families.py` — parse entity `canonical_name` patterns and assign `entity_family` values. Manual review + SQL corrections after.
        - [ ] **Backend Tests:** pytest cases for discovery endpoints, visibility logic, rank computation, random spawn engine, tick discovery processing.
        - [ ] **Frontend Tests:** Vitest tests for EthericRegistry, DiscoveryLibrary, discovery counters, HelpIcon.

    - [ ] **2.6.3 — Onboarding & UI Polish** *(Design §4)*
        - [ ] **Frontend — Changelog Modal:** Create `WelcomeModal.tsx` — load from `frontend/public/changelog.json`, track `last_seen_changelog_version` in `player.settings`, auto-show on version change, dismissible and reopenable. Bottom section: "New Player / Need Help? [Start Tutorial]" link.
        - [ ] **Frontend — Interactive Tutorial:** Create `TutorialOverlay.tsx` — semi-transparent backdrop with spotlight cutout, tooltip with text + Next/Skip buttons. Define step array (Hub nav, Map, Story Mode, Idle Training, Inventory, Home Base, Settings). Track `has_completed_onboarding` in `player.settings`. Skippable, replayable from help menu.
        - [ ] **Frontend — Aesthetic Polish Pass:** Apply "Magic Research 2" styling to: Hub tabs (rounded, active indicator, icons), Map nodes (shadow depth, hover glow), `GlobalHeader`/`UpgradeMenu` (rounded panels, consistent padding), `SkillsHotbar` (rounded slots, cooldown ring polish), all modals (consistent border-radius, backdrop blur), buttons (hover/active/focus states), `HeroStats` (typography scale, stat bar gradients), Inventory (rarity borders, shadow depth).
        - [ ] **Frontend — Terminal Exception:** Verify no polished styles leak into Idle Training (Loop C) — maintain cyberpunk green terminal aesthetic.
        - [ ] **Frontend — changelog.json:** Create initial changelog data file with 2.6.0 entries.
        - [ ] **Tests:** Vitest tests for WelcomeModal (version tracking, show/dismiss), TutorialOverlay (step navigation, skip).

    - [ ] **2.6.4 — Chat System** *(Design §5)*
        - [ ] **Migration 044:** `db/044_chat_channels.sql` — Create `chat_channels` table, seed `global` channel, insert chat `game_configs` (`chat_buffer_size`, `chat_rate_limit_per_minute`, `chat_heartbeat_interval_s`, `broadcast_rarity_min`, `broadcast_rate_limit_per_minute`).
        - [ ] **Backend — SQLModel Model:** Create `backend/models/chat.py` with `ChatChannel` model.
        - [ ] **Backend — ConnectionManager:** Create `backend/services/chat.py` — singleton `ConnectionManager` class: `active_connections` dict (player_id → WebSocket list), `message_buffer` deque, `channels` dict, `connect/disconnect/broadcast/send_personal` methods.
        - [ ] **Backend — WebSocket Endpoint:** Create `backend/routes/chat.py` — `ws /ws/chat` endpoint with JWT auth (query param), send history on connect, ping/pong heartbeat (`chat_heartbeat_interval_s`), message relay with profanity check + rate limit.
        - [ ] **Backend — Profanity Filter:** Implement Aho-Corasick matcher using `pyahocorasick` library. Load `backend/profanity_blocklist.txt` on startup. Replace matches with fixed `*****` (5 asterisks). Create initial blocklist file.
        - [ ] **Backend — Rate Limiting:** Implement `ChatRateLimiter` class (per-player message timestamps, sliding window). Implement `BroadcastRateLimiter` class (global system broadcast rate). Achieving player always sees own toast via REST response.
        - [ ] **Backend — System Broadcasts:** Trigger broadcasts on: chapter/book completions, rare item finds (rarity >= `broadcast_rarity_min`), first boss defeats. Send via ConnectionManager. Rate-limited for other players.
        - [ ] **Backend — Mute Support:** Check `player.settings.chat_muted` / `chat_muted_until` before allowing message send. Return error to muted players.
        - [ ] **Frontend — Chat Tab:** Create `ChatTab.tsx` as Hub tab — scrollable message list (newest at bottom), input field + send button, per-message identity (`[ClassIcon] CharName [Lv.X]`), system messages styled distinctly (gold text), "New" tab indicator for unread.
        - [ ] **Frontend — WebSocket Client:** Create `frontend/src/game/services/chatClient.ts` — JWT auth via query param, auto-reconnect with exponential backoff, ping/pong handling, message buffer receive on connect.
        - [ ] **Admin — Chat Manager:** Create `admin/src/pages/ChatManager.tsx` — channel list with enable/disable toggles (global undeletable), live monitor (admin WebSocket connection), player search + recent messages + mute/unmute controls.
        - [ ] **Dependency:** Add `pyahocorasick` to `backend/requirements.txt`.
        - [ ] **Deployment:** Set `--max-instances=1` on Cloud Run for single-instance WebSocket. No other infra changes.
        - [ ] **Backend Tests:** pytest cases for ConnectionManager, profanity filter, rate limiters, WebSocket endpoint (connect/auth/message flow), broadcast triggers.
        - [ ] **Frontend Tests:** Vitest tests for ChatTab (message rendering, send), chatClient (reconnection logic).
        - [ ] **Admin Tests:** Vitest tests for ChatManager (channel CRUD, mute controls).

    - [ ] **2.6 — Cross-Cutting**
        - [ ] **Data Dictionary:** Update `db/data_dictionary.md` with all new tables and columns after each migration.
        - [ ] **E2E Tests:** Playwright tests for: reduce motion toggle, discovery flow (encounter → codex view), chat send/receive, changelog modal.
        - [ ] **Apply Migrations:** Apply 041–044 to dev DB per `docs/inst/DB_MIGRATIONS.md`.

- [ ] **3.0 — Marketplace & Premium (Monetization & Trading)** *(Ref: `docs/recs/0_REQUIREMENTS.md §3`)*
    - [ ] **Stripe Integration:** Premium "Elysium Shards" purchasing and subscription management.
    - [ ] **The Overworld Shop:** Central hub for trading Shards/Essence for equipment and meta-upgrades.
    - [ ] **Player-to-Player Trading:** Implement the marketplace for selling items for premium currency.
    - [ ] **Administrative Finance Dashboard:** Transaction logs, refund management, and subscription controls.

- [ ] **2.7 — Home Base Hub (Meta-Progression)** *(Ref: `docs/recs/2.7_HOME_BASE_HUB.md`)*
    - [x] **Home Base Hub Framework**
        - [ ] Implement the Home Base view.
        - [ ] Add Personal Journal (uncovered story beats from completed chapters).
        - [ ] Add Collections (rare items/artifacts display).
        - [ ] Add Leaderboard Standings view.
    - [ ] **Advanced Terminals**
        - [ ] Implement keyword search and narrative completion % for the Akashic Log.
        - [ ] Build Lore Inspection modal with 3D-effect sprites for the Relic Gallery. (add artifacts in the same way that we added inventory items - random generated. Much lower baseline stats (exccept for a few really powerful ones). Unlike items in the inventory that go away, these apply permanent buffs - can sell and trade, infinite space. No duplicates (if you get one of a higher rarity it replaces the one you already have.) Rarity increases the number of random stats it can have on it, but there are no levels for artifacts - stay at baseline stats/benefits unless you get higher rarity (in which case the stats are a bit higher))
        - [ ] Integrate passive artifact synergies into combat/training logic.
        - [ ] Implement tiered reward badges and Vessel Profile snapshots for Leaderboards.
        - [ ] Build the Achievement Matrix (100+ challenges) with Shard/Title rewards.
        - [ ] **[Cross-ref 2.3]** Define and implement milestone rewards for Idle Training skill levels 25, 50, 75, and 99 on each skill (badges, titles, Essence grants — see `2.3_IDLE_TRAINING.md §12`).

- [ ] **Bugs**
    - [ ] Bottom battle bar updates, character starts too far to the left when dying. The monsters seem to move behind him.
    - [ ] Weird bug hitting exit level after completing the boss in farming mode (getting the farm or hub popup).

---

*Updated: 2026-03-06*
