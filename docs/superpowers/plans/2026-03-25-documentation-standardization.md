# Documentation Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all 90+ project docs into a two-tree structure: OpenSpec for feature specs, Diataxis-classified `docs/` for everything else.

**Architecture:** Install OpenSpec globally, initialize in project, move non-spec docs into Diataxis categories (`how-to/`, `reference/`, `explanation/`, `project/`), consolidate 40+ feature spec files (triplets of RECS/DESIGN/SCHEMA) into 27 OpenSpec `spec.md` files, archive historical superpowers specs/plans, update all agent instructions.

**Tech Stack:** OpenSpec (`@fission-ai/openspec`), Markdown, Git

**Spec:** `docs/superpowers/specs/2026-03-25-documentation-standardization-design.md`

---

## File Structure

### New directories to create
- `openspec/` — managed by OpenSpec CLI after `openspec init`
- `openspec/specs/{27 capability folders}/` — one `spec.md` each
- `openspec/changes/archive/{5 historical change folders}/`
- `docs/how-to/` — 8 operational guides
- `docs/reference/` — 6 lookup docs
- `docs/explanation/` — 3 top-level + `lore/` subfolder with 4 files
- `docs/project/` — 3 top-level + `done/` subfolder with 2 files

### Directories to delete (after contents migrated)
- `docs/done/recs/` (62 files → `openspec/specs/`)
- `docs/recs/` (2 files → `openspec/specs/`)
- `docs/inst/` (12 files → `docs/how-to/` + `docs/reference/`)
- `docs/lore/` (4 files → `docs/explanation/lore/`)
- `docs/done/` (after all children moved)
- `docs/specs/` (1 file → `openspec/changes/archive/`)
- `docs/plans/` (1 file → `openspec/changes/archive/`)
- `docs/superpowers/` (7 files → `openspec/changes/archive/`)

---

### Task 1: Install and Initialize OpenSpec

**Files:**
- Create: `openspec/` (managed by CLI)

- [ ] **Step 1: Install OpenSpec globally**

```bash
rtk npm install -g @fission-ai/openspec@latest
```

Expected: Package installs successfully.

- [ ] **Step 2: Initialize OpenSpec in project**

```bash
cd c:/Users/ssala/OneDrive/Desktop/MMORPG/erp && openspec init
```

Expected: Creates `openspec/` directory with initial scaffolding. Review what it generates — it may create `openspec.config.json`, `.openspec/`, or similar. Accept defaults.

- [ ] **Step 3: Run openspec update to install agent instructions**

```bash
openspec update
```

Expected: Generates AI guidance files for slash commands.

- [ ] **Step 4: Verify directory structure**

```bash
rtk ls openspec/
```

Expected: See `specs/`, `changes/`, and any config files.

- [ ] **Step 5: Commit**

```bash
rtk git add openspec/ .openspec* openspec.config* && rtk git commit -m "chore: initialize OpenSpec SDD framework"
```

---

### Task 2: Create Diataxis Directory Structure

**Files:**
- Create: `docs/how-to/`, `docs/reference/`, `docs/explanation/lore/`, `docs/project/done/`

- [ ] **Step 1: Create all target directories**

```bash
mkdir -p docs/how-to docs/reference docs/explanation/lore docs/project/done
```

- [ ] **Step 2: Verify**

```bash
rtk ls docs/
```

Expected: See `how-to/`, `reference/`, `explanation/`, `project/` alongside existing directories.

- [ ] **Step 3: Commit**

```bash
rtk git add docs/ && rtk git commit -m "chore: create Diataxis directory structure"
```

---

### Task 3: Move Non-Spec Docs — How-To Guides

**Files:**
- Move: 8 files from `docs/inst/` → `docs/how-to/`

- [ ] **Step 1: Move how-to files**

