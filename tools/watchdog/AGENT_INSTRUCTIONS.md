# ERP Generator Watchdog v2 — Agent Instructions

You are an autonomous ORCHESTRATOR agent running a **QUALITY IMPROVEMENT PASS** on the ERP (Elysium Rising) MMORPG. All data already exists from a prior generation run — your job is NOT to generate from scratch, but to:

1. **AUDIT** every category — sample existing rows, identify what's good vs bad
2. **KEEP** data that already meets quality standards (do not touch it)
3. **REPLACE** data that is generic, templated, duplicated, or too simple
4. **VERIFY** improved data meets the quality bar

You have direct DB access. No generators — you query, evaluate, craft better content, and UPDATE directly.

**PRIOR RUN CONTEXT:** v1 populated all rows but with low quality — template lore text ("A mysterious entity known as..."), identical backgrounds, null music tracks, simple blob sprites. The structure is complete; the content needs upgrading.

---

## MANDATORY READS (load these first)

1. `AGENTS.md` — Project mandates and structure
2. `tools/watchdog/AGENT_GOALS.md` — **Your scorecard — every checkbox must pass**
3. `docs/lore/BOOKS_SUMMARY.md` — **CANONICAL lore source (45 KB) — reference for ALL content**
4. `docs/lore/CHARACTER_GUIDE.md` — Character bios, motivations, relationships
5. `docs/lore/ENVIRONMENT_GUIDE.md` — Location sensory details, atmospheres
6. `db/data_dictionary.md` — Schema reference (109 tables)
7. `tools/watchdog/AUTONOMOUS_PROGRESS.md` — Resume from here on restart

---

## DB ACCESS

```python
import os, psycopg2, json
from dotenv import load_dotenv
load_dotenv('backend/.env')
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()
```

You have FULL read/write access. Work directly — no generators, no middleware.

---

## HOW TO LOOK UP LORE FOR ANY ENTITY

Every entity exists in a rich context chain. **You MUST query this context before writing content.**

### The Ideal Entity Context Query

```sql
SELECT
  e.id, e.name, e.entity_type,
  e.base_description, e.base_emotional_state, e.base_sounds, e.base_abilities,
  e.boss_text_references, e.boss_action_quote,
  ef.name as family_name, ef.description as family_desc,
  -- Where does this entity appear?
  esa.scene_id,
  s.title as scene_title, s.scene_type, s.sort_order as scene_position,
  ch.id as chapter_id, ch.chapter_number, ch.title as chapter_title,
  b.id as book_id, b.title as book_title,
  -- Location sensory context
  loc.canonical_name as location_name, loc.base_visual, loc.base_auditory,
  loc.base_olfactory, loc.base_atmosphere,
  -- Atmosphere for audio context
  atm.name as atmosphere_name, atm.archetype as atmosphere_archetype
FROM entities e
JOIN entity_families ef ON e.entity_family_id = ef.id
LEFT JOIN entity_scene_appearances esa ON esa.entity_id = e.id
LEFT JOIN scenes s ON esa.scene_id = s.id
LEFT JOIN chapters ch ON s.chapter_id = ch.id
LEFT JOIN books b ON ch.book_id = b.id
LEFT JOIN locations loc ON s.location_id = loc.id
LEFT JOIN scene_gameplay_data sgd ON sgd.scene_id = s.id
LEFT JOIN atmospheres atm ON sgd.atmosphere_id = atm.id
WHERE e.id = :entity_id
LIMIT 1;
```

### For Narrative Text (Story Beats)

```sql
SELECT sb.beat_number, sb.raw_text, sb.hidden_lore_text, sb.intensity, sb.pacing
FROM story_beats sb
JOIN entity_beat_appearances eba ON eba.beat_id = sb.id
WHERE eba.entity_id = :entity_id
ORDER BY sb.beat_number;
```

### For Batch Processing (20-50 entities at a time)

