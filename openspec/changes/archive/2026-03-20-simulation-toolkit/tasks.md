# Simulation & Progression Balancing Toolkit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a simulation toolkit that validates and tunes all game scaling parameters to hit the 60-hour casual completion target across all player archetypes.

**Architecture:** Four-layer toolkit (math model → API bot → browser bot → results) preceded by API documentation generation. Each layer validates the previous. All tools are standalone Python scripts in `tools/sim/`, producing structured results in `tools/sim/results/`.

**Tech Stack:** Python 3.13, httpx (async HTTP), Playwright (headless browser), pytest (tool validation), matplotlib/plotly (charts for CSV export)

**Spec:** `docs/specs/2026-03-20-simulation-toolkit-design.md`

**Key Reference Files:**
- Scaling formulas & configs: `docs/SIM_PROC_BAL_SESSION_STATE.md`
- Game loop mechanics: `docs/done/recs/2.0_GAME_LOOP.md`
- Story mode endpoints: `backend/routes/story_mode.py`
- Game endpoints: `backend/routes/game.py`
- Training endpoints: `backend/routes/game_training.py`
- Character progression: `backend/routes/character_progression.py`
- Auth: `backend/routes/auth.py`
- Characters: `backend/routes/characters.py`
- Anti-cheat: `docs/done/recs/2.6_ECONOMY_ANTICHEAT.md`
- Docker setup: `docker-compose.yml`

---

## Phase 1: API Documentation

**Goal:** Generate a comprehensive API reference from the FastAPI backend routes. This becomes the contract for the simulation bot and a permanent admin reference.

### Task 1.1: Scan Backend Routes & Generate API Reference

**Files:**
- Read: `backend/routes/*.py` (all 43 route modules)
- Read: `backend/main.py` (route registration, middleware)
- Create: `docs/inst/API_REFERENCE.md`

- [ ] **Step 1: Read all route files and extract endpoint signatures**

Scan every file in `backend/routes/`. For each `@router` decorated function, extract:
- HTTP method and path
- Function name and docstring
- Request body model (if any)
- Response model (if any)
- Auth dependency (`get_current_player`, `get_current_admin`, or none)
- Any relevant decorators or middleware

Read `backend/main.py` to understand how routers are mounted (prefix paths) and what middleware applies.

- [ ] **Step 2: Organize endpoints by actual domain grouping**

Group endpoints based on how they're actually registered in `main.py`, not assumed categories. Known groups from route scanning:

| Router Module | Mount Prefix | Auth |
|--------------|-------------|------|
| `auth` | `/api/auth` | None (login) / Player (logout) |
| `characters` | `/api/characters` | Player |
| `game` | `/api/game` | Player |
| `story_mode` | `/api/game/story` | Player |
| `game_training` | `/api/game/training` | Player |
| `character_progression` | `/api/game` | Player |
| `inventory` | TBD | Player |
| `shop` | TBD | Player |
| `payments` | TBD | Player |
| `subscriptions` | TBD | Player |
| `marketplace` | TBD | Player |
| `chat` | TBD | Player |
| `home_base` | TBD | Player |
| `audio` | TBD | Player |
| `public` | TBD | None |
| `admin_*` (25+ modules) | `/api/admin/...` | Admin |

Update groupings based on what you actually find.

- [ ] **Step 3: Write `docs/inst/API_REFERENCE.md`**

For each endpoint, document:
```markdown
### `POST /api/game/story/session/start`
**Auth:** Player (Firebase JWT)
**Request Body:** `SessionStartRequest`
- `scene_id` (int) — Scene to enter
- `character_id` (int) — Active character

**Response:** Session object with `session_id`, `current_zone`, `current_wave`, etc.

**Notes:** Creates or resumes an active session. Only one active session per player.
```

Include request/response model field definitions. Note anti-cheat behavior where relevant (CPS clamping on `/tick`, gold correction on `/complete`, etc.).

- [ ] **Step 4: Verify completeness against OpenAPI**

Start the Docker stack and hit `http://localhost:8000/docs` or `http://localhost:8000/openapi.json` to cross-reference your manually extracted docs against FastAPI's auto-generated OpenAPI spec. Fill in any gaps.

Run: `docker-compose up --build -d`
Then: `curl http://localhost:8000/openapi.json | python -m json.tool > /tmp/openapi_check.json`

- [ ] **Step 5: Commit API reference**

