# ERP: Functional & Technical Requirements

This document serves as the single source of truth for the features and constraints of the Elysium Rising mmorPg (ERP).

## 0. Narrative Source & Database Extraction
The primary source of narrative truth for this project is the **[BOOKS.md](../../Books/BOOKS.md)** file. However, for efficient development, agents should first consult the high-signal, compressed guides in the **[docs/lore/](../lore/)** directory:
- **[BOOKS_SUMMARY.md](../lore/BOOKS_SUMMARY.md)**: High-level narrative arcs and chapter summaries.
- **[CHARACTER_GUIDE.md](../lore/CHARACTER_GUIDE.md)**: Detailed profiles of key characters.
- **[ENVIRONMENT_GUIDE.md](../lore/ENVIRONMENT_GUIDE.md)**: Descriptions of locations and atmosphere.
- **[ANNOUNCEMENT.md](../lore/ANNOUNCEMENT.md)**: Project-specific narrative framing.

**Workflow:**
1. Consult `docs/lore/` guides first.
2. Fall back to `BOOKS.md` for missing details.
3. Update `docs/lore/` guides if new or conflicting information is found in the source text.

Narrative data has also been programmatically extracted into the PostgreSQL database. For technical mapping, see **[A_BOOK_AGENT_SCHEMA.md](A_BOOK_AGENT_SCHEMA.md)**.

## 1. Onboarding & Authentication & Initial Admin Panel Stuff 
**Requirements:** [1_ONBOARDING_INIT_RECS.md](1_ONBOARDING_INIT_RECS.md) | **Schema:** [1_ONBOARDING_INIT_SCHEMA.md](1_ONBOARDING_INIT_SCHEMA.md)
- [x] **Google SSO Integration:** Primary authentication via Firebase for seamless web and mobile-adjacent access.
- [x] **Profile Creation:** Users must be able to create a profile linked to their Google Identity.
- [x] **Terms & Privacy:** Automated prompts for accepting terms based on the Elysium Rising IP.
- [x] **Onboarding Flow:** Splash page -> About/Instructions -> Auth -> Character Selection/Creation.
- [x] **Support Dashboard** Submit a ticket. See results, discuss about tickets, etc...
- [x] **Initial Admin Panel Stuff:**
    - [x] **User Management:** View, search, block/unblock, and edit user profiles.    
    - [x] **Server, User Activity Logs, Graphs and Tracking:** View logs, activity history, and metrics.
    - [x] **Server Config Management:** Ability to adjust settings for the servers (stored in the DB).
    - [x] **Support Dashboard:** User ticket management system (tracking open/closed/etc...), replies, etc...  

## 2. Inspirations & Design Baseline
The design and mechanics of ERP are grounded in several successful titles. These serve as the **primary baseline** for initial functionality, UI layout, and gameplay feel.

| System | Primary Inspiration | Key Features to Emulate |
| :--- | :--- | :--- |
| **Overworld/Map** | *Your Chronicle* | Node-based chapter/scene progression, branching paths, 100% completion mastery. |
| **UI/UX Aesthetic** | *Magic Research 2* | Clean, high-contrast dark theme, minimalist but polished interface, efficient data display. |
| **Idle Training** | *Melvor Idle* | Deep skill systems, "one-at-a-time" training, long-term progression floor, offline gains. |
| **Combat Loop** | *Clicker Heroes* | Enemy-centric waves, HP scaling, session-based gold/upgrades, boss timers, farmable checkpoints. |
| **Visual Flair** | *Dwarves: GDL* | Side-scrolling pixel art battle banner, visual growth indicators (armor/effects). |

**Guidance for Implementation:**
- **Clarification:** If a specific mechanic or UI detail is underspecified in these requirements, refer to the corresponding inspiration game's behavior as the default.
- **Precedence:** While inspirations provide the base, the **functional requirements in these docs (2.0-2.6) supercede the inspiration games.** ERP's narrative integration and dual-loop economy are unique and take priority over "stock" incremental mechanics.
- **Evolution:** As development progresses, ERP will diverge further from these baselines to accommodate the *Towers of Elysium* IP.

