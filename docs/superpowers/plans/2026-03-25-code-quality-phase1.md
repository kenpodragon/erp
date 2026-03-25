# Code Quality Phase 1: Test Audit & Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit all existing tests, classify coverage gaps, and add behavioral tests for the 12 god-class files before any refactoring begins.

**Architecture:** Test-first approach. Generate a coverage gap report, then fill critical gaps with behavioral tests using existing frameworks (pytest, Vitest + RTL). No new test infrastructure.

**Tech Stack:** pytest (backend), Vitest + React Testing Library (frontend/admin), existing mock infrastructure (Firebase, API, PixiJS stubs)

---

## Task 1: Generate Test Audit Report

**Files:**
- Create: `docs/superpowers/specs/test-audit-report.md`

- [ ] **Step 1: Create the test audit report**

Write the audit report based on the analysis already performed. This documents the current state for future reference.

```markdown
# Test Audit Report — Code Quality Phase 1

**Date:** 2026-03-25
**Scope:** 12 god-class files across backend, frontend, and admin

---

## Backend Test Coverage

### routes/story_mode.py (1,833 lines)
**Test file:** `backend/tests/test_story_mode.py` (660 lines)
**Classification:** BEHAVIORAL (33+ tests across 9 test classes)
**Coverage:** Strong. Tests cover configs, narrative, enemies, session lifecycle, combat ticks, boss encounters, progression locks, and transitions.
**Gaps:**
- POST `/session/{id}/upgrade` — no test
- POST `/session/{id}/skill` — no test
- GET `/session/{id}` — no test

### services/admin_character_service.py (1,506 lines)
**Test file:** `backend/tests/test_admin_characters.py` (710 lines)
**Classification:** BEHAVIORAL (24 tests across 7 test classes)
**Coverage:** Excellent. Tests cover character CRUD, class reassignment with stat recalculation, stat breakdown, item crafting, artifact editing, and admin auth gates.
**Gaps:** None critical.

### routes/admin_game.py (1,453 lines)
**Test file:** `backend/tests/test_admin_game.py` (835 lines)
**Classification:** BEHAVIORAL (55 tests across 6 test classes)
**Coverage:** Comprehensive. Tests cover game configs, stat definitions, character classes, skills, benefit effects, and item components — all with edge cases (not found, no change, cascading deletes).
**Gaps:** None critical.

### services/admin_content_service.py (1,391 lines)
**Test file:** `backend/tests/test_admin_content.py` (1,179 lines)
**Classification:** BEHAVIORAL (73 tests across 13 test classes)
**Coverage:** Excellent. Tests cover all content CRUD, bulk operations, wave configs, locations, semantic tags, and audit logging.
**Gaps:** None critical.

---

## Frontend Test Coverage

### game/components/story/CombatStage.tsx (715 lines)
**Component-level test:** NONE
**E2E coverage:** `testing/story-mode.spec.ts` — 8 tests (indirect, Playwright)
**Classification:** STRUCTURAL ONLY (no component unit tests)
**Gaps:** No tests for combat state machine, damage calculation display, enemy spawning, wave advancement, auto-DPS, CPS enforcement, rare spawn injection, or animation lifecycle.

### game/components/story/BossStage.tsx (692 lines)
**Component-level test:** NONE
**E2E coverage:** `testing/story-mode.spec.ts` — indirect via story mode flow
**Classification:** STRUCTURAL ONLY
**Gaps:** No tests for boss HP tracking, timer countdown, interrupt system (click_burst, target_zone, whack_sequence), boss attack cycling, or enrage mechanics.

### game/components/StoryMode.tsx (567 lines)
**Component-level test:** NONE
**E2E coverage:** `testing/story-mode.spec.ts` — 8 tests (indirect)
**Classification:** STRUCTURAL ONLY
**Gaps:** No tests for session initialization, batch tick loop, gold accumulation, narrative progress tracking, farm mode, CPS violation state machine, or rare spawn handling.

### game/components/BottomAnimatedBanner.tsx (583 lines)
**Component-level test:** NONE
**E2E coverage:** None direct
**Classification:** NO COVERAGE
**Gaps:** No tests for enemy pool loading, character visual rendering, adaptive scaling, idle battle loop, or death/respawn mechanics.

---

## Admin Test Coverage

### pages/AssetRegistry.tsx (750 lines)
**Component-level test:** NONE
**E2E coverage:** `testing/admin-assets.spec.ts` — 7 tests (Playwright)
**Classification:** STRUCTURAL ONLY (E2E only)
**Gaps:** No unit tests for asset CRUD, category filtering, search debounce, orphan detection, bulk delete, JSON preview, or form validation.

### pages/PlayerDetail.tsx (706 lines)
**Component-level test:** NONE
**E2E coverage:** `testing/admin-players.spec.ts` — 6 tests (Playwright)
**Classification:** STRUCTURAL ONLY (E2E only)
**Gaps:** No unit tests for player data loading, ban/unban flow, alias editing, permission toggling, inventory expansion, or modal interactions.

### pages/AtmosphereEditor.tsx (672 lines)
**Component-level test:** NONE
**E2E coverage:** `testing/admin-content.spec.ts` — 1 test (loads with count)
**Classification:** STRUCTURAL ONLY (E2E only)
**Gaps:** No unit tests for atmosphere CRUD, archetype filtering, music JSON editing, audio preview, batch assign, or form validation.

### pages/ContentEditor.tsx (603 lines)
**Component-level test:** NONE
**E2E coverage:** `testing/admin-content.spec.ts` — indirect
**Classification:** STRUCTURAL ONLY (E2E only)
**Gaps:** No unit tests for tab switching, entity CRUD per tab, item component management, stat bonus editor, visual config editor, or affinities editor.

---

## Summary

| File | Existing Tests | Classification | Action Needed |
|------|---------------|----------------|---------------|
| story_mode.py | 33+ behavioral | BEHAVIORAL | Add 3 missing endpoint tests |
| admin_character_service.py | 24 behavioral | BEHAVIORAL | None |
| admin_game.py | 55 behavioral | BEHAVIORAL | None |
| admin_content_service.py | 73 behavioral | BEHAVIORAL | None |
| CombatStage.tsx | 0 component | NO UNIT TESTS | Add component tests |
| BossStage.tsx | 0 component | NO UNIT TESTS | Add component tests |
| StoryMode.tsx | 0 component | NO UNIT TESTS | Add component tests |
| BottomAnimatedBanner.tsx | 0 component | NO UNIT TESTS | Add component tests |
| AssetRegistry.tsx | 0 component | NO UNIT TESTS | Add component tests |
| PlayerDetail.tsx | 0 component | NO UNIT TESTS | Add component tests |
| AtmosphereEditor.tsx | 0 component | NO UNIT TESTS | Add component tests |
| ContentEditor.tsx | 0 component | NO UNIT TESTS | Add component tests |
```

