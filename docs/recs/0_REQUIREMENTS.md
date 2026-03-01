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

## 2. Core Gameplay Mechanics (Three-Loop Architecture)
The primary goal of ERP is to provide an immersive environment where players **read the book series while playing the game**. The architecture is built on three interconnected loops that balance active play, passive progression, and overworld strategy. The initial design and implementation will be to put these frameworks into place. Population and expansion of these into the full story and components related to the story should be described (e.g. start with 4 basic classes, but allow ability to add more as time progresses. Start with 4 skills. 4 enemy types, etc.. - however a process to expand those as they become defined and tooling to extract and create them (from the extracted book contents)).
### 2.1 Loop A: Overworld / Hub (Strategy & Navigation)
- [ ] **Requirements:** [2.0_GAME_LOOP.md](2.0_GAME_LOOP.md) 
- [ ] **UI/UX Design Requirements:** Need to define what these look like (use the 2.0 GAME LOOP bits as a starting point)

### 2.1 Loop A: Overworld / Hub (Strategy & Navigation)
- [ ] **Chapter-Based Progression:** The game is divided into levels matching chapters from the *Towers of Elysium* trilogy.
- [ ] **Node-Based Map:** A "Chronicle-style" interactive map showing chapter and scene progression.
- [ ] **Centralized Interface:** Access point for story mode, idle training, shops, and social features.
- [ ] **Home Base Hub:** Display collections, leaderboard standings, and a personal journal of uncovered story beats.
- [ ] **Visual Feedback:** Side-scrolling animated battle banner (pixel art style) providing atmospheric feedback of character growth.

### 2.2 Loop B: Story Mode / Clicker Combat (Active Play)
- [ ] **The Reading & Listening Experience:** 
    - [ ] **Eleven Reader Integration:** The core of Story Mode is the audiobook narration. Users listen to the book series while playing the game.
    - [ ] **Synced Text Overlay:** Story text scrolls and appears paragraph-by-paragraph in real-time, synced with Eleven Reader audio, allowing users to read along.
    - [ ] **Cinematics:** Chapter-ending cutscenes (final boss victory) detailing the book's action with high-fidelity on-screen text overlays.
    - [ ] **Copy Protection:** Story text rendered as images (Kindle-style) to prevent unauthorized extraction.
- [ ] **Combat Engine:** "Clicker Heroes-style" enemy-centric combat with waves and prominent HP bars.
- [ ] **Boss System:**
    - [ ] **Mini-Bosses:** Scene-end encounters with enrage timers and unique lore-based abilities.
    - [ ] **Chapter Bosses:** Major multi-phase encounters featuring target zones and skill-based checks.
- [ ] **Strict Narrative Gating:** 
    - [ ] **Audio-Linked Progression:** Users **cannot fight the boss** (even if they have defeated enough minions) or advance to the next node until the corresponding audiobook segment has finished playing.
    - [ ] **Timer-Based Gate:** The gate is strictly tied to the 1x playback duration of the segment. Even if the user mutes the audio or does not actively listen, they must wait for the full segment duration to pass on their first playthrough.
- [ ] **AI-Driven Visuals:** 
    - [ ] Use AI (Stable Diffusion/DALL-E) to generate character and enemy designs from book descriptions.
    - [ ] **Asset Caching:** Globally shared cache for AI assets to ensure consistency and minimize API costs.
- [ ] **Animations & VFX:** Idle, damage, and death animations for all entities; specific spell effects for player abilities.
- [ ] **Narrative Gating:** Progression synced with audio duration; players cannot advance nodes faster than 1x playback speed.

### 2.3 Loop C: Idle Training (Passive Progression)
- [ ] **Skill-Based Growth:** "Melvor Idle-style" passive training system for combat, magic, and utility skills.
- [ ] **Background Execution:** Training continues offline and while playing Story Mode.
- [ ] **Session Floor:** Idle Training levels determine the "base stats" and power floor for Story Mode sessions.
- [ ] **Manual Advancement:** Users can select only one skill at a time to train. The training rate is like Melvor Idle. However, users can also click into the skill itself and play clicker versions of the skill game to advance the training further. Gold earned during these sessions (enemies they encoutner come from the pool of any enemies they've unlocked up to that point in the books), gives a percentage boost (after exiting). So for example the idle level up time is 5 hours. If a user actively plays and earns gold/defeats levels - if they make it to level 500 in the manual mode, then 100% of the remaining time to level up would be gained (or something to that effect).

### 2.4 Character & Progression Systems, Classes, and Skills
- [ ] **Core Stats:** Strength, Agility, and Intelligence derived from the book's power system. Should be related to things found in the book.
- [ ] **Inventory System:** Equipment slots (Weapon, Armor, Trinkets) with color-coded rarity tiers. Should be related to things found in the book.
- [ ] **Dual Leveling:** 
    - [ ] **Character XP:** Permanent growth via Idle Training and Story completion.
    - [ ] **Chapter XP:** Progression tracking through the Tower's narrative.
- [ ] **Prestige (NG+):** Higher difficulty loops with scaled enemies, palette swaps, and exclusive rewards.
- [ ] **Classes:** Character classes have all different skills and abilities (base). Shoudl be related to components within the book.
- [ ] **Skill System:** Skills need to be based off of skills found in the books. Skill names, effects, need to be designed to encompass the full story.

### 2.5 Audio & Music Integration
- [ ] **Audiobook Narration (Eleven Reader):** 
    - [ ] Real-time streaming of audio books corresponding to the active chapter/scene.
    - [ ] **Playback Tracking:** Server-side tracking of audio progress to enforce the narrative gate.
    - [ ] **Replay Flexibility:** Once a segment has been completed at 1x speed, subsequent playthroughs allow for faster progression and optional audio.
- [ ] **Dynamic Music:** SUNO-generated thematic playlists that rotate based on chapter mood.
- [ ] **Tactile SFX:** Distinct sounds for clicks, crits, enemy defeats, and UI interactions.

### 2.6 Economy & Anti-Cheat
- [ ] **Dual Economy:** Permanent resources (Elysium Essence) for training vs. temporary session gold for clicker upgrades.
- [ ] **Advanced Anti-Cheat:** 
    - [ ] **Behavioral Detection:** System must distinguish between human mouse movements/click patterns and automated macros/bots.
    - [ ] **Server Validation:** Real-time validation of click rates, damage calculations, and playback-based gating.


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
