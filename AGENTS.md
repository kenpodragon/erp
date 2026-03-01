# AGENTS.md: Project ERP Mission Control

You are an agent working on **ERP (Elysium Rising mmorPg)**, a browser-based incremental MMORPG based on the *Towers of Elysium* book trilogy. 

## 🌌 The Mission
To build a high-fidelity, narrative-driven incremental game that serves as a gateway to the Elysium Rising universe, leveraging audio-book immersion and competitive social mechanics.

## 🛠️ Tech Stack Mandates
- **Frontend:** React + Vite + TypeScript. (Use **Vanilla CSS** for styling).
- **Backend:** Python + FastAPI + SQLModel/SQLAlchemy.
- **Database:** PostgreSQL (Cloud SQL) for all development. A local `test.db` (SQLite) is used **only** for mocking unit tests.
- **Auth:** Firebase (Google SSO).
- **Payments:** Stripe.
- **DevOps:** Docker, **Google Cloud Build**, Google Cloud Run.

## 🧪 Testing Mandates
All code changes must be verified locally before pushing to the cloud. **Refer to `@docs/inst/TESTING.md` for the full guide.**
- **Backend:** Tests reside in `/backend/tests`. Use `pytest`. Every new feature or bug fix requires a corresponding test case.
- **Frontend/Admin:** Use **Vitest** + **React Testing Library** for component/unit tests. Tests should be named `*.test.tsx` and reside next to the component.
- **UI/UX E2E:** Use **Playwright** for system-wide flow verification. Tests reside in `/testing`.
- **Local Runner:** Use `testing/run_tests.bat` (Windows) or `testing/run_tests.sh` (Linux/Mac) to verify the entire stack in isolated Docker containers.

## 📝 Documentation & Process Mandates
- **Document Splitting:** Core features must have separate **Requirements** (`recs/*_RECS.md`) and **Schema** (`recs/*_SCHEMA.md`) files within the `docs/recs/` directory.
- **Code-Doc Sync:** Any functional change in the codebase **must** be reflected in the corresponding requirements document.
- **Task Lifecycle:**
    - **Active Work:** All in-progress tasks must be marked as unchecked in `docs/TODO.md`.
    - **Completion:** When a task is finished, check it off in both `docs/TODO.md` and the specific feature requirements in `docs/recs/`.
    - **Finalization:** Move **entire blocks/sections** of functionality from `docs/TODO.md` to `docs/DONE.md` only when the entire phase or feature set is 100% complete and verified.

## 📁 Directory Structure & Ownership
- `/backend`: API, Game Logic, DB Models, Stripe Webhooks.
- `/frontend`: Player-facing React app, Audio streaming, Clicker UI.
- `/admin`: Internal management dashboard.
- `/db`: SQL migrations, seeding scripts for lore/enemies. Any SQL changes must be created as .SQL files in this folder. **Refer to `@docs/inst/DB_MIGRATIONS.md` for applying changes.**
- `/docs`: All technical, architectural, and requirement specs.
- `/infra`: Dockerfiles, Cloud Build YAMLs, Deployment scripts.
- `/init`: Book processor and initial data ingestion tools.
- `/testing`: Unified test runners and system-wide E2E tests.
- `../Books`: **Read-only** source material (ER_Kindle.docx, etc.).

## 📜 Documentation Hierarchy
When in doubt, consult these files in order:
1. `AGENTS.md`: Core mandates and structure (This file).
2. `@docs/TODO.md`: What is being built *now*.
3. `@docs/DONE.md`: Everything that's been done so far.
4. `@docs/ROADMAP.md`: High-level project phases.
5. `@docs/recs/0_REQUIREMENTS.md`: What needs to be built.
6. `@docs/ARCHITECTURE.md`: How it is built.
7. `@docs/inst/DB_MIGRATIONS.md`: How to apply database updates.
8. `@docs/inst/TESTING.md`: How to test the system.
9. `@docs/inst/INIT_INFRA.md`: Environment setup.
10. `@../Books/BOOKS.md`: Narrative source mapping.

## 🤖 Agent Operating Procedures
1. **Research First:** Always check `../Books/BOOKS.md` before designing a character or enemy to ensure lore accuracy.
2. **Surgical Updates:** When modifying requirements or TODOs, maintain the existing formatting and checkbox status.
3. **Security:** Never expose secrets. Assume any variable starting with `STRIPE_`, `FIREBASE_`, or `DB_` is sensitive.
4. **Validation:** Every feature implementation must be accompanied by an update to the `TODO.md`, verification of the technical requirements in `docs/recs/`, and checking off completed items.
5. **Testing First:** Run `testing/run_tests.bat` before pushing to `main`. If you add a feature, you **must** add a corresponding test in the appropriate test directory.
6. **SQL Migrations:** When applying `.sql` files to production, follow the procedure in `@docs/inst/DB_MIGRATIONS.md` (using `psql` and connection strings from `backend/.env`).
7. **Clean Handover:** Ensure `TODO.md` reflects exactly what is left to do, and `DONE.md` reflects a verified history of completion. Move **entire blocks** only when fully complete.

## 📖 Lore Context
The game follows the "Towers of Elysium" narrative. Every chapter in the books represents a "Level" in the game. Characters, enemies, and atmosphere must reflect the specific chapter the player is currently in.
- **Reference:** [Towers of Elysium Series](https://does-god-exist.org/towers-of-elysium/)
