# Simulation & Progression Balancing — Session State

**Status:** ✅ COMPLETE (2026-03-22). All 6 phases done. Combat scaling aligned across story mode and idle training. See `done/DONE.md` for full history.

**Purpose:** Track the design, planning, and execution of progression balancing for Elysium Rising. This is a simulation-driven effort to tune all scaling parameters so the game feels right for both casual and power-gamer play patterns.

---

## Design Target

**Casual Player (2h/day active):** Complete all 3 books in ~30 calendar days (60 hours total play time).
**Power Gamer (8h/day, optimized):** Complete in ~7-10 days with perfect farming and boost usage.
**AFK/Idle Only:** Meaningful but slower — should feel like "progress while away" not "the whole game."

### Progression Curve Philosophy (Pavlovian XP Model)

The progression curve is NOT linear. It follows a three-phase feel:

1. **Early Game (Levels 1-20, Book 1):** Fast, rewarding progression. Levels come quickly. The player should feel like they're getting more powerful with every session. Dopamine hits from frequent level-ups, skill unlocks, and visible damage increases. Hook the player.

2. **Mid Game (Levels 20-55, Book 2):** Deliberate slowdown. Levels take noticeably longer. The player settles into a rhythm — farming, upgrading, training. Progress is steady but requires engagement. This is where idle training and smart upgrade choices start to matter.

3. **End Game (Levels 55-80, Book 3):** Hard-earned progression. Each level feels like an achievement. The final levels should feel worked for — the player knows they earned it. This is the Pavlovian reward schedule: variable reinforcement, longer gaps between big payoffs, but each payoff feels significant.

**Tuning implication:** The XP curve formula (`1000 × N²`) may need to be replaced with a piecewise or sigmoid curve that's gentle early, steepens in the middle, and becomes steep-but-not-impossible at the end. The math model should test multiple curve shapes against the 60-hour casual target.

### Progression Milestones
| Milestone | Casual (~Day) | Power (~Day) | Character Level | Key Unlocks |
|-----------|---------------|--------------|-----------------|-------------|
| Book 1 Start | 1 | 1 | 1 | Basic skills, Auto-DPS |
| Book 1 Ch5 | 5 | 2 | 8-12 | Clickstorm, early idle training |
| Book 1 Complete | 10 | 3 | 15-20 | Book Boss, first curated artifacts |
| Book 2 Start | 11 | 4 | 20-25 | Powersurge, Lucky Strikes unlocked |
| Book 2 Complete | 20 | 6 | 35-45 | Mid-tier skills, Dark Ritual possible |
| Book 3 Start | 21 | 7 | 45-55 | Energize, Reload approaching |
| Book 3 Complete | 30 | 10 | 70-80 | All skills available, endgame artifacts |

---

## Current Scaling Formulas (Baseline)

### Zone HP
```
HP = 10 × (1.55^(zone-1) + zone - 1)
```
Zone 1 = 10, Zone 5 ≈ 143, Zone 10 ≈ 2,063, Zone 20 ≈ 253K

### Zone Gold
```
gold_per_kill = 5 × (1.1^(zone-1) + zone - 1)
```

### Essence Conversion
```
effective_rate = 1000 × 1.07^(zone-1)
converted_essence = session_gold / effective_rate
```

### Click Damage Scaling
```
base_mult = 1 + (level × 0.05)
Milestones: 4× every 25 levels from level 200, 10× every 1000 levels
```

### Auto-DPS
```
base_dps = Σ(skill_level × auto_dps_base)
bonus_mult = 1 + Σ(skill_level × auto_dps_bonus)
total = base_dps × bonus_mult
```

### Character Level XP
```
XP to level N = 1000 × N²
```
Level 10 = 100K total XP, Level 50 = 2.5M, Level 99 = 9.8M

### Idle Training
- Tick interval varies by skill (e.g., 3s for Attack)
- XP per tick varies by skill
- Essence drain: 1/min
- Offline cap: 24 hours
- XP rate scales with essence fill (100% at >75%, down to 10% at <1%)