```bash
git add docs/inst/API_REFERENCE.md
git commit -m "docs: add comprehensive API reference for all backend endpoints"
```

### Task 1.2: Update Admin Documentation

**Files:**
- Read: `admin/README.md` (currently minimal Vite template)
- Create or Modify: `admin/README.md` — expanded with API reference section
- Create: `admin/docs/API_GUIDE.md` — admin-facing API usage guide

- [ ] **Step 1: Read current admin README and assess**

Read `admin/README.md`. It's currently a generic Vite template. Plan the expansion.

- [ ] **Step 2: Write `admin/docs/API_GUIDE.md`**

Create an admin-focused API guide that covers:
- How to authenticate (Firebase JWT flow, dev spoofing mechanism)
- Key endpoints for debugging/testing (session state, player progression, config management)
- How to use the admin endpoints for player management, config tuning, content editing
- Example curl commands for common operations

- [ ] **Step 3: Update `admin/README.md`**

Expand with:
- Project overview (what the admin dashboard does)
- Setup instructions (Docker, local dev)
- Link to `docs/API_GUIDE.md`
- Link to `docs/inst/API_REFERENCE.md`

- [ ] **Step 4: Commit admin docs**

```bash
git add admin/README.md admin/docs/API_GUIDE.md
git commit -m "docs: add admin API guide and expand admin README"
```

---

## Phase 2: Math Model

**Goal:** Build a Python script that crunches all scaling formulas offline and produces baseline progression predictions for all player archetypes.

### Task 2.1: Scaffold Simulation Toolkit Directory

**Files:**
- Create: `tools/sim/README.md`
- Create: `tools/sim/requirements.txt`
- Create: `tools/sim/profiles/casual.json`
- Create: `tools/sim/profiles/power_gamer.json`
- Create: `tools/sim/profiles/idle_only.json`
- Create: `tools/sim/profiles/no_autoskills.json`
- Create: `tools/sim/profiles/new_user.json`
- Create: `tools/sim/results/.gitkeep`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p tools/sim/profiles tools/sim/results
```

- [ ] **Step 2: Write `tools/sim/requirements.txt`**

```
httpx>=0.27.0
playwright>=1.40.0
matplotlib>=3.8.0
psycopg2-binary>=2.9.0
python-dotenv>=1.0.0
```

- [ ] **Step 3: Write player profile JSON files**

Each profile defines the simulation parameters for that archetype:

`tools/sim/profiles/casual.json`:
```json
{
  "name": "casual",
  "description": "Average player, 2hr/day, moderate clicking, uses skills",
  "cps_range": [8, 12],
  "wpm": 200,
  "upgrade_strategy": "buy_when_affordable",
  "use_skills": true,
  "skill_timing": "on_cooldown",
  "session_length_minutes": 120,
  "sessions_per_day": 1,
  "idle_training": true,
  "idle_hours_per_day": 22,
  "subscription_tier": null,
  "boosters": []
}
```

`tools/sim/profiles/power_gamer.json`:
```json
{
  "name": "power_gamer",
  "description": "Optimized play, 8hr/day, max CPS, all boosts",
  "cps_range": [20, 20],
  "wpm": 600,
  "upgrade_strategy": "optimal",
  "use_skills": true,
  "skill_timing": "perfect",
  "session_length_minutes": 480,
  "sessions_per_day": 1,
  "idle_training": true,
  "idle_hours_per_day": 16,
  "subscription_tier": "ascendant",
  "boosters": ["essence_2x"]
}
```

`tools/sim/profiles/idle_only.json`:
```json
{
  "name": "idle_only",
  "description": "No active play, just idle training, reconnects every 8h",
  "cps_range": [0, 0],
  "wpm": 0,
  "upgrade_strategy": "none",
  "use_skills": false,
  "skill_timing": "none",
  "session_length_minutes": 0,
  "sessions_per_day": 0,
  "idle_training": true,
  "idle_hours_per_day": 24,
  "subscription_tier": null,
  "boosters": []
}
```

`tools/sim/profiles/no_autoskills.json`:
```json
{
  "name": "no_autoskills",
  "description": "Active clicking but never trains idle skills",
  "cps_range": [8, 12],
  "wpm": 200,
  "upgrade_strategy": "buy_when_affordable",
  "use_skills": false,
  "skill_timing": "none",
  "session_length_minutes": 120,
  "sessions_per_day": 1,
  "idle_training": false,
  "idle_hours_per_day": 0,
  "subscription_tier": null,
  "boosters": []
}
```

`tools/sim/profiles/new_user.json`:
```json
{
  "name": "new_user",
  "description": "Confused new player, slow clicks, bad upgrade decisions",
  "cps_range": [2, 5],
  "wpm": 200,
  "upgrade_strategy": "random",
  "use_skills": false,
  "skill_timing": "none",
  "session_length_minutes": 30,
  "sessions_per_day": 1,
  "idle_training": false,
  "idle_hours_per_day": 0,
  "subscription_tier": null,
  "boosters": []
}
```

- [ ] **Step 4: Write `tools/sim/README.md`**

Quick-start guide covering:
- Purpose of the toolkit
- How to install dependencies (`pip install -r requirements.txt`)
- How to run each layer (math model, API bot, browser bot)
- How to interpret results
- Link to full spec: `docs/specs/2026-03-20-simulation-toolkit-design.md`

- [ ] **Step 5: Commit scaffold**

```bash
git add tools/sim/
git commit -m "feat: scaffold simulation toolkit directory and player profiles"
```

### Task 2.2: Build Math Model Core — Config & Formulas

**Files:**
- Create: `tools/sim/config.py` — game config constants and formula functions
- Create: `tools/sim/tests/test_config.py` — validate formulas match expected values

- [ ] **Step 1: Write formula validation tests**

Create `tools/sim/tests/test_config.py`:
```python
"""Validate scaling formulas match expected values from SIM_PROC_BAL_SESSION_STATE.md"""
import pytest
from tools.sim.config import (
    zone_hp, zone_gold, essence_conversion, click_damage,
    xp_to_level, DEFAULT_CONFIGS
)

