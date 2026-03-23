# Design Spec: Game Asset Generator Pipeline

**Date:** 2026-03-23
**Status:** Draft
**Scope:** Framework architecture + 20 generators for populating all hollow DB tables

---

## 1. Problem Statement

The ERP database has ~70 tables, many with significant data gaps. Key tables like `entity_gameplay_data` (4/3,936 rows populated), `entity_families` (0 rows), `scene_wave_configs` (0 rows), and `backgrounds` (1 row) need bulk population. Manually entering this data is infeasible at scale. The system needs a standardized generator pipeline that supports AI-assisted generation for quality content and Python fallback for deterministic bulk seeding.

## 2. Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| AI integration | Subprocess to CLI (claude/gemini) | Simplest, works with installed CLI, no API key management in generators |
| DB insertion | Generate → Validate → Direct Insert | Fast for bulk runs, schema validation before insert, per-batch transactions |
| Parallelism | Hybrid batching by type/family | Groups give AI better context for consistency, moderate call count vs individual |
| Error recovery | Transaction-per-batch + file-based cache | Durable generation cache on disk, manifest tracks batch state, `--resume` on restart |
| Module separation | 3 separate modules (AI, DB, BaseGenerator) | Each focused on one concern, clean dependency graph |
| Config | Centralized `tools/.env` + `tools/lib/ai_provider.py` | One place, one config for AI provider routing across all generators |

### Section Numbering Map (Spec ↔ RECS C_STORY_ASSET_GENERATORS.md)

| Spec § | RECS § | Generator |
|--------|--------|-----------|
| §1 | §1 | Entity Gameplay Data |
| §2 | §2 | Entity Family Seeder |
| §3 | §3 | Entity Sprites |
| §4 | §4 | Item Sprites |
| §5 | §5 | Projectile Sprites |
| §6 | §6 | Background Parallax |
| §7 | — | Scene Generator (NEW — not in RECS) |
| §8 | — | Atmosphere Assignment (NEW — standalone one-shots) |
| §9 | — | Attack Type Visual Population (NEW — 13 rows) |
| §10 | — | Achievement Icon Generator (NEW) |
| §11 | — | Curated Artifact Icon Generator (NEW) |
| §12 | — | Difficulty Preset Capture (NEW) |
| §13 | §7.3 | Extended Music Loops |
| §14 | §10 | Lore-to-Content |
| §15 | §11 | Boss Transition Lore Text |
| §16 | §12 | Cosmetic Assets |
| §17 | §13 | Content Scanner |
| §18 | §14 | Content Import |
| §19 | §8 | PNG Text Generator (deferred) |
| §20 | §9 | Sync Mapping Editor (deferred) |

> **Note:** §7-§12 are new generators identified during the DB deep dive (2026-03-23) that are not yet in the RECS doc. The RECS doc should be updated to include these after spec approval.

### CLI Design Note
The RECS doc defines `generate <id>`, `generate-bulk`, `insert <id>`, `insert-bulk` as separate commands. This spec simplifies to: `generate` (all missing, auto-inserts by default), `generate --id <N>` (single), `generate --no-insert` (cache only, no DB write), `insert` (insert from cache). This is a deliberate simplification — the RECS doc CLI section should be updated to match after implementation.

## 3. Framework Architecture

### 3.1 Module Layout

```
tools/
  lib/
    __init__.py
    ai_provider.py        # AI CLI routing, subprocess, batching, retry
    db_client.py          # DB connection, insert/update/query helpers
    base_generator.py     # BaseGenerator class, CLI interface, orchestration
    cache.py              # File-based generation cache + recovery manifest
  .cache/                 # Generated data cache (gitignored)
  .env                    # AI provider config (optional, falls back to backend/.env)
```

### 3.2 `ai_provider.py` — AI CLI Routing

**Provider Registry:**
- `claude` — subprocess to `claude` CLI
- `gemini` — subprocess to `gemini` CLI
- Extensible for `openai` or other providers

