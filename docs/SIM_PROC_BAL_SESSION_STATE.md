# Simulation & Progression Balancing — Session State

**Purpose:** Track the design, planning, and execution of progression balancing for Elysium Rising. This is a simulation-driven effort to tune all scaling parameters so the game feels right for both casual and power-gamer play patterns.

---

## Design Target

**Casual Player (2h/day active):** Complete all 3 books in ~30 calendar days (60 hours total play time).
**Power Gamer (8h/day, optimized):** Complete in ~7-10 days with perfect farming and boost usage.
**AFK/Idle Only:** Meaningful but slower — should feel like "progress while away" not "the whole game."

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

## Session Plan

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
  - Zone HP too steep? Too shallow?
  - Essence conversion too generous? Too stingy?
  - Character level curve too slow? Too fast?
  - Boss HP vs player power mismatch?
- [ ] **5.1** Propose new config values
  - Document current → proposed for each config key
  - Explain rationale (e.g., "HP scaling 1.55→1.45 because Zone 15+ stalls for casual players")
- [ ] **5.2** Create migration 062 with updated game_configs
- [ ] **5.3** Re-run simulations with new values — verify targets met

### Session 6: WPM & Narrative Timing
**Goal:** Ensure reading pace feels natural and doesn't bottleneck or rush combat.

- [ ] **6.0** Measure average words per scene across all chapters
- [ ] **6.1** At WPM 200: does combat always finish before narrative? Vice versa?
  - The dual-condition gate means BOTH must complete
  - If combat finishes 2 minutes early, player waits → bad feel
  - If narrative finishes 2 minutes early, easy combat zones waste time
- [ ] **6.2** Calculate ideal wave count per scene to match narrative length
  - May need per-scene wave_count overrides instead of global default
- [ ] **6.3** Propose WPM-aware wave scaling formula

### Session 7: Music Loop & Audio Timing (from TODO)
**Goal:** Extend music loops to 2-3 minutes and verify timing.

- [ ] **7.0** Measure current loop durations for all 21 atmospheres
- [ ] **7.1** Redesign music definition schemas for longer sequences
- [ ] **7.2** Update `generate_8bit_music.py` for longer compositions
- [ ] **7.3** Regenerate all atmosphere music
- [ ] **7.4** Verify in-game: no jarring loop restarts

### Session 8: Final Verification & Documentation
**Goal:** Validate all changes with end-to-end playthrough.

- [ ] **8.0** Fresh-start playthrough: Chapter 1-5 with new scaling
  - Verify pacing feels right
  - Verify boss difficulty appropriate
  - Verify farm mode useful but not required
- [ ] **8.1** Update game_configs documentation
- [ ] **8.2** Update Player Guide with any changed mechanics
- [ ] **8.3** Final migration script reviewed and committed

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
Read docs/SIM_PROC_BAL_SESSION_STATE.md and docs/TODO.md.
We are doing Simulation & Progression Balancing. Check session state for current progress.
Start the Docker stack. Use the math models and in-game testing to tune scaling parameters.
```
