# ERP Project — Session State

**Last updated:** 2026-03-23
**Last session focus:** Generator Pipeline — framework, 16 generators, AI mode with Claude CLI, UAT, admin Asset Viewer

---

## Current Project Status

| Area | Status | Notes |
|------|--------|-------|
| Story Mode (2.2) | Complete | PixiJS combat, narrative, upgrades, boss interstitials |
| Idle Training (2.3) | Complete | Skill training, essence, scaling aligned with story mode |
| Character & Progression (2.4) | Complete | Stats, skills, dream items, admin panel |
| Audio & Music (2.5) | Complete | Web Audio synthesis, 21 atmospheres, 17 SFX |
| Home Base Hub (2.7.0) | Complete | Artifact system, achievements, leaderboard cache |
| Simulation Toolkit | Complete | 6 phases, casual 59.53h target met |
| Spoofing Lockdown | Complete | Full stack auth bypass removal (2026-03-22) |
| Combat Scaling | Complete | Idle/story aligned, per-scene HP caps, boss HP from DB |
| Banner Visual System | Phase 1-5 Complete | Shared renderers, wave scaling, paper doll, attack anims (2026-03-23) |
| Generator Pipeline | Complete | 4 framework modules, 16 generators, 76 tests, AI mode working (2026-03-23) |
| Admin Asset Viewer | Complete | Visual preview of all generated assets (2026-03-23) |

## Database State

- **Migrations:** 001-068 applied to dev DB
- **Next available migration:** 069
- **DB backup:** `db/backups/pre_uat_2026-03-23.dump` (pre-UAT snapshot)
- **Key recent migrations:**
  - 064: Visual lookup tables (movement_types, size_classes, animation_styles, silhouette_types, armor_classes) + seed data
  - 065: entity_gameplay_data visual FK columns (nullable)
  - 066: attack_types visual columns (animation type, projectile, impact, etc.)
  - 067: gear_slots paperdoll_layer + item_type_bases armor_class_id/weapon animation
  - 068: Banner scaling game_configs (10 rows)

## Generator Pipeline — What Was Built (2026-03-23)

### Framework (`tools/lib/`)
- `ai_provider.py` — Claude/Gemini CLI subprocess routing, exponential backoff, auto-fallback, Claude Code wrapper parsing
- `db_client.py` — PostgreSQL/SQLite dual-driver, CRUD helpers, per-batch transactions
- `base_generator.py` — BaseGenerator ABC with CLI (status/generate/insert/validate/export), orchestration, `resolve_ai_record()` hook
- `cache.py` — File-based generation cache with manifest tracking, resume/recovery

### 16 Generators (all have `--ai` mode with rich prompts + Python fallback)
| Generator | Target Table | Populated |
|-----------|-------------|-----------|
| `assign_atmospheres.py` | chapters, books, locations | 138 + 3 + 449 |
| `seed_entity_families.py` | entity_families, entities | 10 families, 3,936 classified |
| `generate_entity_gameplay.py` | entity_gameplay_data | 3,936 visual FKs + colors |
| `capture_difficulty_preset.py` | difficulty_presets | 2 presets (Original + Balanced) |
| `generate_entity_sprites.py` | asset_registry | sprite_key assignments |
| `generate_item_sprites.py` | asset_registry | 1 item sprite (cloth_chest) |
| `generate_projectile_sprites.py` | asset_registry | projectile configs |
| `populate_attack_visuals.py` | attack_types | 13/13 unique visuals via AI |
| `generate_backgrounds.py` | backgrounds | 139 parallax backgrounds |
| `generate_scene_data.py` | scene_gameplay_data + scene_wave_configs | 724 scenes |
| `generate_lore_content.py` | entities | 64 descriptions |
| `generate_boss_lore.py` | chapters, books | 138 + 3 transition texts |
| `generate_achievement_icons.py` | achievements + asset_registry | 10 icons |
| `generate_artifact_icons.py` | curated_artifacts + asset_registry | icons |
| `generate_extended_music.py` | atmospheres | 21 extended loops |
| `scan_content_gaps.py` | dev_content_audit | gap scanner |

### AI Mode Proven
- Claude CLI integration working end-to-end (prompt → subprocess → parse wrapper → resolve names to IDs → validate → insert)
- Rich prompts produce unique, lore-appropriate content (tested on entity visuals + attack types)
- Python fallback produces functional but generic/repetitive data

