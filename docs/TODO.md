# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

## REC_2: Game Loop 2.0 (The Towers of Elysium)
**Note:** Initial implementation focuses on "The Rule of 4": 4 classes, 4 enemies, 4 skills, 4 scenes per chapter. All data must be server-authoritative and DB-driven.   



- [ ] **3.0 — Marketplace & Premium (Monetization & Trading)** *(Ref: `docs/recs/0_REQUIREMENTS.md §3`)*
    - [ ] **Stripe Integration:** Premium "Elysium Shards" purchasing and subscription management.
    - [ ] **The Overworld Shop:** Central hub for trading Shards/Essence for equipment and meta-upgrades.
    - [ ] **Player-to-Player Trading:** Implement the marketplace for selling items for premium currency.
    - [ ] **Artifact & Item Trading:** NPC vendor sell-for-Essence + P2P artifact marketplace. *(Deferred from 2.7)*
    - [ ] **Administrative Finance Dashboard:** Transaction logs, refund management, and subscription controls.


- [ ] **Bugs**
    - [ ] Bottom battle bar updates, character starts too far to the left when dying. The monsters seem to move behind him.
    - [ ] Weird bug hitting exit level after completing the boss in farming mode (getting the farm or hub popup).
    - [ ] Investigate some standard SDD frameworks (Open Spec) - consider converting this and documentation into that format.
    - [ ] Code bloat and ballooning (a few god class files have been created, break these back down into modules)
    - [ ] Code documentation - link to requirements documentation, functional specs, or inline code comments

- [ ] **Enabling Cloud Deployment without the cost**
    - [ ] See if firebase can store a JSON string for users (how much space, how updatable).
    - [ ] If not, are there free clud DBS?
    - [ ] If yes, then create postgres docker container, load up with DB dump (everything except player data) when container inits. 
    - [ ] When player logs in first time (if missing) gets info from firebase and repopulates their record. 
    - [ ] Every now and then update the JSON string in firebase.

---

*Updated: 2026-03-09*
