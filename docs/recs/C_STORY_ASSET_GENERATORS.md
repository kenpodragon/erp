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
