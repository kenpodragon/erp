# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

## REC_2: Game Loop 2.0 (The Towers of Elysium)
**Note:** Initial implementation focuses on "The Rule of 4": 4 classes, 4 enemies, 4 skills, 4 scenes per chapter. All data must be server-authoritative and DB-driven.

- [x] **2.2 — Loop B: Story Mode / Clicker Combat (Active Play)** *(Ref: `docs/recs/2.2_STORY_MODE.md`)*
    - [x] **2.2.9 — NARRATIVE INTERSTITIALS** (1.2 Option C)
        - [x] Implement Chapter Boss interstitial battle (after last scene of a chapter). Special one time playable (star location, shows up on OverworldMap only after you've cleared all the other scenes in the chapter. Must be cleared before progressing. This is the one where you start with 0 (just your baseline skills no gold/essence)) so need to click and ensure you're clicking the boss appropriately - target areas). You have a countdown timer for pressure (but successful clicks partially refill the time gage). These should be extremely hard and based on average (other skills leveling progression to beat - so something at the end of chapter 20, where youve had time to level up your other skills which will give you more baseline DPS and autoclick needs to be taken into account - we'll need to have some configuration in the DB for each of these so we can trial these out and adjust as we go along.).
        - [x] Implement Book Boss interstitial battle (after last chapter of a book). (Same as the chapter boss fights, but MUCH harder, shows up inbetween the books as a star icon.)
        - [x] Add unique narrative reveal for transition between chapters and Lebooks. Once you beat the final chapter boss/book boss - you get a cool scrolling lore text which is flavor text from that previous chapter/book - and congratulating you for making it this far. Also any unlocks (new skills, etc... are described here).
        - [ ] Boss clicky thing isn't changing (should be clicky targets showing up, click them and you get the time refilled, all the while it's slowly wearing down the health based on your AUTO DPS values).
        - [x] When entering the boss battles from the overworld map - type is boss battle. Estimated duration (should be the duration of the default time on the boss - 30s). And the Lore tidbit that shows up there should be related to the chapter. Potential Rewards - that's chapter unlocks. Also, if you don't complete the boss battle, you can't advance to the next chapter.
        - [x] Issue on delete character. After I delete the caracter (characer gets deleted, popup dissappears ), but then recreate teh character, the delete window pops up again (can't hit cancel).    
    - [ ] **2.2.10 — Additional Tweaks**
        - [ ] After the StoryMode regular battles the gold you earn should be converted into non-premium currency (ether or whatever it's called) - so can use that to spend on the Idle Training pieces. (It's not a 1 to 1 conversion we need to set up a DB configurable conversion number initially something like 1,000 to one, but as levels start getting higher and harder, that rate should also shift - so you only earn etherium at a normalized rate - e.g. rushing hard levels won't increase the rate you earn (TOO MUCH, it will, but not overly powerful - want some gameplay required in order to earn it and pay for the idle training unlocks)).
        - [ ] Responsive layout. The bottom window is overlayed too much over the clickable area. Can we make that into an up arrow scroll up? So it hides (collapses down to a single line showing essence earned), skill hotkeys. Click the up arrow and it folds up back so you canaccess the bits. Otherwise the lower half ot the screen is the clicker.
        - [ ] Need a visible scroll bar/scroll indicator for the narration so you can scroll up and down (and see how far you are).
        - [ ] As the text appears, the scroll will scroll down so that the top of the newest text is at the top of the scroll window (automatic scrolling).
        - [ ] Move the font size slider out next to the WPM slider. 
        - [ ] Combat text and UI scaling settings (test and validate - need to make sure they make sense and ramp appropriately) - maybe for debugging let me set numerical values and I'll find which is large enough for the upper limit and low enough for the lower limit, then use those as the ranges for the scroll mechanic (with the middle being the normal setting/default).


- [ ] **2.3 — Loop C: Idle Training (Passive Play)** *(Ref: `docs/recs/2.3_IDLE_TRAINING.md`, `docs/recs/2.3.1_IDLE_TRAINING_UX.md`, `docs/recs/2.3.1.0_IDLE_TRAINING_SCHEMA.md`)*
    - [ ] **DB Migrations**
        - [ ] Apply migration 021: `skill_actions` table + `character_skill_levels` additions + `skills` unlock columns + `game_configs` seeds.
        - [ ] Apply migration 022: Seed all 34 skill sub-actions (8 Attack, 9 Magic, 9 Lore, 8 Precision) with lore descriptions.
        - [ ] Identify and set `unlock_scene_id` FK values for Magic, Lore, and Precision skills (query scenes table for gate beats).
        - [ ] Update `db/data_dictionary.md` for all 2.3 schema changes.
    - [ ] **Backend**
        - [ ] Implement all 8 Idle Training API endpoints (`/api/game/training/*`).
        - [ ] Implement offline delta calculation with 24hr cap, Essence drain, and class affinity multiplier.
        - [ ] Implement Essence soft gate XP rate modifier (5-tier).
        - [ ] Implement Magic skill hotbar gate enforcement in Story Mode session API.
        - [ ] Implement skill unlock detection on scene completion event.
        - [ ] Write `backend/tests/test_idle_training.py` — all backend tests.
    - [ ] **Frontend (Skills Tab)**
        - [ ] Build terminal-aesthetic Skills screen layout (dark bg, phosphor green, monospace, ASCII bars).
        - [ ] Implement Panel 1: All Skills overview (compact status for all 4 skills).
        - [ ] Implement Panel 2: Skill Detail (level/XP bar, action status, Essence bar, controls).
        - [ ] Implement Panel 3: Action Selection Table (locked/available/active states with flavor tooltips).
        - [ ] Implement Training Report modal (terminal style, on every return from offline).
        - [ ] Implement level-up flash animation.
        - [ ] Implement skill unlock notification banner.
        - [ ] Implement Active Mode entry/exit flow (confirmation modal, exit button).
        - [ ] Wire Active Mode to Story Mode combat engine (skill-specific header, enemy pool, boss interval).
        - [ ] Show Magic-gated hotbar skills as locked in Story Mode UpgradeMenu.
        - [ ] Write Vitest component tests for all Skills tab components.
    - [ ] **E2E Tests**
        - [ ] Full training session flow (select skill → action → XP accrual → level-up).
        - [ ] Offline progression flow (set training → simulate time → Training Report).
        - [ ] Active Mode flow (enter → waves → exit → idle resumes).
        - [ ] Skill unlock gate (complete gate scene → skill becomes available).

- [ ] **2.4 — Character & Progression Systems, Classes, and Skills** *(Ref: `docs/recs/2.4_CHARACTER_PROGRESSION.md`)*
    - [ ] Design and implement core stats (Str/Agi/Int) logic.
    - [ ] Implement inventory system framework (Weapon/Armor slots).
    - [ ] Setup Class-specific abilities and skill trees.
    - [ ] Remove initial skills add everything behind the gating from the Idle training bits.

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

*Updated: 2026-03-02*
