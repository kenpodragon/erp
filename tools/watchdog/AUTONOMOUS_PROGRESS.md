# ERP Generator Watchdog v4 — Autonomous Progress

## Current State
- Phase: NOT STARTED
- Version: v4 (YOU write content — no scripts, no templates, no automation)
- Branch: main

## Why v1/v2/v3 All Failed
- v1: Used generators that produced template text and blob sprites
- v2: "Audited" v1 content with string-length checks, passed 129/129 goals, content still garbage
- v3: Wrote Python scripts (fix_template_lore.py) with hardcoded OPENINGS[] and FAMILY_TRAITS[] arrays that slot-filled templates via random.choice(). "Passed" 84/84 goals because the review agent only checked metrics (word count, distinct values, blocklist patterns), not whether content was actually authored vs. generated. The scripts were deleted.

## What v4 MUST Do Differently
- YOU (Claude) read story_beats.raw_text for each entity — the actual book prose
- YOU compose each description, SVG, and icon yourself — no scripts, no loops, no arrays
- Each description must contain a detail from raw_text that isn't available from metadata alone
- Review agent must detect template structures, not just count distinct strings
- No .py files may be created in tools/watchdog/

## What v4 Preserves (already good)
- Entity families (15, well-distributed), gameplay data, death SFX, attack visuals, scenes, atmospheres, music
