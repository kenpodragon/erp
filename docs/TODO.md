# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

## REC_2: Game Loop 2.0 (The Towers of Elysium)
**Note:** Initial implementation focuses on "The Rule of 4": 4 classes, 4 enemies, 4 skills, 4 scenes per chapter. All data must be server-authoritative and DB-driven.
 - [x] **2.3 — Loop C: Idle Training (Passive Play)** *(Ref: `docs/recs/2.3_IDLE_TRAINING.md`, `docs/recs/2.3.1_IDLE_TRAINING_UX.md`, `docs/recs/2.3.1.0_IDLE_TRAINING_SCHEMA.md`)*     
    - [x] Debug and Testing
    - [x] Requirements review and checkoff
    - [x] Extra skills are appearing there beyond ATTACK (the 4 defined one). Fixed: Active/Combat skills are now filtered out from the Idle Training UI.
    - [ ] Outstanding: Implement global "NEW SKILL UNLOCKED" banner notification in the frontend when story scenes are completed.
    - [ ] Essence Stability (I have 6k essence and it says my stability is 0.1%) This should be updated with the real value (based on my available essence), and on hover or something show how much longer that's going to last or something (6,000 out of 1,000 - 100%)

- [ ] **2.4 — Character & Progression Systems, Classes, and Skills** *(Ref: `docs/recs/2.4_CHARACTER_PROGRESSION.md`)*
    - [ ] Create and expand `2.4_CHARACTER_PROGRESSION.md`, discussion and expansion of the draft.
    - [ ] Create and expand `2.4_CHARACTER_PROGRESSION_DESIGN.md`, descussion and detailed formulas and details.
    - [ ] Create and expand the 2.4 Development Plan.
    - [ ] Add dev into TODO, update 2.4 in TODO and begin tracking.
    - [ ] Design and implement core stats (Str/Agi/Int) logic.
    - [ ] Implement inventory system framework (Weapon/Armor slots).
    - [ ] Setup Class-specific abilities and skill trees.
    - [ ] Review how the idle skills behave in the story mode (including the active skills). Ensure there are appropriate in story unlock methods (gold first, raises based on chapter/story and level of the skill in the backend).
    - [ ] Remove initial skills add everything behind the gating from the Idle training bits.
    - [ ] Create Admin interface to edit these things as well as game_config and server_config pieces.

- [ ] **2.5 — Audio & Music Integration** *(Ref: `docs/recs/2.5_AUDIO_MUSIC.md`)*
    - [ ] **Infrastructure:**
        - [ ] **Duration Utility:** Build a backend script to extract/update scene narrative durations (based on word counts or audio).
        - [ ] **Asset Management:** Implement the `dev_content_audit` logger for missing audio/music.
    - [ ] **Frontend Components:**
        - [ ] **Audio Player Embed:** Implement a standard audio player with Play, Pause, Restart, and Playback Speed (0.5x - 2.0x).
        - [ ] **Suno Music Manager:** Build the looping background audio manager with cross-fade support.
        - [ ] **WAV → MP3:** ffmpeg conversion of `/frontend/public/music/` tracks; update `AudioPlayer.tsx` src paths.
    - [ ] **Experience:**
        - [ ] **Spatial SFX:** Add tactile feedback for clicks, hits, and level-ups.
        - [ ] **Advanced Narrative (ElevenLabs):** Research and prototype word-level timestamp sync for future implementation.

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
        - [ ] **[Cross-ref 2.3]** Define and implement milestone rewards for Idle Training skill levels 25, 50, 75, and 99 on each skill (badges, titles, Essence grants — see `2.3_IDLE_TRAINING.md §12`).

- [ ] **Bugs**
    - [ ] Bottom battle bar updates, character starts too far to the left when dying. The monsters seem to move behind him. 
    - [ ] Weird bug hitting exit level after completing the boss in farming mode (getting the farm or hub popup).

---

*Updated: 2026-03-05*
