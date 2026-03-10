# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

- [ ] **3.0 — Economy & Monetization (Marketplace & Premium)** *(Ref: `docs/recs/3.0_ECONOMY.md`)*

    - [ ] **3.2 — Subscription: Elysium Ascendant**
        - [ ] Create requirements, design, and schema docs (probing questions, iterate until complete).
        - [ ] **Research task:** Simulate gameplay loops to determine subscription benefits without pay-to-win.
        - [ ] Implement Stripe Subscription lifecycle (create, renew, cancel) and webhook handlers.
        - [ ] Implement player-facing subscription management page and status tracking.

    - [ ] **3.3 — The Overworld Shop**
        - [ ] Create requirements, design, and schema docs (probing questions, iterate until complete).
        - [ ] Implement shop UI with cosmetics catalog (skins, flair, badges, avatars) and shard spending flow.
        - [ ] Implement booster system (time-limited buffs, admin-configurable durations/magnitudes, active display).

    - [ ] **3.4 — Donations**
        - [ ] Create requirements, design, and schema docs (probing questions, iterate until complete).
        - [ ] Implement donation tiers, custom amounts, shard bonus mapping, and Patron badge/title.

    - [ ] **3.5 — Player Marketplace**
        - [ ] Create requirements, design, and schema docs (probing questions, iterate until complete).
        - [ ] Implement listing system (24hr fixed-price, FIFO, price transparency, price adjustment).
        - [ ] Implement buy flow (shard debit/credit, item transfer, trade history).
        - [ ] Implement NPC Vendor salvage (Essence per rarity, double-confirm for curated artifacts).

    - [ ] **3.6 — Admin Finance Dashboard & Tools**
        - [ ] Create requirements, design, and schema docs (probing questions, iterate until complete).
        - [ ] Implement Stripe transaction viewer, shard management, and refund workflow.
        - [ ] Implement subscription management, dispute queue, and revenue analytics.
        - [ ] Implement shop catalog management and marketplace moderation tools.


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

*Updated: 2026-03-10*
