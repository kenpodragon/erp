# Testing Revamp Specification

## Purpose
Phase 5.9 performs a full-scale end-to-end testing pass across all requirements (REC 0–5). It introduces a DB-driven auth bypass system for browser testing without Firebase SSO, a DB dump/restore script for safe test rollback, interactive browser testing via Playwright MCP against localhost dev servers, and a complete set of automated Playwright specs providing CI-repeatable coverage of every feature area.

## Requirements

### Requirement: Auth Bypass System
The system SHALL implement a double-gated authentication bypass for testing that requires both an `.env` flag AND a DB toggle to activate. The bypass SHALL never be activatable in production.

#### Scenario: Both gates required
- GIVEN `ALLOW_AUTH_BYPASS=true` in `backend/.env` AND `auth_bypass_enabled = true` in `server_configs`
- WHEN a request arrives with `X-Spoof-Player-Id: 42` header
- THEN the backend SHALL authenticate as player 42 without Firebase token verification, and the action SHALL be logged to `activity_events` as `auth_bypass_used`

#### Scenario: Single gate insufficient
- GIVEN `ALLOW_AUTH_BYPASS=true` in `.env` but `auth_bypass_enabled = false` in DB
- WHEN a request arrives with the spoof header
- THEN the request SHALL proceed through normal Firebase token verification, ignoring the spoof header

#### Scenario: Production safety
- GIVEN the production environment has `ALLOW_AUTH_BYPASS` unset or set to `false`
- WHEN the DB toggle is flipped to `true`
- THEN the auth bypass SHALL remain inactive regardless of the DB state

### Requirement: DB Dump/Restore Script
The system SHALL provide a `tools/db_dump_restore.py` script supporting dump, restore, and list operations using connection strings from `backend/.env` without printing or logging those strings.

#### Scenario: Dump operation
- GIVEN the dev database is in a known good state
- WHEN `python tools/db_dump_restore.py dump` is executed
- THEN a `pg_dump` file SHALL be created at `db/backups/<timestamp>.dump` without the connection string appearing in logs or output

#### Scenario: Restore operation
- GIVEN a dump file exists at `db/backups/2026-03-25_120000.dump`
- WHEN `python tools/db_dump_restore.py restore db/backups/2026-03-25_120000.dump` is executed
- THEN `pg_restore --clean` SHALL restore the database to the state in that dump file

### Requirement: Playwright Multi-Project Config
The system SHALL configure Playwright to support both frontend (port 5173) and admin (port 5174) as separate test projects, with admin specs matched by filename pattern `admin-*.spec.ts`.

#### Scenario: Frontend spec isolation
- GIVEN a spec file named `story-mode.spec.ts`
- WHEN Playwright runs the frontend project
- THEN the spec SHALL use `baseURL: 'http://localhost:5173'` and SHALL NOT run against the admin app

#### Scenario: Admin spec targeting
- GIVEN a spec file named `admin-players.spec.ts`
- WHEN Playwright runs the admin project
- THEN the spec SHALL use `baseURL: 'http://localhost:5174'`

### Requirement: Shared Test Helpers
The system SHALL provide shared helper modules for authentication, navigation, and payment mocking to eliminate duplication across Playwright specs.

#### Scenario: Auth helper usage
- GIVEN a spec requires an authenticated player session
- WHEN `loginAsTestUser(page)` is called
- THEN the auth bypass flow SHALL execute, setting up the session without Firebase SSO interaction

#### Scenario: Stripe mock helper
- GIVEN a spec tests a payment flow
- WHEN `api-mocks.ts` route interceptors are registered
- THEN Stripe API calls SHALL be intercepted and return mocked success/failure responses without hitting the real Stripe API

### Requirement: Automated Playwright Spec Coverage
The system SHALL provide a complete set of Playwright spec files covering every major requirement area (REC 1 through REC 5.8), targeting 96%+ verification of all documented requirements.

