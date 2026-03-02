# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

## REC_2: Game Loop 2.0 (The Towers of Elysium)
**Note:** Initial implementation focuses on "The Rule of 4": 4 classes, 4 enemies, 4 skills, 4 scenes per chapter. All data must be server-authoritative and DB-driven.2   
- [ ] **2.2 — Loop B: Story Mode / Clicker Combat (Active Play)** *(Ref: `docs/recs/2.2_STORY_MODE.md`)*
    - [ ] Formulate detailed development/design plan for 2.2.
    - [ ] **Combat Engine (Clicker Heroes Style)**
        - [ ] Implement active clicking damage and Auto-DPS from skills.
        - [ ] Build Wave (1-9) and Boss (10) structure with HP scaling.
        - [ ] Add floating damage numbers and particle effects for crits.
        - [ ] Implement **Chapter Boss Interrupt Zones** (Option C).
        - [ ] Implement "Failure" state (Reset to wave 9 on boss loss).
    - [ ] **Narrative & Audiobook Integration**
        - [ ] Integrate Eleven Reader for real-time scene audio streaming (Pause sync enabled).
        - [ ] Implement **Dual-Condition Gate:** 1x playback + required wave completion.
        - [ ] Build synced text overlay (paragraph-by-paragraph) using **Pre-rendered PNGs**.
        - [ ] Implement **Extended Waves** logic if combat finishes before audio.
    - [ ] **In-Session Progression**
        - [ ] Build session gold system (earning from kills, persisting across chapter).
        - [ ] Implement **Skill Scaling:** Idle base level + session gold buy-in/leveling.
        - [ ] Implement **Dark Ritual** chapter-wide persistence.
    - [ ] **Victory & Meta-Rewards**
        - [ ] Convert session gold/performance into permanent Elysium Essence.
        - [ ] Implement "Continue vs. Return to Hub" post-completion flow.
...
- [ ] **Graphics Design**
  - [ ] Generation of actual characters, icons, and other pieces (based on descriptions of the book)
  - [ ] **PNG Text Asset Generator:** Build tool to convert book scene text into copy-protected PNG image overlays for Story Mode.
---

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
  - [ ] **Audio/Text Sync Editor:** Build interface to map chapter audio timestamps to PNG text assets.
- [ ] **Class and Skill Design**
  - [ ] Design the classes and systems based off of components from the book. Expand the existing choices to match aesthetic of the book.
- [ ] **Graphics Design**
  - [ ] Generation of actual characters, icons, and other pieces (based on descriptions of the book)
  - [ ] Creation of PNG generator for text overlays for the book (text security).
---

