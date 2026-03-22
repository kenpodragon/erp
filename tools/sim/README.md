# Elysium Rising — Simulation Toolkit

Validates game scaling parameters against the 60-hour casual completion target. Three simulation layers run independently or together.

## Install

```bash
cd tools/sim
pip install -r requirements.txt
playwright install chromium
```

## Simulation Layers

### Layer 1 — Math Model (offline, fast)
Pure-Python formula crunching. No server required.

```bash
python sim_math.py --profile profiles/casual.json --days 30
```

### Layer 2 — API Bot (live server)
Drives the game API directly. Requires a running server and `.env` with credentials.

```bash
python sim_api.py --profile profiles/power_gamer.json --duration 3600
```

### Layer 3 — Browser Bot (end-to-end)
Drives the full browser UI via Playwright. Slowest but most realistic.

```bash
python sim_browser.py --profile profiles/new_user.json --headless
```

## Player Profiles

| Profile | Description |
|---|---|
| `casual` | 2 hr/day, moderate clicking, uses skills |
| `power_gamer` | 8 hr/day, max CPS, all boosts, ascendant tier |
| `idle_only` | No active play, pure idle training |
| `no_autoskills` | Active clicker, never trains idle skills |
| `new_user` | Slow clicks, random upgrade decisions |

## Interpreting Results

Results are written to `results/` as JSON and optional PNG charts.

Key metrics to check:
- `hours_to_cap` — should be ~60 for `casual` profile
- `essence_per_hour` — cross-profile ratio should stay within 3x of casual baseline
- `skill_unlock_day` — first meaningful skill unlock should appear before day 3

## Full Spec

See `docs/specs/2026-03-20-simulation-toolkit-design.md` for architecture details, balancing targets, and extension guide.
