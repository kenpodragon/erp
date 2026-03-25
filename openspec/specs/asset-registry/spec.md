# Asset Registry & Sprite Management Specification

## Purpose
The Asset Registry is a centralized database-driven system for managing all visual assets in ERP. Every sprite, icon, background, portrait, badge, and visual effect is stored as a procedural rendering definition in JSONB — following the same pattern as the Web Audio system (atmospheres table + audio_configs). No filesystem PNGs are used. C_ generators write directly to the DB; the frontend renders everything from metadata definitions. This approach provides a single source of truth, enables parameterized variations (rarity tints, class colors, seasonal variants), and makes loading a new book series a matter of populating DB rows.

## Requirements

### Requirement: Centralized Asset Registry
The system SHALL store all visual assets as rows in `asset_registry` with a unique `asset_key`, `category`, and `render_definition` JSONB. The `asset_key` SHALL be the canonical identifier referenced by all game tables (e.g., `sprite_key`, `icon_sprite_key` columns). The `category` column SHALL determine which frontend renderer handles the asset.

#### Scenario: Asset retrieved by key for scene rendering
- GIVEN a scene's `scene_gameplay_data` references `background_key = 'bg_ch3_far'`
- WHEN the scene loads
- THEN the frontend fetches `asset_registry` for `asset_key = 'bg_ch3_far'` and passes `render_definition` to BackgroundRenderer

#### Scenario: Missing asset key logged to dev_content_audit
- GIVEN a CombatStage attempts to render entity sprite with key 'enemy_shadow_wraith' not found in registry
- WHEN the fallback placeholder renderer activates
- THEN a `dev_content_audit` record is logged with `audit_type = 'missing_sprite'`

### Requirement: Asset CRUD
The system SHALL provide admin CRUD endpoints for the asset registry: paginated list with category/tag/search filters, single asset GET, CREATE, UPDATE (upsert), and DELETE with reference checking. The DELETE endpoint SHALL return 409 if any game table references the `asset_key`.

#### Scenario: Delete blocked by active reference
- GIVEN `asset_key = 'enemy_sludge'` referenced in `entity_gameplay_data.sprite_key`
- WHEN an admin attempts to delete the asset
- THEN the endpoint returns 409 with the referencing tables and count

### Requirement: Orphan Detection
The system SHALL provide orphan detection endpoints:
- `GET /api/admin/assets/orphans/missing` — asset keys referenced in game tables but not registered
- `GET /api/admin/assets/orphans/unused` — registered assets not referenced by any game table

#### Scenario: Missing orphans surfaced
- GIVEN 50 entity records have `sprite_key` values not present in `asset_registry`
- WHEN `GET /api/admin/assets/orphans/missing` is called
- THEN all 50 missing keys are returned grouped by referencing table

### Requirement: Bulk Import
The system SHALL support bulk upsert of asset definitions via `POST /api/admin/assets/bulk` accepting a JSON array. This is the primary mechanism for C_ generators to publish new assets.

#### Scenario: C_ generator bulk inserts entity sprites
- GIVEN a generator has produced 200 entity sprite definitions
- WHEN `POST /api/admin/assets/bulk` is called with the 200-item array
- THEN all 200 rows are upserted (insert or update existing) atomically

### Requirement: Frontend Rendering Architecture
The system SHALL dispatch rendering to category-specific sub-renderers via `AssetRenderer`. Core renderers (EntityRenderer, BackgroundRenderer, IconRenderer, AvatarRenderer) SHALL be fully implemented. Remaining category renderers (SkinRenderer, BadgeRenderer, FlairRenderer, VFXRenderer, TextImageRenderer, PortraitRenderer) SHALL be stubs returning placeholders until their C_ generators are built.

All game components referencing visual assets SHALL use `AssetRenderer` rather than filesystem paths:
- `CombatStage.tsx` — entity visuals
- `BossStage.tsx` — boss visuals
- `BottomAnimatedBanner.tsx` — player + enemy sprites + backgrounds
- `RelicGallery.tsx`, `AchievementMatrix.tsx` — artifact/achievement icons

