# ERP Generator Watchdog v3 — Agent Goals & Acceptance Criteria

**This is your scorecard.** Check off items ONLY when they pass the VISUAL VERIFICATION described in each section. The REVIEW AGENT must READ actual content — not just count rows or check string length.

**v3 is a FULL CONTENT REGENERATION.** v1/v2 proved that structural checks (non-NULL, string length >= 300) are meaningless — all 129 goals "passed" but the content was garbage blobs and template text. This time:
- **REPLACE IN-PLACE** all sprites, icons, lore, and backgrounds via upsert (never delete)
- **VERIFY by READING actual SVG structure and prose** — not by counting bytes
- **Family-first sprite strategy** — design body plans before generating individual sprites

**What to REGENERATE (all garbage):**
- Entity sprites (3,936) — currently identical blobs
- Entity lore (3,936) — currently template text
- Achievement icons (111) — currently generic shapes
- Item sprites (90 base + 50 artifacts) — currently missing or generic
- Backgrounds (139) — currently identical configs

**What to LEAVE ALONE (already good):**
- Entity families, gameplay data, death SFX, attack visuals, scenes, atmospheres, music

**Counts:** ~3,936 entities | ~724 scenes | ~138 chapters | 3 books | 111 achievements | 50 curated artifacts | 90 item_type_bases | ~15 entity families | 21 atmospheres | 13 attack types

---

## QG: Quality Gates (Phase-Level)

- [ ] QG.1 **Baseline logged** — Row counts for all categories recorded in progress file
- [ ] QG.2 **Family body plans designed** — All ~15 families have documented body plan with example SVG
- [ ] QG.3 **Entity sprites regenerated** — All old sprites deleted, new ones inserted, review agent PASSED
- [ ] QG.4 **Entity lore regenerated** — All descriptions rewritten, review agent PASSED
- [ ] QG.5 **Achievement icons regenerated** — All deleted and recreated, review agent PASSED
- [ ] QG.6 **Item sprites + artifact icons regenerated** — All created, review agent PASSED
- [ ] QG.7 **Backgrounds regenerated** — All updated with diverse configs, review agent PASSED
- [ ] QG.8 **Audit-only phases clean** — Music, SFX, attacks, gameplay, scenes all verified OK
- [ ] QG.9 **Final review agent PASSED** — All critical checks pass with quoted evidence
- [ ] QG.10 **Zero structural regressions** — sprite_key FKs valid, death_sfx_key FKs valid, 0 content gaps

---

## SPR: Entity Sprites — Visually Complex & Family-Consistent

**REPLACE ALL in-place via upsert. Current sprites are colored blobs with no recognizable form.**

### SPR-A: Family Body Plans (Phase 2 — before ANY sprite generation)
- [ ] SPR.A1 **Body plan documented for every family** — Each has: body type (quadruped/biped/floating/etc.), constant elements, variable elements, color guide per book
- [ ] SPR.A2 **Example SVG written for each family** — A reference SVG showing the body plan with >= 8 distinct elements
- [ ] SPR.A3 **Body plans are DIFFERENT across families** — No two families share the same body type (beasts ≠ constructs ≠ phantasms)

### SPR-B: Sprite Generation Quality (Phase 3 — per family)
- [ ] SPR.B1 **All 3,936 entities have new sprite** in asset_registry (category = 'entity_sprite')
- [ ] SPR.B2 **Every sprite_key in entity_gameplay_data references a valid asset_registry entry**
- [ ] SPR.B3 **SVG element diversity:** Review agent reads 10 random sprites — EACH has >= 6 distinct SVG elements (path + circle/ellipse + rect/polygon + gradient + animate + detail). NOT just circles.
- [ ] SPR.B4 **Path uniqueness:** Review agent reads 10 random sprites from SAME family — all 10 have DIFFERENT `<path d="...">` values (not copy-pasted SVGs)
- [ ] SPR.B5 **Family consistency:** Review agent reads 5 sprites from each of 3 different families — sprites within a family share body plan (same limb count, posture) but differ in details
- [ ] SPR.B6 **Cross-family distinction:** Review agent compares 1 sprite from each of 5 families — body plans are visibly DIFFERENT (quadruped vs biped vs floating vs serpentine vs amorphous)
- [ ] SPR.B7 **Book-appropriate coloring:** Review agent reads 3 sprites from Book 1 + 3 from Book 3 — Book 1 uses dark/underground palette, Book 3 uses celestial/golden palette
- [ ] SPR.B8 **No blob sprites:** `SELECT COUNT(*) FROM asset_registry WHERE category='entity_sprite' AND render_definition::text NOT LIKE '%<path%';` MUST be 0 (every sprite has at least one path element)
- [ ] SPR.B9 **Animation elements:** >= 80% of sprites contain at least one `<animate>` or `<animateTransform>` element
- [ ] SPR.B10 **ViewBox enforced:** `SELECT COUNT(*) FROM asset_registry WHERE category='entity_sprite' AND render_definition::text NOT LIKE '%viewBox="0 0 64 64"%';` MUST be 0
- [ ] SPR.B11 **Element type diversity:** Every sprite must have at LEAST: 1 `<path>` + 1 `<circle>` or `<ellipse>` + 1 gradient + 1 animation. SQL: `SELECT COUNT(*) FROM asset_registry WHERE category='entity_sprite' AND (render_definition::text NOT LIKE '%<path%' OR (render_definition::text NOT LIKE '%<circle%' AND render_definition::text NOT LIKE '%<ellipse%') OR render_definition::text NOT LIKE '%Gradient%');` MUST be 0