#### Scenario: Story Mode spec coverage
- GIVEN the `story-mode.spec.ts` spec runs
- WHEN all tests pass
- THEN the following SHALL be verified: overworld map renders with nodes, scene click starts Story Mode, combat canvas (PixiJS) renders, narrative text displays, skills hotbar shows 9 skills, upgrade menu functions, gold counter updates, post-battle summary modal appears

#### Scenario: Admin spec coverage
- GIVEN the `admin-content.spec.ts` spec runs
- WHEN all tests pass
- THEN all 4 WorldBuilder tabs (Narrative, Content, Classification, Scaling) and their sub-tabs SHALL be verified as functional

#### Scenario: Payment spec isolation
- GIVEN any spec tests a payment flow (shop, subscription, donations, marketplace)
- WHEN the spec runs
- THEN `page.route()` interception SHALL mock all Stripe calls so no real charges occur

### Requirement: Systematic Requirement Verification
The system SHALL maintain a traceability matrix linking each documented requirement to one or more test cases, with known gaps explicitly documented and deferred.

#### Scenario: Traceability matrix
- GIVEN a developer adds a new requirement to any REC document
- WHEN the testing revamp process is applied
- THEN a corresponding test entry SHALL be added to the spec file map or explicitly noted as a deferred gap

#### Scenario: Known gaps documented
- GIVEN offline training report testing is not feasible with current Docker setup
- WHEN the coverage summary is reviewed
- THEN this gap SHALL be explicitly listed as deferred to 5.10 live testing with a documented rationale

## Design
Auth bypass flow:
1. Frontend loads → `GET /api/config/public` → response includes `{ auth_bypass_available: true, bypass_player_id: 42 }`
2. If available: skip Firebase, set `X-Spoof-Player-Id` header on all API calls
3. Backend `get_decoded_token()`: Gate 1 (`.env`) → Gate 2 (DB toggle) → Gate 3 (spoof header lookup) → Fallback (Firebase)

Spec file map (19 spec files):

| Spec | Requirement | Type |
|------|-------------|------|
| `smoke.spec.ts` | General | ENHANCE |
| `onboarding.spec.ts` | REC 1 | NEW |
| `story-mode.spec.ts` | REC 2.0–2.2 | NEW |
| `idle-training.spec.ts` | REC 2.3 | MERGE |
| `character.spec.ts` | REC 2.4 | RENAME |
| `audio.spec.ts` | REC 2.5 | NEW |
| `economy.spec.ts` | REC 2.6 | REWRITE |
| `home-base.spec.ts` | REC 2.7 | NEW |
| `shop-shards.spec.ts` | REC 3.1 | NEW |
| `subscription.spec.ts` | REC 3.2 | ENHANCE |
| `emporium.spec.ts` | REC 3.3 | NEW |
| `donations.spec.ts` | REC 3.4 | NEW |
| `marketplace.spec.ts` | REC 3.5 | NEW |
| `admin-players.spec.ts` | REC 5.1 | NEW |
| `admin-content.spec.ts` | REC 5.2–5.3 | NEW |
| `admin-scaling.spec.ts` | REC 5.4–5.5 | NEW |
| `admin-audit.spec.ts` | REC 5.6 | NEW |
| `admin-assets.spec.ts` | REC 5.7 | NEW |
| `admin-finance.spec.ts` | REC 3.6 | NEW |

Coverage target: 52 requirement items, 50 verified (96%), 2 gaps deferred to 5.10.

Test data isolation: all tests use unique identifiers (`E2ETest_${Date.now()}`). PixiJS canvas tested by verifying canvas element exists + DOM HUD elements. WebSocket chat tested via graceful degradation verification.

Key reference files: `testing/helpers/auth.ts`, `testing/helpers/navigation.ts`, `testing/helpers/api-mocks.ts`, `tools/db_dump_restore.py`, `testing/playwright.config.ts`.