- [ ] **Step 2: Commit the audit report**

```bash
rtk git add docs/superpowers/specs/test-audit-report.md
rtk git commit -m "docs: add test audit report for code quality phase 1"
```

---

## Task 2: Backend — Story Mode Missing Endpoint Tests

**Files:**
- Modify: `backend/tests/test_story_mode.py`
- Read: `backend/routes/story_mode.py` (lines for upgrade, skill, and get_session endpoints)

- [ ] **Step 1: Read the upgrade, skill, and get_session route handlers**

Read `backend/routes/story_mode.py` to find the exact handler signatures, request models, and response shapes for:
- `POST /session/{session_id}/upgrade`
- `POST /session/{session_id}/skill`
- `GET /session/{session_id}`

Note the request body models (`UpgradeRequest`, `SkillRequest`), query params, and what database operations each performs. You need this to write accurate tests.

- [ ] **Step 2: Write failing test for purchase_upgrade**

Add to `backend/tests/test_story_mode.py`:

```python
class TestPurchaseUpgrade:
    """Tests for POST /story/session/{id}/upgrade"""

    def test_upgrade_increases_level(self, full_client, test_scene, game_configs):
        # Start a session first
        resp = full_client.post("/story/session/start", json={"scene_id": test_scene.id})
        assert resp.status_code == 200
        session_id = resp.json()["session_id"]

        # Purchase an upgrade — read the UpgradeRequest model to determine
        # the exact field names and valid upgrade_type values
        resp = full_client.post(
            f"/story/session/{session_id}/upgrade",
            json={"upgrade_type": "click_damage"}  # adjust field names after reading route
        )
        assert resp.status_code == 200
        data = resp.json()
        # Verify the upgrade was applied — check that the relevant level increased
        assert data["click_upgrade_level"] >= 1  # adjust field name after reading route

    def test_upgrade_deducts_gold(self, full_client, test_scene, game_configs):
        resp = full_client.post("/story/session/start", json={"scene_id": test_scene.id})
        session_id = resp.json()["session_id"]
        initial_gold = resp.json()["gold"]

        resp = full_client.post(
            f"/story/session/{session_id}/upgrade",
            json={"upgrade_type": "click_damage"}
        )
        assert resp.status_code == 200
        # Gold should decrease (or stay 0 if cost > gold — check behavior)
        assert resp.json()["gold"] <= initial_gold

    def test_upgrade_insufficient_gold(self, full_client, test_scene, game_configs):
        resp = full_client.post("/story/session/start", json={"scene_id": test_scene.id})
        session_id = resp.json()["session_id"]

        # Try to upgrade with 0 gold — should fail or return error
        resp = full_client.post(
            f"/story/session/{session_id}/upgrade",
            json={"upgrade_type": "click_damage"}
        )
        # Verify appropriate error behavior (400 or gold unchanged)
        # Adjust assertion after reading route handler logic
        assert resp.status_code in (200, 400)

    def test_upgrade_session_not_found(self, full_client):
        import uuid
        resp = full_client.post(
            f"/story/session/{uuid.uuid4()}/upgrade",
            json={"upgrade_type": "click_damage"}
        )
        assert resp.status_code == 404
```

**Important:** After reading the actual route handler in Step 1, adjust field names (`upgrade_type`, `click_upgrade_level`, `gold`) to match the real request/response models. The structure above is the pattern — the field names are placeholders that MUST be replaced with real values.

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd backend && rtk python -m pytest tests/test_story_mode.py::TestPurchaseUpgrade -v
```

Expected: FAIL (tests should fail if field names need adjustment, or pass if the pattern matches)

- [ ] **Step 4: Fix any field name mismatches from Step 1 reading**

After running, fix any assertion errors caused by incorrect field names. Re-run until tests pass cleanly against the existing implementation.

- [ ] **Step 5: Write failing test for activate_skill**

Add to `backend/tests/test_story_mode.py`:

```python
class TestActivateSkill:
    """Tests for POST /story/session/{id}/skill"""

    def test_activate_skill_success(self, full_client, test_scene, game_configs, session):
        # Start session
        resp = full_client.post("/story/session/start", json={"scene_id": test_scene.id})
        assert resp.status_code == 200
        session_id = resp.json()["session_id"]

        # Need a skill to activate — read route to determine SkillRequest model
        # and what skills the test_character has available
        resp = full_client.post(
            f"/story/session/{session_id}/skill",
            json={"skill_id": 1}  # adjust after reading route + checking test fixtures
        )
        # Adjust expected status based on whether test_character has skills
        assert resp.status_code in (200, 400, 404)

    def test_skill_session_not_found(self, full_client):
        import uuid
        resp = full_client.post(
            f"/story/session/{uuid.uuid4()}/skill",
            json={"skill_id": 1}
        )
        assert resp.status_code == 404
