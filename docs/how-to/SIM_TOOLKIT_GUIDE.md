# Simulation & Progression Balancing Toolkit — User Guide

## Overview

The simulation toolkit validates and tunes all game scaling parameters to hit the **60-hour casual completion target** across all player archetypes. It lives in `tools/sim/` and has three layers that build on each other:

1. **Math Model** — Offline formula crunching (seconds, no server needed)
2. **API Bot** — Automated player simulation against live server
3. **Compare Tool** — Diff two runs, highlight what changed

**Full Spec:** `docs/specs/2026-03-20-simulation-toolkit-design.md`
**Session State:** `../docs/project/done/SIM_PROC_BAL_SESSION_STATE.md`

---

## Prerequisites

```bash
# Python 3.13+
cd tools/sim
pip install -r requirements.txt

# Docker stack (for API bot)
docker-compose up --build -d
# Backend: localhost:8000, Frontend: localhost:5173, Admin: localhost:5174
```

---

## Layer 1: Math Model

Crunches all scaling formulas offline to produce baseline progression predictions. No server needed.

### Run

```bash
cd tools/sim

# Single profile
python math_model.py --profile casual

# All 5 profiles
python math_model.py --all

# With tuned config overrides
python math_model.py --all --config results/config_overrides.json

# Refresh content data from live DB first
python math_model.py --all --refresh-content
```

### Profiles

| Profile | CPS | WPM | Strategy | Idle |
|---------|-----|-----|----------|------|
| `casual` | 8-12 | 200 | Buy when affordable | Yes (22h/day) |
| `power_gamer` | 20 | 600 | Optimal | Yes (16h/day) |
| `idle_only` | 0 | N/A | None | Yes (24h/day) |
| `no_autoskills` | 8-12 | 200 | Buy when affordable | No |
| `new_user` | 2-5 | 200 | Random | No |

### Output

- `results/math_model_run_NNN.json` — Full raw data (zone progression, economy, XP, walls, bosses)
- `results/math_model_run_NNN.csv` — Spreadsheet-importable
- `results/RESULTS.md` — Human-readable summary appended

### Key Sections in Output

| Section | What It Shows |
|---------|--------------|
| `zone_progression` | HP, gold, time-to-kill per zone |
| `economy_flow` | Gold/min, essence conversion rate per zone |
| `xp_curve` | Time to milestone levels (10, 20, 35, 50, 70, 80) |
| `content_timeline` | Narrative time vs combat time per scene (WPM-based) |
| `wall_detection` | Zones where TTK > 5min, gold stalls, XP stalls |
| `min_power_gates` | Min level/skills to beat each boss |
| `boss_dps_checks` | Required DPS vs available DPS at target level |
| `summary` | Total hours estimate per book and overall |

---

## Layer 2: API Bot

Simulates player behavior against the real running backend. Validates math model predictions.

### Run

```bash
cd tools/sim

# Single profile (limited scenes for quick test)
python api_bot.py --profile casual --max-scenes 5

# Full run
python api_bot.py --profile casual --base-url http://localhost:8000

# All profiles
python api_bot.py --all --base-url http://localhost:8000
```

### What It Does

1. Authenticates via dev spoofing mechanism
2. Follows real game flow: map → start session → tick loop → upgrades → complete → train
3. Sends realistic clicks at profile CPS with real elapsed time
4. Respects server-authoritative responses (anti-cheat clamping)
5. Collects per-tick metrics: gold, XP, zones, response times

### Output

- `results/api_bot_<profile>_<timestamp>.json` — Per-tick data + metrics
- Appends comparison to `results/RESULTS.md`

---

## Layer 3: Compare Tool

Diffs two run result files to show what changed between tuning iterations.

### Run

```bash
cd tools/sim

# Compare two math model runs
python results/compare.py results/math_model_run_001.json results/math_model_run_002.json

# Compare math model vs API bot
python results/compare.py --baseline results/math_model_run_001.json --candidate results/api_bot_casual_001.json
```

### Output

- Config value deltas
- Metric deltas (absolute + percentage)
- Direction indicator: toward or away from target
- Changes > 5% highlighted, improvements > 10% in green

---

## Iteration Workflow

This is the core tuning loop:

### Step 1: Establish Baseline

```bash
# Capture content data from live DB
python math_model.py --all --refresh-content

# Review results
cat results/RESULTS.md
```

### Step 2: Validate with API Bot

