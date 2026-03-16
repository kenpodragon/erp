# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

**E2E Testing Environment:** Docker dev stack runs via `docker-compose up --build -d` from project root. Services: backend (`:8000`), frontend (`:5173`), admin (`:5174`). Auth bypass enabled via `ALLOW_AUTH_BYPASS=true` in `backend/.env` + `ops.auth_bypass_enabled=true` in DB (toggle in Admin → Server Config). Test players: Awakened/Seeker (ID 5, Vessel), E2ETestBot (ID 2, admin). DB backups via `pg_dump`/`pg_restore` with localhost. Session state tracked in `docs/E2E_SESSION_STATE.md`.

---

## End-to-End User Testing
**Full session plan and tracking:** `docs/E2E_SESSION_STATE.md`
**Output:** User manuals in `docs/user_manuals/end_user/` and `docs/user_manuals/admin/`

### Bugs Found & Fixed During E2E Testing
- [x] **Bug #1** — Vessel class `lore_blurb` em dash encoding (`â€"` → `—`) — DB fix
- [x] **Bug #2/#7** — `skill_actions` em dash encoding (14 rows) — DB fix, verified clean
- [x] **Bug #5** — `narrativeProgressPct` ReferenceError in `CombatStage.tsx:395` — code fix (`session.narrativeProgressPct`), verified zero errors in combat
- [x] **Bug #6** — Admin Edit Progression "Scene NaN" — `ProgressionEditorModal.tsx` used `sort_order` but API returns `scene_number`, code fix, verified shows correct scene number
- [ ] **Observation** — Asset batch 404s for missing sprites (avatar_vessel, bg_*) — should fall back to default sprites and log to `dev_content_audit`. Needs verification.

### Session 1: Setup, DB Dump/Restore, Onboarding — COMPLETE
- [x] **1.0** Docker stack launch & health verification
- [x] **1.1** DB baseline dump + restore test — `db/backups/erp_backup_pre_e2e_user_testing.dump` (5.3MB), verified
- [x] **1.2** Onboarding flow — new player "Awakened"/"Seeker" (Vessel, ID 5): TOS → Profile → Character → Welcome
- [x] **1.3** Game Hub orientation — all 7 sidebar tabs verified for fresh player empty states

### Session 2: Story Mode — Chapters 1-5 + Idle Training + Admin — IN PROGRESS
- [x] **2.0** Enter first story scene — narrative, combat, WPM text, controls all load correctly
- [x] **2.1** Chapter 1 playthrough — scene complete, Dream Forge item drop, farm mode popup, Return to Hub
- [x] **2.2** Start idle training — Attack skill "Shadowboxing in the Garage", verified ticks in background, offline return report: +5 levels (Lv1→Lv6)
- [x] **2.3** Chapter 2 playthrough + Chapter 1 & 2 boss fights — GUARDIAN boss, NarrativeReveal cinematic works
- [ ] **2.4** Banner observation (early game) — enemy count, types, attack animations
- [x] **Admin tested:** Dashboard (stats/charts), Player Management (list/detail), Edit Progression (cascading dropdowns, backfill preview — advanced to Ch8, 25 scenes + 6 bosses backfilled)

### Session 3: Story Mode — Chapters 4-5, Boss Fights, Farm Mode
- [ ] **3.0** Chapter 5+ playthrough (now at Ch8 "5: From Crash Until Dawn") — verify auto-DPS reflects idle training gains
- [ ] **3.1** Chapter boss encounter (all 3 interrupt types: click_burst, target_zone, whack_sequence) + NarrativeReveal
- [ ] **3.2** Farm mode extended test (10+ waves after completion, gold flow, exit → hub)
- [ ] **3.3** Dark Ritual persistence verification across scenes in a chapter
- [ ] **3.4** Banner observation (mid game) — compare to early game