```

**Important:** The skill test requires understanding what skills are available to the test character. Read the route handler and conftest fixtures to determine if you need to seed skill data. Add fixtures if needed.

- [ ] **Step 6: Write test for get_session_state**

Add to `backend/tests/test_story_mode.py`:

```python
class TestGetSessionState:
    """Tests for GET /story/session/{id}"""

    def test_returns_session_state(self, full_client, test_scene, game_configs):
        # Start a session
        resp = full_client.post("/story/session/start", json={"scene_id": test_scene.id})
        assert resp.status_code == 200
        session_id = resp.json()["session_id"]

        # Fetch session state
        resp = full_client.get(f"/story/session/{session_id}")
        assert resp.status_code == 200
        data = resp.json()
        # Verify essential session fields are present
        assert "session_id" in data or "id" in data
        assert "gold" in data or "current_gold" in data

    def test_session_not_found(self, full_client):
        import uuid
        resp = full_client.get(f"/story/session/{uuid.uuid4()}")
        assert resp.status_code == 404

    def test_session_belongs_to_player(self, full_client, test_scene, game_configs):
        # Start session as test player
        resp = full_client.post("/story/session/start", json={"scene_id": test_scene.id})
        session_id = resp.json()["session_id"]

        # Verify session is accessible by the same player
        resp = full_client.get(f"/story/session/{session_id}")
        assert resp.status_code == 200
```

- [ ] **Step 7: Run all new story mode tests**

```bash
cd backend && rtk python -m pytest tests/test_story_mode.py::TestPurchaseUpgrade tests/test_story_mode.py::TestActivateSkill tests/test_story_mode.py::TestGetSessionState -v
```

Expected: All PASS after field name adjustments.

- [ ] **Step 8: Run full backend test suite to verify no regressions**

```bash
cd backend && rtk python -m pytest -v
```

Expected: All 853+ tests PASS.

- [ ] **Step 9: Commit**

```bash
rtk git add backend/tests/test_story_mode.py
rtk git commit -m "test: add missing endpoint tests for story mode (upgrade, skill, get_session)"
```

---

## Task 3: Frontend — CombatStage Component Tests

**Files:**
- Create: `frontend/src/game/components/story/CombatStage.test.tsx`
- Read: `frontend/src/game/components/story/CombatStage.tsx` (for exact prop types and rendered elements)

- [ ] **Step 1: Read CombatStage.tsx for rendered DOM elements**

Read `frontend/src/game/components/story/CombatStage.tsx` to identify:
- What CSS classes or data-testid attributes are used
- What text content is rendered (HP bars, damage numbers, wave counters)
- What conditionals control rendering (boss mode, death state, etc.)
- The exact shape of the `StorySession` type used in props

You need this to write assertions against the actual DOM output.

- [ ] **Step 2: Create test file with mock session data**

Create `frontend/src/game/components/story/CombatStage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CombatStage from './CombatStage';

// Mock the game context if CombatStage uses useGame()
vi.mock('../../../contexts/GameContext', () => ({
  useGame: vi.fn(() => ({
    activeCharacter: { id: 1, level: 5, strength: 10, agility: 8, intelligence: 6 },
    // Add other context values as needed after reading the component
  })),
}));

// Build a minimal StorySession matching the real type
// IMPORTANT: Read CombatStage.tsx to get the exact fields used
const mockSession = {
  session_id: 'test-session-123',
  scene_id: 1,
  currentZone: 1,
  gold: 100,
  clickUpgradeLevel: 1,
  autoUpgradeLevel: 0,
  characterStrength: 10,
  clickDmgMultiplier: 1.0,
  autoDpsPerSecond: 0,
  autoDpsMultiplier: 1.0,
  autoUpgradeMultiplier: 1.0,
  darkRitualMultiplier: 1.0,
  wavesComplete: false,
  narrativeProgressPct: 0,
  // Add missing fields after reading the component
};

const mockGameConfigs = {
  click_rate_cap: '20',
  monsters_per_zone: '10',
  boss_enrage_seconds: '60',
  // Add configs after reading the component
};

const defaultProps = {
  session: mockSession as any,
  gameConfigs: mockGameConfigs,
  onEnemyClick: vi.fn(),
  onGoldEarned: vi.fn(),
  onWavesComplete: vi.fn(),
  onZoneAdvance: vi.fn(),
  onEntityKill: vi.fn(),
  autoProgress: false,
  onAutoProgressToggle: vi.fn(),
  narrativeProgressPct: 0,
};

describe('CombatStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<CombatStage {...defaultProps} />);
    // PixiJS is mocked so we just verify no throw
  });

  it('calls onEnemyClick when the stage is clicked', () => {
    // Read component to find the clickable element/handler
    // The component likely has an onClick or onPointerDown on the PixiJS stage
    // Since PixiJS is mocked, we need to verify the click handler is wired up
    // Adjust selector after reading the actual DOM output
    const { container } = render(<CombatStage {...defaultProps} />);
    // Find the clickable area — adjust selector after reading component
    const clickArea = container.querySelector('[data-testid="combat-stage"]')
      || container.firstElementChild;
    if (clickArea) {
      fireEvent.click(clickArea);
      expect(defaultProps.onEnemyClick).toHaveBeenCalled();
    }
  });

  it('displays wave/zone information', () => {
    // Read component to find what text/elements show zone info
    // Adjust assertions after reading actual rendered output
    render(<CombatStage {...defaultProps} />);
    // Example: expect(screen.getByText(/zone 1/i)).toBeInTheDocument();
  });
});
```

**Critical note:** This is a PixiJS component — most rendering goes through the mocked `@pixi/react` `Application` wrapper, not real DOM. Tests should focus on:
1. Component mounts without errors
2. Callback props are invoked correctly
3. State-dependent rendering (conditional elements)
4. The mock `useTick` captures the tick callback for manual advancement

After reading the component, you'll know exactly which DOM elements exist vs. which are PixiJS-only.

- [ ] **Step 3: Run test to verify it works**

```bash
cd frontend && rtk npx vitest run src/game/components/story/CombatStage.test.tsx
```

Expected: Tests pass (adjust mock data and selectors as needed).

- [ ] **Step 4: Add behavioral tests for key interactions**

Add to the same test file, after reading the component to understand exact DOM output:

```tsx
  describe('enemy lifecycle', () => {
    it('spawns an enemy on mount', () => {
      // Verify the component attempts to render enemy content
      // Check for enemy name text, HP bar, or sprite container
      render(<CombatStage {...defaultProps} />);
      // Adjust assertion after reading what DOM elements the component renders
    });
  });

  describe('auto-progress', () => {
    it('does not auto-challenge boss when autoProgress is false', () => {
      render(<CombatStage {...defaultProps} autoProgress={false} />);
      // Verify no boss challenge was triggered
      // This tests the conditional in the autoProgress useEffect
    });

    it('respects extraWavesMode prop', () => {
      render(<CombatStage {...defaultProps} extraWavesMode={true} />);
      // Verify extra waves behavior — read component for exact logic
    });
  });

  describe('reduced motion', () => {
    it('disables shake effects when reduceMotion is true', () => {
      render(<CombatStage {...defaultProps} reduceMotion={true} />);
      // Verify triggerShake is a no-op when reduceMotion=true
      // This tests the useCallback dependency on reduceMotion
    });
  });