```bash
# Run API bot for the same profiles
python api_bot.py --profile casual --max-scenes 10

# Compare predictions vs actuals
python results/compare.py results/math_model_run_001.json results/api_bot_casual_<timestamp>.json
```

If divergence > 10%, investigate: the math model may use a different formula than the server.

### Step 3: Tune Configs

Create `results/config_overrides.json`:

```json
{
  "description": "Config v2 — reduced HP scaling, adjusted essence rate",
  "overrides": {
    "hp_scaling_factor": 1.45,
    "gold_to_essence_base_rate": 800
  },
  "run_ids": ["math_model_run_001", "api_bot_casual_001"]
}
```

### Step 4: Re-Run with Overrides

```bash
python math_model.py --all --config results/config_overrides.json
python results/compare.py results/math_model_run_001.json results/math_model_run_002.json
```

### Step 5: Iterate Until Targets Met

- **Primary:** Casual player completes all 3 books in ~60 hours
- **Secondary:** Endless farming has diminishing returns
- **Tertiary:** Power gamers progress through efficiency, not farming exploits

### Step 6: Generate Migration

```bash
python generate_migration.py --config results/config_overrides.json
# Output: db/062_balanced_game_configs.sql
```

### Step 7: Apply Migration

```bash
# Review the SQL first
cat db/062_balanced_game_configs.sql

# Apply to dev DB (see docs/how-to/DB_MIGRATIONS.md)
source backend/.env
psql "$DATABASE_URL" -f db/062_balanced_game_configs.sql
```

---

## Migration Generator

Reads `results/config_overrides.json` and generates `db/062_balanced_game_configs.sql` with UPDATE statements for each changed config value.

```bash
cd tools/sim

# Default paths
python generate_migration.py

# Custom paths
python generate_migration.py --config results/config_overrides.json --output db/062_balanced_game_configs.sql
```

---

## Design Targets

| Player Type | Target | Metric |
|-------------|--------|--------|
| Casual (2h/day) | 30 calendar days | 60 hours total play |
| Power Gamer (8h/day) | 7-10 days | ~56-80 active hours |
| Idle Only | ~20-30% speed of active | Meaningful but slower |
| No Autoskills | Hits walls eventually | Not stuck in Book 1 |

### Progression Milestones

| Milestone | Casual Day | Power Day | Level |
|-----------|-----------|-----------|-------|
| Book 1 Complete | 10 | 3 | 15-20 |
| Book 2 Complete | 20 | 6 | 35-45 |
| Book 3 Complete | 30 | 10 | 70-80 |

---

## Wall Detection Thresholds

The math model flags zones where:
- Time-to-kill > 5 minutes for a single zone
- Gold income can't afford next upgrade within 10 minutes of farming
- Time between levels exceeds 2 hours of active play

---

## Post-Simulation Checklist

After tuning is complete and migration 062 is applied:

- [ ] Verify migration applied cleanly
- [ ] Re-run API bot to confirm targets met with new DB values
- [ ] **CRITICAL: Spoofing Lockdown** — disable all dev auth bypass mechanisms
- [ ] Update `docs/SIM_PROC_BAL_SESSION_STATE.md` with final tuning results
- [ ] Update `docs/TODO.md` — check off simulation tasks

---

## File Reference

```
tools/sim/
├── README.md                    # Quick-start
├── config.py                    # Game config constants + formula functions
├── math_model.py                # Layer 1: Offline formula simulation
├── api_bot.py                   # Layer 2: API-driven player simulation
├── api_client.py                # Async HTTP client for game endpoints
├── browser_validation.py        # Phase 4 browser validation (OBE)
├── generate_migration.py        # Migration 062 generator
├── requirements.txt
├── profiles/                    # Player profile configs (JSON)
│   ├── casual.json
│   ├── power_gamer.json
│   ├── idle_only.json
│   ├── no_autoskills.json
│   └── new_user.json
├── data/
│   ├── content_snapshot.py      # DB snapshot script
│   └── content_snapshot.json    # Cached content data
├── results/
│   ├── RESULTS.md               # Human-readable summaries
│   ├── compare.py               # Run comparison tool
│   ├── config_overrides.json    # Tuning overrides (create during iteration)
│   ├── math_model_run_NNN.json  # Raw math model output
│   ├── math_model_run_NNN.csv   # Spreadsheet-importable
│   └── api_bot_*.json           # API bot metrics
└── tests/
    ├── test_config.py
    ├── test_math_model.py
    ├── test_api_client.py
    ├── test_api_bot.py
    ├── test_compare.py
    └── test_generate_migration.py
```