**Configuration (from `tools/.env` or `backend/.env`):**
```env
AI_CLI_PROVIDER=claude          # Primary provider: claude | gemini
AI_CLI_PROVIDER_FALLBACK=gemini # Secondary provider (auto-fallback)
AI_CLI_MODEL=claude-sonnet-4-6  # Model for primary
AI_CLI_TIMEOUT=120              # Seconds per generation call
AI_CLI_MAX_RETRIES=3            # Retries per batch before marking failed
```

**Core Interface:**
```python
class AIProvider:
    async def generate(self, prompt: str, schema: dict, provider: str = None) -> dict:
        """Single generation call. Returns parsed JSON."""

    async def generate_batch(
        self, items: list, prompt_template: callable,
        group_by: str = None, batch_size: int = 50,
        parallel: int = 1
    ) -> list[dict]:
        """Hybrid batched generation. Groups items by group_by key,
        sends batches of batch_size to AI, runs parallel concurrent workers."""
```

**Subprocess Pattern:**
```python
# Claude CLI
proc = await asyncio.create_subprocess_exec(
    'claude', '-p', prompt, '--output-format', 'json',
    stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
)
stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=AI_CLI_TIMEOUT)
result = json.loads(stdout.decode())
```

**Retry & Fallback:**
- 3 retries with exponential backoff (2s, 4s, 8s) per batch
- If primary provider fails 3 consecutive batches, auto-switch to fallback provider
- Failed batches logged to manifest, not fatal to overall run

**Setup Guide Section:** Document how to configure for your project:
1. Install AI CLI (`claude` and/or `gemini`)
2. Set `AI_CLI_PROVIDER` in `tools/.env`
3. Verify with `python -m tools.lib.ai_provider --test`

### 3.3 `db_client.py` — Database Client

**Connection:** Reads `DATABASE_URL` from `backend/.env` via `python-dotenv`. Never hardcodes credentials.

**Interface:**
```python
class DBClient:
    def __init__(self, env_file: str = 'backend/.env'):
        """Load connection string from env file."""

    def query(self, sql: str, params: dict = None) -> list[dict]:
        """Execute SELECT, return rows as dicts."""

    def insert_one(self, table: str, data: dict) -> int:
        """Insert single row, return ID."""

    def insert_batch(self, table: str, rows: list[dict]) -> list[int]:
        """Insert batch in single transaction, return IDs."""

    def update(self, table: str, data: dict, where: dict) -> int:
        """Update rows matching where clause, return count."""

    def count(self, table: str, where: dict = None) -> int:
        """Count rows, optionally filtered."""

    def get_missing(self, table: str, required_columns: list[str],
                    join: str = None) -> list[dict]:
        """Return rows where any required_column IS NULL."""

    def get_lookup(self, table: str) -> dict[str, int]:
        """Return {name: id} mapping for a lookup table."""
```

**Transaction Scope:** Per-batch. Each `insert_batch` call is one transaction — commit on success, rollback on any failure within the batch.

### 3.4 `base_generator.py` — Generator Base Class

**CLI Interface (all generators inherit):**
```
python tools/<generator>.py <command> [options]

Commands:
  status              Show populated vs missing counts
  generate            Generate + validate + cache + insert all missing
  generate --id <N>   Generate for single entity/item
  insert              Insert from cached generated data (for --no-insert recovery)
  validate            Validate cached data against schema constraints
  export              Export cached/generated data as SQL migration file

Options:
  --ai                Use AI-enhanced generation
  --ai-provider X     Override provider (claude|gemini)
  --parallel N        Concurrent workers (default: 1)
  --no-insert         Generate and cache only, skip DB insertion
  --resume            Resume from last checkpoint
  --retry-errors      Retry only previously failed batches
  --batch-size N      Items per AI call (default: per-generator)
  --estimate          Print expected AI call count and batch breakdown, then exit
  --format json|sql   Export format (default: sql)
```

