# Documentation Standardization Design

**Date:** 2026-03-25
**Status:** Approved
**Scope:** Full documentation restructure — OpenSpec adoption + Diataxis classification

## Problem

The ERP project has 90+ markdown files across an inconsistent homegrown structure:
- `done/recs/` contains 40+ files using an inconsistent triplet pattern (`_RECS.md` / `_DESIGN.md` / `_SCHEMA.md`) — some features have all 3, others have 1-2
- `inst/` mixes how-to guides with reference material
- `recs/` duplicates content from `done/recs/`
- `specs/` and `plans/` hold superpowers-generated docs with date prefixes
- Top-level files (ROADMAP, ARCHITECTURE, TODO, etc.) have no classification
- No consistent template across docs
- No clear signal to agents about what type of doc each file is

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primary framework | OpenSpec (Fission-AI) | AI-agent-first SDD, 34k stars, native Claude Code support, brownfield-friendly |
| Non-spec classification | Diataxis | Proven 4-quadrant model (how-to, reference, explanation, tutorials) |
| Audience priority | AI agents + solo dev now, future contributors later | Guides format choices toward parseable, structured specs |
| Tooling | Full OpenSpec npm adoption | Slash commands, managed folder structure, spec deltas |
| Migration strategy | Big bang — one pass | Clean cut, no half-states |
| Spec/non-spec split | Two trees (`openspec/` + `docs/`) | Clean separation of concerns, each tree has one classification system |

## Architecture

### Two-Tree Structure

```
erp/
├── openspec/                    ← OpenSpec manages this entirely
│   ├── specs/                   ← Persistent spec library (by capability)
│   │   ├── onboarding/spec.md
│   │   ├── game-loop/spec.md
│   │   ├── overworld-hub/spec.md
│   │   ├── story-mode/spec.md
│   │   ├── idle-training/spec.md
│   │   ├── character-progression/spec.md
│   │   ├── audio-music/spec.md
│   │   ├── economy-anticheat/spec.md
│   │   ├── home-base-hub/spec.md
│   │   ├── economy-core/spec.md
│   │   ├── stripe-purchasing/spec.md
│   │   ├── subscription/spec.md
│   │   ├── elysium-emporium/spec.md
│   │   ├── donations/spec.md
│   │   ├── dreamwalkers-bazaar/spec.md
│   │   ├── admin-finance/spec.md
│   │   ├── admin-systems/spec.md
│   │   ├── player-character-management/spec.md
│   │   ├── game-content-editor/spec.md
│   │   ├── entity-classification/spec.md
│   │   ├── banner-scaling-editor/spec.md
│   │   ├── content-management/spec.md
│   │   ├── dev-content-audit/spec.md
│   │   ├── asset-registry/spec.md
│   │   ├── story-asset-generators/spec.md
│   │   ├── book-agent/spec.md
│   │   ├── db-cleanup/spec.md
│   │   └── testing-revamp/spec.md
│   │   (27 capabilities total)
│   └── changes/
│       └── archive/             ← Historical change records
│           ├── 2026-03-20-simulation-toolkit/
│           ├── 2026-03-22-banner-visual-system/
│           ├── 2026-03-23-generator-pipeline/
│           └── 2026-03-24-generator-reorg/
│
├── docs/                        ← Diataxis-classified, manually maintained
│   ├── how-to/                  ← "I need to DO something"
│   │   ├── TESTING.md
│   │   ├── DB_MIGRATIONS.md
│   │   ├── DEPLOY.md
│   │   ├── INIT_INFRA.md
│   │   ├── OWNER_SETUP.md
│   │   ├── SIM_TOOLKIT_GUIDE.md
│   │   ├── GENERATOR_INSTRUCTIONS.md
│   │   └── GENERATOR_AI_RULES.md
│   │
│   ├── reference/               ← "I need to LOOK something up"
│   │   ├── API_REFERENCE.md
│   │   ├── ARCHITECTURE.md
│   │   ├── CODING_GUIDE.md
│   │   ├── STYLE_GUIDE.md
│   │   ├── GAME_ASSETS_GUIDE.md
│   │   └── TOOLS.md
│   │
│   ├── explanation/             ← "I need to UNDERSTAND something"
│   │   ├── ROADMAP.md
│   │   ├── INSPIRATIONS.md
│   │   ├── SUMMARY_MARKETING.md
│   │   └── lore/
│   │       ├── BOOKS_SUMMARY.md
│   │       ├── CHARACTER_GUIDE.md
│   │       ├── ENVIRONMENT_GUIDE.md
│   │       └── ANNOUNCEMENT.md
│   │
│   └── project/                 ← Living project state
│       ├── TODO.md
│       ├── DONE.md
│       ├── SESSION_STATE.md
│       └── done/
│           ├── E2E_SESSION_STATE.md
│           └── SIM_PROC_BAL_SESSION_STATE.md
```

