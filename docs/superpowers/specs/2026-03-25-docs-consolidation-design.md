# Docs Consolidation & Deduplication — Design Spec

**Date:** 2026-03-25
**Scope:** Consolidate overlapping docs, add cross-references, clarify audience per file. No new docs created (except cross-ref headers). No files deleted this session.

---

## 1. AGENTS.md — Trim Documentation Hierarchy + Tech Stack Reference

**Problem:** The "Documentation Hierarchy" section (~20 lines) re-explains the docs/ structure that is self-evident from the Diataxis layout. The "Tech Stack Mandates" section duplicates content already in `docs/reference/ARCHITECTURE.md`.

**Change:**
- Remove the detailed "Documentation Hierarchy" table and numbered consultation order
- Replace with a brief paragraph: point to `docs/` structure (how-to, reference, explanation, project) and `openspec/specs/` for feature specs
- Replace tech stack detail with a reference to `docs/reference/ARCHITECTURE.md`, keeping only the top-level mandate (e.g., "See ARCHITECTURE.md for full tech stack")
- Keep: mission, testing mandates, directory structure, agent procedures, lore context

**Files:** `AGENTS.md`

---

## 2. DEPLOY.md — Deploy Only

**Problem:** Contains testing procedure content that belongs in `TESTING.md`.

**Change:**
- Remove any test execution instructions (pytest, vitest, playwright commands)
- Keep: Docker build, Cloud Build triggers, Cloud Run deployment, environment configuration
- Add cross-reference: "For testing procedures, see `docs/how-to/TESTING.md`"
- Verify TESTING.md contains the test execution instructions being removed from DEPLOY.md; add them if missing

**Files:** `docs/how-to/DEPLOY.md`

---

## 3. INIT_INFRA.md — High-Level + Reference Link

**Problem:** DB setup content overlaps with `DB_MIGRATIONS.md`. INIT_INFRA should be the high-level onboarding guide.

**Change:**
- Keep high-level setup steps (GCP project, Firebase config, PostgreSQL install, Docker setup)
- Where DB initialization goes into migration detail, replace with: "For detailed migration procedures and production DB management, see `docs/how-to/DB_MIGRATIONS.md`"
- No deep SQL or migration-specific content should remain

**Files:** `docs/how-to/INIT_INFRA.md`

---

## 4. API_REFERENCE.md — Ensure Purely Technical

**Problem:** May contain user-facing language that belongs in admin/docs/API_GUIDE.md.

**Change:**
- Verify content is endpoint/param/response focused (HTTP methods, paths, request bodies, response schemas)
- Remove any "how to use" or workflow language — that belongs in API_GUIDE.md
- Add header: "Technical API reference for backend developers. For end-user admin guide, see `admin/docs/API_GUIDE.md`"

**Files:** `docs/reference/API_REFERENCE.md`

---

## 5. admin/docs/API_GUIDE.md — Ensure End-User Focused

**Problem:** May contain raw technical details that belong in API_REFERENCE.md.

**Change:**
- Verify content is action-oriented (what to do, what to expect, common workflows)
- Remove raw endpoint specs, request/response schemas — those belong in API_REFERENCE.md
- Add header: "Admin dashboard user guide. For technical API details, see `docs/reference/API_REFERENCE.md`"

**Files:** `admin/docs/API_GUIDE.md`

---

## 6. STYLE_GUIDE.md + GAME_ASSETS_GUIDE.md — Cross-References

**Problem:** Both cover visual design for different audiences but don't reference each other.

**Change:**
- STYLE_GUIDE.md: Add audience header ("Frontend developers — CSS custom properties, color palette, typography, spacing tokens") + link to GAME_ASSETS_GUIDE.md for asset rendering pipeline
- GAME_ASSETS_GUIDE.md: Add audience header ("Full-stack developers — procedural asset system, JSON render definitions, DB→runtime flow") + link to STYLE_GUIDE.md for design tokens

**Files:** `docs/reference/STYLE_GUIDE.md`, `docs/reference/GAME_ASSETS_GUIDE.md`

---

## 7. TOOLS.md — Merge & Standardize with OpenSpec

**Problem:** TOOLS.md is a reference listing that may overlap with individual tool READMEs. Since the project adopted OpenSpec, the tools reference should reflect the current workflow.

**Change:**
- Consolidate any overlapping content from `tools/sim/README.md` into TOOLS.md
- Add OpenSpec workflow section documenting the spec lifecycle commands: `/opsx:propose` (create spec), `/opsx:apply` (implement tasks), `/opsx:archive` (finalize completed changes)
- Cover all three tool subdirectories: `tools/generators/`, `tools/sim/`, `tools/watchdog/` — add entries for any not currently documented
- Make TOOLS.md the single canonical reference for the `tools/` directory
- Individual tool READMEs can remain for setup/usage details but should not duplicate TOOLS.md overview content

**Files:** `docs/reference/TOOLS.md`, potentially `tools/sim/README.md`

---

## Out of Scope (pre-production cleanup)

These files are intentionally left alone for now:
- `docs/explanation/lore/ANNOUNCEMENT.md` + `docs/explanation/SUMMARY_MARKETING.md` → WordPress transfer later
- `docs/explanation/INSPIRATIONS.md` → Delete before publish
- `docs/explanation/lore/BOOKS_SUMMARY.md`, `CHARACTER_GUIDE.md`, `ENVIRONMENT_GUIDE.md` → Remove post-project
- `docs/project/TODO.md` + `SESSION_STATE.md` → Deprecate after build
- `docs/project/done/` archived states → Remove before publish
- `tools/watchdog/` artifacts → Remove before publish
- `docs/how-to/OWNER_SETUP.md` — Standalone, no overlaps identified
- `docs/how-to/SIM_TOOLKIT_GUIDE.md` — Standalone, no overlaps identified
- `docs/reference/CODING_GUIDE.md` — Standalone, no overlaps identified
- `docs/explanation/ROADMAP.md` — Standalone, no overlaps identified

---

## Verification

After all changes, grep modified files for duplicate content to confirm no remaining overlap. Verify all cross-reference links point to valid files.

---

## Execution Order

1. AGENTS.md (self-contained, no dependencies)
2. DEPLOY.md + TESTING.md (paired — remove from DEPLOY, verify in TESTING)
3. INIT_INFRA.md (add DB_MIGRATIONS cross-ref)
4. API_REFERENCE.md + API_GUIDE.md (paired — clarify audiences)
5. STYLE_GUIDE.md + GAME_ASSETS_GUIDE.md (add cross-refs)
6. TOOLS.md (merge + OpenSpec standardization)
