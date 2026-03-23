# Generator AI Rules

## Purpose

This document is a prompt for an AI agent to populate ALL missing assets in the ERP game database. Follow the steps below in exact order. Do not skip phases. Do not parallelize across phases — only within a phase where noted.

---

## Prerequisites Check

Before starting, verify the environment is ready:

```bash
# 1. Check DB connection
python tools/db_utils_check.py
# Expected: "DB connection OK"

# 2. Verify tools/.env exists
ls tools/.env
# If missing: cp tools/.env.example tools/.env  (then configure AI_CLI_PROVIDER)

# 3. Verify backend/.env has DATABASE_URL
grep DATABASE_URL backend/.env
# Expected: a non-empty postgresql:// connection string
```

If any check fails, stop and resolve before proceeding.

---

## Full Population Sequence

### Step 1: Take DB Backup

Always back up before any generation run.

```bash
python tools/db_dump_restore.py dump --tag pre-generation
```

Confirm the backup file exists before continuing.

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
# 3a. Assign atmosphere archetypes to all scenes
python tools/assign_atmospheres.py --ai

# 3b. Classify all 3,936 entities into families (see Subagent Strategy below for large batches)
python tools/seed_entity_families.py generate --ai --parallel 4

# 3c. Generate gameplay stats (HP, DPS, rewards) for every entity
python tools/generate_entity_gameplay.py generate --ai --parallel 4

# 3d. Snapshot current game_configs as a difficulty preset
python tools/capture_difficulty_preset.py
```

After each script: run `python tools/<script>.py validate` and confirm 0 errors before proceeding.

---

### Step 4: Phase 3 — Visual Assets (Sequential within phase)

Depends on Phase 2 entity families being fully populated.

```bash
# 4a. Entity sprite descriptors
python tools/generate_entity_sprites.py generate --ai --parallel 4

# 4b. Item icon descriptors
python tools/generate_item_sprites.py generate --ai --parallel 4

# 4c. Projectile visual descriptors
python tools/generate_projectile_sprites.py generate --ai

# 4d. Link attack patterns to entity families
python tools/populate_attack_visuals.py generate --ai

# 4e. Scene background descriptors
python tools/generate_backgrounds.py generate --ai --parallel 4
```

After each script: run `python tools/<script>.py validate` and confirm 0 errors.

---

### Step 5: Phase 4 — Scene Composition

Depends on Phase 3 sprites being fully populated.

```bash
# Generate entity spawn tables for all scenes
python tools/generate_scene_data.py generate --ai --parallel 4
```

Run `python tools/generate_scene_data.py validate` and confirm 0 errors.

---

### Step 6: Phase 5 — Content and Polish

These scripts are independent of each other. They may be run in any order, or in parallel if your environment supports it.

```bash
# Flavor text for scenes and entities
python tools/generate_lore_content.py generate --ai --parallel 4

# Chapter and book transition lore text
python tools/generate_boss_lore.py generate --ai

# Achievement icon URLs
python tools/generate_achievement_icons.py generate --ai

# Artifact type icon URLs
python tools/generate_artifact_icons.py generate --ai

# Extended music definition seeds
python tools/generate_extended_music.py generate --ai
```

---

### Step 7: Final Verification

```bash
python tools/scan_content_gaps.py --verbose
```

**Success criteria:** The scanner reports **0 gaps** across all tables.

If gaps remain, identify which generator is responsible using the Generator List in `GENERATOR_INSTRUCTIONS.md`, re-run that generator with `--resume`, validate, and re-scan.

---

## Subagent Strategy

For large classification tasks — especially `seed_entity_families.py` which processes 3,936 entities — spawn parallel subagents to reduce wall-clock time:

1. Query distinct `entity_type` values from the `entities` table.
2. Assign one subagent per `entity_type` batch (e.g., `BEAST`, `HUMANOID`, `UNDEAD`, `CONSTRUCT`, etc.).
3. Each subagent runs:
   ```bash
   python tools/seed_entity_families.py generate --ai --entity-type <TYPE>
   ```
4. Wait for all subagents to complete before running `generate_entity_gameplay.py`.

Do not split `generate_entity_gameplay.py` or `generate_scene_data.py` by subagent — their internal `--parallel` flag is sufficient.

---

## Validation Rules

After every generator script:

1. Run the validate command:
   ```bash
   python tools/<generator>.py validate
   ```
2. Confirm zero FK violations (all referenced IDs exist in parent tables).
3. Confirm zero uniqueness violations (no duplicate rows on constrained columns).
4. Confirm row count matches expected (compare `status` output before and after).

Do not proceed to the next phase if validation reports errors.

---

## Error Recovery

### Generator fails mid-run
```bash
python tools/<generator>.py generate --resume
```
The `--resume` flag skips rows already written to the DB and restarts from the last unprocessed batch.

### AI provider times out or errors
- Reduce parallelism: `--parallel 2` or `--parallel 1`
- Switch provider in `tools/.env`: `AI_CLI_PROVIDER=gemini`
- Retry: `python tools/<generator>.py generate --ai --resume`

### DB is corrupted or data is invalid
```bash
python tools/db_dump_restore.py restore --tag pre-generation
```
This restores the pre-generation backup. Re-run from Step 2.

### Cache is inconsistent after crash
```bash
python tools/<generator>.py cache --clear
python tools/<generator>.py generate --resume
```

---

## Success Criteria

The run is complete when ALL of the following are true:

1. `python tools/scan_content_gaps.py --verbose` reports **0 gaps**.
2. Every generator reports `status: fully_populated` when run with the `status` subcommand.
3. No FK violations or uniqueness errors in any `validate` output.
4. The DB backup from Step 1 is retained (do not delete).
