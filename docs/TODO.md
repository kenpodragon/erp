# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

## REC_2: Game Loop 2.0 (The Towers of Elysium)
**Note:** Initial implementation focuses on "The Rule of 4": 4 classes, 4 enemies, 4 skills, 4 scenes per chapter. All data must be server-authoritative and DB-driven.   


- [ ] **2.7 — Home Base Hub (Meta-Progression & Collections)** *(Ref: `docs/recs/2.7_HOME_BASE_HUB.md` | Design: `2.7_HOME_BASE_HUB_DESIGN.md` | Schema: `2.7_HOME_BASE_HUB_SCHEMA.md`)*
    - [x] **Create Requirements, Design, and Schema Documentation**
        - [x] Sync TODO, 2.7_HOME_BASE_HUB, and 0_REQUIREMENTS.
        - [x] Expand and refine 2.7_HOME_BASE_HUB.md requirements (clarifying questions resolved).
        - [x] Create 2.7_HOME_BASE_HUB_DESIGN.md (technical spec with use cases and test cases).
        - [x] Create 2.7_HOME_BASE_HUB_SCHEMA.md (migrations 046-048, all tables and seeds).
        - [x] Update 0_REQUIREMENTS.md with refined high-level requirements.
        - [x] Plan implementation execution and insert into TODO.
    - [ ] **2.7.0 — Foundation: Artifact System & Schema**
        - [ ] Create migration 046: Artifact tables (`curated_artifacts`, `curated_artifact_tiers`, `artifact_type_bases`, `artifact_prefixes`, `artifact_suffixes`, `player_artifacts`) + `story_beats` hidden lore columns + seed 50 curated artifacts with tier data + seed artifact components.
        - [ ] Create migration 047: Achievement tables (`titles`, `achievements`, `player_achievements`, `player_titles`) + `player_characters.equipped_title_id` + seed ~20 titles + seed 100+ achievements.
        - [ ] Create migration 048: `leaderboard_cache` table + 13 `game_configs` keys for artifacts/leaderboard/achievements.
        - [ ] SQLModel models for all new tables (`backend/models/`).
        - [ ] Artifact generation service (`generate_artifact()` — simplified Dream Item pipeline).
        - [ ] Curated artifact drop evaluation in Story Mode `/complete` flow.
        - [ ] `recalculate_character_stats()` extended with artifact bonus aggregation.
        - [ ] Backend tests for artifact system (generation, drops, stats integration, rarity upgrade).
        - [ ] Apply migrations 046-048 to dev DB.
        - [ ] Update `db/data_dictionary.md`.
    - [ ] **2.7.1 — Akashic Log Enhancements**
        - [ ] `GET /api/game/home-base/akashic-log` endpoint (full beat hierarchy + hidden lore eligibility).
        - [ ] AkashicLog.tsx: keyword search (client-side), narrative completion % indicators, beat detail view.
        - [ ] Hidden lore display (Intelligence-gated, locked indicator).
        - [ ] "New" badge tracking (`akashic_last_visited_at` in player_settings).
        - [ ] Backend + frontend tests.
    - [ ] **2.7.2 — Relic Gallery & Artifact UI**
        - [ ] `GET /api/game/home-base/artifacts` endpoint (owned + curated silhouettes).
        - [ ] RelicGallery.tsx: grid layout, filtering (source/rarity/effect), sorting, collection progress counter.
        - [ ] ArtifactInspectionModal.tsx: lore, stats, source, acquisition date, large icon.
        - [ ] Empty slot silhouettes for undiscovered curated artifacts with source hints.
        - [ ] Artifact bonus display in HeroStats panel.
        - [ ] Backend + frontend tests.
    - [ ] **2.7.3 — Leaderboard Expansion & Achievement Matrix**
        - [ ] `GET /api/game/home-base/leaderboard/{category}` endpoint with server-side caching.
        - [ ] Speedrun (Swift) + Scholar leaderboard category computation.
        - [ ] Leaderboard rank card: badge icon, class icon, alias, level, title, metric.
        - [ ] Tiered visual badges (Cosmic/Gold/Silver/Bronze by percentile).
        - [ ] Achievement evaluation engine (`evaluate_achievements()` at session boundaries).
        - [ ] `GET /api/game/home-base/achievements` endpoint.
        - [ ] AchievementMatrix.tsx: category tabs, grid, progress bars, completion summary.
        - [ ] Title system: `PATCH /api/players/me/title`, equip/display on leaderboard + chat.
        - [ ] Achievement toast notifications in PostBattleSummary.
        - [ ] Backend + frontend tests.
    - [ ] **2.7.4 — Admin Tools & Polish**
        - [ ] Admin Artifact Editor page (CRUD, bulk boss/chapter assignment, drop rate tuning).
        - [ ] Admin Achievement Editor page (CRUD, player override, completion analytics).
        - [ ] `GET /api/game/home-base/summary` consolidated hub endpoint.
        - [ ] Hub navigation badge count (new items across all terminals).
        - [ ] Idle Training milestone rewards integration (Essence grants at L25/50/75/99).
        - [ ] MR2 base + terminal accent styling (monospace headers, amber accents, CRT scanlines).
        - [ ] Reduce Motion compliance for all terminal effects.
        - [ ] Admin tests (vitest).
        - [ ] Data dictionary and documentation final pass.



- [ ] **3.0 — Marketplace & Premium (Monetization & Trading)** *(Ref: `docs/recs/0_REQUIREMENTS.md §3`)*
    - [ ] **Stripe Integration:** Premium "Elysium Shards" purchasing and subscription management.
    - [ ] **The Overworld Shop:** Central hub for trading Shards/Essence for equipment and meta-upgrades.
    - [ ] **Player-to-Player Trading:** Implement the marketplace for selling items for premium currency.
    - [ ] **Artifact & Item Trading:** NPC vendor sell-for-Essence + P2P artifact marketplace. *(Deferred from 2.7)*
    - [ ] **Administrative Finance Dashboard:** Transaction logs, refund management, and subscription controls.


- [ ] **Bugs**
    - [ ] Bottom battle bar updates, character starts too far to the left when dying. The monsters seem to move behind him.
    - [ ] Weird bug hitting exit level after completing the boss in farming mode (getting the farm or hub popup).
    - [ ] Investigate some standard SDD frameworks (Open Spec) - consider converting this and documentation into that format.
    - [ ] Code bloat and ballooning (a few god class files have been created, break these back down into modules)
    - [ ] Code documentation - link to requirements documentation, functional specs, or inline code comments


    - [ ] See if firebase can store a JSON string for users (how much space, how updatable).
    - [ ] If not, are there free clud DBS?
    - [ ] If yes, then create postgres docker container, load up with DB dump (everything except player data) when container inits. 
    - [ ] When player logs in first time (if missing) gets info from firebase and repopulates their record. 
    - [ ] Every now and then update the JSON string in firebase.

---

*Updated: 2026-03-06*
