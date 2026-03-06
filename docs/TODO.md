# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

## REC_2: Game Loop 2.0 (The Towers of Elysium)
**Note:** Initial implementation focuses on "The Rule of 4": 4 classes, 4 enemies, 4 skills, 4 scenes per chapter. All data must be server-authoritative and DB-driven.
    - [x] **2.4 fixes CONTENT CRUD**
        - [ ] Create some more lore appropriate beneficial effects (and populate all with default magnitudes). 30 all positive effects. 15 are neutral or mixed. 15 are negative.
        - [ ] For the item components (prefixes, qualities, lore tags, suffixes) - create so there are 30 positives, 15 mixed or neutral and 15 negative ones. Ensure that they have lore appropriate stats and/or benefical effects (can be more than one) along with appropriate weights (consider all as level 1 values).
        - [ ] Create an attack type table in the db - melee, magic, ranged (think of 10 more like flying, etc...) these should be either generic, or lore appropriate (akashic). Add an editor to the Content tab to allow editing of these (addiing new ones)
        - [ ] Create an equip slot location db table (populate with current equip slot locations). Update code so it dynamically calls this - so if there are 5 equip slot locations, then 5 slots would appear in the item inventory equiment slot. Create an editor slot for this in Content (name, and add more/remove). Create a common set of inventory slots from MMORPGs (helmet, neck, shoulders, chest, 2 fingers, 2 bracelets, 2 hands, legs, feet (any others I'm missing))
        - [ ] In the item components, type bases, it should also include an item slot (where this can be equipped) (editable). Ensure there are at least 5 item types (lore appropriate) for each item slot. Add baseline stats and beneficial effects. For weapon types (also consider 2h so it needs to go in both hands). For weapon types, ensure there are at least 3 for each attack type (melee, ranged, magic). Remember that attack types can be multiple (one or more). Create several options of baseline weapons with multiple attack types (lore appropriate).
        - [ ] Review the entities in the DB and assign (one attack type - lore appropriate to each entity. 2 or more to each miniboss and multiple to each big boss).

- [ ] **2.5 — Audio & Music Integration** *(Ref: `docs/recs/2.5_AUDIO_MUSIC.md`)*
    - [ ] **Infrastructure:**
        - [ ] **Duration Utility:** Build a backend script to extract/update scene narrative durations (based on word counts or audio).
        - [ ] **Asset Management:** Implement the `dev_content_audit` logger for missing audio/music, stat blocks, images, etc...
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
