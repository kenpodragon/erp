# ERP Generator Watchdog v2 — Agent Goals & Acceptance Criteria

**This is your scorecard.** Check off items as they pass quality review with EVIDENCE. The REVIEW AGENT must READ actual content samples — not just count non-NULL rows.

**v2 is a QUALITY IMPROVEMENT PASS.** All data already exists from v1. Your job is to:
- **AUDIT** each category — sample existing rows, classify as KEEP or REPLACE
- **KEEP** rows that already meet quality (do NOT regenerate from scratch)
- **REPLACE** rows with template text, simple sprites, identical configs, or null values
- **VERIFY** improved rows meet the bar before checking off goals

**What v1 produced (known issues to fix):**
- Entity lore: template text ("A mysterious entity known as...")
- Backgrounds: all identical parallax configs and color palettes
- Music: many mood variants were null with empty sequences
- Sprites: some too simple (< 200 chars, basic shapes)
- Achievement icons: metadata only, no real SVG compositions

**Counts:** ~3,936 entities | ~724 scenes | ~138 chapters | 3 books | 111 achievements | 50 curated artifacts | 90 item_type_bases | 15 artifact_type_bases | 21 atmospheres | 13 attack types

**Data chain for lore context:**
- Entity → entity_scene_appearances → scenes → chapters → books
- Entity → entity_beat_appearances → story_beats (narrative text)
- Scene → locations (base_visual, base_auditory, base_atmosphere)
- Entity → entity_families (family traits)
- Scene → scene_gameplay_data → atmospheres (archetype)
- Lore docs: `docs/lore/BOOKS_SUMMARY.md`, `CHARACTER_GUIDE.md`, `ENVIRONMENT_GUIDE.md`

---

## QG: Quality Gates (Phase-Level)

- [ ] QG.1 **Audit complete** — All categories sampled, verdicts logged
- [ ] QG.2 **Families rebalanced** — No family > 25%, all have lore descriptions
- [ ] QG.3 **Entity lore quality** — 0 template text remaining, 10 random samples are unique prose
- [ ] QG.4 **Entity sprites quality** — 10 random SVGs >= 300 chars with >= 4 elements
- [ ] QG.5 **Item sprites complete** — All 90 item_type_bases + 50 curated artifacts have sprites
- [ ] QG.6 **Achievement icons quality** — Tiered achievements show visual progression
- [ ] QG.7 **Backgrounds quality** — >= 30 distinct parallax configs, lore-appropriate per book
- [ ] QG.8 **Music quality** — All 84 mood variants non-NULL, each >= 180s
- [ ] QG.9 **Death SFX mapped** — All entities have death_sfx_key, >= 30 distinct presets
- [ ] QG.10 **Final scan** — 0 content gaps

---

## EF: Entity Families — Diversity & Lore Accuracy

- [ ] EF.1 **>= 15 distinct families**
- [ ] EF.2 **No family > 25% of all entities** — `SELECT name, ROUND(COUNT(*)*100.0/(SELECT COUNT(*) FROM entities),1) as pct FROM entities e JOIN entity_families ef ON e.entity_family_id=ef.id GROUP BY name ORDER BY pct DESC;`
- [ ] EF.3 Every family `description` >= 50 chars — references Towers of Elysium lore
- [ ] EF.4 Every family has `lore_reference` citing specific book/chapter content
- [ ] EF.5 Every family has `base_stat_template` JSONB (HP/DPS/speed scaling unique per family)
- [ ] EF.6 Every family has `icon_key` → valid `asset_registry` entry
- [ ] EF.7 **QUALITY: Read 5 family descriptions** — each is distinct, evocative, NOT "A group of creatures that..."
- [ ] EF.8 **QUALITY: Entity distribution is narratively sensible** — underground chapters have more constructs/undead, forest chapters have more beasts, tower chapters have more celestials/phantasms

---

## LORE: Entity Descriptions — The Core Deliverable

**Every entity description must use the data chain:** entity → family → scene → chapter → book → location → story beats.

