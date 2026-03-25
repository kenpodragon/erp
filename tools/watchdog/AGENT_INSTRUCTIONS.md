# ERP Generator Watchdog v3 — Agent Instructions

You are an autonomous ORCHESTRATOR agent running a **FULL CONTENT REGENERATION** on the ERP (Elysium Rising) MMORPG. Prior runs populated all rows but with **garbage quality** — blob sprites, template lore, identical backgrounds. Your job is to:

1. **REPLACE IN-PLACE** all entity sprites, item sprites, achievement icons, artifact icons, and entity lore with quality content (upsert/update — never delete first)
2. **REPLACE IN-PLACE** all backgrounds with lore-appropriate, visually distinct compositions
3. **VERIFY** every piece of regenerated content meets the quality bar via ACTUAL VISUAL INSPECTION (not string length)

You have direct DB access. No generators — you query, evaluate, craft content, and UPDATE/INSERT directly.

**PRIOR RUN CONTEXT:** v1-v2 populated all rows but content is unusable:
- **Entity sprites:** ALL are identical blob/circle shapes with color variations — zero visual distinction between families
- **Entity lore:** Template text ("A mysterious entity known as...") — no actual book references
- **Achievement icons:** Generic shapes, no visual representation of what was achieved
- **Item sprites:** Missing or generic — no slot-appropriate shapes
- **Backgrounds:** All 139 have identical parallax configs
- **The structural data (gameplay stats, SFX mapping, attack types, families) is FINE — do not touch it**

**CRITICAL MINDSET:** String length and non-NULL checks are MEANINGLESS for quality. A 500-char SVG of `<circle>` repeated 10 times is still garbage. Quality means: does this LOOK like a distinct fantasy creature from the Towers of Elysium? Does this lore text read like it was written by someone who read the books? Does this achievement icon clearly communicate what was achieved?

---

## MANDATORY READS (load these first)

1. `AGENTS.md` — Project mandates and structure
2. `tools/watchdog/AGENT_GOALS.md` — **Your scorecard — every checkbox must pass**
3. `docs/explanation/lore/BOOKS_SUMMARY.md` — **CANONICAL lore source (45 KB) — reference for ALL content**
4. `docs/explanation/lore/CHARACTER_GUIDE.md` — Character bios, motivations, relationships
5. `docs/explanation/lore/ENVIRONMENT_GUIDE.md` — Location sensory details, atmospheres
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

Every entity exists in a rich context chain. **You MUST query this full context before writing ANY content — sprites, lore, everything.**

The DB contains the actual book text in `story_beats.raw_text`. This is your PRIMARY source — it tells you exactly what the narrative says about each scene and entity. `docs/explanation/lore/BOOKS_SUMMARY.md` is a HIGH-LEVEL reference for book/chapter themes when you need broader context.

### Step 1: Full Entity Extract (ALWAYS run this first)

Pull EVERYTHING about the entity — its own fields, family, scenes, locations, atmospheres:

```sql
SELECT
  e.id, e.name, e.entity_type,
  e.base_description, e.base_emotional_state, e.base_sounds, e.base_abilities,
  e.boss_text_references, e.boss_action_quote,
  -- Family context
  ef.name as family_name, ef.description as family_desc,
  ef.lore_reference as family_lore, ef.base_stat_template as family_stats,
  -- Scene placement
  esa.scene_id,
  s.title as scene_title, s.scene_type, s.sort_order as scene_position,
  -- Chapter & book
  ch.id as chapter_id, ch.chapter_number, ch.title as chapter_title,
  ch.transition_lore_text as chapter_transition,
  b.id as book_id, b.title as book_title,
  -- Location sensory details (THIS is what the environment looks/feels/smells like)
  loc.canonical_name as location_name, loc.base_visual, loc.base_auditory,
  loc.base_olfactory, loc.base_atmosphere,
  -- Atmosphere archetype
  atm.name as atmosphere_name, atm.archetype as atmosphere_archetype,
  -- Existing gameplay data (for sprite context)
  egd.movement_type_id, egd.size_class_id, egd.silhouette_type_id,
  egd.color_primary, egd.color_secondary, egd.sprite_key,
  mt.name as movement_name, sc.name as size_name, st.name as silhouette_name
FROM entities e
JOIN entity_families ef ON e.entity_family_id = ef.id
LEFT JOIN entity_gameplay_data egd ON egd.entity_id = e.id
LEFT JOIN movement_types mt ON egd.movement_type_id = mt.id
LEFT JOIN size_classes sc ON egd.size_class_id = sc.id
LEFT JOIN silhouette_types st ON egd.silhouette_type_id = st.id
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

### Step 2: Get the Actual Book Text for This Entity's Scenes

This is the real narrative — what the book says happens where this entity appears:

```sql
-- Story beats where this entity is mentioned/appears
SELECT sb.beat_number, sb.raw_text, sb.hidden_lore_text, sb.intensity, sb.pacing,
  s.title as scene_title, ch.chapter_number, ch.title as chapter_title
