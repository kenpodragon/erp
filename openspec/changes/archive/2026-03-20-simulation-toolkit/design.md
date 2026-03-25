# Simulation & Progression Balancing Toolkit — Design Spec

**Date:** 2026-03-20
**Status:** Draft
**Related:** `docs/SIM_PROC_BAL_SESSION_STATE.md`, `docs/TODO.md`

---

## 1. Overview

This spec defines the design for a simulation and progression balancing toolkit that validates and tunes all scaling parameters in Elysium Rising. The goal is to ensure the game hits its pacing targets across all player archetypes while maintaining server stability under load.

### 1.1 Primary Target
- **Casual Player:** 2 hours/day active play → complete all 3 books in 30 calendar days (60 hours total)
- Each book ≈ 20 hours of play, matching the audiobook length of each Towers of Elysium book

### 1.2 Secondary Targets
- **Power Gamer (8h/day, optimized):** Complete in ~7-10 days with perfect farming and boost usage
- **Idle Only:** Meaningful but slower (~20-30% speed of active play)
- **No Autoskills:** Should hit walls eventually but not be stuck in Book 1
- **Endless Farming:** Viable indefinitely (stay at wave 2 forever if desired) but with diminishing returns — cannot shortcut progression by farming low zones for hours

### 1.3 Progression Milestones

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

## 2. Workstreams

### 2.1 Dependency Chain

```
API Documentation → Math Model → API Bot → Browser Bot → Tune & Iterate → Migration 062 → Spoofing Lockdown
```

**Workstream A (API Documentation)** is a prerequisite — it produces the endpoint reference the API bot codes against.

**Workstream B (Simulation Toolkit)** has four layers that build on each other.

---

## 3. Workstream A: API Documentation

### 3.1 Goal
Create a comprehensive API reference by scanning all FastAPI backend route files. This serves both human developers and the simulation bot.

### 3.2 Approach
- Scan all files in `backend/routes/*.py`
- Extract: route path, HTTP method, parameters, request/response models, auth requirements, anti-cheat notes
- Group endpoints by their actual domain structure (discovered during scanning, not assumed)

### 3.3 Outputs
- **`docs/inst/API_REFERENCE.md`** — Full endpoint reference grouped by domain
- **Admin user guide update** — Add API section to admin docs for testing/debugging
- Each endpoint documented with: route, method, auth type, request body, response shape, relevant notes

### 3.4 Key Content Areas
The reference will cover all discovered endpoint groups. Expected domains include (but will be adjusted based on actual routes):
- Authentication & session management
- Story Mode lifecycle (start → tick → upgrade → complete)
- Idle Training (start/stop, offline gains)
- Economy (gold, essence, shop)
- Character progression (XP, levels, skills)
- Admin endpoints (config, players, content, scaling)

---

## 4. Workstream B: Simulation Toolkit

Location: `tools/sim/`

### 4.1 Directory Structure

```
tools/sim/
├── README.md                    # Quick-start guide
├── math_model.py                # Layer 1: Offline formula crunching
├── api_bot.py                   # Layer 2: API-driven player simulation
├── browser_bot.py               # Layer 3: Playwright headless testing
├── generate_migration.py        # Generates migration 062 from tuned configs
├── profiles/                    # Player profile configs (JSON)
│   ├── new_user.json
│   ├── casual.json
│   ├── power_gamer.json
│   ├── idle_only.json
│   └── no_autoskills.json
└── results/
    ├── RESULTS.md               # Human-readable summaries & verdicts
    ├── compare.py               # Diff two runs, highlight changes
    ├── config_overrides.json    # Tuning overrides for iteration
    ├── math_model_run_XXX.json  # Raw math model output
    ├── math_model_run_XXX.csv   # Spreadsheet-importable
    ├── api_bot_run_XXX.json     # Raw API bot metrics
    ├── api_bot_run_XXX_summary.csv
    └── browser_run_XXX.json     # Browser stability/perf metrics
```

---

## 5. Layer 1: Math Model (`math_model.py`)

### 5.1 Purpose
Crunch all scaling formulas offline to produce baseline predictions. Runs in seconds, no server needed.

### 5.2 Inputs
Formulas and config values from `SIM_PROC_BAL_SESSION_STATE.md`:
- HP scaling: `10 × (1.55^(zone-1) + zone - 1)`
- Gold per kill: `5 × (1.1^(zone-1) + zone - 1)`
- Essence conversion: `session_gold / (1000 × 1.07^(zone-1))`
- Click damage: `1 + (level × 0.05)`, milestones at 200/25/1000
- Auto-DPS: `Σ(skill_level × auto_dps_base) × (1 + Σ(skill_level × auto_dps_bonus))`
- Character XP: `1000 × N²` to reach level N
- Idle training: tick intervals, XP per tick, essence drain 1/min, offline cap 24h

