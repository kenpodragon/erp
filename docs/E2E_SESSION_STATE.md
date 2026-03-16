# E2E User Testing — Session State

**Purpose:** Tracks live progress of End-to-End User Testing across sessions. Read this file at the start of any new session to pick up where we left off.

---

## Environment Setup
- **Docker stack:** `docker-compose up --build -d` from project root
- **Services:** backend (`:8000`), frontend (`:5173`), admin (`:5174`)
- **Auth bypass:** `ALLOW_AUTH_BYPASS=true` in `backend/.env` + `ops.auth_bypass_enabled=true` in DB
- **Players:**
  - **Player A (Primary):** "Awakened" (ID 5), character "Seeker" (Vessel class, Lv. 1), is_game_admin=true
  - **Player B (Secondary):** TBD — created during Session 4 for marketplace testing
  - **Admin User:** E2ETestBot (ID 2) — existing admin with character "TestHero"
- **DB Backups:**
  - **Pre-testing baseline:** `db/backups/erp_backup_pre_e2e_user_testing.dump` (5.3MB) — taken Session 1
  - **Restore test:** VERIFIED — drop+restore, counts match (2 players, 3936 entities, 724 scenes, 141 configs)
  - **Mid-testing checkpoints:** Optional dumps between sessions if state gets complex
- **Playwright MCP:** Available for interactive browser testing against localhost
- **Stripe:** Test-mode transactions (use Stripe test card `4242 4242 4242 4242`)

---

## Status: SESSION 2 IN PROGRESS

## Session 2 Progress (Story Mode + Admin)

### Completed
- [x] **2.0** Entered first scene (1-0 "Front Matter and Publication Details") — narrative + combat loaded
- [x] **2.1** Chapter 1 playthrough — scene complete, Dream Forge item drop ("Vanishing Defective TJ Focus Orb"), Return to Hub
- [x] **2.2** Started idle training — Attack skill, "Shadowboxing in the Garage" (3.0s interval, +10 XP/tick)
- [x] **2.3** Chapter 2 (Book the First Angles) playthrough — 1 scene, completed quickly
- [x] Chapter 1 Boss — GUARDIAN, 352 HP, auto-DPS killed it in ~10s, NarrativeReveal worked (star particles + lore)
- [x] Chapter 2 Boss — same pattern, quick kill
- [x] **Admin progression advance** — used admin Player Detail → Edit Progression → advanced to Chapter 8 (5: From Crash Until Dawn), backfilled 25 scenes + 6 bosses

### Key Observations
- Early scenes very short (1m 15s each, 1 scene per chapter for Ch1-2)
- Boss fights too easy at Ch1 — auto-DPS kills before interrupts trigger (need later bosses for interrupt testing)
- Dream Forge item drops working — procedural names with prefix + adjective + base + suffix
- Idle training ticks in background while navigating hub
- Combat continues behind Scene Complete modal (auto-DPS still killing enemies)
- Narrative text WPM-timed reveal works correctly
- Admin progression editor has cascading dropdowns with preview ("Will backfill X scenes and Y boss clears")

