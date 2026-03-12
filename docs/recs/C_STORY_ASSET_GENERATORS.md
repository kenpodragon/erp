# REC C: Story Mode Asset Generators & Pipeline

This document defines the requirements for the specialized tools and automated pipelines used to generate and map assets for the Story Mode (Loop B). (Ref: `docs/recs/2.2_STORY_MODE.md`)
Update generation and insertion/update instructions to (Ref: `docs/inst/GAME_ASSETS_GUIDE.md`)

---

## 1. PNG Text Generator (Narrative Security)
To prevent easy copy-pasting and scraping of the book's content, story text must be rendered as copy-protected PNG images.

- [ ] **1.1 Text-to-Image Engine:** Build a tool (Python/Pillow) that takes raw book text and converts it into themed PNG blocks.
- [ ] **1.2 Theming:** Support for different font styles and background transparencies matching the chapter's mood.
- [ ] **1.3 Batch Processing:** Ability to process entire chapters/scenes in a single command.
- [ ] **1.4 Optimization:** Automated cropping and compression (TinyPNG/WebP) to minimize frontend load times.
- [x] **1.5 PNG Hook-Point (Frontend):** `NarrativeBlock.tsx` detects `image_path` in `StoryBeat`. If present, it renders an `<img>` with copy-protection (contextmenu/drag disabled) instead of raw text.

## 2. Background Parallax Pipeline
- [ ] **2.1 Specifications:** Each chapter requires 2-3 layers:
    - `far`: Static/Slow-scroll clouds/sky (1024x512, seamless loop).
    - `mid`: Parallax structures/landscape (1024x512, seamless loop, transparent sky).
    - `near` (Optional): Floor texture / high-speed foreground.
- [ ] **2.2 Asset Naming:** `/assets/game/backgrounds/bg_{chapter_id}_{layer}.png`.
- [x] **2.3 Current State:** Chapter 1-4 placeholders implemented using generic dark-fantasy gradients.

---

## 2. Audio Metadata & Investigation Utility
Extracts critical timing and duration data from Eleven Reader assets to populate the database and investigate system capabilities.

- [ ] **2.1 Technical Investigation:** Research Eleven Reader API embedding vs. User Account requirements (Verify if players need to buy the book to advance).
- [ ] **2.2 Duration Extraction:** Utility to read audio files (MP3/WAV) and extract precise duration in milliseconds.
- [ ] **2.3 Scene Synchronization:** Automatically update the `scenes.audio_duration_seconds` field in the DB.
- [ ] **2.4 Batch Validation:** Ensure all scenes in a chapter have matching audio assets before deployment.

---

## 3. Sync Mapping Editor (Internal Tool)
A lightweight internal interface for mapping audio timestamps to specific PNG text blocks.

- [ ] **3.1 Visual Timeline:** A simple timeline showing the audio waveform vs. text block triggers.
- [ ] **3.2 Interactive Mapping:** Click-to-set timestamps for when a specific PNG block should "scroll up" during playback.
- [ ] **3.3 DB Export:** Directly save mapping data to the `scene_audio_sync` table.

---

## 4. Graphics Design & Automated Assets
Automated generation of thematic visual assets based on narrative content.

- [ ] **4.1 Character & Icon Generation:** Tooling to automatically generate character sprites, icons, and environmental pieces based on the descriptions extracted from the books.
- [ ] **4.2 Thematic Consistency:** Ensure all AI-generated assets match the dark, high-contrast aesthetic of the project.

---

## 5. Suno Music Generation Pipeline
Automated or semi-automated workflow for generating atmospheric background tracks.

- [ ] **5.1 Prompt Engineering:** Define standardized prompts based on book chapter descriptions (e.g., "Dark, atmospheric orchestral, 120bpm, mystery").
- [ ] **5.2 Pool Generation:** Generate at least 4 unique tracks per chapter to avoid repetition.
- [ ] **5.3 Looping Utility:** Automated tool to ensure generated tracks have seamless loop points for infinite gameplay.

---

## 6. Lore-to-Content AI Generator
A comprehensive pipeline that translates narrative text and extracted entities into functional game data and visual assets.