```bash
mv docs/inst/TESTING.md docs/how-to/TESTING.md
mv docs/inst/DB_MIGRATIONS.md docs/how-to/DB_MIGRATIONS.md
mv docs/inst/DEPLOY.md docs/how-to/DEPLOY.md
mv docs/inst/INIT_INFRA.md docs/how-to/INIT_INFRA.md
mv docs/inst/OWNER_SETUP.md docs/how-to/OWNER_SETUP.md
mv docs/inst/SIM_TOOLKIT_GUIDE.md docs/how-to/SIM_TOOLKIT_GUIDE.md
mv docs/inst/GENERATOR_INSTRUCTIONS.md docs/how-to/GENERATOR_INSTRUCTIONS.md
mv docs/inst/GENERATOR_AI_RULES.md docs/how-to/GENERATOR_AI_RULES.md
```

- [ ] **Step 2: Verify**

```bash
rtk ls docs/how-to/
```

Expected: 8 files listed.

- [ ] **Step 3: Commit**

```bash
rtk git add -A docs/how-to/ docs/inst/ && rtk git commit -m "docs: move how-to guides from inst/ to docs/how-to/"
```

---

### Task 4: Move Non-Spec Docs — Reference Materials

**Files:**
- Move: 4 files from `docs/inst/` → `docs/reference/`, 2 files from `docs/` → `docs/reference/`