FROM story_beats sb
JOIN entity_beat_appearances eba ON eba.story_beat_id = sb.id
JOIN scenes s ON sb.scene_id = s.id
JOIN chapters ch ON s.chapter_id = ch.id
WHERE eba.entity_id = :entity_id
ORDER BY ch.chapter_number, sb.beat_number;
```

If no beat appearances exist, get the scene-level text for the scenes this entity is assigned to:

```sql
-- All story beats from scenes where this entity appears (broader context)
SELECT sb.beat_number, sb.raw_text, sb.intensity,
  s.title as scene_title, ch.chapter_number, ch.title as chapter_title
FROM story_beats sb
JOIN scenes s ON sb.scene_id = s.id
JOIN chapters ch ON s.chapter_id = ch.id
WHERE s.id IN (SELECT scene_id FROM entity_scene_appearances WHERE entity_id = :entity_id)
ORDER BY ch.chapter_number, sb.beat_number
LIMIT 20;
```

**This raw_text IS the book content.** Use it to ground your descriptions, sprite designs, and atmosphere in the actual narrative.

### Step 3: For Batch Processing (20-50 entities at a time)

When processing a batch, get the full context for all entities at once:

```sql
SELECT e.id, e.name, e.entity_type,
  ef.name as family_name, ef.description as family_desc,
  ch.chapter_number, ch.title as chapter_title,
  b.title as book_title,
  loc.canonical_name as location_name, loc.base_visual, loc.base_auditory, loc.base_atmosphere,
  atm.archetype as atmosphere_archetype,
  egd.color_primary, egd.color_secondary,
  mt.name as movement_name, sc.name as size_name, st.name as silhouette_name
FROM entities e
JOIN entity_families ef ON e.entity_family_id = ef.id
LEFT JOIN entity_gameplay_data egd ON egd.entity_id = e.id
LEFT JOIN movement_types mt ON egd.movement_type_id = mt.id
LEFT JOIN size_classes sc ON egd.size_class_id = sc.id
LEFT JOIN silhouette_types st ON egd.silhouette_type_id = st.id
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

Then for each entity in the batch, also pull its story beats (Step 2) to get the actual narrative text.

### How to Use This Context

**For LORE (base_description):** Read the entity's story_beats `raw_text` — this is what the book says about the world this entity inhabits. Reference specific details: if the raw_text mentions "crystalline caverns echoing with dripping water," your description should mention crystal and water. The entity's family_desc tells you its traits (spectral, mechanical, feral, etc.). The location's base_visual/base_atmosphere tells you the sensory environment.

**For SPRITES:** The entity's `silhouette_name` tells you body shape, `movement_name` tells you how it moves (ground, flying, hover, burrowing), `size_name` tells you scale, `family_name` tells you the body plan. The location's `base_visual` and book number guide the color palette.

**For BACKGROUNDS:** The location's `base_visual`, `base_auditory`, `base_atmosphere` are your PRIMARY inputs. The raw_text from story_beats for scenes at that location give additional environmental description.

**Use `docs/explanation/lore/BOOKS_SUMMARY.md` for high-level book/chapter themes** when you need to understand the broader arc — which part of the journey, what tone, what's at stake. But the DB `raw_text` is always the most specific source.

---

## QUALITY STANDARDS — VISUAL VERIFICATION REQUIRED

**The #1 lesson from v1/v2:** Checking string length or non-NULL is USELESS. You MUST verify content by actually READING the SVG structure and lore text, not counting bytes.

### Entity Descriptions (base_description)
- **60+ words** of unique prose
- References: entity name, what it IS, WHERE it appears (chapter/location), family traits, narrative role
- Uses sensory details from the location (visual, auditory, atmosphere)
- **NEVER** use templates: "A mysterious entity known as...", "A fearsome X prowls...", "This creature..."
- Each description reads like it was written by the book's author
- **HOW TO VERIFY:** Read 10 random descriptions OUT LOUD. Do they sound like fantasy novel prose? Do they mention specific locations, events, or lore details from the books? If they could apply to ANY generic fantasy game, they FAIL.

### Entity Sprites (asset_registry.render_definition → svg_template)
**THIS IS THE HARDEST AND MOST IMPORTANT CATEGORY.**

An entity sprite is an SVG that renders as a 64x64 game sprite. It must be a RECOGNIZABLE CREATURE, not a colored blob.

**What GOOD looks like:**
- A wolf-family entity: SVG with `<path>` elements forming canine body, legs, snout, ears, tail. Uses family-appropriate colors. Has eye detail (`<circle>` with glow). Maybe fur texture via small lines.
- A phantom-family entity: SVG with wispy, translucent `<path>` shapes. Uses `<linearGradient>` for fade effect. Ghostly face with hollow eyes. Trailing wisps.
- A construct-family entity: SVG with geometric, angular `<rect>` and `<polygon>` shapes. Metallic gradients. Glowing runes. Mechanical joints.

**What BAD looks like (what v1/v2 produced):**
- `<circle cx="32" cy="32" r="28" fill="#4a3a6b"/>` with a smaller circle on top — this is a BLOB, not a creature
- Same basic shape for every entity, just different colors
- No recognizable silhouette — you can't tell what family it belongs to

