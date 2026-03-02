# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

## REC_2: Game Loop 2.0 (The Towers of Elysium)
**Note:** Initial implementation focuses on "The Rule of 4": 4 classes, 4 enemies, 4 skills, 4 scenes per chapter. All data must be server-authoritative and DB-driven.2

   - [ ] **2.1 — Loop A: Overworld / Hub (Detailed Implementation)** *(Ref: `docs/recs/2.1_OVERWORLD_HUB.md`)*
        - [x] **Backend: DB-Driven Map Content**
            - [x] Create `db/010_game_entities.sql` (Chapters, Scenes, Story Beats, Enemies, Skills).
            - [x] Add `Chapter`, `Scene`, and `StoryBeat` models to `backend/models.py`.
            - [x] Implement `GET /api/game/map` (Return all chapters and scenes with titles/meta).
            - [x] Implement `GET /api/game/scenes/{id}` (Detailed story beat + narrative data).
        - [x] **Frontend: Hook Up Real Data**
            - [x] Update `OverworldMap.tsx` to fetch real data from the backend.
            - [x] Implement `ChapterInfoPanel` modal (Scene details, "Enter Story" action).
            - [x] Build transition framework to `StoryMode.tsx` (Loop B).
        - [ ] **State Logic & UI Polish**
            - [x] **Requirement 2.1: Node States**
                - [x] Implement real node state logic (locked, available, completed) based on the database `PlayerProgress`.
                - [x] Add `in_progress` (pulsing) and `mastered` (gold border) node states.
            - [x] **Requirement 3: Lore Summary (Chapter Info Panel)**
                - [x] Polish `ChapterInfoPanel` with best score tracking, and actual audio durations.
                - [x] Add narrative lore hooks/summaries to `ChapterInfoPanel`.
            - [x] Implement real progress percentage aggregation for the Book/Chapter progress bars.       
            - [x] Develop detailed UI for `OverworldMap` (Pulsing nodes, chapter list, mobile responsiveness/collapsing sidebar).
        - [x] **Atmospheric Battle Banner (PixiJS)** *(Ref: `docs/recs/2.1.1_ATMOSPHERIC_BATTLE_BANNER.md`)*
            - [x] Implement infinite parallax background framework with variable scroll rates (§3.1).
            - [x] Build player character controller with dynamic `x` movement and "forward momentum" (§2.2).
            - [x] Implement sinusoidal skewing for walk/attack/idle animations (§3.2).
            - [x] Build wave state machine (`COMBAT`, `IDLE`) and "silly" idle behaviors (§2.3, §3.2).
            - [x] Implement browser-side combat logic with enemy scaling and 2-min "Focus" buff (§3.2).
            - [x] Implement death resetting and "Vengeance" buff sequence (§2.3).
            - [x] Connect enemy spawning to real `PlayerProgress` pools and "clear-to-spawn" logic (§2.4).
            - [x] Implement cross-fade transitions for chapter/context changes (§2.1).
            - [x] Added Vitest unit tests for PixiJS components and layout logic (§6).
            - [x] Setup paper-doll layering and procedural hue/size variants (§5.1).
        - [x] **Fix the Bugs** 
            - [x] Enemies not appearing.
            - [x] Bottom bar is stil looking weird with it's positioning. There is the outside scroll. And then the issue when the mobile interface moves the side navigation to the bottom (it's being pushed below the bottom of the visible window display). This should look more like an app, and not have the external scroll bars. (Still needs the internal scroll bars on the map because the map is huge).
            - [x] Add in tests.        
            - [x] Update requirements
            - [x] Split out main and app.py - they're getting way to large (break into modules to make more managable). Update agents and gemini and add a coding standards guide (refer to use).
            - [x] Make tests and get this working
            - [x] Implement the paperdoll layering that was missed.

- [ ] **2.2 — Loop B: Story Mode / Clicker Combat (Active Play)** *(Ref: `docs/recs/2.2_STORY_MODE.md`)*
    - [ ] Formulate detailed development/design plan for 2.2.
    - [ ] **Combat Engine (Clicker Heroes Style)**
        - [ ] Implement active clicking damage and Auto-DPS from skills.
        - [ ] Build Wave (1-9) and Boss (10) structure with HP scaling.
        - [ ] Add floating damage numbers and particle effects for crits.
        - [ ] Implement "Failure" state (Reset to wave 9 on boss loss).
    - [ ] **Narrative & Audiobook Integration**
        - [ ] Integrate Eleven Reader for real-time scene audio streaming.
        - [ ] Implement strict 1x playback gate for narrative progression.
        - [ ] Build synced text overlay (paragraph-by-paragraph).
        - [ ] Implement narrative image-overlay system for copy protection.
    - [ ] **In-Session Progression**
        - [ ] Build session gold system (earning from kills, resetting on exit).
        - [ ] Implement Hero Upgrades (Click Damage, Auto-DPS scaling).
    - [ ] **Victory & Meta-Rewards**
        - [ ] Convert session gold/performance into permanent Elysium Essence.
        - [ ] Implement first-time clear bonuses and chapter XP tracking.