### LORE-A: Content Completeness
- [ ] LORE.A1 `base_description` non-NULL and >= 50 chars for all 3,936 entities
- [ ] LORE.A2 `base_emotional_state` non-NULL for all
- [ ] LORE.A3 `base_sounds` non-NULL for all
- [ ] LORE.A4 `base_abilities` non-NULL for all

### LORE-B: Template Detection (CRITICAL)
- [ ] LORE.B1 **ZERO template text:** `SELECT COUNT(*) FROM entities WHERE base_description LIKE 'A mysterious entity%' OR base_description LIKE 'A fearsome%' OR base_description LIKE 'This creature%' OR base_description LIKE '%lurks in the darkness%' OR base_description LIKE '%prowls the shadows%';` **MUST BE 0.**
- [ ] LORE.B2 **Description length diversity:** `SELECT AVG(LENGTH(base_description)), MIN(LENGTH(base_description)), MAX(LENGTH(base_description)) FROM entities;` MIN >= 50, AVG >= 80
- [ ] LORE.B3 **Emotional state diversity:** `SELECT COUNT(DISTINCT base_emotional_state) FROM entities;` >= 15 distinct states
- [ ] LORE.B4 **Sound diversity:** `SELECT COUNT(DISTINCT base_sounds) FROM entities;` >= 100 distinct values (not all "growl")

### LORE-C: Content Quality (Review Agent Reads Actual Text)
- [ ] LORE.C1 **Sample 10 random entities** — each description is unique prose, references entity name, location, and family
- [ ] LORE.C2 **Sample 5 entities from Book 1** — descriptions reference underground/cave/dungeon themes
- [ ] LORE.C3 **Sample 5 entities from Book 3** — descriptions reference tower/celestial/ascension themes
- [ ] LORE.C4 **Sample 5 boss entities** — descriptions are more elaborate, reference `boss_text_references` where available
- [ ] LORE.C5 **No two entities in same chapter** share identical `base_description` — `SELECT base_description, COUNT(*) c FROM entities GROUP BY base_description HAVING COUNT(*)>1;` MUST return 0 rows.

### LORE-D: Boss Transition Lore
- [ ] LORE.D1 All ~138 chapters have `transition_lore_text` >= 100 chars
- [ ] LORE.D2 All 3 books have `transition_lore_text` >= 200 chars
- [ ] LORE.D3 **QUALITY: Sample 3 chapter transitions** — references specific narrative events
- [ ] LORE.D4 **QUALITY: Read all 3 book transitions** — epic cinematic tone

---

## SPR: Entity Sprites — Visually Complex & Lore-Appropriate

### SPR-A: Completeness
- [ ] SPR.A1 All 3,936 entities have `sprite_key` in `entity_gameplay_data`
- [ ] SPR.A2 Every `sprite_key` references valid `asset_registry` entry (category = 'entity_sprite')
- [ ] SPR.A3 Zero sprite_keys with "default_" or "entity_" prefix

### SPR-B: Visual Complexity
- [ ] SPR.B1 **SVG complexity:** Sample 10 — each `render_definition.svg_template` >= 300 chars
- [ ] SPR.B2 **Element count:** Each SVG contains >= 4 distinct elements (path, circle, rect, line, gradient, animate)
- [ ] SPR.B3 **NOT simple shapes:** Zero sprites that are just a `<circle>` or `<rect>` — `SELECT COUNT(*) FROM asset_registry WHERE category='entity_sprite' AND LENGTH(render_definition::text) < 200;` MUST be 0
- [ ] SPR.B4 **Color palette:** Each has `color_palette` with >= 2 colors

### SPR-C: Lore Appropriateness
- [ ] SPR.C1 **Family consistency:** Sample 5 entities from same family — sprites share family silhouette traits (all canines have four legs, all phantasms have wispy forms)
- [ ] SPR.C2 **Individual uniqueness:** Sample 10 from same chapter — no two have identical `render_definition`
- [ ] SPR.C3 **Chapter coloring:** Sample 5 from Book 1 vs Book 3 — underground entities use dark palettes, tower entities use lighter/golden palettes
- [ ] SPR.C4 **Tags meaningful:** Each entry's `tags` array contains family name + visual trait + chapter/environment reference