**REQUIREMENTS:**
1. **Recognizable silhouette:** If you showed the sprite to a player, they should be able to guess what family it belongs to (beast, phantom, construct, etc.)
2. **Multiple SVG path elements:** At minimum: body shape + limbs/appendages + head/face + detail elements (eyes, markings, weapons, effects). This means >= 6 distinct SVG elements using `<path>`, `<polygon>`, `<ellipse>`, `<line>`, `<rect>`.
3. **Family consistency:** All entities in the same family share the same BODY PLAN (quadruped, biped, floating orb, etc.) but differ in: size proportions, color palette, detail elements (horns, spikes, patterns, glow effects).
4. **Individual uniqueness:** No two entities should have the same SVG. Vary: proportions, appendage count, color saturation, detail elements, expression.
5. **Lore-appropriate coloring:** Underground (Book 1) = dark purples, deep blues, crystal greens, phosphorescent accents. Wilderness (Book 2) = earthy browns, forest greens, amber. Tower (Book 3) = gold, white, celestial blue, silver.
6. **Animation hints:** Include at least one `<animate>` or `<animateTransform>` element (eye glow pulse, breathing, hover float, etc.)

**HOW TO VERIFY:** After generating a batch of 20 sprites for a family:
1. Read 5 of the SVG templates character by character
2. Count distinct SVG elements (path, circle, rect, polygon, line, ellipse, gradient, animate) — must be >= 6
3. Check that the `<path d="...">` values are DIFFERENT across entities (not copy-pasted)
4. Verify body plan matches family (quadrupeds have 4 legs, bipeds have 2, etc.)
5. If ANY sprite is just circles/ellipses with no path elements, it FAILS the entire batch

### Item Sprites (asset_registry, category = 'item_sprite')
One entry per `item_type_bases` row (90 base types — NOT every combination).

**What GOOD looks like:**
- A sword: SVG with blade `<path>`, crossguard `<rect>`, grip `<rect>`, pommel `<circle>`. Armor class coloring (cloth=brown, plate=silver, divine=gold, magic=purple).
- A helmet: SVG with dome shape, visor slit, chin guard, possibly plume/horn detail.
- Boots: SVG with foot shape, sole, buckle detail, cuff.

**What BAD looks like:**
- A generic colored rectangle or circle for every item type
- Same shape for swords and helmets (just different colors)

**REQUIREMENTS:**
1. **Slot-recognizable:** A player should immediately know "that's a weapon" vs "that's a helmet" vs "that's boots" from the silhouette alone
2. **Armor class differentiation:** Same slot but different armor classes look different — cloth items have softer/draped shapes, plate items have angular/rigid shapes, magic items have glow effects
3. **Lore artifacts (50 curated_artifacts) are SPECIAL:** More ornate, unique silhouettes, glow/particle effects in SVG, references to the artifact's `lore_text` (e.g., an artifact described as "forged in celestial fire" should have flame-like elements and gold coloring)

**HOW TO VERIFY:** Read 5 item sprites from different slots. Can you tell which slot each belongs to from the SVG structure alone? Read 3 artifact sprites — are they visually MORE complex than base items?

### Achievement Icons (asset_registry, category = 'achievement_icon')

**What GOOD looks like:**
- "First Blood" (combat): SVG with a sword crossed over a shield, red accent, blood drop detail
- "Explorer I" (exploration): SVG with a compass rose, path/trail element, green accent
- "Explorer III" (higher tier of same): Same compass but LARGER, with multiple paths radiating out, ornate border, golden glow, more detail elements

**What BAD looks like:**
- Generic star or circle shape for every achievement
- Same icon for all tiers, just different colors
- No visual connection to what the achievement represents

**REQUIREMENTS:**
1. **Achievement-specific symbol:** The icon must visually represent what was achieved. Combat = weapons/shields, exploration = maps/compass, collection = treasure/gems, social = people/speech, story = books/scrolls, training = weights/targets
2. **Category color scheme:** Combat=red, exploration=green, collection=gold, social=blue, story=purple, training=orange
3. **Tiered visual progression** (for achievements with parent_achievement_id):
   - Tier 1 (lowest threshold): Simple — 3-4 SVG elements, single accent color
   - Tier 2: Same core symbol but doubled/enlarged, brighter colors, added border — 5-6 elements
   - Tier 3+: Full composition — 8+ elements, glow effects, ornate frame, golden accents
   - **The core symbol MUST be consistent** across tiers — it's the SAME achievement, just grander
4. **Standalone achievements:** Unique SVG reflecting specifically what was accomplished, 5+ elements

**HOW TO VERIFY:** Pick 2 tiered achievement chains. Read all SVGs in each chain. Does tier 1 → tier 2 → tier 3 show clear visual progression (more elements, more ornate) while keeping the same core symbol? Pick 3 standalone achievements from different categories — does each icon clearly communicate its category?

### Artifact Icons (asset_registry, category = 'artifact_icon')
- Each of the 50 curated artifacts gets a UNIQUE icon
- Reflects the artifact's `lore_text` and `source_type`
- Rarity-appropriate visual complexity: common=clean (4-5 elements), rare=detailed (6-8 elements), legendary=ornate+glow+particles (10+ elements)
- **HOW TO VERIFY:** Read 3 artifact icon SVGs at different rarities. Does complexity scale with rarity? Does each reference its lore_text visually?