```sql
SELECT e.id, e.name, e.entity_type,
  ef.name as family_name,
  ch.chapter_number, ch.title as chapter_title,
  b.title as book_title,
  loc.base_visual, loc.base_atmosphere,
  atm.archetype as atmosphere_archetype
FROM entities e
JOIN entity_families ef ON e.entity_family_id = ef.id
LEFT JOIN entity_scene_appearances esa ON esa.entity_id = e.id
LEFT JOIN scenes s ON esa.scene_id = s.id
LEFT JOIN chapters ch ON s.chapter_id = ch.id
LEFT JOIN books b ON ch.book_id = b.id
LEFT JOIN locations loc ON s.location_id = loc.id
LEFT JOIN scene_gameplay_data sgd ON sgd.scene_id = s.id
LEFT JOIN atmospheres atm ON sgd.atmosphere_id = atm.id
WHERE e.id BETWEEN :start_id AND :end_id
ORDER BY e.id;
```

**Use this context to inform EVERY piece of content you write.** An entity in Book 1's underground caves should feel different from one in Book 3's celestial tower.

---

## QUALITY STANDARDS

### Entity Descriptions (base_description)
- **60+ words** of unique prose
- References: entity name, what it IS, WHERE it appears (chapter/location), family traits, narrative role
- Uses sensory details from the location (visual, auditory, atmosphere)
- **NEVER** use templates: "A mysterious entity known as...", "A fearsome X prowls..."
- Each description reads like it was written by the book's author

### Entity Sprites (asset_registry.render_definition)
- **Complex SVG** (300+ chars of `svg_template`) with multiple elements
- Reflects entity form: wolves have canine silhouettes, ghosts have wispy translucent shapes, constructs have angular geometry
- **Lore-appropriate:** colors match the entity's chapter environment and family traits
- Family-consistent but individually unique — all wolves share canine traits but differ in size, coloring, markings
- Includes: gradients, animated elements (eye glow, pulse), appropriate scale
- **NOT** simple blobs, circles, or rectangles

### Backgrounds (parallax_config)
- **3 distinct layers** (far, mid, near) with different content per layer
- **Lore-appropriate:** Use location sensory data (base_visual, base_atmosphere) from the `locations` table
- Book 1 (underground): rock walls, crystal formations, dripping water, dim phosphorescent light
- Book 2 (wilderness): forest canopy, twisted trees, mist, filtered sunlight
- Book 3 (tower/ascent): stone architecture, stained glass, celestial sky, golden light
- Each background is **visually distinct** — no two chapters share identical configs
- Mood and time_of_day vary meaningfully

### Music (atmospheres.music_definitions)
- **4 mood variants** (boss, combat, explore, mystery) — ALL non-NULL
- Each variant: 8+ sections, 20+ notes in sequence, total duration >= 180s
- Boss = high complexity (chromatic, fast), Explore = low complexity (consonant, slow)
- Key/scale match the atmosphere archetype

### Item Sprites (asset_registry, category = 'item_sprite')
- One entry per `item_type_bases` row (90 base types — NOT every combination)
- Each has SVG reflecting the item type: swords look like swords, helmets like helmets
- `color_palette` derived from `armor_classes` lookup table
- Includes `svg_path`, `slot`, `paperdoll_layer`, `anchor_point`, `scale`
- **Lore artifacts** (50 curated_artifacts) get SPECIAL unique sprites — visually distinct from base items, with glow effects, ornate details, unique silhouettes

### Achievement Icons (asset_registry, category = 'achievement_icon')
- Multi-element SVG composition (300+ chars)
- Primary symbol matches achievement category and what was accomplished
- For **tiered achievements** (parent_achievement_id chain):
  - Common tier: simple version of the theme (e.g., single sword)
  - Higher tiers: same visual elements but MORE of them, LARGER, more ORNATE, added GLOW
  - Example: "Slay 10" = one sword icon → "Slay 100" = three crossed swords → "Slay 1000" = golden blazing sword array with wreath
- Category color scheme: combat=red, exploration=green, collection=gold, social=blue, story=purple

### Artifact Icons (asset_registry, category = 'artifact_icon')
- Each of the 50 curated artifacts gets a UNIQUE icon
- Reflects the artifact's `lore_text` and `source_type`
- Rarity-appropriate visual complexity (common=clean, legendary=ornate+glow+particles)

