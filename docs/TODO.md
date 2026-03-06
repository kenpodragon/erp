# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

## REC_2: Game Loop 2.0 (The Towers of Elysium)
**Note:** Initial implementation focuses on "The Rule of 4": 4 classes, 4 enemies, 4 skills, 4 scenes per chapter. All data must be server-authoritative and DB-driven.   

- [ ] **2.5 — Audio & Music Integration** *(Ref: `docs/recs/2.5_AUDIO_MUSIC.md`)*
    - [ ] **Infrastructure & Tooling:**
        - [ ] **8-Bit Synthesis:** Expand `generate_placeholder_music.py` into a robust `MusicGenerator` with mood/intensity parameters.
        - [ ] **SFX Generator:** Build a procedural utility for 8-bit hits, deaths, and UI chirps.
        - [ ] **Compression:** Create the `WAV → MP3` batch utility and reference updater.
        - [ ] **Asset Management:** Implement `dev_content_audit` flags for generic assets/missing audio.
    - [ ] **Frontend Components:**
        - [ ] **Music Manager:** Build the cross-fade (2s) background music manager with state detection (Explore/Combat/Boss).
        - [ ] **Spatial Audio:** Implement Stereo Panning in PixiJS based on entity X-coordinates.
        - [ ] **Audio Settings:** Unified modal for Master/Music/SFX volume + "Everything Mute" TopBar toggle.
    - [ ] **Admin Panel:**
        - [ ] **Atmosphere Editor:** New tab to create atmospheres and assign music states.
        - [ ] **Asset Mapping:** Tools to assign SFX keys to Skills and Entities with built-in preview.

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