### Backgrounds (parallax_config)
- **3 distinct layers** (far, mid, near) with DIFFERENT content per layer
- **Lore-appropriate:** Use location sensory data (base_visual, base_atmosphere) from the `locations` table
- Book 1 (underground): rock walls, crystal formations, dripping water, dim phosphorescent light
- Book 2 (wilderness): forest canopy, twisted trees, mist, filtered sunlight
- Book 3 (tower/ascent): stone architecture, stained glass, celestial sky, golden light
- Each background is **visually distinct** — no two chapters share identical configs
- Mood and time_of_day vary meaningfully
- **HOW TO VERIFY:** Read 3 backgrounds from each book. Are the layer types and colors DIFFERENT between books? Are they different WITHIN the same book? Do the colors match the location's base_visual description?

### Music (atmospheres.music_definitions)
- **4 mood variants** (boss, combat, explore, mystery) — ALL non-NULL
- Each variant: 8+ sections, 20+ notes in sequence, total duration >= 180s
- Boss = high complexity (chromatic, fast), Explore = low complexity (consonant, slow)
- Key/scale match the atmosphere archetype

---

## SCOPING & PRIORITIZATION

You have one overnight session. 3,936 entities is a lot. **Prioritize quality over coverage.**

**What to REGENERATE FROM SCRATCH (all are garbage from v1/v2):**
1. Entity sprites — ALL 3,936 (current ones are identical blobs)
2. Entity lore — ALL 3,936 (current ones are template text)
3. Achievement icons — ALL 111 (current ones are generic shapes)
4. Item sprites — ALL 90 base types + 50 artifacts (current ones are missing or generic)
5. Backgrounds — 139 total needed, but table may only have ~1 row currently. Most need INSERT, not UPDATE. 724 scenes share these 139 backgrounds (N:1) — do NOT create one background per scene.

**What to LEAVE ALONE (already good from v1/v2):**
- Entity families (distribution, descriptions, lore_references)
- Entity gameplay data (stats, visual FKs, colors, movement types)
- Death SFX mapping (85 presets, all entities mapped)
- Attack type visuals (13 types configured)
- Scene wave configs (724 scenes with entity pools)
- Atmosphere assignments (724 scenes mapped)
- Music definitions (84 tracks, all >= 180s)

**Priority order (do these first, do them well):**
1. Entity sprites BY FAMILY — design family body plan first, then generate per-entity variants
2. Entity lore for Book 1 entities (~1,300) — the player's first impression
3. Achievement icons (111) — small bounded set, high visibility
4. Item sprites (90 + 50 artifacts) — bounded set
5. Backgrounds (139) — massive visual impact
6. Entity lore for Books 2-3 (~2,600) — if time permits

**If you run out of time:** Completing all sprites + icons + Book 1 lore at HIGH quality is better than rushing everything with mediocre quality. The watchdog will restart you if you crash — your progress file tracks where you left off.

**FAMILY-FIRST SPRITE STRATEGY:**
Before generating ANY entity sprites, design a "body plan template" for each of the 15 families:
- **What SVG structure defines this family?** (e.g., beast = quadruped body + head + tail + legs)
- **What elements vary per entity?** (e.g., horn count, color, size ratio, eye count, marking patterns)
- **What stays consistent?** (e.g., all beasts are quadrupeds, all phantasms float)
Then generate per-entity sprites as VARIATIONS on the family template, not from scratch each time.

**Orphaned entities (no scene appearances):** Some entities may have no `entity_scene_appearances` rows. For these, use only the entity's name, type, and family context. Don't skip them.

---

## EXECUTION PHASES

Execute IN ORDER. **Every phase starts by AUDITING what already exists.** Only touch rows that fail quality. Keep good data intact.

### Phase 0: Pre-Flight
1. Verify DB connection
2. `python tools/db_dump_restore.py dump` — backup
3. `python tools/scan_content_gaps.py --verbose` — baseline
4. Log to progress file

### Phase 1: Pre-Regeneration Baseline

Quick counts only — we already know the content is bad. Log these for the progress file:

```sql
SELECT 'entities' as cat, COUNT(*) FROM entities
UNION ALL SELECT 'entity_sprites', COUNT(*) FROM asset_registry WHERE category='entity_sprite'
UNION ALL SELECT 'item_sprites', COUNT(*) FROM asset_registry WHERE category='item_sprite'
UNION ALL SELECT 'artifact_icons', COUNT(*) FROM asset_registry WHERE category='artifact_icon'
UNION ALL SELECT 'achievement_icons', COUNT(*) FROM asset_registry WHERE category='achievement_icon'
UNION ALL SELECT 'backgrounds', COUNT(*) FROM backgrounds
UNION ALL SELECT 'families', COUNT(*) FROM entity_families;
```

Also read the entity family list — you'll need this for sprite body plans:
```sql
SELECT ef.id, ef.name, ef.description, COUNT(e.id) as entity_count
FROM entity_families ef LEFT JOIN entities e ON e.entity_family_id = ef.id
GROUP BY ef.id, ef.name, ef.description ORDER BY entity_count DESC;
```

### Phase 2: Family Body Plan Design

**DO NOT generate any sprites yet.** First, design a body plan SVG template for each family.

For each of the ~15 families:
1. Read the family description and 3-5 entity names from that family
2. Decide: what is the BODY PLAN? (quadruped, biped, floating, serpentine, amorphous, insectoid, etc.)
3. Define the SVG STRUCTURE template:
   - What `<path>` elements form the body? (torso, limbs, head, tail/appendages)
   - What detail elements vary per entity? (horns, spikes, wings, markings, eye count, glow color)
   - What stays constant? (leg count, general proportions, posture)