### Spec Consolidation Template

Each capability's `spec.md` follows OpenSpec's format, consolidating the old triplet:

```markdown
# {capability-name} Specification

## Purpose
One-paragraph description of what this capability does.

## Requirements

### Requirement: {requirement name}
The system SHALL {do something}.

#### Scenario: {scenario name}
- GIVEN {precondition}
- WHEN {action}
- THEN {expected result}
- AND {additional result}

## Design
(Technical approach — extracted from former _DESIGN.md)

## Schema
(DB tables and relationships — extracted from former _SCHEMA.md)
```

## Migration Mapping

### Feature specs → `openspec/specs/{capability}/spec.md`

| Source File(s) | Destination |
|---|---|
| `done/recs/0_REQUIREMENTS.md` + `recs/0_REQUIREMENTS.md` | Decomposed across all capability specs |
| `done/recs/1_ONBOARDING_INIT_RECS.md` + `_SCHEMA.md` | `onboarding/` |
| `done/recs/2.0_GAME_LOOP.md` | `game-loop/` |
| `done/recs/2.1_OVERWORLD_HUB.md` + `2.1.1_ATMOSPHERIC_BATTLE_BANNER.md` | `overworld-hub/` |
| `done/recs/2.2_STORY_MODE.md` + `2.2.1_STORY_MODE_UI.md` | `story-mode/` |
| `done/recs/2.3_IDLE_TRAINING.md` + `2.3.1_IDLE_TRAINING_UX.md` + `2.3.1.0_IDLE_TRAINING_SCHEMA.md` | `idle-training/` |
| `done/recs/2.4_CHARACTER_PROGRESSION.md` + `_DESIGN.md` + `_SCHEMA.md` | `character-progression/` |
| `done/recs/2.5_AUDIO_MUSIC.md` + `_SCHEMA.md` | `audio-music/` |
| `done/recs/2.6_ECONOMY_ANTICHEAT.md` + `_DESIGN.md` + `_SCHEMA.md` | `economy-anticheat/` |
| `done/recs/2.7_HOME_BASE_HUB.md` + `_DESIGN.md` + `_SCHEMA.md` | `home-base-hub/` |
| `done/recs/3.0_ECONOMY.md` | `economy-core/` |
| `done/recs/3.1_STRIPE_SHARD_PURCHASING*.md` (×3) | `stripe-purchasing/` |
| `done/recs/3.2_SUBSCRIPTION_ELYSIUM_ASCENDANT*.md` (×3) | `subscription/` |
| `done/recs/3.3_ELYSIUM_EMPORIUM*.md` (×3) | `elysium-emporium/` |
| `done/recs/3.4_DONATIONS.md` | `donations/` |
| `done/recs/3.5_DREAMWALKERS_BAZAAR*.md` (×3) | `dreamwalkers-bazaar/` |
| `done/recs/3.6_ADMIN_FINANCE_DASHBOARD*.md` (×3) | `admin-finance/` |
| `done/recs/5.0_ADMIN_SYSTEMS.md` | `admin-systems/` |
| `done/recs/5.1_PLAYER_CHARACTER_MANAGEMENT*.md` (×3) | `player-character-management/` |
| `done/recs/5.2_GAME_CONTENT_EDITOR*.md` (×3) | `game-content-editor/` |
| `done/recs/5.3_ENTITY_CLASSIFICATION*.md` (×3) | `entity-classification/` |
| `done/recs/5.4_BANNER_SCALING_EDITOR*.md` (×3) | `banner-scaling-editor/` |
| `done/recs/5.5_CONTENT_MANAGEMENT_LIVE_TUNING*.md` (×3) | `content-management/` |
| `done/recs/5.6_DEV_CONTENT_AUDIT*.md` (×3) | `dev-content-audit/` |
| `done/recs/5.7_ASSET_REGISTRY*.md` (×3) | `asset-registry/` |
| `done/recs/5.9_TESTING_REVAMP.md` | `testing-revamp/` |
| `done/recs/A_BOOK_AGENT_READER.md` + `_SCHEMA.md` | `book-agent/` |
| `done/recs/B_DB_CLEANUP_CONSOLIDATION.md` | `db-cleanup/` |
| `done/recs/C_STORY_ASSET_GENERATORS.md` + `recs/C_STORY_ASSET_GENERATORS.md` | `story-asset-generators/` |

