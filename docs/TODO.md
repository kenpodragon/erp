# ERP Project Kickstart TODO

This document tracks the initial setup and development phases for the Elysium Rising mmorPg (ERP).

## Phase 6: Narrative Integration (The "ERP" Core) 📚
- [ ] **Book Processing**
  - [ ] Implement utility to read/parse `.docx` files from `../Books`.
  - [ ] Design DB schema for Chapters, Enemies, and Narrative triggers.
  - [ ] Create Agentic AI book parser - break the book into chapters and story beats. From there create characters and enemies (based on existing characters or enamies), unique locations from the chapters. Generate new characters (with animations). Generate new sound effect. Generate new background music. Generate Eleven Reader snipping (for the part of the chatper/book).
- [ ] **Audio Integration**
  - [ ] Research Eleven Reader API for streaming background audio.
  - [ ] Research Eleven SUNO API for streaming background audio.

## BGL: Before Going Live
- [ ] **Security Testing**
  - [ ] Remove db-check from backend to prevent database information from leaking.


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

