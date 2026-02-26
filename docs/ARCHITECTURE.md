# ERP Architecture

This document describes the technical architecture of the Elysium Rising mmorPg (ERP).

## Technical Stack

### Backend
- **Language:** Python
- **Framework:** FastAPI
- **Responsibility:** Game logic, scoring, leaderboards, and database management.

### Frontend (Player UI)
- **Framework:** React (Vite)
- **Styling:** Vanilla CSS (preferred)
- **Responsibility:** Core gameplay (incremental clicker), audio integration, and player profile management.

### Admin Dashboard
- **Framework:** React (Vite)
- **Responsibility:** Managing game state, users, and narrative triggers.

### Database
- **Provider:** Google Cloud SQL
- **Engine:** PostgreSQL
- **Schema Management:** SQL scripts in `db/` folder.

### Authentication & Social
- **Provider:** Firebase Authentication (Google SSO)
- **Integration:** Google Play Games Services for achievements.
- **Social:** Discord API for chat and community features.

### Infrastructure & Deployment
- **Containerization:** Docker (separate containers for frontend, backend, and admin).
- **Hosting:** Google Cloud Run.
- **CI/CD:** GitHub Actions.
- **Secrets:** Google Secret Manager.

## Service Interaction
1. **Frontend** communicates with **Backend** via REST API.
2. **Backend** interacts with **PostgreSQL** for persistent state.
3. **Authentication** is verified on the Backend using Firebase Admin SDK.
