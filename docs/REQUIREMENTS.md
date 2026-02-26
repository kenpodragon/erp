# ERP: Functional & Technical Requirements

This document serves as the single source of truth for the features and constraints of the Elysium Rising mmorPg (ERP).

## 1. Onboarding & Authentication
- [ ] **Google SSO Integration:** Primary authentication via Firebase for seamless web and mobile-adjacent access.
- [ ] **Profile Creation:** Users must be able to create a profile linked to their Google Identity.
- [ ] **Terms & Privacy:** Automated prompts for accepting terms based on the Elysium Rising IP.
- [ ] **Onboarding Flow:** Splash page -> About/Instructions -> Auth -> Character Selection/Creation.

## 2. Core Gameplay Mechanics (Incremental MMORPG)
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
        - [ ] Use AI (e.g., Stable Diffusion/DALL-E) to generate initial character and enemy designs based on descriptions in `../Books/BOOKS.md`.
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

## 4. Social & MMORPG Features
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
- [ ] **Finance Dashboard:** View Stripe logs, transaction history, and metrics.
- [ ] **Content Management:** Adjust drop rates, enemy HP, and narrative trigger timing without redeploying code.

## 6. Technical & Infrastructure
- [ ] **Backend (Python/FastAPI):** High-performance, async API.
- [ ] **Frontend (React/Vite/TS):** Responsive, high-fidelity UI with Vanilla CSS.
- [ ] **Database (PostgreSQL):** Optimized for high-frequency leaderboard and state updates.
- [ ] **Deployment:** Dockerized services on Google Cloud Run with automated GitHub Actions CI/CD.
- [ ] **Secrets:** All sensitive keys (Stripe, Firebase, SQL) must reside in Google Secret Manager.

## 7. Non-Functional Requirements
- [ ] **Latency:** Core clicker actions must feel instantaneous (optimistic UI).
- [ ] **Scalability:** System must handle 1,000+ concurrent players in chat/leaderboard instances.
- [ ] **Security:** Rigorous JWT validation and Stripe webhook signature verification.
