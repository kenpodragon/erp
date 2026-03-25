# Quality Review Report — 2026-03-25

**Reviewer:** Quality Review Agent (Automated)
**Database:** erp_production (localhost:5432)
**Total Goals:** 129 | **PASS:** 101 | **FAIL:** 19 | **WARN:** 9

---

## Summary of Critical Failures

1. **SPR.A2/A3 — 3,300 entity sprite FK mismatch:** `entity_gameplay_data.sprite_key` uses `entity_sprite_XXXX` prefix for 3,300 entities, but `asset_registry` uses `spr_` prefix. Only 636/3,936 resolve correctly.
2. **LORE.D3 — 136/138 chapters have template boss lore:** "You have conquered the trials of..." placeholder text. Only 2 chapters have unique prose.
3. **MUS.4 — 55/105 music tracks have <8 sections:** Explore/mystery moods typically have only 5-6 sections.
4. **EGD.A5 — All appearance_rates are 1.0:** No diversity; should range 0.1-1.0.
5. **ATK.7 — Only 4 distinct animation types across 13 attack types:** `melee_swing`, `ranged_projectile`, `magic_cast`, `ranged_throw`.

---

## QG: Quality Gates (Phase-Level)

| ID | Check | Result | Evidence |
|----|-------|--------|----------|
| QG.1 | Audit complete | PASS | All categories sampled below |
| QG.2 | Families — no >25%, lore descriptions | **PASS** | Max family = mechanisms at 21.4% |
| QG.3 | Entity lore — 0 template, unique prose | **PASS** | 0 template text, 10 samples all unique |
| QG.4 | Entity sprites — SVG >=300 chars, >=4 elements | **PASS** | 10/10 samples pass (346-567 chars, 5-9 elements) |
| QG.5 | Item sprites — all 90+50 have sprites | **PASS** | 0 missing items, 0 missing artifacts |
| QG.6 | Achievement icons — tiered progression | **WARN** | All icons ~640 chars, 5 elements — no visual scaling by tier |
| QG.7 | Backgrounds — >=30 distinct configs | **PASS** | 139 distinct configs |
| QG.8 | Music — all >=180s | **PASS** | 0/105 tracks under 180s |
| QG.9 | Death SFX — all mapped, >=30 distinct | **PASS** | 56 distinct keys, 86 presets, 0 null |
| QG.10 | Final scan — 0 gaps | **FAIL** | 3,300 broken sprite FK references |

---

## EF: Entity Families

| ID | Check | Result | Evidence |
|----|-------|--------|----------|
| EF.1 | >=15 distinct families | **PASS** | 17 families (incl. 2 with <1%: plants=6, undead=3) |
| EF.2 | No family >25% | **PASS** | mechanisms=21.4%, beasts=13.8%, phantasms=12.9% |
| EF.3 | description >=50 chars | **PASS** | 0 short descriptions |
| EF.4 | lore_reference present | **PASS** | 0 missing |
| EF.5 | base_stat_template | **PASS** | 0 missing |
| EF.6 | icon_key -> asset_registry | **PASS** | 0 invalid |
| EF.7 | QUALITY: 5 descriptions distinct | **PASS** | Samples: "Natural and supernatural creatures guided by instinct..." (beasts), "Beings composed of or empowered by primal elemental forces" (elementals), "Malevolent beings of dark origin..." (demons), etc. All distinct and evocative. |
| EF.8 | Narrative distribution | **WARN** | mechanisms dominate all 3 books (564/153/153). Celestials/ancients very low in Book 1 (7/0). Distribution somewhat flat across books rather than thematically distinct. |

---

## LORE: Entity Descriptions