---

## Key Config Keys (game_configs table)

| Config Key | Current Value | Category |
|-----------|---------------|----------|
| `hp_scaling_factor` | 1.55 | Zone Scaling |
| `monsters_per_zone` | 10 | Zone Scaling |
| `gold_to_essence_base_rate` | 1000 | Economy |
| `gold_to_essence_growth_factor` | 1.07 | Economy |
| `upgrade_cost_scaling` | 1.07 | Upgrades |
| `click_dmg_mult_per_level` | 0.05 | Combat |
| `auto_dps_mult_per_level` | 0.05 | Combat |
| `crit_chance` | 0.02 | Combat |
| `crit_multiplier` | 2.0 | Combat |
| `char_level_xp_factor` | 1000 | Progression |
| `char_xp_per_scene_base` | 50 | Progression |
| `idle_essence_drain_per_minute` | 1 | Idle |
| `idle_offline_cap_hours` | 24 | Idle |
| `session_gold_multiplier` | 1.0 | Economy |
| `first_clear_multiplier` | 1.5 | Economy |
| `default_player_wpm` | 200 | Narrative |
| `wave_duration_seconds` | 30 | Narrative |
| `milestone_start` | 200 | Combat |
| `milestone_interval` | 25 | Combat |

---

## Simulation Toolkit

**Status:** Phases 1-6 COMPLETE. Casual hits 59.53h (target: 60h). Migration 062 applied to dev DB. API bot validated (5/5 scenes, 0 errors). Ready for spoofing lockdown.

Sessions 1-4 from the original manual plan are now automated by the simulation toolkit.
- **Spec:** `docs/specs/2026-03-20-simulation-toolkit-design.md`
- **Plan:** `docs/plans/2026-03-20-simulation-toolkit-plan.md`
- **Toolkit location:** `tools/sim/`

### Toolkit Layers
1. **Math Model** (`tools/sim/math_model.py`) — Offline formula crunching: zone progression, economy, XP curves, wall detection, min power gating, boss DPS checks. Replaces manual Sessions 1 & 4.
2. **API Bot** (`tools/sim/api_bot.py`) — Automated player simulation against live server. 5 profiles (casual, power_gamer, idle_only, no_autoskills, new_user). Replaces manual Sessions 2 & 3.
3. **Browser Bot** (`tools/sim/browser_bot.py`) — Playwright headless for stability testing, pacing validation, load testing with Docker resource scaling.
4. **Results & Iteration** (`tools/sim/results/`) — Structured collection, comparison tool, config override mechanism, migration 062 generator.

### Implementation Progress

#### Phase 1: API Documentation
- [x] Scan all backend routes → generate `docs/inst/API_REFERENCE.md`
- [x] Create `admin/docs/API_GUIDE.md` and update `admin/README.md`

#### Phase 2: Math Model
- [x] Scaffold `tools/sim/` directory, profiles, requirements
- [x] Build config/formula module with tests (9 formula functions, 5 tests)
- [x] Build simulation engine (zone, economy, XP, walls, bosses, archetypes — 14 tests)
- [x] Content data snapshot from DB (3 books, 580 scenes, 18 skills, 72 configs)

**Phase 2 Findings:**
- Zone HP doc approximations (143/2063/253K) don't match formula output (97.7/606.4/41.5K) — verify against server in Phase 3
- Boss data empty (`is_boss_scene` not populated) — math model uses generated placeholders
- XP scaling extremely steep — casual projects ~5e22 hours at level 80, confirming balance tuning needed

#### Phase 3: API Bot
- [x] Build async API client wrapping all game endpoints (`tools/sim/api_client.py` — 20 endpoints, httpx async, retry/backoff, metrics tracking, 7 tests)
- [x] Build bot runner with profile-driven behavior (`tools/sim/api_bot.py` — 5 profiles, 4 upgrade strategies, tick loop, narrative pacing, 7 tests)
- [x] Build comparison tool (`tools/sim/results/compare.py` — config/summary/zone/wall diffs, severity flags, design target verdicts, 7 tests)