## 3. Core Gameplay Mechanics (Three-Loop Architecture)
The primary goal of ERP is to provide an immersive environment where players **read the book series while playing the game**. The architecture is built on three interconnected loops that balance active play, passive progression, and overworld strategy. The initial design and implementation will be to put these frameworks into place. Population and expansion of these into the full story and components related to the story should be described (e.g. start with 4 basic classes, but allow ability to add more as time progresses. Start with 4 skills. 4 enemy types, etc.. - however a process to expand those as they become defined and tooling to extract and create them (from the extracted book contents)).
### 2.0 Loop A: Overworld / Hub (Strategy & Navigation)
- [x] **Requirements:** [2.0_GAME_LOOP.md](2.0_GAME_LOOP.md) 
- [x] **UI/UX Design Requirements:** [2.1_OVERWORLD_HUB.md](2.1_OVERWORLD_HUB.md)

### 2.1 Loop A: Overworld / Hub (Strategy & Navigation)
- [x] **Detailed Requirements:** [2.1_OVERWORLD_HUB.md](2.1_OVERWORLD_HUB.md)
- [x] **Chapter-Based Progression:** The game is divided into levels matching chapters from the *Towers of Elysium* trilogy.
- [x] **Node-Based Map:** A "Chronicle-style" interactive map showing chapter and scene progression.
- [x] **Centralized Interface:** Access point for story mode, idle training, shops, and social features.
- [x] **Home Base Hub:** Display collections, leaderboard standings, and a personal journal of uncovered story beats.
- [x] **Visual Feedback:** Side-scrolling animated battle banner (pixel art style) providing atmospheric feedback of character growth. [2.1.1_ATMOSPHERIC_BATTLE_BANNER.md](2.1.1_ATMOSPHERIC_BATTLE_BANNER.md)
...
- [x] **2D Rendering (PixiJS):** High-performance WebGL engine for combat animations, particle effects, and side-scrolling banners.

### 2.2 — Loop B: Story Mode / Clicker Combat (Active Play)
- [x] **Detailed Requirements:** [2.2_STORY_MODE.md](2.2_STORY_MODE.md)
- [x] **The Reading Experience:** 
    - [x] **Narrative Gating:** Progress is strictly tied to 1x playback duration (calculated) + wave completion.
    - [x] **Dual-Condition Completion:** Scene is only "complete" when both the narrative reading finishes and required waves/bosses are defeated.
    - [x] **Extended Waves:** If waves finish before narrative, extra waves generate until progress is 100% complete.
- [x] **Combat Engine:** "Clicker Heroes-style" with exponential scaling and active skills.
    - [x] **Skill Scaling:** Base power from Idle Training levels; must be purchased and leveled with session gold each run.
    - [x] **Dark Ritual Persistence:** Multiplier persists across all scenes in a Chapter (resets per Book).
- [x] **Boss System:**
    - [x] **Mini-Bosses:** Scene-end encounters with enrage timers.
    - [x] **Primal Bosses:** 25% chance for Elysium Essence rewards on first defeat.
    - [x] **Chapter Bosses:** Features **Option C Interrupt Zones** during charge attacks.
- [x] **Flow:** 
    - [x] After completion, users can **CONTINUE** to farm or **GO BACK** to the Hub, updating the map.