| ID | Check | Result | Evidence |
|----|-------|--------|----------|
| LORE.A1 | NULL descriptions | **PASS** | 0 null |
| LORE.A2 | >=50 chars | **PASS** | 0 short (min=50) |
| LORE.A3 | emotional_state present | **PASS** | 0 null |
| LORE.A4 | sounds present | **PASS** | 0 null |
| LORE.B1 | ZERO template text | **PASS** | 0 matches for any template pattern |
| LORE.B2 | Length diversity | **PASS** | avg=188, min=50, max=1043 |
| LORE.B3 | Emotional state diversity | **PASS** | 1,422 distinct values |
| LORE.B4 | Sound diversity | **PASS** | 1,145 distinct values |
| LORE.C1 | 10 random unique prose | **PASS** | All unique. Samples: "A coordinated and aggressive mass of bees..." (The Angry Swarm), "Deliberate degradation through blackout benders..." (Self-Destruction), "The Elysium Dream exists as a chronicle event..." |
| LORE.C2 | Book 1 underground themes | **WARN** | Mixed. Some match ("Device/Eternal Engine" in containment), some don't reference underground ("100 Days of 100 Stories Challenge" — meta content, not game lore) |
| LORE.C3 | Book 3 tower/celestial themes | **WARN** | Some match ("Ancient Stone Structure" with sigils), some generic ("Family" — just narrator + son) |
| LORE.C4 | Boss entity descriptions | **PASS** | More elaborate. "An encrypted, faceless entity operating in the darkest corners of Dark 4chan..." (Masked Informant) — detailed and narrative-rich. |
| LORE.C5 | No duplicate descriptions | **PASS** | 0 duplicates |
| LORE.D1 | Chapter transition lore | **PASS** | 138/138 populated |
| LORE.D2 | Book transition lore | **PASS** | 3/3 populated |
| LORE.D3 | Chapter lore quality | **FAIL** | 136/138 are template: "You have conquered the trials of [title]..." Only 2 have unique prose. |
| LORE.D4 | Book lore quality | **PASS** | All 3 are unique prose referencing Veils and Tower metaphors. |

---

## SPR: Entity Sprites

