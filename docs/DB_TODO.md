# DB_TODO: PostgreSQL Docker Migration

## Overview
Migrate from localhost PostgreSQL to a Dockerized PostgreSQL container integrated into the existing `docker-compose.yml`. The Docker DB runs on port **5433** (host) to avoid conflicts with the local PostgreSQL on 5432.

---

## PHASE 1 — Docker PostgreSQL Service (Ephemeral, Init from SQL Scripts)

### Goal
`docker-compose up` brings up a PostgreSQL container alongside backend/frontend/admin. The DB initializes from `001`, `002`, `003` SQL scripts. Backend connects to the Docker DB. E2E tests pass.

- [x] **1.1** Create `db/deploy/` directory structure
  - [x] `db/deploy/Dockerfile` — PostgreSQL 17 image, copies init scripts
  - [x] `db/deploy/.env` — Real credentials (postgres root pw + app user pw) — **gitignored**
  - [x] `db/deploy/.env.example` — Template with placeholder values — **committed**
  - [x] `db/deploy/init-user.sh` — Shell script to create `erp_app_user` role + `erp_production` database
  - [x] `db/deploy/init-db.sh` — Shell script to run 001, 002, 003 SQL migrations in order

- [x] **1.2** Update `docker-compose.yml`
  - [x] Add `postgres` service (build from `db/`, port 5433:5432, env_file `db/deploy/.env`)
  - [x] Add `depends_on: postgres` (with `condition: service_healthy`) to `backend` service
  - [x] Add health check for postgres (pg_isready)

- [x] **1.3** Update `backend/.env`
  - [x] Change `DATABASE_URL` to point to `postgres:5432` (Docker compose service name, internal network)
  - [x] Keep `DATABASE_URL_LIVE` unchanged (Cloud SQL)

- [x] **1.4** Update `.gitignore`
  - [x] Add `db/deploy/dump.sql` to gitignore (`.env` already covered by existing rules)

- [x] **1.5** Verify
  - [x] `docker-compose up --build` — all 4 services start, postgres healthy, backend connects
  - [x] Backend connects to Docker PostgreSQL successfully (105 tables, uvicorn running)
  - [x] API endpoints work (`/docs` returns HTML, FastAPI serving)
  - [x] `testing/docker-compose-testing.yaml` — tests collect/run (pre-existing PIL import error unrelated)

### Notes
- Used PG17 (matches localhost) instead of PG16
- Fixed `003_sample_content_data.sql`: achievements `sort_order` NOT NULL, `curated_artifacts` `source_type` constraint
- Init scripts run as postgres superuser (002/003 need `session_replication_role = replica`)
- Dockerfile strips Windows CRLF line endings with `sed` during build

---

## PHASE 2 — pg_dump Workflow (Localhost -> Docker)

### Goal
Dump the localhost PostgreSQL database, bake it into the Docker image so the container starts with a full copy of local data. Provide a script to refresh the dump.

- [x] **2.1** Create `tools/refresh_dump.py`
  - [x] Runs `pg_dump` against localhost:5432 `erp_production` (reads `DATABASE_URL_LOCALHOST` from backend/.env)
  - [x] Saves dump to `db/deploy/dump.sql` (15.4 MB)
  - [x] `--rebuild` flag: stops postgres, rebuilds image, starts container

- [x] **2.2** Update `db/deploy/Dockerfile`
  - [x] Glob `COPY deploy/dump.sq[l] /sql/` — includes dump if present, no error if missing
  - [x] Dump is COPYed into the image (no mapped volumes — ephemeral rebuild)

- [x] **2.3** Update `db/deploy/init-db.sh`
  - [x] If `/sql/dump.sql` exists → restore from dump
  - [x] Otherwise → fall back to individual 001/002/003 scripts
  - [x] Always reassigns ownership to `erp_app_user` after init

- [x] **2.4** Verify
  - [x] `python tools/refresh_dump.py` — dump created from localhost (15.4 MB)
  - [x] `docker-compose build --no-cache postgres && docker-compose up -d` — restores from dump
  - [x] All 8 spot-checked tables match exactly (players=4, chapters=138, scenes=724, entities=3936, etc.)

---

## PHASE 3 — Connection String Toggle (Dev Workflow)

### Goal
Revert `backend/.env` to localhost for daily development. Provide a script to toggle between localhost and Docker DB, and to sync data.

- [x] **3.1** Update `backend/.env`
  - [x] Added `DATABASE_URL_DOCKER=postgresql://erp_app_user:<docker_pw>@postgres:5432/erp_production`
  - [x] Added `DATABASE_URL_LOCALHOST=postgresql://erp_app_user:<local_pw>@host.docker.internal:5432/erp_production`
  - [x] Set `DATABASE_URL` back to the localhost value

- [x] **3.2** Create `tools/toggle_db.py`
  - [x] `toggle_db.py docker` — sets `DATABASE_URL` = `DATABASE_URL_DOCKER`
  - [x] `toggle_db.py localhost` — sets `DATABASE_URL` = `DATABASE_URL_LOCALHOST`
  - [x] `toggle_db.py sync` — runs pg_dump, rebuilds Docker image, switches to Docker
  - [x] `toggle_db.py status` — prints current active connection
  - [x] Prints active connection after every toggle

- [x] **3.3** Update documentation
  - [x] Updated this file — all phases checked off

- [x] **3.4** Final Verification
  - [x] Toggle to localhost — confirmed active, URL uses `host.docker.internal:5432`
  - [x] Toggle to docker — confirmed active, URL uses `postgres:5432`
  - [x] Reverted to localhost for continued development

---

## Files Created/Modified

| File | Action | Phase |
|------|--------|-------|
| `db/deploy/Dockerfile` | Create | 1 |
| `db/deploy/.env` | Create | 1 |
| `db/deploy/.env.example` | Create | 1 |
| `db/deploy/init-user.sh` | Create | 1 |
| `db/deploy/init-db.sh` | Create | 1 |
| `docker-compose.yml` | Modify | 1 |
| `backend/.env` | Modify | 1, 3 |
| `.gitignore` | Modify | 1 |
| `tools/refresh_dump.py` | Create | 2 |
| `tools/toggle_db.py` | Create | 3 |
| `docs/inst/DB_MIGRATIONS.md` | Modify | 3 |

---

## Credentials Reference
- **Postgres root password:** Stored in `db/deploy/.env` as `POSTGRES_PASSWORD`
- **App user password (Docker):** Stored in `db/deploy/.env` as `APP_USER_PASSWORD`
- **App user password (Localhost):** Existing password in `backend/.env`
- **Port mapping:** Host 5433 -> Container 5432
