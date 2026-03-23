# ERP Project — Session State

**Last updated:** 2026-03-23
**Last session focus:** Banner Visual System — wave scaling, entity rendering, paper doll, attack animations, admin editors

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

## Database State

- **Migrations:** 001-068 (064-068 written, not yet applied to dev DB)
- **Next available migration:** 069
- **Key recent migrations:**
  - 064: Visual lookup tables (movement_types, size_classes, animation_styles, silhouette_types, armor_classes) + seed data
  - 065: entity_gameplay_data visual FK columns (nullable)
  - 066: attack_types visual columns (animation type, projectile, impact, etc.)
  - 067: gear_slots paperdoll_layer + item_type_bases armor_class_id/weapon animation
  - 068: Banner scaling game_configs (10 rows)

## Banner Visual System — What Was Built (2026-03-23)

### New Tables (5)
- `movement_types` (5 rows) — ground, hover, flying, burrowing, teleport
- `size_classes` (5 rows) — tiny, small, medium, large, huge
- `animation_styles` (7 rows) — ooze, stalk, pulse, aggro, flap, swarm, slither
- `silhouette_types` (6 rows) — blob, quadruped, biped, orb, winged, cluster
- `armor_classes` (8 rows) — cloth, leather, chain, plate, divine, magic, bone, shadow

### Backend
- 5 SQLModel classes in `backend/models/visual.py`
- Updated EntityGameplayData (9 cols), AttackType (10 cols), GearSlot (paperdoll_layer), ItemTypeBase (armor_class_id + weapon animation)
- `/enemies/encountered` — filters by player_entity_discovery + returns full visual data
- `/character/visuals` — new endpoint for paper doll rendering
- Item generator → derives sprite_key from armor_class + gear_slot + rarity
- Admin CRUD routes for all 5 lookup tables (`backend/routes/admin_visual.py`)

### Frontend — Shared Renderers
- `EntityRenderer` — procedural PixiJS entity rendering from DB visual data (silhouette, colors, animation, movement, death effects)
- `PaperDollRenderer` — 8-layer gear-driven character with aura, armor class overlays, weapon rendering
- `AttackRenderer` — 5 attack types (melee swing, ranged projectile, magic cast, elemental, AoE burst) + 4 impact effects

### Frontend — Integration
- `BottomAnimatedBanner` — adaptive wave scaling from game_configs, shared renderers
- `CombatStage` — shared renderers, attack animations on click/auto-DPS
- `BossStage` — EntityRenderer with boss scale, attack type cycling
- `ActiveTrainingSimulator` — shared renderers with skill-based color themes
- `InventoryPanel` — expanded to 16 gear slots + paper doll preview

### Admin
- `VisualEditor` page with 5 tabs (CRUD for all lookup tables)

## What's Left (see TODO.md)

### Near-term (Banner Visual System Phase 7)
- Apply migrations 064-068 to dev DB
- Entity gameplay data generator (populate 3,936 entities with visual FKs)
- Entity family seeder (populate entity_families)
- Sprite generators (entity, item, projectile)
- Migration 069: NOT NULL constraints + entity_attack_types deprecation
- Visual verification at each progression tier

### Medium-term
- Longer music loops, cosmetic asset generators
- Structural improvements (code cleanup, docs)

### Long-term
- Cloud deployment (Firebase storage, free DB alternatives, Docker strategy)
- Home Base Hub remaining phases (2.7.1-2.7.4)

## Key Architecture Decisions (Recent)

- **Shared renderers:** EntityRenderer, PaperDollRenderer, AttackRenderer — one component per concern, used identically across all 4 combat surfaces + inventory
- **Normalized visual lookups:** movement_types, size_classes, animation_styles, silhouette_types, armor_classes — all FK-based, admin-editable
- **Armor classes:** FK on item_type_bases (nullable = stat-only items). Drives paper doll overlay rendering.
- **Attack slots:** primary/secondary/tertiary attack_type_id on entity_gameplay_data (replaces entity_attack_types junction)
- **Wave scaling:** Banner enemy count/death rate/kill speed all driven by game_configs, scaling with character level
- **Auth:** Firebase-only. All spoofing/bypass mechanisms removed 2026-03-22.
- **Combat HP formula:** `entity_base_hp * 1.012^(scene_position - 1)`, capped by per-scene `max_enemy_hp` or global `max_scene_base_hp`.

## Test Status

| Suite | Count | Status |
|-------|-------|--------|
| Backend (pytest) | ~766 | 25 pre-existing failures (test_2_6_features, test_stripe_e2e) |
| Frontend (vitest) | 457 | All passing (1 skipped) |
| Admin (vitest) | 368 | All passing |
| E2E (Playwright) | 5 | Needs Firebase auth update |