---

## ITEM: Item Sprites — Base Types + Artifact Specials

### ITEM-A: Base Item Type Coverage (90 item_type_bases)
- [ ] ITEM.A1 **All 90 `item_type_bases` have a sprite** in asset_registry (category = 'item_sprite') — query: `SELECT COUNT(*) FROM item_type_bases itb WHERE NOT EXISTS (SELECT 1 FROM asset_registry ar WHERE ar.asset_key = 'item_' || itb.code AND ar.category='item_sprite');` MUST be 0
- [ ] ITEM.A2 Each has `render_definition` with: `svg_path` (>= 100 chars), `slot`, `paperdoll_layer`, `anchor_point`, `color_palette`, `scale`
- [ ] ITEM.A3 **Slot distinctness:** Helmets look like helmets, swords like swords, boots like boots — sample 5 different slots
- [ ] ITEM.A4 **Armor class coloring:** Cloth=earthy browns, plate=silver/steel, divine=gold, magic=purple, shadow=dark — sample 3 armor classes

### ITEM-B: Curated Artifact Sprites (50 unique items — SPECIAL treatment)
- [ ] ITEM.B1 **All 50 curated_artifacts have a UNIQUE sprite** in asset_registry (category = 'artifact_icon') — `SELECT ca.name FROM curated_artifacts ca WHERE NOT EXISTS (SELECT 1 FROM asset_registry ar WHERE ar.asset_key = 'artifact_' || ca.id AND ar.category='artifact_icon');` MUST return 0
- [ ] ITEM.B2 Artifact sprites are **visually distinct from base items** — more ornate, glow effects, unique silhouettes
- [ ] ITEM.B3 **Lore-driven:** Each artifact sprite reflects its `lore_text` and `source_type`
- [ ] ITEM.B4 **Rarity progression:** Common artifacts = clean design, legendary = ornate + glow + particle effects — sample across rarity tiers
- [ ] ITEM.B5 **QUALITY: Sample 5 artifacts** — each icon is clearly a unique, special item (not just recolored base item)

---

## ACH: Achievement Icons — Tiered Visual Progression

### ACH-A: Completeness
- [ ] ACH.A1 All 111 achievements have `icon_sprite_key` → valid asset_registry entry (category = 'achievement_icon')
- [ ] ACH.A2 Each has `svg_template` >= 300 chars with multiple SVG elements

### ACH-B: Thematic Accuracy
- [ ] ACH.B1 **Category colors:** Combat achievements = red tones, exploration = green, collection = gold, social = blue, story = purple, training = orange
- [ ] ACH.B2 **Symbol matches achievement:** "First Kill" has a combat symbol, "Explorer" has a compass/map symbol, "Collector" has a chest/gems symbol
- [ ] ACH.B3 **QUALITY: Sample 5 from different categories** — each icon clearly communicates what was achieved

### ACH-C: Tiered Achievement Progression (CRITICAL — new requirement)
- [ ] ACH.C1 **Identify tiered achievements:** `SELECT a.id, a.name, a.threshold_value, a.parent_achievement_id FROM achievements a WHERE a.parent_achievement_id IS NOT NULL ORDER BY a.parent_achievement_id, a.threshold_value;`
- [ ] ACH.C2 **Visual progression:** For each tier chain, icons share common visual theme but increase in complexity:
  - Tier 1 (lowest threshold): Simple — single element, basic colors
  - Tier 2: Same elements but larger/doubled, brighter colors
  - Tier 3+: Full composition — multiple elements, glow, ornate frame, golden accents
- [ ] ACH.C3 **QUALITY: Pick 2 tier chains** — verify icons progress from simple → ornate as threshold increases
- [ ] ACH.C4 **SVG element count scales with tier:** Tier 1 >= 4 elements, Tier 2 >= 6, Tier 3+ >= 8

