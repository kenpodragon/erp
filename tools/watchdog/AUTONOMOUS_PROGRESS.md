# ERP Generator Watchdog v3 — Autonomous Progress

## Current State
- Phase: NOT STARTED
- Version: v3 (full content regeneration — sprites, lore, icons, backgrounds)
- Branch: main

## v2 Lessons Learned
- String length checks (>= 300 chars) are meaningless — v2 "passed" 129/129 goals with garbage blobs
- Non-NULL counts prove nothing about content quality
- Review agents must READ actual SVG structure and prose, not just run SQL counts
- Family body plans must be designed BEFORE generating individual sprites
- Entity names are fine — the visual content and lore text need full regeneration

## What v3 Must Fix
- Entity sprites: ALL are identical blob/circle shapes → need recognizable family silhouettes
- Entity lore: template text → need book-grounded prose
- Achievement icons: generic shapes → need category-specific symbols with tier progression
- Item sprites: missing/generic → need slot-recognizable equipment
- Backgrounds: identical configs → need book-appropriate parallax diversity

## What v3 Preserves (already good)
- Entity families (15, well-distributed), gameplay data, death SFX, attack visuals, scenes, atmospheres, music
