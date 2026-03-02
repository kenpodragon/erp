# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

## REC_2: Game Loop 2.0 (The Towers of Elysium)
**Note:** Initial implementation focuses on "The Rule of 4": 4 classes, 4 enemies, 4 skills, 4 scenes per chapter. All data must be server-authoritative and DB-driven.

- [ ] **2.2 — Loop B: Story Mode / Clicker Combat (Active Play)** *(Ref: `docs/recs/2.2_STORY_MODE.md`)*
    - [ ] **2.2.0 — Investigations & Infrastructure**
        - [ ] **Technical Investigation (Eleven Reader & Suno):** 
            - [ ] Research Eleven Reader API/embedding capabilities; verify if external apps can trigger playback via user accounts.
            - [ ] Investigate Suno API or manual generation workflow for chapter-themed background music.
            - [ ] Define "Fallback Mode" architecture: (Text + Suno Music) if Eleven Reader is unavailable or user lacks an account.        
    - [ ] **2.2.1 — UI/UX & Interaction Layer** *(Ref: `docs/recs/2.2.1_STORY_MODE_UI.md`)*
        - [ ] **Base Layout:** Build the 4-zone master layout (Narrative, Combat, Stats, Upgrades).
        - [ ] **Combat VFX:** Implement HP bar color-shift/shake, Hit Flash, and Sprite-only shake.
        - [ ] **Odometer & Gold:** Build the Digit-Flip gold counter with "Pop & Fly" coin VFX.
        - [ ] **Large Numbers:** Implement Standard/Alphabetical suffix formatting (K-No, aa-zz).
        - [ ] **Narrative Sync:** Build the scroll-up/fade narrative block area.
        - [ ] **Parallax Stage:** Implement the dynamic-scaling PixiJS stage with layered backgrounds.
    - [ ] **2.2.2 — Combat Engine & Wave Logic** *(Ref: `docs/recs/2.2_STORY_MODE.md#1-combat-engine-clicker-heroes-style`)*
        - [ ] **Damage:** Implement active clicking vs. Auto-DPS stacking logic.
        - [ ] **Waves:** Build the 10-monster zone structure (9 minions, 1 boss).
        - [ ] **Scaling:** Implement the exponential HP formula ($10 \times (1.55^{Zone-1} + Zone - 1)$).
        - [ ] **Modes:** Build the Progression Mode vs. Farm Mode toggles.
        - [ ] **Bosses:** Implement the 30s enrage timer and Chapter Boss Interrupt Zones.
    - [ ] **2.2.3 — Narrative & Audiobook Integration** *(Ref: `docs/recs/2.2_STORY_MODE.md#2-narrative-experience--eleven-reader`)*
        - [ ] **Eleven Reader:** Integrate the footer player with Play/Pause/Rewind/Speed.
        - [ ] **Bi-directional Pause:** Sync audio pause with combat pause.
        - [ ] **Dual-Condition Gate:** Enforce 100% audio + wave completion for advancement.
        - [ ] **Infinite Waves:** Implement "Additional enemies discovered!" logic for long audio.
    - [ ] **2.2.4 — In-Session Progression & Scaling** *(Ref: `docs/recs/2.2_STORY_MODE.md#4-in-session-progression--scaling`)*
        - [ ] **Upgrade Menu:** Build the Toggle-based (x1, x10, xMax) purchase logic.
        - [ ] **Skill Scaling:** Implement session-gold buy-in/leveling for unlocked skills.
        - [ ] **Dark Ritual:** Implement the chapter-persistent multiplier and header buff bar.
        - [ ] **Exponential Math:** Integrate `break_infinity.js` for all frontend calculations.
    - [ ] **2.2.5 — Victory & Meta-Rewards** *(Ref: `docs/recs/2.2_STORY_MODE.md#5-victory--meta-rewards`)*
        - [ ] **Essence Conversion:** Calculate rewards based on wave/boss performance.
        - [ ] **Post-Battle:** Build the "Continue vs. Return to Hub" summary flow.
    - [ ] **Asset Pipeline Setup:** Configure workflows for the tools defined in [C_STORY_ASSET_GENERATORS.md](recs/C_STORY_ASSET_GENERATORS.md). 

- [ ] **2.3 — Loop C: Idle Training (Passive Play)** *(Ref: `docs/recs/2.3_IDLE_TRAINING.md`)*
    - [ ] **Skill Implementation**
        - [ ] Implement "One-at-a-time" skill training logic and XP accumulation.
        - [ ] Build the Offline Progression handler (Login delta calculation).
    - [ ] **Visuals**
        - [ ] Implement Melvor Idle-style progress bars and skill category list.

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

*Updated: 2026-03-02*
