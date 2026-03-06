# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

## REC_2: Game Loop 2.0 (The Towers of Elysium)
**Note:** Initial implementation focuses on "The Rule of 4": 4 classes, 4 enemies, 4 skills, 4 scenes per chapter. All data must be server-authoritative and DB-driven.   


- [ ] **2.7 — Home Base Hub (Meta-Progression)** *(Ref: `docs/recs/2.7_HOME_BASE_HUB.md`)*
    - [x] **Home Base Hub Framework**
        - [ ] Implement the Home Base view.
        - [ ] Add Personal Journal (uncovered story beats from completed chapters).
        - [ ] Add Collections (rare items/artifacts display).
        - [ ] Add Leaderboard Standings view.
    - [ ] **Advanced Terminals**
        - [ ] Implement keyword search and narrative completion % for the Akashic Log.
        - [ ] Build Lore Inspection modal with 3D-effect sprites for the Relic Gallery. (add artifacts in the same way that we added inventory items - random generated. Much lower baseline stats (exccept for a few really powerful ones). Unlike items in the inventory that go away, these apply permanent buffs - can sell and trade, infinite space. No duplicates (if you get one of a higher rarity it replaces the one you already have.) Rarity increases the number of random stats it can have on it, but there are no levels for artifacts - stay at baseline stats/benefits unless you get higher rarity (in which case the stats are a bit higher))
        - [ ] Integrate passive artifact synergies into combat/training logic.
        - [ ] Implement tiered reward badges and Vessel Profile snapshots for Leaderboards.
        - [ ] Build the Achievement Matrix (100+ challenges) with Shard/Title rewards.
        - [ ] **[Cross-ref 2.3]** Define and implement milestone rewards for Idle Training skill levels 25, 50, 75, and 99 on each skill (badges, titles, Essence grants — see `2.3_IDLE_TRAINING.md §12`).



- [ ] **3.0 — Marketplace & Premium (Monetization & Trading)** *(Ref: `docs/recs/0_REQUIREMENTS.md §3`)*
    - [ ] **Stripe Integration:** Premium "Elysium Shards" purchasing and subscription management.
    - [ ] **The Overworld Shop:** Central hub for trading Shards/Essence for equipment and meta-upgrades.
    - [ ] **Player-to-Player Trading:** Implement the marketplace for selling items for premium currency.
    - [ ] **Administrative Finance Dashboard:** Transaction logs, refund management, and subscription controls.


- [ ] **Bugs**
    - [ ] Bottom battle bar updates, character starts too far to the left when dying. The monsters seem to move behind him.
    - [ ] Weird bug hitting exit level after completing the boss in farming mode (getting the farm or hub popup).

---

*Updated: 2026-03-06*
