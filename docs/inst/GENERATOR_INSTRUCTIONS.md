# Generator Pipeline Instructions

## Overview

The generator pipeline populates the ERP game database with all content assets required to run the game: entity families, gameplay stats, visual sprites, scene compositions, lore text, music, and more. Each generator is a standalone Python script in `tools/` that reads from the database, identifies gaps, and fills them using either deterministic Python fallback logic or an AI CLI provider.

All generators follow the `BaseGenerator` pattern from `tools/lib/base_generator.py` and share common utilities in `tools/lib/`.

---

## Prerequisites

**Python packages:**
```
Python 3.11+
psycopg2-binary
python-dotenv
tqdm
```

Install:
```bash
pip install psycopg2-binary python-dotenv tqdm
```

**AI mode (optional):**
- `claude` CLI (Anthropic Claude) or `gemini` CLI (Google Gemini) installed and authenticated
- Set `AI_CLI_PROVIDER` in `tools/.env`

---

## Setup

1. Copy the example env file:
   ```bash
   cp tools/.env.example tools/.env
   ```

2. Configure `tools/.env`:
   ```env
   AI_CLI_PROVIDER=claude       # or: gemini, none
   AI_MODEL=claude-opus-4-5     # model name for AI CLI
   AI_MAX_RETRIES=3
   AI_TIMEOUT=120
   ```

3. Ensure `backend/.env` contains a valid `DATABASE_URL`:
   ```env
   DATABASE_URL=postgresql://user:pass@localhost:5432/erp_dev
   ```

Generators load `backend/.env` automatically for the DB connection.

---

## Generator List

| # | Script | Target Table(s) | Phase | Priority |
|---|--------|-----------------|-------|----------|
| 1 | `assign_atmospheres.py` | `scenes.atmosphere_archetype` | 2 | High |
| 2 | `seed_entity_families.py` | `entity_families` | 2 | High |
| 3 | `generate_entity_gameplay.py` | `entity_gameplay_data` | 2 | High |
| 4 | `capture_difficulty_preset.py` | `difficulty_presets` | 2 | High |
| 5 | `generate_entity_sprites.py` | `entity_sprites` | 3 | Medium |
| 6 | `generate_item_sprites.py` | `item_sprites` | 3 | Medium |
| 7 | `generate_projectile_sprites.py` | `projectile_sprites` | 3 | Medium |
| 8 | `populate_attack_visuals.py` | `attack_visuals` | 3 | Medium |
| 9 | `generate_backgrounds.py` | `scene_backgrounds` | 3 | Medium |
| 10 | `generate_scene_data.py` | `scene_compositions` | 4 | Medium |
| 11 | `generate_lore_content.py` | `scene_lore`, `entity_lore` | 5 | Low |
| 12 | `generate_boss_lore.py` | `chapters.transition_lore_text`, `books.transition_lore_text` | 5 | Low |
| 13 | `generate_achievement_icons.py` | `achievements.icon_url` | 5 | Low |
| 14 | `generate_artifact_icons.py` | `artifact_type_bases.icon_url` | 5 | Low |
| 15 | `generate_extended_music.py` | `music_definitions` | 5 | Low |
| 16 | `scan_content_gaps.py` | (read-only audit) | 6 | — |

---

## Execution Order

Phases must be run in order. Within a phase, run scripts in listed sequence unless noted.

```
Phase 1: Framework (already built — tools/lib/)
  BaseGenerator, db_utils, ai_client, cache_manager, validators

Phase 2: Core Data (sequential — order matters)
  1. assign_atmospheres.py        ← assigns atmosphere archetypes to scenes
  2. seed_entity_families.py      ← classifies all 3,936 entities into families
  3. generate_entity_gameplay.py  ← generates HP/DPS/reward stats per entity
  4. capture_difficulty_preset.py ← snapshots current game_configs as a preset

Phase 3: Visual Assets (depends on Phase 2 entity families)
  5. generate_entity_sprites.py   ← SVG/CSS sprite descriptors per entity
  6. generate_item_sprites.py     ← item icon descriptors
  7. generate_projectile_sprites.py ← projectile visual descriptors
  8. populate_attack_visuals.py   ← links attack patterns to entity families
  9. generate_backgrounds.py      ← scene background descriptors

Phase 4: Scene Composition (depends on Phase 3)
  10. generate_scene_data.py      ← entity spawn tables per scene

Phase 5: Content & Polish (independent — can run in any order)
  11. generate_lore_content.py    ← flavor text for scenes and entities
  12. generate_boss_lore.py       ← chapter/book transition lore text
  13. generate_achievement_icons.py ← icon URLs for achievements
  14. generate_artifact_icons.py  ← icon URLs for artifact types
  15. generate_extended_music.py  ← extended music definition seeds

Phase 6: Verification
  16. scan_content_gaps.py        ← audit all tables, report missing rows
```

---

## Usage Examples

### Check status (how many rows are missing)
```bash
python tools/generate_entity_gameplay.py status
```

### Generate using Python fallback (no AI)
```bash
python tools/generate_entity_gameplay.py generate
```

### Generate using AI with parallelism
```bash
python tools/generate_entity_gameplay.py generate --ai --parallel 4
```

### Resume after crash (skips already-populated rows)
```bash
python tools/generate_entity_gameplay.py generate --resume
```

### Export populated data as SQL
```bash
python tools/generate_entity_gameplay.py export --format sql
```

### Estimate how many batches will be sent to AI
```bash
python tools/generate_entity_gameplay.py generate --estimate
```

### Validate current data integrity
```bash
python tools/generate_entity_gameplay.py validate
```

### Run the gap scanner
```bash
python tools/scan_content_gaps.py --verbose
```

---

## Troubleshooting

### DB connection error
```
psycopg2.OperationalError: could not connect to server
```
- Verify `backend/.env` contains a valid `DATABASE_URL`
- If running from host (not Docker), use `localhost` not `host.docker.internal`
- Confirm the dev DB container is running: `docker ps`

### AI timeout
```
AIClientError: timeout after 120s
```
- Reduce `--parallel` (try `--parallel 2`)
- Increase `AI_TIMEOUT` in `tools/.env`
- Switch provider: `AI_CLI_PROVIDER=gemini`

### FK violation on insert
```
psycopg2.errors.ForeignKeyViolation
```
- Phase 2 data is not fully populated; re-run `seed_entity_families.py` first
- Check `entity_gameplay_data` exists before running Phase 3 sprites

### Cache corruption
If a generator crashes mid-batch and the cache is inconsistent:
```bash
python tools/<generator>.py cache --clear
python tools/<generator>.py generate --resume
```
Cache files live in `tools/.cache/<generator_name>/`.

---

## Architecture

All generators extend `BaseGenerator` from `tools/lib/base_generator.py`, which provides:
- DB connection lifecycle (`connect()`, `close()`)
- Status reporting (`status()`)
- Cache management (`load_cache()`, `save_cache()`)
- CLI argument parsing (`build_parser()`)
- AI client integration (`ai_client.py`)
- Validation hooks (`validate()`)

Shared modules in `tools/lib/`:
- `db_utils.py` — query helpers, batch upsert
- `ai_client.py` — subprocess wrapper for `claude`/`gemini` CLI
- `cache_manager.py` — JSON-based local cache with checksums
- `validators.py` — FK check, uniqueness check, schema conformance