#### Scenario: EntityRenderer renders from JSONB definition
- GIVEN `render_definition = {"shape": "circle", "radius": 20, "fill": "#8B0000", "features": ["glowing_eyes"]}`
- WHEN EntityRenderer processes this definition
- THEN a PixiJS Graphics object is drawn with the specified shape, color, and features

### Requirement: Asset Tagging and Search
Assets SHALL support a `tags` JSONB array field for freeform labels (e.g., `["book_1", "chapter_3", "boss", "melee"]`). Tag searches SHALL use PostgreSQL GIN index with `@>` containment operator.

## Design

### Category → Renderer Mapping
| Category | Renderer | Technology |
|:---|:---|:---|
| `entity_sprite` | EntityRenderer | PixiJS Graphics (shape composition) |
| `class_sprite` | ClassRenderer | PixiJS Graphics |
| `background` | BackgroundRenderer | PixiJS Sprite + parallax layers |
| `item_icon` / `artifact_icon` / `achievement_icon` / `skill_icon` | IconRenderer | Canvas 2D API |
| `avatar` | AvatarRenderer | Canvas 2D API |
| `skin` | SkinRenderer (stub) | PixiJS Graphics |
| `badge` / `flair` | BadgeRenderer / FlairRenderer (stubs) | Canvas 2D API |
| `spell_effect` | VFXRenderer (stub) | PixiJS ParticleContainer |
| `narrative_image` | TextImageRenderer (stub) | Canvas 2D text rendering |
| `portrait` | PortraitRenderer (stub) | Canvas 2D API |

### Analogy to Audio System
| Audio (2.5) | Asset Registry (5.7) |
|:---|:---|
| `atmospheres` table | `asset_registry` table |
| `music_definitions` JSONB | `render_definition` JSONB |
| `MusicManager.tsx` | `AssetRenderer.ts` |
| Web Audio API | PixiJS / Canvas 2D |

### Module Structure
```
backend/
├── routes/admin_assets.py        # CRUD, orphans, bulk import, batch preload
└── models/asset_registry.py      # AssetRegistryEntry

frontend/src/game/
├── utils/AssetRenderer.ts        # Core dispatch + cache
└── renderers/
    ├── EntityRenderer.ts
    ├── BackgroundRenderer.ts
    ├── IconRenderer.ts
    └── AvatarRenderer.ts
```

## Schema

**Migration 055** (applied, 196 assets seeded).

### New Table: `asset_registry`
```sql
CREATE TABLE asset_registry (
    id                SERIAL PRIMARY KEY,
    asset_key         VARCHAR(150) NOT NULL UNIQUE,
    category          VARCHAR(50)  NOT NULL,
    display_name      VARCHAR(200),
    description       TEXT,
    render_definition JSONB        NOT NULL DEFAULT '{}',
    tags              JSONB        NOT NULL DEFAULT '[]',
    source            VARCHAR(50)  NOT NULL DEFAULT 'admin',  -- 'seed'|'admin'|'generator'|'migrated'
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

Indexes: `asset_key` (unique), `category`, `source`, `tags` (GIN for `@>` containment), `display_name`.

No FK constraints from game tables to `asset_registry` — loose coupling by design. The `asset_key` string is the integration point, allowing deactivated assets to remain registered.

### `shop_items` / `shop_bundles` — Column Rename (migration 055)
`icon_path VARCHAR(255)` → `icon_asset_key VARCHAR(150)` on both tables (data migrated).

### Source Values
| Value | Description |
|:---|:---|
| `seed` | Created by migration |
| `admin` | Manual admin entry |
| `generator` | Created by C_ generator pipeline |
| `migrated` | Converted from filesystem asset |

### Seed Data (migration 055)
- 21 entries for existing filesystem assets (converted to procedural definitions)
- ~175 placeholder entries for all existing `sprite_key` / `icon_sprite_key` values across game tables
