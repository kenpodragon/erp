# Docs Consolidation & Deduplication — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate overlapping documentation, add cross-references, and clarify per-file audience across 7 change areas.

**Architecture:** Surgical file-by-file edits. No new files created. No files deleted. Each task produces one commit.

**Tech Stack:** Markdown only. No code changes.

**Spec:** `docs/superpowers/specs/2026-03-25-docs-consolidation-design.md`

---

## File Map

| File | Action |
|------|--------|
| `AGENTS.md` | Trim doc hierarchy + tech stack → reference ARCHITECTURE.md |
| `docs/how-to/DEPLOY.md` | Remove testing content, add TESTING.md cross-ref |
| `docs/how-to/TESTING.md` | Verify completeness; add missing commands if needed |
| `docs/how-to/INIT_INFRA.md` | Trim DB detail, add DB_MIGRATIONS.md cross-ref |
| `docs/reference/API_REFERENCE.md` | Add audience header + cross-ref to API_GUIDE.md |
| `admin/docs/API_GUIDE.md` | Add audience header + cross-ref to API_REFERENCE.md |
| `docs/reference/STYLE_GUIDE.md` | Add audience header + cross-ref to GAME_ASSETS_GUIDE.md |
| `docs/reference/GAME_ASSETS_GUIDE.md` | Add audience header + cross-ref to STYLE_GUIDE.md |
| `docs/reference/TOOLS.md` | Add simulation toolkit section, OpenSpec workflow, watchdog + generators coverage |

---

### Task 1: AGENTS.md — Trim Doc Hierarchy + Tech Stack Reference

**Files:**
- Modify: `AGENTS.md`
- Reference: `docs/reference/ARCHITECTURE.md`

- [ ] **Step 1: Read AGENTS.md** — Identify the "Documentation Hierarchy" section (§ 📜, ~lines 67–99) and "Tech Stack Mandates" section (§ 🛠️, ~lines 8–14)

- [ ] **Step 2: Replace Documentation Hierarchy section** — Remove the detailed table and numbered consultation order. Replace with:
```markdown
## 📜 Documentation & Specs

Documentation follows [Diataxis](https://diataxis.fr/) classification in `docs/`:
- `docs/how-to/` — Step-by-step operational guides (deploy, test, migrate)
- `docs/reference/` — Technical standards (API, architecture, coding, style)
- `docs/explanation/` — Background context (lore, roadmap, marketing)
- `docs/project/` — Current status (TODO, DONE, SESSION_STATE)

Feature specifications live in `openspec/specs/` (one folder per capability). Use `/opsx:propose` to create new specs, `/opsx:apply` to implement, `/opsx:archive` to finalize.
```

- [ ] **Step 3: Replace Tech Stack Mandates** — Replace the detailed tech stack listing with a reference to ARCHITECTURE.md, keeping only the top-level mandate format:
```markdown
## 🛠️ Tech Stack

See `docs/reference/ARCHITECTURE.md` for the full technology stack and architectural decisions.

**Key mandates:**
- **Frontend:** React + Vite + TypeScript + Vanilla CSS. PixiJS (via `@pixi/react`) for 2D game rendering.
- **Backend:** Python + FastAPI + SQLModel/SQLAlchemy.
- **Database:** PostgreSQL (Cloud SQL). SQLite in-memory for unit test mocking only.
- **Auth:** Firebase (Google SSO). **No spoofing or bypass mechanisms.**
- **DevOps:** Docker, Google Cloud Build, Google Cloud Run.
```

- [ ] **Step 4: Verify no broken references** — Ensure no other section references the removed consultation order by number

- [ ] **Step 5: Commit**
```bash
git add AGENTS.md
git commit -m "docs: trim AGENTS.md doc hierarchy and tech stack, reference ARCHITECTURE.md"
```

---

### Task 2: DEPLOY.md — Deploy Only + TESTING.md Verification

**Files:**
- Modify: `docs/how-to/DEPLOY.md`
- Verify: `docs/how-to/TESTING.md`

- [ ] **Step 1: Read DEPLOY.md** — Identify testing-related content (~lines 40–65, § "Local Verification & Testing")

- [ ] **Step 2: Read TESTING.md** — Verify it already covers the test execution instructions (pytest, vitest, playwright commands) that will be removed from DEPLOY.md

- [ ] **Step 3: Remove testing content from DEPLOY.md** — Replace inline test instructions with a cross-reference:
```markdown
> **Testing:** For running the test suite (pytest, vitest, playwright), see [`docs/how-to/TESTING.md`](TESTING.md).
```
Keep Docker orchestration details that are deployment-specific (build commands, container startup).