**Subclass Contract:**
```python
class BaseGenerator(ABC):
    name: str                    # Generator name (used for cache dir, logging)
    table: str                   # Target table
    default_batch_size: int      # Default items per AI batch

    @abstractmethod
    def get_missing_items(self, db: DBClient) -> list[dict]:
        """Return items that need generation."""

    @abstractmethod
    def build_prompt(self, batch: list[dict], context: dict) -> str:
        """Build AI prompt for a batch of items."""

    @abstractmethod
    def python_fallback(self, batch: list[dict], context: dict) -> list[dict]:
        """Deterministic Python generation for a batch."""

    @abstractmethod
    def validate(self, record: dict, db: DBClient) -> list[str]:
        """Validate a single record. Return list of error strings (empty = valid)."""

    @abstractmethod
    def get_group_key(self, item: dict) -> str:
        """Return the grouping key for hybrid batching."""

    def get_context(self, db: DBClient) -> dict:
        """Load shared context (lookup tables, etc). Override if needed."""
        return {}
```

**Orchestration Flow:**

> `generate` = generate + cache + insert by default. Use `--no-insert` to cache only.
> Entry point: `asyncio.run(main())` — async for AI subprocess calls, sync fallback for Python mode.

```
1. Parse CLI args
2. Init DBClient + AIProvider (AIProvider only if --ai)
3. Load context (lookup tables, etc.)
4. If --estimate: print batch/call count breakdown, exit
5. get_missing_items() → list of items to generate
6. Group items by get_group_key()
7. For each group:
   a. Split into batches of batch_size
   b. For each batch:
      - If --ai: call ai_provider.generate_batch(batch, build_prompt)
      - Else: call python_fallback(batch)
      - Validate each record
      - Write to cache file (tools/.cache/<name>/batch_NNN.json)
      - Update manifest (status: "generated")
   c. Unless --no-insert: Insert batch into DB (per-batch transaction)
   d. Update manifest (status: "inserted" or "cached")
8. Print summary (generated, inserted, failed, skipped)
```

**Idempotency:** `get_missing_items()` returns only rows with NULL required fields, so re-running a generator skips already-populated rows. For generators that UPDATE existing rows (§9 attack visuals), idempotency is achieved by overwriting with the same deterministic output — updates are safe to re-run.

### 3.5 `cache.py` — File-Based Recovery

**Cache Directory:** `tools/.cache/<generator_name>/`

**Files:**
- `batch_001.json` — raw generated output per batch
- `manifest.json` — tracks state of each batch:

```json
{
  "generator": "entity_gameplay",
  "started_at": "2026-03-23T10:00:00Z",
  "batches": {
    "batch_001": {
      "status": "inserted",
      "item_count": 50,
      "generated_at": "...",
      "inserted_at": "..."
    },
    "batch_002": {
      "status": "generated",
      "item_count": 50,
      "generated_at": "..."
    },
    "batch_003": {
      "status": "failed",
      "item_count": 50,
      "error": "AI timeout after 3 retries"
    }
  }
}
```

**Recovery Flow (`--resume`):**
1. Read manifest
2. Skip `inserted` batches
3. Re-insert `generated` batches (cached data exists, just needs DB insert)
4. Re-generate `failed` batches
5. Continue generating remaining items

**Cleanup:** `--clean-cache` removes all cached files after a fully successful run.

---

## 4. Generator Specifications

### Phase 2: Core Data

