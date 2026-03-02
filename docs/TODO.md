# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

## REC_2: Game Loop 2.0 (The Towers of Elysium)
**Note:** Initial implementation focuses on "The Rule of 4": 4 classes, 4 enemies, 4 skills, 4 scenes per chapter. All data must be server-authoritative and DB-driven.

- [ ] **2.2 — Loop B: Story Mode / Clicker Combat (Active Play)** *(Ref: `docs/recs/2.2_STORY_MODE.md`)*    
    - [ ] **2.2.8 — BUGS AND FIXES** *(from `2.2_STORY_MODE.md` + `2.2.1_STORY_MODE_UI.md`)*    
        - [ ] Some enemies are "undefined" the names are in the entity table they should still appear (just their stats and image should be the placeholder)
        - [ ] Sometimes on the gold flyout, the coins get stuck before dissappearing. Jsut have it appear then be done. THe flyout is not good. Instead have a +XXX next to the gold tracker so you can see how much gold you;ve earned.
        - [ ] Gold earned should be level scaled (higher the waves higher the gold)
        - [ ] 10 mobs per wave. Make sure there is always a mobs left per wave. At the end of the wave you fight a mini-boss. (not sure where ZONE came from)
        - [ ] Mobs need to be scaling by level (I'm at some wave 30 and the mobs still only have 10 hp)
        - [ ] In farm mode I shoudl still be able to read the story again.
        - [ ] The settings gear does nothing - it should pop up the settings (UI Scale, sound, etc...)
        - [ ] Responsive layout. Right now the upgrade bits are at the side of the screen. But if I shrink the screen to small, they should show up at the bottom.
        - [ ] Resetting level (debug) is not resetting upgrade levels back to 0 (in story game upgrades). It's also not resetting my gold.
        - [ ] When the level starts I should see the first block of text right away.
        - [ ] Game settings isn't doing anything (opens, lets me change values, but doesn't save apply)
        - [ ] There should be a scroll bar on the nav text on the side. Scroll all the way down so the most recent block is right at the top (all the others are above up, but I need to scroll up to get back to). Should be some fade transition and scroll when the new block appears (appears at the bottom, then floats back up as it scrolls things so it's at the top of the scroll area).
        - [ ] If the frontend server gets restarted the whole page refreshes. It should rember my state and page I was on (store this in session or something it remembvers my login, so it should remember where I was). So when it does reload, it brings me back to exactly where I was (right now on refresh I always go back to profile).
        - [ ] Auto progress button does nothing (doesn't toggle on or off). When it toggles on, i just keep fighting more mobs. Auto Progress means I fight the miniboss at the end and move to the next wave.
        - [ ] Minibosses and Boss battles need to have a countdown timer (30s scroll bar across the top in addition to their HP). The 30 timer (should be somethiung stored in game_config). If the boss isn't dead by the end of that timer, you go back and need to farm, the previous wave. Once you're ready again, you click challenge boss. If the auto-progress is turned off (then you have to manually click this button). If it's turned on, it tries to automatically challenge the boss. If you fail at the boss, then it turns auto progress off (so you can level a bit first). 
        - [ ] Let's move the WPM slider onto the display interface (under the text). So folks can adjust accordingly.
        - [ ] Tests back on these things.
        - [ ] Need some thing over the text so folks can't just copy and paste it.        

- [ ] **2.3 — Loop C: Idle Training (Passive Play)** *(Ref: `docs/recs/2.3_IDLE_TRAINING.md`)*
    - [ ] **Skill Implementation**
        - [ ] Implement "One-at-a-time" skill training logic and XP accumulation.
        - [ ] Build the Offline Progression handler (Login delta calculation).
    - [ ] **Visuals**
        - [ ] Implement Melvor Idle-style progress bars and skill category list.
        - [ ] Clicker game to help accumulate XP for the skill (reuse Loop B stuff).

- [ ] **2.4 — Character & Progression Systems, Classes, and Skills** *(Ref: `docs/recs/2.4_CHARACTER_PROGRESSION.md`)*
    - [ ] Design and implement core stats (Str/Agi/Int) logic.
    - [ ] Implement inventory system framework (Weapon/Armor slots).
    - [ ] Setup Class-specific abilities and skill trees.

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

---

*Updated: 2026-03-02*