### Bugs Found — Session 2
| # | Description | Severity | Status |
|---|-------------|----------|--------|
| 5 | `narrativeProgressPct` ReferenceError in CombatStage.tsx — bare variable instead of `session.narrativeProgressPct` | Medium | **FIXED** (line 395) |
| 6 | Admin Edit Progression confirmation shows "Scene NaN" — scene number not parsed correctly | Low | OPEN |
| 7 | Encoding `â€"` in idle training skill descriptions (same root cause as Bug #1) | Low | OPEN |

### Screenshots Captured — Session 2
- `09_map_ch1.png` — Map with Chapter 1 available
- `10_story_mode_scene1.png` — Scene info modal
- `11_story_mode_combat.png` — Story Mode combat view (narrative + combat + controls)
- `12_idle_training_started.png` — Skills tab, training not yet active
- `13_idle_training_active.png` — Training running (CALIBRATING, XP ticking)
- `14_map_after_scene1.png` — Map with Scene 1 completed
- `15_chapter_boss_info.png` — Chapter Boss info modal (orange theme)
- `16_boss_fight.png` — Boss fight (GUARDIAN, HP bar, timer)
- `17_boss_fight_progress.png` — NarrativeReveal after boss defeat
- `18_map_ch2_unlocked.png` — Map with Chapter 2 unlocked
- `19_scene2_info.png` — Scene 2-0 info modal
- `20_scene2_combat.png` — Scene 2 combat (Scene Complete appearing)
- `21_map_current.png` — Map state before admin advance
- `22_admin_dashboard.png` — Admin dashboard with stats/charts
- `23_admin_players.png` — Player Management list
- `24_admin_player_detail.png` — Awakened player detail page
- `25_admin_edit_progression.png` — Edit Progression modal
- `26_admin_progression_set.png` — Progression set to Chapter 8
- `27_admin_progression_applied.png` — Confirmation dialog
- `28-29` — Progression result screens
- `30_map_advanced_ch8.png` — Map after admin advance (25 scenes backfilled)

---

## Session 1 Results (COMPLETE)

## Session 1 Results

### 1.0 Docker Stack — DONE
- All 3 services healthy (backend :8000, frontend :5173, admin :5174)
- Backend health: `{"status":"healthy","database":"connected"}`

### 1.1 DB Dump/Restore — DONE
- Baseline dump: `db/backups/erp_backup_pre_e2e_user_testing.dump` (5.3MB)
- Restore verified: counts match exactly post-restore
- Tool: `pg_dump`/`pg_restore` with localhost (not host.docker.internal)

### 1.2 Onboarding Flow — DONE (4-step wizard)
- **Step 1:** TOS — scrollable terms, checkbox + "I Accept" (button disabled until checked)
- **Step 2:** Profile — Hero Alias (pre-filled) + 9 avatar presets (letter icons)
- **Step 3:** Character Creation — name input + 4 classes with lore + stat bars (Drifter/Engineer/Conduit/Vessel)
- **Step 4:** Welcome — personalized greeting, lore, "Begin Adventure" / "Explore Home Base"
- **Welcome Modal:** Changelog (v2.6.0), "Start Tutorial" / "Got it" — version-tracked, one-time display
- **Tutorial:** 7-step interactive overlay (available via Start Tutorial link)

### 1.3 Game Hub Orientation — DONE (all tabs verified for fresh player)
- **Map:** 3 books listed, Chapter 1 Scene 1-0 available, boss nodes visible, all 0% progress
- **Skills:** 4 skills (Attack active, Magic/Lore/Foraging locked), 6 training actions, terminal aesthetic
- **Home Base:** Achievements 0/110, Relics 0/50, Akashic Log 0.1% (2/2041), 6 sub-tabs
- **Shop:** 6 shard packages ($0.99-$99.99), 2x first-buy bonus, 4 sub-tabs, empty transaction history
- **Ascendant:** Monthly $1.99 / Annual $19.90, loyalty streaks (3-36mo), 7 lifetime titles
- **Chat:** "Disconnected" (expected under auth bypass), message input visible
- **Board:** Not checked (placeholder/future content)

### Bugs Found — Session 1
| # | Description | Severity | Status |
|---|-------------|----------|--------|
| 1 | Vessel class `lore_blurb` has `â€"` instead of em dash (—) — UTF-8 encoding issue in DB | Low | **FIXED** (DB update) |
| 2 | Same encoding issue `â€"` appears in Skills tab training action descriptions | Low | OPEN |
| 3 | Console errors: 9 missing asset batch requests (avatar_vessel, bg_*_far/mid) — expected, sprites not generated | Info | KNOWN (deferred to generators) |
| 4 | Playwright timeouts on game pages — need `waitUntil: 'commit'` instead of `domcontentloaded` | Info | WORKAROUND FOUND |

### Screenshots Captured — Session 1
- `docs/user_manuals/screenshots/01_splash_page_viewport.png` — (captured as game hub due to bypass redirect)
- `docs/user_manuals/screenshots/02_tos_screen.png` — (user-provided screenshot)
- `docs/user_manuals/screenshots/03_game_hub_tutorial.png` — Map view after onboarding
- `docs/user_manuals/screenshots/04_skills_tab_empty.png` — Skills tab, fresh player
- `docs/user_manuals/screenshots/05_home_tab_empty.png` — Home Base, fresh player
- `docs/user_manuals/screenshots/06_shop_tab_empty.png` — Shop with shard packages
- `docs/user_manuals/screenshots/07_ascendant_tab.png` — Subscription page
- `docs/user_manuals/screenshots/08_chat_tab.png` — Chat (disconnected)

---

## Plan Overview

| Session | Focus | Est. Duration | Status |
|---------|-------|---------------|--------|
| **1** | Setup, DB Dump/Restore, Onboarding Flow | Medium | **COMPLETE** |
| **2** | Story Mode — Chapters 1-3 + Idle Training | Long | **IN PROGRESS** |
| **3** | Story Mode — Chapters 4-5, Boss Fights, Farm Mode | Long | NOT STARTED |
| **4** | Admin Flows — Player Editing, XP/Item Grants, Live Loop | Medium | PARTIALLY DONE (progression advance tested) |
| **5** | Economy — Shards, Shop, Marketplace (2 players), Stripe | Long | NOT STARTED |
| **6** | Home Base Hub, Achievements, Leaderboards, Chat | Medium | NOT STARTED |
| **7** | Audio, Settings, Accessibility, Banner Progression | Medium | NOT STARTED |
| **8** | Admin Content — World Builder, Configs, Finance Dashboard | Medium | NOT STARTED |
| **9** | Edge Cases, Bug Bash, Final Sweep | Medium | NOT STARTED |
| **10** | User Manual (End User) — Compile & Write | Long | NOT STARTED |
| **11** | Admin Manual — Compile & Write | Long | NOT STARTED |

---

## Session 1: Setup, DB Dump/Restore, Onboarding Flow

### Goals
- Verify Docker dev stack comes up cleanly
- Test DB dump/restore tooling (take baseline, restore, verify)
- Walk through full onboarding as a brand new player
- Document every screen for user manual

### Steps
- [ ] **1.0 — Docker Stack Launch**
  - `docker-compose up --build -d` from project root
  - Verify all 3 services healthy (backend `:8000/health`, frontend `:5173`, admin `:5174`)
  - Check DB connectivity

- [ ] **1.1 — DB Baseline Dump**
  - Take fresh dump: `python tools/db_dump_restore.py dump`
  - Note dump file path and size
  - Test restore: `python tools/db_dump_restore.py restore <file>`
  - Verify data integrity post-restore (spot check a few tables)
  - **OUTPUT:** Confirmed dump/restore works. Dump file path recorded.

- [ ] **1.2 — Onboarding Flow (New Player)**
  - Navigate to `http://localhost:5173/`
  - **Splash Page:** Screenshot, verify CTA buttons, footer links, login button
  - **About Page:** Navigate, verify content loads
  - **Terms/Privacy/License:** Navigate each, verify content
  - **Auth (Bypass Mode):** Create a new test player via auth bypass
  - **Character Creation:** Walk through CharacterCreator — pick class, name, avatar
  - **Onboarding Modal:** Verify welcome/tutorial prompts appear
  - **Tutorial Overlay:** Step through all 7 coach-mark steps (if triggered)
  - **First Landing in Game Hub:** Verify Map tab loads, sidebar visible, TopBar shows character
  - **OUTPUT:** Detailed notes for user manual Chapter 1 (Getting Started)

- [ ] **1.3 — Initial Game Hub Orientation**
  - Click through each sidebar tab (Map, Skills, Home, Shop, Ascendant, Chat)
  - Note what's visible/accessible for a brand new player with no progression
  - Verify empty states render correctly (no achievements, no artifacts, no listings)
  - **OUTPUT:** Notes for user manual — Game Hub overview

### Session 1 Checkpoint
- Player A created: _(record name, ID, class)_
- DB dump verified: _(path)_
- Bugs found: _(list)_
- Screenshots taken: _(count)_

---

## Session 2: Story Mode — Chapters 1-3 + Idle Training

### Goals
- Play through first 3 story scenes/chapters as a real player
- Test narrative block (WPM-timed text), combat (clicking + waves), upgrades
- Start idle training between chapters (like a real player would)
- Verify banner enemy count/variety at early game

### Steps
- [ ] **2.0 — Enter Story Mode**
  - Open Map tab → select first available scene in Chapter 1
  - Verify scene loads: narrative text, combat stage, skills hotbar, upgrade menu
  - **NOTE:** Record what enemies appear, their visual types, any dev_content_audit entries

- [ ] **2.1 — Chapter 1 Playthrough**
  - Read narrative text (verify WPM-timed reveal works)
  - Click to deal damage, buy upgrades with session gold
  - Level up skills via hotbar
  - Complete all waves → verify dual-condition gate (narrative 100% + waves complete)
  - Post-Battle Summary: verify loot display, continue/exit options
  - Test "Continue" (farm mode) — stay for a few extra waves, then exit
  - **OUTPUT:** Notes on combat feel, timing, any UI issues

- [ ] **2.2 — Idle Training Start**
  - Navigate to Skills tab
  - Start training a skill (pick first available)
  - Note the estimated time, current level, XP rate
  - Return to Map — start Chapter 1 Scene 2 (training should continue in background)
  - **OUTPUT:** Verify training ticks while in Story Mode

- [ ] **2.3 — Chapters 2-3 Playthrough**
  - Play through remaining scenes in Chapters 1-3
  - Monitor: upgrade progression, gold scaling, enemy variety
  - Check idle training progress between scenes
  - Switch idle training skill after one levels up (if it does)
  - **OUTPUT:** Notes on progression feel, any difficulty spikes/valleys

- [ ] **2.4 — Banner Observation (Early Game)**
  - While in Story Mode, observe BottomAnimatedBanner
  - Note: how many enemies visible, what types, any attack animations
  - Compare to what enemies were fought in combat
  - **FLAG:** Note if attack animations are differentiated (flying, magic projectiles, etc.)
  - **OUTPUT:** Banner status at Chapter 3 progression point

### Session 2 Checkpoint
- Chapters completed: _(list)_
- Idle skill training: _(skill name, starting level → current level)_
- Gold earned total: _(approx)_
- Banner enemies visible: _(count, types)_
- Bugs found: _(list)_

---

## Session 3: Story Mode — Chapters 4-5, Boss Fights, Farm Mode

### Goals
- Complete Chapters 4-5, encounter chapter boss(es)
- Test boss fight mechanics (timer, interrupt types: click_burst, target_zone, whack_sequence)
- Test farm mode extensively (stay on a scene, grind gold)
- Verify NarrativeReveal (post-boss cinematic)
- Test Dark Ritual persistence across scenes

### Steps
- [ ] **3.0 — Chapter 4 Playthrough**
  - Continue from where Session 2 left off
  - Play through all scenes in Chapter 4
  - Monitor auto-DPS progression (should be noticeably stronger if idle training ran)

- [ ] **3.1 — Chapter Boss Encounter**
  - Identify which chapter has a boss (check map for boss nodes)
  - If no boss yet, use Admin to advance to a chapter with a boss
  - **Boss Fight Test:**
    - Verify boss entity renders (large, 60px radius)
    - Verify countdown timer appears
    - Test all 3 interrupt types (if they trigger):
      - `click_burst` — rapid click progress bar
      - `target_zone` — click glowing circle at random position
      - `whack_sequence` — 3 sequential pop-up zones
    - Verify auto-DPS ticks during boss
  - **Post-Boss:**
    - NarrativeReveal overlay (staged: backdrop → title → lore → button)
    - Transition lore text displays correctly
    - Boss completion recorded (check boss_completions)
  - **OUTPUT:** Detailed boss fight notes for user manual

- [ ] **3.2 — Farm Mode Extended Test**
  - After completing a scene, choose "Continue" to farm
  - Stay for 10+ extra waves
  - Verify: gold keeps flowing, enemies keep spawning, no timer/gate issues
  - Test exit from farm mode → return to hub → verify map shows completed
  - **OUTPUT:** Farm mode notes for user manual

- [ ] **3.3 — Chapter 5 + Dark Ritual**
  - Play through Chapter 5
  - Verify Dark Ritual multiplier persists across scenes within the chapter
  - Note multiplier value at chapter end
  - **OUTPUT:** Dark Ritual notes

- [ ] **3.4 — Banner Observation (Mid Game)**
  - Compare banner to Session 2 observations
  - More enemies? Different types? More visual variety?
  - **OUTPUT:** Banner progression comparison

### Session 3 Checkpoint
- Chapters completed: _(through Ch5)_
- Boss fights completed: _(list, which interrupt types seen)_
- Farm mode tested: _(duration, gold earned)_
- Dark Ritual multiplier: _(value at end)_
- Idle training progress: _(skill levels)_
- Bugs found: _(list)_

---

## Session 4: Admin Flows — Player Editing, XP/Item Grants, Live Loop

### Goals
- Test admin panel as a content manager/support agent
- Live loop: admin edits → player sees changes in real-time
- Create Player B (secondary) for marketplace testing in Session 5
- Test DB restore to baseline (verify we can reset)

### Steps
- [ ] **4.0 — Admin Login & Dashboard**
  - Navigate to `http://localhost:5174/`
  - Login as admin (E2ETestBot or equivalent)
  - Verify dashboard: stats, charts, activity feed, quick actions
  - **OUTPUT:** Admin dashboard notes for admin manual

- [ ] **4.1 — Player Management**
  - Navigate to Players → find Player A
  - View Player Detail page — verify all tabs render (stats, inventory, activity, finance)
  - **Live Loop — XP Grant:**
    - Admin: grant character XP to Player A
    - Switch to frontend (Player A) → verify level/XP updated
    - Repeat for essence grant
  - **Live Loop — Skill Edit:**
    - Admin: boost idle training skill level
    - Switch to frontend → verify skill level reflects change
  - **Live Loop — Item Grant:**
    - Admin: use Item Crafting Tool to create an item for Player A
    - Switch to frontend → verify item appears in inventory
  - **OUTPUT:** Admin player editing notes for admin manual

- [ ] **4.2 — Create Player B**
  - Use auth bypass to create a second test player
  - Record Player B name, ID, class
  - Admin: grant Player B some shards (for marketplace testing in Session 5)
  - Admin: grant Player B some items/artifacts (for listing on marketplace)

- [ ] **4.3 — Support & Moderation**
  - Test support ticket flow: Player A submits ticket → Admin sees it → Admin replies → Player sees reply
  - Test ban/unban: Admin bans Player B → verify Player B sees ban state → Admin unbans
  - Test chat moderation (if WebSocket works in Docker): mute/unmute a player
  - **OUTPUT:** Support/moderation notes for admin manual

- [ ] **4.4 — Progression Editing**
  - Admin: set Player A to last scene in a later chapter (to test boss skip)
  - Verify frontend map shows the correct unlocked state
  - Admin: reset boss completion → verify player can re-fight boss
  - **OUTPUT:** Progression editing notes

### Session 4 Checkpoint
- Player B created: _(name, ID, class)_
- Live loop verified: _(XP, skills, items — all reflected)_
- Support ticket flow: _(pass/fail)_
- Ban/unban flow: _(pass/fail)_
- Bugs found: _(list)_

---

## Session 5: Economy — Shards, Shop, Marketplace, Stripe

### Goals
- Full economy loop with 2 players
- Test Stripe test-mode checkout (shard purchasing, subscription, donation)
- Marketplace: Player A lists → Player B buys (and vice versa)
- NPC Vendor salvage
- Emporium cosmetics/boosters

### Steps
- [ ] **5.0 — Shard Purchasing (Stripe Test Mode)**
  - Player A → Shop → Buy Shards tab
  - Select a shard package → proceed to Stripe Checkout
  - Use test card `4242 4242 4242 4242` → complete purchase
  - Verify shards credited, transaction appears in history
  - Test payment status polling (should resolve quickly in test mode)
  - **OUTPUT:** Shard purchasing notes for user manual

- [ ] **5.1 — Subscription (Stripe Test Mode)**
  - Player A → Ascendant tab
  - Subscribe to monthly plan via Stripe test-mode
  - Verify subscription active, boosts applied (XP, essence, drop rate, training speed)
  - Check boost indicators in TopBar
  - **OUTPUT:** Subscription notes for user manual

- [ ] **5.2 — Emporium (Shop)**
  - Browse cosmetics catalog (skins, flair, badges, avatars)
  - Buy a booster with shards → verify time-limited buff applied
  - Browse bundles → check discount pricing
  - **OUTPUT:** Emporium notes for user manual

- [ ] **5.3 — Marketplace: Player A → Player B**
  - **Player A:** List an artifact/item on marketplace (set price in shards)
  - **Player B:** Browse marketplace → find Player A's listing → purchase
  - Verify: shards transferred (minus 5% tax), item transferred, trade history updated
  - Verify trade notification appears for Player A (item sold)

- [ ] **5.4 — Marketplace: Player B → Player A**
  - **Player B:** List an item → **Player A:** buys it
  - Verify reverse flow works identically
  - **OUTPUT:** Marketplace notes for user manual

- [ ] **5.5 — NPC Vendor Salvage**
  - Player A → Marketplace → NPC Vendor
  - Salvage a non-essential item → verify essence received
  - Test bulk salvage if multiple items available
  - Test double-confirm for curated artifacts
  - **OUTPUT:** Salvage notes for user manual

- [ ] **5.6 — Donations (Stripe Test Mode)**
  - Player A → Shop → Support Us tab
  - Make a donation via Stripe test mode
  - Verify patron tier updates, donation appears in Donor Hall
  - **OUTPUT:** Donation notes for user manual

- [ ] **5.7 — Admin Finance Verification**
  - Switch to Admin → Finance Dashboard
  - Verify: transactions visible, revenue chart populated, subscription shows
  - Check shard economy tab, marketplace tab
  - **OUTPUT:** Finance dashboard notes for admin manual

### Session 5 Checkpoint
- Stripe transactions completed: _(count, types)_
- Marketplace trades: _(count, both directions)_
- Salvage tested: _(pass/fail)_
- Subscription active: _(plan, boosts visible)_
- Bugs found: _(list)_

---

## Session 6: Home Base Hub, Achievements, Leaderboards, Chat

### Goals
- Test all Home Base Hub sub-tabs with actual progression data
- Check achievement triggers after 5 chapters of play
- Leaderboard verification
- Chat (if WebSocket works in Docker)

### Steps
- [ ] **6.0 — Akashic Log (Journal)**
  - Home → Akashic Log tab
  - Verify chapter hierarchy shows completed chapters
  - Test keyword search
  - Check narrative completion percentage
  - Verify "New" badges on recently unlocked story beats
  - **OUTPUT:** Akashic Log notes for user manual

- [ ] **6.1 — Relic Gallery (Artifacts)**
  - Home → Relic Gallery tab
  - Verify artifacts collected during play appear
  - Test filtering, sorting, inspection modal
  - Check silhouettes for undiscovered artifacts
  - **OUTPUT:** Relic Gallery notes for user manual

- [ ] **6.2 — Achievement Matrix**
  - Home → Achievements tab
  - Check which achievements triggered (combat, narrative, economy categories)
  - Verify rewards granted (shards, titles, essence, badges)
  - **OUTPUT:** Achievement notes for user manual

- [ ] **6.3 — Hall of Echoes (Leaderboards)**
  - Home → Leaderboard tab
  - Verify Player A appears on relevant boards
  - Check rank cards, badge tiers
  - **OUTPUT:** Leaderboard notes for user manual

- [ ] **6.4 — Inventory Panel**
  - Home → Inventory
  - Verify equipped items, stats reflected in character
  - Equip/swap items → verify stat changes
  - **OUTPUT:** Inventory notes for user manual

- [ ] **6.5 — Chat System**
  - Navigate to Chat tab
  - Attempt to send a message (may not work if WebSocket disconnected under bypass)
  - If it works: test profanity filter, rate limiting
  - **OUTPUT:** Chat notes (or note limitations under auth bypass)

### Session 6 Checkpoint
- Hub tabs verified: _(list)_
- Achievements triggered: _(count, categories)_
- Leaderboard entries: _(Player A rank)_
- Chat status: _(working/not working under bypass)_
- Bugs found: _(list)_

---

## Session 7: Audio, Settings, Accessibility, Banner Progression

### Goals
- Test audio system (music manager, SFX, volume controls)
- Test all settings (audio, reduce motion, profile)
- Banner progression comparison across game states
- Note attack animation differentiation (or lack thereof → TODO item)

### Steps
- [ ] **7.0 — Audio Settings**
  - Open AudioSettingsModal from TopBar
  - Test Master/Music/SFX volume sliders
  - Test global mute toggle
  - Verify settings persist (change, refresh, check again)
  - **OUTPUT:** Audio settings notes for user manual

- [ ] **7.1 — Music Manager (In-Game)**
  - Enter a story scene → verify music plays
  - Listen for state transitions: explore → combat → boss (if applicable)
  - Verify 2s cross-fade on state change
  - Test music during idle training (if active click mode)
  - Mute → unmute → verify music resumes
  - **OUTPUT:** Music notes for user manual

- [ ] **7.2 — SFX System**
  - In combat: listen for click SFX, crit SFX, enemy death SFX, skill SFX
  - Verify spatial panning (left/right based on entity position)
  - Level-up SFX, item drop SFX
  - **OUTPUT:** SFX notes

- [ ] **7.3 — Reduce Motion / Accessibility**
  - Enable Reduce Motion in settings
  - Verify animations suppressed (CSS + JS)
  - Re-enable → verify animations resume
  - **OUTPUT:** Accessibility notes for user manual

- [ ] **7.4 — Banner Progression Deep Dive**
  - With 5 chapters completed, observe BottomAnimatedBanner
  - Count visible enemies, note variety of types
  - **KEY CHECK:** Are attack animations differentiated?
    - Flying entities → flying animation?
    - Magic entities → magic projectiles?
    - Melee entities → melee swings?
  - If NOT differentiated → flag for TODO (new feature: visual attack type differentiation)
  - Compare to Session 2 (Ch3) and Session 3 (Ch5) observations
  - **OUTPUT:** Banner progression report + TODO items if needed

- [ ] **7.5 — Profile & Settings**
  - Navigate to Profile page
  - Test alias editing
  - Test avatar change (if presets available)
  - Verify character stats display
  - **OUTPUT:** Profile notes for user manual

### Session 7 Checkpoint
- Audio working: _(music/SFX status)_
- Reduce motion: _(pass/fail)_
- Banner attack differentiation: _(yes/no → TODO if no)_
- Banner enemy count at Ch5: _(count)_
- Bugs found: _(list)_

---

## Session 8: Admin Content — World Builder, Configs, Finance

### Goals
- Deep-dive admin content management tools
- Test editing content and verifying player sees changes
- Document all admin screens for admin manual

### Steps
- [ ] **8.0 — World Builder**
  - Navigate through all 4 tabs (Narrative, Content, Classification, Scaling)
  - Edit a scene's wave config → verify change reflects in player Story Mode
  - Edit an entity's stats → verify change in combat
  - Browse sub-tabs: Books, Chapters, Scenes, Entities, Story Beats, Backgrounds, etc.
  - **OUTPUT:** World Builder notes for admin manual

- [ ] **8.1 — Atmosphere & SFX Editors**
  - Browse atmospheres (21 total) → test Web Audio preview
  - Edit an atmosphere → verify music change in Story Mode
  - Browse SFX presets → test Play action
  - **OUTPUT:** Audio admin notes for admin manual

- [ ] **8.2 — Game Configs**
  - Browse all 141+ configs across category tabs
  - Edit a config value (e.g., scaling factor) → verify effect in gameplay
  - Test search functionality
  - **OUTPUT:** Game Configs notes for admin manual

- [ ] **8.3 — Artifacts & Achievements**
  - Browse curated artifacts (50) → test source filters
  - Browse achievements (90+) → test category filters
  - Test achievement analytics
  - **OUTPUT:** Artifacts/Achievements admin notes

- [ ] **8.4 — Asset Registry**
  - Browse 196+ assets → test category filters, search, pagination
  - Test Orphan Detection
  - **OUTPUT:** Asset Registry notes for admin manual

- [ ] **8.5 — Dev Audit & Audit Log**
  - Check Dev Audit for open issues
  - Browse Audit Log → verify admin actions from Sessions 4-5 appear
  - **OUTPUT:** Audit notes for admin manual

- [ ] **8.6 — Server Config**
  - Test maintenance mode toggle (careful — will block player access)
  - Test announcement banner (set message → verify player sees it → clear)
  - **OUTPUT:** Server config notes for admin manual

### Session 8 Checkpoint
- Admin pages tested: _(count)_
- Content edits verified in player view: _(list)_
- Bugs found: _(list)_

---

## Session 9: Edge Cases, Bug Bash, Final Sweep

### Goals
- Revisit any bugs found in Sessions 1-8
- Test edge cases identified during play
- Verify DB dump/restore still works with all the new data
- Final sweep of all features

### Steps
- [ ] **9.0 — Bug Verification**
  - Re-test all bugs found and fixed during Sessions 1-8
  - Verify fixes hold

- [ ] **9.1 — Edge Cases**
  - New player with no progression viewing all Hub tabs (empty states)
  - Player with maxed-out skill trying to train further
  - Marketplace listing with 0 buyers (expiry)
  - Multiple rapid clicks during boss interrupt phases
  - Tab switching during active combat (does session persist?)
  - Browser refresh during Story Mode (can player resume?)
  - Offline/online toggle during gameplay

- [ ] **9.2 — DB Dump/Restore Final Test**
  - Take dump with all Session 1-8 data
  - Restore to baseline dump from Session 1
  - Verify clean state
  - Restore to latest dump → verify all data intact

- [ ] **9.3 — Final Feature Sweep**
  - Quick pass through every frontend route
  - Quick pass through every admin route
  - Note any final issues

### Session 9 Checkpoint
- Total bugs found across all sessions: _(count)_
- Total bugs fixed: _(count)_
- Remaining issues: _(list)_

---

## Sessions 10-11: User Manuals

### Session 10 — End User Manual (`docs/user_manuals/end_user/`)
- [ ] **10.0** — Chapter 1: Getting Started (onboarding, auth, character creation)
- [ ] **10.1** — Chapter 2: The Game Hub (map, sidebar, navigation)
- [ ] **10.2** — Chapter 3: Story Mode (combat, narrative, upgrades, farm mode)
- [ ] **10.3** — Chapter 4: Boss Fights (mechanics, interrupts, rewards)
- [ ] **10.4** — Chapter 5: Idle Training (skill training, passive progression)
- [ ] **10.5** — Chapter 6: Home Base (journal, artifacts, achievements, leaderboard)
- [ ] **10.6** — Chapter 7: Economy (shop, shards, marketplace, donations)
- [ ] **10.7** — Chapter 8: Social (chat, titles, patron status)
- [ ] **10.8** — Chapter 9: Settings & Accessibility (audio, motion, profile)
- [ ] **10.9** — Chapter 10: FAQ & Troubleshooting

### Session 11 — Admin Manual (`docs/user_manuals/admin/`)
- [ ] **11.0** — Chapter 1: Dashboard & Overview
- [ ] **11.1** — Chapter 2: Player Management (search, edit, support, ban)
- [ ] **11.2** — Chapter 3: World Builder (narrative, content, classification, scaling)
- [ ] **11.3** — Chapter 4: Game Tuning (configs, drop rates, skill balance, economy)
- [ ] **11.4** — Chapter 5: Audio Management (atmospheres, SFX)
- [ ] **11.5** — Chapter 6: Finance (transactions, subscriptions, marketplace, disputes)
- [ ] **11.6** — Chapter 7: System Administration (server config, audit, access control)
- [ ] **11.7** — Chapter 8: Content Pipeline (assets, dev audit, generators)

---

## Cross-Session Bug Tracker

| # | Session | Description | Severity | Status | Fix Notes |
|---|---------|-------------|----------|--------|-----------|
| | | | | | |

---

## Cross-Session TODO Items (New Features/Improvements Found)

| # | Session | Description | Priority | Added to TODO.md? |
|---|---------|-------------|----------|-------------------|
| 1 | 7 | Banner attack animation differentiation (flying, magic projectiles, melee) | Medium | YES |
| | | | | |

---

## Resume Prompt
Use this prompt to continue in a new session:
```
Read docs/E2E_SESSION_STATE.md and docs/TODO.md to understand current progress.
We are doing End-to-End User Testing. Check the session state for which session we're on
and what's been completed. Docker stack should be running. Auth bypass enabled.
Continue from the current checkpoint.
```