- [ ] **Step 4: If TESTING.md is missing any test commands removed from DEPLOY.md** — Add them to the appropriate section in TESTING.md

- [ ] **Step 5: Commit**
```bash
git add docs/how-to/DEPLOY.md docs/how-to/TESTING.md
git commit -m "docs: separate DEPLOY.md from testing, add TESTING.md cross-ref"
```

---

### Task 3: INIT_INFRA.md — High-Level + DB_MIGRATIONS Cross-Ref

**Files:**
- Modify: `docs/how-to/INIT_INFRA.md`
- Reference: `docs/how-to/DB_MIGRATIONS.md`

- [ ] **Step 1: Read INIT_INFRA.md** — Identify deep DB migration content (~lines 179–212, local dev/orchestration sections that duplicate DEPLOY.md and DB_MIGRATIONS.md)

- [ ] **Step 2: Trim DB-specific detail** — Where DB initialization goes beyond "install PostgreSQL and create the database," replace with:
```markdown
> **Database Migrations:** For detailed migration procedures, schema management, and production DB operations, see [`docs/how-to/DB_MIGRATIONS.md`](DB_MIGRATIONS.md).
```

- [ ] **Step 3: Trim deployment overlap (enhancement beyond spec)** — Where local dev/orchestration duplicates DEPLOY.md, replace with:
```markdown
> **Local Development & Deployment:** For Docker orchestration and deployment procedures, see [`docs/how-to/DEPLOY.md`](DEPLOY.md).
```

- [ ] **Step 4: Verify remaining content is infrastructure-only** — GCP project setup, Firebase config, Stripe keys, GitHub Actions, domain/DNS should remain

- [ ] **Step 5: Commit**
```bash
git add docs/how-to/INIT_INFRA.md
git commit -m "docs: trim INIT_INFRA.md, add cross-refs to DB_MIGRATIONS and DEPLOY"
```

---

### Task 4: API_REFERENCE.md + API_GUIDE.md — Audience Clarity

**Files:**
- Modify: `docs/reference/API_REFERENCE.md`
- Modify: `admin/docs/API_GUIDE.md`

- [ ] **Step 1: Read API_REFERENCE.md** — Check for any user-facing/workflow language that belongs in API_GUIDE.md

- [ ] **Step 2: Read admin/docs/API_GUIDE.md** — Check for any raw technical endpoint specs that belong in API_REFERENCE.md

- [ ] **Step 3: Add audience header to API_REFERENCE.md** — Insert after the title:
```markdown
> **Audience:** Backend developers and API consumers. Technical endpoint reference with HTTP methods, paths, request/response schemas.
> For the admin dashboard user guide, see [`admin/docs/API_GUIDE.md`](../../admin/docs/API_GUIDE.md).
```

- [ ] **Step 4: Add audience header to API_GUIDE.md** — Insert after the title:
```markdown
> **Audience:** Admin dashboard end-users. Action-oriented guide for common workflows and operations.
> For technical API details (endpoints, schemas, parameters), see [`docs/reference/API_REFERENCE.md`](../../docs/reference/API_REFERENCE.md).
```

- [ ] **Step 5: Move any misplaced content** — If API_REFERENCE.md has workflow language, move to API_GUIDE.md. If API_GUIDE.md has raw endpoint specs, move to API_REFERENCE.md.

- [ ] **Step 6: Commit**
```bash
git add docs/reference/API_REFERENCE.md admin/docs/API_GUIDE.md
git commit -m "docs: clarify API_REFERENCE vs API_GUIDE audiences, add cross-refs"
```

---

### Task 5: STYLE_GUIDE.md + GAME_ASSETS_GUIDE.md — Cross-References

**Files:**
- Modify: `docs/reference/STYLE_GUIDE.md`
- Modify: `docs/reference/GAME_ASSETS_GUIDE.md`

- [ ] **Step 1: Read both files** — Note current headers and content scope

- [ ] **Step 2: Add audience header to STYLE_GUIDE.md** — Insert after the title:
```markdown
> **Audience:** Frontend developers. CSS custom properties, color palette, typography, and spacing tokens for the player-facing UI.
> For the procedural asset rendering pipeline (JSON definitions, DB→runtime flow), see [`GAME_ASSETS_GUIDE.md`](GAME_ASSETS_GUIDE.md).
```