#### §1 Entity Gameplay Data Generator
- **Script:** `tools/generate_entity_gameplay.py`
- **Target:** `entity_gameplay_data` — 3,936 entities
- **Group key:** `entity_type` (creature, manifestation, spirit, humanoid, beast, etc.)
- **Batch size:** 30-50
- **Fields:** movement_type_id, size_class_id, animation_style_id, silhouette_type_id, color_primary, color_secondary, primary/secondary/tertiary_attack_type_id, sprite_key, death_sfx_key
- **AI prompt:** Entity name + description + entity_type + chapter context → AI infers visual traits, colors matching lore, attack types matching creature behavior
- **Python fallback:** Type-based defaults:
  - creature → ground/stalk/quadruped/medium, chapter mood earth tones
  - manifestation → hover/pulse/orb/small, chapter mood purples/blues
  - spirit → hover/pulse/orb/small, pale whites/silvers
  - humanoid → ground/aggro/biped/medium, dark grays/reds
  - beast → ground/stalk/quadruped/large, chapter mood earth tones
  - construct → ground/aggro/biped/large, grays/metallics
  - undead → ground/ooze/biped/medium, greens/blacks
- **Validation:** All FK IDs exist in lookup tables. Colors valid hex. At least primary_attack_type_id required.

#### §2 Entity Family Seeder
- **Script:** `tools/seed_entity_families.py`
- **Target:** `entity_families` table (seed ~10 rows) + `entities.entity_family_id` (assign ~3,936)
- **Two phases:** 1) Seed canonical families (deterministic), 2) Classify entities into families
- **Group key:** `entity_type`
- **Batch size:** 50
- **Families:** wraiths, demons, beasts, elementals, undead, constructs, humanoids, celestials, aberrations, plants
- **AI prompt:** Classify entities by name + description + type. Handle edge cases (Burning Skeleton = undead, not elemental)
- **Python fallback:** Type mapping + name keyword overrides (skeleton/zombie → undead, demon/fiend → demons, golem → constructs)

#### §8 Atmosphere Assignment Scripts
- **Script:** `tools/assign_atmospheres.py`
- **Target:** `chapters.atmosphere_id` (138 rows), `books.atmosphere_id` (3 rows), `locations.archetype_id` (449 rows)
- **Standalone one-shot scripts** — simple assignments
- **AI prompt:** Given 21 atmospheres with descriptions, assign best-matching to each chapter/book/location based on title, mood, narrative tone
- **Python fallback:** Round-robin from 13 non-boss archetypes based on book + chapter position. Locations get most-associated chapter's atmosphere.

#### §12 Difficulty Preset Capture
- **Script:** `tools/capture_difficulty_preset.py`
- **Target:** `difficulty_presets` table
- **No AI needed** — pure data capture
- **Steps:**
  1. Read all 151 `game_configs` rows from live DB → snapshot as JSONB into `config_snapshot`
  2. Read `DEFAULT_CONFIGS` from `tools/sim/config.py` (imported as Python dict) → snapshot as "Original" preset
  3. Read current live DB values (which include migration 062 balanced changes: `char_level_xp_factor=80`, `upgrade_cost_scaling=1.03`, etc.) → snapshot as "Balanced" preset, `is_active = true`
  4. Link to existing `difficulty_curves` row (id=1) via `difficulty_curve_id`
  5. Set `wave_preset_id = NULL` for now (wave presets are not yet populated; will be linked when scene wave configs are generated in §7)
  6. Export as seed SQL for initial migration data
- **Source of balanced values:** Read directly from live `game_configs` table (post-migration 062 application). Do NOT parse the SQL file — the DB is the source of truth.
- **Investigation during implementation:** Verify frontend reads `difficulty_presets` or just `game_configs` directly. If only `game_configs`, may need admin endpoint: `POST /admin/difficulty/apply/{preset_id}` → copies config_snapshot into game_configs.

### Phase 3: Visual Assets

#### §3 Entity Sprite Generator
- **Script:** `tools/generate_entity_sprites.py`
- **Target:** `asset_registry` entries for entity rendering
- **Depends on:** §1 (entity_gameplay_data populated)
- **Group key:** `silhouette_type`
- **Batch size:** 20
- **Output per entity:** sprite_key, silhouette SVG path, color fills, glow params, scale, animation keyframes
- **AI prompt:** Generate unique SVG silhouette paths per entity. Organic for beasts, geometric for constructs, ethereal for spirits.
- **Python fallback:** 6 template SVG paths (one per silhouette_type), colored by entity colors, scaled by size_class. Animation keyframes from animation_style templates.
- **Validation:** SVG path parseable. Scale 0.2-3.0. Colors from §1 present.

