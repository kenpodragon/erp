# ERP Project Kickstart TODO

This document tracks the initial setup and development phases for the Elysium Rising mmorPg (ERP).

## Phase 6: Narrative Integration (The "ERP" Core) 📚
- [ ] **Book Processing**
  - [x] Create requirements for the Book processor (BOOK_AGENT_READER.md)
  - [x] Create Book processor
  - [x] Add in DB_INIT bit to the BOOK processor to create tables from the .sql script if not already there.
  - [ ] Execute processing and load to DB (Phase 1 - extract and split the text).
  - [x] Issue at the end of parsing Book 1. It got stuck trying to start Book 2 (kept cycling). Had to abort the process. The good news was that when it restarted it had kept the 90/90 process, adn it jumped into processing again once restarted. Looks like book2 to book 3 same issue. Likes its phase 1 processing the same book again.
  - [x] Add a pause between books, ask to continue, change model, or exit...
  - [x] Verify that a pause occurs at the end of the Phase 1 to Phase 2 transition.
  - [x] Update requirements a bit to identify "mini-bosses" and "big boss" for the chapter. These should be specific entities in the scenes (one mini-boss per scene), and one big boss per chapter. (Should contain canonical references to the text and something the mini-boss or BIG boss would say or do - how this variant of them is different than the regular entity entry for the scene/chapter).
  - [ ] Create a dump table CSV export or something that can be used to import/export data from the DB (save these for future initialization in other DBs - can be CSVs or other files that would be loaded in, along with a python script to load them).
  
 - [ ] **Book Processing Phase 3**
  - [ ] Add in some hidden/secret enemies Variants of ********** (ranging from class E -> Class SS). Generate these as book relevant characters (get all the big-bosses and come up with a chaotic/cosmic horror mesh as a description). 
  - [ ] Check for missing data in the locations tables, entitiy tables (e.g. base description, emotional state, sounds, smells, equipment, abiliites). If missing generate. 


  
  
  
  
  
  
  
  ## Phase Later
  - [ ] **MISC**
    - [ ] Clean up text, lots of the ******** from when I left page breaks in there. There's also the introductory bits (copyright pages - chapter 1 for each book). Might want to keep it, maybe just skip it or use as an easter egg (what the hell is this crap - as part of the tutorial or something - also need to see where the TOC went in all of this).
  - [ ] **Sound effects**
    - [ ] Generate new sound effect. Generate new background music. Generate Eleven Reader snipping (for the part of the chatper/book).
  - [ ] **Audio Integration**
    - [ ] Research Eleven Reader API for streaming background audio.
    - [ ] Research Eleven SUNO API for streaming background audio.

## BGL: Before Going Live
- [ ] **Security Testing**


---
*Last Updated: 2026-02-26*

## Phase 1: Infrastructure & Project Structure 🏗️
- [x] **Define Directory Structure**
  - [x] `backend/`: Python API (FastAPI)
  - [x] `db/`: Database scripts and migrations
  - [x] `frontend/`: React (Vite) User Interface
  - [x] `admin/`: React (Vite) Administrative Interface
  - [x] `docs/`: Project documentation and design specs
  - [x] `infra/`: Docker, GitHub Actions, and GCP configuration
- [ ] **Google Cloud Platform Setup**
  - [x] Create docs/INIT_INFRA.md guide.
  - [x] Create GCP Project.
  - [x] Enable Cloud Run, Cloud SQL, and Secret Manager APIs.
  - [x] Provision a PostgreSQL instance on Cloud SQL.
- [x] **Authentication & Security**
  - [x] Setup Firebase Project for Google SSO.
  - [x] Setup Stripe Account and API Keys (Publishable, Secret, Webhook).  
- [x] **Environment Configuration**
  - [x] Create `.env.example` templates for all services.
  - [x] Update .gitignore to not track any .env files for all services.
  - [x] Create local `.env` files for all services to secrets can be added and initial testing can be created.

## Phase 2: "Hello World" Implementation 🚀
- [x] **Backend API (Python/FastAPI)**
  - [x] Initial `/health` and `/hello` endpoints.
  - [x] Basic SQLModel/SQLAlchemy setup for Postgres connection.
  - [x] Secure PGSQL connection from local enviroment. (Add user other than pgsql)
  - [x] Firebase Admin SDK integration for token validation.
- [x] **Frontend UI (React/TS)**
  - [x] Scaffold with Vite.
  - [x] Implement basic backend ping functionality.
  - [x] Implement Firebase Auth (Google SSO) login flow.
  - [x] Basic "Hello World" dashboard.
- [x] **Admin UI (React/TS)**
  - [x] Scaffold with Vite.
  - [x] Implement basic backend ping functionality.
  - [x] Implement Firebase Auth (Google SSO) login flow. Ensure that only named google account can login (maybe add IP restriction as well - store these in .env)
  - [x] Basic dashboard for managing game state/users.
- [x] **Run the local servers/services from the command lines and test**
  - [x] Backend Runs and starts without error. Can ping the Cloud PGSQL without error.
  - [x] Frontend UI runs and starts without error. Can ping Backend through dummy API call without error.
  - [x] Admin UI runs and starts without error. Can ping the Backend through the dummy API call without error.

  ## Phase 3: Containerization & Local Dev 🐳
- [x] **Dockerize Services**
  - [x] Create `Dockerfile` for `backend/`.
  - [x] Create `Dockerfile` for `frontend/`.
  - [x] Create `Dockerfile` for `admin/`.
- [x] **Orchestration**
  - [x] Create `docker-compose.yml` for local multi-container development.
  - [x] Ensure local networking between Backend and Frontend.

## Phase 4: Manual Deployment & Cloud Connectivity 🚀
- [x] **Manual GCP Deployment**
  - [x] Build and Push Backend, Frontend, and Admin images to Artifact Registry.
  - [x] Deploy services to Cloud Run via `gcloud` CLI (us-east1).
  - [x] Create a script to push the cloud manually (put it in infra folder). As part of the script, extract the variables & secrets from the .env viles and set those for the gcloud instances.
  - [x] Fix issues with the deployed environments.
- [x] **Cloud SQL Connectivity & Security**
  - [x] Configure Cloud SQL instance to allow Cloud Run connections (IAM/VPC).
  - [x] Implement and verify secure SSL connection between Cloud Run and Cloud SQL.
  - [x] Set up Cloud SQL Auth Proxy for local secure testing if needed.
  - [x] Update PostgreSQL security (Service Account permissions and DB users).
  - [x] Setup DNS (so these names don't change each deploy).
  - [x] Setup Wordpress DNS update to point to the frontend/admin servers (to point to the Cloud Run environments).
  - [x] Update Firebase with approved URLs for the new DNS entries.

## Phase 5: CI/CD & Deployment 🤖
- [x] **GitHub Actions**
  - [x] Create `.github/workflows/deploy.yml`.
  - [x] Test out the deployment process (commit to GIT and ensure that the cloud runs are activated)  
- [x] **Deployment Documentation**
  - [x] Create `DEPLOY.md` with step-by-step instructions for manual and automated deploys. Include localhost running, docker-compose, and the new script to push to gcloud.

