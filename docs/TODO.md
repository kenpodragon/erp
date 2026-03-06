# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

## REC_2: Game Loop 2.0 (The Towers of Elysium)
**Note:** Initial implementation focuses on "The Rule of 4": 4 classes, 4 enemies, 4 skills, 4 scenes per chapter. All data must be server-authoritative and DB-driven.

- [ ] **2.4 — Character & Progression Systems, Classes, and Skills**
    > **Refs:** [Requirements](docs/recs/2.4_CHARACTER_PROGRESSION.md) | [Design & Formulas](docs/recs/2.4_CHARACTER_PROGRESSION_DESIGN.md) | [Schema](docs/recs/2.4_CHARACTER_PROGRESSION_SCHEMA.md)
    > **Migrations:** 030–035 | **Sub-phases:** 2.4.0 → 2.4.1 → 2.4.2 → 2.4.3
    > **Parallelism:** Within each sub-phase, Track A (DB) → Track B (API) → Track C (Frontend). Track D (Tests) can start once Track A completes. Sub-phases 2.4.0 and 2.4.1 Track A can run in parallel. 2.4.3 Track A can begin once 2.4.0 Track A is done.

    - [x] **Planning and Documentation**
        - [x] Requirements, Design, and Schema docs created, expanded, and locked down (Iteration 2)
        - [x] 12 clarifying questions resolved and documented in all three docs
        - [x] Class visual identity system added (§4.4, Design §5.4, Schema §2.7/§3.4)
        - [x] Development plan created and added to TODO.md

    - [ ] **2.4.0 — Foundation: Extensible Stats & Character Level**
        - [ ] **Track A: Backend — DB & Models**
            - [ ] Write `db/030_stat_system_foundation.sql` — new tables + ALTERs *(Schema §2)*
            - [ ] Write `db/031_stat_system_seed.sql` — affinities, contributions, visual_config, game_configs, recommended_level *(Schema §3)*
            - [ ] Apply migrations 018–031 to dev DB *(inst/DB_MIGRATIONS.md)*
            - [ ] SQLModel models: `IdleSkillStatContribution`, `ClassStatAffinity`, `CharacterStat`, `PlayerSceneRecord` *(Schema §2.1–§2.3, §2.8)*
            - [ ] Update `CharacterClass` model — add `visual_config` JSONB field *(Req §4.4, Schema §2.7)*
            - [ ] Update `PlayerCharacter` model — add `character_xp` field *(Schema §2.4)*
            - [ ] Implement `recalculate_character_stats(character_id)` service *(Design §1.1–§1.6)*
            - [ ] Implement Character XP accrual service — idle XP conversion + scene completion grant *(Design §2.1)*
            - [ ] Implement Character level-up logic — quadratic curve, stat bonuses *(Design §2.2–§2.3)*
        - [ ] **Track B: Backend — API Endpoints** *(depends on Track A)*
            - [ ] `GET /api/game/character/stats` — computed stat block *(Req §8)*
            - [ ] `GET /api/game/character/level` — level, XP, XP-to-next *(Req §8)*
            - [ ] Modify `POST /api/game/story/start` — read new stat system, apply to session *(Req §8)*
            - [ ] Modify `POST /api/game/story/complete-scene` — award Character XP, upsert `player_scene_records` *(Req §8, Design §2.1)*
            - [ ] Update `GET /api/game/training/status` — include prerequisite state *(Req §8)*
        - [ ] **Track C: Frontend — Character UI** *(depends on Track B)*
            - [ ] Character stat panel component — 3 stats + source breakdown tooltip *(Req §2)*
            - [ ] Character level bar + XP display *(Req §3)*
            - [ ] Apply class visual identity — CSS custom properties from `visual_config` *(Req §4.4, Design §5.4)*
            - [ ] Apply class visual identity — PixiJS damage text color, particle tints, avatar in HeroStats *(Req §4.4, Design §5.4)*
        - [ ] **Track D: Tests — 2.4.0**
            - [ ] Backend: stat calculation — class base + idle + lore + level + equipment *(Req §10)*
            - [ ] Backend: Character XP accrual + level-up threshold *(Req §10)*
            - [ ] Backend: content gate — min_level blocks, recommended_level advisory *(Req §10)*
            - [ ] Frontend: stat panel render, level bar render *(Req §10)*

    - [ ] **2.4.1 — Skill System: Prerequisites & Class Abilities**
        - [ ] **Track A: Backend — DB & Models**
            - [ ] Write `db/032_skill_prerequisites.sql` — prerequisite table, skills ALTERs *(Schema §4)*
            - [ ] Write `db/033_skill_prerequisites_seed.sql` — all prerequisite seeds, class skills, idle training actions *(Schema §5)*
            - [ ] Apply migrations 032–033 to dev DB *(inst/DB_MIGRATIONS.md)*
            - [ ] Update `db/data_dictionary.md` for all new and modified tables *(AGENTS.md mandate)*
            - [ ] SQLModel model: `SkillPrerequisite` *(Schema §4.1)*
            - [ ] Update `Skill` model — `level_0_xp_requirement`, `class_id`, `is_class_exclusive`, `idle_level_scaling`, `effect_type` *(Schema §4.2)*
            - [ ] Update `CharacterSkillLevel` model — `max_session_level` *(Schema §4.3)*
            - [ ] Implement prerequisite evaluation service — AND-gate, all 5 types *(Req §5.2, Design §5.1)*
            - [ ] Implement Level 0 system enforcement — visibility rules, XP threshold *(Req §5.1, Design §3.1)*
            - [ ] Implement dual-leveling — idle level → base power interpolation from `idle_level_scaling` *(Req §5.1a, Design §3.2)*
        - [ ] **Track B: Backend — API Endpoints** *(depends on Track A)*
            - [ ] `GET /api/game/skills/tree` — full skill tree with lock/unlock/prerequisite status *(Req §8)*
            - [ ] Modify `GET /api/game/story/session` — include skill tree state for UpgradeMenu *(Req §8)*
            - [ ] Modify session start/end — track `max_session_level` updates *(Design §3.2)*
        - [ ] **Track C: Frontend — Skill UI** *(depends on Track B)*
            - [ ] Update Idle Training panel — Level 0 locked state, prerequisite display, active skill training actions *(Req §5.1, §5.3)*
            - [ ] Update UpgradeMenu — prerequisite-gated skills, class-exclusive skill visibility *(Req §5.3)*
            - [ ] Implement second hotbar row — class-exclusive skills with class-themed styling *(Req §4.2, Design §5.3)*
            - [ ] Implement effect handler map — `frontend/src/game/utils/effectHandlers.ts` *(Req §7.3, Design §8.3)*
        - [ ] **Track D: Tests — 2.4.1**
            - [ ] Backend: all 5 prerequisite types + Level 0 XP threshold + AND-gate + class-exclusive visibility *(Req §10)*
            - [ ] Frontend: skill tree locked/ready states, UpgradeMenu class-exclusive hidden/visible *(Req §10)*

    - [ ] **2.4.2 — Dream Item System**
        - [ ] **Track A: Backend — DB & Models**
            - [ ] Write `db/034_dream_items.sql` — gear_slots, item component tables, inventory_items ALTERs *(Schema §6)*
            - [ ] Write `db/035_dream_items_seed.sql` — all item component seeds *(Schema §7)*
            - [ ] Apply migrations 034–035 to dev DB *(inst/DB_MIGRATIONS.md)*
            - [ ] Update `db/data_dictionary.md` for all new and modified tables *(AGENTS.md mandate)*
            - [ ] SQLModel models: `GearSlot`, `ItemPrefix`, `ItemQuality`, `ItemLoreTag`, `ItemTypeBase`, `ItemSuffix` *(Schema §6)*
            - [ ] Update `InventoryItem` model — `item_code`, `min_char_level`, `stat_requirements`, `gear_slot_id`, `item_level` *(Schema §6.5)*
            - [ ] Implement item generator service — 5-component code, stat calc, rarity roll, requirements *(Req §6.3, Design §4)*
            - [ ] Implement `regenerate_item_names` admin utility *(Req §6.3)*
            - [ ] Implement run achievement evaluator — threshold checks, independent drop rolls *(Req §6.2, Design §6)*
        - [ ] **Track B: Backend — API Endpoints** *(depends on Track A)*
            - [ ] `GET /api/game/inventory` — full inventory state (equipped + stored + requirement status) *(Req §8)*
            - [ ] `POST /api/game/inventory/equip` — direct swap logic *(Req §6.6, §8)*
            - [ ] `POST /api/game/inventory/unequip` *(Req §8)*
            - [ ] `DELETE /api/game/inventory/{item_id}` *(Req §8)*
            - [ ] `POST /api/game/inventory/keep-drop` and `POST /api/game/inventory/dismiss-drop` *(Req §8)*
            - [ ] Modify `POST /api/game/story/complete-scene` — run achievement check → item drop generation *(Req §6.2, §8)*
        - [ ] **Track C: Frontend — Inventory & Loot UI** *(depends on Track B)*
            - [ ] Home Base inventory UI — 3 equipped slots + 10 bag slots, equip/unequip actions *(Req §6.6)*
            - [ ] Item card component — rarity-colored border, stat display, requirement overlay for locked items *(Req §6.4, §6.5)*
            - [ ] PostBattleSummary loot section — dice spin animation per achievement *(Req §6.6, Design §6.3)*
            - [ ] Yaldabaoth thundercloud fail animation + item materialize success animation *(Design §6.3)*
            - [ ] Full-inventory comparison/replace UI — FIFO display, swap or discard *(Req §6.6)*
        - [ ] **Track D: Tests — 2.4.2**
            - [ ] Backend: item generator (valid codes, rarity distribution, stat calc, level cap, requirements) *(Req §10)*
            - [ ] Backend: run achievement threshold + drop roll independence *(Req §10)*
            - [ ] Backend: inventory capacity enforcement, keep/dismiss flow, equip swap *(Req §10)*
            - [ ] Frontend: inventory render, item card, dream item drop modal, full-inventory replace *(Req §10)*

    - [ ] **2.4.3 — Admin Panel: Config Browser + Content Editor**
        - [ ] **Track A: Backend — API Endpoints**
            - [ ] `GET /admin/game/configs` — searchable config browser (game_configs + server_config with metadata) *(Req §7.1, §8)*
            - [ ] `PATCH /admin/game/configs/{key}/meta` — update description, game_impact, category *(Req §7.1, §8)*
            - [ ] CRUD endpoints: `/admin/game/stats` — stat_definitions *(Req §7.2, §8)*
            - [ ] CRUD endpoints: `/admin/game/classes` — character_classes + class_stat_affinities + visual_config *(Req §4.4, §7.2, §8)*
            - [ ] CRUD endpoints: `/admin/game/skills` — skills + skill_actions + skill_prerequisites *(Req §7.2, §8)*
            - [ ] CRUD endpoints: `/admin/game/benefits` — benefit_effect_data *(Req §7.2, §8)*
            - [ ] CRUD endpoints: `/admin/game/items/components` — all item generation tables *(Req §7.2, §8)*
        - [ ] **Track B: Admin Frontend** *(depends on Track A)*
            - [ ] Config browser page — searchable table with key, value, description, game_impact, category *(Req §7.1)*
            - [ ] Content editor: stat definitions CRUD *(Req §7.2)*
            - [ ] Content editor: class CRUD — visual_config with color picker, stat affinities *(Req §4.4, §7.2)*
            - [ ] Content editor: skills CRUD — universal + class-exclusive, prerequisite management *(Req §7.2)*
            - [ ] Content editor: benefit effects CRUD *(Req §7.2)*
            - [ ] Content editor: item components CRUD — prefixes, suffixes, types, qualities, lore tags *(Req §7.2)*
        - [ ] **Track D: Tests — 2.4.3**
            - [ ] Backend: admin CRUD endpoint tests for all entity types *(Req §10)*
            - [ ] Frontend: config browser search, class editor create flow *(Req §10)*

    - [ ] **2.4.4 Cross-Cutting / Final**
        - [ ] Update `db/data_dictionary.md` for all new and modified tables *(AGENTS.md mandate)*
        - [ ] E2E Playwright: stat updates on session start, locked skill blocked, item drop flow, equip→session stat *(Req §10)*
        - [ ] Final doc pass: mark completion criteria in `2.4_CHARACTER_PROGRESSION.md` *(Req §11)*