#### §4 Item Sprite Generator
- **Script:** `tools/generate_item_sprites.py`
- **Target:** `asset_registry` entries for paper doll + inventory
- **Depends on:** Migrations 064, 067
- **Group key:** `armor_class` x `gear_slot`
- **Batch size:** 10
- **Output:** Paper doll layer SVG (body-mapped per gear_slot), inventory icon (32x32), rarity overlay config
- **AI prompt:** Distinct visual designs per armor_class aesthetic (cloth=flowing, leather=rugged, chain=linked, plate=angular, divine=radiant, magic=ethereal, bone=skeletal, shadow=wispy)
- **Python fallback:** Template shapes per gear_slot, colored by armor_class palette, rarity border overlay

#### §5 Projectile Sprite Generator
- **Script:** `tools/generate_projectile_sprites.py`
- **Target:** `asset_registry` entries for projectile rendering
- **Depends on:** §1 (attack_types visual columns)
- **Group key:** `projectile_type`
- **Batch size:** All of a type in one call (<20 per type)
- **Output:** Projectile SVG shape, trail config (color, length, fade, particles), impact config (type, color, radius, duration)
- **AI prompt:** Lore-appropriate projectiles (void bolt = dark purple spiral, holy smite = golden beam)
- **Python fallback:** Templates per projectile_type (arrow, bolt, orb, beam, wave), colored by element

#### §9 Attack Type Visual Population
- **Script:** `tools/populate_attack_visuals.py`
- **Target:** `attack_types` — fill visual columns on 13 existing rows
- **Scope:** Tiny, likely one AI call
- **Fields:** projectile_sprite_key, projectile_color, trail_type, impact_effect
- **AI prompt:** For 13 attack types, assign colors + trail + impact based on name/description/is_physical
- **Python fallback:** Physical → spark/flash. Magical → magic/burst. Colors from name keywords.

#### §6 Background Parallax Generator
- **Script:** `tools/generate_backgrounds.py`
- **Target:** `backgrounds` table (~138+ rows, one per chapter)
- **Group key:** `book_id`
- **Output:** 2-3 layer definitions (far/mid/near) per chapter with color palettes and element descriptions
- **AI prompt:** Generate layered background from chapter lore + setting description
- **Python fallback:** Book-level mood palettes, procedural gradients with chapter-position variation

### Phase 4: Scene Composition

#### §7 Scene Generator
- **Script:** `tools/generate_scene_data.py`
- **Target:** `scene_gameplay_data` (atmosphere_id, background_id for 724 scenes) + `scene_wave_configs` (default population)
- **Two phases:**
  1. Scene gameplay data — create 144 missing rows, assign atmosphere + background
  2. Wave configs — default population from chapter position
- **AI prompt:** Given scenes in a chapter, assign wave parameters (enemies/wave, count, spawn interval) based on position and mood
- **Python fallback:** atmosphere = chapter's atmosphere, background = chapter's background. Waves: `max_enemies = 3 + (pos // 20)`, `wave_count = 5 + (pos // 30)`, `spawn_interval = max(1000, 3000 - pos * 10)`

### Phase 5: Content & Polish

#### §10 Achievement Icon Generator
- **Script:** `tools/generate_achievement_icons.py`
- **Target:** `achievements.icon_sprite_key` — 111 rows (replace `achievement_default`)
- **Group key:** `category`
- **Output:** SVG icon definitions in `asset_registry`
- **AI prompt:** Pixel-art icon descriptions per achievement name/description/category
- **Python fallback:** Template icons per category, colored by tier