### 5.3 Simulations

**5.3.1 Zone Progression**
For each zone 1-140: HP, gold per kill, time-to-kill at various DPS levels. Identifies where TTK spikes (walls).

**5.3.2 Economy Flow**
Gold income per minute at each zone, essence conversion rate, how many scenes/farm sessions to afford the next meaningful upgrade tier.

**5.3.3 XP & Leveling**
Time to reach milestone levels (10, 20, 35, 50, 70, 80) via: active play only, idle only, mixed. Maps against the 60-hour target.

**5.3.4 Content Timeline**
Total scenes × avg word count ÷ WPM = minimum narrative time. Compare narrative time vs combat time per scene — flag mismatches where one side finishes way before the other. Test at WPM values: 150, 200, 300, 600.

**5.3.5 Archetype Projections**
Run all above for each player profile:
- **Casual:** 200 WPM, 8-12 CPS, buys upgrades when affordable, uses skills on cooldown
- **Power Gamer:** 600 WPM, 20 CPS, optimal upgrade path, all skills on cooldown
- **Idle Only:** No active play, just training ticks
- **No Autoskills:** Active clicking but no idle training — tests for progression walls
- **Max Gear:** Admin-granted boosts + subscription multipliers

**5.3.6 Wall Detection**
Flag any point where:
- Time-to-kill > 5 minutes for a single zone
- Gold income can't afford next meaningful upgrade within 10 minutes of farming
- XP curve stalls (time between levels exceeds 2 hours of active play)

**5.3.7 Minimum Power Gating Analysis**
For each chapter boss and book boss, calculate the minimum character level + skill levels + gear needed to beat it within the enrage timer. Work backwards:
- Boss HP and enrage timer → required DPS → what level/upgrades/skills produce that DPS
- **Undergeared scenarios:** What happens if a player is 5, 10, 20 levels below the target range? At what exact point do they hit a hard wall?
- **Skill dependency analysis:** Which skills are mandatory vs nice-to-have at each checkpoint? If someone skips idle training entirely, at what exact point do they get stuck?
- **Overgeared scenarios:** If a power gamer is 10-20 levels above target, does the boss become trivially easy?

**5.3.8 Boss DPS Check Calculator**
For each boss: HP pool, enrage timer, interrupt requirements.
- Calculate minimum DPS to beat it
- Calculate minimum CPS + level + skills to produce that DPS
- Flag bosses where the minimum viable build is too demanding or too trivial for the target level range

### 5.4 Output
- `results/math_model_run_XXX.json` — Full raw data
- `results/math_model_run_XXX.csv` — Spreadsheet-importable
- Appends summary to `results/RESULTS.md`

---

## 6. Layer 2: API Bot (`api_bot.py`)

### 6.1 Purpose
Validate the math model's predictions against the real running server. Simulates player behavior by hitting actual API endpoints in sequence.

### 6.2 How It Works
- Authenticates using the dev spoofing mechanism (creates test players)
- Follows the real game flow: login → select character → enter scene → tick loop (clicks + waves) → buy upgrades → complete scene → convert essence → train skills → next scene
- Each "tick" sends realistic click counts at the profile's CPS rate with real elapsed time
- Respects server-authoritative responses — if the server clamps gold or waves, the bot records what the server actually returned

### 6.3 Player Profiles

| Profile | CPS | WPM | Upgrade Strategy | Skills | Session Length |
|---------|-----|-----|-----------------|--------|---------------|
| New User | 2-5 | 200 | Random/inefficient | None | 30 min |
| Casual | 8-12 | 200 | Buy when affordable | On cooldown | 2 hrs |
| Power Gamer | 20 | 600 | Optimal path | All, perfect timing | 8 hrs |
| Idle Only | 0 | N/A | None | Training only | Reconnect every 8h |
| No Autoskills | 10 | 200 | Normal | Never trains | 2 hrs |

### 6.4 Metrics Collected
Per tick/scene/session:
- Gold earned, gold corrected (anti-cheat), essence converted
- Zones cleared, waves per minute, time-to-kill per zone
- XP gained, levels gained, skills unlocked
- Upgrade purchases and costs
- Server response times (p50, p95, p99)
- Any anti-cheat flags triggered

