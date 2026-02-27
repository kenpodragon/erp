# AGENTS.md: Project ERP Mission Control

You are an agent working on **ERP (Elysium Rising mmorPg)**, a browser-based incremental MMORPG based on the *Towers of Elysium* book trilogy. 

## 🌌 The Mission
To build a high-fidelity, narrative-driven incremental game that serves as a gateway to the Elysium Rising universe, leveraging audio-book immersion and competitive social mechanics.

## 🛠️ Tech Stack Mandates
- **Frontend:** React + Vite + TypeScript. (Use **Vanilla CSS** for styling).
- **Backend:** Python + FastAPI + SQLModel/SQLAlchemy.
- **Database:** PostgreSQL (Cloud SQL).
- **Auth:** Firebase (Google SSO).
- **Payments:** Stripe.
- **DevOps:** Docker, GitHub Actions, Google Cloud Run.

## 📁 Directory Structure & Ownership
- `/backend`: API, Game Logic, DB Models, Stripe Webhooks.
- `/frontend`: Player-facing React app, Audio streaming, Clicker UI.
- `/admin`: Internal management dashboard.
- `/db`: SQL migrations, seeding scripts for lore/enemies. Any SQL dhanges must be created as .SQL files in this folder. They will be manually run on the server.
- `/docs`: All technical, architectural, and requirement specs.
- `/infra`: Dockerfiles, CI/CD YAMLs, GCP Terraform (future).
- `../Books`: **Read-only** source material (ER_Kindle.docx, etc.).

## 📜 Documentation Hierarchy
When in doubt, consult these files in order:
1. `AGENTS.md`: Core mandates and structure (This file).
2. `@docs/ROADMAP.md`: High-level project phases.
3. `@docs/REQUIREMENTS.md`: What needs to be built.
4. `@docs/ARCHITECTURE.md`: How it is built.
5. `@docs/TODO.md`: What is being built *now*.
5. `@docs/INIT_INFRA.md`: Environment setup.
6. `@../Books/BOOKS.md`: Narrative source mapping.

## 🤖 Agent Operating Procedures
1. **Research First:** Always check `../Books/BOOKS.md` before designing a character or enemy to ensure lore accuracy.
2. **Surgical Updates:** When modifying requirements or TODOs, maintain the existing formatting and checkbox status.
3. **Security:** Never expose secrets. Assume any variable starting with `STRIPE_`, `FIREBASE_`, or `DB_` is sensitive.
4. **Validation:** Every feature implementation must be accompanied by an update to the `TODO.md` and verification of the technical requirements.

## 📖 Lore Context
The game follows the "Towers of Elysium" narrative. Every chapter in the books represents a "Level" in the game. Characters, enemies, and atmosphere must reflect the specific chapter the player is currently in.
- **Reference:** [Towers of Elysium Series](https://does-god-exist.org/towers-of-elysium/)