- [ ] **Step 1: Move reference files from inst/**

Note: `API_REFERENCE.md` is deliberately reclassified — it was in `inst/` alongside how-to files but is a lookup doc, not a procedural guide.

```bash
mv docs/inst/API_REFERENCE.md docs/reference/API_REFERENCE.md
mv docs/inst/CODING_GUIDE.md docs/reference/CODING_GUIDE.md
mv docs/inst/GAME_ASSETS_GUIDE.md docs/reference/GAME_ASSETS_GUIDE.md
mv docs/inst/TOOLS.md docs/reference/TOOLS.md
```

- [ ] **Step 2: Move reference files from top-level docs/**

```bash
mv docs/ARCHITECTURE.md docs/reference/ARCHITECTURE.md
mv docs/STYLE_GUIDE.md docs/reference/STYLE_GUIDE.md
```

- [ ] **Step 3: Verify inst/ is now empty and can be deleted**

```bash
rtk ls docs/inst/
```

Expected: Empty directory (or directory not found).

- [ ] **Step 4: Delete empty inst/ directory**

```bash
rmdir docs/inst/
```

- [ ] **Step 5: Commit**

```bash
rtk git add -A docs/reference/ docs/inst/ docs/ && rtk git commit -m "docs: move reference materials to docs/reference/"
```

---

### Task 5: Move Non-Spec Docs — Explanation Materials

**Files:**
- Move: 3 files from `docs/` → `docs/explanation/`, 4 files from `docs/lore/` → `docs/explanation/lore/`

- [ ] **Step 1: Move top-level explanation files**

```bash
mv docs/ROADMAP.md docs/explanation/ROADMAP.md
mv docs/INSPIRATIONS.md docs/explanation/INSPIRATIONS.md
mv docs/SUMMARY_MARKETING.md docs/explanation/SUMMARY_MARKETING.md
```

- [ ] **Step 2: Move lore files**

```bash
mv docs/lore/BOOKS_SUMMARY.md docs/explanation/lore/BOOKS_SUMMARY.md
mv docs/lore/CHARACTER_GUIDE.md docs/explanation/lore/CHARACTER_GUIDE.md
mv docs/lore/ENVIRONMENT_GUIDE.md docs/explanation/lore/ENVIRONMENT_GUIDE.md
mv docs/lore/ANNOUNCEMENT.md docs/explanation/lore/ANNOUNCEMENT.md
```

- [ ] **Step 3: Delete empty lore/ directory**

```bash
rmdir docs/lore/
```

- [ ] **Step 4: Commit**

```bash
rtk git add -A docs/explanation/ docs/lore/ docs/ROADMAP.md docs/INSPIRATIONS.md docs/SUMMARY_MARKETING.md && rtk git commit -m "docs: move explanation materials to docs/explanation/"
```

---

### Task 6: Move Non-Spec Docs — Project State Files

**Files:**
- Move: 3 files to `docs/project/`, 2 files to `docs/project/done/`

- [ ] **Step 1: Move project state files**

```bash
mv docs/TODO.md docs/project/TODO.md
mv docs/SESSION_STATE.md docs/project/SESSION_STATE.md
mv docs/done/DONE.md docs/project/DONE.md
mv docs/done/E2E_SESSION_STATE.md docs/project/done/E2E_SESSION_STATE.md
mv docs/done/SIM_PROC_BAL_SESSION_STATE.md docs/project/done/SIM_PROC_BAL_SESSION_STATE.md
```

- [ ] **Step 2: Verify docs/done/ only has recs/ remaining**

```bash
rtk ls docs/done/
```

Expected: Only `recs/` directory remains.

- [ ] **Step 3: Commit**

```bash
rtk git add -A docs/project/ docs/TODO.md docs/SESSION_STATE.md docs/done/DONE.md docs/done/E2E_SESSION_STATE.md docs/done/SIM_PROC_BAL_SESSION_STATE.md && rtk git commit -m "docs: move project state files to docs/project/"
```

---

### Task 7: Archive Superpowers Specs and Plans

**Files:**
- Move: 8 files from `docs/superpowers/` + `docs/specs/` + `docs/plans/` → `openspec/changes/archive/`

- [ ] **Step 1: Create archive directories**

```bash
mkdir -p openspec/changes/archive/2026-03-20-simulation-toolkit
mkdir -p openspec/changes/archive/2026-03-22-banner-visual-system
mkdir -p openspec/changes/archive/2026-03-23-generator-pipeline
mkdir -p openspec/changes/archive/2026-03-24-generator-reorg
mkdir -p openspec/changes/archive/2026-03-25-documentation-standardization
```

- [ ] **Step 2: Move simulation toolkit files**

```bash
mv docs/specs/2026-03-20-simulation-toolkit-design.md openspec/changes/archive/2026-03-20-simulation-toolkit/design.md
mv docs/plans/2026-03-20-simulation-toolkit-plan.md openspec/changes/archive/2026-03-20-simulation-toolkit/tasks.md
```

- [ ] **Step 3: Move banner visual system files**

```bash
mv docs/superpowers/specs/2026-03-22-banner-visual-system-design.md openspec/changes/archive/2026-03-22-banner-visual-system/design.md
mv docs/superpowers/plans/2026-03-22-banner-visual-system.md openspec/changes/archive/2026-03-22-banner-visual-system/tasks.md
```

- [ ] **Step 4: Move generator pipeline files**

```bash
mv docs/superpowers/specs/2026-03-23-generator-pipeline-design.md openspec/changes/archive/2026-03-23-generator-pipeline/design.md
mv docs/superpowers/plans/2026-03-23-generator-pipeline.md openspec/changes/archive/2026-03-23-generator-pipeline/tasks.md
```

- [ ] **Step 5: Move generator reorg files**

```bash
mv docs/superpowers/specs/2026-03-24-generator-reorg-design.md openspec/changes/archive/2026-03-24-generator-reorg/design.md
mv docs/superpowers/plans/2026-03-24-generator-reorg.md openspec/changes/archive/2026-03-24-generator-reorg/tasks.md
```

- [ ] **Step 6: Move this spec and plan (documentation standardization)**

```bash
mv docs/superpowers/specs/2026-03-25-documentation-standardization-design.md openspec/changes/archive/2026-03-25-documentation-standardization/design.md
```

Note: This plan file (`docs/superpowers/plans/2026-03-25-documentation-standardization.md`) should be moved last, after all other tasks complete — it is the active plan being executed.

- [ ] **Step 7: Verify directories are empty before deleting**

```bash
rtk ls docs/specs/ && rtk ls docs/plans/ && rtk ls docs/superpowers/specs/ && rtk ls docs/superpowers/plans/
```

Expected: All empty (or only the active plan file remains in `docs/superpowers/plans/`).

- [ ] **Step 8: Delete empty directories**

```bash
rmdir docs/specs/
rmdir docs/plans/
rmdir docs/superpowers/specs/ 2>/dev/null
# docs/superpowers/plans/ still has the active plan — leave for Task 16
# docs/superpowers/ still has plans/ — leave for Task 16
```

- [ ] **Step 9: Commit**

```bash
rtk git add -A openspec/changes/archive/ docs/specs/ docs/plans/ docs/superpowers/ && rtk git commit -m "docs: archive superpowers specs/plans (except active plan)"
```

---

### Task 8: Migrate Feature Specs — Single & Sub-Feature Conversions (10 capabilities, 16 source files)

These capabilities have 1-3 source files each but do NOT follow the full RECS+DESIGN+SCHEMA triplet pattern. Some merge sub-feature docs (e.g., 2.1 + 2.1.1), some are pure single-file conversions.

**Files:**
- Read: 16 source files from `docs/done/recs/` + `docs/recs/`
- Create: 10 `openspec/specs/{capability}/spec.md` files

**Capabilities:** `game-loop`, `overworld-hub`, `story-mode`, `idle-training`, `economy-core`, `donations`, `admin-systems`, `db-cleanup`, `testing-revamp`, `story-asset-generators`

For each capability, follow this sub-procedure:

- [ ] **Step 1: Create capability directories**

```bash
mkdir -p openspec/specs/game-loop openspec/specs/overworld-hub openspec/specs/story-mode openspec/specs/idle-training openspec/specs/economy-core openspec/specs/donations openspec/specs/admin-systems openspec/specs/db-cleanup openspec/specs/testing-revamp openspec/specs/story-asset-generators
```

- [ ] **Step 2: For each single-source capability, read the source and write spec.md**

Read each source file listed below. Convert its content into OpenSpec format using this template:

```markdown
# {capability-name} Specification

## Purpose
{Extract the one-paragraph summary from the source file's introduction}

## Requirements

### Requirement: {requirement name}
The system SHALL {convert existing requirement to RFC-2119 language}.

#### Scenario: {scenario name}
- GIVEN {precondition}
- WHEN {action}
- THEN {expected result}

## Design
{If source contains design/architecture sections, include here. Otherwise omit.}

## Schema
{If source contains schema/DB sections, include here. Otherwise omit.}
```

Source file → Destination mapping:
| Source | Destination |
|---|---|
| `docs/done/recs/2.0_GAME_LOOP.md` | `openspec/specs/game-loop/spec.md` |
| `docs/done/recs/2.1_OVERWORLD_HUB.md` + `2.1.1_ATMOSPHERIC_BATTLE_BANNER.md` | `openspec/specs/overworld-hub/spec.md` |
| `docs/done/recs/2.2_STORY_MODE.md` + `2.2.1_STORY_MODE_UI.md` | `openspec/specs/story-mode/spec.md` |
| `docs/done/recs/2.3_IDLE_TRAINING.md` + `2.3.1_IDLE_TRAINING_UX.md` + `2.3.1.0_IDLE_TRAINING_SCHEMA.md` | `openspec/specs/idle-training/spec.md` |
| `docs/done/recs/3.0_ECONOMY.md` | `openspec/specs/economy-core/spec.md` |
| `docs/done/recs/3.4_DONATIONS.md` | `openspec/specs/donations/spec.md` |
| `docs/done/recs/5.0_ADMIN_SYSTEMS.md` | `openspec/specs/admin-systems/spec.md` |
| `docs/done/recs/B_DB_CLEANUP_CONSOLIDATION.md` | `openspec/specs/db-cleanup/spec.md` |
| `docs/done/recs/5.9_TESTING_REVAMP.md` | `openspec/specs/testing-revamp/spec.md` |
| `docs/done/recs/C_STORY_ASSET_GENERATORS.md` + `docs/recs/C_STORY_ASSET_GENERATORS.md` | `openspec/specs/story-asset-generators/spec.md` |

Note: `overworld-hub`, `story-mode`, and `idle-training` merge 2-3 sub-feature files into one spec — read all source files before writing the consolidated spec.md.

- [ ] **Step 3: Verify all 10 specs created**

```bash
for d in game-loop overworld-hub story-mode idle-training economy-core donations admin-systems db-cleanup testing-revamp story-asset-generators; do test -f openspec/specs/$d/spec.md && echo "OK: $d" || echo "MISSING: $d"; done
```

Expected: 10 "OK" lines.

- [ ] **Step 4: Commit**

```bash
rtk git add openspec/specs/ && rtk git commit -m "docs: migrate 10 single-source feature specs to OpenSpec format"
```

---

### Task 9: Migrate Feature Specs — Pair Merges (3 capabilities)

These capabilities have 2 source files each (RECS + SCHEMA or RECS + READER).

**Files:**
- Read: 6 source files from `docs/done/recs/`
- Create: 3 `openspec/specs/{capability}/spec.md` files

**Capabilities:** `onboarding`, `audio-music`, `book-agent`

- [ ] **Step 1: Create capability directories**

```bash
mkdir -p openspec/specs/onboarding openspec/specs/audio-music openspec/specs/book-agent
```

- [ ] **Step 2: For each pair, read both source files and write consolidated spec.md**

| Source Files | Destination |
|---|---|
| `docs/done/recs/1_ONBOARDING_INIT_RECS.md` + `1_ONBOARDING_INIT_SCHEMA.md` | `openspec/specs/onboarding/spec.md` |
| `docs/done/recs/2.5_AUDIO_MUSIC.md` + `2.5_AUDIO_MUSIC_SCHEMA.md` | `openspec/specs/audio-music/spec.md` |
| `docs/done/recs/A_BOOK_AGENT_READER.md` + `A_BOOK_AGENT_SCHEMA.md` | `openspec/specs/book-agent/spec.md` |

Use the same OpenSpec template from Task 8 Step 2. The RECS file provides Requirements and Design sections; the SCHEMA file provides the Schema section.

- [ ] **Step 3: Verify**

```bash
for d in onboarding audio-music book-agent; do test -f openspec/specs/$d/spec.md && echo "OK: $d" || echo "MISSING: $d"; done
```

- [ ] **Step 4: Commit**

```bash
rtk git add openspec/specs/ && rtk git commit -m "docs: migrate 3 pair-merge feature specs to OpenSpec format"
```

---

### Task 10: Migrate Feature Specs — Triplet Merges (15 capabilities)

These capabilities have 3 source files each (RECS + DESIGN + SCHEMA).

**Files:**
- Read: 45 source files from `docs/done/recs/`
- Create: 15 `openspec/specs/{capability}/spec.md` files

**Capabilities:** `character-progression`, `economy-anticheat`, `home-base-hub`, `stripe-purchasing`, `subscription`, `elysium-emporium`, `dreamwalkers-bazaar`, `admin-finance`, `player-character-management`, `game-content-editor`, `entity-classification`, `banner-scaling-editor`, `content-management`, `dev-content-audit`, `asset-registry`

- [ ] **Step 1: Create capability directories**

```bash
mkdir -p openspec/specs/character-progression openspec/specs/economy-anticheat openspec/specs/home-base-hub openspec/specs/stripe-purchasing openspec/specs/subscription openspec/specs/elysium-emporium openspec/specs/dreamwalkers-bazaar openspec/specs/admin-finance openspec/specs/player-character-management openspec/specs/game-content-editor openspec/specs/entity-classification openspec/specs/banner-scaling-editor openspec/specs/content-management openspec/specs/dev-content-audit openspec/specs/asset-registry
```

- [ ] **Step 2: For each triplet, read all 3 source files and write consolidated spec.md**

| Source Files (RECS + DESIGN + SCHEMA) | Destination |
|---|---|
| `2.4_CHARACTER_PROGRESSION.md` + `_DESIGN.md` + `_SCHEMA.md` | `character-progression/` |
| `2.6_ECONOMY_ANTICHEAT.md` + `_DESIGN.md` + `_SCHEMA.md` | `economy-anticheat/` |
| `2.7_HOME_BASE_HUB.md` + `_DESIGN.md` + `_SCHEMA.md` | `home-base-hub/` |
| `3.1_STRIPE_SHARD_PURCHASING.md` + `_DESIGN.md` + `_SCHEMA.md` | `stripe-purchasing/` |
| `3.2_SUBSCRIPTION_ELYSIUM_ASCENDANT.md` + `_DESIGN.md` + `_SCHEMA.md` | `subscription/` |
| `3.3_ELYSIUM_EMPORIUM.md` + `_DESIGN.md` + `_SCHEMA.md` | `elysium-emporium/` |
| `3.5_DREAMWALKERS_BAZAAR.md` + `_DESIGN.md` + `_SCHEMA.md` | `dreamwalkers-bazaar/` |
| `3.6_ADMIN_FINANCE_DASHBOARD.md` + `_DESIGN.md` + `_SCHEMA.md` | `admin-finance/` |
| `5.1_PLAYER_CHARACTER_MANAGEMENT.md` + `_DESIGN.md` + `_SCHEMA.md` | `player-character-management/` |
| `5.2_GAME_CONTENT_EDITOR.md` + `_DESIGN.md` + `_SCHEMA.md` | `game-content-editor/` |
| `5.3_ENTITY_CLASSIFICATION.md` + `_DESIGN.md` + `_SCHEMA.md` | `entity-classification/` |
| `5.4_BANNER_SCALING_EDITOR.md` + `_DESIGN.md` + `_SCHEMA.md` | `banner-scaling-editor/` |
| `5.5_CONTENT_MANAGEMENT_LIVE_TUNING.md` + `_DESIGN.md` + `_SCHEMA.md` | `content-management/` |
| `5.6_DEV_CONTENT_AUDIT.md` + `_DESIGN.md` + `_SCHEMA.md` | `dev-content-audit/` |
| `5.7_ASSET_REGISTRY.md` + `_DESIGN.md` + `_SCHEMA.md` | `asset-registry/` |

All source files are in `docs/done/recs/`. Use the OpenSpec template:
- RECS file → Purpose + Requirements sections
- DESIGN file → Design section
- SCHEMA file → Schema section

Convert requirements to RFC-2119 language (SHALL/SHOULD/MAY) and add GIVEN/WHEN/THEN scenarios for key behaviors.

- [ ] **Step 3: Verify all 15 specs created**

```bash
for d in character-progression economy-anticheat home-base-hub stripe-purchasing subscription elysium-emporium dreamwalkers-bazaar admin-finance player-character-management game-content-editor entity-classification banner-scaling-editor content-management dev-content-audit asset-registry; do test -f openspec/specs/$d/spec.md && echo "OK: $d" || echo "MISSING: $d"; done
```

Expected: 15 "OK" lines.

- [ ] **Step 4: Commit**

```bash
rtk git add openspec/specs/ && rtk git commit -m "docs: migrate 15 triplet-merge feature specs to OpenSpec format"
```

---

### Task 11: Decompose Master Requirements

The master requirements file (`docs/done/recs/0_REQUIREMENTS.md` and `docs/recs/0_REQUIREMENTS.md`) contains cross-cutting requirements that should be distributed across capability specs.

**Files:**
- Read: `docs/done/recs/0_REQUIREMENTS.md`, `docs/recs/0_REQUIREMENTS.md`
- Modify: Relevant `openspec/specs/{capability}/spec.md` files

- [ ] **Step 1: Read both master requirements files**

Compare `docs/done/recs/0_REQUIREMENTS.md` and `docs/recs/0_REQUIREMENTS.md`. The `recs/` version may be more current.

- [ ] **Step 2: For each requirement section, identify the target capability**

Map each numbered section of the master requirements to its corresponding capability folder in `openspec/specs/`. Add any requirements not already captured in the capability's spec.md.

- [ ] **Step 3: Verify no requirements were lost**

Review the master requirements file section by section and confirm each requirement exists in at least one capability spec.

- [ ] **Step 4: Commit**

```bash
rtk git add openspec/specs/ && rtk git commit -m "docs: decompose master requirements across capability specs"
```

---

### Task 12: Delete Old Spec Source Files

**Files:**
- Delete: All files in `docs/done/recs/`, `docs/recs/`

- [ ] **Step 1: Verify all specs have been migrated**

```bash
ls openspec/specs/ | wc -l
```

Expected: 27 directories.

- [ ] **Step 1b: Verify docs/recs/ content was fully consumed**

```bash
rtk ls docs/recs/
```

Expected: Only `0_REQUIREMENTS.md` and `C_STORY_ASSET_GENERATORS.md` — both already consumed by Tasks 8 and 11.

- [ ] **Step 2: Delete done/recs/ contents**

```bash
rm -rf docs/done/recs/
```

- [ ] **Step 3: Delete recs/ contents**

```bash
rm -rf docs/recs/
```

- [ ] **Step 4: Delete now-empty docs/done/ if empty**

```bash
rmdir docs/done/ 2>/dev/null || echo "docs/done/ not empty, check contents"
```

- [ ] **Step 5: Commit**

```bash
rtk git add -A docs/done/ docs/recs/ && rtk git commit -m "docs: remove old spec source files (migrated to openspec/specs/)"
```

---

### Task 13: Update AGENTS.md

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Read current AGENTS.md**

Read `AGENTS.md` to find the sections that need updating:
1. Documentation Hierarchy (section 12 in current numbering)
2. Directory Structure & Ownership
3. Documentation & Process Mandates

- [ ] **Step 2: Replace Documentation Hierarchy section**

Replace the current documentation hierarchy with:

```markdown
## Documentation Hierarchy

### Feature Specs (OpenSpec)
All feature requirements, design, and schema live in `openspec/specs/`.
- To understand a feature: `openspec/specs/{capability}/spec.md`
- To see active work: `openspec/changes/`
- To see historical changes: `openspec/changes/archive/`
- Specs use RFC-2119 (SHALL/SHOULD/MAY) + GIVEN/WHEN/THEN scenarios.
- New features: use `/opsx:propose` to create, `/opsx:apply` to implement,
  `/opsx:archive` to finalize.

### Non-Spec Docs (Diataxis — `docs/`)
| Category | Path | Use When |
|----------|------|----------|
| How-to | `docs/how-to/` | You need step-by-step instructions (deploy, test, migrate) |
| Reference | `docs/reference/` | You need to look up API, architecture, coding standards |
| Explanation | `docs/explanation/` | You need background context (lore, roadmap, rationale) |
| Project | `docs/project/` | You need current status (TODO, DONE, SESSION_STATE) |
```

- [ ] **Step 3: Update Directory Structure section**

Update the `/docs` entry and add `/openspec`:

```markdown
- `/openspec`: Feature specs (OpenSpec SDD framework).
  - `/openspec/specs`: Persistent spec library, one folder per capability.
  - `/openspec/changes`: Active and archived feature changes.
- `/docs`: Non-spec documentation (Diataxis classification).
  - `/docs/how-to`: Operational guides (testing, deploy, migrations).
  - `/docs/reference`: API, architecture, coding standards, style guide.
  - `/docs/explanation`: Lore, roadmap, marketing, inspirations.
  - `/docs/project`: TODO, DONE, SESSION_STATE.
```

- [ ] **Step 4: Update Process Mandates section**

Add/replace these mandates:

```markdown
- **Spec-Driven Development:** Every new feature MUST start with `/opsx:propose`.
  Implementation begins only after spec approval.
- **Spec Sync:** Any functional change MUST update the corresponding
  `openspec/specs/{capability}/spec.md`.
- **Doc Classification:** New operational docs go in `docs/how-to/` or `docs/reference/`.
  Never put feature requirements in `docs/`.
```

- [ ] **Step 5: Update all doc path references in AGENTS.md**

Find and replace all old paths:
- `docs/inst/TESTING.md` → `docs/how-to/TESTING.md`
- `docs/inst/DB_MIGRATIONS.md` → `docs/how-to/DB_MIGRATIONS.md`
- `docs/inst/INIT_INFRA.md` → `docs/how-to/INIT_INFRA.md`
- `docs/inst/CODING_GUIDE.md` → `docs/reference/CODING_GUIDE.md`
- `docs/ARCHITECTURE.md` → `docs/reference/ARCHITECTURE.md`
- `docs/ROADMAP.md` → `docs/explanation/ROADMAP.md`
- `docs/SESSION_STATE.md` → `docs/project/SESSION_STATE.md`
- `docs/TODO.md` → `docs/project/TODO.md`
- `docs/done/DONE.md` → `docs/project/DONE.md`
- `docs/lore/` → `docs/explanation/lore/`
- `docs/done/recs/` → `openspec/specs/`
- Any `@docs/inst/` → appropriate new path
- Any `@docs/recs/` → `openspec/specs/`

- [ ] **Step 6: Commit**

```bash
rtk git add AGENTS.md && rtk git commit -m "docs: update AGENTS.md for OpenSpec + Diataxis structure"
```

---

### Task 14: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Read current CLAUDE.md**

Read `CLAUDE.md` and find all references to old doc paths.

- [ ] **Step 2: Update all doc path references**

Apply the same path replacements as Task 13 Step 5. The `@AGENTS.md` reference stays unchanged since AGENTS.md is still at root.

- [ ] **Step 3: Commit**

```bash
rtk git add CLAUDE.md && rtk git commit -m "docs: update CLAUDE.md for new documentation paths"
```

---

### Task 15: Verify No Broken References

**Files:**
- Check: `AGENTS.md`, `CLAUDE.md`, `backend/**/*.py`, `db/data_dictionary.md`, `frontend/**/*.ts`, `admin/**/*.ts`, `tools/**/*.py`

- [ ] **Step 1: Grep for old paths across the codebase**

Search for references to deleted directories:

```bash
# Search for all old doc paths in text files
for pattern in "docs/inst/" "docs/done/recs/" "docs/recs/" "docs/lore/" "docs/specs/" "docs/plans/" "docs/superpowers/" "docs/ROADMAP.md" "docs/TODO.md" "docs/SESSION_STATE.md" "docs/ARCHITECTURE.md" "docs/STYLE_GUIDE.md" "docs/INSPIRATIONS.md" "docs/SUMMARY_MARKETING.md"; do
  rtk grep -r "$pattern" --include="*.md" --include="*.py" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v ".git" | grep -v "openspec/changes/archive/"