```

- [ ] **Step 5: Run all CombatStage tests**

```bash
cd frontend && rtk npx vitest run src/game/components/story/CombatStage.test.tsx
```

Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add frontend/src/game/components/story/CombatStage.test.tsx
rtk git commit -m "test: add component tests for CombatStage"
```

---

## Task 4: Frontend — BossStage Component Tests

**Files:**
- Create: `frontend/src/game/components/story/BossStage.test.tsx`
- Read: `frontend/src/game/components/story/BossStage.tsx`

- [ ] **Step 1: Read BossStage.tsx for rendered elements and interrupt types**

Read the component to understand:
- What DOM elements are rendered (timer display, HP bar, interrupt UI)
- The interrupt state machine: `click_burst`, `target_zone`, `whack_sequence`
- How `onBossDefeated(success: boolean)` is called (timer expiry vs. HP=0)
- What `cfg` object shape the component expects from `session`

- [ ] **Step 2: Create test file**

Create `frontend/src/game/components/story/BossStage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BossStage from './BossStage';

vi.mock('../../../contexts/GameContext', () => ({
  useGame: vi.fn(() => ({
    activeCharacter: { id: 1, level: 10, strength: 20, agility: 15, intelligence: 10 },
  })),
}));

// Build mock session with boss fields
// IMPORTANT: Read BossStage.tsx to get exact field names
const mockBossSession = {
  session_id: 'boss-session-123',
  scene_id: 2,
  is_boss: true,
  boss_hp: 1000,
  boss_max_hp: 1000,
  boss_name: 'Test Guardian',
  bossSpriteKey: 'guardian_sprite',
  boss_config: {
    timer_seconds: 60,
    interrupt_chance: 0.3,
    attacks: [
      { name: 'Slash', damage: 10, sprite_key: 'slash' },
    ],
  },
  characterStrength: 20,
  clickUpgradeLevel: 3,
  clickDmgMultiplier: 1.0,
  autoDpsPerSecond: 5,
  autoUpgradeLevel: 2,
  autoDpsMultiplier: 1.0,
  darkRitualMultiplier: 1.0,
  // Adjust after reading the component
};

const mockGameConfigs = {
  boss_crit_chance: '0.1',
  boss_crit_multiplier: '2.0',
  // Add configs after reading the component
};

const defaultProps = {
  session: mockBossSession as any,
  gameConfigs: mockGameConfigs,
  onEnemyClick: vi.fn(),
  onGoldEarned: vi.fn(),
  onBossDefeated: vi.fn(),
};

describe('BossStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<BossStage {...defaultProps} />);
  });

  it('displays boss name', () => {
    render(<BossStage {...defaultProps} />);
    // Adjust selector after reading what text elements the component renders
    // PixiJS text is mocked, so check for any DOM-rendered boss info
  });

  it('calls onBossDefeated when boss HP reaches 0', () => {
    // This requires understanding the damage flow
    // After reading, you may need to invoke the useTick callback
    // to simulate time passing and auto-DPS draining HP
  });

  it('calls onEnemyClick on stage click', () => {
    const { container } = render(<BossStage {...defaultProps} />);
    const clickArea = container.firstElementChild;
    if (clickArea) {
      fireEvent.click(clickArea);
      expect(defaultProps.onEnemyClick).toHaveBeenCalled();
    }
  });
});

describe('BossStage interrupts', () => {
  it('renders interrupt UI when interrupt is active', () => {
    // Interrupts are spawned by the main game loop timer
    // Read the component to understand how to trigger an interrupt state
    // You may need to mock Math.random() to force interrupt spawn
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd frontend && rtk npx vitest run src/game/components/story/BossStage.test.tsx
```

- [ ] **Step 4: Add interrupt system tests**

After reading the component, add specific tests for each interrupt type:

```tsx
describe('BossStage interrupt types', () => {
  it('click_burst interrupt requires rapid clicks', () => {
    // Mock Math.random to force click_burst type
    // Verify interrupt UI renders with click counter
  });

  it('target_zone interrupt renders target area', () => {
    // Mock Math.random to force target_zone type
    // Verify target zone UI renders
  });

  it('whack_sequence interrupt renders sequence indicators', () => {
    // Mock Math.random to force whack_sequence type
    // Verify sequence UI renders
  });
});
```

- [ ] **Step 5: Run and commit**

```bash
cd frontend && rtk npx vitest run src/game/components/story/BossStage.test.tsx
rtk git add frontend/src/game/components/story/BossStage.test.tsx
rtk git commit -m "test: add component tests for BossStage"
```

---

## Task 5: Frontend — StoryMode Component Tests

**Files:**
- Create: `frontend/src/game/components/StoryMode.test.tsx`
- Read: `frontend/src/game/components/StoryMode.tsx`

- [ ] **Step 1: Read StoryMode.tsx for session init flow and rendered structure**

Read the component to understand:
- How `useGame()` context is used (what fields it reads)
- The session initialization flow (`activeSceneId` → API calls → set state)
- What child components are rendered (CombatStage, BossStage, NarrativeBlock, etc.)
- The batch tick mechanism (pendingClicks refs → flushTick → API POST)
- CPS violation state machine states and transitions

- [ ] **Step 2: Create test file with mocked API and context**

