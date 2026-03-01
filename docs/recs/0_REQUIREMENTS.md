# ERP: Functional & Technical Requirements

This document serves as the single source of truth for the features and constraints of the Elysium Rising mmorPg (ERP).

## 0. Narrative Source & Database Extraction
The primary source of narrative truth for this project is the **[BOOKS.md](../../Books/BOOKS.md)** file (located in the peer `Books` directory). 
- All story beats, entity descriptions, location details, and sensory data originate from the *Towers of Elysium* trilogy.
- This narrative data has been programmatically extracted and structured into the PostgreSQL database via the **Book Agent Reader** tool.
- For the technical mapping of how this narrative data is stored, refer to the **[A_BOOK_AGENT_SCHEMA.md](A_BOOK_AGENT_SCHEMA.md)**.

## 1. Onboarding & Authentication & Initial Admin Panel Stuff 
**Requirements:** [1_ONBOARDING_INIT_RECS.md](1_ONBOARDING_INIT_RECS.md) | **Schema:** [1_ONBOARDING_INIT_SCHEMA.md](1_ONBOARDING_INIT_SCHEMA.md)
- [x] **Google SSO Integration:** Primary authentication via Firebase for seamless web and mobile-adjacent access.
- [x] **Profile Creation:** Users must be able to create a profile linked to their Google Identity.
- [x] **Terms & Privacy:** Automated prompts for accepting terms based on the Elysium Rising IP.
- [x] **Onboarding Flow:** Splash page -> About/Instructions -> Auth -> Character Selection/Creation.
- [x] **Support Dashboard** Submit a ticket. See results, discuss about tickets, etc...
- [ ] **Initial Admin Panel Stuff:**
    - [x] **User Management:** View, search, block/unblock, and edit user profiles.    
    - [ ] **Server, User Activity Logs, Graphs and Tracking:** View logs, activity history, and metrics.
    - [x] **Server Config Management:** Ability to adjust settings for the servers (stored in the DB).
    - [x] **Support Dashboard:** User ticket management system (tracking open/closed/etc...), replies, etc...  

## 2. Core Gameplay Mechanics (Incremental MMORPG)
- [ ] **High Level Game Loop:** The game is divided into levels matching chapters from the *Towers of Elysium* trilogy.
    - [ ] **Requirements:** [2.0_GAME_LOOP.md](2.0_GAME_LOOP.md) 
- [ ] **Chapter-Based Progression:** The game is divided into levels matching chapters from the *Towers of Elysium* trilogy.
    - [ ] **Sub-Chapter Nodes:** Chapters are further divided into narrative nodes representing specific story beats.
    - [ ] **Story Beat Bosses:** Mini-boss and Chapter-boss encounters based on specific events in the book content.
- [ ] **Incremental Clicker Engine:**
    - [ ] Resource generation (e.g., "Elysium Essence").
    - [ ] Auto-clicker upgrades and passive progression.
    - [ ] Anti-cheat detection (multi-click, botting, rate limiting; detection based on human mouse vs macro).
- [ ] **Progression Gating (Time-Boxing):**
    - [ ] Users cannot advance narrative nodes faster than the corresponding audio book section played at 1x speed.
    - [ ] Progression is synced with Eleven Reader playback duration.