4. Write ONE example SVG for the family as reference
5. Log the body plan in AUTONOMOUS_PROGRESS.md

**Example body plan for "Beast" family:**
```
Body plan: Quadruped (4 legs, torso, head with snout, tail)
Constant: 4 leg paths, torso ellipse, head with snout path
Variable: ear shape (pointed/round/absent), tail (long/short/bushy), horn count (0-3),
          fur texture (smooth/spiky paths), eye color, body proportions (slim/stocky)
Color guide: Underground=dark purple/blue, Forest=brown/green, Tower=gold/white
```

### Phase 3: Entity Sprites — Full Regeneration by Family

**Replace in-place, ONE FAMILY AT A TIME.** Use upserts — never delete rows.

Work ONE FAMILY AT A TIME. For each family:
1. Load the body plan from Phase 2
2. Query all entities in this family with their chapter/book context:
   ```sql
   SELECT e.id, e.name, e.entity_type, ef.name as family,
     ch.chapter_number, b.title as book_title,
     loc.base_visual, loc.base_atmosphere
   FROM entities e
   JOIN entity_families ef ON e.entity_family_id = ef.id
   LEFT JOIN entity_scene_appearances esa ON esa.entity_id = e.id
   LEFT JOIN scenes s ON esa.scene_id = s.id
   LEFT JOIN chapters ch ON s.chapter_id = ch.id
   LEFT JOIN books b ON ch.book_id = b.id
   LEFT JOIN locations loc ON s.location_id = loc.id
   WHERE ef.name = :family_name
   ORDER BY b.id, ch.chapter_number;
   ```
3. For each entity, generate a UNIQUE SVG based on the family body plan + individual variations. SVG MUST have `viewBox="0 0 64 64"`.
4. UPSERT into asset_registry (replace in-place — existing rows get overwritten, new rows get created):
   ```sql
   INSERT INTO asset_registry (asset_key, category, render_definition, tags, source)
   VALUES ('entity_sprite_' || :entity_id, 'entity_sprite', :render_def::jsonb, :tags::jsonb, 'ai_v3')
   ON CONFLICT (asset_key) DO UPDATE SET
     render_definition = EXCLUDED.render_definition,
     tags = EXCLUDED.tags,
     source = EXCLUDED.source;
   ```
5. UPDATE entity_gameplay_data.sprite_key:
   ```sql
   UPDATE entity_gameplay_data SET sprite_key = 'entity_sprite_' || :entity_id WHERE entity_id = :entity_id;
   ```
6. Log completed family to RESUME_STATE in AUTONOMOUS_PROGRESS.md

**AFTER EACH FAMILY — MANDATORY VERIFICATION:**
Read 5 random SVGs from the family you just generated. For EACH one:
- Count the distinct SVG element types (path, circle, rect, polygon, line, ellipse, gradient, animate)
- Verify >= 6 distinct elements
- Verify the `<path d="...">` values are DIFFERENT across the 5 samples
- Verify body plan consistency (all have the right number of limbs for the family)
- If ANY of the 5 fail, STOP and fix the generation approach for this family before continuing

### Phase 4: Entity Lore — Full Regeneration

**UPDATE all entity descriptions from scratch.** Work in batches of 20-50, grouped by chapter.

For each batch:
1. Run the batch context query (entity + chapter + location + family + atmosphere)
2. Read `docs/lore/BOOKS_SUMMARY.md` for that book/chapter section
3. For each entity, write:
   - `base_description`: 60+ words of unique prose that references the entity name, its family, the specific chapter location, and narrative context
   - `base_emotional_state`: specific and varied (NOT all "threatening" — use: wary, mournful, frenzied, contemplative, predatory, dormant, wrathful, curious, etc.)
   - `base_sounds`: evocative audio unique to this entity ("wet scraping of chitin on stone, punctuated by sharp clicks" NOT "growling sounds")
   - `base_abilities`: combat flavor referencing family traits ("ward-pulse blast, obsidian shield slam" NOT "attacks the player")

**AFTER EACH BATCH OF 50 — MANDATORY VERIFICATION:**
Read 5 random descriptions from the batch. For EACH one:
- Does it mention the entity BY NAME?
- Does it reference the LOCATION or CHAPTER context?
- Does it mention family-specific traits?
- Does it read like fantasy novel prose (not a game database entry)?
- Is it DIFFERENT from the other 4 samples?
- If ANY fail, redo that specific entity

### Phase 5: Achievement Icons — Full Regeneration

**Replace all achievement icons in-place via upsert.**

First, query all achievements with their tier chains:
```sql
SELECT a.id, a.name, a.description, a.category, a.tracking_type,
  a.threshold_value, a.icon_sprite_key,
  a.parent_achievement_id,
  parent.name as parent_name, parent.threshold_value as parent_threshold
FROM achievements a
LEFT JOIN achievements parent ON a.parent_achievement_id = parent.id
ORDER BY COALESCE(a.parent_achievement_id, a.id), a.threshold_value;
```