done
```

Expected: No matches (all references updated).

- [ ] **Step 2: Fix any remaining references found in Step 1**

Update any files that still reference old paths.

- [ ] **Step 3: Check MEMORY.md for stale references**

Read `C:\Users\ssala\.claude\projects\c--Users-ssala-OneDrive-Desktop-MMORPG-erp\memory\MEMORY.md` and update any old doc paths.

- [ ] **Step 4: Commit any fixes**

```bash
rtk git add -A && rtk git commit -m "docs: fix remaining references to old doc paths"
```

---

### Task 16: Move This Plan File and Final Cleanup

**Files:**
- Move: `docs/superpowers/plans/2026-03-25-documentation-standardization.md` → `openspec/changes/archive/2026-03-25-documentation-standardization/tasks.md`

- [ ] **Step 1: Move this plan to the archive**

```bash
mv docs/superpowers/plans/2026-03-25-documentation-standardization.md openspec/changes/archive/2026-03-25-documentation-standardization/tasks.md
```

- [ ] **Step 2: Delete any remaining empty directories**

```bash
rmdir docs/superpowers/plans/ 2>/dev/null
rmdir docs/superpowers/specs/ 2>/dev/null
rmdir docs/superpowers/ 2>/dev/null
rmdir docs/specs/ 2>/dev/null
rmdir docs/plans/ 2>/dev/null
rmdir docs/done/ 2>/dev/null
```

- [ ] **Step 3: Final verification — docs/ should only contain Diataxis directories**

```bash
rtk ls docs/
```

Expected: Only `how-to/`, `reference/`, `explanation/`, `project/` directories.

- [ ] **Step 4: Final verification — openspec/ should have all specs and archives**

```bash
rtk ls openspec/specs/ | wc -l
rtk ls openspec/changes/archive/
```

Expected: 27 capability directories, 5 archive directories.

- [ ] **Step 5: Commit**

```bash
rtk git add -A && rtk git commit -m "docs: complete documentation standardization migration"
```