### Admin Asset Viewer
- `admin/src/pages/AssetViewer.tsx` — visual preview of all generated assets
- `backend/routes/admin_visual.py` — `/api/admin/asset-preview` endpoint

### Documentation
- `docs/inst/GENERATOR_INSTRUCTIONS.md` — setup, usage, execution order, troubleshooting
- `docs/inst/GENERATOR_AI_RULES.md` — AI agent prompt for full population pipeline
- `docs/recs/C_STORY_ASSET_GENERATORS.md` — consolidated requirements (20 generators)
- `docs/superpowers/specs/2026-03-23-generator-pipeline-design.md` — architecture spec
- `docs/superpowers/plans/2026-03-23-generator-pipeline.md` — implementation plan (28 tasks)

## Content Gap Status (post-UAT)

| Gap | Count | Action |
|-----|-------|--------|
| entity_gameplay_data without death_sfx_key | 3,936 | **Next priority** — needs AI generation |
| Scenes without entity assignments | 144 | Content mapping (entity_scene_appearances) |
| entity_gameplay_data without sprite_key | 33 | Re-run entity sprites generator |
| All other gaps | 0 | Populated |

## What's Left (see TODO.md)

### Immediate — AI-Driven Full Population
1. **Run GENERATOR_AI_RULES.md with AI mode** — reset Python fallback data, regenerate everything with `--ai` for lore-appropriate, unique content. Follow `docs/inst/GENERATOR_AI_RULES.md` step-by-step.
2. **Generate death_sfx_key** — add to `generate_entity_gameplay.py` or create dedicated generator. AI assigns SFX preset keys based on entity type, family, size, and description (e.g., beast→growl_death, spirit→whisper_fade, construct→metal_crash).
3. **Visual verification** — use admin Asset Viewer + Chrome DevTools MCP to verify generated assets render correctly across all 4 combat surfaces (BottomAnimatedBanner, CombatStage, BossStage, ActiveTrainingSimulator) + InventoryPanel paper doll.

### Near-term
- Migration 069: NOT NULL constraints on entity_gameplay_data visual columns after full population
- Entity sprite population (replace remaining 33 default sprite_keys)
- Item sprite population (currently only 1 — need full armor_class × gear_slot matrix)

### Medium-term
- Cosmetic asset generators (Emporium — skins, badges, flair, avatars)
- Longer music loops (extended from current 8-bit)
- Structural improvements (code cleanup, docs)

### Long-term
- Cloud deployment (Firebase storage, free DB alternatives, Docker strategy)
- Home Base Hub remaining phases (2.7.1-2.7.4)

## Key Architecture Decisions (Recent)

- **Generator framework:** `tools/lib/` with BaseGenerator ABC — all generators share CLI, caching, AI/fallback modes
- **AI provider:** Claude CLI subprocess with wrapper parsing. Gemini CLI as fallback. Configured via `tools/.env`.
- **resolve_ai_record():** Hook between AI generation and validation — converts name-based AI output to FK IDs via lookup tables
- **Shared renderers:** EntityRenderer, PaperDollRenderer, AttackRenderer — one component per concern, used across all 4 combat surfaces
- **Normalized visual lookups:** movement_types, size_classes, animation_styles, silhouette_types, armor_classes — FK-based, admin-editable
- **Wave scaling:** Banner enemy count/death rate/kill speed driven by game_configs, scaling with character level
- **Auth:** Firebase-only. All spoofing/bypass mechanisms removed 2026-03-22.
- **Combat HP formula:** `entity_base_hp * 1.012^(scene_position - 1)`, capped per-scene or global `max_scene_base_hp`.

## Test Status

| Suite | Count | Status |
|-------|-------|--------|
| Backend (pytest) | ~766 | 25 pre-existing failures (test_2_6_features, test_stripe_e2e) |
| Frontend (vitest) | 457 | All passing (1 skipped) |
| Admin (vitest) | 368+ | All passing |
| Generator (pytest) | 76 | All passing |
| E2E (Playwright) | 5 | Needs Firebase auth update |

## Branch Status

- **main:** All generator pipeline work merged (2026-03-23). 42 files, 8,650 lines added. Feature branch `feature/generator-pipeline` deleted.