---

## LORE: Entity Descriptions — Lore-Grounded Prose

**REPLACE ALL in-place. Current descriptions are template text.**

### LORE-A: Content Quality (the actual bar)
- [ ] LORE.A1 **All 3,936 entities have base_description >= 50 words**
- [ ] LORE.A2 **Review agent reads 10 random descriptions** — EACH ONE:
  - Mentions the entity BY NAME
  - References a specific LOCATION or CHAPTER detail from the books
  - Mentions FAMILY-specific traits (canine, spectral, mechanical, etc.)
  - Reads like fantasy novel prose (NOT a database entry or stat block)
  - Is COMPLETELY DIFFERENT from the other 9 samples
- [ ] LORE.A3 **Book 1 lore check:** Review agent reads 5 from Book 1 — all reference underground/cave/dungeon themes from Towers of Elysium
- [ ] LORE.A4 **Book 3 lore check:** Review agent reads 5 from Book 3 — all reference tower/celestial/ascension themes
- [ ] LORE.A5 **Boss lore check:** Review agent reads 5 boss entities — descriptions are MORE elaborate, reference boss_text_references where available

### LORE-B: Anti-Template Checks
- [ ] LORE.B1 **ZERO template text:** `SELECT COUNT(*) FROM entities WHERE base_description LIKE 'A mysterious%' OR base_description LIKE 'A fearsome%' OR base_description LIKE 'This creature%' OR base_description LIKE '%lurks in the%' OR base_description LIKE '%prowls the%' OR base_description LIKE 'An ancient%' OR base_description LIKE 'A powerful%' OR base_description LIKE 'Deep within%' OR base_description LIKE 'Known throughout%' OR base_description LIKE 'Born of%' OR base_description LIKE 'Dwelling in%' OR base_description LIKE 'Emerging from%' OR base_description LIKE 'Among the%' OR base_description LIKE 'Beneath the%' OR base_description ILIKE '%formidable opponent%' OR base_description ILIKE '%testament to the%';` **MUST BE 0.**
- [ ] LORE.B2 **ZERO duplicates:** `SELECT base_description, COUNT(*) c FROM entities GROUP BY base_description HAVING COUNT(*)>1;` MUST return 0 rows.
- [ ] LORE.B3 **Emotional state diversity:** `SELECT COUNT(DISTINCT base_emotional_state) FROM entities;` >= 20 distinct states (NOT all "threatening")
- [ ] LORE.B4 **Sound diversity:** `SELECT COUNT(DISTINCT base_sounds) FROM entities;` >= 200 distinct values
- [ ] LORE.B5 **Ability diversity:** `SELECT COUNT(DISTINCT base_abilities) FROM entities;` >= 200 distinct values

### LORE-C: Boss Transition Lore
- [ ] LORE.C1 All ~138 chapters have `transition_lore_text` >= 100 chars
- [ ] LORE.C2 All 3 books have `transition_lore_text` >= 200 chars
- [ ] LORE.C3 **Review agent reads 3 chapter transitions** — each references specific narrative events from that chapter
- [ ] LORE.C4 **Review agent reads all 3 book transitions** — epic cinematic tone, references major book arc

---

## ACH: Achievement Icons — Tiered Visual Progression

**REPLACE ALL in-place via upsert. Current icons are generic shapes.**