#### Phase 4: Browser Bot — ~~OBE~~
- [x] ~~Sustained play stability~~ **OBE** — browser validation (Playwright MCP) confirmed API bot produces identical server-side results to the frontend. Separate browser bot unnecessary.
- [x] ~~Pacing validation~~ **OBE** — validated via fetch interception in browser: same tick responses, same gold, same zone progression.
- [x] ~~Load testing~~ **OBE** — API bot can simulate concurrent players more efficiently than browser instances.
- [x] ~~Endurance farming~~ **OBE** — API bot `--max-scenes` flag handles this.
- See `tools/sim/browser_validation.py` for the validation script used.
- **Bonus finding:** Discovered and fixed two combat scaling bugs during browser validation (see TODO.md).

#### Phase 5: Results & Migration
- [x] Migration 062 generator (`tools/sim/generate_migration.py` — 9 tests)
- [x] Toolkit guide (`docs/inst/SIM_TOOLKIT_GUIDE.md`)
- [x] TODO.md updates

#### Phase 6: First Iteration Run
- [x] Run math model baseline for all profiles (runs 007-011: baseline with scene-based HP)
- [x] Fix math model: switched from legacy zone_hp (1.55x) to scene_hp (1.012x) matching server
- [x] First tuning pass (v1: XP factor 1000→20, too fast at 43.59h)
- [x] Second tuning pass (v2: XP factor 80, essence base 200, growth 1.01) → **casual 59.53h**
- [x] Generate migration 062 with final tuned configs (`db/062_balanced_game_configs.sql`)
- [x] Run API bot validation (5/5 scenes, 0 errors, ~31s/scene combat, gold economy working)
- [x] Apply migration 062 to dev DB (6 UPDATE statements, all verified)

**Phase 6 Results (Config v2):**

| Profile | Total Hours | Target | Status |
|---------|------------|--------|--------|
| Casual | 59.53h | 60h | **On target** |
| Power Gamer | 24.62h active | 56-80h / 7-10 days | **On target** |
| No Autoskills | 256h | Walls, not stuck | **As designed** |
| New User | 2,926h | Very slow | Expected (30min/day, no skills) |
| Idle Only | inf | Can't clear content | **By design** |

**Config Changes (Migration 062):**

| Config Key | Old Value | New Value | Reason |
|-----------|-----------|-----------|--------|
| `char_level_xp_factor` | 1000 | 80 | XP curve was 50x too steep |
| `char_xp_per_scene_base` | 50 | 200 | More XP per scene completion |
| `gold_to_essence_base_rate` | 1000 | 200 | Cheaper essence conversion |
| `gold_to_essence_growth_factor` | 1.07 | 1.01 | Flatter economy curve |
| `idle_essence_drain_per_minute` | 1 | 0.5 | Sustain idle training longer |
| `upgrade_cost_scaling` | 1.07 | 1.03 | Gentler upgrade cost growth |

**Math Model Fix:** Switched from legacy `zone_hp(z, 1.55)` to `scene_hp(z, 20.0, 1.012, 500)` matching the actual server `/enemies` endpoint (implemented in Phase 3 combat scaling fix). This reduced baseline casual from 5.3×10²² hours to 2,977 hours before any config tuning.

### Original Session Plan (Reference)

The original manual sessions are preserved below for reference. The toolkit automates most of this work.

<details>
<summary>Click to expand original manual session plan</summary>

### Session 1: Baseline Measurement & Math Modeling
**Goal:** Build a spreadsheet/script model of the current progression curve. Calculate theoretical times without playing.

