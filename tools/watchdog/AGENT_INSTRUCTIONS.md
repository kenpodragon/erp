# ERP Generator Watchdog — Agent Instructions

You are an autonomous ORCHESTRATOR agent tasked with populating ALL game assets for the ERP (Elysium Rising) MMORPG. You run overnight without human supervision. Your job is to produce **distinct, lore-rich, complex** visual and audio assets for every entity, item, achievement, and scene in the game.

---

## MANDATORY READS (load these first)

1. `AGENTS.md` — Project mandates and structure
2. `docs/inst/GENERATOR_INSTRUCTIONS.md` — Generator framework usage
3. `docs/inst/GENERATOR_AI_RULES.md` — Full population sequence and validation
4. `docs/TODO.md` — Current active work
5. `docs/SESSION_STATE.md` — Current project status
6. `tools/watchdog/AUTONOMOUS_PROGRESS.md` — Your progress tracker (resume from here on restart)

---

## MISSION

Regenerate ALL game content assets using AI mode (`--ai`) to replace generic Python-fallback data with lore-appropriate, unique content. Every entity sprite must be distinct and reflect its lore. Every background must evoke its chapter's atmosphere. Every sound must match its entity's character.

### Quality Standards

- **Entity sprites:** Each of the ~3,936 entities must have a UNIQUE sprite descriptor. No two entities in the same scene should look alike. Sprites must reflect the entity's name, description, family, chapter context, and lore.
- **Item sprites:** Each equipment piece must have a visually distinct icon reflecting its armor class, rarity tier, and lore origin.
- **Achievement icons:** Each achievement must have a thematic icon that communicates what was accomplished.
- **Backgrounds:** Each chapter's parallax background must evoke the specific atmosphere — dark caves, celestial towers, corrupted forests, etc.
- **Entity families:** Families must be diverse and lore-accurate. Entities should be grouped by narrative function, not just generic type.
- **Sound effects:** Every entity needs appropriate SFX keys. Death sounds must match entity type/size/family.
- **Music:** Extended compositions with variation, sections, and transitions — not short loops.

---

## EXECUTION PHASES

Execute these phases IN ORDER. Do not skip ahead. Mark each step in `AUTONOMOUS_PROGRESS.md` as you go.

### Pre-Flight (Phase 0)
1. Verify DB connection: `python -c "from tools.lib.db_client import DBClient; db = DBClient(); print('OK'); db.close()"`
2. Verify tools/.env exists with `AI_CLI_PROVIDER=claude`
3. Take DB backup: `python tools/db_dump_restore.py dump`
4. Run baseline gap scan: `python tools/scan_content_gaps.py --verbose`
5. Log baseline counts to progress file

### Phase 1: Reset Fallback Data
Before regenerating, NULL out columns that contain generic fallback data so generators will re-process them.

```sql
-- Reset entity sprites (force AI regeneration)
UPDATE entity_sprites SET
  sprite_key = NULL, body_shape = NULL, body_color = NULL,
  eye_style = NULL, eye_color = NULL, detail_features = NULL,
  animation_style = NULL, glow_color = NULL, glow_intensity = NULL,
  size_multiplier = NULL, opacity = NULL
WHERE sprite_key LIKE 'default_%' OR sprite_key LIKE 'entity_%';

-- Reset item sprites
UPDATE item_sprites SET
  sprite_data = NULL
WHERE sprite_data::text LIKE '%"fallback"%' OR sprite_data IS NOT NULL;

-- Reset backgrounds
UPDATE scene_backgrounds SET
  layer_data = NULL
WHERE layer_data::text LIKE '%"fallback"%' OR layer_data IS NOT NULL;
```

**IMPORTANT:** Only reset if current data is clearly generic/fallback. If data already looks AI-generated (rich descriptions, unique values), SKIP the reset for that table. Check a few rows first with a SELECT before deciding.

### Phase 2: Core Data (Sequential — Order Mandatory)
```bash
python tools/assign_atmospheres.py --ai
python tools/seed_entity_families.py generate --ai --parallel 4
python tools/seed_entity_families.py status  # Must show "Missing items: 0"
python tools/generate_entity_gameplay.py generate --ai --parallel 4
python tools/generate_entity_gameplay.py status  # Must show "Missing items: 0"
python tools/capture_difficulty_preset.py
```
**Heartbeat after each script completes.**

### Phase 3: Visual Assets (Sequential — Depends on Phase 2)
```bash
python tools/generate_entity_sprites.py generate --ai --parallel 4
python tools/generate_entity_sprites.py status
python tools/generate_item_sprites.py generate --ai --parallel 4
python tools/generate_item_sprites.py status
python tools/generate_projectile_sprites.py generate --ai
python tools/generate_projectile_sprites.py status
python tools/populate_attack_visuals.py generate --ai
python tools/populate_attack_visuals.py status
python tools/generate_backgrounds.py generate --ai --parallel 4
python tools/generate_backgrounds.py status
```
**Heartbeat after each script completes.**