#### §11 Curated Artifact Icon Generator
- **Script:** `tools/generate_artifact_icons.py`
- **Target:** `curated_artifacts.icon_sprite_key` — 50 rows
- **Group key:** `source_type`
- **Same architecture as §10**

#### §13 Extended Music Loop Generator
- **Script:** `tools/generate_extended_music.py`
- **Target:** Update `atmospheres.music_definitions` JSON for all 21 atmospheres
- **Goal:** Extend current short loops to 2-3 minute compositions
- **AI prompt:** Pass atmosphere description + existing short loop → AI generates extended arrangement (intro/verse/bridge/chorus)
- **Python fallback:** Procedural loop extension (repeat with transposition, counter-melodies, randomize layers)

#### §14 Lore-to-Content AI Generator
- **Script:** `tools/generate_lore_content.py`
- **Target:** Hollow records across entities (base_description, base_emotional_state, base_sounds, base_smells, base_equipment, base_abilities), item descriptions, skill descriptions
- **Pipeline:** Ingest lore docs → cross-reference DB → generate content → validate → insert
- **AI prompt:** Full lore context → immersive descriptions, balanced stats, proper categorization
- **Python fallback:** Template descriptions by entity_type, randomized stats within tier bands

#### §15 Boss Transition Lore Text Generator
- **Script:** `tools/generate_boss_lore.py`
- **Target:** `chapters.transition_lore_text` + `books.transition_lore_text`
- **AI prompt:** Summarize chapter story_beats → 3-6 sentence congratulatory recap in book's narrative voice
- **Python fallback:** Template: "You have conquered the trials of {chapter_name}..."

#### §16 Cosmetic Asset Generators
- **Script:** `tools/generate_cosmetics.py`
- **Priority:** LOW — deferred until Emporium feature (3.3)
- **Sub-generators:** Skin (6 sets), Badge & Flair (5+4), Avatar (8 lore-themed)
- **Aesthetic:** Dark, high-contrast pixel-art (void purples, celestial golds, infernal reds, akashic teals)

#### §17 Proactive Content Scanner
- **Script:** `tools/scan_content_gaps.py`
- **Target:** `dev_content_audit` table
- **Scans:** entities without gameplay_data, scenes without entities, chapters without atmosphere, entities without sprites/SFX, skills without SFX
- **No AI needed** — pure DB queries + `log_content_audit()` calls

#### §18 Content Import & Book Loader
- **Script:** `tools/import_book_content.py`
- **Priority:** LOW — initial content already loaded
- **Pipeline:** Parse book document → chapters → scenes → story_beats → extract entities → create skeleton DB records → trigger downstream generators

#### §19 PNG Text Generator (Deferred)
- **Script:** `tools/generate_narrative_pngs.py`
- **Converts book text to copy-protected PNG images**

#### §20 Sync Mapping Editor (Deferred)
- **Script:** `tools/sync_mapping_editor.py`
- **Maps audio timestamps to text blocks**

---

## 5. Execution Order

The setup guide must document this order. Dependencies flow top-to-bottom.

```
Phase 1: Framework (no dependencies)
  1. tools/lib/ai_provider.py
  2. tools/lib/db_client.py
  3. tools/lib/base_generator.py
  4. tools/lib/cache.py

Phase 2: Core Data (order matters)
  5. assign_atmospheres.py          — chapters/books/locations atmosphere_id
  6. seed_entity_families.py        — seed families + classify entities
  7. generate_entity_gameplay.py    — 3,936 entities visual/combat data
  8. capture_difficulty_preset.py   — snapshot game_configs → presets

Phase 3: Visual Assets (depends on Phase 2)
  9.  generate_entity_sprites.py    — entity rendering configs
  10. generate_item_sprites.py      — paper doll + inventory icons
  11. generate_projectile_sprites.py— projectile/trail/impact
  12. populate_attack_visuals.py    — 13 attack_type visual columns
  13. generate_backgrounds.py       — parallax backgrounds

Phase 4: Scene Composition (depends on Phase 3)
  14. generate_scene_data.py        — atmosphere/background assign + wave configs

Phase 5: Content & Polish (independent)
  15. generate_lore_content.py      — entity descriptions, sensory data
  16. generate_boss_lore.py         — transition lore text
  17. generate_achievement_icons.py — 111 achievement icons
  18. generate_artifact_icons.py    — 50 artifact icons
  19. generate_extended_music.py    — longer music loops

Phase 6: Verification
  20. scan_content_gaps.py          — audit all tables for remaining gaps
```