- [ ] **Step 3: Add audience header to GAME_ASSETS_GUIDE.md** — Insert after the title:
```markdown
> **Audience:** Full-stack developers and content pipeline operators. Procedural asset system architecture: JSON render definitions in DB, runtime rendering, generator pipeline.
> For frontend design tokens (colors, typography, spacing), see [`STYLE_GUIDE.md`](STYLE_GUIDE.md).
```

- [ ] **Step 4: Commit**
```bash
git add docs/reference/STYLE_GUIDE.md docs/reference/GAME_ASSETS_GUIDE.md
git commit -m "docs: add audience headers and cross-refs to STYLE_GUIDE and GAME_ASSETS_GUIDE"
```

---

### Task 6: TOOLS.md — Merge & Standardize with OpenSpec

**Files:**
- Modify: `docs/reference/TOOLS.md`
- Reference: `tools/sim/README.md`

- [ ] **Step 1: Read TOOLS.md and tools/sim/README.md** — Identify current coverage and gaps

- [ ] **Step 2: Add Simulation Toolkit section** — Insert a section covering `tools/sim/` with a reference to sim/README.md for details:
```markdown
## Simulation Toolkit

### `tools/sim/` — Progression & Scaling Validation

Three-layer simulation (math model, API bot, browser bot) validates game scaling against the 60-hour casual completion target. See `tools/sim/README.md` for full usage and player profiles.

```bash
python tools/sim/sim_math.py --profile profiles/casual.json
python tools/sim/sim_api.py --profile profiles/power_gamer.json
python tools/sim/sim_browser.py --profile profiles/new_user.json
```
```

- [ ] **Step 3: Add Generators section** — Cover `tools/generators/` (16 generators, framework library):
```markdown
## Content Generators

### `tools/generators/` — AI-Powered Content Pipeline

16 generators producing game content (sprites, lore, backgrounds, icons, atmospheres). Framework library in `tools/generators/lib/` (BaseGenerator ABC, AI provider, DB client, cache).

See `docs/how-to/GENERATOR_INSTRUCTIONS.md` for execution guide and `docs/how-to/GENERATOR_AI_RULES.md` for quality rules.
```

- [ ] **Step 4: Add Watchdog section** — Cover `tools/watchdog/`:
```markdown
## Watchdog Agent

### `tools/watchdog/` — Autonomous Content Quality Agent

PowerShell supervisor that runs Claude overnight for bulk content regeneration. Auto-restarts on crash/stall (20 min timeout, max 10 restarts).

See `tools/watchdog/AGENT_INSTRUCTIONS.md` for execution guide and `tools/watchdog/AGENT_GOALS.md` for acceptance criteria.

```bash
powershell -ExecutionPolicy Bypass -File tools\watchdog\START_AUTONOMOUS.ps1
```
```

- [ ] **Step 5: Add OpenSpec workflow section**:
```markdown
## OpenSpec Workflow

Feature development follows the OpenSpec spec-driven development cycle:

1. **Propose** (`/opsx:propose`) — Create a new feature spec with design, requirements, and tasks
2. **Apply** (`/opsx:apply`) — Implement tasks from an approved spec
3. **Archive** (`/opsx:archive`) — Finalize and archive a completed change

Specs live in `openspec/specs/` (one folder per capability). Active changes in `openspec/changes/`, archived in `openspec/changes/archive/`.
```

- [ ] **Step 6: Remove only the high-level project description paragraph from tools/sim/README.md** — Keep all usage details, profile definitions, player profiles, results interpretation, and install instructions. Only remove the top-level overview paragraph that is now covered by the TOOLS.md Simulation Toolkit section.

- [ ] **Step 7: Commit**
```bash
git add docs/reference/TOOLS.md tools/sim/README.md
git commit -m "docs: expand TOOLS.md with generators, watchdog, sim, and OpenSpec workflow"
```

---

### Task 7: Verification

- [ ] **Step 1: Grep for duplicate content** — Search modified files for repeated phrases or sections that indicate remaining overlap

- [ ] **Step 2: Verify all cross-reference links** — Ensure every `see [file]` reference points to a file that exists

- [ ] **Step 3: Update TODO.md** — In the "Backlog — Documentation Cleanup" section, check off `- [x] Consolidate and deduplicate docs (merge overlapping specs, remove stale files)`

- [ ] **Step 4: Final commit if any fixes needed**
```bash
git add -A
git commit -m "docs: verification pass — fix any remaining overlaps or broken links"
```
