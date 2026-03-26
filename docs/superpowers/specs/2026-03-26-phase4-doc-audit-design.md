# Phase 4 — Comprehensive Documentation Audit & Traceability

**Date:** 2026-03-26
**Goal:** Establish bidirectional traceability between all code and specifications, reverse-sync specs to match code reality, and ensure all operational documentation is accurate, well-structured, and complete.
**Approach:** Spec-First, Code-Second (Approach A) — stabilize specs with requirement IDs, then annotate code, then audit docs.

---

## Decisions

- **Scope:** Every file in the codebase gets a structured docstring referencing its spec/documentation.
- **Requirement IDs:** Created fresh — no existing IDs in specs. Format: `{SPEC-PREFIX}-{NNN}`.
- **Reverse-sync direction:** Specs update to match code reality (not the other way around).
- **Operational docs:** Full audit — accuracy, restructure (Diataxis), and completeness (new docs for gaps).
- **Parallelism:** Four waves with maximum parallelism within each wave.
- **DB audit:** Independent workstream, runs parallel with Wave 1.
- **Traceability matrix:** Central index at `docs/reference/TRACEABILITY.md` — both directions (code→spec and spec→code).

---

## Requirement ID Prefix Map

| Spec Folder | Prefix | Spec Folder | Prefix |
|---|---|---|---|
| admin-finance | AF | game-content-editor | GCE |
| admin-systems | AS | game-loop | GL |
| asset-registry | AR | home-base-hub | HBH |
| audio-music | AM | idle-training | IT |
| banner-scaling-editor | BSE | onboarding | OB |
| book-agent | BA | overworld-hub | OH |
| character-progression | CP | player-character-management | PCM |
| content-management | CM | story-asset-generators | SAG |
| db-cleanup | DBC | story-mode | SM |
| dev-content-audit | DCA | stripe-purchasing | SP |
| donations | DN | subscription | SUB |
| dreamwalkers-bazaar | DB | testing-revamp | TR |
| economy-anticheat | EAC | | |
| economy-core | EC | | |
| elysium-emporium | EE | | |
| entity-classification | ENT | | |

---

## Scope & Scale

| Category | File Count | Action |
|---|---|---|
| Backend Python | 169 | Structured docstrings |
| Frontend TypeScript | 125 | Structured JSDoc blocks |
| Admin TypeScript | 122 | Structured JSDoc blocks |
| Tools Python | 72 | Structured docstrings |
| OpenSpec Specs | 28 | ID assignment + reverse-sync |
| Operational Docs | 32 (31 + README) | Accuracy + restructure + completeness |
| DB Audit Report | 1 | New deliverable |
| Traceability Matrix | 1 | New deliverable |
| **Total files touched** | **~550** | |

---

## Wave 1: Spec Stabilization (Parallel)

### 1a. Requirement ID Assignment

All 28 specs get IDs added to every `### Requirement:` heading.

**Format:**
```markdown
### Requirement: Three-Loop Architecture [GL-001]
```

- Sequential numbering per spec, starting at 001
- IDs added inline to existing headings — no structural changes to spec format
- Deliverable: All 28 `spec.md` files updated in-place

### 1b. Reverse-Sync Specs to Code

For each spec, verify every requirement against actual implementation:

| Status | Action |
|---|---|
| Implemented as written | No change |
| Implemented differently | Update spec to match code, add note: `*Updated 2026-03-26: implementation differs — [description]*` |
| Not implemented, still planned | Mark: `[STATUS: NOT IMPLEMENTED — backlog]` |
| Not implemented, won't do | Mark: `[STATUS: REMOVED — [rationale]]` |

Deliverable: All 28 specs reflect code truth.

### 1c. DB Audit Report (Independent)

Runs in parallel with 1a/1b. Analyzes database schema against code usage.

**Contents:**
- Dead tables (referenced nowhere in code)
- Empty-but-needed tables (referenced in code, just unpopulated)
- Unused columns
- Normalization opportunities
- Index recommendations
- Schema improvement proposals

**Deliverable:** `docs/superpowers/specs/db-audit-report.md`

---

## Wave 2: Code Annotation (Parallel by Codebase)

Four parallel workstreams: backend, frontend, admin, tools.

### Docstring Formats

**Python (backend, tools):**
```python
"""
Story Mode combat endpoints — damage resolution, turn logic, wave progression.

Spec: openspec/specs/story-mode/spec.md
Requirements: SM-001, SM-003, SM-004
"""
```

**TypeScript (frontend, admin):**
```typescript
/**
 * Combat HUD — HP bars, damage numbers, status effects display.
 *
 * @spec openspec/specs/story-mode/spec.md
 * @requirements SM-001, SM-003
 */
```

### Edge Cases

**Test files** — lighter annotation:
```python
"""
Tests for Story Mode combat endpoints.

Tests: openspec/specs/story-mode/spec.md
Covers: SM-001, SM-003, SM-004
"""
```

**Config/setup files** (main.tsx, conftest.py, vite.config.ts):
```typescript
/**
 * Vite build configuration for frontend app.
 *
 * Docs: docs/reference/ARCHITECTURE.md#build-system
 */
```

**Third-party integration files** (firebase.ts, api.ts, stripe_webhooks.py):
```python
"""
Stripe webhook handlers — payment confirmation, subscription lifecycle.

Spec: openspec/specs/stripe-purchasing/spec.md
Requirements: SP-001, SP-003
Docs: docs/how-to/DEPLOY.md#stripe-configuration
"""
```

**`__init__.py` re-export files:**
```python
"""
Story routes package — re-exports router from sub-modules.

Spec: openspec/specs/story-mode/spec.md
"""
```