Create `frontend/src/game/components/StoryMode.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import StoryMode from './StoryMode';
import { api } from '../../api';

// Mock the game context
vi.mock('../../contexts/GameContext', () => ({
  useGame: vi.fn(() => ({
    activeSceneId: 1,
    activeCharacter: { id: 1, level: 5, strength: 10, agility: 8, intelligence: 6 },
    storySession: null,
    setStorySession: vi.fn(),
    // Add other context values after reading the component
  })),
}));

// Mock child components to isolate StoryMode logic
vi.mock('./story/CombatStage', () => ({
  default: (props: any) => <div data-testid="combat-stage">CombatStage</div>,
}));

vi.mock('./story/BossStage', () => ({
  default: (props: any) => <div data-testid="boss-stage">BossStage</div>,
}));

const mockPlayer = { id: 1, is_game_admin: false, settings: { wpm: 200 } };

const defaultProps = {
  player: mockPlayer,
  onPlayerUpdate: vi.fn(),
};

describe('StoryMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock API responses for session initialization
    // Read the component to determine exact API endpoints called on mount
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/story/configs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ click_rate_cap: '20', monsters_per_zone: '10' }),
        });
      }
      if (url.includes('/story/session/start') || url.includes('/story/scenes/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ session_id: 'test-123', gold: 0, currentZone: 1 }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    (api.post as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ session_id: 'test-123', gold: 0 }),
    });
  });

  it('renders without crashing', () => {
    render(<StoryMode {...defaultProps} />);
  });

  it('shows loading state during session initialization', () => {
    render(<StoryMode {...defaultProps} />);
    // Check for loading indicator — read component for exact element
    // Example: expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('fetches game configs on mount', async () => {
    render(<StoryMode {...defaultProps} />);
    await waitFor(() => {
      // Verify the configs API was called
      // Adjust URL pattern after reading the component
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('configs')
      );
    });
  });

  it('renders CombatStage for normal scenes', async () => {
    render(<StoryMode {...defaultProps} />);
    await waitFor(() => {
      // After session loads, CombatStage should render for non-boss scenes
      // Adjust based on actual rendering logic
    });
  });
});

describe('StoryMode CPS enforcement', () => {
  it('starts in NORMAL cps state', () => {
    render(<StoryMode {...defaultProps} />);
    // CPS state machine starts at NORMAL
    // No warning toast should be visible
  });
});

describe('StoryMode farm mode', () => {
  it('respects externalFarmMode prop', () => {
    render(
      <StoryMode
        {...defaultProps}
        externalFarmMode={true}
        onFarmModeChange={vi.fn()}
      />
    );
    // Farm mode should be active — read component for visual indicator
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd frontend && rtk npx vitest run src/game/components/StoryMode.test.tsx
```

- [ ] **Step 4: Adjust mocks and assertions based on actual component**

Fix any mock data mismatches, missing context values, or incorrect API URL patterns discovered during the test run.

- [ ] **Step 5: Run and commit**

```bash
cd frontend && rtk npx vitest run src/game/components/StoryMode.test.tsx
rtk git add frontend/src/game/components/StoryMode.test.tsx
rtk git commit -m "test: add component tests for StoryMode"
```

---

## Task 6: Frontend — BottomAnimatedBanner Component Tests

**Files:**
- Create: `frontend/src/game/components/BottomAnimatedBanner.test.tsx`
- Read: `frontend/src/game/components/BottomAnimatedBanner.tsx`

- [ ] **Step 1: Read BottomAnimatedBanner.tsx**

Read the component to understand:
- The outer `BottomAnimatedBanner` vs inner `BannerContent` structure
- What API endpoints are called on mount (enemy pool, char visuals, banner configs)
- What DOM elements exist outside PixiJS (container divs, overlays)
- How adaptive scaling formulas work (maxEnemies, deathRate, killSpeedMs)

- [ ] **Step 2: Create test file**

Create `frontend/src/game/components/BottomAnimatedBanner.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import BottomAnimatedBanner from './BottomAnimatedBanner';
import { api } from '../../api';

vi.mock('../../contexts/GameContext', () => ({
  useGame: vi.fn(() => ({
    activeCharacter: { id: 1, level: 5, strength: 10, agility: 8, intelligence: 6 },
  })),
}));

describe('BottomAnimatedBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock API responses for banner data
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('enemy-pool') || url.includes('enemies')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { entity_id: 1, canonical_name: 'Goblin', sprite_key: 'goblin_1' },
            { entity_id: 2, canonical_name: 'Skeleton', sprite_key: 'skeleton_1' },
          ]),
        });
      }
      if (url.includes('character') && url.includes('visuals')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            avatar_url: '/sprites/hero.png',
            color_primary: '#3366cc',
          }),
        });
      }
      if (url.includes('banner') || url.includes('configs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            banner_base_enemies: 2,
            banner_max_enemies: 8,
            banner_enemies_per_level: 0.5,
            banner_death_base_rate: 0.1,
            banner_death_reduction_per_level: 0.005,
            banner_death_floor: 0.01,
            banner_kill_speed_base_ms: 2000,
            banner_kill_speed_min_ms: 500,
            banner_spawn_rate_base: 3000,
            banner_spawn_rate_combat: 1500,
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('renders without crashing', () => {
    const character = { id: 1, level: 5, strength: 10, agility: 8, intelligence: 6 };
    render(<BottomAnimatedBanner character={character} />);
  });

  it('fetches enemy pool on mount', async () => {
    const character = { id: 1, level: 5, strength: 10, agility: 8, intelligence: 6 };
    render(<BottomAnimatedBanner character={character} />);
    await waitFor(() => {
      // Verify API was called for enemy data
      // Adjust URL pattern after reading the component
      expect(api.get).toHaveBeenCalled();
    });
  });

  it('fetches character visuals on mount', async () => {
    const character = { id: 1, level: 5, strength: 10, agility: 8, intelligence: 6 };
    render(<BottomAnimatedBanner character={character} />);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('visuals')
      );
    });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd frontend && rtk npx vitest run src/game/components/BottomAnimatedBanner.test.tsx
```

