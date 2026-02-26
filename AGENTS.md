# Agents

This file contains specific mandates for agents working on the ERP project.

## Project Structure
- `backend/`: Python (FastAPI) server managing game logic, scoring, and DB access.
- `db/`: SQL scripts for schema creation, seed data, and migrations.
- `frontend/`: React-based web app for players (Clicker + Audio integration).
- `admin/`: Internal React dashboard for game management.
- `docs/`: Technical documentation, API specs, and design assets.
- `infra/`: Configuration for Docker, GitHub Actions, and Google Cloud.

## Core Mandates
1. **Security First:** Use Google SSO via Firebase. Never commit `.env` files.
2. **Containerization:** All services must be deployable via Docker and Cloud Run.
3. **Lore Accuracy:** All game content must be derived from `../Books/BOOKS.md`.

## Documentation
- **Roadmap & Progress:** `@docs/TODO.md`
- **Architecture & Stack:** `@docs/ARCHITECTURE.md`
- **Functional Requirements:** `@docs/REQUIREMENTS.md`
- **Infrastructure Setup:** `@docs/INIT_INFRA.md`
- **Book Reference:** `@../Books/BOOKS.md`
