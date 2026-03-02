# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

## REC_2: Game Loop 2.0 (The Towers of Elysium)
**Note:** Initial implementation focuses on "The Rule of 4": 4 classes, 4 enemies, 4 skills, 4 scenes per chapter. All data must be server-authoritative and DB-driven.

- [x] **2.0 — Loop A: Overworld / Hub (Skeleton & Framework)** *(Ref: `docs/recs/2.0_GAME_LOOP.md`)*
    - [x] **Core Game Skeleton & Framework**
        - [x] Implement `MainGameLayout` (Top Bar, Left Sidebar, Main Content, Bottom Banner).
        - [x] Setup `GameNavigationController` (Map, Skills, Home, Shop, Chat).
        - [x] Implement `BottomAnimatedBanner` (Basic skeleton and side-scrolling pixel art framework/animation).
        - [x] Build the `OverworldMap` structure (Vertical chapter list with horizontal scene nodes).
    - [x] **State & Testing**
        - [x] Define global `GameContext` (Session stats, active training, current scene).
        - [x] Create 2.0 Interface and UX validation tests (Vitest/Playwright).

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
    - [x] **State Logic & UI Polish**
        - [x] Implement real node state logic (locked, available, completed) based on the database `PlayerProgress`.
        - [x] Implement real progress percentage aggregation for the Book/Chapter progress bars.       
        - [x] Polish `ChapterInfoPanel` with real lore summaries, best score tracking, and actual audio durations.
        - [x] Develop detailed UI for `OverworldMap` (Pulsing nodes, chapter list, mobile responsiveness/collapsing sidebar).
    - [x] **Home Base Hub**
        - [x] Implement the Home Base view.
        - [x] Add Personal Journal (uncovered story beats from completed chapters).
        - [x] Add Collections (rare items/artifacts display).
        - [x] Add Leaderboard Standings view.
    - [ ] **Atmospheric Battle Banner (PixiJS)** *(Ref: `docs/recs/2.1.1_ATMOSPHERIC_BATTLE_BANNER.md`)*
        - [x] Implement infinite parallax background framework with variable scroll rates (§3.1).
        - [x] Build player character controller with dynamic `x` movement and "forward momentum" (§2.2).
        - [x] Implement sinusoidal skewing for walk/attack/idle animations (§3.2).
        - [x] Build wave state machine (`COMBAT`, `IDLE`) and "silly" idle behaviors (§2.3, §3.2).
        - [x] Implement browser-side combat logic with enemy scaling and 2-min "Focus" buff (§3.2).
        - [x] Implement death resetting and "Vengeance" buff sequence (§2.3).
        - [x] Connect enemy spawning to real `PlayerProgress` pools and "clear-to-spawn" logic (§2.4).
        - [x] Implement cross-fade transitions for chapter/context changes (§2.1).
        - [x] Setup paper-doll layering and procedural hue/size variants (§5.1).
     - [ ] **Fix the Bugs** 
        - [ ] Enemies not appearing.
        - [ ] Add in tests.
        - [ ] Implement the paperdoll layering that was missed.
        - [ ] Update requirements
        - [ ] Split out main and app.py - they're getting way to large (break into modules to make more managable). Update agents and gemini and add a coding standards guide (refer to use).
        - [ ] Make tests and get this working

- [ ] **2.2 — Loop B: Story Mode / Clicker Combat (Active Play)** *(Ref: `docs/recs/2.2_STORY_MODE.md`)*
    - [ ] Formulate detailed development/design plan for 2.2.
    - [ ] Implement narrative image-overlay system for copy protection.
    - [ ] Integrate Eleven Reader basic playback gate (1x speed requirement).
    - [ ] Build the Clicker Combat engine (Enemy HP, click damage, floating numbers).

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
    - [ ] Apply "Magic Research 2" aesthetic polish across all loops.

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