**For tiered chains:** Design the base symbol ONCE, then create increasing complexity:
- Tier 1: Base symbol (e.g., single sword), 3-4 SVG elements, category accent color
- Tier 2: Same symbol enlarged + doubled (e.g., crossed swords), 5-6 elements, brighter color
- Tier 3+: Full composition (e.g., golden sword array + wreath + glow), 8+ elements, golden accents

**For standalone achievements:** Unique symbol per achievement, 5+ SVG elements.

**AFTER ALL 111 — MANDATORY VERIFICATION:**
Pick 2 tiered chains. Read ALL SVGs in each chain. Verify:
- Core symbol is consistent across tiers
- Element count increases with tier
- Colors intensify with tier
Pick 3 standalone achievements from different categories. Verify each icon represents its category.

### Phase 6: Item Sprites + Artifact Icons — Full Regeneration

**Replace all in-place via upsert.** Group by gear slot for items, then do artifacts.

**Base items (90 item_type_bases):**
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

Group by slot — design slot-specific shapes (swords, helmets, boots, etc.), then vary by armor class (cloth=soft shapes, plate=angular, magic=glow effects).

**Curated artifacts (50):**
```sql
SELECT ca.id, ca.name, ca.lore_text, ca.source_type,
  cat.rarity, cat.stat_multiplier,
  atb.code as artifact_type
FROM curated_artifacts ca
JOIN curated_artifact_tiers cat ON cat.artifact_id = ca.id
JOIN artifact_type_bases atb ON ca.artifact_type_id = atb.id
ORDER BY ca.id;
```

Each artifact gets a UNIQUE, MORE ORNATE icon than base items. Reference `lore_text` for visual elements.

**AFTER inserting artifact icons, UPDATE the FK:**
```sql
UPDATE curated_artifacts ca
SET icon_sprite_key = 'artifact_icon_' || ca.id
WHERE EXISTS (SELECT 1 FROM asset_registry ar WHERE ar.asset_key = 'artifact_icon_' || ca.id AND ar.category = 'artifact_icon');
```

**AFTER ALL — MANDATORY VERIFICATION:**
Read 5 item sprites from different slots. Can you identify the slot from the SVG structure?
Read 3 artifact icons. Are they clearly more complex than base items?
Verify `paperdoll_layer` in render_definition matches the gear_slot's paperdoll_layer from the DB.

### Phase 7: Backgrounds — Full Regeneration

**Regenerate all backgrounds.** v1/v2 produced identical configs.

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

Work by book, then by chapter. Use `base_visual` and `base_atmosphere` from locations.

**AFTER EACH BOOK — MANDATORY VERIFICATION:**
Read 3 backgrounds from the book. Are layer types and colors DIFFERENT from each other? Do they match the book's theme?

### Phase 8-11: Audit-Only Phases (Already Good)

These categories are already quality from v1/v2. Quick audit, fix only if gaps found:

- **Phase 8: Music** — Verify all 84 mood variants non-NULL, >= 180s. Fix only null/empty ones.
- **Phase 9: Death SFX** — Verify 0 unmapped, >= 30 distinct keys. Skip if good.
- **Phase 10: Attack Visuals** — Verify 13 types configured. Skip if good.
- **Phase 11: Gameplay Data + Scenes + Atmospheres** — Verify 0 gaps. Skip if good.

### Phase 12: Final Verification

1. `python tools/scan_content_gaps.py --verbose` — 0 gaps
2. Spawn REVIEW AGENT for full quality validation against ALL sections of AGENT_GOALS.md
3. Write `STATUS: COMPLETE` only when review passes

---

## REVIEW AGENT PROTOCOL

Spawn after Phases 3, 4, 5, 6, 7, and at Phase 12 (final).