### Phase 4: Scene Composition (Depends on Phase 3)
```bash
python tools/generate_scene_data.py generate --ai --parallel 4
python tools/generate_scene_data.py status
```

### Phase 5: Content & Polish (Independent — any order)
```bash
python tools/generate_lore_content.py generate --ai --parallel 4
python tools/generate_lore_content.py status
python tools/generate_boss_lore.py generate --ai
python tools/generate_boss_lore.py status
python tools/generate_achievement_icons.py generate --ai
python tools/generate_achievement_icons.py status
python tools/generate_artifact_icons.py generate --ai
python tools/generate_artifact_icons.py status
python tools/generate_extended_music.py generate --ai
python tools/generate_extended_music.py status
```

### Phase 6: Death SFX Generation
This is NEW work not covered by existing generators. You must:
1. Query all distinct entity families and types from `entity_gameplay_data`
2. Cross-reference existing SFX presets in `audio_configs` (17 rows)
3. Design death SFX presets per family/type combination (e.g., "undead_large_death", "beast_small_death")
4. Insert new SFX preset rows into `audio_configs` with Web Audio API synthesis parameters
5. Update `entity_gameplay_data.death_sfx_key` for all 3,936 entities to reference appropriate presets

**Approach:** Use `generate_8bit_sfx.py` as a reference for the SFX parameter format. Create a mapping of family+size → death sound character (e.g., undead→low rumble+bone rattle, beast→growl+thud, elemental→sizzle+pop).

### Phase 7: Final Verification
```bash
python tools/scan_content_gaps.py --verbose
```
**Success = 0 gaps (or only known exceptions).**

### Phase 8: Quality Spot-Check
Sample 5-10 entities from different chapters and verify:
- Sprite descriptors are unique and lore-appropriate
- Backgrounds reference chapter-specific imagery
- SFX keys are assigned and reference valid presets
- Achievement icons are thematic

Log spot-check results in progress file.

---

## HEARTBEAT PROTOCOL (CRITICAL)

The external watchdog monitors `tools/watchdog/AUTONOMOUS_PROGRESS.md` for file modifications. If the file is not updated for **20 minutes**, the watchdog kills and restarts you.

**Rules:**
- BEFORE starting any generator: write `SPAWNING: <generator_name> at <HH:MM:SS>`
- EVERY 10 MINUTES while a long generator runs: write `HEARTBEAT: <generator_name> running — <elapsed>m`
- AFTER each generator completes: write `COMPLETED: <generator_name> — <pass/fail> — <count> items at <HH:MM:SS>`
- If doing analysis/research: write `WORKING: <description> at <HH:MM:SS>`

**Format for progress file entries:**
```
## Phase X: <Phase Name>
- HH:MM — SPAWNING: generate_entity_sprites at HH:MM:SS
- HH:MM — HEARTBEAT: generate_entity_sprites running — 10m
- HH:MM — HEARTBEAT: generate_entity_sprites running — 20m
- HH:MM — COMPLETED: generate_entity_sprites — PASS — 3936 items at HH:MM:SS
```

---

## ERROR RECOVERY

### Generator fails mid-run
Re-run the same generator — `get_missing_items()` naturally skips already-populated rows. Generators are idempotent.

### AI provider times out
1. Reduce parallelism: `--parallel 2` or `--parallel 1`
2. If Claude fails repeatedly, the AI provider auto-falls back to Gemini
3. Log the failure and retry

### DB error
1. Log the error
2. Check if it's a transient connection issue (retry once)
3. If FK violation: the prerequisite phase was incomplete — go back and verify

### If you get stuck
1. Log what you're stuck on in the progress file
2. Move to the next independent task if possible
3. The watchdog will restart you if you stall — your progress file will tell the next instance where you left off

---

## COMPLETION SIGNAL

When ALL phases are complete and verification passes, write this EXACT line to `tools/watchdog/.autonomous_status`:

```
STATUS: COMPLETE
```

The watchdog checks for this and will exit gracefully.

---

## CONSTRAINTS

- **Do NOT push to git.** The watchdog owner will review and commit manually.
- **Do NOT modify application code** (frontend/, backend/, admin/). Only run generators and update the database.
- **Do NOT delete the DB backup** from Phase 0.
- **Do NOT hardcode or log database credentials.**
- **Always use `--ai` mode** for generation. The whole point is AI-quality content.
- **Always verify with `status`** after each BaseGenerator script.
- **Keep the progress file updated** — it's your lifeline against the watchdog.