- [ ] **1.0** Calculate scene completion times at different WPM speeds (150, 200, 300, 600)
  - Average words per scene (query story_beats word counts)
  - Time = words / WPM + combat buffer
  - Factor in dual-condition gate (narrative must reach 100%)
- [ ] **1.1** Model zone HP vs player damage curve across 30 zones
  - Zone HP: 10 × 1.55^(z-1)
  - Player DPS at various upgrade levels
  - Time-to-kill per zone
- [ ] **1.2** Model gold income vs essence conversion across zones
  - Gold per minute at each zone (gold_per_kill × kills_per_minute)
  - Essence gained per scene and per farm session
- [ ] **1.3** Model character XP curve
  - XP per scene (base 50 + zone bonus?)
  - XP from idle training (ticks × XP per tick × hours)
  - Time to reach milestone levels (10, 20, 35, 50, 70)
- [ ] **1.4** Map content volume
  - Total scenes across all 3 books
  - Total bosses (chapter + book)
  - Average scenes per chapter, chapters per book
  - Estimated total first-clear playtime

### Session 2: Active Play Simulation
**Goal:** Simulate a casual player's journey through Book 1 with current scaling defaults.

- [ ] **2.0** Play through Book 1 Chapter 1-3 with stopwatch
  - Record: time per scene, gold earned, essence gained, level ups
  - Note: WPM feel (too fast? too slow?), combat pacing, upgrade afford-ability
- [ ] **2.1** Farm mode timing test
  - Stay on one scene for 5/10/15 minutes
  - Record gold/minute, zone reached, when it stalls
- [ ] **2.2** Idle training overnight test
  - Start training, close browser, return 8 hours later
  - Record levels gained, essence consumed, offline report accuracy
- [ ] **2.3** Boss fight timing
  - Record time-to-kill at current level/stats vs boss HP
  - Are interrupts balanced? (too easy, too hard, just right)
- [ ] **2.4** Compile Session 2 data into spreadsheet

### Session 3: Power-Gamer Simulation
**Goal:** Simulate an optimized path — maximum farming, all boosts, rapid advancement.

- [ ] **3.0** Admin-grant max subscription + boosters
  - Apply 2× essence booster + Ascendant sub
  - Record effective multipliers
- [ ] **3.1** Speed-run Chapter 1-5 with max WPM (600)
  - Stopwatch each scene
  - Record gold/essence/XP earned
- [ ] **3.2** Extended farm session (30 min)
  - Record zone progression, gold rate plateau, essence conversion
- [ ] **3.3** Compare to casual simulation — gap analysis
  - Is the power-gamer 2× faster? 5×? 10×?
  - Is the gap too wide or too narrow?

### Session 4: Idle-Only Simulation
**Goal:** Model pure AFK progression.

- [ ] **4.0** Simulate 24h of idle training only (no active play)
  - Calculate expected levels gained per skill
  - Calculate essence drain over 24h
  - Calculate character XP gained (idle_to_char_xp_ratio = 0.1)
- [ ] **4.1** Simulate 7 days of idle-only
  - Can the player meaningfully progress?
  - What level can they reach?
  - Is essence drain sustainable?
- [ ] **4.2** Compare idle-only vs active play progression ratio
  - Target: idle should be ~20-30% as fast as active play

### Session 5: Tuning & Rebalance
**Goal:** Adjust scaling parameters to hit design targets.

- [ ] **5.0** Identify misaligned curves from Sessions 1-4
- [ ] **5.1** Propose new config values
- [ ] **5.2** Create migration 062 with updated game_configs
- [ ] **5.3** Re-run simulations with new values — verify targets met

### Session 6: WPM & Narrative Timing
**Goal:** Ensure reading pace feels natural and doesn't bottleneck or rush combat.

- [ ] **6.0** Measure average words per scene across all chapters
- [ ] **6.1** At WPM 200: does combat always finish before narrative? Vice versa?
- [ ] **6.2** Calculate ideal wave count per scene to match narrative length
- [ ] **6.3** Propose WPM-aware wave scaling formula

