# ERP Project Kickstart TODO
**Note:** When a whole section or sub-task is completed, move it to `DONE.md` to keep this file focused on active development.

**E2E Testing Environment:** Docker dev stack runs via `docker-compose up --build -d` from project root. Services: backend (`:8000`), frontend (`:5173`), admin (`:5174`). Auth bypass enabled via `ALLOW_AUTH_BYPASS=true` in `backend/.env` + `ops.auth_bypass_enabled=true` in DB (toggle in Admin → Server Config). Test player E2ETestBot (ID 2). DB backups via `python tools/db_dump_restore.py dump/restore/list`. Session state tracked in `docs/E2E_SESSION_STATE.md`.

---

## Test Suite Remediation (35 failures + 17 errors)

Pre-existing test failures in `pytest backend/tests/` (excluding integration tests). These need to be fixed to get a clean test suite.

- [ ] **Fix test_2_6_features.py Discovery tests** (~17 errors)
    - Root cause: `entity_type` → `entity_type_id` FK migration (migration 058) not reflected in test fixtures
    - Tests use string `entity_type` but DB model now uses `entity_type_id` FK
    - Fix: update test fixtures to create `EntityType` records and use FK references

- [ ] **Fix test_story_mode.py enemy tests** (~3 errors)
    - Same root cause: `entity_type_id` FK join in `get_enemies` route
    - Fix: update test data to use proper FK references

- [ ] **Fix remaining ~35 failures**
    - Categorize by root cause (likely same FK migration issue across multiple test files)
    - Update conftest or per-test fixtures to match current schema

---

## End-to-End User Testing
- [ ] **Full playthrough simulation** (pretend to be a new user + admin — goal: functionality testing + user manual creation)
    - [ ] Needs full breakdown, plan, and session tracking (like `E2E_SESSION_STATE.md`)
    - [ ] Restore DB to pre-testing dump. Fresh dump for this session. Create empty spoof player + separate admin user.
    - [ ] Login → create account → create character
    - [ ] Play through Book 1 (at least first 5 chapters) — click, beat waves, read story, train skills, farm mode, idle skills, active clicking
    - [ ] Admin: set player to last scene in last chapter → test chapter + book boss → start chapter 2
    - [ ] Admin: edit character (more skill XP) → verify frontend reflects changes
    - [ ] Admin: grant shards → test buying/selling in shop + marketplace
    - [ ] Check entity asset error log (dev audit) for missing assets
    - [ ] Check bottom battle bar progression (wave frenzy increases with game progress)
    - [ ] Admin: adjust wave settings (slow/speed up) → verify frontend reflects
    - [ ] Test boosters: apply, extend, verify differential speed in earnings
    - [ ] Test stat differentials with admin-generated items → feeling of getting stronger
    - [ ] Test max-clicking progression, admin XP adjustments in real-time
    - [ ] Test admin flows: ban/unban players, support tickets, duplicate flagging
    - [ ] Go through as completely new user → find info, figure out flows → create user manuals
    - [ ] Create user manual (end user) and admin manual

## Simulation & Progression Balancing
- [ ] Needs full breakdown and plan with session tracking
- [ ] Test timing on Books and idle skill training — ramp feel, challenge, skill impact
- [ ] Compare clicking + WPM display speed vs 1x reading speed → capture metrics
- [ ] Test regular progression (default stats/no gear vs max stats/max gear)
- [ ] By Book 2: player should be at a specific level with specific passive skills — validate
- [ ] Target: 2 hours/day active play → complete game in 30 calendar days (60 hours total for 3 books)
- [ ] Analyze power-gamer path: 24/7 optimized farming, all boosts, max speed
- [ ] Produce initial scaling defaults → migration 062 SQL script

---

## Future Work

### Generators
**NOTE:** Go through requirements definition first. Ask questions, fill out details, iterate on design + schema before coding.
- [ ] Read `0_REQUIREMENTS.md` → capture generator requirements → build out recs/design/schema docs
- [ ] Ensure all necessary generators are listed (check for gaps in existing data)

### Cosmetic Asset Generation *(Ref: 3.3 §19)*
- [ ] Pixel-art skins, badges, flair, avatars — depends on `C_STORY_ASSET_GENERATORS.md` §8

### Structural Improvements
- [ ] Investigate SDD frameworks (Open Spec) — consider converting documentation
- [ ] Code bloat cleanup (break god-class files into modules)
- [ ] Code documentation — link to requirements, functional specs, inline comments

### Cloud Deployment
- [ ] Explore Firebase JSON storage for user data (capacity, update frequency)
- [ ] Evaluate free cloud DB alternatives
- [ ] If viable: Postgres Docker container auto-loaded with DB dump (minus player data)
- [ ] Player first-login: repopulate from Firebase record
- [ ] Periodic Firebase sync

---

*Updated: 2026-03-15 (Phases A-D complete, moved to DONE. Next: test suite remediation → E2E user testing.)*