- [ ] **Character System:**
    - [ ] **Visuals (AI-Driven):** 
        - [ ] Use AI (e.g., Stable Diffusion/DALL-E) to generate initial character and enemy designs based on descriptions in `../Books/BOOKS.md`. (Extracted out to the DB)
        - [ ] **Asset Caching & Sharing:** Once an asset is generated, it is cached and shared globally to ensure visual consistency and minimize API costs.
        - [ ] Text overlay to allow users to read the story as it progresses. The end of the chapter (final/final boss beat), show a cinematic detailing the actions from the book with text on screen of the book itself.
        - [ ] Offline progress - if a user comes back, calculate the progress. At most it will end the current chatper/storybeat (current segment), and require the user to listen to the story/read the text at least once before progressing.
        - [ ] Future loops (reset-progression) enemies get stronger, pallet changes, more enemies, other things to bring them back, but on future playthroughs they don't have to listen to the story and can allow for further skipping ahead.
        - [ ] Home base mechanic (display collections, leaderboard, read parts of the story you've uncovered so far).
        - [ ] Copy protection - text should be in image format (some post processiong pre-display like Kindle) to prevent users from copy and pasting the text itself outside of the game (since this is browser based).
    - [ ] **Animations:** Idle, damage, and death animations for all entities.
    - [ ] **Combat Visuals:** Attack animations and specific spell effects (VFX) for player abilities.
    - [ ] **Stats:** Strength, Agility, Intelligence, etc., derived from the book's power system.
    - [ ] **Inventory:** Equipment slots (Weapon, Armor, Trinkets) with rarity tiers.
    - [ ] **Leveling:** Character XP and Chapter XP.
- [ ] **Audio & Music Integration:**
    - [ ] **Narration:** Real-time streaming of Eleven Reader audio books corresponding to the active chapter.
    - [ ] **Background Music (SUNO):** 
        - [ ] Integration with SUNO for thematic music generation.
        - [ ] **Caching & Randomization:** Cache generated tracks and implement a randomized playlist generation system based on chapter mood.
    - [ ] **Sound Effects (SFX):** Integrated SFX for clicking, UI interaction, attacks, spell casting, and enemy defeat.

## 3. Economy & Monetization (Stripe)
- [ ] **Currency System:** 
    - [ ] In-game Gold (Earned).
    - [ ] Premium "Elysium Shards" (Purchased).
- [ ] **Subscriptions:** Monthly "Elysium Ascendant" plans for bonus XP/drops.
- [ ] **Microtransactions:** Purchase of shards, cosmetics, and quality-of-life boosters.
- [ ] **Donations:** One-time support options.
- [ ] **Refunds:** Full administrative workflow for triggering Stripe refunds from the Admin UI.
- [ ] **Payment and Subscriptions:** Sign up for payment, donations, subscription. Cancel subscription.
    - [ ] Subscriptions (monthly or annuyal re-curring subscriptions with discount) Plus ability to cancel subscription.
    - [ ] Donations (to support the dev process - fixed amounts and allow for bigger currency bumps). 
    - [ ] Purchase packages of things from the store (right now it's not doing anything in game, but need to track that they purchased something, and then redeemed it). Ability to get refunds for things not used.
    - [ ] Transaction log - see all your payments, and whatnot as an end user.

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
- [ ] **Finance Dashboard:** View Stripe logs, transaction history, and metrics. Issue refunds. Cancel subs for users. 
- [ ] **Content Management:** Adjust drop rates, enemy HP, and narrative trigger timing without redeploying code.
- [ ] **Premium Currency Bundles:** Allow to set, award, edit, etc...

## 6. Technical & Infrastructure
- [x] **Backend (Python/FastAPI):** High-performance, async API.
- [x] **Frontend (React/Vite/TS):** Responsive, high-fidelity UI with Vanilla CSS.
- [x] **Database (PostgreSQL):** Optimized for high-frequency leaderboard and state updates.
- [x] **Deployment:** Dockerized services on Google Cloud Run with automated Google Cloud Build CI/CD.
- [x] **Secrets:** All sensitive keys (Stripe, Firebase, SQL) must reside in Google Secret Manager.

## 7. Non-Functional Requirements
- [ ] **Latency:** Core clicker actions must feel instantaneous (optimistic UI).
- [ ] **Scalability:** System must handle 1,000+ concurrent players in chat/leaderboard instances.
- [ ] **Security:** Rigorous JWT validation and Stripe webhook signature verification.

## TOOLING AND UTILITIES

## A. Book Agent Reader
**Requirements:** [A_BOOK_AGENT_READER.md](A_BOOK_AGENT_READER.md) | **Schema:** [A_BOOK_AGENT_SCHEMA.md](A_BOOK_AGENT_SCHEMA.md)
- [x] **Automated Book Ingestion:** Process raw text from the *Towers of Elysium* trilogy.
- [x] **Contextual Analysis:** Extract characters, locations, and narrative beats into the DB (Refer to `A_BOOK_AGENT_SCHEMA.md` §1-§4).
- [x] **Scene Splitting:** Break chapters into manageable scenes for gameplay gating.
- [x] **Boss Identification:** Automatically identify mini-bosses and chapter-bosses from the text.
- [x] **Data Export:** Generate SQL migrations or CSV dumps for database seeding.
