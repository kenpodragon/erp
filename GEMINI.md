# Gemini CLI Project Mandates & Permissions

You MUST strictly adhere to these instructions. This file takes precedence over general defaults. `AGENTS.md`: Project-wide mission control and should be used as the main reference.

## 🛡️ Core Permissions
- **Read Access:** Full access to `/backend`, `/frontend`, `/admin`, `/db`, `/docs`, `/infra`, `/tools`, and `/testing`.
- **Read-Only:** Files in `../Books` are for narrative reference only. NEVER attempt to modify them.
- **Write Access:** Allowed to modify code in `/backend`, `/frontend`, `/admin`, `/db`, `/infra`, `/tools`, and `/testing`.
- **Database:** Only apply changes via `.sql` files in `/db`. Follow `@docs/inst/DB_MIGRATIONS.md` and update `db/data_dictionary.md` accordingly.
    - **Connection Mandate:** ALWAYS PULL database connection strings and credentials directly from `/backend/.env`. NEVER hardcode, log, or print these values. Make sure you create `.sql` files for any Non-programming data specific database operations for the underlying data (e.g. seeding new characters, INSERT/UPDATE/DELETE) so these can be tracked and maintained. `psql` is available, remember to use localhost as the local DB server.
- **Shell Commands:** Allowed to run tests (`pytest`, `vitest`, `playwright`), build commands (`python`, `npm run build`, `docker-compose`), and database migrations.

## 🤖 Agent Operating Procedures
1. **Lore Research:** Always consult the compressed lore guides in `docs/lore/` (e.g., `BOOKS_SUMMARY.md`, `CHARACTER_GUIDE.md`) first. If the required information is missing or ambiguous, refer to the full `../Books/BOOKS.md`. If you find new or conflicting information in `BOOKS.md`, you MUST update the corresponding lore guide in `docs/lore/` to maintain it as the primary, high-signal reference.
2. **Surgical Updates:** Maintain existing formatting and checkbox status in `TODO.md` and requirements.
3. **Security:** NEVER print, log, or commit secrets (STRIPE_*, FIREBASE_*, DB_*).
4. **Validation:** Every feature/bug fix MUST have a corresponding test.
5. **Testing First:** Run `testing/run_tests.bat` (Win) or `testing/run_tests.sh` (Linux) before concluding a task.

## 🧪 Testing Commands
- **Backend:** `pytest` in `/backend` (use `pyton -m pytest` since pytest isn't installed)
- **Frontend/Admin:** `npm test` in respective directories.
- **System-wide:** `testing/run_tests.bat` (Windows)

## 📚 Reference Documentation
1. `AGENTS.md`: Project-wide mission control.
2. `@docs/inst/TESTING.md`: Detailed testing protocols.
3. `@docs/ARCHITECTURE.md`: Technical stack details.
4. `@docs/inst/CODING_GUIDE.md`: Backend coding standards and module conventions.

## NOTES
1. As permissions are requested, keep track of them and help provide a list of updates to gemini.md so that permission settings can be maintained and updated.
---
*For any ambiguity or high-risk operation, ask for confirmation first.*