---

## 6. Setup Guide Additions

### AI Provider Configuration
1. Install at least one AI CLI: `claude` (Anthropic) or `gemini` (Google)
2. Create `tools/.env` (or add to `backend/.env`):
   ```env
   AI_CLI_PROVIDER=claude
   AI_CLI_PROVIDER_FALLBACK=gemini
   AI_CLI_MODEL=claude-sonnet-4-6
   AI_CLI_TIMEOUT=120
   AI_CLI_MAX_RETRIES=3
   ```
3. Test: `python -m tools.lib.ai_provider --test`

### Running Generators
```bash
# Check what needs population
python tools/generate_entity_gameplay.py status

# Generate with AI (parallel 4 workers)
python tools/generate_entity_gameplay.py generate --ai --parallel 4

# Generate with Python fallback (no AI needed)
python tools/generate_entity_gameplay.py generate

# Resume after crash
python tools/generate_entity_gameplay.py generate --ai --resume

# Retry just the failed batches
python tools/generate_entity_gameplay.py generate --ai --retry-errors

# Export as SQL migration
python tools/generate_entity_gameplay.py export --format sql > db/069_entity_gameplay_data.sql

# Clean cache after successful run
python tools/generate_entity_gameplay.py --clean-cache
```

### Execution Order
Follow the phase order in Section 5. Each phase depends on the previous. Within a phase, generators can run in any order (or parallel).

---

## 7. Files Created/Modified

### New Files
- `tools/lib/__init__.py`
- `tools/lib/ai_provider.py`
- `tools/lib/db_client.py`
- `tools/lib/base_generator.py`
- `tools/lib/cache.py`
- `tools/generate_entity_gameplay.py` (§1)
- `tools/seed_entity_families.py` (§2)
- `tools/generate_entity_sprites.py` (§3)
- `tools/generate_item_sprites.py` (§4)
- `tools/generate_projectile_sprites.py` (§5)
- `tools/generate_backgrounds.py` (§6)
- `tools/generate_scene_data.py` (§7)
- `tools/assign_atmospheres.py` (§8)
- `tools/populate_attack_visuals.py` (§9)
- `tools/generate_achievement_icons.py` (§10)
- `tools/generate_artifact_icons.py` (§11)
- `tools/capture_difficulty_preset.py` (§12)
- `tools/generate_extended_music.py` (§13)
- `tools/generate_lore_content.py` (§14)
- `tools/generate_boss_lore.py` (§15)
- `tools/generate_cosmetics.py` (§16 — deferred)
- `tools/scan_content_gaps.py` (§17)
- `tools/import_book_content.py` (§18 — deferred)
- `tools/generate_narrative_pngs.py` (§19 — deferred)
- `tools/sync_mapping_editor.py` (§20 — deferred)
- `tools/.env.example` — template for AI provider config
- `docs/inst/GENERATOR_GUIDE.md` — setup + execution order guide

### Modified Files
- `docs/recs/C_STORY_ASSET_GENERATORS.md` — already updated with consolidated generator list
- `docs/recs/0_REQUIREMENTS.md` — already updated section C references
- `docs/inst/GAME_ASSETS_GUIDE.md` — add generator pipeline section
- `.gitignore` — add `tools/.cache/`

---

*Design by: Brainstorming session 2026-03-23*