def test_zone_hp_known_values():
    """Zone HP: 10 * (1.55^(zone-1) + zone - 1)"""
    assert zone_hp(1) == 10  # 10 * (1 + 0) = 10
    assert abs(zone_hp(5) - 143) < 1
    assert abs(zone_hp(10) - 2063) < 1
    assert abs(zone_hp(20) - 253000) < 1000  # approximate

def test_zone_gold_known_values():
    """Gold per kill: 5 * (1.1^(zone-1) + zone - 1)"""
    assert zone_gold(1) == 5  # 5 * (1 + 0)

def test_xp_to_level():
    """XP to level N = 1000 * N^2"""
    assert xp_to_level(10) == 100_000
    assert xp_to_level(50) == 2_500_000
    assert xp_to_level(99) == 9_801_000

def test_click_damage_base():
    """base_mult = 1 + (level * 0.05)"""
    assert click_damage(level=0) == 1.0
    assert click_damage(level=20) == 2.0
    assert click_damage(level=100) == 6.0

def test_default_configs_present():
    """All config keys from SIM_PROC_BAL_SESSION_STATE exist"""
    required = [
        'hp_scaling_factor', 'monsters_per_zone', 'gold_to_essence_base_rate',
        'gold_to_essence_growth_factor', 'upgrade_cost_scaling',
        'click_dmg_mult_per_level', 'crit_chance', 'crit_multiplier',
        'char_level_xp_factor', 'char_xp_per_scene_base',
        'idle_essence_drain_per_minute', 'idle_offline_cap_hours',
        'wave_duration_seconds', 'milestone_start', 'milestone_interval'
    ]
    for key in required:
        assert key in DEFAULT_CONFIGS, f"Missing config: {key}"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd tools/sim && python -m pytest tests/test_config.py -v
```
Expected: ImportError — `config` module doesn't exist yet.

- [ ] **Step 3: Implement `tools/sim/config.py`**

```python
"""Game configuration constants and scaling formulas.

All formulas sourced from docs/SIM_PROC_BAL_SESSION_STATE.md.
Config values match game_configs table defaults.
"""
import json
import math
from pathlib import Path