### ACH-A: Completeness
- [ ] ACH.A1 All 111 achievements have `icon_sprite_key` → valid asset_registry entry (category = 'achievement_icon')
- [ ] ACH.A2 Each has SVG with >= 5 distinct elements (path, circle, gradient, etc.)

### ACH-B: Thematic Accuracy
- [ ] ACH.B1 **Review agent reads 3 combat achievement icons** — each has weapon/shield/battle symbols, red color scheme
- [ ] ACH.B2 **Review agent reads 3 exploration achievement icons** — each has compass/map/path symbols, green color scheme
- [ ] ACH.B3 **Review agent reads 3 collection achievement icons** — each has treasure/gem/chest symbols, gold color scheme
- [ ] ACH.B4 **Review agent reads icons from 2 other categories** — symbols match category (social=people, story=books, training=targets)

### ACH-C: Tiered Achievement Progression (CRITICAL)
- [ ] ACH.C1 **Identify all tier chains:** `SELECT parent_achievement_id, COUNT(*) FROM achievements WHERE parent_achievement_id IS NOT NULL GROUP BY parent_achievement_id;`
- [ ] ACH.C2 **Review agent picks 2 tier chains and reads ALL SVGs in each:**
  - `render_definition->>'base_symbol'` is IDENTICAL across all tiers in each chain
  - SVG element count INCREASES: Tier 1 has 3-4 elements, Tier 2 has 5-6, Tier 3+ has 8+
  - Colors INTENSIFY: Tier 1 is muted, highest tier has golden/glowing accents
  - If element count does NOT increase across tiers → FAIL
  - If `base_symbol` differs across tiers → FAIL
- [ ] ACH.C3 **No generic shapes:** Review agent verifies NO achievement icon is just a star, circle, or generic badge shape — each has category-specific symbolism
- [ ] ACH.C4 **All SVGs valid:** Every achievement icon SVG has `viewBox="0 0 64 64"` and parses as valid XML

---

## ITEM: Item Sprites — Slot-Recognizable Equipment

**REPLACE ALL in-place via upsert.**

### ITEM-A: Base Item Types (90 item_type_bases)
- [ ] ITEM.A1 **All 90 item_type_bases have a sprite** in asset_registry (category = 'item_sprite')
- [ ] ITEM.A2 **Slot recognition test:** Review agent reads 5 sprites from different gear slots (weapon, helmet, chest, boots, ring). Can identify the slot from SVG structure alone — swords have blade+hilt, helmets have dome+visor, boots have sole+cuff.
- [ ] ITEM.A3 **Armor class differentiation:** Review agent reads 3 sprites of same slot but different armor classes. Cloth has soft/draped paths, plate has angular/rigid paths, magic has glow/gradient effects.
- [ ] ITEM.A4 Each sprite has `render_definition` with: `svg_path`, `slot`, `paperdoll_layer`, `anchor_point`, `color_palette`, `scale`

### ITEM-B: Curated Artifact Sprites (50 unique items)
- [ ] ITEM.B1 **All 50 curated_artifacts have a UNIQUE sprite** in asset_registry (category = 'artifact_icon')
- [ ] ITEM.B2 **Complexity test:** Review agent reads 3 artifact icons and 3 base item sprites. Artifact icons have MORE SVG elements (ornate border, glow, unique silhouette) than base items.
- [ ] ITEM.B3 **Lore-driven:** Review agent reads 3 artifact icons alongside their `lore_text` — icon visually references the lore (e.g., "forged in celestial fire" → flame elements and gold coloring)
- [ ] ITEM.B4 **Rarity progression:** Review agent compares a common artifact icon vs a legendary one — legendary is clearly more ornate/complex

---

## BG: Backgrounds — Lore-Appropriate Parallax Environments

**REPLACE ALL in-place. Current backgrounds are identical.**

