# Generator AI Rules

## Purpose

This document is a prompt for an AI agent to populate ALL missing assets in the ERP game database. Follow the steps below in exact order. Do not skip phases. Do not parallelize across phases — only within a phase where noted.

**Reference docs (read if you need more detail):**
- `docs/how-to/GENERATOR_INSTRUCTIONS.md` — full setup, usage examples, troubleshooting
- `openspec/specs/C_STORY_ASSET_GENERATORS.md` — generator requirements and priority list
- `docs/superpowers/specs/2026-03-23-generator-pipeline-design.md` — architecture spec

---

## How Generation Works

**`--ai` mode:** Calls an external AI CLI (Claude or Gemini) configured in `tools/.env` via `AI_CLI_PROVIDER`. The AI receives entity descriptions, lore context, and chapter data from the DB and generates lore-appropriate, unique content. Each generator's `build_prompt()` and `get_context()` methods automatically query the DB for relevant context — you do not need to manually provide lore.

**Default mode (no `--ai`):** Uses deterministic Python fallback logic — template-based, type-mapped defaults. Functional but generic. Good for bulk seeding where AI quality isn't needed.

**For lore-appropriate results, always use `--ai`.** The generators automatically query entity descriptions, chapter titles, atmosphere data, and family classifications to build context-rich prompts.

---

## Prerequisites Check

Before starting, verify the environment is ready:

```bash
# 1. Check DB connection (use localhost from host, not host.docker.internal)
python -c "from tools.generators.lib.db_client import DBClient; db = DBClient(); print('DB connection OK'); db.close()"
# Expected: "DB connection OK"
# If it fails with host.docker.internal error: set DATABASE_URL env var with localhost:
#   export DATABASE_URL="postgresql://<user>:<pass>@localhost:5432/<dbname>"

# 2. Verify tools/.env exists (for AI mode)
ls tools/.env
# If missing: cp tools/.env.example tools/.env
# Then edit tools/.env and set AI_CLI_PROVIDER=claude (or gemini)

# 3. Verify backend/.env has DATABASE_URL
grep DATABASE_URL backend/.env
# Expected: a non-empty postgresql:// connection string
# NOTE: If DATABASE_URL contains "host.docker.internal", you must override it:
#   export DATABASE_URL="postgresql://<user>:<pass>@localhost:5432/<dbname>"
```

If any check fails, stop and resolve before proceeding.

---

## Full Population Sequence

### Step 1: Take DB Backup

Always back up before any generation run.

```bash
python tools/db_dump_restore.py dump
```

Note the output filename (e.g., `erp_backup_20260323_191448.dump`). You will need it if you need to restore.

Confirm the backup file exists in `../db-backups/` before continuing.

---

### Step 2: Check Current Gaps

Run the gap scanner to establish a baseline and identify what needs to be populated.

```bash
python tools/scan_content_gaps.py --verbose
```

Review the output. Note which tables report missing rows — these are the targets for subsequent steps.

---

### Step 3: Phase 2 — Core Data (Sequential, Order Mandatory)

Run these scripts in exact order. Each depends on the previous.

```bash
# 3a. Assign atmosphere archetypes to chapters, books, and locations
python tools/assign_atmospheres.py --ai
# NOTE: This is a standalone script. No validate/status commands.
# Verify: check the output summary line for counts updated.

# 3b. Classify all entities into families
python tools/seed_entity_families.py generate --ai --parallel 4
# Verify:
python tools/seed_entity_families.py status
# Expected: "Missing items: 0"

# 3c. Populate visual/combat data for every entity
python tools/generate_entity_gameplay.py generate --ai --parallel 4
# Verify:
python tools/generate_entity_gameplay.py status
# Expected: "Missing items: 0"

# 3d. Snapshot current game_configs as a difficulty preset
python tools/capture_difficulty_preset.py
# NOTE: This is a standalone script. No validate/status commands.
# Verify: check the output confirms presets were inserted.
```

---

### Step 4: Phase 3 — Visual Assets (Sequential within phase)

Depends on Phase 2 entity families being fully populated.