| ID | Check | Result | Evidence |
|----|-------|--------|----------|
| SPR.A1 | All have sprite_key | **PASS** | 0 null, 0 missing EGD rows |
| SPR.A2 | sprite_key -> asset_registry | **FAIL** | 3,300/3,936 unresolvable. `entity_sprite_XXXX` prefix doesn't match `spr_` prefix in asset_registry. |
| SPR.A3 | No default_/entity_ prefix | **FAIL** | 3,300 have `entity_sprite_` prefix |
| SPR.B1 | SVG >=300 chars | **PASS** | 10/10 samples: 346-567 chars |
| SPR.B2 | >=4 elements | **PASS** | 10/10 samples: 5-9 elements |
| SPR.B3 | No simple shapes | **PASS** | 0 sprites <200 chars |
| SPR.B4 | Color palette >=2 colors | **PASS** | All have 3 colors (primary/secondary/accent) |
| SPR.C1 | Sprites per family unique | **PASS** | 3,936/3,936 unique (every entity has its own sprite) |
| SPR.C2 | Family-color fit | **WARN** | Samples show similar dark palettes across different families (phantasms, chronicles, elementals all have #2F0000-#5C1818 primary). Low color diversity. |
| SPR.C3 | Total entity sprites | **PASS** | 3,936 in asset_registry (with `spr_` prefix) |
| SPR.C4 | Boss sprite differentiation | N/A | Not separately verified |

---

## ITEM: Item Sprites

| ID | Check | Result | Evidence |
|----|-------|--------|----------|
| ITEM.A1 | All 90 item_type_bases have sprites | **PASS** | 0 missing. 218 total item sprites. |
| ITEM.A2 | render_definition structure | **PASS** | All have svg_path (>=100 chars), slot, paperdoll_layer, anchor_point, color_palette, scale |
| ITEM.A3 | Slot distinctness | **PASS** | 16 distinct slots (head, chest, legs, feet, hands, shoulders, waist, neck, back, main_hand, off_hand, wrist_1, wrist_2, finger_1, finger_2, trinket) |
| ITEM.A4 | Armor class coloring | **PASS** | Cloth=#8B7355 (earthy), plate=#C0C0C0 (silver), shadow=#28283C (dark), leather=#8B4513 (brown) |
| ITEM.B1 | All 50 curated artifacts have sprites | **PASS** | 0 missing. 100 total artifact icons. |
| ITEM.B2 | Visually distinct from base items | **PASS** | Artifacts: 1558-1602 char SVGs, 14 elements vs base items: ~112 chars. Much more complex. |
| ITEM.B3 | Lore-driven | N/A | Would need manual visual inspection |
| ITEM.B4 | Rarity progression | N/A | `curated_artifacts` has no `rarity` column — cannot verify tier progression |
| ITEM.B5 | QUALITY: 5 artifact samples | **PASS** | Memory Spool, Ascending Heart, Demiurge's Fingerbone, Transcendence Seed, Cracked Data Core — all 14 elements, 1558-1602 chars |

---

## ACH: Achievement Icons

| ID | Check | Result | Evidence |
|----|-------|--------|----------|
| ACH.A1 | All 111 have icon_sprite_key | **PASS** | 0 null, 0 invalid references |
| ACH.A2 | SVG >=300 chars, multiple elements | **PASS** | All samples: 640 chars, 5 elements |
| ACH.B1 | Tiered achievements exist | **PASS** | 66 tiered achievements |
| ACH.B2 | Category coverage | **PASS** | Multiple categories present |
| ACH.B3 | Icon-category alignment | N/A | Visual inspection needed |
| ACH.C1 | Tier chains identified | **PASS** | e.g., Enemy Slayer I→II→III at 100/500/1000 |
| ACH.C2 | Visual progression | **FAIL** | All tiers have identical SVG complexity: 640 chars, 5 elements. No visual scaling. |
| ACH.C3 | QUALITY: 2 chain samples | **FAIL** | Slayer I/II/III all same complexity. No progression from simple→ornate. |
| ACH.C4 | Element count scales with tier | **FAIL** | All tiers = 5 elements. Tier 1 should be 4, Tier 2 should be 6, Tier 3+ should be 8. |

---

## BG: Backgrounds

| ID | Check | Result | Evidence |
|----|-------|--------|----------|
| BG.1 | All 724 scenes have background_id | **PASS** | 0 null, 0 missing SGD rows |
| BG.2 | 3 layers: far/mid/near | **PASS** | 5/5 samples have all 3 layers |
| BG.3 | Layer structure (type, colors, speed) | **PASS** | All have type, colors array, scroll_speed |
| BG.4 | >=5 distinct moods | **PASS** | 7: serene, melancholic, chaotic, ethereal, foreboding, mysterious, ominous |
| BG.5 | >=4 time_of_day values | **PASS** | 6: dusk, night, eternal_twilight, dawn, day, underground |
| BG.6 | >=30 distinct configs | **PASS** | 139 distinct parallax configs |
| BG.7 | No config >3 backgrounds | **PASS** | 0 duplicated configs |
| BG.8 | Book 1 dark/underground | **PASS** | Night/dusk, foreboding/mysterious moods, dark palettes (#0b1218, #3b170e) |
| BG.9 | Book 2 wilderness | **WARN** | Some match (dawn/mysterious) but `bg_default` appeared twice — possible over-use of fallback |
| BG.10 | Book 3 celestial/tower | **PASS** | Serene/ethereal moods, light palettes (#e5e3ff, #cbe5f6), eternal_twilight time |
| BG.11 | Location-driven parallax | **PASS** | Samples show reasonable matching (crystals type for underground, gradient for open areas) |

---

## EGD: Entity Gameplay Data

| ID | Check | Result | Evidence |
|----|-------|--------|----------|
| EGD.A1 | All 3,936 have EGD row | **PASS** | 3,936/3,936 |
| EGD.A2 | base_hp non-NULL | **PASS** | 0 null |
| EGD.A3 | base_gold non-NULL | **PASS** | 0 null |
| EGD.A4 | stat_block has ATK/DEF/SPD | **PASS** | 0 missing keys |
| EGD.A5 | appearance_rate 0.1-1.0 | **FAIL** | All 3,936 = 1.0. No diversity — every entity has identical appearance rate. |
| EGD.B1 | movement_type_id | **PASS** | 0 null |
| EGD.B2 | size_class_id | **PASS** | 0 null |
| EGD.B3 | animation_style_id | **PASS** | 0 null |
| EGD.B4 | silhouette_type_id | **PASS** | 0 null |
| EGD.B5 | color_primary/secondary | **PASS** | 0 null |
| EGD.B6 | Visual diversity >=50 combos | **PASS** | 569 distinct visual combinations |
| EGD.B7 | QUALITY: FK matches fantasy | **PASS** | Reasonable: beasts=movement 1 (ground), phantasms=movement 2/5 (float/hover) |
| EGD.C1 | primary_attack_type_id | **PASS** | 0 null |
| EGD.C2 | Valid attack type refs | **PASS** | 0 invalid |
| EGD.C3 | Attack diversity | **PASS** | All 13 attack types used |
| EGD.C4 | Family-attack correlation | **PASS** | Narratively sensible: beasts=melee/aerial, mechanisms=ranged/construct/nanite, phantasms=psychic/phase/void |

---

## MUS: Music

| ID | Check | Result | Evidence |
|----|-------|--------|----------|
| MUS.1 | All 21 atmospheres have music | **PASS** | 0 missing |
| MUS.2 | 4 mood variants each | **PASS** | All have boss/combat/explore/mystery (105 total = 21×5, includes extra) |
| MUS.3 | All >=180s | **PASS** | 0 tracks under 180s |
| MUS.4 | >=8 sections per track | **FAIL** | 55/105 tracks have <8 sections. Explore moods typically have 5-6 sections, boss moods have 9-12. |
| MUS.5 | Key/scale diversity | **PASS** | 9 distinct keys (Am, Bm, C, D, Dm, E, Em, F, G), 7 scales |
| MUS.6 | Complexity: boss>=7, explore<=5 | **WARN** | Boss atmospheres: 7-9 complexity (OK). Non-boss explore: complexity set at atmosphere level (2-6), not per mood. Some explore atmospheres at complexity 6. |
| MUS.7 | QUALITY: combat faster than explore | **WARN** | BPM is set per atmosphere, not per mood. Combat and explore share same BPM. Cannot verify combat is faster. |

---

## SFX: Death Sound Effects

| ID | Check | Result | Evidence |
|----|-------|--------|----------|
| SFX.1 | >=30 death presets | **PASS** | 86 presets |
| SFX.2 | Family × size coverage | **PASS** | Presets named `death_{family}_{size}` cover all combos |
| SFX.3 | preset_definition structure | **PASS** | All have: duration_ms, frequency_start/end, oscillator_type, attack_ms, decay_ms, sustain_level, release_ms, noise_mix |
| SFX.4 | Duration scales by size | **PASS** | tiny=255ms, small=354ms, medium=488ms, large=681ms, huge=942ms — monotonically increasing |
| SFX.5 | death_sfx_key non-NULL | **PASS** | 0 null |
| SFX.6 | Valid audio_configs refs | **PASS** | 0 invalid |
| SFX.7 | >=30 distinct keys | **PASS** | 56 distinct keys |
| SFX.8 | QUALITY: family profiles | **PASS** | phantasms (781ms large) vs chronicles (439ms medium) — different families have distinct profiles |

---

## ATK: Attack Visuals

| ID | Check | Result | Evidence |
|----|-------|--------|----------|
| ATK.1 | All 13 have animation type | **PASS** | 0 null |
| ATK.2 | Ranged/magic have projectile_sprite_key | **PASS** | All 11 non-melee types have projectile keys in asset_registry |
| ATK.3 | projectile_color present | **PASS** | 0 missing |
| ATK.4 | impact_effect present | **PASS** | 0 null |
| ATK.5 | Magic types have trail_type | **PASS** | 0 missing |
| ATK.6 | AoE screen_shake | **PASS** | 6 types have screen_shake=TRUE (akashic, psychic, void, resonance, thermal, gravitic) |
| ATK.7 | Animation distinctness | **FAIL** | Only 4 distinct animations: melee_swing(1), ranged_projectile(1), magic_cast(8), ranged_throw(3). 8 magic types all use `magic_cast`. |

---

## SC: Scene Composition

| ID | Check | Result | Evidence |
|----|-------|--------|----------|
| SC.1 | All 724 have wave configs | **PASS** | 724/724, 0 null entity_pool |
| SC.2 | entity_pool 3-8 entities | **PASS** | Distribution: 3→112, 4→117, 5→135, 6→137, 7→116, 8→107 |
| SC.3 | Boss scenes have boss_entity_id | **PASS** | 144 boss scenes, 0 missing |
| SC.4 | max_enemies scales | **PASS** | Early scenes=3, boss scenes=1 (single boss focus) |
| SC.5 | QUALITY: pool matches theme | **PASS** | Entity pools use entities from matching scene appearances |

---

## ATM: Atmosphere Assignment

| ID | Check | Result | Evidence |
|----|-------|--------|----------|
| ATM.1 | All 724 have atmosphere_id | **PASS** | 0 null |
| ATM.2 | atmosphere_archetype non-NULL | **PASS** | 0 null |
| ATM.3 | >=8 distinct archetypes | **PASS** | 13 distinct (body_horror, conspiracy_bunker, cosmic_archive, domestic_trauma, glitch_reality, liminal_purgatory, mundane_dread, occult_sanctum, tech_utopia, void_abyss, alien_frontier, ancient_sanctuary, training_grounds) |
| ATM.4 | QUALITY: atmosphere matches book | **PASS** | Book 1: Body Horror/Occult. Book 2: Liminal Purgatory/Ancient Sanctuary. Book 3: Ancient Sanctuary/Tech Utopia/Alien Frontier. Reasonable thematic fit. |

---

## FINAL: End-to-End

| ID | Check | Result | Evidence |
|----|-------|--------|----------|
| FINAL.1 | 0 content gaps | **FAIL** | 3,300 broken sprite FK references (entity_sprite_ prefix mismatch) |
| FINAL.2 | Entity count match | **PASS** | entities=3,936, entity_gameplay_data=3,936 |
| FINAL.3 | Every sprite_key in asset_registry | **FAIL** | 3,300 unresolvable |
| FINAL.4 | Every death_sfx_key in audio_configs | **PASS** | 0 broken |
| FINAL.5 | DB backup retained | N/A | Not verified (operational check) |
| FINAL.6 | Full chain resolves | **FAIL** | 1/3 random entities had broken sprite chain (entity_sprite_234 → not in registry) |
| FINAL.7 | STATUS: COMPLETE | **FAIL** | Cannot mark complete with critical failures |

---

## Remediation Priority

### P0 — Critical (blocks release)
1. **Fix 3,300 sprite_key references:** Update `entity_gameplay_data.sprite_key` from `entity_sprite_XXXX` to `spr_{canonical_name}_XXXX` pattern matching asset_registry. This is a single UPDATE query.
2. **Generate unique chapter boss lore:** 136/138 chapters have template placeholder text. Need AI-generated lore referencing chapter content.

### P1 — High (quality degradation)
3. **Achievement tier visual progression:** All tiers have identical SVG complexity (640 chars, 5 elements). Need scaling: Tier 1=4 elements, Tier 2=6, Tier 3+=8.
4. **Music section count:** 55/105 tracks have <8 sections. Explore/mystery moods need more sections.
5. **Attack animation diversity:** Only 4 animations for 13 types. Need unique animations for at least `akashic`, `psychic`, `void`, `corruption`.

### P2 — Medium (polish)
6. **Appearance rate diversity:** All 3,936 = 1.0. Should vary by entity rarity/type (0.1-1.0).
7. **Music per-mood BPM:** BPM is atmosphere-level, not mood-level. Combat should be faster than explore.
8. **Sprite color diversity:** Similar dark palettes across different families.
9. **Book 2 background fallback:** `bg_default` appears in Book 2 scenes — should have chapter-specific backgrounds.