### Session 4: Admin Flows — Player Editing, XP/Item Grants, Live Loop
- [x] **4.0** Admin dashboard verification (stats, charts, activity feed) — tested in Session 2
- [ ] **4.1** Player management — live loop: admin grants XP/essence/items → player sees changes
- [ ] **4.2** Create Player B (secondary) — admin grants shards + items for marketplace testing
- [ ] **4.3** Support & moderation (ticket flow, ban/unban, chat moderation)
- [x] **4.4** Progression editing — tested in Session 2 (admin advance + backfill verified)

### Session 5: Economy — Shards, Shop, Marketplace, Stripe
- [ ] **5.0** Shard purchasing via Stripe test mode (test card `4242...`)
- [ ] **5.1** Subscription activation via Stripe test mode — verify boosts applied
- [ ] **5.2** Emporium browsing — cosmetics, boosters (buy + verify buff), bundles
- [ ] **5.3** Marketplace: Player A lists item → Player B buys (verify shard transfer, 5% tax, trade history)
- [ ] **5.4** Marketplace: Player B lists → Player A buys (verify reverse flow)
- [ ] **5.5** NPC Vendor salvage (essence per rarity, bulk salvage, curated double-confirm)
- [ ] **5.6** Donation via Stripe test mode — patron tier, Donor Hall
- [ ] **5.7** Admin Finance Dashboard verification (transactions, revenue, shard economy, marketplace)

### Session 6: Home Base Hub, Achievements, Leaderboards, Chat
- [ ] **6.0** Akashic Log — chapter hierarchy, search, completion %, "New" badges
- [ ] **6.1** Relic Gallery — artifacts collected, filtering, sorting, inspection, silhouettes
- [ ] **6.2** Achievement Matrix — triggered achievements, rewards verification
- [ ] **6.3** Hall of Echoes — leaderboard entries, rank cards, badge tiers
- [ ] **6.4** Inventory — equipped items, equip/swap, stat changes
- [ ] **6.5** Chat system (WebSocket status under auth bypass)

### Session 7: Audio, Settings, Accessibility, Banner Progression
- [ ] **7.0** Audio settings — volume sliders, mute toggle, persistence
- [ ] **7.1** Music Manager — state transitions (explore → combat → boss), cross-fade, idle training music
- [ ] **7.2** SFX system — click/crit/death/skill/level-up/item-drop SFX, spatial panning
- [ ] **7.3** Reduce Motion / accessibility toggle
- [ ] **7.4** Banner progression deep dive — enemy count, variety, **attack animation differentiation check**
- [ ] **7.5** Profile & settings (alias editing, avatar, character stats display)

### Session 8: Admin Content — World Builder, Configs, Finance
- [ ] **8.0** World Builder (all 4 tabs) — edit scene wave config → verify player sees change
- [ ] **8.1** Atmosphere & SFX editors — Web Audio preview, edit → verify in-game
- [ ] **8.2** Game Configs — browse 141+ configs, edit value → verify gameplay effect
- [ ] **8.3** Artifacts & Achievements admin — browse, filter, analytics
- [ ] **8.4** Asset Registry — 196+ assets, category filters, search, orphan detection
- [ ] **8.5** Dev Audit & Audit Log — open issues, admin action history
- [ ] **8.6** Server Config — maintenance mode, announcement banner (toggle + verify player sees)

### Session 9: Edge Cases, Bug Bash, Final Sweep
- [ ] **9.0** Re-verify all bugs found and fixed in Sessions 1-8
- [ ] **9.1** Edge cases: empty states, maxed skills, expired listings, rapid clicking, tab switching mid-combat, browser refresh resume, offline/online toggle
- [ ] **9.2** DB dump/restore final test (full data dump → restore to baseline → restore to latest)
- [ ] **9.3** Final feature sweep — every frontend + admin route