---

## SCOPING & PRIORITIZATION

You have one overnight session. 3,936 entities is a lot. **Prioritize quality over coverage.**

**Priority order (do these first, do them well):**
1. Entity families (Phase 2) — small set, high impact
2. Entity lore for Book 1 entities (~1,300) — the player's first impression
3. Backgrounds — 139 total, massive visual impact
4. Achievement icons (111) + Artifact icons (50) — bounded sets
5. Item sprites (90 base types + 50 artifacts) — bounded set
6. Music (21 atmospheres × 4 moods) — bounded set
7. Entity lore for Books 2-3 (~2,600) — if time permits
8. Entity sprites — if time permits (these are the most token-heavy)

**If you run out of time:** Completing Books 1-2 lore + all bounded sets at HIGH quality is better than rushing all 3,936 entities with mediocre quality. The watchdog will restart you if you crash — your progress file tracks where you left off.

**Orphaned entities (no scene appearances):** Some entities may have no `entity_scene_appearances` rows. For these, use only the entity's name, type, and family context to write descriptions. Don't skip them — just note in the description that their placement is unresolved.

---

## EXECUTION PHASES

Execute IN ORDER. **Every phase starts by AUDITING what already exists.** Only touch rows that fail quality. Keep good data intact.

### Phase 0: Pre-Flight
1. Verify DB connection
2. `python tools/db_dump_restore.py dump` — backup
3. `python tools/scan_content_gaps.py --verbose` — baseline
4. Log to progress file

### Phase 1: Quality Audit — Classify Existing Data

**DO NOT SKIP.** Before changing anything, sample every category and classify what's already there as KEEP (meets quality) or REPLACE (template/generic/too simple). Log counts and verdicts.

Sample every category per AGENT_GOALS.md QG section. For each category log:
- Total rows
- Rows that pass quality (KEEP)
- Rows that fail quality (REPLACE) — with reason (template text, too short, duplicate, etc.)
- Estimated work: how many rows need improvement

### Phase 2: Entity Families — Audit & Rebalance

**AUDIT FIRST:** Query current distribution. v1 created 17 families — check if they're well-distributed and lore-accurate.

1. Query: family name, count, percentage, description quality
2. **KEEP** families that are well-described and < 25% of entities
3. **FIX** families that are too large, have template descriptions, or lack lore_reference
4. For oversized families: split into lore-appropriate sub-families using entity names/types as guide
5. For weak descriptions: read `docs/lore/BOOKS_SUMMARY.md`, rewrite with specific lore references

**Quality gate:** No family > 25%. All descriptions are lore-rich (not "A group of creatures...").

### Phase 3: Entity Lore — Audit & Upgrade

**AUDIT FIRST:** Count how many entities have template text vs quality descriptions.

```sql
-- How many need fixing?
SELECT
  COUNT(*) FILTER (WHERE base_description LIKE 'A mysterious%' OR base_description LIKE 'A fearsome%' OR LENGTH(base_description) < 50) as needs_fix,
  COUNT(*) FILTER (WHERE LENGTH(base_description) >= 50 AND base_description NOT LIKE 'A mysterious%' AND base_description NOT LIKE 'A fearsome%') as quality_ok,
  COUNT(*) as total
FROM entities;
```

**Only UPDATE entities that fail quality.** Work in batches of 20-50, grouped by chapter.

For each batch of failing entities:
1. Run the batch context query to get entity + chapter + location + family context
2. Read lore docs for that book/chapter
3. For each entity, craft:
   - `base_description`: 60+ words, unique prose, lore-grounded
   - `base_emotional_state`: specific (NOT all "threatening")
   - `base_sounds`: evocative audio ("wet scraping of chitin on stone, punctuated by sharp clicks")
   - `base_abilities`: combat flavor ("ward-pulse blast, obsidian shield slam")
4. UPDATE only the failing rows

**Quality gate after each batch:**
```sql
SELECT COUNT(*) FROM entities WHERE id BETWEEN :start AND :end
AND (base_description LIKE 'A mysterious%' OR LENGTH(base_description) < 50);
```
Must be 0.

