# ERP Project Kickstart COMPLETED TODO

This document tracks the completed development phases for the Elysium Rising mmorPg (ERP). Tasks are moved here from `TODO.md` once finalized.

---
*Updated: 2026-03-01*

## REC_2: Game Loop 2.0 (The Towers of Elysium)
- [x] **2.0 — Loop A: Overworld / Hub (Skeleton & Framework)** *(Ref: `docs/recs/2.0_GAME_LOOP.md`)*
- [x] **2.1 — Loop A: Overworld / Hub (Detailed Implementation)** *(Ref: `docs/recs/2.1_OVERWORLD_HUB.md`)*
  - [x] **Atmospheric Battle Banner (PixiJS)** *(Ref: `docs/recs/2.1.1_ATMOSPHERIC_BATTLE_BANNER.md`)*
 - [x] **2.2.0 — Investigations & Infrastructure**

## Book Processing Post Processing Stuff
- [x] **Book Processing Phase 3** (all changes via `psql` against the live DB)  
  - [x] Check for some consolidation and cleanup (realize entities from other books might be different.)
  - [x] Check for missing data in the locations tables, entity tables (e.g. base description, emotional state, sounds, smells, equipment, abilities). If missing, generate and INSERT/UPDATE via SQL.

## Phase 7: Onboarding, Profiles & Initial Admin 🧭
- [x] **7.1 — Database Migration** *(RECS §10, SCHEMA §1-10)*
- [x] **7.2 — Backend Auth Middleware** *(RECS §2.3, FR-2.11 through FR-2.15)*
- [x] **7.3 — Player Profile System (API & UI)** *(RECS §3.2, FR-3.7 through FR-3.12, §5.3)*
- [x] **7.4 — Character System API** *(RECS §4.3, FR-4.8 through FR-4.11)*
- [x] **7.5 — Frontend: Splash Page** *(RECS §5.1, FR-5.1 through FR-5.7)*
- [x] **7.6 — Frontend: Onboarding Flow** *(RECS §5.2, FR-5.8 through FR-5.26)*
- [x] **7.7 — Frontend: Home Base** *(RECS §5.3, FR-5.27 through FR-5.31)*
- [x] **7.8 — Server Config System** *(RECS §8, FR-8.1 through FR-8.12)*
- [x] **7.9 — Support Ticket System** *(RECS §6, FR-6.1 through FR-6.20)*
- [x] **7.10 — Admin: User Management** *(RECS §7, FR-7.1 through FR-7.14)*
- [x] **7.11 — Activity Events & Audit Log** *(RECS §9, FR-9.1 through FR-9.17)*
- [x] **7.12 — Harden Admin Auth** *(RECS §2.2, FR-2.7 through FR-2.10)*
- [x] **7.13 — Onboarding & Admin: Polishing & Refinements**
- [x] **7.14 — Styling, Theming & Lore Alignment**
  - Created: `docs/SUMMARY_MARKETING.md`, `docs/BOOKS_SUMMARY.md`, `docs/STYLE_GUIDE.md`, `docs/CHARACTER_GUIDE.md`, `docs/ENVIRONMENT_GUIDE.md`, `docs/ANNOUNCEMENT.md`
  - Full CSS variable refactor (17 files, crimson/cyan palette from book cover)
  - Lore rewrite: Splash + About pages updated from generic fantasy to sci-fi cosmic horror
  - Character class rename: Sentinel→Engineer, Arcanist→Conduit, Wanderer→Drifter, Invoker→Vessel
  - DB migration: `db/009_rename_classes.sql`
  - Tests updated: SplashPage.test.tsx, AboutPage.test.tsx

## Phase 6: Book Processing 📚
- [x] Create requirements for the Book processor (recs/BOOK_AGENT_READER.md)
- [x] Create Book processor
- [x] Add in DB_INIT bit to the BOOK processor to create tables from the .sql script if not already there.
- [x] Issue at the end of parsing Book 1 resolution.
- [x] Add a pause between books, ask to continue, change model, or exit.
- [x] Verify that a pause occurs at the end of the Phase 1 to Phase 2 transition.
- [x] Update requirements for "mini-bosses" and "big boss" identification.
- [x] Create a dump table CSV export system.
- [x] Execute processing and load to DB (Phase 1 & 2 - extract and split the text).

## Phase 5: CI/CD & Deployment 🤖
- [x] **Google Cloud Build Integration** (Migrated from GitHub Actions).
- [x] Automated deployments to Cloud Run via Cloud Build.
- [x] Update ENV and manual deploy scripts for GCP.
- [x] Review and implement testing frameworks across the stack.

## Phase 4: Manual Deployment & Cloud Connectivity 🚀
- [x] Manual GCP Deployment scripts and initial push.
- [x] Cloud SQL Connectivity & Security (SSL, IAM, Auth Proxy).
- [x] DNS Setup and Firebase authorized URL updates.

## Phase 3: Containerization & Local Dev 🐳
- [x] Dockerize Backend, Frontend, and Admin services.
- [x] Orchestration via `docker-compose.yml`.

## Phase 2: "Hello World" Implementation 🚀
- [x] Backend API (Python/FastAPI) skeleton.
- [x] Frontend & Admin (React/TS) skeletons.
- [x] Firebase Auth (Google SSO) login flows.
- [x] Initial local server testing.

## Phase 1: Infrastructure & Project Structure 🏗️
- [x] Define Directory Structure.
- [x] Google Cloud Platform Setup (Project, APIs, Cloud SQL).
- [x] Authentication & Security (Firebase, Stripe setup).
- [x] Environment Configuration (.env.example templates).