- [ ] **2.5 — Audio & Music Integration** *(Ref: `docs/recs/2.5_AUDIO_MUSIC.md`)*
    - [ ] **Infrastructure:**
        - [ ] **Duration Utility:** Build a backend script to extract/update scene narrative durations (based on word counts or audio).
        - [ ] **Asset Management:** Implement the `dev_content_audit` logger for missing audio/music.
    - [ ] **Frontend Components:**
        - [ ] **Audio Player Embed:** Implement a standard audio player with Play, Pause, Restart, and Playback Speed (0.5x - 2.0x).
        - [ ] **Suno Music Manager:** Build the looping background audio manager with cross-fade support.
        - [ ] **WAV → MP3:** ffmpeg conversion of `/frontend/public/music/` tracks; update `AudioPlayer.tsx` src paths.
    - [ ] **Experience:**
        - [ ] **Spatial SFX:** Add tactile feedback for clicks, hits, and level-ups.
        - [ ] **Advanced Narrative (ElevenLabs):** Research and prototype word-level timestamp sync for future implementation.

- [ ] **2.6 — Economy & Anti-Cheat** *(Ref: `docs/recs/2.6_ECONOMY_ANTICHEAT.md`)*
    - [ ] Implement currency conversion (Session Gold -> Essence/Resources).
    - [ ] Implement server-side click rate limiting and damage verification.
    - [ ] Build session integrity checks for Story Mode exit.
    - [ ] **Social & Trade Hub**
        - [ ] Implement global and chapter-specific chat channels with server-side filtering.
        - [ ] Build the Overworld Shop for equipment and permanent resource trading.
    - [ ] Apply "Magic Research 2" aesthetic polish across all loops.

