# ERP Project Roadmap

This roadmap outlines the development phases for the Elysium Rising mmorPg (ERP).

## Phase 0: Foundation & Infrastructure (Current) 🏗️
*Goal: Establish the technical baseline and project environment.*
- [x] **Infrastructure Setup:** GCP Project, Cloud SQL (Postgres), Cloud Run, and Secret Manager.
- [x] **Authentication:** Firebase/Google SSO integration.
- [x] **Scaffolding:** 
    - [x] Python/FastAPI Backend skeleton.
    - [x] React/Vite Frontend & Admin skeleton.
    - [x] Dockerization and Google Cloud Build CI/CD.
- [ ] **Documentation:** Finalize Requirements, Architecture, and initial Data Models.

## Phase 1: Core Loop & Immersion (Alpha) 🎮
*Goal: A playable vertical slice focusing on narrative-driven clicking.*
- [ ] **Initial Development:**
    - [ ] Implementation of the Incremental Clicker Engine.
    - [ ] Basic graphics and UI (placeholders/manually curated assets).
- [ ] **Narrative Integration:**
    - [ ] Eleven Reader API integration for chapter playback.
    - [ ] Real-time text display synced with narration.
    - [ ] Story progression for the first full gameplay loop (Book 1, Chapter 1).
- [ ] **Progression Gating:** 
    - [ ] Implementation of the 1x speed time-box requirement.

## Phase 2: Social & Expansion (Beta) 🌐
*Goal: Transitioning from a single-player clicker to an MMORPG experience.*
- [ ] **MMORPG Mechanics:**
    - [ ] "Home Base" implementation for character management and socializing.
    - [ ] Second gameplay loop and expanded narrative nodes.
- [ ] **Social Integration:**
    - [ ] Discord API integration for global and chapter-specific chat.
    - [ ] Cross-platform Leaderboards.
- [ ] **Extended Systems:**
    - [ ] Character Selection and basic equipment system.
    - [ ] Achievement tracking with Google Play integration.

## Phase 3: AI Augmentation & Monetization 🚀
*Goal: Polishing the experience with dynamic assets and processing payments.*
- [ ] **AI Asset Engine:**
    - [ ] SUNO music generation (caching and randomized playlists).
    - [ ] AI image generation for characters/enemies (cached and shared).
- [ ] **Monetization:**
    - [ ] Stripe integration for microtransactions, subscriptions, and donations.
- [ ] **Admin Sovereignty:**
    - [ ] Full Admin UI for user management, refund processing, and character editing.
- [ ] **Mobile and STEAM:**
    - [ ] Create Android and Apple play games variants. Create Steam variants (integrate with those payment processors)