**Files with no matching spec** — reference nearest documentation:
```python
"""
Database session management and connection pooling.

Docs: docs/reference/ARCHITECTURE.md#database-layer
"""
```
If no documentation exists, log as a gap for Wave 3.

### Traceability Matrix Output

Each Wave 2 agent outputs a mapping file: `{codebase}-traceability.json`
```json
{
  "file": "backend/routes/story/combat.py",
  "spec": "openspec/specs/story-mode/spec.md",
  "requirements": ["SM-001", "SM-003", "SM-004"],
  "tests": ["backend/tests/test_combat.py"]
}
```

These are compiled into the final matrix at the end of Wave 2.

**Deliverable:** `docs/reference/TRACEABILITY.md`

**Matrix format:**
```markdown
## Story Mode (SM)

| ID | Requirement | Spec Section | Implementing Files | Tests |
|----|------------|--------------|-------------------|-------|
| SM-001 | Combat Loop | spec.md#combat | backend/routes/story/combat.py, frontend/.../CombatStage.tsx | test_combat.py, CombatStage.test.tsx |
```

---

## Wave 3: Documentation Audit & Gap Fill (Parallel by Doc Type)

### 3a. Utility/Helper Documentation

Create missing docs identified during Wave 2 gap logging. These are docs for shared utilities, internal helpers, and infrastructure code that has no spec.

### 3b. Operational Docs Accuracy Pass

All 32 docs verified against current code:

| Doc Path | Type |
|---|---|
| docs/how-to/DB_MIGRATIONS.md | Operational guide |
| docs/how-to/DEPLOY.md | Operational guide |
| docs/how-to/GENERATOR_AI_RULES.md | Operational guide |
| docs/how-to/GENERATOR_INSTRUCTIONS.md | Operational guide |
| docs/how-to/INIT_INFRA.md | Operational guide |
| docs/how-to/OWNER_SETUP.md | Operational guide |
| docs/how-to/SIM_TOOLKIT_GUIDE.md | Operational guide |
| docs/how-to/TESTING.md | Operational guide |
| docs/reference/API_REFERENCE.md | Reference |
| docs/reference/ARCHITECTURE.md | Reference |
| docs/reference/CODING_GUIDE.md | Reference |
| docs/reference/GAME_ASSETS_GUIDE.md | Reference |
| docs/reference/STYLE_GUIDE.md | Reference |
| docs/reference/TOOLS.md | Reference |
| docs/explanation/INSPIRATIONS.md | Explanation |
| docs/explanation/ROADMAP.md | Explanation |
| docs/explanation/SUMMARY_MARKETING.md | Explanation |
| docs/explanation/lore/*.md | Explanation (4 files) |
| db/data_dictionary.md | Reference |
| README.md | Overview |

**Actions per doc:**
1. Read doc, verify against current code behavior
2. Fix inaccuracies
3. Flag missing sections
4. Restructure per Diataxis if misplaced

### 3c. Restructure

Move misplaced content per Diataxis classification. Consolidate duplicates.

### 3d. Completeness — New Docs

Write new documentation for any undocumented features/flows discovered during the audit. Candidates likely include:
- Decomposed module architecture (routes/story/, services/character/, etc.)
- Generator framework library (tools/generators/lib/)
- Watchdog agent operational guide (if not covered in existing docs)

### 3e. AGENTS.md Update

Update directory structure section to reflect:
- `backend/routes/story/` (combat.py, scenes.py, rewards.py, helpers.py, schemas.py)
- `backend/routes/admin_game/` (classes.py, configs.py, items.py, skills.py, helpers.py)
- `backend/services/character/` (crud.py, items.py, progression.py, timeline.py)
- `backend/services/content/` (backgrounds.py, books.py, chapters.py, scenes.py, waves.py, helpers.py)
- Frontend decomposed hooks and sub-components
- Admin component subdirectories

### 3f. TODO.md / DONE.md Reconciliation

- Check off completed Phase 4 items in TODO.md
- Move completed code quality phases (1-4) to DONE.md as a complete block
- Add DB optimization as next backlog item (from DB audit report)

---

## Wave 4: Validation

- **Test suites:** All 4 suites green (875 backend + 554 frontend + 412 admin + 76 E2E). Docstring-only changes shouldn't break tests, but verify.
- **Spot-check:** Random sample of 10 files per codebase — verify docstring accuracy and spec reference validity.
- **Cross-reference check:** Verify no broken links in traceability matrix, no dead spec references in docstrings.
- **Doc link check:** Verify all internal doc cross-references resolve.

---

## Deliverables Summary

| Deliverable | Path | Wave |
|---|---|---|
| 28 specs with requirement IDs | openspec/specs/*/spec.md | 1 |
| 28 specs reverse-synced to code | openspec/specs/*/spec.md | 1 |
| DB audit report | docs/superpowers/specs/db-audit-report.md | 1 |
| ~488 code files with structured docstrings | backend/, frontend/, admin/, tools/ | 2 |
| Traceability matrix | docs/reference/TRACEABILITY.md | 2 |
| Updated operational docs | docs/**/*.md | 3 |
| New gap-fill docs | docs/**/*.md (new files) | 3 |
| Updated AGENTS.md | AGENTS.md | 3 |
| Updated TODO.md/DONE.md | docs/project/*.md | 3 |
| Validation report | (test output + spot-check) | 4 |

---

## Scope Exclusions

- **No code logic changes** — docstrings and comments only in Wave 2
- **No DB schema changes** — audit report only, changes deferred
- **No new test writing** — test files get docstrings, not new test cases
- **tools/generators/lib/** — gets docstrings but generator internals are not refactored