# Default game_configs values (from DB / SIM_PROC_BAL_SESSION_STATE.md)
DEFAULT_CONFIGS = {
    'hp_scaling_factor': 1.55,
    'monsters_per_zone': 10,
    'gold_to_essence_base_rate': 1000,
    'gold_to_essence_growth_factor': 1.07,
    'upgrade_cost_scaling': 1.07,
    'click_dmg_mult_per_level': 0.05,
    'auto_dps_mult_per_level': 0.05,
    'crit_chance': 0.02,
    'crit_multiplier': 2.0,
    'char_level_xp_factor': 1000,
    'char_xp_per_scene_base': 50,
    'idle_essence_drain_per_minute': 1,
    'idle_offline_cap_hours': 24,
    'session_gold_multiplier': 1.0,
    'first_clear_multiplier': 1.5,
    'default_player_wpm': 200,
    'wave_duration_seconds': 30,
    'milestone_start': 200,
    'milestone_interval': 25,
    'click_rate_cap': 20,
}


def load_config_overrides(path: str | None = None) -> dict:
    """Load config overrides from JSON file, merge with defaults."""
    config = DEFAULT_CONFIGS.copy()
    if path:
        with open(path) as f:
            data = json.load(f)
            config.update(data.get('overrides', {}))
    return config


def zone_hp(zone: int, scaling_factor: float = 1.55) -> float:
    """HP = 10 * (scaling_factor^(zone-1) + zone - 1)"""
    return 10 * (scaling_factor ** (zone - 1) + zone - 1)


def zone_gold(zone: int) -> float:
    """gold_per_kill = 5 * (1.1^(zone-1) + zone - 1)"""
    return 5 * (1.1 ** (zone - 1) + zone - 1)


def essence_conversion(session_gold: float, zone: int) -> float:
    """converted_essence = session_gold / (1000 * 1.07^(zone-1))"""
    effective_rate = 1000 * 1.07 ** (zone - 1)
    return session_gold / effective_rate


def click_damage(level: int, base_mult_per_level: float = 0.05) -> float:
    """base_mult = 1 + (level * 0.05). Milestones added separately."""
    return 1 + (level * base_mult_per_level)