---

## BG: Backgrounds — Lore-Appropriate Parallax Environments

- [ ] BG.1 All 724 scenes have `background_id` in `scene_gameplay_data`
- [ ] BG.2 Every `parallax_config` has 3 layers: `far`, `mid`, `near`
- [ ] BG.3 Each layer has `type`, `colors` (array), `scroll_speed`
- [ ] BG.4 **Mood diversity:** >= 5 distinct moods used — `SELECT COUNT(DISTINCT mood) FROM backgrounds;`
- [ ] BG.5 **Time diversity:** >= 4 distinct time_of_day values
- [ ] BG.6 **Config diversity:** `SELECT COUNT(DISTINCT parallax_config::text) FROM backgrounds;` >= 30 distinct configs
- [ ] BG.7 **No mass duplication:** `SELECT parallax_config::text, COUNT(*) c FROM backgrounds GROUP BY parallax_config::text HAVING COUNT(*)>3 ORDER BY c DESC;` No config used by > 3 backgrounds
- [ ] BG.8 **QUALITY — Book 1 samples:** 3 backgrounds use dark/underground palettes (blues, grays, crystal glow)
- [ ] BG.9 **QUALITY — Book 2 samples:** 3 backgrounds use wilderness palettes (greens, browns, mist)
- [ ] BG.10 **QUALITY — Book 3 samples:** 3 backgrounds use celestial/tower palettes (golds, whites, sky)
- [ ] BG.11 **QUALITY — Location-driven:** Sample 5 — `parallax_config` layer types match the `locations.base_visual` description for that scene's location (note: locations table uses `canonical_name`, not `name`)

---

## EGD: Entity Gameplay Data

### EGD-A: Core Stats
- [ ] EGD.A1 All 3,936 have entity_gameplay_data row
- [ ] EGD.A2 `base_hp` non-NULL for all
- [ ] EGD.A3 `base_gold` non-NULL for all
- [ ] EGD.A4 `stat_block` has ATK, DEF, SPD keys
- [ ] EGD.A5 `appearance_rate` non-NULL (0.1–1.0)

### EGD-B: Visual FK Columns
- [ ] EGD.B1 `movement_type_id` non-NULL for all
- [ ] EGD.B2 `size_class_id` non-NULL for all
- [ ] EGD.B3 `animation_style_id` non-NULL for all
- [ ] EGD.B4 `silhouette_type_id` non-NULL for all
- [ ] EGD.B5 `color_primary` + `color_secondary` non-NULL for all
- [ ] EGD.B6 **Visual diversity:** `SELECT COUNT(DISTINCT (movement_type_id, size_class_id, animation_style_id, silhouette_type_id)) FROM entity_gameplay_data;` >= 50
- [ ] EGD.B7 **QUALITY: Sample 20** — FKs match entity fantasy (cave=burrowing, ghost=hover, bird=flying)

### EGD-C: Attack Types
- [ ] EGD.C1 `primary_attack_type_id` non-NULL for all
- [ ] EGD.C2 >= 50% have `secondary_attack_type_id`
- [ ] EGD.C3 Boss entities have all 3 attack IDs
- [ ] EGD.C4 **QUALITY: Sample 10** — attack types match entity (mages=magic_cast, wolves=melee)

---

## MUS: Music — Extended Compositions

- [ ] MUS.1 All 21 atmospheres have `music_definitions` populated
- [ ] MUS.2 Each has 4 mood variants (boss, combat, explore, mystery) — ALL non-NULL
- [ ] MUS.3 **DURATION:** Every variant >= 180s — `SUM(duration_beats) * (60/bpm)`
- [ ] MUS.4 Each variant has >= 8 sections
- [ ] MUS.5 `generator_key`/`generator_scale` vary (>= 6 distinct keys)
- [ ] MUS.6 `generator_complexity`: boss >= 7, explore <= 5
- [ ] MUS.7 **QUALITY: Sample 3** — combat is faster/more complex than explore for same atmosphere

