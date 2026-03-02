# Game Assets Integration Guide: Loop A/B

This document defines how to replace 2D placeholders (rectangles/circles) with pixel-art sprites and animations for the Elysium Rising Game Loop 2.0.

---

## 1. Directory Structure
All gameplay assets should be stored in the following directories within the frontend:

- **Classes:** `frontend/public/assets/game/classes/` (Player character sprites)
- **Enemies:** `frontend/public/assets/game/enemies/` (Enemy sprites)
- **Backgrounds:** `frontend/public/assets/game/backgrounds/` (Chapter-specific scrolling backgrounds)
- **SFX:** `frontend/public/assets/game/audio/sfx/` (Click, death, level-up sounds)
- **VFX:** `frontend/public/assets/game/vfx/` (Spell effects, particle sprites)

---

## 2. Sprite Specifications
To maintain the "Dwarves: GDL" pixel art aesthetic, use the following standards:

### 2.1 Format & Size
- **Format:** Transparent `.png` (no background).
- **Scale:** 32x32 or 64x64 pixels (scaled up in PixiJS for a chunky pixel look).
- **Style:** Consistent palette based on the Tower of Elysium descriptions.

### 2.2 Animations (Sprite Sheets)
PixiJS prefers sprite sheets (`.json` + `.png`).
- **Walking:** 4-6 frames looping horizontally.
- **Attack:** 3-5 frames triggered on click/skill use.
- **Damage/Hit:** 2 frames of flickering or recoil.
- **Death:** 4-6 frames of fading or dissolving.

---

## 3. Paper-Doll System (Layered Sprites)
To support dynamic equipment, character sprites must be split into separate layers.

### 3.1 Layer Ordering (Bottom to Top)
1.  **Base Body:** The standard humanoid frame.
2.  **Armor Slot:** Overlay for chest/legs. Must have transparent areas to show the body.
3.  **Head Slot:** Helmets or hair.
4.  **Weapon Slot:** Rendered in front of (or behind) the body depending on the class pose.

### 3.2 Procedural Variations
If specific assets are not yet available, the engine applies the following:
- **Hue Shifting:** Apply a `ColorMatrixFilter` in PixiJS to the **Baseline Sprite** to differentiate rarities.
- **Size Scaling:** Sprites scale by `1.0 + (Level / 100)` to visually indicate power growth.

---

## 4. Background & Parallax Assets
The Battle Banner uses multiple infinite-scrolling layers to create depth.

### 4.1 Layer Specifications
- **Far Layer:** `bg_X_far.png` (Scroll Factor: 0.1). High-altitude vistas, sky, nebulas.
- **Mid Layer:** `bg_X_mid.png` (Scroll Factor: 0.5). Large structures, pipes, buildings.
- **Resolution:** Must be **512x150** or **1024x150** pixels.
- **Tiling:** Left and right edges **must match perfectly** for seamless looping.

### 4.2 File Naming Convention
Assets are automatically loaded based on the Chapter ID:
- **Template:** `/assets/game/backgrounds/bg_{chapter_id}_{layer}.png`
- **Example:** `/assets/game/backgrounds/bg_1_far.png`

---

## 5. How to Update in Code

### 5.1 Overworld Hub (Bottom Banner)
1.  **Component:** `frontend/src/game/components/BottomAnimatedBanner.tsx`
2.  **Logic:** Replace the `Graphics` (Rectangle) component with a `Sprite` or `AnimatedSprite`.
3.  **Loading:** Use the PixiJS `Assets` loader to pre-load textures before rendering.

### 5.2 Story Mode (Combat Area)
1.  **Component:** `frontend/src/game/components/CombatArea.tsx`
2.  **Logic:** Swap the enemy sprite based on the current `wave` and `chapter_id`.
3.  **Visuals:** Update the `x/y` coordinates for "hit shake" or "floating numbers."

---

## 6. Database Mapping
Ensure the `sprite_key` in the `character_classes` and `enemies` tables matches the filename:
- **Example:** `class_engineer` -> `/assets/game/classes/class_engineer.png`
- **Example:** `enemy_sludge` -> `/assets/game/enemies/enemy_sludge.png`