- [ ] **2.7 — Home Base Hub (Meta-Progression)** *(Ref: `docs/recs/2.7_HOME_BASE_HUB.md`)*
    - [x] **Home Base Hub Framework**
        - [x] Implement the Home Base view.
        - [x] Add Personal Journal (uncovered story beats from completed chapters).
        - [x] Add Collections (rare items/artifacts display).
        - [x] Add Leaderboard Standings view.
    - [ ] **Advanced Terminals**
        - [ ] Implement keyword search and narrative completion % for the Akashic Log.
        - [ ] Build Lore Inspection modal with 3D-effect sprites for the Relic Gallery.
        - [ ] Integrate passive artifact synergies into combat/training logic.
        - [ ] Implement tiered reward badges and Vessel Profile snapshots for Leaderboards.
        - [ ] Build the Achievement Matrix (100+ challenges) with Shard/Title rewards.
        - [ ] **[Cross-ref 2.3]** Define and implement milestone rewards for Idle Training skill levels 25, 50, 75, and 99 on each skill (badges, titles, Essence grants — see `2.3_IDLE_TRAINING.md §12`).

- [ ] **Bugs**
    - [ ] Bottom battle bar updates, character starts too far to the left when dying. The monsters seem to move behind him. 
    - [ ] Weird bug hitting exit level after completing the boss in farming mode (getting the farm or hub popup).

---

*Updated: 2026-03-05*