### 6.5 Error Handling
- **5xx errors:** Log and retry up to 3 times with exponential backoff. After 3 failures, log the error and skip to next action (don't abort the entire run).
- **Timeouts:** 30s default timeout per request. Log timeout events as potential server performance issues.
- **WebSocket disconnection:** Auto-reconnect with backoff. Log disconnection events with timestamp for correlation with load metrics.
- **Anti-cheat rejections:** Log but continue — these are expected data points, not errors.

### 6.6 Comparison Mode
After a run, automatically compares results against the math model's predictions for the same profile. Flags divergences > 10% — these mean either the math model has a wrong formula or the server behaves differently than expected.

### 6.7 Output
- `results/api_bot_run_XXX.json` — Raw per-tick data
- `results/api_bot_run_XXX_summary.csv` — Aggregated metrics
- Appends comparison summary to `RESULTS.md`

---

## 7. Layer 3: Browser Bot (`browser_bot.py`)

### 7.1 Purpose
Real-world validation that can't be done via API alone — browser stability, memory leaks, rendering under sustained play, and load testing with real resource constraints.

### 7.2 Test Suites

**7.2.1 Sustained Play Stability**
- Playwright headless, 20 CPS clicking for 1hr, 2hr, 4hr continuous sessions
- **Click implementation:** Use `page.evaluate()` to dispatch synthetic click events directly to the DOM (Playwright's `page.click()` has ~10-50ms overhead per call, making 20 CPS unreliable via the standard API)
- Monitor: browser memory usage over time, DOM node count, WebSocket reconnections, JS console errors
- Goal: find the breaking point — crash threshold, memory leak rate

**7.2.2 Pacing Validation**
- Play through Chapter 1 at 200 WPM default rate — measure actual wall-clock time per scene
- Replay Chapter 1 — capture exactly how quickly farm mode triggers on replay (known issue: too fast)
- Compare first-play vs replay timing to verify narrative gate + combat balance

**7.2.3 Load Testing (Docker Resource Scaling)**
Run against local Docker stack with controlled resource limits:

| Concurrent Users | Docker CPU | Docker Memory | Measure |
|-----------------|-----------|---------------|---------|
| 1 | 0.5 core | 256MB | Baseline response times |
| 5 | 0.5 core | 256MB | When does it degrade? |
| 10 | 1 core | 512MB | Stable? |
| 25 | 1 core | 512MB | Breaking point? |
| 25 | 2 cores | 1GB | Does scaling fix it? |
| 50 | 2 cores | 1GB | Extrapolation point |

Each "user" is a headless browser doing casual-profile play (8-12 CPS, buying upgrades). Metrics: server response time (p50/p95/p99), error rate, dropped WebSocket connections, DB connection pool saturation. Produces a scaling recommendation: "X users per core, Y MB per user."

**Resource note:** Each headless Chromium instance consumes 150-300MB RAM. For tests beyond ~10 concurrent users, use the API bot (Layer 2) for scale testing and reserve browser bot for stability/rendering validation with 1-5 instances. The load testing table above represents mixed-mode: API bot users for volume, with 1-2 browser instances for rendering validation at each tier.

**7.2.4 Endurance Farming Test**
- Max-gear, max-level character, 20 CPS, endless farming on one scene
- Run for 4-8 hours continuous
- Tests: gold overflow, browser tab crash, DB unbounded growth, memory leaks

### 7.3 Output
- `results/browser_run_XXX.json` — Performance metrics over time
- `results/RESULTS.md` — Stability verdicts, scaling recommendations
- Screenshots captured on failure/anomaly

---

## 8. Results & Iteration

### 8.1 Results Structure

```
tools/sim/results/
├── RESULTS.md               # Human-readable summaries, verdicts, tuning decisions
├── math_model_run_001.json
├── math_model_run_001.csv
├── api_bot_run_001.json
├── api_bot_run_001_summary.csv
├── browser_run_001.json
└── compare.py               # Diff two runs, highlight changes
```

### 8.2 Run Numbering
Run files use zero-padded auto-incrementing integers: `math_model_run_001.json`, `api_bot_run_002.json`, etc. Each layer has its own counter. The run number is determined by scanning existing files in `results/` at script start.

### 8.3 Compare Tool (`results/compare.py`)
- **Inputs:** Two run JSON files of the same type (e.g., two math model runs or two API bot runs)
- **Output:** A diff summary showing: changed config values between runs, metric deltas (absolute and percentage), and whether each metric moved toward or away from the target
- **Thresholds:** Highlights changes > 5% in red, improvements > 10% in green
- **Usage:** `python compare.py math_model_run_001.json math_model_run_002.json`

### 8.4 Config Override Mechanism
Tuning overrides are stored in `tools/sim/results/config_overrides.json`:
```json
{
  "description": "Config v2 — reduced HP scaling, adjusted essence rate",
  "overrides": {
    "hp_scaling_factor": 1.45,
    "gold_to_essence_base_rate": 800
  }
}
```
- The math model and API bot both accept a `--config` flag pointing to this file
- Overrides are merged on top of the current DB/default values
- Each run's output JSON records the exact config snapshot used for reproducibility

### 8.5 RESULTS.md Format Per Run

```markdown
## Run 003 — Casual Profile, Config v2
Date: 2026-03-XX
Config changes: hp_scaling_factor 1.55→1.45, gold_to_essence_base_rate 1000→800

### Projections (Math Model)
- Book 1 completion: 18.5 hrs (target: 20)
- Book 2 completion: 39 hrs (target: 40)
- Book 3 completion: 57 hrs (target: 60)
- Walls detected: Zone 22 (TTK 6min), Zone 38 (gold stall)

### Actuals (API Bot)
- Book 1 completion: 19.2 hrs
- Model accuracy: 96.3%
- Anti-cheat flags: 0

### Min Power Gate
- Book 1 boss beatable at level: 12 (target range: 15-20) ← TOO EASY
- Book 3 boss requires minimum level: 65 (target range: 70-80) ← OK

### Farming Diminishing Returns
- Wave 2 farming: gold/min drops to X% of peak after N minutes
- Cannot reach Book 2 power level by farming Book 1 alone: YES/NO

### Verdict
- HP scaling reduction helped Zone 22 wall
- Book 1 boss needs HP buff — beatable 3 levels below target
- NEXT: Increase Book 1 boss hp_multiplier from 2.0 to 3.5
```

### 8.6 Iteration Workflow
1. Run math model → review → adjust config values in a local override dict
2. Run API bot with same config → compare to math model → calibrate
3. **Primary iteration target:** Tune until casual player completes all 3 books in 60 hours (2hr/day × 30 days)
4. **Secondary validation:** Verify endless farming has diminishing returns — players can stay indefinitely but can't shortcut progression
5. **Tertiary validation:** Power gamers progress through efficiency not farming exploits
6. Run browser bot for stability sign-off
7. Final config values → generate migration 062

### 8.7 Migration Generation
`generate_migration.py` reads the final tuned config dict and outputs `db/062_balanced_game_configs.sql` with:
```sql
UPDATE game_configs SET value_json = '...' WHERE key = '...';
```
For each changed config value.

---

## 9. Documentation Updates

### 9.1 New Files
- `docs/inst/API_REFERENCE.md` — Full endpoint reference (auto-generated from routes)
- `docs/inst/SIM_TOOLKIT_GUIDE.md` — How to run the simulation tools, interpret results
- `tools/sim/README.md` — Quick-start for the toolkit itself
- This spec: `docs/specs/2026-03-20-simulation-toolkit-design.md`

### 9.2 Updated Files
- `docs/TODO.md` — Simulation toolkit tasks added; spoofing lockdown already added
- `docs/SIM_PROC_BAL_SESSION_STATE.md` — Reference toolkit where it replaces manual testing
- Admin user guide — API reference section added

---

## 10. Post-Simulation: Spoofing Lockdown

**CRITICAL — must be done immediately after all simulation testing is complete.**

- Turn off all dev/test auth bypass mechanisms
- Verify all external routes confirm no spoofing endpoints are exposed
- Security audit: ensure no spoofing-related env vars, headers, or query params leak to production
- Remove or gate behind `DEV_ONLY` flag any admin spoofing utilities

Already tracked in `docs/TODO.md` as a critical section.

---

## 11. Execution Order

1. **API Documentation** — Scan routes, generate `API_REFERENCE.md`, update admin guide
2. **Math Model** — Build and run, get baseline predictions
3. **API Bot** — Build and run profiles against live Docker stack, compare to math model
4. **Calibrate** — Iterate until math model and API bot agree (model accuracy > 90%)
5. **Tune** — Adjust configs until casual 60hr target met, farming diminishing returns verified
6. **Browser Bot** — Stability and load testing, scaling recommendations
7. **Migration 062** — Generate from final tuned configs
8. **Spoofing Lockdown** — Disable all dev auth bypass