### Superpowers specs/plans → `openspec/changes/archive/`

| Source | Destination |
|---|---|
| `docs/specs/2026-03-20-simulation-toolkit-design.md` | `archive/2026-03-20-simulation-toolkit/design.md` |
| `docs/plans/2026-03-20-simulation-toolkit-plan.md` | `archive/2026-03-20-simulation-toolkit/tasks.md` |
| `docs/superpowers/specs/2026-03-22-banner-visual-system-design.md` | `archive/2026-03-22-banner-visual-system/design.md` |
| `docs/superpowers/plans/2026-03-22-banner-visual-system.md` | `archive/2026-03-22-banner-visual-system/tasks.md` |
| `docs/superpowers/specs/2026-03-23-generator-pipeline-design.md` | `archive/2026-03-23-generator-pipeline/design.md` |
| `docs/superpowers/plans/2026-03-23-generator-pipeline.md` | `archive/2026-03-23-generator-pipeline/tasks.md` |
| `docs/superpowers/specs/2026-03-24-generator-reorg-design.md` | `archive/2026-03-24-generator-reorg/design.md` |
| `docs/superpowers/plans/2026-03-24-generator-reorg.md` | `archive/2026-03-24-generator-reorg/tasks.md` |
| `docs/superpowers/specs/2026-03-25-documentation-standardization-design.md` | `archive/2026-03-25-documentation-standardization/design.md` |

> **Note:** If an implementation plan is generated for this spec, it also archives to `archive/2026-03-25-documentation-standardization/tasks.md`.

### Non-spec docs → `docs/{diataxis-category}/`

| Source | Destination |
|---|---|
| `docs/inst/TESTING.md` | `docs/how-to/TESTING.md` |
| `docs/inst/DB_MIGRATIONS.md` | `docs/how-to/DB_MIGRATIONS.md` |
| `docs/inst/DEPLOY.md` | `docs/how-to/DEPLOY.md` |
| `docs/inst/INIT_INFRA.md` | `docs/how-to/INIT_INFRA.md` |
| `docs/inst/OWNER_SETUP.md` | `docs/how-to/OWNER_SETUP.md` |
| `docs/inst/SIM_TOOLKIT_GUIDE.md` | `docs/how-to/SIM_TOOLKIT_GUIDE.md` |
| `docs/inst/GENERATOR_INSTRUCTIONS.md` | `docs/how-to/GENERATOR_INSTRUCTIONS.md` |
| `docs/inst/GENERATOR_AI_RULES.md` | `docs/how-to/GENERATOR_AI_RULES.md` |
| `docs/inst/API_REFERENCE.md` | `docs/reference/API_REFERENCE.md` |
| `docs/inst/CODING_GUIDE.md` | `docs/reference/CODING_GUIDE.md` |
| `docs/inst/GAME_ASSETS_GUIDE.md` | `docs/reference/GAME_ASSETS_GUIDE.md` |
| `docs/inst/TOOLS.md` | `docs/reference/TOOLS.md` |
| `docs/ARCHITECTURE.md` | `docs/reference/ARCHITECTURE.md` |
| `docs/STYLE_GUIDE.md` | `docs/reference/STYLE_GUIDE.md` |
| `docs/ROADMAP.md` | `docs/explanation/ROADMAP.md` |
| `docs/INSPIRATIONS.md` | `docs/explanation/INSPIRATIONS.md` |
| `docs/SUMMARY_MARKETING.md` | `docs/explanation/SUMMARY_MARKETING.md` |
| `docs/lore/BOOKS_SUMMARY.md` | `docs/explanation/lore/BOOKS_SUMMARY.md` |
| `docs/lore/CHARACTER_GUIDE.md` | `docs/explanation/lore/CHARACTER_GUIDE.md` |
| `docs/lore/ENVIRONMENT_GUIDE.md` | `docs/explanation/lore/ENVIRONMENT_GUIDE.md` |
| `docs/lore/ANNOUNCEMENT.md` | `docs/explanation/lore/ANNOUNCEMENT.md` |
| `docs/TODO.md` | `docs/project/TODO.md` |
| `docs/done/DONE.md` | `docs/project/DONE.md` |
| `docs/SESSION_STATE.md` | `docs/project/SESSION_STATE.md` |
| `docs/done/E2E_SESSION_STATE.md` | `docs/project/done/E2E_SESSION_STATE.md` |
| `docs/done/SIM_PROC_BAL_SESSION_STATE.md` | `docs/project/done/SIM_PROC_BAL_SESSION_STATE.md` |