```bash
# 4a. Entity sprite rendering configs
python tools/generate_entity_sprites.py generate --ai --parallel 4
python tools/generate_entity_sprites.py status
# Expected: "Missing items: 0"

# 4b. Item paper doll + inventory sprites
python tools/generate_item_sprites.py generate --ai --parallel 4
python tools/generate_item_sprites.py status

# 4c. Projectile visual configs
python tools/generate_projectile_sprites.py generate --ai
python tools/generate_projectile_sprites.py status

# 4d. Attack type visual columns (projectile_color, trail_type, impact_effect)
python tools/populate_attack_visuals.py generate --ai
python tools/populate_attack_visuals.py status

# 4e. Parallax background layers per chapter
python tools/generate_backgrounds.py generate --ai --parallel 4
python tools/generate_backgrounds.py status
```

---

### Step 5: Phase 4 — Scene Composition

Depends on Phase 3 backgrounds being populated.

```bash
python tools/generate_scene_data.py generate --ai --parallel 4
python tools/generate_scene_data.py status
# Expected: "Missing items: 0"
```

---

### Step 6: Phase 5 — Content and Polish

These scripts are independent of each other. They may be run in any order.

```bash
# Entity descriptions, emotional states, sounds
python tools/generate_lore_content.py generate --ai --parallel 4
python tools/generate_lore_content.py status

# Chapter and book transition lore text (NarrativeReveal cinematics)
python tools/generate_boss_lore.py generate --ai
python tools/generate_boss_lore.py status

# Achievement icon sprite keys
python tools/generate_achievement_icons.py generate --ai
python tools/generate_achievement_icons.py status

# Curated artifact icon sprite keys
python tools/generate_artifact_icons.py generate --ai
python tools/generate_artifact_icons.py status

# Extended music loops (2-3 minutes per atmosphere)
python tools/generate_extended_music.py generate --ai
python tools/generate_extended_music.py status
```

---

### Step 7: Final Verification

```bash
python tools/scan_content_gaps.py --verbose
```

**Success criteria:** The scanner reports **0 gaps** across all tables (excluding known exceptions like `death_sfx_key` which requires dedicated SFX generation).

If gaps remain, identify which generator is responsible using the Generator List in `docs/how-to/GENERATOR_INSTRUCTIONS.md`, re-run that generator, check `status`, and re-scan.

---

## Subagent Strategy

For large tasks, use the `--parallel` flag built into each generator. This spawns concurrent workers internally — no need to manually split into subagents.

```bash
# Example: 4 concurrent workers for entity gameplay data
python tools/generate_entity_gameplay.py generate --ai --parallel 4
```

The generators group items by type (entity_type, silhouette_type, armor_class, etc.) and process groups in parallel. This provides natural load distribution.

For the initial entity family classification (~3,936 entities), `--parallel 4` is sufficient. The script handles batching and grouping internally.

---

## Validation Protocol

After running each BaseGenerator-based script, verify with `status`:

```bash
python tools/<generator>.py status
# Expected: "Missing items: 0"
```

**Standalone scripts** (`assign_atmospheres.py`, `capture_difficulty_preset.py`) do NOT have `status` or `validate` commands. Verify their output by:
- Checking the summary line they print (e.g., "Updated: 138 chapters, 3 books, 449 locations")
- Running `scan_content_gaps.py` to confirm the related gaps are now filled

**For all generators:** Check `status` output before and after to confirm the count decreased as expected.

---

## Error Recovery

### Generator fails mid-run
```bash
# Re-run generate — BaseGenerator.get_missing_items() naturally skips already-populated rows
python tools/<generator>.py generate --ai
```
The generator only processes rows where required columns are still NULL, so re-running is safe and idempotent.

### Cached batches not inserted (process crashed between generate and insert)
```bash
# Insert already-cached data without re-generating
python tools/<generator>.py insert
```

### AI provider times out or errors
- Reduce parallelism: `--parallel 2` or `--parallel 1`
- Switch provider in `tools/.env`: `AI_CLI_PROVIDER=gemini`
- Retry: `python tools/<generator>.py generate --ai`

### DB is corrupted or data is invalid
```bash
# Restore the backup from Step 1 (use the actual filename)
python tools/db_dump_restore.py restore <backup_filename>
```
This restores the pre-generation backup. Re-run from Step 2.

### Cache is inconsistent after crash
```bash
python tools/<generator>.py --clean-cache
python tools/<generator>.py generate --ai
```

---

## Success Criteria

The run is complete when ALL of the following are true:

1. `python tools/scan_content_gaps.py --verbose` reports **0 gaps** (or only known exceptions).
2. Every BaseGenerator-based script reports `"Missing items: 0"` via `status`.
3. The DB backup from Step 1 is retained (do not delete).

---

## For detailed troubleshooting, see `docs/how-to/GENERATOR_INSTRUCTIONS.md`.
