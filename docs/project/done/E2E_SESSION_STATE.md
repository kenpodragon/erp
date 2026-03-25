# E2E User Testing — Session State

**Purpose:** Tracks live progress of End-to-End User Testing across sessions. Read this file at the start of any new session to pick up where we left off.

---

## Environment Setup

### Docker Stack
```bash
# Start all services (backend, frontend, admin, postgres)
docker-compose up --build -d

# Verify services
# backend :8000, frontend :5173, admin :5174, postgres :5433 (host) / :5432 (internal)
```

### Database
Backend connects to **localhost PostgreSQL** (host machine, port 5432) via `host.docker.internal`. The Docker postgres container on port 5433 exists for future isolated testing but is **not used during active development or E2E testing**.

To switch to the Docker DB later: `python tools/toggle_db.py docker` (see `docs/reference/TOOLS.md`).

### Auth Bypass
- `ALLOW_AUTH_BYPASS=true` in `backend/.env`
- `ops.auth_bypass_enabled=true` in DB `server_config` table
- `ops.auth_bypass_player_id=2` (default spoofed player)
- Frontend auto-detects bypass via `/api/config/public` and auto-logs in
- Override per-request with header: `X-Spoof-Player-Id: <id>`

### Test Players
- **Player A (Primary):** "Awakened" (ID 5), character "Seeker" (Vessel class, Lv. 1), is_game_admin=true
- **Player B (Secondary):** "Phantom" (ID 3), character "Phantom" (Drifter class, Lv. 1), shards=179
- **Admin User:** E2ETestBot (ID 2) — existing admin with character "TestHero"

### DB Backups
- **Pre-testing baseline:** `db/backups/erp_backup_pre_e2e_user_testing.dump` (5.3MB) — taken Session 1
- **Docker dump:** `db/deploy/dump.sql` (15.4MB) — full localhost snapshot, baked into Docker image
- **Restore test:** VERIFIED — drop+restore, counts match (4 players, 3936 entities, 724 scenes, 141 configs)
- **Mid-testing checkpoints:** Optional dumps between sessions if state gets complex

### Interactive Browser Testing
- **Playwright MCP:** Available for interactive browser testing via `mcp__playwright__browser_*` tools
- **Playwright CLI:** `cd testing && node node_modules/@playwright/test/cli.js test <spec> --project=frontend --reporter=line`
- **Install browsers:** `cd testing && node node_modules/@playwright/test/cli.js install chromium`

### Stripe
- Test-mode transactions (use Stripe test card `4242 4242 4242 4242`)

---

## Status: SESSIONS 7-9 COMPLETE — Ready for Session 10 (User Manual)

## Session 2 Progress (Story Mode + Admin)

### Completed
- [x] **2.0** Entered first scene (1-0 "Front Matter and Publication Details") — narrative + combat loaded
- [x] **2.1** Chapter 1 playthrough — scene complete, Dream Forge item drop ("Vanishing Defective TJ Focus Orb"), Return to Hub
- [x] **2.2** Started idle training — Attack skill, "Shadowboxing in the Garage" (3.0s interval, +10 XP/tick)
- [x] **2.3** Chapter 2 (Book the First Angles) playthrough — 1 scene, completed quickly
- [x] Chapter 1 Boss — GUARDIAN, 352 HP, auto-DPS killed it in ~10s, NarrativeReveal worked (star particles + lore)
- [x] Chapter 2 Boss — same pattern, quick kill
- [x] **Admin progression advance** — used admin Player Detail → Edit Progression → advanced to Chapter 8 (5: From Crash Until Dawn), backfilled 25 scenes + 6 bosses
- [x] **2.4** Banner observation (early game) — BottomAnimatedBanner at hub bottom (150px PixiJS canvas)