### Phase 4: Entity Sprites — Audit & Upgrade

**AUDIT FIRST:** Check existing sprite quality.

```sql
SELECT
  COUNT(*) FILTER (WHERE LENGTH(ar.render_definition::text) >= 300) as quality_ok,
  COUNT(*) FILTER (WHERE LENGTH(ar.render_definition::text) < 300 OR ar.render_definition::text LIKE '%"shape":"circle"%') as needs_fix,
  COUNT(*) as total
FROM asset_registry ar WHERE category = 'entity_sprite';
```

**Only replace sprites that are too simple (< 300 chars or basic shapes).** Work in batches of 10-20, grouped by family.

For each failing sprite:
1. Query entity context (name, family, chapter, location visual)
2. Craft improved SVG reflecting family silhouette, chapter coloring, individual identity
3. Use upsert: `INSERT INTO asset_registry (...) VALUES (...) ON CONFLICT (asset_key) DO UPDATE SET render_definition = EXCLUDED.render_definition, tags = EXCLUDED.tags, source = 'ai_v2';`

**Quality gate:** Sample 10 — **ALL 10** must have SVG >= 300 chars with >= 4 SVG elements. If any fail, fix those specific entries and re-sample.

### Phase 5: Item Sprites — Audit & Complete

**AUDIT FIRST:** Check which item_type_bases already have sprites and which are missing or low quality.

```sql
SELECT itb.code, itb.display_name,
  ar.asset_key IS NOT NULL as has_sprite,
  LENGTH(ar.render_definition::text) as rd_len
FROM item_type_bases itb
LEFT JOIN asset_registry ar ON ar.asset_key = 'item_' || itb.code AND ar.category = 'item_sprite'
ORDER BY has_sprite, itb.code;
```

**Keep good sprites. Fix or create missing/weak ones.**

**Scope: 90 item_type_bases (base types, NOT every combination)**

```sql
SELECT itb.id, itb.code, itb.display_name, itb.description,
  gs.code as slot_code, gs.display_name as slot_name, gs.paperdoll_layer,
  ac.code as armor_code, ac.display_name as armor_name,
  ac.color_tint_base, ac.texture_pattern, ac.glow_intensity
FROM item_type_bases itb
JOIN gear_slots gs ON itb.gear_slot_id = gs.id
LEFT JOIN armor_classes ac ON itb.armor_class_id = ac.id
ORDER BY gs.paperdoll_layer, itb.id;
```

For each base type:
- SVG reflects the item shape (sword, helmet, boots, ring, amulet)
- Color derived from armor_class tint
- Glow for magic/divine armor classes

**THEN: 50 Curated Artifacts — SPECIAL unique sprites**

```sql
SELECT ca.id, ca.name, ca.lore_text, ca.source_type,
  cat.rarity, cat.stat_multiplier,
  atb.code as artifact_type, atb.display_name as type_name
FROM curated_artifacts ca
JOIN curated_artifact_tiers cat ON cat.artifact_id = ca.id
JOIN artifact_type_bases atb ON ca.artifact_type_id = atb.id
ORDER BY ca.id;
```

Each curated artifact gets a visually DISTINCT icon — ornate, glowing, with unique elements referencing its `lore_text`.

### Phase 6: Achievement Icons — Audit & Upgrade

**AUDIT FIRST:** Check existing icon quality. v1 may have created metadata-only entries without real SVG.

```sql
SELECT COUNT(*) FILTER (WHERE LENGTH((ar.render_definition->>'svg_template')::text) >= 300) as quality_ok,
  COUNT(*) FILTER (WHERE ar.render_definition->>'svg_template' IS NULL OR LENGTH((ar.render_definition->>'svg_template')::text) < 300) as needs_fix
FROM achievements a
LEFT JOIN asset_registry ar ON ar.asset_key = a.icon_sprite_key AND ar.category = 'achievement_icon';
```

**Keep quality icons. Replace weak ones.** 111 achievements, some with parent-child tiers.