### Directories deleted after migration

| Directory | Reason |
|---|---|
| `docs/done/recs/` | All content migrated to `openspec/specs/` |
| `docs/recs/` | All content migrated to `openspec/specs/` |
| `docs/specs/` | Content migrated to `openspec/changes/archive/` |
| `docs/plans/` | Content migrated to `openspec/changes/archive/` |
| `docs/superpowers/` | Content migrated to `openspec/changes/archive/` |
| `docs/inst/` | Content migrated to `docs/how-to/` and `docs/reference/` |
| `docs/lore/` | Content migrated to `docs/explanation/lore/` |
| `docs/done/` | Content migrated to `docs/project/` and `docs/project/done/` (delete after `done/recs/` is emptied) |

## Agent Instructions Update

### AGENTS.md — Documentation Hierarchy (replaces current section)

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

### AGENTS.md — Directory Structure (updated entries)

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

### AGENTS.md — Process Mandates (updated)

```markdown
- **Spec-Driven Development:** Every new feature MUST start with `/opsx:propose`.
  Implementation begins only after spec approval.
- **Spec Sync:** Any functional change MUST update the corresponding
  `openspec/specs/{capability}/spec.md`.
- **Doc Classification:** New operational docs go in `docs/how-to/` or `docs/reference/`.
  Never put feature requirements in `docs/`.
```

### Unchanged

- `docs/project/TODO.md` and `docs/project/DONE.md` keep their current task lifecycle role
- Lore research: check `docs/explanation/lore/` first, then `../Books/`
- DB migrations still in `/db`, data dictionary still in `db/data_dictionary.md`
- `AGENTS.md` stays at repo root

## Implementation Sequence

1. Install OpenSpec: `npm install -g @fission-ai/openspec@latest`
2. Initialize in project: `openspec init`
3. Create `docs/how-to/`, `docs/reference/`, `docs/explanation/`, `docs/project/` directories
4. Move non-spec docs to Diataxis locations
5. For each capability (27 total): read source files, consolidate into `openspec/specs/{capability}/spec.md`
   - **Triplet merges** (3 files → 1 spec.md): character-progression, economy-anticheat, home-base-hub, stripe-purchasing, subscription, elysium-emporium, dreamwalkers-bazaar, admin-finance, player-character-management, game-content-editor, entity-classification, banner-scaling-editor, content-management, dev-content-audit, asset-registry
   - **Pair merges** (2 files → 1 spec.md): onboarding, audio-music, book-agent
   - **Single-source conversions** (1 file → format conversion only): game-loop, overworld-hub, story-mode, idle-training, economy-core, donations, admin-systems, db-cleanup, testing-revamp, story-asset-generators
6. Move superpowers specs/plans to `openspec/changes/archive/`
7. Delete empty old directories
8. Update AGENTS.md with new documentation hierarchy, directory structure, and process mandates
9. Update CLAUDE.md references to doc paths
10. Verify no broken references in codebase — grep for old paths in: `AGENTS.md`, `CLAUDE.md`, `MEMORY.md`, `backend/**/*.py`, `db/data_dictionary.md`, `frontend/**/*.ts`, `admin/**/*.ts`, `tools/**/*.py`

## Notes

- **No 5.8 exists:** The numbering jumps from 5.7 (asset-registry) to 5.9 (testing-revamp). This is intentional — 5.8 was never created.
- **`inst/API_REFERENCE.md` reclassification:** This file moves from `inst/` (how-to neighborhood) to `docs/reference/` — it is a lookup document, not a procedural guide. All other `inst/` files are procedural and go to `how-to/`.
- **Deletion order:** `docs/done/` must be deleted last, after `docs/done/recs/` is fully emptied and its contents migrated to `openspec/specs/`.