def milestone_multiplier(level: int, start: int = 200, interval: int = 25) -> float:
    """4x every 25 levels from level 200, 10x every 1000 levels."""
    mult = 1.0
    if level >= start:
        mult *= 4 ** ((level - start) // interval + 1)
    if level >= 1000:
        mult *= 10 ** (level // 1000)
    return mult


def upgrade_cost(base_cost: float, level: int, scaling: float = 1.07) -> float:
    """Cost = base * scaling^(level-1)"""
    return base_cost * scaling ** (level - 1)


def xp_to_level(n: int, factor: int = 1000) -> int:
    """Total XP required to reach level N = factor * N^2"""
    return factor * n * n


def idle_xp_per_hour(tick_interval_s: float, xp_per_tick: float) -> float:
    """XP gained per hour of idle training."""
    ticks_per_hour = 3600 / tick_interval_s
    return ticks_per_hour * xp_per_tick


def time_to_kill(hp: float, dps: float) -> float:
    """Seconds to kill an enemy with given HP at given DPS."""
    if dps <= 0:
        return float('inf')
    return hp / dps
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd tools/sim && python -m pytest tests/test_config.py -v
```
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/sim/config.py tools/sim/tests/
git commit -m "feat: add game config constants and scaling formula functions with tests"
```

### Task 2.3: Build Math Model — Simulation Engine

**Files:**
- Create: `tools/sim/math_model.py` — main simulation runner
- Create: `tools/sim/tests/test_math_model.py` — validate simulation output structure

- [ ] **Step 1: Write output structure tests**

`tools/sim/tests/test_math_model.py`:
```python
"""Validate math model produces correctly structured output."""
import pytest
from tools.sim.math_model import run_simulation
from tools.sim.config import DEFAULT_CONFIGS

def test_simulation_output_has_required_sections():
    result = run_simulation('casual', DEFAULT_CONFIGS)
    assert 'zone_progression' in result
    assert 'economy_flow' in result
    assert 'xp_curve' in result
    assert 'content_timeline' in result
    assert 'wall_detection' in result
    assert 'min_power_gates' in result
    assert 'boss_dps_checks' in result
    assert 'summary' in result

def test_zone_progression_has_entries():
    result = run_simulation('casual', DEFAULT_CONFIGS)
    zones = result['zone_progression']
    assert len(zones) > 0
    first = zones[0]
    assert 'zone' in first
    assert 'hp' in first
    assert 'gold_per_kill' in first
    assert 'time_to_kill_seconds' in first

def test_wall_detection_flags_hard_zones():
    result = run_simulation('no_autoskills', DEFAULT_CONFIGS)
    walls = result['wall_detection']
    # No-autoskills player should hit at least one wall
    assert isinstance(walls, list)

def test_summary_has_completion_estimate():
    result = run_simulation('casual', DEFAULT_CONFIGS)
    summary = result['summary']
    assert 'total_hours_estimate' in summary
    assert 'book_1_hours' in summary
    assert 'book_2_hours' in summary
    assert 'book_3_hours' in summary
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd tools/sim && python -m pytest tests/test_math_model.py -v
```
Expected: ImportError.

- [ ] **Step 3: Implement `tools/sim/math_model.py`**

This is the main simulation engine. It must:

1. Load a player profile from `profiles/<name>.json`
2. Load config (defaults + optional overrides via `--config`)
3. Run all simulations from spec Section 5.3:
   - Zone progression (5.3.1)
   - Economy flow (5.3.2)
   - XP & leveling (5.3.3)
   - Content timeline (5.3.4) — uses DB snapshot or hardcoded scene counts
   - Archetype projections (5.3.5)
   - Wall detection (5.3.6)
   - Min power gating (5.3.7)
   - Boss DPS checks (5.3.8)
4. Output results to JSON + CSV + RESULTS.md

**Key implementation notes:**
- Content timeline needs scene/chapter counts and word counts. For offline mode, use a snapshot of the DB data (query it once and save to `tools/sim/data/content_snapshot.json`). Provide a `--refresh-content` flag that queries the live DB.
- Boss data (HP, enrage timers, interrupt config) should also come from a DB snapshot or be hardcoded from the current `boss_config` JSONB values.
- The simulation should model time progression day-by-day: for each simulated day, calculate how much progress the profile makes in their session, then apply idle training for the remaining hours.

CLI interface:
```bash
# Run for a single profile
python math_model.py --profile casual

# Run for all profiles
python math_model.py --all

# With config overrides
python math_model.py --profile casual --config results/config_overrides.json

# Refresh content data from live DB
python math_model.py --profile casual --refresh-content
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd tools/sim && python -m pytest tests/test_math_model.py -v
```
Expected: All PASS.

- [ ] **Step 5: Run first simulation and verify output**

```bash
cd tools/sim && python math_model.py --all
```

Check that `results/math_model_run_001.json` and `results/math_model_run_001.csv` are created. Review `results/RESULTS.md` for the summary.

- [ ] **Step 6: Commit**

```bash
git add tools/sim/math_model.py tools/sim/tests/test_math_model.py
git commit -m "feat: add math model simulation engine with zone/economy/XP/boss analysis"
```

### Task 2.4: Content Data Snapshot

**Files:**
- Create: `tools/sim/data/content_snapshot.py` — script to query DB and save content data
- Create: `tools/sim/data/content_snapshot.json` — output (gitignored until first run)

- [ ] **Step 1: Write content snapshot script**

Script connects to the DB (connection string from `backend/.env`) and queries:
```sql
-- Scene and chapter counts per book
SELECT b.id as book_id, b.title, COUNT(DISTINCT c.id) as chapters, COUNT(DISTINCT s.id) as scenes
FROM books b JOIN chapters c ON c.book_id = b.id JOIN scenes s ON s.chapter_id = c.id
GROUP BY b.id, b.title ORDER BY b.id;

-- Word counts per scene
SELECT s.id, s.title, c.chapter_number, b.id as book_id,
       SUM(LENGTH(sb.text_content) - LENGTH(REPLACE(sb.text_content, ' ', '')) + 1) as word_count
FROM scenes s
JOIN story_beats sb ON sb.scene_id = s.id
JOIN chapters c ON c.id = s.chapter_id
JOIN books b ON b.id = c.book_id
GROUP BY s.id, s.title, c.chapter_number, b.id;

-- Boss configs
SELECT c.chapter_number, b.id as book_id, c.boss_config
FROM chapters c JOIN books b ON b.id = c.book_id
WHERE c.boss_config IS NOT NULL;

-- Skill definitions (for idle training modeling)
SELECT id, name, tick_interval_seconds, xp_per_tick, auto_dps_base, auto_dps_bonus
FROM skills;
```

Saves to `tools/sim/data/content_snapshot.json`.

- [ ] **Step 2: Run the snapshot (requires Docker stack running)**

```bash
cd tools/sim && python data/content_snapshot.py
```

- [ ] **Step 3: Commit**

```bash
git add tools/sim/data/content_snapshot.py
git commit -m "feat: add content snapshot script for math model data"
```

---

## Phase 3: API Bot

**Goal:** Build a Python bot that simulates player behavior against the real running backend, validating the math model's predictions.

### Task 3.1: Build API Client

**Files:**
- Create: `tools/sim/api_client.py` — async HTTP client wrapping all game endpoints
- Create: `tools/sim/tests/test_api_client.py` — validate client methods exist and have correct signatures

- [ ] **Step 1: Write client interface tests**

Test that the client class has all required methods with correct signatures. These are structural tests — actual API integration tests come in Task 3.2.

```python
"""Validate API client interface."""
import inspect
from tools.sim.api_client import GameAPIClient

def test_client_has_required_methods():
    required = [
        'login', 'create_character', 'get_map',
        'start_session', 'tick', 'buy_upgrade', 'activate_skill',
        'update_narrative', 'complete_session',
        'start_training', 'stop_training', 'get_training_status',
        'get_character_stats', 'get_character_level',
    ]
    for method in required:
        assert hasattr(GameAPIClient, method), f"Missing method: {method}"
        assert callable(getattr(GameAPIClient, method))

def test_client_accepts_base_url():
    client = GameAPIClient(base_url="http://localhost:8000", auth_token="test")
    assert client.base_url == "http://localhost:8000"
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement `tools/sim/api_client.py`**

Async HTTP client using `httpx.AsyncClient`. Each method maps to one API endpoint:

```python
class GameAPIClient:
    def __init__(self, base_url: str, auth_token: str):
        self.base_url = base_url
        self.headers = {"Authorization": f"Bearer {auth_token}"}
        self.client = httpx.AsyncClient(base_url=base_url, headers=self.headers, timeout=30.0)
        self.metrics = {"requests": 0, "errors": 0, "response_times": []}

    async def login(self, firebase_token: str) -> dict: ...
    async def start_session(self, scene_id: int, character_id: int) -> dict: ...
    async def tick(self, session_id: str, clicks: int, elapsed_ms: int) -> dict: ...
    async def buy_upgrade(self, session_id: str, upgrade_type: str, target_id: int) -> dict: ...
    async def activate_skill(self, session_id: str, skill_id: int) -> dict: ...
    async def update_narrative(self, session_id: str, progress_pct: float) -> dict: ...
    async def complete_session(self, session_id: str) -> dict: ...
    async def start_training(self, skill_id: int, action_id: int) -> dict: ...
    async def stop_training(self) -> dict: ...
    # ... etc
```

Error handling per spec Section 6.5:
- 5xx: retry up to 3 times with exponential backoff
- Timeouts: log and continue
- All responses logged with timing for metrics

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add tools/sim/api_client.py tools/sim/tests/test_api_client.py
git commit -m "feat: add async API client for game endpoint simulation"
```

### Task 3.2: Build API Bot Simulation Runner

**Files:**
- Create: `tools/sim/api_bot.py` — main bot runner with profile-driven behavior
- Create: `tools/sim/tests/test_api_bot.py` — validate bot behavior logic

- [ ] **Step 1: Write bot behavior tests**

Test the decision-making logic (not API calls):
- Given a casual profile and current state, what action does the bot take next?
- Given gold amount X and upgrade costs, does `buy_when_affordable` strategy buy the right upgrade?
- Does `optimal` strategy always buy the highest-DPS-per-gold upgrade?

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement `tools/sim/api_bot.py`**

The bot runner:
1. Loads a profile from `profiles/<name>.json`
2. Creates a test player via auth spoofing (or uses an existing test account)
3. Enters the game loop:
   - Get map → find next available scene
   - Start session → enter tick loop
   - Each tick: send clicks based on profile CPS, receive server state
   - Buy upgrades based on strategy
   - Activate skills based on timing profile
   - Update narrative progress based on WPM
   - When both conditions met → complete session
   - Repeat for next scene
4. Between sessions: start/manage idle training if profile allows
5. Collect all metrics into structured output
6. After run: compare against math model predictions (if available)

CLI interface:
```bash
# Run single profile
python api_bot.py --profile casual --base-url http://localhost:8000

# Run all profiles
python api_bot.py --all --base-url http://localhost:8000

# With config overrides (applied to comparison, not to server)
python api_bot.py --profile casual --config results/config_overrides.json

# Limit to N scenes (for quick testing)
python api_bot.py --profile casual --max-scenes 5
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Integration test against live Docker stack**

```bash
docker-compose up --build -d
cd tools/sim && python api_bot.py --profile casual --max-scenes 3
```

Verify output files created and metrics look reasonable.

- [ ] **Step 6: Commit**

```bash
git add tools/sim/api_bot.py tools/sim/tests/test_api_bot.py
git commit -m "feat: add API bot simulation runner with profile-driven behavior"
```

### Task 3.3: Build Comparison Tool

**Files:**
- Create: `tools/sim/results/compare.py`
- Create: `tools/sim/tests/test_compare.py`

- [ ] **Step 1: Write comparison tests**

Test that given two mock run JSON files, the comparison tool:
- Identifies changed config values
- Calculates metric deltas (absolute and percentage)
- Flags changes > 5% as significant
- Highlights improvements > 10%

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement `tools/sim/results/compare.py`**

```bash
# Usage
python results/compare.py math_model_run_001.json math_model_run_002.json
```

Output: formatted diff showing what changed, whether metrics moved toward or away from targets.

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add tools/sim/results/compare.py tools/sim/tests/test_compare.py
git commit -m "feat: add run comparison tool for simulation results"
```

---

## Phase 4: Browser Bot

**Goal:** Build a Playwright-based headless browser bot for stability testing, pacing validation, and load testing.

### Task 4.1: Build Browser Bot Core

**Files:**
- Create: `tools/sim/browser_bot.py` — Playwright headless bot
- Create: `tools/sim/tests/test_browser_bot.py` — validate bot setup and click dispatch

- [ ] **Step 1: Write browser bot structure tests**

Test that the bot class:
- Can initialize with a profile and target URL
- Has methods for each test suite (sustained_play, pacing, load_test, endurance)
- Uses `page.evaluate()` for click dispatch (not `page.click()`)

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement `tools/sim/browser_bot.py`**

Key implementation details:
- Use `page.evaluate()` to dispatch synthetic click events at 20 CPS (spec Section 7.2.1)
- Monitor browser memory via `page.evaluate(() => performance.memory)` (Chrome only)
- Capture console errors via `page.on('console')`
- For load testing beyond ~10 users, spawn API bot instances instead of browsers (spec resource note)

Test suites:
- `sustained_play(duration_hours, cps)` — clicks for N hours, monitors stability
- `pacing_validation(chapter, wpm)` — plays through scenes, measures timing
- `load_test(concurrent_users, docker_cpu, docker_memory)` — mixed API bot + 1-2 browsers
- `endurance_farming(duration_hours)` — max gear, max CPS, one scene forever

CLI interface:
```bash
# Sustained play test
python browser_bot.py --test sustained --duration 2 --cps 20

# Pacing validation
python browser_bot.py --test pacing --chapter 1 --wpm 200

# Load test
python browser_bot.py --test load --users 10 --cpu 1 --memory 512

# Endurance farming
python browser_bot.py --test endurance --duration 4
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Smoke test against live Docker stack**

```bash
docker-compose up --build -d
cd tools/sim && python browser_bot.py --test sustained --duration 0.1 --cps 10
```

Run for 6 minutes as a smoke test. Verify output file created.

- [ ] **Step 6: Commit**

```bash
git add tools/sim/browser_bot.py tools/sim/tests/test_browser_bot.py
git commit -m "feat: add Playwright browser bot for stability and load testing"
```

---

## Phase 5: Results, Iteration & Migration

**Goal:** Build the iteration workflow tooling and the migration generator.

### Task 5.1: Build Migration Generator

**Files:**
- Create: `tools/sim/generate_migration.py`
- Create: `tools/sim/tests/test_generate_migration.py`

- [ ] **Step 1: Write migration generator tests**

Test that given a config overrides JSON, the generator:
- Produces valid SQL UPDATE statements
- Only includes changed values (not defaults)
- Outputs to `db/062_balanced_game_configs.sql`

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement `tools/sim/generate_migration.py`**

Reads `results/config_overrides.json` and generates:
```sql
-- Migration 062: Balanced Game Configs
-- Generated by simulation toolkit on YYYY-MM-DD
-- Based on simulation runs: [list of run IDs used]

UPDATE game_configs SET value_json = '1.45' WHERE key = 'hp_scaling_factor';
UPDATE game_configs SET value_json = '800' WHERE key = 'gold_to_essence_base_rate';
-- ... etc
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add tools/sim/generate_migration.py tools/sim/tests/test_generate_migration.py
git commit -m "feat: add migration generator for tuned game configs"
```

### Task 5.2: Write Toolkit Guide

**Files:**
- Create: `docs/inst/SIM_TOOLKIT_GUIDE.md`

- [ ] **Step 1: Write comprehensive toolkit guide**

Cover:
- Purpose and overview (link to spec)
- Prerequisites (Python, Docker, playwright install)
- Running each layer with example commands
- Interpreting RESULTS.md output
- The iteration workflow: run model → run bot → compare → tune → repeat
- How to generate migration 062 when tuning is complete
- Post-simulation checklist (spoofing lockdown)

- [ ] **Step 2: Update `docs/SIM_PROC_BAL_SESSION_STATE.md`**

Add a reference to the toolkit:
```markdown
## Toolkit Reference
The simulation toolkit automates Sessions 1-4 of this plan.
See `docs/inst/SIM_TOOLKIT_GUIDE.md` for usage.
See `docs/specs/2026-03-20-simulation-toolkit-design.md` for full spec.
```

- [ ] **Step 3: Commit**

```bash
git add docs/inst/SIM_TOOLKIT_GUIDE.md docs/SIM_PROC_BAL_SESSION_STATE.md
git commit -m "docs: add simulation toolkit guide and update session state reference"
```

### Task 5.3: Update TODO.md

**Files:**
- Modify: `docs/TODO.md`

- [ ] **Step 1: Update Simulation & Progression Balancing section**

Replace the current checklist with references to the toolkit:
- Link to the spec and plan documents
- Add tasks for running each simulation phase
- Keep the spoofing lockdown section as-is (already added)

- [ ] **Step 2: Commit**

```bash
git add docs/TODO.md
git commit -m "docs: update TODO with simulation toolkit references"
```

---

## Phase 6: First Iteration Run

**Goal:** Execute the first full simulation cycle to establish baseline measurements.

### Task 6.1: Run Math Model Baseline

- [ ] **Step 1: Start Docker stack**

```bash
docker-compose up --build -d
```

- [ ] **Step 2: Capture content snapshot from live DB**

```bash
cd tools/sim && python data/content_snapshot.py
```

- [ ] **Step 3: Run math model for all profiles**

```bash
python math_model.py --all
```

- [ ] **Step 4: Review RESULTS.md — identify walls, min power gaps, pacing issues**

- [ ] **Step 5: Commit baseline results**

```bash
git add tools/sim/results/ tools/sim/data/content_snapshot.json
git commit -m "data: first math model baseline run results"
```

### Task 6.2: Run API Bot Validation

- [ ] **Step 1: Run API bot for casual profile (limited scenes)**

```bash
python api_bot.py --profile casual --max-scenes 5
```

- [ ] **Step 2: Compare API bot results to math model predictions**

```bash
python results/compare.py math_model_run_001.json api_bot_run_001.json
```

- [ ] **Step 3: Identify divergences — update math model formulas if needed**

If divergence > 10%, investigate:
- Is the math model using a different formula than the server?
- Is there server-side logic the model doesn't account for?

- [ ] **Step 4: Re-run math model if formulas were corrected**

- [ ] **Step 5: Commit calibrated results**

```bash
git add tools/sim/
git commit -m "data: API bot validation run and math model calibration"
```

### Task 6.3: First Tuning Pass

- [ ] **Step 1: Based on baseline results, create `results/config_overrides.json`**

Adjust configs to move casual completion time toward 60 hours. Common adjustments:
- `hp_scaling_factor`: increase/decrease zone difficulty curve
- `gold_to_essence_base_rate`: adjust economy pacing
- `char_level_xp_factor`: speed up or slow down leveling
- Boss `hp_multiplier` values: tune min power gates

- [ ] **Step 2: Re-run math model with overrides**

```bash
python math_model.py --all --config results/config_overrides.json
```

- [ ] **Step 3: Compare tuned vs baseline**

```bash
python results/compare.py math_model_run_001.json math_model_run_002.json
```

- [ ] **Step 4: Iterate until casual profile projects ~60 hours total**

- [ ] **Step 5: Commit tuned results**

```bash
git add tools/sim/results/
git commit -m "data: first tuning pass - adjusted configs toward 60hr casual target"
```