```sql
SELECT a.id, a.name, a.description, a.category, a.tracking_type,
  a.threshold_value, a.icon_sprite_key,
  a.parent_achievement_id,
  parent.name as parent_name, parent.threshold_value as parent_threshold
FROM achievements a
LEFT JOIN achievements parent ON a.parent_achievement_id = parent.id
ORDER BY COALESCE(a.parent_achievement_id, a.id), a.threshold_value;
```

For tiered achievements (same parent):
- **Tier 1 (lowest threshold):** Simple icon — single element, basic color
- **Tier 2:** Same elements but doubled/larger, brighter colors
- **Tier 3:** Full composition — multiple elements, glow, ornate frame
- **Highest tier:** Legendary treatment — golden, blazing, complex

For standalone achievements:
- Unique SVG reflecting what the achievement represents
- Category color scheme applied

### Phase 7: Backgrounds — Audit & Diversify

**AUDIT FIRST:** v1 produced identical backgrounds for all scenes. Check diversity.

```sql
SELECT COUNT(DISTINCT parallax_config::text) as distinct_configs,
  COUNT(DISTINCT mood) as distinct_moods,
  COUNT(DISTINCT time_of_day) as distinct_times
FROM backgrounds;
```

If distinct_configs < 30, most backgrounds need replacing. **Work by book, then by chapter.**

```sql
SELECT b.id as bg_id, b.background_key,
  s.id as scene_id, s.title as scene_title,
  ch.chapter_number, ch.title as chapter_title,
  bk.title as book_title,
  loc.canonical_name as location_name, loc.base_visual, loc.base_auditory, loc.base_atmosphere,
  atm.archetype as atmosphere_archetype
FROM backgrounds b
JOIN scene_gameplay_data sgd ON sgd.background_id = b.id
JOIN scenes s ON sgd.scene_id = s.id
JOIN chapters ch ON s.chapter_id = ch.id
JOIN books bk ON ch.book_id = bk.id
LEFT JOIN locations loc ON s.location_id = loc.id
LEFT JOIN atmospheres atm ON sgd.atmosphere_id = atm.id
ORDER BY bk.id, ch.chapter_number, s.sort_order;
```

Use `base_visual` and `base_atmosphere` from locations to inform each background's:
- `parallax_config`: 3 layers with lore-appropriate types and colors
- `mood`: derived from atmosphere archetype
- `time_of_day`: varied across the chapter's scenes
- `color_palette`: book-appropriate (see quality standards above)

**Quality gate:** >= 30 distinct parallax configs. No config shared by > 3 backgrounds.

### Phase 8: Music — Audit & Extend

**AUDIT FIRST:** v1 left many mood variants as null with empty sequences.

```sql
SELECT a.name,
  (a.music_definitions->'boss') IS NOT NULL as has_boss,
  (a.music_definitions->'combat') IS NOT NULL as has_combat,
  (a.music_definitions->'explore') IS NOT NULL as has_explore,
  (a.music_definitions->'mystery') IS NOT NULL as has_mystery,
  jsonb_array_length(COALESCE(a.music_definitions->'combat'->'sequence','[]'::jsonb)) as combat_notes
FROM atmospheres a;
```

**Keep tracks that already have 20+ notes. Fix null/empty/short ones.** 21 atmospheres, 4 moods each = 84 tracks.

**Quality gate:** All 84 tracks non-NULL, each >= 180s duration.

### Phase 9: Death SFX — Audit & Fill Gaps

**AUDIT FIRST:** v1 created 85 presets and mapped all entities. Check if mapping is correct.

```sql
SELECT COUNT(*) FILTER (WHERE death_sfx_key IS NULL) as unmapped,
  COUNT(DISTINCT death_sfx_key) as distinct_keys
FROM entity_gameplay_data;
```

**Keep if unmapped = 0 and distinct_keys >= 30.** Only fix if gaps exist.

### Phase 10: Attack Visuals — Audit & Fix

**AUDIT FIRST:** v1 populated 13 attack types. Check if visual columns are lore-appropriate.

```sql
SELECT at.name, at.attack_animation_type, at.projectile_sprite_key,
  at.projectile_color, at.impact_effect, at.trail_type, at.screen_shake
FROM attack_types at ORDER BY at.id;
```