- [ ] **Step 4: Add adaptive scaling tests**

```tsx
describe('BottomAnimatedBanner scaling', () => {
  it('scales enemy count with character level', async () => {
    // High-level character should calculate more max enemies
    // This tests the useMemo: maxEnemies formula
    // Math.min(banner_max_enemies, banner_base_enemies + level * banner_enemies_per_level)
    // At level 5: min(8, 2 + 5 * 0.5) = min(8, 4.5) = 4.5 -> 4
    // At level 20: min(8, 2 + 20 * 0.5) = min(8, 12) = 8
    // Test by rendering with different level props and checking behavior
    const highLevelChar = { id: 1, level: 20, strength: 50, agility: 40, intelligence: 30 };
    render(<BottomAnimatedBanner character={highLevelChar} />);
    // Verify through rendered output or lack of errors
  });
});
```

- [ ] **Step 5: Run and commit**

```bash
cd frontend && rtk npx vitest run src/game/components/BottomAnimatedBanner.test.tsx
rtk git add frontend/src/game/components/BottomAnimatedBanner.test.tsx
rtk git commit -m "test: add component tests for BottomAnimatedBanner"
```

---

## Task 7: Admin — AssetRegistry Component Tests

**Files:**
- Create: `admin/src/pages/AssetRegistry.test.tsx`
- Read: `admin/src/pages/AssetRegistry.tsx`

- [ ] **Step 1: Read AssetRegistry.tsx for API endpoints and rendered elements**

Read the component to identify:
- Exact API endpoint URLs (GET `/api/admin/assets/`, POST, PUT, DELETE patterns)
- What DOM elements are rendered (table, filter buttons, search input, modals)
- Category list (the 16 filter categories)
- Pagination logic (page size, total pages calculation)

- [ ] **Step 2: Create test file with API mocks**

Create `admin/src/pages/AssetRegistry.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AssetRegistry from './AssetRegistry';
import { api } from '../api';

// Wrap in router if component uses useNavigate/Link
const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

const mockAssets = [
  {
    asset_key: 'sprite_goblin_1',
    category: 'entity_sprite',
    display_name: 'Goblin Sprite',
    tags: ['enemy', 'chapter1'],
    source: 'generated',
    definition: { url: '/sprites/goblin.png' },
    description: 'A goblin enemy sprite',
  },
  {
    asset_key: 'bg_forest_1',
    category: 'background',
    display_name: 'Forest Background',
    tags: ['nature'],
    source: 'curated',
    definition: { url: '/backgrounds/forest.png' },
    description: 'A forest scene background',
  },
];

describe('AssetRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/admin/assets/') && url.includes('orphans/missing')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.includes('/admin/assets/') && url.includes('orphans/unused')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.includes('/admin/assets/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: mockAssets, total: 2 }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('renders the asset table', async () => {
    renderWithRouter(<AssetRegistry />);
    await waitFor(() => {
      // Check for table or asset list rendering
      // Adjust selector after reading component
      expect(screen.getByText('Goblin Sprite')).toBeInTheDocument();
    });
  });

  it('fetches assets on mount', async () => {
    renderWithRouter(<AssetRegistry />);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('/admin/assets/')
      );
    });
  });

  it('filters by category', async () => {
    renderWithRouter(<AssetRegistry />);
    await waitFor(() => {
      expect(screen.getByText('Goblin Sprite')).toBeInTheDocument();
    });

    // Find and click a category filter button
    // Read component to get exact button text/selector
    const filterButton = screen.getByText(/entity_sprite|Entity Sprite/i);
    if (filterButton) {
      fireEvent.click(filterButton);
      await waitFor(() => {
        // Verify API was called with category filter
        expect(api.get).toHaveBeenCalledWith(
          expect.stringContaining('category=')
        );
      });
    }
  });

  it('searches by term with debounce', async () => {
    renderWithRouter(<AssetRegistry />);
    await waitFor(() => {
      expect(screen.getByText('Goblin Sprite')).toBeInTheDocument();
    });

    // Find search input — read component for exact placeholder/label
    const searchInput = screen.getByPlaceholderText(/search/i)
      || screen.getByRole('textbox');
    fireEvent.change(searchInput, { target: { value: 'goblin' } });

    // Wait for debounce (300ms)
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('search=goblin')
      );
    }, { timeout: 500 });
  });
});

describe('AssetRegistry CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: mockAssets, total: 2 }),
    });
  });

  it('opens create modal', async () => {
    renderWithRouter(<AssetRegistry />);
    await waitFor(() => {
      expect(screen.getByText('Goblin Sprite')).toBeInTheDocument();
    });

    // Find and click the "New Asset" button
    const newButton = screen.getByText(/new asset/i);
    fireEvent.click(newButton);

    // Verify modal opened — check for modal title or form elements
    await waitFor(() => {
      // Adjust after reading the modal's rendered content
      expect(screen.getByText(/create|new/i)).toBeInTheDocument();
    });
  });

  it('deletes an asset after confirmation', async () => {
    (api.delete as any).mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    renderWithRouter(<AssetRegistry />);
    await waitFor(() => {
      expect(screen.getByText('Goblin Sprite')).toBeInTheDocument();
    });

    // Find delete button for first asset — read component for exact UI
    // This may involve clicking an action menu or delete icon
  });
});

describe('AssetRegistry orphan detection', () => {
  it('shows orphan panel when expanded', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('orphans/missing')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { asset_key: 'missing_sprite', referenced_by: 'entity_123' },
          ]),
        });
      }
      if (url.includes('orphans/unused')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { asset_key: 'unused_old_bg', category: 'background' },
          ]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: mockAssets, total: 2 }),
      });
    });

    renderWithRouter(<AssetRegistry />);
    // Find and click the orphan detection toggle
    // Read component for exact button text
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd admin && rtk npx vitest run src/pages/AssetRegistry.test.tsx
```

- [ ] **Step 4: Fix mock data and selectors based on actual component**

- [ ] **Step 5: Commit**