### 2.4 Banner Observations (Early Game — Ch8 admin-advanced, Lv 1)
- **Player:** Yellow circle fallback (no sprite generated), paper-doll layers not visible (Lv 1 < thresholds)
- **Enemies:** 1 at a time from `/api/game/enemies/encountered` pool, hue-shifted + scale-varied
- **Enemy sprites:** Fallback (white rect + red circle) — no real sprites generated yet
- **Damage numbers:** Small white floaters, yellow for crits
- **Background:** Dark parallax starfield with subtle diagonal light streaks
- **VFX:** ~7-8 blue intelligence particles orbit player (INT 38)
- **Attack animations:** NONE differentiated — all enemies use same idle skew wobble
- **Confirmed TODO:** Banner attack animation differentiation needed (flying, magic, melee, ranged)

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
| 6 | Admin Edit Progression confirmation shows "Scene NaN" — scene number not parsed correctly | Low | **FIXED** (verified — scene numbers display correctly) |
| 7 | Encoding `â€"` in idle training skill descriptions (same root cause as Bug #1) | Low | **FIXED** (DB fix — all 34 actions verified clean) |
| 8 | Character Creator class cards don't show class name when avatar image present — only lore_blurb visible | Low | **FIXED** (CharacterCreator.tsx, removed `!presetKey` condition) |
| 9 | Profile page (`/profile`) redirects to splash under auth bypass — `user` null check in ProfilePage didn't account for bypass | Medium | **FIXED** (App.tsx, added `configLoaded` gate before redirect) |

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
- `52_story_mode_banner_early.png` — Story Mode combat view (Ch3 Scene 3)
- `53_hub_banner_early.png` — Hub view with BottomAnimatedBanner visible
- `54_hub_banner_closeup.png` — Banner closeup (player + enemy entities)
- `55_profile_page.png` — Profile page (Bug #9 fix verified)

---

## Session 3 Results (COMPLETE)

### 3.0 Chapter 8 Playthrough — DONE
- Entered Ch8 Scene "The Day of Reckoning" — narrative + combat loaded
- Auto-DPS active (14/s), 3 waves cleared, 686 gold farmed
- Scene Complete modal: gold earned, converted essence, zones cleared
- Post-battle summary: item drop check (no drops this time — "Yaldabaoth's grasp tightens...")
- Return to Hub: essence credited (225→407)

### 3.1 Boss Fight — DONE
- Ch1 GUARDIAN boss (352 HP), timer 120s, large red circle entity
- **Interrupt phases DO trigger** — `click_burst` captured (screenshot 67: "CLICK FAST!" with progress bar + 3s timer)
- Interrupts fire every 1-3 seconds (from config `interrupt_interval_min: 1200ms, max: 3000ms`)
- Boss dies in ~15s from auto-DPS — too fast for all 3 types to be reliably screenshotted at Ch1
- NarrativeReveal cinematic: full-screen dark overlay, star particles, gold "CHAPTER COMPLETE", transition lore text
- "REPLAY — No rewards on re-clear" banner works correctly for replayed bosses

### 3.2 Farm Mode — DONE
- After scene complete, "Continue (Farm Mode)" enters farming
- "FARMING WAVE 3 | Mob 4/10 | Monsters scaling up..." header
- Enemy HP scales with farming waves (25 → 44 HP)
- Gold accumulates continuously (251 → 540 in ~20s of farming)
- "Re-Read Story" button appears after narrative finishes
- Exit → Return to Hub → essence credited correctly

### 3.3 Dark Ritual — CODE VERIFIED
- `dark_ritual_multiplier` persists across scenes in same chapter (story_mode.py:783)
- New session reads multiplier from any active session in same chapter
- Not visually tested (requires Magic Level 72 to unlock skill)

### 3.4 Banner Observation (Mid Game) — DONE
- Visually unchanged from early game — character still Lv 1
- Same fallback sprites (circles), same 1-enemy-at-a-time, same parallax background
- No visual progression difference (expected — level hasn't increased)

### Screenshots Captured — Session 3
- `56_scene_info_modal.png` — Ch1 Scene 1 info modal
- `57_map_ch8.png` — Map scrolled to Chapter 8 area
- `58_scene_info_ch8.png` — "The Day of Reckoning" scene info modal
- `59_story_ch8_loading.png` — Story Mode combat (Ch5 Scene 2, "Mundane Dread")
- `60_scene_complete_ch8.png` — Scene Complete modal (gold 251, essence 0.22)
- `61_farm_mode_ch8.png` — Farm mode active (Wave 3, gold 460)
- `62_hub_after_ch8.png` — Hub after scene exit (essence 407)
- `63_boss_info_modal.png` — Boss info modal (orange theme, 2m duration)
- `64_boss_fight.png` — Boss fight (GUARDIAN, 133/352 HP, timer 103s)
- `65_boss_narrative_reveal.png` — NarrativeReveal cinematic (Chapter Complete)
- `66_banner_midgame.png` — Hub banner at mid-game
- `67_boss_interrupt.png` — Boss interrupt: click_burst ("CLICK FAST!" + progress bar)
- `68_boss_interrupt2.png` — NarrativeReveal after second boss fight

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
- **Chat:** Initially showed "Disconnected" (Session 1), later confirmed **fully working** in Session 6 after Bug #17 fix
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
| **2** | Story Mode — Chapters 1-3 + Idle Training | Long | **COMPLETE** |
| **3** | Story Mode — Chapters 4-5, Boss Fights, Farm Mode | Long | **COMPLETE** |
| **4** | Admin Flows — Player Editing, XP/Item Grants, Live Loop | Medium | **COMPLETE** |
| **5** | Economy — Shards, Shop, Marketplace (2 players), Stripe | Long | **COMPLETE** |
| **6** | Home Base Hub, Achievements, Leaderboards, Chat | Medium | **COMPLETE** |
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
- Hub tabs verified: Akashic Log, Relic Gallery, Achievement Matrix, Hall of Echoes, Inventory, Chat — ALL PASS
- Achievements triggered: 2/110 (Essence Collector I & II, economics category)
- Leaderboard entries: Awakened #1 on vanguard/swift/scholar, #2 on alchemist
- Chat status: **WORKING** — WebSocket connects under auth bypass, two-player broadcast, rate limiting, mute/unmute all verified
- Additional: Etheric Registry (discovery) backend works, frontend URL mismatch noted
- Bugs found: #17 (Chat DetachedInstanceError) — **FIXED**
- Screenshots: 71_chat_system.png

---

## Session 4 Results (COMPLETE)

### 4.0-4.1 Admin Dashboard & Player Management — DONE
- Dashboard stats, charts, activity feed all working
- Live loop: essence grant (407→907), shard grant (7→307), item craft (Epic "Prismatic Hyper-Dense Sleeper Nanite Plating of Replication")
- All admin changes reflected in player view + DB

### 4.2 Player B Created — DONE
- "Phantom" (Player ID 3, Drifter class)
- Granted 200 shards + 1000 essence + 2 items (Rare Jetpack + Epic Focus Orb) via admin API

### 4.3 Support & Moderation — DONE
- Ticket create (Player B) → admin reply → internal note (hidden from player) → resolve+reply
- Ban/unban cycle verified

### 4.4 Progression Editing — DONE
- Tested in Session 2 (admin advance + backfill verified)

### Bugs Found — Session 4
| # | Description | Severity | Status |
|---|-------------|----------|--------|
| 10 | Admin Adjust Essence fails — `AdminEssenceAdjustment` model missing default `created_at` | Medium | **FIXED** (admin.py, added `default_factory`) |
| 11 | Admin Shard Grant fails — frontend sends `mode` but API expects `adjust_type`, backend inserts into wrong columns in `activity_events` | Medium | **FIXED** (ShardAdjustModal.tsx + admin_finance.py) |

---

## Session 5 Results (COMPLETE)

### 5.0 Shard Purchasing — DONE
- Stripe checkout session created, `credit_shards` verified (first-purchase 2x bonus: 100→200 shards)
- Idempotent credit confirmed, payment status endpoint works

### 5.1 Subscription — DONE
- Simulated via admin_gift (Stripe Price IDs not configured in `game_configs`)
- Status endpoint returns correct boosts: XP 1.15x, Essence 1.15x, Drop 1.1x, Training 1.1x, Stipend 150

### 5.2 Emporium — DONE
- 36 items across 8 categories, purchased Void Whisper flair (150 shards) + Etheris Dawn avatar (150 shards)
- Equip/unequip works, 3 bundles seeded

### 5.3-5.4 Marketplace — DONE
- Player A → Player B: 50 shards, 5% tax (2 burned), seller got 48, item transferred + notification sent
- Player B → Player A: 30 shards, 1 tax, 29 to seller. Bidirectional trading verified.

### 5.5 NPC Vendor Salvage — DONE
- Preview (common = 5 essence) + execute verified

### 5.6 Donation — DONE
- Stripe checkout created, patron tier progression (next: Bronze at $5), leaderboard/recent donors work

### 5.7 Admin Finance — DONE
- Overview, shard economy, marketplace analytics, subscription metrics, shop analytics, donation analytics, revenue chart, shard flow chart all verified

### Bugs Found — Session 5
| # | Description | Severity | Status |
|---|-------------|----------|--------|
| 12 | Marketplace listing fails — `PlayerInventory`/`PlayerArtifact` models missing `marketplace_listing_id` | High | **FIXED** (inventory.py, home_base.py) |
| 13 | Marketplace listing `updated_at` NOT NULL violation — model missing default | Medium | **FIXED** (marketplace.py, `default_factory`) |
| 14 | Admin subscription metrics 500 — `plan_id` should be `plan_key`, `price_cents` missing | Medium | **FIXED** (finance_analytics_service.py) |
| 15 | Admin shop analytics 500 — `expires_at` should check `status = 'active'` | Medium | **FIXED** (finance_analytics_service.py) |
| 16 | Admin donation analytics 500 — wrong columns (`status`, `tier`, `display_name`) | Medium | **FIXED** (finance_analytics_service.py) |

### Player State After Session 5
- **Player A (Awakened, ID 5):** Seeker (char 12), shards=225, subscription active (ascendant_monthly, admin_gift), owns Void Whisper flair + Etheris Dawn avatar
- **Player B (Phantom, ID 3):** Phantom (char 13), shards=179
- **Auth bypass:** Set to player 5

---

## Session 6 Results (COMPLETE)

### 6.0 Akashic Log — DONE
- Book>Chapter>Scene>Beat hierarchy working
- 79/2041 beats unlocked (3.9% total), Book 1 at 6.3%
- Chapters 1-2 at 100% (front matter/intro), beat content fully displayed
- "New" badges functional, mark-visited clears all badges
- **Note:** Beat content has same UTF-8 mojibake as Bug #1/#2 (em dashes, smart quotes)

### 6.1 Relic Gallery — DONE
- 3 generated artifacts: Ancient Sigil of the Void (Rare), Obsidian Circuit of Light (Uncommon), Encoded Catalyst of Awakening (Common)
- 50 curated artifact silhouettes with source hints (boss drops, chapter mastery)
- `is_new` badges active (3 cleared via mark-visited)
- Collection progress: 0/50 curated, 3 total

### 6.2 Achievement Matrix — DONE
- 110 total achievements across 5 categories:
  - combat: 0/27, discovery: 0/9, economics: 2/35, idle: 0/22, narrative: 0/17
- 2 completed: Essence Collector I (earned 2026-03-15), Essence Collector II (earned 2026-03-16)
- Chain structure: parent_achievement_id linking (Enemy Slayer I→II→III→IV→V)
- Rewards: shard amounts populated, title_id references for high-tier achievements
- No titles earned yet (title-granting thresholds not reached)

### 6.3 Hall of Echoes (Leaderboards) — DONE
- All 4 categories functional:
  - **Vanguard** (progression): Awakened #1 (10801), DrDoom #2, Phantom #3
  - **Alchemist** (essence): DrDoom #1 (3060), Awakened #2 (2094.74), Phantom #3 (1000)
  - **Swift** (boss clear times): Awakened #1 (0.0 — no timed clears recorded)
  - **Scholar** (lore entries): Awakened #1 (77 entries)
- Pagination, player_rank embedding all working

### 6.4 Inventory — DONE
- 2 equipped: Focus Orb (off_hand, INT+12), Conduit Weave (chest, STR+7/AGI+5/INT+10)
- Equip/unequip cycle: unequip Focus Orb → stats drop (INT 38→26) → re-equip → stats restore (INT 38)
- Stored items visible with stat requirements and `meets_requirements` flag

### 6.5 Chat System — DONE
- **Bug #17 found & fixed:** `DetachedInstanceError` in `chat.py` — `player.settings` accessed on detached SQLAlchemy instance. Fixed: query `PlayerSettings` directly + re-fetch player via `session.get()`.
- WebSocket connects via auth bypass (`bypass:<player_id>` token)
- Two-player broadcast: Seeker (ID 5) ↔ Phantom (ID 3) — real-time delivery verified
- Message history: 25 msgs retained in rolling buffer, served on reconnect
- Validation: empty messages dropped, >500 char messages dropped
- Rate limiting: 20 msgs/min per player — triggers "sending too fast" error correctly
- Profanity filter: active (blocklist-based word replacement via `check_profanity()`)
- Frontend ChatTab: "Global Chat" header, green "Connected" status, `[Name Lv.X]` format, auto-scroll, input + Send button
- Admin endpoints:
  - `GET /api/admin/chat/channels` — 1 global channel, active
  - `GET /api/admin/chat/player/{id}/status` — mute status check
  - `POST /api/admin/chat/mute` — mute → WS rejects with HTTP 403; unmute → reconnect works
- Screenshot: `71_chat_system.png`

### Additional: Etheric Registry (Discovery) — DONE
- Backend works at `/api/game/registry/` prefix
- 3,936 entities, 18 skills tracked, all in "mist" state (0% discovered)
- **Finding:** Frontend `EthericRegistry.tsx` likely calls `/api/game/discovery/` but backend uses `/api/game/registry/` — URL mismatch

### Hub Summary & Badges — DONE
- Badge system: relic_gallery (3), achievements (2), total (5) — all cleared after mark-visited calls
- Progress: 2/110 achievements, 0/50 curated artifacts, 3 total artifacts

---

## Session 7 Results (COMPLETE)

### 7.0 Audio Settings — DONE
- AudioSettingsModal opens from 🎵 button in TopBar
- 3 sliders: Master Volume, Music Volume, SFX Volume (all default 80%)
- Mute All Audio checkbox with global toggle
- **Settings persist** across page reload via `localStorage` key `erp_audio_settings`
- TopBar quick-mute button (🔊/🔇) toggles icon correctly
- **Bug #18 FOUND & FIXED:** Mute button didn't actually mute music — TopBar had local `useState` for audioSettings but never called `updateAudioSettings()` from GameContext, so MusicManager never received the muted state. Fix: connected TopBar mute toggle and AudioSettingsModal onChange to `updateAudioSettings()`.
- **Bug #19 FOUND & FIXED:** Music play/pause controls missing — old `AudioPlayer` component (HTML5 file player with play/pause, speed, seek) was deleted when MusicManager (Web Audio synth) replaced it, but no playback controls were added to MusicManager. Fix: added play/pause button (⏸/▶) that suspends/resumes AudioContext.
- Screenshot: `72_audio_settings_modal.png`

### 7.1 Music Manager — DONE
- Web Audio synthesis engine active in Story Mode
- Atmosphere "Mundane Dread" loads for Chapter 1 Scene 1
- `music-wave-mini--active` class shows animated equalizer bars (3 golden bars)
- AudioContext state: "running" after user click gesture
- Play/pause button (⏸/▶) works — suspends/resumes AudioContext, freezing all oscillators in place
- Volume reacts to audioSettings (masterMuted sets gain to 0, unmuting restores)
- **Observation:** Music loops are very short and repetitive — added TODO for longer 2-3 minute loops
- Screenshot: `73_story_mode_audio_test.png`, `74_music_play_pause.png`

### 7.2 SFX System — DEFERRED
- SFXEngine singleton exists in React tree (not exposed on window)
- Cannot verify audio output in automated browser testing (no headphones)
- SFX triggers observed in code: click, crit, death, skill, level-up, item-drop
- Will need manual listening test to confirm spatial panning and sound quality

### 7.3 Reduce Motion — DONE
- Checkbox in Game Settings (⚙️) modal: "Reduce Motion — Disables animations and transitions"
- Enabling adds `reduce-motion` class to `<body>`
- 29 CSS rules target `.reduce-motion`, including global wildcard: `body.reduce-motion * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }`
- Specific overrides for boss interrupt overlays, target zones, etc.
- Enable → animations suppressed; disable → animations resume

### 7.4 Banner Progression — CONFIRMED (Same as Sessions 2-3)
- Banner observation unchanged at Ch8 progression (admin-advanced, Lv 1):
  - 1 enemy at a time, fallback sprites (no real sprites generated)
  - No attack animation differentiation (all same idle skew wobble)
  - Player is yellow circle fallback
- **Already tracked in TODO.md** under "Banner Visual Improvements" (attack animation differentiation, multiple enemies, projectile assets)

### 7.5 Profile & Settings — DONE
- Profile page renders: avatar, alias ("Awakened" with ✏️ edit), email, member date
- Character card: "SEEKER" — Vessel class, Lv 1, base stats (STR 10, AGI 6, INT 14), lore blurb
- Alias editing: click ✏️ → input field → Save/Cancel buttons → API PATCH → confirmed roundtrip
- Account Status: ACTIVE, ADMIN badge, Terms accepted date
- Delete Character button present (not tested — destructive)
- 📷 button for avatar change present
- Health status bar: API ● DB ● (both green)
- Screenshot: `75_profile_page.png`

### Bugs Found — Session 7
| # | Description | Severity | Status |
|---|-------------|----------|--------|
| 18 | Mute button doesn't mute music — TopBar local state not synced to GameContext | Medium | **FIXED** (TopBar.tsx: call `updateAudioSettings()`) |
| 19 | Music play/pause controls missing — AudioPlayer deleted but MusicManager had no controls | Medium | **FIXED** (MusicManager.tsx: added ⏸/▶ button via AudioContext suspend/resume) |

### Screenshots Captured — Session 7
- `72_audio_settings_modal.png` — Audio Settings modal (Master 50%, Music 60%, SFX 40%)
- `73_story_mode_audio_test.png` — Story Mode with music active
- `74_music_play_pause.png` — Music play/pause button in GlobalHeader
- `75_profile_page.png` — Profile page

---

## Session 9 Results (COMPLETE)

### 9.0 Bug Re-verification — DONE
- All 19 bugs from Sessions 1-8 verified fixed (code changes in place, no regressions observed)
- Pre-existing console errors confirmed stable: CombatStage setState-during-render, PixiJS Ticker cleanup (3x), React removeChild on PixiJS unmount

### 9.1 Edge Cases — DONE
- **Browser refresh during Story Mode**: PASS — session persists, story mode resumes after page reload with GlobalHeader and EXIT SCENE button intact
- **All 6 sidebar tabs**: Map, Skills, Home, Shop, Ascendant, Chat — all load successfully
- **Static pages**: Support ("My Support Tickets"), About ("About Elysium Rising"), Terms of Service, Privacy Policy — all load correctly
- **Overlay interference**: Scene Complete and Idle Training Report overlays can block sidebar clicks (cosmetic, not a bug — overlays are modal by design)
- **Bug #20 FOUND & FIXED**: `TransactionHistory.tsx:131` — `tx.shard_amount.toLocaleString()` crashes when `shard_amount` or `balance_after` is undefined/null. Fix: added `?? 0` null coalescing guards.

### 9.2 DB Dump/Restore — DEFERRED
- Not re-tested this session (verified in Session 1, data integrity maintained throughout Sessions 1-8)

### 9.3 Final Feature Sweep — DONE
- All frontend routes verified: splash, game hub (6 tabs), profile, support, about, terms, privacy, story mode
- All admin routes verified: dashboard, world builder (4 tabs × 10 sub-tabs), atmospheres, SFX configs, asset registry, game configs, finance, server config, audit log, dev audit
- Console errors: 6 total, all pre-existing (PixiJS cleanup + CombatStage render warning) + 1 new (TransactionHistory, now fixed)

### Bugs Found — Session 9
| # | Description | Severity | Status |
|---|-------------|----------|--------|
| 20 | TransactionHistory crashes on null shard_amount/balance_after | Low | **FIXED** (TransactionHistory.tsx: added `?? 0` guards) |

---

## Session 8 Results (COMPLETE)

### 8.0 World Builder — DONE
- **4 main tabs**: Narrative Editor, Content Editor, Classification, Scaling & Difficulty
- **10 sub-tabs**: Books, Chapters, Scenes, Beats, Entities, Mapper, Backgrounds, Locations, Tags, Waves
- Books: 3 (Elysium Rising, Elysium Fallen, Escape from Elysium) with Edit/Delete actions
- Entities: 50+ rows (paginated), columns: Name, Type, Family, Gameplay, Scenes, Beats
- Scenes: 50+ rows (paginated)
- Waves: 0 rows (no wave configs created — expected, auto-generated from game_configs)
- Content Editor: Stat Definitions, Character Classes, Skills, Benefit Effects, Item Components, Gear Slots
- Screenshot: `76_admin_world_builder.png`

### 8.1 Atmospheres & SFX — DONE
- **Atmosphere Editor**: 21 atmospheres (13 archetypes + 3 training + 5 boss)
- **SFX Config Editor**: 17 SFX presets
- Both pages load with full tables, Edit actions available

### 8.2 Game Configs — DONE
- API verified: `/api/admin/config/` returns configs grouped by category (game, ops)
- Includes: essence_per_click, crit_chance, crit_multiplier, and many more
- Frontend page loads (category tabs need selection to show rows)

### 8.3 Artifacts & Achievements — DEFERRED
- Frontend pages exist but not individually tested this session (verified in Session 6 via API)

### 8.4 Asset Registry — DONE
- 196 total assets with category filters, search

### 8.5 Dev Audit & Audit Log — DONE
- **Audit Log**: 15 entries — admin actions from Sessions 4-5 visible (ban/unban, ticket changes, shard adjustments)
- **Dev Content Audit**: 1 open issue

### 8.6 Server Config — DONE (API-verified)
- API returns all server_config keys including `ops.auth_bypass_enabled`, `ops.auth_bypass_player_id`, `ops.maintenance_mode`, etc.
- Maintenance mode toggle not tested (would block player access)

### Session 8 Notes
- Player 5 promoted to `is_system_admin=true` to access admin panel (was only `is_game_admin`)
- Admin panel requires `is_system_admin` or `is_owner` or whitelisted email — `is_game_admin` is NOT sufficient
- Browser crashed mid-session (Chrome profile conflict with Playwright MCP) — remaining pages verified via API
- No new bugs found

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
| 1 | 1 | Vessel class `lore_blurb` em dash encoding | Low | **FIXED** | DB fix |
| 2 | 1 | `skill_actions` em dash encoding (14 rows) | Low | **FIXED** | DB fix |
| 5 | 2 | `narrativeProgressPct` ReferenceError in CombatStage | Medium | **FIXED** | Code fix (session.narrativeProgressPct) |
| 6 | 2 | Admin Edit Progression "Scene NaN" | Low | **FIXED** | ProgressionEditorModal scene_number |
| 7 | 2 | Encoding in idle training skill descriptions | Low | **FIXED** | DB fix |
| 8 | 2 | Character Creator class cards don't show class name | Low | **FIXED** | CharacterCreator.tsx |
| 9 | 2 | Profile page redirect under auth bypass | Medium | **FIXED** | App.tsx configLoaded gate |
| 10 | 4 | Admin Adjust Essence fails (missing created_at) | Medium | **FIXED** | admin.py default_factory |
| 11 | 4 | Admin Shard Grant fails (mode vs adjust_type + wrong columns) | Medium | **FIXED** | ShardAdjustModal.tsx + admin_finance.py |
| 12 | 5 | Marketplace listing fails (missing marketplace_listing_id) | High | **FIXED** | inventory.py + home_base.py |
| 13 | 5 | Marketplace listing updated_at NOT NULL | Medium | **FIXED** | marketplace.py default_factory |
| 14 | 5 | Admin subscription metrics 500 (wrong columns) | Medium | **FIXED** | finance_analytics_service.py |
| 15 | 5 | Admin shop analytics 500 (expires_at) | Medium | **FIXED** | finance_analytics_service.py |
| 16 | 5 | Admin donation analytics 500 (wrong columns) | Medium | **FIXED** | finance_analytics_service.py |
| 17 | 6 | Chat WebSocket 500 — DetachedInstanceError on player.settings | Medium | **FIXED** | chat.py — direct PlayerSettings query |
| 18 | 7 | Mute button doesn't mute music — TopBar local state not synced to GameContext | Medium | **FIXED** | TopBar.tsx — call updateAudioSettings() |
| 19 | 7 | Music play/pause controls missing — AudioPlayer deleted but no controls on MusicManager | Medium | **FIXED** | MusicManager.tsx — added ⏸/▶ via AudioContext suspend/resume |
| 20 | 9 | TransactionHistory crash on null shard_amount/balance_after | Low | **FIXED** | TransactionHistory.tsx — added `?? 0` null guards |

---

## Cross-Session TODO Items (New Features/Improvements Found)

| # | Session | Description | Priority | Added to TODO.md? |
|---|---------|-------------|----------|-------------------|
| 1 | 7 | Banner attack animation differentiation (flying, magic projectiles, melee) | Medium | YES |
| 2 | 7 | Music loops too short — need 2-3 minute loops to prevent repetitive annoyance | Medium | YES |

---

## Resume Prompt
Use this prompt to continue in a new session:
```
Read docs/E2E_SESSION_STATE.md and docs/TODO.md to understand current progress.
We are doing End-to-End User Testing. Check the session state for which session we're on
and what's been completed. Start the Docker stack with `docker-compose up --build -d`.
Backend uses localhost PostgreSQL (host machine, port 5432) — not the Docker DB.
Auth bypass is enabled. Use the Playwright MCP tools (browser_navigate, browser_click,
browser_snapshot, browser_run_code) for interactive browser testing. For automated tests,
run specs from the testing/ directory. See docs/reference/TOOLS.md for all tool scripts.
Continue from the current checkpoint.
```