```
You are a QUALITY REVIEW AGENT. You validate CONTENT QUALITY by READING AND ANALYZING actual data — NOT by counting rows or checking string length.

PERMISSIONS: READ-ONLY DB. WRITE only to AUTONOMOUS_PROGRESS.md and AGENT_GOALS.md.
LORE REFERENCE: docs/explanation/lore/BOOKS_SUMMARY.md, docs/explanation/lore/CHARACTER_GUIDE.md, docs/explanation/lore/ENVIRONMENT_GUIDE.md
PRIMARY LORE: story_beats.raw_text from DB (actual book content for each entity's scenes)

## HOW TO VERIFY ENTITY SPRITES (CRITICAL)
1. SELECT 10 random sprite render_definitions from asset_registry WHERE category='entity_sprite'
2. For EACH SVG, parse the svg_template string and count:
   - Number of <path> elements (should be >= 3)
   - Number of <circle>/<ellipse> elements
   - Number of <rect>/<polygon>/<line> elements
   - Number of <linearGradient>/<radialGradient> definitions
   - Number of <animate>/<animateTransform> elements
   - TOTAL distinct elements must be >= 6
3. Check that <path d="..."> values are UNIQUE across samples (not copy-pasted)
4. Check that sprites from the SAME FAMILY share structural similarity (same number of limbs)
5. Check that sprites from DIFFERENT FAMILIES look different (different body plans)

FAIL CONDITIONS FOR SPRITES:
- Any SVG with only <circle> and <ellipse> elements (no <path>) → BLOB, FAIL
- Any two SVGs with identical <path d="..."> values → DUPLICATE, FAIL
- Total elements < 6 → TOO SIMPLE, FAIL
- All sprites in a family have identical structure → NO VARIATION, FAIL

## HOW TO VERIFY ENTITY LORE
1. SELECT 10 random base_descriptions
2. Read each one. Check:
   - Does it mention the entity's NAME?
   - Does it reference a LOCATION or CHAPTER-specific detail?
   - Does it mention FAMILY traits (e.g., "canine form", "spectral", "mechanical")?
   - Is it prose (not a database entry like "Type: beast. Location: cave. Threat: medium.")?
   - Is it DIFFERENT from the other 9 samples?
3. Check for EXPANDED template patterns (LLMs love these):
   "A mysterious", "A fearsome", "This creature", "An ancient", "A powerful",
   "Deep within", "Known throughout", "Born of", "Dwelling in", "Emerging from",
   "Among the", "Beneath the", ending with "formidable opponent" or "testament to"
4. Cross-reference lore claims: if a description says "in the Crystal Warrens of Chapter 4",
   open docs/lore/BOOKS_SUMMARY.md and verify Chapter 4 actually involves Crystal Warrens.
   If the claim contradicts BOOKS_SUMMARY → flag as INACCURATE, FAIL.
5. Check 3 descriptions from the SAME chapter batch — verify they don't follow identical sentence
   structure (e.g., all starting with "[Name] is a [family] that [verbs] in [location]")

FAIL CONDITIONS FOR LORE:
- Any description matching template patterns → FAIL
- Any description < 50 words → FAIL
- Any two descriptions sharing > 50% of words → FAIL
- Description reads like a game stat block, not prose → FAIL
- Lore claim contradicts BOOKS_SUMMARY → FAIL
- 3+ descriptions in same chapter follow identical sentence structure → FAIL

## HOW TO VERIFY ACHIEVEMENT ICONS
1. Query 2 tiered achievement chains (all tiers in each chain)
2. For EACH tier, read the SVG and count elements
3. Verify element count INCREASES with tier (tier 1 < tier 2 < tier 3)
4. Verify core visual symbol is CONSISTENT across tiers — check `render_definition->>'base_symbol'` is identical across all tiers in the chain
5. Query 3 standalone achievements from different categories
6. Verify each icon's visual elements match its category (combat=weapon, exploration=compass, etc.)
7. Verify EVERY achievement icon SVG has `viewBox="0 0 64 64"`

## HOW TO VERIFY ITEM SPRITES
1. Read 5 item sprites from DIFFERENT gear slots
2. Verify each has a distinct silhouette appropriate to its slot
3. Read 3 artifact icons — verify they are MORE complex than base items (more elements, glow effects)

## HOW TO VERIFY BACKGROUNDS
1. Read 3 backgrounds from each of the 3 books (9 total)
2. Verify parallax_config layer types and colors are DIFFERENT between books
3. Verify they're DIFFERENT within the same book
4. Verify colors match the book's theme (Book 1=underground dark, Book 2=wilderness, Book 3=celestial)
5. Verify each layer has a `type` that is NOT `solid` or `empty` — must be descriptive
   (e.g., rock_wall, crystal_formation, forest_canopy, stone_architecture, celestial_sky)
6. Verify each layer has a `colors` array with >= 2 colors
7. SQL structural check:
   ```sql
   SELECT COUNT(*) FROM backgrounds
   WHERE parallax_config->'far'->>'type' IS NULL
      OR parallax_config->'mid'->>'type' IS NULL
      OR parallax_config->'near'->>'type' IS NULL;
   -- Must be 0.
   ```

## HOW TO VERIFY SVG VALIDITY
For ANY SVG you review (sprites, icons, achievements):
1. Check it starts with `<svg` and ends with `</svg>`
2. Check it contains `viewBox="0 0 64 64"`
3. Check all opened tags are closed (no truncated paths)
4. If possible, parse with Python: `xml.etree.ElementTree.fromstring(svg_string)` — if it raises ParseError, FAIL

CRITICAL FAILS (automatic rejection — do NOT check the goal off):
- Entity sprites that are circles/blobs with no <path> elements
- Template lore text (any of the 15+ patterns listed above)
- Identical content across different entities (duplicate SVGs, duplicate descriptions)
- Achievement tier chains with no visual progression or inconsistent base_symbol
- Item sprites where you can't tell the slot from the SVG
- Backgrounds with identical parallax_config across different books
- Backgrounds with layer type = "solid" or "empty"
- Any SVG that fails XML parse validation
- Any SVG missing viewBox="0 0 64 64"

Quote actual content samples as EVIDENCE in your PASS/FAIL verdict.
BUDGET: Complete all checks within one context window. If you cannot finish, mark incomplete sections as DEFERRED — do NOT emit PASS for unchecked sections.
```

On FAIL: Log evidence with specific entity/asset IDs, fix via direct UPDATE, re-review. Max 2 attempts per batch. If still failing after 2 attempts, log as DEFERRED with explanation.

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

## ASSET KEY NAMING CONVENTIONS

All asset_keys MUST follow these exact patterns — FKs in other tables reference these:

| Category | Pattern | Example |
|----------|---------|---------|
| entity_sprite | `entity_sprite_{entity_id}` | `entity_sprite_1847` |
| item_sprite | `item_sprite_{item_type_base_id}` | `item_sprite_12` |
| artifact_icon | `artifact_icon_{curated_artifact_id}` | `artifact_icon_7` |
| achievement_icon | `achievement_icon_{achievement_id}` | `achievement_icon_33` |

After upserting into asset_registry, you MUST also UPDATE the FK in the source table:
- `entity_gameplay_data.sprite_key` for entity sprites
- `achievements.icon_sprite_key` for achievement icons
- `curated_artifacts.icon_sprite_key` for artifact icons

### Standard Upsert Template (use for ALL asset_registry writes)

`asset_registry` has a UNIQUE constraint on `asset_key`. Use this exact pattern:

```sql
INSERT INTO asset_registry (asset_key, category, display_name, render_definition, tags, source)
VALUES (%s, %s, %s, %s::jsonb, %s::jsonb, 'watchdog_v3')
ON CONFLICT (asset_key) DO UPDATE SET
  render_definition = EXCLUDED.render_definition,
  tags = EXCLUDED.tags,
  source = EXCLUDED.source,
  updated_at = now();
```

### Background Upsert (backgrounds table — unique on `background_key`)

Most backgrounds need INSERT (table may only have ~1 row). Use upsert:

```sql
INSERT INTO backgrounds (background_key, parallax_config, mood, time_of_day, color_palette)
VALUES (%s, %s::jsonb, %s, %s, %s::jsonb)
ON CONFLICT (background_key) DO UPDATE SET
  parallax_config = EXCLUDED.parallax_config,
  mood = EXCLUDED.mood,
  time_of_day = EXCLUDED.time_of_day,
  color_palette = EXCLUDED.color_palette;
```

Then link to scenes: `UPDATE scene_gameplay_data SET background_id = :bg_id WHERE scene_id = :scene_id;`

---

## RENDER_DEFINITION SCHEMAS

All `render_definition` JSONB values MUST follow these schemas:

**Entity sprites:**
```json
{
  "svg_template": "<svg viewBox='0 0 64 64' xmlns='http://www.w3.org/2000/svg'>...</svg>",
  "viewBox": "0 0 64 64",
  "family": "beast",
  "book": 1,
  "color_palette": ["#4a3a6b", "#8b6fc0"]
}
```

**Achievement icons:**
```json
{
  "svg_template": "<svg viewBox='0 0 64 64' xmlns='http://www.w3.org/2000/svg'>...</svg>",
  "category": "combat",
  "base_symbol": "sword",
  "tier": 1,
  "element_count": 5
}
```

**Item sprites:**
```json
{
  "svg_template": "<svg viewBox='0 0 64 64' xmlns='http://www.w3.org/2000/svg'>...</svg>",
  "slot": "weapon",
  "paperdoll_layer": 3,
  "anchor_point": {"x": 0.5, "y": 0.8},
  "color_palette": ["#8b8b8b", "#c0c0c0"],
  "scale": 1.0
}
```

**Artifact icons:**
```json
{
  "svg_template": "<svg viewBox='0 0 64 64' xmlns='http://www.w3.org/2000/svg'>...</svg>",
  "rarity": "legendary",
  "base_symbol": "flame_crown",
  "element_count": 12
}
```

**ALL SVGs must have `viewBox="0 0 64 64"`.** This is a 64x64 game sprite.

---

## CRASH RECOVERY

The watchdog restarts you on crash. Upserts make this safe — partial work is preserved, not lost.

1. **All writes use ON CONFLICT ... DO UPDATE (upsert).** No deletes. If you crash mid-batch, completed entities already have their new content. On restart you just continue from where you left off.
2. **Log resume state** after each batch in AUTONOMOUS_PROGRESS.md:
   ```
   ## RESUME_STATE
   {"phase": 3, "family": "phantom", "last_entity_id": 1847, "families_complete": ["beast", "construct"]}
   ```
3. **On restart:** Read AUTONOMOUS_PROGRESS.md, parse RESUME_STATE, skip completed families/batches.
4. **Idempotent upserts** mean re-running a batch is safe — it just overwrites with the same (or better) content.

---

## TIME CAPS

To ensure coverage across all categories:
- **Phase 3 (Entity Sprites):** MAX 4 hours. If incomplete, log remaining families as DEFERRED and continue.
- **Phase 4 (Entity Lore):** MAX 2 hours. Prioritize Book 1, then Book 2.
- **Phase 5 (Achievement Icons):** MAX 30 minutes (111 items).
- **Phase 6 (Item + Artifact Sprites):** MAX 1 hour (140 items).
- **Phase 7 (Backgrounds):** MAX 1 hour (139 items).

---

## COMPLETION

Write to `tools/watchdog/.autonomous_status`:
```
STATUS: COMPLETE
```

Append to progress file:
```
## FINAL SUMMARY
- Goals passed: XX/80
- Goals deferred: XX/80 (max 3 allowed)
- Entities with quality lore: XXXX/3936
- Template text remaining: 0
- Distinct entity sprites (with >= 6 SVG elements): XXXX
- Distinct backgrounds (distinct parallax configs): XX
- Achievement tier chains verified: XX
- Item sprites by slot: XX/90
- Artifact icons: XX/50
- Total runtime: XXh XXm
```