```bash
rtk git add admin/src/pages/AssetRegistry.test.tsx
rtk git commit -m "test: add component tests for AssetRegistry"
```

---

## Task 8: Admin — PlayerDetail Component Tests

**Files:**
- Create: `admin/src/pages/PlayerDetail.test.tsx`
- Read: `admin/src/pages/PlayerDetail.tsx`

- [ ] **Step 1: Read PlayerDetail.tsx for route params, API calls, and modal structure**

Read the component to identify:
- How `useParams` extracts the player ID
- Exact API endpoints for player detail, inventory, essence
- What sections render (player info, characters, tickets)
- How modals are triggered (ban, alias, character edit, item craft, etc.)

- [ ] **Step 2: Create test file**

Create `admin/src/pages/PlayerDetail.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PlayerDetail from './PlayerDetail';
import { api } from '../api';

const renderWithRoute = (playerId: string = '1') =>
  render(
    <MemoryRouter initialEntries={[`/players/${playerId}`]}>
      <Routes>
        <Route path="/players/:id" element={<PlayerDetail />} />
      </Routes>
    </MemoryRouter>
  );

const mockPlayerResponse = {
  player: {
    id: 1,
    firebase_uid: 'uid_123',
    email: 'player@example.com',
    alias: 'TestPlayer',
    is_banned: false,
    is_system_admin: false,
    is_game_admin: false,
    created_at: '2026-01-01T00:00:00Z',
    last_login: '2026-03-25T12:00:00Z',
  },
  characters: [
    {
      id: 1,
      name: 'TestHero',
      class_name: 'Engineer',
      level: 5,
      xp: 1200,
    },
  ],
  recent_tickets: [],
};

describe('PlayerDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/admin/me')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ email: 'admin@example.com', is_owner: true }),
        });
      }
      if (url.includes('/admin/players/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPlayerResponse),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('renders player details', async () => {
    renderWithRoute('1');
    await waitFor(() => {
      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    });
  });

  it('shows character list', async () => {
    renderWithRoute('1');
    await waitFor(() => {
      expect(screen.getByText('TestHero')).toBeInTheDocument();
    });
  });

  it('shows ban button for non-banned player', async () => {
    renderWithRoute('1');
    await waitFor(() => {
      expect(screen.getByText(/ban player/i)).toBeInTheDocument();
    });
  });

  it('shows unban button for banned player', async () => {
    const bannedResponse = {
      ...mockPlayerResponse,
      player: { ...mockPlayerResponse.player, is_banned: true },
    };
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/admin/me')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ email: 'admin@example.com', is_owner: true }),
        });
      }
      if (url.includes('/admin/players/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(bannedResponse),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    renderWithRoute('1');
    await waitFor(() => {
      expect(screen.getByText(/unban/i)).toBeInTheDocument();
    });
  });
});

describe('PlayerDetail actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPlayerResponse),
    });
    (api.post as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    (api.patch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  it('opens ban modal and submits', async () => {
    renderWithRoute('1');
    await waitFor(() => {
      expect(screen.getByText(/ban player/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/ban player/i));
    // Ban modal should open — check for reason input
    // Read component for exact modal content
  });

  it('opens edit alias modal', async () => {
    renderWithRoute('1');
    await waitFor(() => {
      expect(screen.getByText(/edit alias/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/edit alias/i));
    // Alias modal should open
  });

  it('force logout calls API', async () => {
    renderWithRoute('1');
    await waitFor(() => {
      expect(screen.getByText(/force logout/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/force logout/i));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        expect.stringContaining('/admin/players/1/logout')
      );
    });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd admin && rtk npx vitest run src/pages/PlayerDetail.test.tsx
```

- [ ] **Step 4: Fix mock data and selectors**

- [ ] **Step 5: Commit**

```bash
rtk git add admin/src/pages/PlayerDetail.test.tsx
rtk git commit -m "test: add component tests for PlayerDetail"
```

---

## Task 9: Admin — AtmosphereEditor Component Tests

**Files:**
- Create: `admin/src/pages/AtmosphereEditor.test.tsx`
- Read: `admin/src/pages/AtmosphereEditor.tsx`

- [ ] **Step 1: Read AtmosphereEditor.tsx for API endpoints and form structure**

Read the component to identify exact endpoints, form field names, archetype filter values, and how the audio preview hook is invoked.

- [ ] **Step 2: Create test file**

Create `admin/src/pages/AtmosphereEditor.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AtmosphereEditor from './AtmosphereEditor';
import { api } from '../api';

// Mock Web Audio API for audio preview
const mockAudioContext = {
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { setValueAtTime: vi.fn() },
    type: 'sine',
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
  })),
  destination: {},
  currentTime: 0,
};
(globalThis as any).AudioContext = vi.fn(() => mockAudioContext);

const mockAtmospheres = [
  { id: 1, name: 'Dark Forest', archetype: 'exploration', bpm: 80 },
  { id: 2, name: 'Battle Fury', archetype: 'combat', bpm: 140 },
  { id: 3, name: 'Boss Doom', archetype: 'boss', bpm: 160 },
];

const mockAtmosphereDetail = {
  id: 1,
  name: 'Dark Forest',
  archetype: 'exploration',
  description: 'A dark and mysterious forest atmosphere',
  bpm: 80,
  key: 'C',
  scale: 'minor',
  complexity: 3,
  seed: 42,
  music_definitions: {
    explore: '{"layers":[]}',
    combat: '{"layers":[]}',
    boss: '{"layers":[]}',
    mystery: '{"layers":[]}',
  },
};

describe('AtmosphereEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/admin/atmospheres/1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAtmosphereDetail),
        });
      }
      if (url.includes('/admin/atmospheres')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAtmospheres),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('renders atmosphere list', async () => {
    render(<MemoryRouter><AtmosphereEditor /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Dark Forest')).toBeInTheDocument();
      expect(screen.getByText('Battle Fury')).toBeInTheDocument();
    });
  });

  it('loads detail when atmosphere is selected', async () => {
    render(<MemoryRouter><AtmosphereEditor /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Dark Forest')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Dark Forest'));
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('/admin/atmospheres/1')
      );
    });
  });

  it('filters by archetype', async () => {
    render(<MemoryRouter><AtmosphereEditor /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Dark Forest')).toBeInTheDocument();
    });

    // Find archetype filter — read component for exact UI
    // May be a dropdown or button group
  });
});

describe('AtmosphereEditor CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAtmospheres),
    });
    (api.post as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 4, name: 'New Atmosphere' }),
    });
    (api.put as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAtmosphereDetail),
    });
    (api.delete as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  it('creates a new atmosphere', async () => {
    render(<MemoryRouter><AtmosphereEditor /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Dark Forest')).toBeInTheDocument();
    });

    // Find "Create" / "New" button — read component for exact text
    const createBtn = screen.getByText(/create|new/i);
    fireEvent.click(createBtn);

    // Fill form fields — read component for exact input labels
    // Submit form
    // Verify POST was called
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd admin && rtk npx vitest run src/pages/AtmosphereEditor.test.tsx
```