**Check:**
- Each type's `attack_animation_type` matches its name (not all "melee_swing")
- Ranged/magic types have projectile_sprite_key → valid asset_registry entry
- AoE types have screen_shake = TRUE
- **Keep if already correct.** Only fix mismatches.

### Phase 11: Gameplay Data, Scene Composition, Atmospheres — Audit & Fix

**These were mostly complete from v1.** Quick audit — only fix if gaps found.

```sql
-- Gameplay data gaps
SELECT COUNT(*) FILTER (WHERE stat_block IS NULL OR stat_block = '{}') as missing_stats,
  COUNT(*) FILTER (WHERE movement_type_id IS NULL) as missing_movement
FROM entity_gameplay_data;

-- Scene composition gaps
SELECT COUNT(*) FILTER (WHERE entity_pool IS NULL) as missing_pools FROM scene_wave_configs;

-- Atmosphere gaps
SELECT COUNT(*) FILTER (WHERE atmosphere_id IS NULL) as missing_atm FROM scene_gameplay_data;
```

**If all 0, mark these sections as PASS and move on.** Don't rework what's already complete.

### Phase 12: Final Verification

1. `python tools/scan_content_gaps.py --verbose` — 0 gaps
2. Spawn REVIEW AGENT for full quality validation against ALL sections of AGENT_GOALS.md
3. Write `STATUS: COMPLETE` only when review passes

---

## REVIEW AGENT PROTOCOL

Spawn after Phases 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, and at Phase 12 (final).

```
You are a QUALITY REVIEW AGENT. You validate CONTENT QUALITY by reading actual data samples.

PERMISSIONS: READ-ONLY DB. WRITE only to AUTONOMOUS_PROGRESS.md and AGENT_GOALS.md.
LORE REFERENCE: docs/lore/BOOKS_SUMMARY.md, docs/lore/CHARACTER_GUIDE.md, docs/lore/ENVIRONMENT_GUIDE.md

For each goal:
1. Run the verification SQL query from AGENT_GOALS.md
2. READ 5+ actual content samples
3. Verify content is unique, lore-grounded, and complex — NOT template text
4. For sprites: verify SVG has multiple elements (not just a circle)
5. For tiered achievements: verify visual progression across tiers
6. Quote actual samples as evidence in your PASS/FAIL verdict
7. Update AGENT_GOALS.md checkboxes

CRITICAL FAILS (automatic rejection):
- Template text patterns ("A mysterious entity...", "A fearsome X prowls...")
- Identical content across different entities
- SVG with < 3 elements
- Backgrounds with identical parallax_config
```

On FAIL: Log evidence, fix via direct UPDATE, re-review. Max 2 attempts.

---

## HEARTBEAT PROTOCOL

Watchdog kills after **20 minutes** of no file updates.

- `WORKING: Phase X — batch N (entities 100-150) at HH:MM:SS`
- `COMPLETED: Phase X — batch N — X rows updated at HH:MM:SS`
- `QUALITY_GATE: QG-X — PASS/FAIL — details`
- `HEARTBEAT: Phase X — progress at HH:MM:SS` (every 10 min)

---

## CONSTRAINTS

- **Do NOT push to git.**
- **Do NOT modify application code** (frontend/, backend/, admin/).
- **Do NOT delete the DB backup.**
- **Do NOT hardcode or log database credentials.**
- **Quality > coverage.** Better to do 2,000 entities excellently than 3,936 with templates.
- **No generators.** Direct DB access only.
- **Read lore BEFORE writing content.** Every entity lives in a narrative context — use it.

---

## COMPLETION

Write to `tools/watchdog/.autonomous_status`:
```
STATUS: COMPLETE
```

Append to progress file:
```
## FINAL SUMMARY
- Goals passed: XX/129
- Goals deferred: XX/118 (max 5 allowed)
- Entities with quality lore: XXXX/3936
- Template text remaining: 0
- Distinct entity sprites: XXXX
- Distinct backgrounds: XX
- Music tracks >= 180s: XX/84
- Total runtime: XXh XXm
```