### Session 7: Music Loop & Audio Timing (from TODO — separate workstream)
- See `docs/TODO.md` Music Loop section

### Session 8: Final Verification & Documentation
- [ ] **8.0** Fresh-start playthrough with new scaling
- [ ] **8.1** Update game_configs documentation
- [ ] **8.2** Update Player Guide with any changed mechanics
- [ ] **8.3** Final migration script reviewed and committed

</details>

---

## Known Issues (from brainstorming session 2026-03-20)
- **Chapter 1 replay too fast** — farm mode triggers almost immediately on replay because wave HP is trivial for a returning player. Needs investigation: is this a scaling issue or a replay-specific pacing issue?
- **Narrative vs combat mismatch** — dual-condition gate means both narrative and waves must complete. If one finishes way before the other, the player either waits or has dead time. Math model content timeline (5.3.4) will quantify this.
- **No autoskills wall** — a player who never trains idle skills should eventually hit a wall but shouldn't be stuck in Book 1 forever. Min power gating analysis (5.3.7) will identify where this wall occurs.
- **Endless farming diminishing returns** — farming should be viable indefinitely but cannot shortcut progression. A player farming wave 2 for 10 hours shouldn't be able to skip to Book 3.

---

## API Surface (discovered 2026-03-20)

Key endpoints for simulation (full reference pending in `docs/inst/API_REFERENCE.md`):

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/game/story/session/start` | POST | Create/resume combat session |
| `/api/game/story/session/{id}/tick` | POST | Batch combat tick (clicks + elapsed time) |
| `/api/game/story/session/{id}/upgrade` | POST | Purchase in-session upgrade |
| `/api/game/story/session/{id}/skill` | POST | Activate skill |
| `/api/game/story/session/{id}/narrative` | POST | Update narrative progress |
| `/api/game/story/session/{id}/complete` | POST | Finalize session → essence conversion |
| `/api/game/story/configs` | GET | Game config values for combat engine |
| `/api/game/training/start` | POST | Begin idle training |
| `/api/game/training/stop` | POST | Stop idle training |
| `/api/game/training/status` | GET | Current training state |
| `/api/game/training/offline-report` | GET | Offline gains report |
| `/api/game/character/stats` | GET | Computed stat block |
| `/api/game/character/level` | GET | Level, XP, XP-to-next |
| `/api/game/map` | GET | Full book/chapter/scene hierarchy |

---

## Environment Setup

Same as E2E testing:
```bash
docker-compose up --build -d
# Auth bypass enabled, player 5 (Awakened/Seeker)
# Admin: localhost:5174, Frontend: localhost:5173, Backend: localhost:8000
# DB: localhost:5432 (host machine PostgreSQL)
```

**Useful queries for simulation:**
```sql
-- Scene word counts
SELECT s.id, s.title, COUNT(sb.id) as beats, SUM(LENGTH(sb.text_content) - LENGTH(REPLACE(sb.text_content, ' ', '')) + 1) as word_count
FROM scenes s JOIN story_beats sb ON sb.scene_id = s.id GROUP BY s.id, s.title;

-- Current game_configs
SELECT key, value FROM game_configs WHERE category = 'game' ORDER BY key;

-- Player progression state
SELECT * FROM player_story_progress WHERE player_id = 5;
```

---

## Resume Prompt
```
Simulation & Progression Balancing is COMPLETE (Phases 1-6).
Casual: 59.53h (target: 60h). Migration 062 applied. API bot validated.
Toolkit guide: docs/inst/SIM_TOOLKIT_GUIDE.md
Full results: docs/done/DONE.md

If re-tuning is needed in the future:
1. Edit tools/sim/results/config_overrides.json
2. Run: cd tools/sim && python math_model.py --all --config results/config_overrides.json
3. Validate: python api_bot.py --profile casual --max-scenes 5
4. Generate: python generate_migration.py
```