- [ ] **2.3 — Loop C: Idle Training (Passive Progression)** *(Ref: `docs/recs/2.3_IDLE_TRAINING.md`)*
    - [ ] Formulate detailed development/design plan for 2.3.
    - [ ] Implement "One-at-a-time" skill training logic and XP accumulation.
    - [ ] Build the Offline Progression handler (Login delta calculation).

- [ ] **2.4 — Character & Progression Systems, Classes, and Skills** *(Ref: `docs/recs/2.4_CHARACTER_PROGRESSION.md`)*
    - [ ] Design and implement core stats (Str/Agi/Int) logic.
    - [ ] Implement inventory system framework (Weapon/Armor slots).
    - [ ] Setup Class-specific abilities and skill trees.

- [ ] **2.5 — Audio & Music Integration** *(Ref: `docs/recs/2.5_AUDIO_MUSIC.md`)*
    - [ ] Implement SUNO music rotation logic based on active chapter.
    - [ ] Add spatial/contextual SFX (Click, Death, Level Up).
    - [ ] Finalize Eleven Reader narration streaming and sync.

- [ ] **2.6 — Economy & Anti-Cheat** *(Ref: `docs/recs/2.6_ECONOMY_ANTICHEAT.md`)*
    - [ ] Implement currency conversion (Session Gold -> Essence/Resources).
    - [ ] Implement server-side click rate limiting and damage verification.
    - [ ] Build session integrity checks for Story Mode exit.
    - [ ] **Social & Trade Hub**
        - [ ] Implement global and chapter-specific chat channels with server-side filtering.
        - [ ] Build the Overworld Shop for equipment and permanent resource trading.
    - [ ] Apply "Magic Research 2" aesthetic polish across all loops.

- [ ] **2.7 — Home Base Hub (Meta-Progression)** *(Ref: `docs/recs/2.7_HOME_BASE_HUB.md`)*
    - [x] **Home Base Hub Framework**
        - [x] Implement the Home Base view.
        - [x] Add Personal Journal (uncovered story beats from completed chapters).
        - [x] Add Collections (rare items/artifacts display).
        - [x] Add Leaderboard Standings view.
    - [ ] **Advanced Terminals**
        - [ ] Implement keyword search and narrative completion % for the Akashic Log.
        - [ ] Build Lore Inspection modal with 3D-effect sprites for the Relic Gallery.
        - [ ] Integrate passive artifact synergies into combat/training logic.
        - [ ] Implement tiered reward badges and Vessel Profile snapshots for Leaderboards.
        - [ ] Build the Achievement Matrix (100+ challenges) with Shard/Title rewards.


---
*Updated: 2026-03-01*



## OTHER MAJOR TASKS  
- [ ] **Security and anti-cheat**
  - [ ] Some level of keyed encryption between server and front end to prevent people on the front from just sending random bonuses to the back end.
  - [ ] Actions and progress must be held server side, all activities have to be passed to the back (clicks, sent tot he back, validated, and then recorded on the back end server).
  - [ ] Purchases, upgrades, etc... are all validated by the back end server (purchase clicked on front end - sent to back). Server detects if the user has enough for the purchase and then debits it, stats updates back to the front end.    
- [ ] **Audio Integration**
  - [ ] Research Eleven Reader API for streaming background audio. (Would like them to advance, need to have access to that part of the book before they can proceed - e.g. on free eleven readers account, so they'd have to buy the book - get stuck in early tutorial lands or something).
  - [ ] Research Eleven SUNO API for streaming background audio.
  - [ ] Generate new sound effect. Generate new background music. Generate Eleven Reader snipping (for the part of the chatper/book).
- [ ] **Class and Skill Design**
  - [ ] Design the classes and systems based off of components from the book. Expand the existing choices to match aesthetic of the book.
- [ ] **Graphics Design**
  - [ ] Generation of actual characters, icons, and other pieces (based on descriptions of the book)
---