- [ ] **Step 4: Fix mocks and add form interaction tests**

- [ ] **Step 5: Commit**

```bash
rtk git add admin/src/pages/AtmosphereEditor.test.tsx
rtk git commit -m "test: add component tests for AtmosphereEditor"
```

---

## Task 10: Admin — ContentEditor Component Tests

**Files:**
- Create: `admin/src/pages/ContentEditor.test.tsx`
- Read: `admin/src/pages/ContentEditor.tsx`

- [ ] **Step 1: Read ContentEditor.tsx for tab structure and API patterns**

Read the component to identify:
- Tab names and their corresponding API endpoints
- How tab switching triggers data fetching
- The CRUD flow per tab (create, update, delete)
- Item component sub-tab structure

- [ ] **Step 2: Create test file**

Create `admin/src/pages/ContentEditor.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ContentEditor from './ContentEditor';
import { api } from '../api';

const mockStats = [
  { id: 1, name: 'Strength', description: 'Physical power' },
  { id: 2, name: 'Agility', description: 'Speed and reflexes' },
];

const mockClasses = [
  { id: 1, name: 'Engineer', description: 'Tech specialist', affinities: [] },
  { id: 2, name: 'Mage', description: 'Arcane caster', affinities: [] },
];

const mockBenefits = [
  { id: 1, name: 'Fire Damage', effect_type: 'damage', value: 10 },
];

describe('ContentEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/admin/game/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStats),
        });
      }
      if (url.includes('/admin/game/classes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockClasses),
        });
      }
      if (url.includes('/admin/game/benefits')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBenefits),
        });
      }
      if (url.includes('/admin/game/skills')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/admin/game/gear-slots')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/admin/game/avatar-options')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/admin/game/items/components')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            prefixes: [], qualities: [], lore_tags: [], type_bases: [], suffixes: [],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
  });

  it('renders with default tab', async () => {
    render(<MemoryRouter><ContentEditor /></MemoryRouter>);
    await waitFor(() => {
      // First tab should load — check for tab content
      // Read component for default activeTab value
      expect(api.get).toHaveBeenCalled();
    });
  });

  it('switches tabs and fetches new data', async () => {
    render(<MemoryRouter><ContentEditor /></MemoryRouter>);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });

    // Find and click "Classes" tab — read component for exact tab labels
    const classesTab = screen.getByText(/classes/i);
    fireEvent.click(classesTab);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('/admin/game/classes')
      );
    });
  });

  it('displays entity list for active tab', async () => {
    render(<MemoryRouter><ContentEditor /></MemoryRouter>);
    await waitFor(() => {
      // Check that data from the default tab renders
      // Adjust based on which tab loads first
      expect(screen.getByText('Strength')).toBeInTheDocument();
    });
  });
});

describe('ContentEditor CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockStats),
    });
    (api.post as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 3, name: 'New Stat' }),
    });
    (api.patch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, name: 'Updated Strength' }),
    });
    (api.delete as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  it('selects an entity for editing', async () => {
    render(<MemoryRouter><ContentEditor /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Strength')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Strength'));
    // Verify edit form populates — read component for form field selectors
  });

  it('creates a new entity', async () => {
    render(<MemoryRouter><ContentEditor /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Strength')).toBeInTheDocument();
    });

    // Find "Create" / "New" button
    const createBtn = screen.getByText(/create|new/i);
    fireEvent.click(createBtn);

    // Fill required fields — read component for exact inputs
    // Submit
    // Verify POST called
  });

  it('deletes an entity with confirmation', async () => {
    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<MemoryRouter><ContentEditor /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Strength')).toBeInTheDocument();
    });

    // Select entity, find delete button, click it
    // Verify DELETE called and list refreshes
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd admin && rtk npx vitest run src/pages/ContentEditor.test.tsx
```

- [ ] **Step 4: Fix mocks and add tab-specific tests**

- [ ] **Step 5: Commit**

```bash
rtk git add admin/src/pages/ContentEditor.test.tsx
rtk git commit -m "test: add component tests for ContentEditor"
```

---

## Task 11: Final Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run full backend test suite**

```bash
cd backend && rtk python -m pytest -v
```

Expected: All tests PASS (853+ original + new story mode tests).

- [ ] **Step 2: Run full frontend test suite**

```bash
cd frontend && rtk npx vitest run
```

Expected: All tests PASS (457+ original + 4 new component test files).

- [ ] **Step 3: Run full admin test suite**

```bash
cd admin && rtk npx vitest run
```

Expected: All tests PASS (368+ original + 4 new component test files).

- [ ] **Step 4: Run E2E tests to verify no regressions**

```bash
cd testing && rtk npx playwright test
```

Expected: All 76 E2E tests PASS.

- [ ] **Step 5: Update test audit report with final counts**

Update `docs/superpowers/specs/test-audit-report.md` to reflect the new test counts and coverage improvements.

- [ ] **Step 6: Commit final state**

```bash
rtk git add docs/superpowers/specs/test-audit-report.md
rtk git commit -m "docs: update test audit report with phase 1 hardening results"
```