### 2.3 Loop C: Idle Training (Passive Progression)
- [x] **Detailed Requirements:** [2.3_IDLE_TRAINING.md](2.3_IDLE_TRAINING.md)
- [x] **Skill-Based Growth:** "Melvor Idle-style" passive training system for combat, magic, and utility skills.
- [x] **Background Execution:** Training continues offline and while playing Story Mode.
- [x] **Session Floor:** Idle Training levels determine the "base stats" and power floor for Story Mode sessions.
- [x] **Manual Advancement:** Users can select only one skill at a time to train. The training rate is like Melvor Idle. However, users can also click into the skill itself and play clicker versions of the skill game to advance the training further. Gold earned during these sessions (enemies they encoutner come from the pool of any enemies they've unlocked up to that point in the books), gives a percentage boost (after exiting). So for example the idle level up time is 5 hours. If a user actively plays and earns gold/defeats levels - if they make it to level 500 in the manual mode, then 100% of the remaining time to level up would be gained (or something to that effect).

### 2.4 Character & Progression Systems, Classes, and Skills
- [x] **Detailed Requirements:** [2.4_CHARACTER_PROGRESSION.md](2.4_CHARACTER_PROGRESSION.md)
- [x] **Core Stats:** Strength, Agility, and Intelligence derived from the book's power system. Should be related to things found in the book.
- [x] **Inventory System:** Equipment slots (Weapon, Armor, Trinkets) with color-coded rarity tiers. Should be related to things found in the book.
- [x] **Dual Leveling:** 
    - [x] **Character XP:** Permanent growth via Idle Training and Story completion.
    - [x] **Chapter XP:** Progression tracking through the Tower's narrative.
- [x] **Prestige (NG+):** Higher difficulty loops with scaled enemies, palette swaps, and exclusive rewards.
- [x] **Classes:** Character classes have all different skills and abilities (base). Shoudl be related to components within the book.
- [x] **Skill System:** Skills need to be based off of skills found in the books. Skill names, effects, need to be designed to encompass the full story.

### 2.5 Audio & Music Integration
- [x] **Detailed Requirements:** [2.5_AUDIO_MUSIC.md](2.5_AUDIO_MUSIC.md) | **Schema:** [2.5_AUDIO_MUSIC_SCHEMA.md](2.5_AUDIO_MUSIC_SCHEMA.md)
- [x] **Web Audio API Synthesis:** Real-time 8-bit music generation in the browser from lightweight JSON definitions (~2-5 KB each). No large audio files shipped.
- [x] **13 Atmosphere Archetypes:** Lore-derived thematic music profiles (Mundane Dread, Occult Sanctum, Liminal Purgatory, Body Horror Theatre, Ancient Sanctuary, Cosmic Archive, Tech Utopia, Alien Frontier, Void Abyss, Domestic Trauma, Glitch Reality, Conspiracy Bunker, Training Grounds) each with 4 music states (Explore, Combat, Boss, Mystery). Training Grounds has 3-5 randomized variations for Idle Training sessions.
- [x] **Atmosphere Hierarchy:** Scene -> Chapter -> Book -> Global Default resolution with `dev_content_audit` logging on fallback.
- [x] **Unique Boss Themes:** Named boss entities can override atmosphere with unique music definitions.
- [x] **Procedural SFX (Web Audio API):** 11 core + 6 extended sound effects synthesized in real-time (clicks, crits, deaths, skills, level-ups, item drops, UI). JSON preset definitions stored in `audio_configs` table.
- [x] **Spatial Audio (SFX only):** Stereo panning via `StereoPannerNode` mapped to entity X-position in PixiJS viewport.
- [x] **MusicManager Component:** Replaces existing `AudioPlayer.tsx`. Auto-detects game state (explore/combat/boss/mystery) from StoryMode orchestrator props. 2s cross-fade on state transitions.
- [x] **Audio Settings:** Master/Music/SFX volume sliders + global mute TopBar toggle. Persisted to `player_settings` + `localStorage`.
- [x] **Admin Atmosphere Editor:** CRUD for atmospheres, JSON definition editor with in-browser Web Audio preview, batch assignment to chapters/books.
- [x] **Admin SFX Editor:** Edit/preview SFX presets, assign to skills and entities.
- [x] **Content Tools:** CLI generators for music definitions (`generate_8bit_music.py`), SFX presets (`generate_8bit_sfx.py`), and location-to-archetype classification (`classify_atmospheres.py`).
- [x] **Music Contexts:** Story Mode (all phases), Boss battles, Idle Training active click. No music during passive idle or hub navigation.
- [x] **Phases:** 2.5.0 Infrastructure, 2.5.1 MusicManager, 2.5.2 SFX System, 2.5.3 Admin & Tools, 2.5.4 Polish & QA.

### 2.6 Economy, Anti-Cheat & Discovery
- [x] **Detailed Requirements:** [2.6_ECONOMY_ANTICHEAT.md](2.6_ECONOMY_ANTICHEAT.md) | **Design:** [2.6_ECONOMY_ANTICHEAT_DESIGN.md](2.6_ECONOMY_ANTICHEAT_DESIGN.md) | **Schema:** [2.6_ECONOMY_ANTICHEAT_SCHEMA.md](2.6_ECONOMY_ANTICHEAT_SCHEMA.md)
- [x] **Advanced Anti-Cheat:**
    - [x] **Behavioral Detection:** System must distinguish between human mouse movements/click patterns and automated macros/bots.
    - [x] **Server Validation:** Real-time validation of click rates, damage calculations, and playback-based gating.
    - [x] **Wave Validation:** DPS-based plausibility checks on waves_completed_delta per tick.
    - [x] **Session Integrity:** Final gold sanity check at `/complete` with anomaly logging.
    - [x] **Anomaly Logging:** All violations logged to `activity_events` with type `anti_cheat_anomaly`.
    - [x] **CPS Feedback:** Two-tier client-side feedback (GoldOdometer flash + escalated warning toast).
- [x] **Discovery System (Akashic Records):**
    - [x] **Etheric Registry:** Per-variant entity tracking with E→SS ranked reveal system.
    - [x] **Skill & Item Library:** Unlock on first purchase/acquisition, "New" badges.
    - [x] **Discovery Counters:** Hub progress display (X/Y entities, skills, completion %).
    - [x] **Random Spawns:** Rare entity pool (no scene associations), config-driven spawn chance per wave, VFX indicators.
    - [x] **Static Wiki:** Help pages + contextual "?" icons throughout UI.
- [x] **Onboarding & UI Polish:**
    - [x] **Welcome Modal:** Combined changelog + tutorial link, version-tracked auto-display.
    - [x] **Interactive Tutorial:** 7-step coach-mark overlay, skippable/replayable, no rewards.
    - [x] **Aesthetic Polish:** "Magic Research 2" styling applied to Hub/Story Mode. Idle Training terminal exception preserved.
    - [x] **Animation Toggle:** Reduce Motion setting with CSS + JS hybrid suppression.
- [x] **Chat System:**
    - [x] **WebSocket Chat:** FastAPI native, JWT-authenticated, global channel, in-memory buffer.
    - [x] **Moderation:** Profanity filter (Aho-Corasick), rate limiting, admin mute controls.
    - [x] **System Broadcasts:** Milestone broadcasts (boss clears, chapter completions, rare drops), rate-limited.
    - [x] **Admin Interface:** Channel management, chat monitor, player mute controls.
- [x] **Phases:** 2.6.0 Animation Toggle, 2.6.1 Anti-Cheat, 2.6.2 Discovery, 2.6.3 Onboarding & Polish, 2.6.4 Chat.

### 2.7 Home Base Hub (Meta-Progression & Collections)
- [x] **Detailed Requirements:** [2.7_HOME_BASE_HUB.md](2.7_HOME_BASE_HUB.md) | **Design:** [2.7_HOME_BASE_HUB_DESIGN.md](2.7_HOME_BASE_HUB_DESIGN.md) | **Schema:** [2.7_HOME_BASE_HUB_SCHEMA.md](2.7_HOME_BASE_HUB_SCHEMA.md)
- [x] **Dual Economy:** Permanent resources (Elysium Essence) for training vs. temporary session gold for clicker upgrades. *(Implemented in 2.3/2.4)*
- [x] **Inventory System:** 16 gear slots with Dream Item generation and equip/swap. *(Implemented in 2.4.2)*
- [x] **Akashic Log (Personal Journal):** Keyword search, narrative completion %, hidden lore (Intelligence-gated), "New" badges.
- [x] **Artifact System:** Curated (~50 lore artifacts with 5 rarity tiers, boss/chapter/rare-spawn sourced) + Generated (simplified procedural artifacts). Permanent passive stat bonuses. No duplicates; rarity upgrades replace.
    - [x] **Relic Gallery:** Collection grid with filtering, sorting, inspection modal, silhouettes for undiscovered.
    - [x] **Admin Artifact Editor:** CRUD, bulk assignment, drop rate tuning.
- [x] **Hall of Echoes (Leaderboards):** Speedrun and Scholar categories. Static rank cards with tiered visual badges (Cosmic/Gold/Silver/Bronze).
- [x] **Achievement Matrix:** 90+ achievements across Combat, Narrative, Economics, Idle Training, and Discovery categories. Rewards: Shards, Titles, Essence, Badges.
    - [x] **Idle Training Milestones:** *(Cross-ref 2.3)* Rewards at Level 25/50/75/99 per idle skill (Essence grants, badges, titles).
    - [x] **Admin Achievement Editor:** CRUD, player override, completion analytics.
- [x] **Title System:** Earnable prefix/suffix titles displayed on leaderboards and in chat.
- [x] **Phases:** 2.7.0 Foundation (Artifacts + Achievements schema), 2.7.1 Akashic Log, 2.7.2 Relic Gallery, 2.7.3 Leaderboards + Achievements, 2.7.4 Admin Tools + Polish.


## 3. Economy & Monetization (Stripe)
- [ ] **Detailed Requirements:** [3.0_ECONOMY.md](3.0_ECONOMY.md)

### 3.1 Stripe Integration & Shard Purchasing
- [x] **Detailed Requirements:** [3.1_STRIPE_SHARD_PURCHASING.md](3.1_STRIPE_SHARD_PURCHASING.md) | **Design:** [3.1_STRIPE_SHARD_PURCHASING_DESIGN.md](3.1_STRIPE_SHARD_PURCHASING_DESIGN.md) | **Schema:** [3.1_STRIPE_SHARD_PURCHASING_SCHEMA.md](3.1_STRIPE_SHARD_PURCHASING_SCHEMA.md)
- [x] **Stripe Checkout Sessions:** One-time shard package purchases (6 tiers, $0.99–$99.99).
- [x] **Webhook Pipeline:** Payment confirmation, failures, refunds, disputes.
- [x] **Shard Crediting:** Idempotent credit flow with audit trail. First-purchase 2x bonus.
- [x] **Refund/Dispute Handling:** Debit shards on refund, flag accounts on disputes. Balance can go negative.
- [x] **Reconciliation:** Receipt polling (daily), refund/dispute polling (6hr), balance integrity checks.
- [x] **Player UI:** Shard Shop, purchase confirmation, transaction history, payment status polling.
- [x] **Phases:** 3.1.0 Backend Foundation, 3.1.1 Refund & Dispute, 3.1.2 Player UI, 3.1.3 Reconciliation & Polish.

### 3.2 Subscription: Elysium Ascendant
- [x] Stripe Subscription lifecycle (create, renew, cancel). Monthly $1.99, Annual $19.90.
- [x] **Research task:** Simulate gameplay loops to determine subscription benefits without pay-to-win.
- [x] Player-facing subscription management page and status tracking.
- [x] **Backend:** Subscription service (activate, renew, cancel, expire, refund, grace period, lazy stipend, loyalty tracking).
- [x] **Webhooks:** checkout.session.completed, invoice.paid/failed, subscription.updated/deleted, charge.refunded.
- [x] **Boosts:** XP, Essence, Drop Rate, Training Speed multipliers with streak bonuses; monthly shard stipend.
- [x] **Player UI:** SubscriptionPage, SubscriptionCard, BoostDisplay, LoyaltyProgress, PaymentWarningBanner, chat/leaderboard indicators.
- [x] **Admin:** Gift, extend, force-cancel, streak override endpoints. Admin subscriptions dashboard.
- [x] **Achievements:** 11 subscription achievements (cumulative chain, streak, shard collector, big spender) + 10 loyalty titles.
- [x] **Tests:** 40 backend (pytest), 15 frontend (vitest). E2E deferred (requires Docker stack).
- [x] **Phases:** 3.2.0 Backend Foundation, 3.2.1 Benefits & Boosts, 3.2.2 Player UI, 3.2.3 Admin & Polish.

### 3.3 The Overworld Shop (Elysium Emporium) — COMPLETE
- [x] Shop UI with cosmetics catalog (skins, flair, badges, avatars) and shard spending flow.
- [x] Booster system (time-limited buffs, admin-configurable durations/magnitudes).
- [x] Bundle system (curated packages with discount pricing, partial ownership).
- [x] Featured & limited-time rotation with countdown timers.
- [x] Admin CRUD endpoints for catalog management and refunds.
- [x] Backend tests (26 pytest), frontend tests (10 vitest).
- [x] **Phases:** 3.3.0 Backend Foundation, 3.3.1 Booster Engine, 3.3.2 Player UI, 3.3.3 Tests & Polish.

### 3.4 Donations (One-Time Support) — COMPLETE
- [x] **Detailed Requirements:** [3.4_DONATIONS.md](3.4_DONATIONS.md)
- [x] Donation tiers ($1/$5/$10/$25/$50/$100), custom amounts (min $1, uncapped), Stripe Checkout flow.
- [x] Patron tier system (Bronze $5 / Silver $25 / Gold $100 / Diamond $500) with Diamond stars.
- [x] Patron cosmetics: 4 badges, 1 flair (Gold+), 1 avatar (Diamond), 5 titles. Shared equip slots with 3.3.
- [x] "Patron of Elysium" achievement on first donation.
- [x] Donor Hall of Honor leaderboard (top 50, opt-in only, no dollar amounts).
- [x] Support Us tab (third tab in Shop), heartfelt message, recent donors banner.
- [x] Admin endpoints: list donations, stats, player donation history.
- [x] Backend tests (16 pytest), frontend tests (7 vitest).
- [x] **Phases:** 3.4.0 Backend Foundation, 3.4.1 Player UI, 3.4.2 Tests & Polish.

### 3.5 Dreamwalker's Bazaar (Player Marketplace) — COMPLETE
- [x] **Detailed Requirements:** [3.5_DREAMWALKERS_BAZAAR.md](3.5_DREAMWALKERS_BAZAAR.md) | **Design:** [3.5_DREAMWALKERS_BAZAAR_DESIGN.md](3.5_DREAMWALKERS_BAZAAR_DESIGN.md) | **Schema:** [3.5_DREAMWALKERS_BAZAAR_SCHEMA.md](3.5_DREAMWALKERS_BAZAAR_SCHEMA.md)
- [x] Listing system (24hr fixed-price, FIFO, price transparency, price adjustment, lazy expiry, listing slot expansion via Bazaar Permits).
- [x] Buy flow (shard debit/credit with 5% burned tax, row-level locking, item transfer, claim queue for inventory-full equipment, trade history).
- [x] NPC Vendor salvage (Essence per rarity, 2x artifact multiplier, 1.15x curated bonus, bulk salvage, double-confirm for curated artifacts).
- [x] Trade notifications (sold/expired/removed, piggyback on idle gains pattern).
- [x] 9 marketplace achievements with parent chains + 4 titles.
- [x] Admin endpoints (listings, trades, stats, force-remove, reverse-trade).
- [x] Player UI: BazaarTab (4th shop tab), BrowseListings, ListingCard, BazaarPurchaseModal, TradeNotificationOverlay, ClaimModal, MyListings, CreateListingModal, PriceAdjustModal, NPCVendor, TradeHistory, BazaarPermitUpsell.
- [x] Backend tests (32 pytest), frontend tests (12 vitest).
- [x] **Phases:** 3.5.0 Backend Foundation, 3.5.1 Browse & Buy UI, 3.5.2 Sell & Salvage UI, 3.5.3 Tests & Polish.

### 3.6 Admin Finance Dashboard & Tools
- [ ] Stripe transaction viewer, shard management, and refund workflow.
- [ ] Subscription management, dispute queue, and revenue analytics.
- [ ] Shop catalog management and marketplace moderation tools.

## 4. Social & MMORPG Features
- [ ] **Communication Integration:**
    - [ ] Email alerts to users (email integration somewhere)
- [ ] **Integrated Chat:**
    - [ ] **General:** Global communication.
    - [ ] **Chapter Rooms:** Content-specific discussion (instanced by book chapter).
- [ ] **Leaderboards:**
    - [ ] Global Cumulative Score.
    - [ ] Chapter-specific Time Attack (Speedrunning).
    - [ ] Monthly competitive rankings.
- [ ] **Achievements:** Google Play Games Services integration for persistent cross-platform achievements.

## 5. Administrative Systems
- [ ] **User Management:** View, search, block/unblock, and edit user profiles.
- [ ] **Character Editor:** Direct manipulation of stats, inventory, and premium balances for support/testing.
- [ ] **Gameplay Data Editor:** Allows editing of book data (text), entities and location data, entity_game_play data, skills, benefit effects, stats, and other game play related data.
- [ ] **Banner & Scaling Editor:** 
    - [ ] **Visual Weights:** Configure how much each stat (Str/Agi/Int) affects sprite size, speed, and VFX.
    - [ ] **Global Wave Settings:** Set `max_enemies_per_wave` and default spawn intervals.
    - [ ] **Intensity Curves:** Define how wave density increases across chapters and resets per book.
- [ ] **Finance Dashboard:** View Stripe logs, transaction history, and metrics. Issue refunds. Cancel subs for users. 
- [ ] **Content Management:** Adjust drop rates, enemy HP, and narrative trigger timing without redeploying code.
- [ ] **Premium Currency Bundles:** Allow to set, award, edit, etc...
- [ ] **Dev Content Audit table** viewer and editor to help manage and update assets that have missing data. Flag generic vs. specific assets.
    - [ ] Flag missing `base_atmosphere` or music tracks.
    - [ ] Flag entities using generic sprites or missing unique death sounds.
    - [ ] Flag skills with missing SFX keys.
    - [ ] Flag generic stat blocks not extracted from lore.

## 6. Technical & Infrastructure
- [x] **Backend (Python/FastAPI):** High-performance, async API.
- [x] **Frontend (React/Vite/TS):** Responsive, high-fidelity UI with Vanilla CSS.
- [ ] **Game Content Management:** 
    - [ ] **Admin Editor:** Interface to create and edit Chapters, Scenes, Story Beats, and Entities (HP, Gold, Stat Blocks). Editor for artifacts, inventory items, etc...
    - [ ] **Asset Registry:** Map sprite keys to actual URLs for PixiJS rendering.
- [x] **Deployment:** Dockerized services on Google Cloud Run with automated Google Cloud Build CI/CD.
- [x] **Secrets:** All sensitive keys (Stripe, Firebase, SQL) must reside in Google Secret Manager.

## 7. Non-Functional Requirements
- [ ] **Latency:** Core clicker actions must feel instantaneous (optimistic UI).
- [ ] **Scalability:** System must handle 1,000+ concurrent players in chat/leaderboard instances.
- [ ] **Security:** Rigorous JWT validation and Stripe webhook signature verification.

## 8. Additional Requirements
- [ ] **Entity types and classes** Melee, Ranged, Magic (able to be one or combo or all - think of more, flying, etc...). Effects how they attack on the screen, show up in the battle banner. Classes (stying and color choices). Ability to add new types (or maybe just re-use class from player?) Editor and ability to change, add, and assign entities (in bulk, search) the types and classes. Also stat block editor and other fun bits.
- [ ] Update the lore descriptions. Hide the debug button bits (ADMIN can see them). 

## 99. Deferred Features (Post-First-Release)

### 99.1 Narrative Audio & Streaming (Eleven Reader)
- [ ] **Eleven Reader Integration:** Real-time audiobook streaming and sync.
- [ ] **Text-to-Speech (TTS):** Dynamic narration for extracted text.
- [ ] **Word-Level Timestamp Sync:** Precision alignment for reading mode.
- [ ] **Advanced Narrative Extraction:** Automated duration calculation based on raw audio files.
- [ ] **Duration Utility:** Backend script to extract/update scene narrative durations based on audio files.

### 99.2 High-Fidelity Thematic Music (Suno)
- [ ] **Suno Music Manager:** Build the looping background audio manager with cross-fade support for generated thematic tracks.

### 99.3 Prestige (NG+)
- [ ] **NG+ System:** Scaled difficulty, palette swaps, and exclusive prestige rewards.

### 99.4 Multi-Instance Chat (Redis Pub/Sub)
- [ ] **Cross-Instance Chat Sync:** If Cloud Run scales beyond a single instance, add Redis Pub/Sub (or equivalent) to synchronize in-memory chat buffers across instances so all connected players see all messages regardless of which instance they're connected to.

### 99.5 Cloud Run Single-Instance WebSocket Deployment
- [ ] **Deployment:** Set `--max-instances=1` on Cloud Run for single-instance WebSocket to ensure in-memory chat buffer consistency until Redis Pub/Sub (99.4) is implemented.

---

## TOOLING AND UTILITIES

## A. Book Agent Reader
**Requirements:** [A_BOOK_AGENT_READER.md](A_BOOK_AGENT_READER.md) | **Schema:** [A_BOOK_AGENT_SCHEMA.md](A_BOOK_AGENT_SCHEMA.md)
- [x] **Automated Book Ingestion:** Process raw text from the *Towers of Elysium* trilogy.
- [x] **Contextual Analysis:** Extract characters, locations, and narrative beats into the DB (Refer to `A_BOOK_AGENT_SCHEMA.md` §1-§4).
- [x] **Scene Splitting:** Break chapters into manageable scenes for gameplay gating.
- [x] **Boss Identification:** Automatically identify mini-bosses and chapter-bosses from the text.
- [x] **Data Export:** Generate SQL migrations or CSV dumps for database seeding.

## B. DB Cleanup & Consolidation
**Requirements:** [B_DB_CLEANUP_CONSOLIDATION.md](B_DB_CLEANUP_CONSOLIDATION.md)
- [x] **Duplicate Analysis:** Identify potential duplicates using `check_duplicates.py`.
- [x] **Automated Consolidation:** Safely merge duplicate records and re-map foreign keys.

## C. Story Mode Asset Generators
**Requirements:** [C_STORY_ASSET_GENERATORS.md](C_STORY_ASSET_GENERATORS.md)
- [x] **8 Bit Music Generator:** Completed in REC 2.5 (`tools/generate_8bit_music.py`)
- [x] **Sound Effect Generator:** Completed in REC 2.5 (`tools/generate_8bit_sfx.py`)
- [ ] **Background image generator:** Lots more for all the different books
- [ ] **DB Populator:** Update DB With lore specific information and stat blocks for entities
- [ ] **Sprite generator:** Need to generate sprites for all items, entities, different classes, avatars, spell icons, etc...
- [ ] Visual achievement badge icons on leaderboard rank card. *(Deferred — requires achievement icon assets)* From 2.7
