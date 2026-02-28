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
- **DevOps:** Docker, **Google Cloud Build**, Google Cloud Run.

## 🧪 Testing Mandates
All code changes must be verified locally before pushing to the cloud. **Refer to `@docs/TESTING.md` for the full guide.**
- **Backend:** Tests reside in `/backend/tests`. Use `pytest`. Every new feature or bug fix requires a corresponding test case.
- **Frontend/Admin:** Use **Vitest** + **React Testing Library** for component/unit tests. Tests should be named `*.test.tsx` and reside next to the component.
- **UI/UX E2E:** Use **Playwright** for system-wide flow verification. Tests reside in `/testing`.
- **Local Runner:** Use `testing/run_tests.bat` (Windows) or `testing/run_tests.sh` (Linux/Mac) to verify the entire stack in isolated Docker containers.

## 📁 Directory Structure & Ownership
- `/backend`: API, Game Logic, DB Models, Stripe Webhooks.
- `/frontend`: Player-facing React app, Audio streaming, Clicker UI.
- `/admin`: Internal management dashboard.
- `/db`: SQL migrations, seeding scripts for lore/enemies. Any SQL changes must be created as .SQL files in this folder. **Refer to `@docs/DB_MIGRATIONS.md` for applying changes.**
- `/docs`: All technical, architectural, and requirement specs.
- `/infra`: Dockerfiles, Cloud Build YAMLs, Deployment scripts.
- `/testing`: Unified test runners and system-wide E2E tests.
- `../Books`: **Read-only** source material (ER_Kindle.docx, etc.).

## 📜 Documentation Hierarchy
When in doubt, consult these files in order:
1. `AGENTS.md`: Core mandates and structure (This file).
2. `@docs/ROADMAP.md`: High-level project phases.
3. `@docs/REQUIREMENTS.md`: What needs to be built.
4. `@docs/ARCHITECTURE.md`: How it is built.
5. `@docs/DB_MIGRATIONS.md`: How to apply database updates.
6. `@docs/TESTING.md`: How to test the system.
7. `@docs/TODO.md`: What is being built *now*.
8. `@docs/INIT_INFRA.md`: Environment setup.
9. `@../Books/BOOKS.md`: Narrative source mapping.

## 🤖 Agent Operating Procedures
1. **Research First:** Always check `../Books/BOOKS.md` before designing a character or enemy to ensure lore accuracy.
2. **Surgical Updates:** When modifying requirements or TODOs, maintain the existing formatting and checkbox status.
3. **Security:** Never expose secrets. Assume any variable starting with `STRIPE_`, `FIREBASE_`, or `DB_` is sensitive.
4. **Validation:** Every feature implementation must be accompanied by an update to the `TODO.md` and verification of the technical requirements.
5. **Testing First:** Run `./run_tests.bat` before pushing to `main`. If you add a feature, you **must** add a corresponding test in the appropriate test directory.
6. **SQL Migrations:** When applying `.sql` files to production, follow the procedure in `@docs/DB_MIGRATIONS.md` (using `psql` and connection strings from `backend/.env`).

## 📖 Lore Context
The game follows the "Towers of Elysium" narrative. Every chapter in the books represents a "Level" in the game. Characters, enemies, and atmosphere must reflect the specific chapter the player is currently in.
- **Reference:** [Towers of Elysium Series](https://does-god-exist.org/towers-of-elysium/)
