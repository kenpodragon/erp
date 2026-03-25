# Game Assets Guide: Procedural DB-Driven Rendering

> **Audience:** Full-stack developers and content pipeline operators. Procedural asset system architecture: JSON render definitions in DB, runtime rendering, generator pipeline.
> For frontend design tokens (colors, typography, spacing), see [`STYLE_GUIDE.md`](STYLE_GUIDE.md).

This document defines how all visual assets in Elysium Rising are stored and rendered. As of REC 5.7, **all visual assets are procedural** — stored as JSON render definitions in the database and rendered at runtime.

---

## 1. Architecture Overview

All visual assets are stored in the `asset_registry` database table. Each row contains:
- **`asset_key`** — Canonical identifier (e.g., `enemy_sludge`, `bg_ch1_far`, `avatar_warrior`)
- **`category`** — Determines which renderer handles it (e.g., `entity_sprite`, `background`, `avatar`)
- **`render_definition`** — JSONB payload with all data needed to procedurally render the asset
- **`tags`** — Freeform labels for filtering and search

**No filesystem PNGs.** Everything is rendered at runtime via Canvas 2D or PixiJS.

---

## 2. Asset Categories

| Category | Description | Renderer |
|----------|-------------|----------|
| `entity_sprite` | Enemy and NPC visuals (geometric shapes + features) | EntityRenderer (PixiJS) |
| `class_sprite` | Player character paper-doll (layered body + equipment) | ClassRenderer (PixiJS) |
| `background` | Parallax scrolling layers (gradients + elements) | BackgroundRenderer (Canvas 2D) |
| `avatar` | Player profile pictures (face composition) | AvatarRenderer (Canvas 2D) |
| `item_icon` | Inventory item icons | IconRenderer (Canvas 2D) |
| `artifact_icon` | Artifact system icons | IconRenderer (Canvas 2D) |
| `achievement_icon` | Achievement badge icons | IconRenderer (Canvas 2D) |
| `skill_icon` | Skill hotbar icons | IconRenderer (Canvas 2D) |
| `ui_icon` | General UI icons (shop, boosters) | IconRenderer (Canvas 2D) |
| `skin` | Character skin color overrides | SkinRenderer |
| `badge` | Leaderboard frame overlays | BadgeRenderer |
| `flair` | Chat name decoration effects | FlairRenderer |
| `spell_effect` | VFX particle emitter configs | VFXRenderer (PixiJS) |
| `narrative_image` | Copy-protected text renders | TextImageRenderer |
| `portrait` | Character/NPC bust portraits | PortraitRenderer |

---

## 3. How Assets Are Created

### 3.1 Migration Seeds
Initial assets are seeded in `db/055_asset_registry.sql`:
- 4 entity sprites (sludge, voidling, guardian, remnant)
- 1 class sprite (vessel)
- 8 backgrounds (chapters 1-4, far + mid layers)
- 8 avatar presets (warrior, mage, rogue, cleric, engineer, conduit, drifter, vessel)
- 2 default placeholders (artifact_default, achievement_default)
- ~50 curated artifact icons (generated from `curated_artifacts` table)
- ~90 achievement icons (generated from `achievements` table)
- Shop item icons (generated from `shop_items` table)

### 3.2 C_ Content Generators
Content generator tools write directly to the `asset_registry` table:
- `tools/generate_entity_sprites.py` — Generates entity sprite definitions
- `tools/generate_backgrounds.py` — Generates background layer definitions
- Other C_ generators follow the same pattern

### 3.3 Admin Manual Creation
Admins create and edit assets via the **Asset Registry** page in the admin dashboard (`/assets`). The page includes:
- Grid view with category tabs and search
- Create/Edit modal with JSON editor and live canvas preview
- Orphan detection (missing assets referenced in game tables, unused registry entries)
- Bulk import via API

---

## 4. Render Definition Format

Each category has a recommended JSON structure. See `openspec/specs/5.7_ASSET_REGISTRY_DESIGN.md` sections 3.1-3.11 for complete schemas.

### Example: Entity Sprite
```json
{
  "version": 1,
  "base_shape": "circle",
  "radius": 20,
  "fill_color": "#aa44cc",
  "stroke_color": "#662288",
  "stroke_width": 2,
  "features": [
    {"type": "eyes", "shape": "circle", "count": 2, "radius": 3, "color": "#ff0000", "glow": true}
  ],
  "shadow": {"enabled": true, "offset_y": 22, "scale_x": 1.2, "opacity": 0.3},
  "size_category": "medium"
}
```

### Example: Background
```json
{
  "version": 1,
  "layer": "far",
  "scroll_factor": 0.1,
  "width": 512,
  "height": 150,
  "gradient": {"type": "linear", "direction": "vertical", "stops": [...]},
  "elements": [{"type": "stars", "count": 20, ...}],
  "seamless": true
}
```

---

## 5. Runtime Data Flow

1. Game component needs a visual for `asset_key` (e.g., `"enemy_sludge"`)
2. AssetProvider checks in-memory cache, or fetches from `/api/admin/assets/{key}`
3. For scene entry, batch preload via `/api/admin/assets/batch?keys=a,b,c`
4. AssetRenderer dispatches to category-specific renderer
5. Renderer draws to Canvas/PixiJS Graphics, result is cached (LRU, 50MB limit)
6. Component uses the rendered texture or canvas

---

## 6. Fallback Behavior

When an `asset_key` has no registry entry:
1. A colored rectangle with the key name as text label is rendered
2. Category-appropriate default colors are used (red border for entities, blue for backgrounds, etc.)
3. The missing key is logged to `dev_content_audit`
4. The fallback is cached so it only logs once per session

---

## 7. Database Mapping

Game tables reference assets via string columns:
- `entity_gameplay_data.sprite_key` → `entity_sprite`
- `character_classes.sprite_key` → `class_sprite`
- `scene_gameplay_data.background_sprite_key` → `background`
- `curated_artifacts.icon_sprite_key` → `artifact_icon`
- `achievements.icon_sprite_key` → `achievement_icon`
- `shop_items.icon_asset_key` → varies by shop category
- `players.avatar_preset_key` → `avatar`

These are **loose string references** (no FK constraints). Orphan detection endpoints provide integrity checks.

---

## 8. Legacy (Retired)

The following filesystem directories are **retired** as of migration 055:
- `frontend/public/assets/game/classes/` — Replaced by `class_sprite` registry entries
- `frontend/public/assets/game/enemies/` — Replaced by `entity_sprite` registry entries
- `frontend/public/assets/game/backgrounds/` — Replaced by `background` registry entries
- `frontend/public/assets/avatars/` — Replaced by `avatar` registry entries
- `frontend/public/music/` — Replaced by Web Audio synthesis (REC 2.5)

All sprite sheets, PNGs, and static image assets are superseded by procedural rendering.