- [ ] BG.1 All 724 scenes have `background_id` in `scene_gameplay_data`
- [ ] BG.2 **Config diversity:** `SELECT COUNT(DISTINCT parallax_config::text) FROM backgrounds;` >= 50 distinct configs
- [ ] BG.3 **No mass duplication:** No parallax_config shared by > 3 backgrounds
- [ ] BG.4 **Book 1 verification:** Review agent reads 3 backgrounds from Book 1 — dark/underground palettes (deep blue, purple, crystal green, phosphorescent accents). Layer types include: rock walls, crystal formations, dim light.
- [ ] BG.5 **Book 2 verification:** Review agent reads 3 backgrounds from Book 2 — wilderness palettes (forest green, earthy brown, amber, mist). Layer types include: trees, canopy, underbrush.
- [ ] BG.6 **Book 3 verification:** Review agent reads 3 backgrounds from Book 3 — celestial/tower palettes (gold, white, silver, sky blue). Layer types include: stone architecture, stained glass, celestial sky.
- [ ] BG.7 **Cross-book distinction:** Review agent confirms Book 1, 2, 3 backgrounds are visually DIFFERENT (different layer types, different color families)
- [ ] BG.8 **Location-driven:** Review agent reads 5 backgrounds alongside their location's `base_visual` description — parallax layers match the described environment
- [ ] BG.9 **Layer types valid:** `SELECT COUNT(*) FROM backgrounds WHERE parallax_config->'far'->>'type' IS NULL OR parallax_config->'mid'->>'type' IS NULL OR parallax_config->'near'->>'type' IS NULL;` MUST be 0. No layer type may be 'solid' or 'empty'.

---

## PRESERVE: Categories That Are Already Good (Audit-Only)

These passed quality in v1/v2. Quick structural verification — do NOT regenerate.

### Entity Families
- [ ] PRSV.1 >= 15 distinct families, no family > 25%
- [ ] PRSV.2 All families have description, lore_reference, base_stat_template, icon_key

### Entity Gameplay Data
- [ ] PRSV.3 All 3,936 have entity_gameplay_data with non-NULL: base_hp, base_gold, stat_block, movement_type_id, size_class_id, animation_style_id, silhouette_type_id, color_primary, color_secondary, primary_attack_type_id
- [ ] PRSV.4 Visual combo diversity: `SELECT COUNT(DISTINCT (movement_type_id, size_class_id, animation_style_id, silhouette_type_id)) FROM entity_gameplay_data;` >= 50

### Death SFX
- [ ] PRSV.5 `death_sfx_key` non-NULL for all 3,936 entities
- [ ] PRSV.6 Every `death_sfx_key` references valid `audio_configs.config_key`
- [ ] PRSV.7 >= 30 distinct death_sfx_key values

### Music
- [ ] PRSV.8 All 21 atmospheres have all 4 mood variants non-NULL
- [ ] PRSV.9 All 84 tracks >= 180s duration

### Attack Visuals
- [ ] PRSV.10 All 13 attack types have `attack_animation_type` set, distinct per type

### Scenes & Atmospheres
- [ ] PRSV.11 All 724 scenes have atmosphere_id, background_id, scene_wave_configs with entity_pool

---

## FINAL: End-to-End Verification

- [ ] FINAL.1 `python tools/scan_content_gaps.py --verbose` → 0 gaps
- [ ] FINAL.2 Entity count match: entity_gameplay_data = entities = 3,936
- [ ] FINAL.3 Every `sprite_key` in entity_gameplay_data exists in asset_registry
- [ ] FINAL.4 Every `death_sfx_key` exists in audio_configs
- [ ] FINAL.5 DB backup retained from pre-flight
- [ ] FINAL.6 **FULL CHAIN TEST:** Review agent picks 3 random entities → verifies each has: sprite (with >= 6 SVG elements) + lore (prose, not template) + scene + background (lore-appropriate) + atmosphere + music + death SFX — all resolve, all quality
- [ ] FINAL.7 Write `STATUS: COMPLETE` only after review agent confirms ALL above

---

## Summary

| Section | Goals | Focus |
|---------|-------|-------|
| QG | 10 | Phase-level quality gates |
| SPR | 14 | **Entity sprites — family body plans + visual complexity** |
| LORE | 14 | **Entity lore — book-grounded prose** |
| ACH | 11 | **Achievement icons — tiered progression + category symbols** |
| ITEM | 8 | **Item sprites — slot-recognizable + artifact specials** |
| BG | 9 | **Backgrounds — lore-appropriate parallax diversity** |
| PRSV | 11 | Preserved categories (audit-only) |
| FINAL | 7 | End-to-end verification |
| **TOTAL** | **84** | |

**Completion rules:**
- ALL SPR, LORE, ACH, ITEM, BG goals must pass with QUOTED EVIDENCE from review agent
- ALL PRSV goals must pass (structural verification)
- ALL FINAL goals must pass
- Template text or blob sprites = CRITICAL FAIL = do NOT signal completion
- Max 3 goals may be DEFERRED after 2 remediation attempts
- **String length and non-NULL checks alone are NEVER sufficient** — review agent must READ actual content
- **viewBox="0 0 64 64"** must be present in every SVG — no exceptions
