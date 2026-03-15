# E2E Testing Session State

**Purpose:** Tracks live progress of 5.9 E2E Testing Revamp across sessions. Updated after each testing pass. Read this file at the start of any new session to pick up where we left off.

---

## Environment Setup
- **Docker stack:** `docker-compose up --build -d` from project root
- **Services:** backend (`:8000`), frontend (`:5173`), admin (`:5174`)
- **Auth bypass:** `ALLOW_AUTH_BYPASS=true` in `backend/.env` + `ops.auth_bypass_enabled=true` in DB
- **Test player:** E2ETestBot (ID 2), character TestHero (Engineer, L1), has admin access
- **DB backup:** `db/backups/erp_backup_pre_e2e_testing.dump` — restore with `python tools/db_dump_restore.py restore <file>`
- **Playwright MCP:** Connected, use for interactive browser testing against localhost

## Current Phase: Phase 1 — MCP Browser Smoke Testing (IN PROGRESS)

### Frontend Pages Tested
| Route | Status | Notes |
|-------|--------|-------|
| `/` (Splash) | OK | 0 errors, CTA buttons, footer links |
| `/about` | OK | 0 errors, full content |
| `/terms` | OK | 0 errors, 11 sections |
| `/privacy` | OK | 0 errors, 11 sections |
| `/license` | OK | 0 errors, CC-BY-NC 4.0 |
| `/support` (guest) | OK | 0 errors, guest view with email |
| `/profile` | SKIP | Redirects to `/` under bypass (no Firebase User object — expected) |
| `/game` → Map | OK | Auto-redirect via bypass, welcome modal dismissed, overworld loads |
| `/game` → Skills | OK | 4 skills, sub-actions table, XP rates, locked/unlocked states |
| `/game` → Home | OK | 6 sub-tabs, Akashic Log with full chapter hierarchy, search |
| `/game` → Shop | OK | 6 shard packages, 4 sub-tabs, transaction history |
| `/game` → Ascendant | OK | Subscription plans, loyalty streaks, 7 titles |
| `/game` → Chat | OK | WebSocket disconnected (expected — bypass uses spoof header, not WS token) |

### Admin Pages Tested
| Route | Status | Notes |
|-------|--------|-------|
| `/dashboard` | OK | Stats, charts, activity feed, quick actions |
| `/players` | OK | Player list, search, filters, sortable columns |
| `/world-builder` | OK | 4 tabs, 10 sub-tabs, 3 books |
| `/config` | OK | Auth Bypass panel visible with toggle + test player info |
| `/finance` | OK | Was broken (3 SQL bugs + null safety), now fixed |
| `/players/:id` | NOT TESTED | |
| `/support` | NOT TESTED | |
| `/game-configs` | NOT TESTED | |
| `/atmospheres` | NOT TESTED | |
| `/sfx-configs` | NOT TESTED | |
| `/artifacts` | NOT TESTED | |
| `/achievements` | NOT TESTED | |
| `/asset-registry` | NOT TESTED | |
| `/chat` | NOT TESTED | |
| `/audit-log` | NOT TESTED | |
| `/dev-audit` | NOT TESTED | |
| `/access-control` | NOT TESTED | |

## Bugs Found & Fixed (This Session)
1. **`Entity.entity_type`** → `entity_type_id` in `backend/routes/game.py:395` — 500 on banner enemy fetch
2. **`SkillBalanceRow` import** — `verbatimModuleSyntax` needs `import type` in `SkillBalanceTable.tsx`, `SkillBalanceViewer.tsx`
3. **`verifyUserWithBackend`/`isLoggedIn` ordering** — temporal dead zone in `frontend/App.tsx`
4. **`onAuthStateChanged` resetting bypass** — added `isAuthBypassed()` guard in both `frontend/App.tsx` and `admin/App.tsx`
5. **Finance revenue-chart SQL** — `:cutoff::date` cast, missing `order_type` column, `donations` status join
6. **`OverviewTab.tsx` `formatNumber`** — null safety for undefined API values

## Files Modified This Session
### New Files
- `docs/recs/5.9_TESTING_REVAMP.md` — Requirements doc
- `docs/E2E_SESSION_STATE.md` — This file
- `db/061_auth_bypass_configs.sql` — Migration for auth bypass config keys
- `tools/db_dump_restore.py` — DB dump/restore utility
- `testing/helpers/auth.ts` — Shared auth helpers
- `testing/helpers/navigation.ts` — Shared navigation helpers
- `testing/helpers/api-mocks.ts` — Shared Stripe/payment mocks
- `db/backups/erp_backup_pre_e2e_testing.dump` — Pre-testing DB backup

### Modified Files
- `backend/.env` — Added `ALLOW_AUTH_BYPASS=true`
- `backend/.env.example` — Added `ALLOW_AUTH_BYPASS=false` with docs
- `backend/auth.py` — Auth bypass logic in `get_decoded_token()`
- `backend/routes/public.py` — Expose bypass availability in `/api/config/public`
- `backend/routes/admin_config.py` — Auth bypass status/create/set-player endpoints
- `backend/routes/game.py` — Fixed `entity_type` → `entity_type_id` join
- `backend/services/finance_analytics_service.py` — Fixed SQL cast, columns, joins
- `frontend/src/api.ts` — Auth bypass spoof header support
- `frontend/src/App.tsx` — Bypass auto-login, ordering fixes, `onAuthStateChanged` guard
- `admin/src/api.ts` — Auth bypass spoof header support
- `admin/src/App.tsx` — Bypass auto-login, `onAuthStateChanged` guard
- `admin/src/pages/ServerConfig.tsx` — Auth Bypass panel UI
- `admin/src/pages/finance/OverviewTab.tsx` — `formatNumber` null safety
- `admin/src/components/tuning/SkillBalanceTable.tsx` — `import type` fix
- `admin/src/components/tuning/SkillBalanceViewer.tsx` — `import type` fix
- `testing/playwright.config.ts` — Added admin project, localhost URLs
- `docs/TODO.md` — Expanded 5.9 sub-tasks with progress tracking

## Next Steps (Resume Here)
1. **Continue Phase 1:** Smoke test remaining 12 admin pages (player detail, support, game-configs, atmospheres, sfx, artifacts, achievements, assets, chat, audit-log, dev-audit, access-control)
2. **Phase 2:** Write automated Playwright specs (13 new + 5 enhanced = 18 total)
3. **Phase 3:** Systematic requirement verification checklist
4. **Phase 4:** Fix any additional bugs found

## Resume Prompt
Use this prompt to continue in a new session:
```
Read docs/E2E_SESSION_STATE.md and docs/TODO.md to understand current progress on 5.9 E2E Testing.
We're in Phase 1 (MCP browser smoke testing). Docker stack should be running (docker-compose up --build -d).
Auth bypass is enabled — test player E2ETestBot (ID 2). Continue smoke testing the remaining admin pages,
then proceed to Phase 2 (automated Playwright specs). Fix bugs as you find them and update both
E2E_SESSION_STATE.md and TODO.md as you go.
```
