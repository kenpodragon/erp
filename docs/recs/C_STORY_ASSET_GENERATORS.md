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
