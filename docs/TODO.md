# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

- [ ] **3.0 — Economy & Monetization (Marketplace & Premium)** *(Ref: `docs/recs/3.0_ECONOMY.md`)*

    - [ ] **3.2 — Subscription: Elysium Ascendant** *(Ref: `docs/recs/3.2_SUBSCRIPTION_ELYSIUM_ASCENDANT.md`, `_DESIGN.md`, `_SCHEMA.md`)*
        - [x] Create requirements, design, and schema docs (probing questions, iterate until complete).
        - [x] **Research task:** Simulate gameplay loops to determine subscription benefits without pay-to-win.

        - [ ] **3.2.0 — Backend Foundation** *(Migration 050, Models, Stripe Setup, Core Routes, Webhooks)*
            - [ ] **S1.1** Write & apply migration 050: `player_subscriptions` table, `subscription_stipend_log` table, `players.is_ascendant` + `players.cumulative_subscription_months` columns, 11 `game_configs` seeds (category: `subscription`), 10 loyalty titles, 11 subscription achievements.
            - [ ] **S1.2** SQLModel models `PlayerSubscription` + `SubscriptionStipendLog` → `backend/models/subscriptions.py`. Register in `backend/models/__init__.py`.
            - [ ] **S1.3** Create Stripe Product + 2 Prices (monthly $1.99, annual $19.90) in Stripe Dashboard (test mode). Store Price IDs in `game_configs` (`subscription_monthly_price_id`, `subscription_annual_price_id`).
            - [ ] **S1.4** `POST /api/subscriptions/create` — Subscription Checkout Session endpoint. Accepts `plan` (monthly/annual), validates no active sub exists, calls `get_or_create_stripe_customer()`, creates Stripe Checkout in `subscription` mode with `metadata.player_id`. → `backend/routes/subscriptions.py`
            - [ ] **S1.5** `GET /api/subscriptions/status` — Returns current subscription state, boosts, loyalty progress, stipend info. Triggers lazy evaluation (grace expiration check + pending stipend crediting). → `backend/routes/subscriptions.py`
            - [ ] **S1.6** `POST /api/subscriptions/cancel` — Cancels at period end via Stripe API, sets `cancel_at_period_end = true` locally. → `backend/routes/subscriptions.py`
            - [ ] **S1.7** `POST /api/subscriptions/reactivate` — Removes cancellation if still within active period, clears `cancel_at_period_end`. → `backend/routes/subscriptions.py`
            - [ ] **S1.8** `POST /api/subscriptions/switch` — Plan switch (monthly↔annual). Creates new Stripe Checkout for the new plan, Stripe handles proration. → `backend/routes/subscriptions.py`
            - [ ] **S1.9** Webhook handlers (extend `backend/routes/webhooks.py`):
                - `checkout.session.completed` (subscription mode) — activate subscription, create `player_subscriptions` row, set `players.is_ascendant = true`.
                - `invoice.paid` — renew subscription, increment `continuous_streak` + `cumulative_subscription_months`, credit stipend (150 base + streak bonus), log to `subscription_stipend_log`.
                - `invoice.payment_failed` — set subscription to `past_due`, calculate business-day grace deadline.
                - `customer.subscription.updated` — handle plan changes, cancellation scheduling.
                - `customer.subscription.deleted` — expire subscription, clear `is_ascendant`, reset `continuous_streak`.
                - `charge.refunded` (subscription) — claw back ALL stipends for the subscription lifetime, expire sub, clear `is_ascendant`.
                - `charge.dispute.created` (subscription) — same as refund + flag account.
                - `charge.dispute.closed` (subscription) — if won, restore; if lost, keep debit.
            - [ ] **S1.10** Business-day grace period calculator: next US business day (Mon-Fri, excluding US federal holidays + admin-configurable custom holidays via `game_configs`). → `backend/services/subscription_service.py`
            - [ ] **S1.11** Subscription lifecycle service: `activate_subscription()`, `renew_subscription()`, `cancel_subscription()`, `expire_subscription()`, `refund_subscription()`, `_get_active_subscription()`, `_resolve_lazy_status()`. → `backend/services/subscription_service.py`
            - [ ] **S1.12** Update `db/data_dictionary.md` with migration 050 tables and columns.

        - [ ] **3.2.1 — Benefits & Boosts** *(Server-side boost application, Stipend system, Loyalty tracking)*
            - [ ] **S2.1** `get_subscriber_multipliers(player_id, session)` — Returns dict of boost multipliers (xp, essence, drop_rate, training_speed) based on active subscription + streak escalation. Returns 1.0x multipliers if not subscribed. → `backend/services/subscription_service.py`
            - [ ] **S2.2** Story Mode boost application: Multiply XP (1.15x base) and Essence (1.15x base) rewards in `POST /api/game/story/session/{id}/complete`. Multiply artifact drop chance (1.10x base) in `evaluate_artifact_drops()`. → modify `backend/routes/story_mode.py`, `backend/services/artifact_service.py`
            - [ ] **S2.3** Idle Training boost application: Multiply XP (1.15x base), Essence (1.15x base), and training speed (1.10x base) in training tick calculations. → modify `backend/routes/idle_training.py`
            - [ ] **S2.4** Achievement Essence reward boost: Apply 1.15x Essence multiplier to achievement Essence rewards when granted. → modify `backend/services/achievement_service.py`
            - [ ] **S2.5** Stipend crediting (lazy, on-access): When `GET /status` or `get_subscriber_multipliers()` is called, check `subscription_stipend_log` for uncredited periods. Credit 150 base shards + streak bonus (accumulative: +50 at 12mo, +50 at 24mo, +50 at 36mo). Log each period with unique `period_key` for idempotency. → `backend/services/subscription_service.py`
            - [ ] **S2.6** Loyalty tracking: Continuous streak incremented on each `invoice.paid`, reset to 0 on expiration. Cumulative months incremented on `invoice.paid`, never reset. Both drive boost escalation and title milestones.
            - [ ] **S2.7** Loyalty title grants: Check cumulative months against title thresholds (1, 3, 6, 12, 24, 36, 48, 60 months) after each renewal. Grant permanent titles via existing `player_titles` table. → `backend/services/subscription_service.py`
            - [ ] **S2.8** Streak-based boost escalation: Every 3 months of continuous streak adds +1% to each boost category (capped at +5% bonus from streak). Read escalation config from `game_configs`.

        - [ ] **3.2.2 — Player UI** *(Subscription page, Loyalty display, Chat/Leaderboard indicators)*
            - [ ] **S3.1** `SubscriptionPage.tsx` — Full subscription management page. Shows current status, plan details, next billing date, cancel/reactivate/switch actions, stipend history. → `frontend/src/game/components/subscription/SubscriptionPage.tsx`
            - [ ] **S3.2** `SubscriptionCard.tsx` — Plan selection cards (Monthly $1.99/mo, Annual $19.90/yr with "Save 17%" badge). Redirects to Stripe Checkout on click. → `frontend/src/game/components/subscription/SubscriptionCard.tsx`
            - [ ] **S3.3** `LoyaltyProgress.tsx` — Dual-track loyalty progress timeline. Top track: continuous streak (current count + next milestone). Bottom track: cumulative months (permanent, with title milestone markers). → `frontend/src/game/components/subscription/LoyaltyProgress.tsx`
            - [ ] **S3.4** `BoostDisplay.tsx` — Active boosts panel showing current multipliers (XP, Essence, Drop Rate, Training Speed) with streak escalation breakdown. → `frontend/src/game/components/subscription/BoostDisplay.tsx`
            - [ ] **S3.5** `PaymentWarningBanner.tsx` — Past-due warning banner with grace period countdown, update payment link. Shown globally when subscription is `past_due`. → `frontend/src/game/components/subscription/PaymentWarningBanner.tsx`
            - [ ] **S3.6** Cancel / Reactivate / Switch confirmation modals with clear messaging about what happens (end-of-period cancellation, proration on switch, etc.).
            - [ ] **S3.7** Chat badge: Golden ★ prefix for Ascendant subscribers in chat messages. → modify `frontend/src/game/components/chat/ChatTab.tsx`
            - [ ] **S3.8** Leaderboard indicator: ★ on Ascendant subscriber rank cards. → modify `frontend/src/game/components/hub/HallOfEchoes.tsx`
            - [ ] **S3.9** Hub sidebar: Add "Ascendant" menu item linking to subscription page. → modify `frontend/src/game/components/hub/Sidebar.tsx`

        - [ ] **3.2.3 — Admin & Polish** *(Admin tools, Achievements, Tests, Docs)*
            - [ ] **S4.1** Admin subscription endpoints → `backend/routes/admin_subscriptions.py`:
                - `GET /api/admin/subscriptions` — List all subscriptions with filters (status, player, date range).
                - `POST /api/admin/subscriptions/gift` — Gift subscription to player (no Stripe charge).
                - `POST /api/admin/subscriptions/{id}/extend` — Extend subscription period.
                - `POST /api/admin/subscriptions/{id}/force-cancel` — Immediate cancellation (not end-of-period).
                - `POST /api/admin/subscriptions/{id}/streak-override` — Override continuous streak value.
            - [ ] **S4.2** Achievement evaluation integration: Add 4 new tracking sources to `get_player_cumulative_stats()` in `backend/services/achievement_service.py`: `cumulative_sub_months` (from `players`), `continuous_sub_streak` (from active `player_subscriptions`), `shards_purchased` (sum from `payment_orders`), `shards_spent` (sum from `shard_transactions`).
            - [ ] **S4.3** Backend tests → `backend/tests/test_subscriptions.py`: ~35 test cases covering subscription lifecycle, webhook handlers, stipend crediting, grace period calculation, boost multipliers, loyalty milestones, refund clawback, dispute handling, edge cases (re-subscribe, plan switch, expired grace).
            - [ ] **S4.4** Frontend tests → `frontend/src/game/components/subscription/*.test.tsx`: ~9 test cases covering SubscriptionPage states, SubscriptionCard rendering, LoyaltyProgress display, BoostDisplay multipliers, PaymentWarningBanner visibility.
            - [ ] **S4.5** E2E tests → `testing/subscription.spec.ts`: 3 Playwright tests (subscribe flow, cancel/reactivate, plan switch) using Stripe test mode.
            - [ ] **S4.6** Final data dictionary update (`db/data_dictionary.md`) — verify migration 050 fully reflected.
            - [ ] **S4.7** Update `docs/recs/3.2_SUBSCRIPTION_ELYSIUM_ASCENDANT.md` checkboxes, move completed items to `docs/DONE.md` when all 3.2 phases are verified.

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

*Updated: 2026-03-11*