- [ ] **6.1 Lore Ingestion:** Interface to read through compressed lore guides (`docs/lore/`) and the raw `BOOKS.md` to identify unique items, skills, and artifacts mentioned in the story.
- [ ] **6.2 Database Cross-Reference:** Pull existing entities from the database to identify "hollow" records (names without stats or descriptions).
- [ ] **6.3 Content Generation (AI-Driven):**
    - [ ] **Descriptions:** Generate lore-accurate, immersive descriptions for every item and artifact.
    - [ ] **Stats & Benefits:** Procedurally generate numerical stats (Power, Defense, Speed) and benefit effects (Buffs/Debuffs) aligned with the project's exponential scaling system.
    - [ ] **Technical Mapping:** Categorize skills and items into the correct table structures (Weapons, Armor, Trinkets, Classes).
- [ ] **6.4 Visual Asset Generation:**
    - [ ] **Iconography:** Generate 2D icons for all items, skills, and artifacts using AI (Stable Diffusion/DALL-E) based on narrative descriptions.
    - [ ] **Entity Sprites:** Generate high-fidelity sprites for newly discovered enemies or bosses mentioned in the lore.
- [ ] **6.5 Automated DB Population:** Batch-update the database with the generated metadata and asset paths for immediate use in-game.

---

## 7. Boss Transition Lore Text Generator
Generates the flavor recap text shown after defeating chapter/book boss nodes in the `NarrativeReveal` cinematic screen.

- [ ] **7.1 Source Input:** For each chapter and book, summarize the key `story_beats` from the DB (entity appearances, emotions, key events) into a source briefing.
- [ ] **7.2 GPT Generation:** Use GPT with the chapter/book `story_beats` summary as input to generate `transition_lore_text` — a congratulatory flavor recap displayed in the post-boss cinematic. Should be 3–6 sentences, immersive, narrative tone matching the book's voice.
- [ ] **7.3 DB Population:** `UPDATE chapters SET transition_lore_text = '...' WHERE chapter_number = N;` and `UPDATE books SET transition_lore_text = '...' WHERE book_number = N;`. Placeholder seeds exist for chapters 1-2 and book 1 (migration 021); all remaining chapters/books need real content.
- [ ] **7.4 Review:** Content must be reviewed for lore accuracy against `docs/lore/` guides before merging to production.

---

## 8. Elysium Emporium Cosmetic Asset Generators
Automated generation of pixel-art cosmetic assets for the Elysium Emporium shop (Ref: `docs/recs/3.3_ELYSIUM_EMPORIUM.md`).

- [ ] **8.1 Skin Generator:** Generate character skin pixel-art sprite sets for each launch skin (2 universal + 4 class-specific = 6 total). Each skin requires:
    - Portrait image (128×128 px)
    - Battle avatar sprite/color configuration (PixiJS-compatible JSON or spritesheet)
    - Battle bar portrait thumbnail (48×48 px)
    - Must respect class visual identity from `character_classes.visual_config` (color palette, silhouette, particle style).
    - Universal skins use a neutral palette not tied to any class.
    - Output: `/assets/game/cosmetics/skins/{skin_key}/` with `portrait.png`, `avatar_config.json`, `thumb.png`.
- [ ] **8.2 Badge & Flair Generator:** Generate cosmetic overlay assets for chat and leaderboards:
    - **Chat Flair:** 5 variants — each with a name border/glow texture and a small icon (16×16 px). Output as transparent PNGs.
    - **Leaderboard Badges:** 4 frame styles — each a transparent overlay (decorative border) sized to wrap the rank card. Output as transparent PNGs or SVGs.
    - Output: `/assets/game/cosmetics/flair/{flair_key}.png`, `/assets/game/cosmetics/badges/{badge_key}.png`.
- [ ] **8.3 Avatar Generator:** Generate lore-themed avatar profile pictures (8 at launch). Pixel-art style consistent with game aesthetic. 128×128 px. Each avatar should visually evoke its lore theme (e.g., "The Pallid Mask" = pale porcelain mask, "Void Gazer" = eye in a rift).
    - Output: `/assets/game/cosmetics/avatars/{avatar_key}.png`.
- [ ] **8.4 Thematic Consistency:** All generated cosmetic assets must match the dark, high-contrast pixel-art aesthetic established in §4.2. Color palettes should align with the game's existing visual language (void purples, celestial golds, infernal reds, akashic teals).
