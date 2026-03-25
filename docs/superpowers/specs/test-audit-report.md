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
**Coverage:** Comprehensive. Tests cover game configs, stat definitions, character classes, skills, benefit effects, and item components — all with edge cases.
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
**Classification:** NO UNIT TESTS
**Gaps:** No tests for combat state machine, damage calculation display, enemy spawning, wave advancement, auto-DPS, CPS enforcement, rare spawn injection, or animation lifecycle.

### game/components/story/BossStage.tsx (692 lines)
**Component-level test:** NONE
**E2E coverage:** `testing/story-mode.spec.ts` — indirect via story mode flow
**Classification:** NO UNIT TESTS
**Gaps:** No tests for boss HP tracking, timer countdown, interrupt system (click_burst, target_zone, whack_sequence), boss attack cycling, or enrage mechanics.

### game/components/StoryMode.tsx (567 lines)
**Component-level test:** NONE
**E2E coverage:** `testing/story-mode.spec.ts` — 8 tests (indirect)
**Classification:** NO UNIT TESTS
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
**Classification:** NO UNIT TESTS (E2E only)
**Gaps:** No unit tests for asset CRUD, category filtering, search debounce, orphan detection, bulk delete, JSON preview, or form validation.

### pages/PlayerDetail.tsx (706 lines)
**Component-level test:** NONE
**E2E coverage:** `testing/admin-players.spec.ts` — 6 tests (Playwright)
**Classification:** NO UNIT TESTS (E2E only)
**Gaps:** No unit tests for player data loading, ban/unban flow, alias editing, permission toggling, inventory expansion, or modal interactions.

### pages/AtmosphereEditor.tsx (672 lines)
**Component-level test:** NONE
**E2E coverage:** `testing/admin-content.spec.ts` — 1 test (loads with count)
**Classification:** NO UNIT TESTS (E2E only)
**Gaps:** No unit tests for atmosphere CRUD, archetype filtering, music JSON editing, audio preview, batch assign, or form validation.

### pages/ContentEditor.tsx (603 lines)
**Component-level test:** NONE
**E2E coverage:** `testing/admin-content.spec.ts` — indirect
**Classification:** NO UNIT TESTS (E2E only)
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