---

## SFX: Death Sound Effects

- [ ] SFX.1 `audio_configs` has >= 30 death presets
- [ ] SFX.2 Presets cover all family × size combos
- [ ] SFX.3 Each has `preset_definition` with duration_ms, pitches, waveforms, envelope
- [ ] SFX.4 Durations scale: tiny < small < medium < large < huge
- [ ] SFX.5 `death_sfx_key` non-NULL for all 3,936 entities
- [ ] SFX.6 Every `death_sfx_key` references valid `audio_configs.config_key`
- [ ] SFX.7 `SELECT COUNT(DISTINCT death_sfx_key) FROM entity_gameplay_data;` >= 30
- [ ] SFX.8 **QUALITY: Sample 5** — different families have distinct pitch/waveform profiles

---

## ATK: Attack Visuals

- [ ] ATK.1 All 13 attack types have `attack_animation_type` set
- [ ] ATK.2 Ranged/magic types have `projectile_sprite_key` → asset_registry
- [ ] ATK.3 Ranged/magic types have `projectile_color`
- [ ] ATK.4 All have `impact_effect`
- [ ] ATK.5 Magic types have `trail_type`
- [ ] ATK.6 AoE types have `screen_shake` = TRUE
- [ ] ATK.7 **QUALITY:** Each type's animation matches its name (not all "melee_swing")

---

## SC: Scene Composition

- [ ] SC.1 All 724 scenes have `scene_wave_configs` with non-NULL `entity_pool`
- [ ] SC.2 Each `entity_pool` has 3–8 entities
- [ ] SC.3 Boss scenes have `boss_entity_id`
- [ ] SC.4 `max_enemies_per_wave` scales with scene position
- [ ] SC.5 **QUALITY: Sample 5** — entity families in pool match scene atmosphere/chapter theme

---

## ATM: Atmosphere Assignment

- [ ] ATM.1 All 724 scenes have `atmosphere_id` in `scene_gameplay_data`
- [ ] ATM.2 `scenes.atmosphere_archetype` non-NULL for all
- [ ] ATM.3 >= 8 distinct archetypes used
- [ ] ATM.4 **QUALITY: Sample 5 per book** — atmosphere matches chapter narrative

---

## FINAL: End-to-End

- [ ] FINAL.1 `scan_content_gaps.py --verbose` → 0 gaps
- [ ] FINAL.2 Entity count match: entity_gameplay_data count = entities count (3,936)
- [ ] FINAL.3 Every `sprite_key` exists in asset_registry
- [ ] FINAL.4 Every `death_sfx_key` exists in audio_configs
- [ ] FINAL.5 DB backup retained
- [ ] FINAL.6 **FULL CHAIN:** 3 random entities → sprite + scene + background + atmosphere + music + death SFX all resolve
- [ ] FINAL.7 Write `STATUS: COMPLETE`

---

## Summary

| Section | Items | Focus |
|---------|-------|-------|
| QG | 10 | Phase-level quality gates |
| EF | 8 | Entity family diversity |
| LORE | 17 | **Entity descriptions — core deliverable** |
| SPR | 10 | Entity sprite complexity + lore fit |
| ITEM | 9 | Base item + curated artifact sprites |
| ACH | 9 | Achievement icon tiers + progression |
| BG | 11 | Background parallax variety + lore fit |
| EGD | 13 | Gameplay data completeness |
| MUS | 7 | Music duration + variation |
| SFX | 8 | Death SFX coverage |
| ATK | 7 | Attack visuals |
| SC | 5 | Scene composition |
| ATM | 4 | Atmosphere assignment |
| FINAL | 7 | End-to-end verification |
| **TOTAL** | **129** | |

**Completion:** All non-QUALITY items must pass. QUALITY items may be DEFERRED after 2 remediation attempts (max 5 deferred total). **Template text = CRITICAL FAIL = do NOT signal completion.** Total: 129 goals.
