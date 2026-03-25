# Elysium Rising — Admin Dashboard

Internal management dashboard for the Elysium Rising MMORPG. Built with React + TypeScript + Vite.

## What This Is

The admin dashboard is the primary internal tool for:

- **Game Config Management** — Tune scaling parameters (XP multipliers, drop rates, progression curves) in real time via the `game_configs` table.
- **Player Management** — Browse player accounts, inspect character state, manage roles, and review account history.
- **Content Editing** — Manage lore content, enemies, chapters, and in-game items.
- **Analytics** — Monitor active sessions, player progression, payment events, and support tickets.
- **Support** — Review and act on support tickets raised by players.

This dashboard is internal-only. It is never exposed to end users.

---

## Setup

### Prerequisites

- Docker + Docker Compose
- A valid `backend/.env` with database and Firebase credentials

### Start the full stack

```bash
docker-compose up --build -d
```

| Service | URL |
|---------|-----|
| Admin Dashboard | http://localhost:5174 |
| Player Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |

### Local dev (without Docker)

```bash
cd admin
npm install
npm run dev
```

The admin dev server starts on `http://localhost:5174` by default. It proxies API requests to the backend at `http://localhost:8000`.

### Environment variables

The admin app reads from `admin/.env.local` for local overrides. The key variable:

```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## Authentication

- **Production:** Firebase JWT via Google SSO. Admin users must have `is_admin = true` in the `players` table.
- **Development:** Use Firebase Auth Emulator or sign in with a real Google account. Auth bypass was removed in the spoofing lockdown (2026-03-22). The role check (`is_admin`) is always enforced.

See [`docs/API_GUIDE.md`](docs/API_GUIDE.md) for full auth details and curl examples.

---

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/API_GUIDE.md`](docs/API_GUIDE.md) | Auth flow, key endpoints, curl examples for debugging and config tuning |
| [`docs/reference/API_REFERENCE.md`](../docs/reference/API_REFERENCE.md) | Full API reference — Section 21 covers all admin endpoints |
| [`db/data_dictionary.md`](../db/data_dictionary.md) | Database schema reference |
| [`docs/how-to/TESTING.md`](../docs/how-to/TESTING.md) | Testing guide |

---

## Testing

Component and unit tests use Vitest + React Testing Library. Test files are named `*.test.tsx` and live next to their components.

```bash
cd admin
npm run test
```

For full stack E2E tests, use the unified test runner from the project root:

```bash
testing/run_tests.bat   # Windows
testing/run_tests.sh    # Linux/Mac
```

---

## Tech Stack

- React 18 + TypeScript
- Vite (dev server + build)
- Vanilla CSS (no CSS frameworks)
- Firebase Auth (Google SSO)
- Vitest + React Testing Library (unit/component tests)
