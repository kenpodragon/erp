# ERP Project Kickstart TODO

This document tracks the initial setup and development phases for the Elysium Rising mmorPg (ERP).

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
- [ ] **Environment Configuration**
  - [ ] Create `.env.example` templates for all services.
  - [ ] Update .gitignore to not track any .env files for all services.
  - [ ] Create local `.env` files for all services to secrets can be added and initial testing can be created.

## Phase 2: "Hello World" Implementation 🚀
- [ ] **Backend API (Python/FastAPI)**
  - [ ] Initial `/health` and `/hello` endpoints.
  - [ ] Basic SQLModel/SQLAlchemy setup for Postgres connection.
  - [ ] Secure PGSQL connection from local enviroment. (Add user other than pgsql)
  - [ ] Firebase Admin SDK integration for token validation.
- [ ] **Frontend UI (React/TS)**
  - [ ] Scaffold with Vite.
  - [ ] Implement Firebase Auth (Google SSO) login flow.
  - [ ] Basic "Hello World" dashboard.
- [ ] **Admin UI (React/TS)**
  - [ ] Scaffold with Vite.
  - [ ] Basic dashboard for managing game state/users.

  ## Phase 3: Containerization & Local Dev 🐳
- [ ] **Dockerize Services**
  - [ ] Create `Dockerfile` for `backend/`.
  - [ ] Create `Dockerfile` for `frontend/`.
  - [ ] Create `Dockerfile` for `admin/`.
- [ ] **Orchestration**
  - [ ] Create `docker-compose.yml` for local multi-container development.
  - [ ] Ensure local networking between Backend and Frontend.

## Phase 4: Manual Deployment & Cloud Connectivity 🚀
- [ ] **Manual GCP Deployment**
  - [ ] Build and Push Backend, Frontend, and Admin images to Artifact Registry.
  - [ ] Deploy services to Cloud Run via `gcloud` CLI (us-east1).
- [ ] **Cloud SQL Connectivity & Security**
  - [ ] Configure Cloud SQL instance to allow Cloud Run connections (IAM/VPC).
  - [ ] Implement and verify secure SSL connection between Cloud Run and Cloud SQL.
  - [ ] Set up Cloud SQL Auth Proxy for local secure testing if needed.
  - [ ] Update PostgreSQL security (Service Account permissions and DB users).

## Phase 5: CI/CD & Deployment 🤖
- [ ] **GitHub Actions**
  - [ ] Create `.github/workflows/deploy.yml`.
  - [ ] Workflow: Build Docker images -> Push to Google Artifact Registry -> Deploy to Cloud Run.
- [ ] **Deployment Documentation**
  - [ ] Create `DEPLOY.md` with step-by-step instructions for manual and automated deploys.

## Phase 6: Narrative Integration (The "ERP" Core) 📚
- [ ] **Book Processing**
  - [ ] Implement utility to read/parse `.docx` files from `../Books`.
  - [ ] Design DB schema for Chapters, Enemies, and Narrative triggers.
  - [ ] Create Agentic AI book parser - break the book into chapters and story beats. From there create characters and enemies (based on existing characters or enamies), unique locations from the chapters. Generate new characters (with animations). Generate new sound effect. Generate new background music. Generate Eleven Reader snipping (for the part of the chatper/book).
- [ ] **Audio Integration**
  - [ ] Research Eleven Reader API for streaming background audio.
  - [ ] Research Eleven SUNO API for streaming background audio.

---
*Last Updated: 2026-02-26*