### Session 10: End User Manual
- [ ] **10.0** Ch1: Getting Started (onboarding, auth, character creation)
- [ ] **10.1** Ch2: The Game Hub (map, sidebar, navigation)
- [ ] **10.2** Ch3: Story Mode (combat, narrative, upgrades, farm mode)
- [ ] **10.3** Ch4: Boss Fights (mechanics, interrupts, rewards)
- [ ] **10.4** Ch5: Idle Training (skill training, passive progression)
- [ ] **10.5** Ch6: Home Base (journal, artifacts, achievements, leaderboard)
- [ ] **10.6** Ch7: Economy (shop, shards, marketplace, donations)
- [ ] **10.7** Ch8: Social (chat, titles, patron status)
- [ ] **10.8** Ch9: Settings & Accessibility (audio, motion, profile)
- [ ] **10.9** Ch10: FAQ & Troubleshooting

### Session 11: Admin Manual
- [ ] **11.0** Ch1: Dashboard & Overview
- [ ] **11.1** Ch2: Player Management (search, edit, support, ban)
- [ ] **11.2** Ch3: World Builder (narrative, content, classification, scaling)
- [ ] **11.3** Ch4: Game Tuning (configs, drop rates, skill balance, economy)
- [ ] **11.4** Ch5: Audio Management (atmospheres, SFX)
- [ ] **11.5** Ch6: Finance (transactions, subscriptions, marketplace, disputes)
- [ ] **11.6** Ch7: System Administration (server config, audit, access control)
- [ ] **11.7** Ch8: Content Pipeline (assets, dev audit, generators)

---

## Simulation & Progression Balancing
*(Separate from E2E User Testing — long-duration timing tests with stopwatch metrics)*
- [ ] Needs full breakdown and plan with session tracking
- [ ] Test timing on Books and idle skill training — ramp feel, challenge, skill impact
- [ ] Compare clicking + WPM display speed vs 1x reading speed → capture metrics (stopwatch)
- [ ] Test regular progression (default stats/no gear vs max stats/max gear)
- [ ] By Book 2: player should be at a specific level with specific passive skills — validate
- [ ] Target: 2 hours/day active play → complete game in 30 calendar days (60 hours total for 3 books)
- [ ] Analyze power-gamer path: 24/7 optimized farming, all boosts, max speed
- [ ] Produce initial scaling defaults → migration 062 SQL script

---

## Banner Visual Improvements
- [ ] **Attack animation differentiation** — entities in BottomAnimatedBanner should show attack-type-appropriate animations:
  - Flying entities → flying/hovering animation
  - Magic entities → magic projectile effects (bolts, orbs)
  - Melee entities → melee swing/slash animations
  - Ranged entities → ranged attack projectiles (arrows, thrown weapons)
  - Currently all entities may use the same idle/walk animation regardless of type
  - Depends on: `visual_behaviors.animation_config` from 5.3, attack_types table, sprite assets
  - *(Discovered during E2E Session 7 banner progression review)*

---

## Future Work

### Generators
**NOTE:** Go through requirements definition first. Ask questions, fill out details, iterate on design + schema before coding.
- [ ] Read `0_REQUIREMENTS.md` → capture generator requirements → build out recs/design/schema docs
- [ ] Ensure all necessary generators are listed (check for gaps in existing data)

### Cosmetic Asset Generation *(Ref: 3.3 §19)*
- [ ] Pixel-art skins, badges, flair, avatars — depends on `C_STORY_ASSET_GENERATORS.md` §8

### Structural Improvements
- [ ] Investigate SDD frameworks (Open Spec) — consider converting documentation
- [ ] Code bloat cleanup (break god-class files into modules)
- [ ] Code documentation — link to requirements, functional specs, inline comments

### Cloud Deployment
- [ ] Explore Firebase JSON storage for user data (capacity, update frequency)
- [ ] Evaluate free cloud DB alternatives
- [ ] If viable: Postgres Docker container auto-loaded with DB dump (minus player data)
- [ ] Player first-login: repopulate from Firebase record
- [ ] Periodic Firebase sync

---

*Updated: 2026-03-16 (Sessions 1-2 in progress. 4 bugs found and fixed. See E2E_SESSION_STATE.md for full details.)*
