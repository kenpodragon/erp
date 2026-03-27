# ERP Testing Guide

This document outlines the testing strategy, frameworks, and procedures for the Elysium Rising mmorPg (ERP).

## 🧪 Layered Testing Strategy

We employ a three-tier testing approach to ensure stability across the stack:
1.  **Backend Unit/Integration:** Verifies API logic, database interactions, and authentication.
2.  **Frontend/Admin Component:** Verifies UI rendering and client-side logic in isolation.
3.  **UI/UX End-to-End (E2E):** Verifies the full system flow from the user's perspective.

---

## 📂 Directory Structure & Frameworks

| Layer | Framework | Location | Command |
| :--- | :--- | :--- | :--- |
| **Backend** | `pytest` | `/backend/tests/` | `docker-compose -f testing/docker-compose-testing.yaml run --rm backend-test` |
| **Frontend** | `Vitest` + `RTL` | `/frontend/src/**/*.test.tsx` | `docker-compose -f testing/docker-compose-testing.yaml run --rm frontend-test` |
| **Admin** | `Vitest` + `RTL` | `/admin/src/**/*.test.tsx` | `docker-compose -f testing/docker-compose-testing.yaml run --rm admin-test` |
| **E2E** | `Playwright` | `/testing/*.spec.ts` | `docker-compose -f testing/docker-compose-testing.yaml run --rm e2e-test` |

---

## ✍️ How to Write Tests

### 1. Backend (Python)
-   Files must start with `test_` (e.g., `test_auth.py`).
-   **Mandatory:** Use in-memory SQLite for all backend tests to avoid creating `.db` files on the filesystem.
    ```python
    SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    ```
-   Use the `client` and `session` fixtures provided in `conftest.py` or existing test files to interact with the in-memory database.

### 2. Frontend/Admin (React)
-   Files should be named `[ComponentName].test.tsx` and live in the same folder as the component.
-   Use `render` and `screen` from `@testing-library/react`.
-   **Example:**
    ```typescript
    it('renders heading', () => {
      render(<App />);
      expect(screen.getByText(/ERP Frontend/i)).toBeDefined();
    });
    ```

### 3. End-to-End (Playwright)
-   Files should end in `.spec.ts` and reside in the `/testing` directory.
-   Tests should verify critical user paths (Login, Character Creation, etc.).
-   **Example:**
    ```typescript
    test('smoke test', async ({ page }) => {
      await page.goto('http://localhost:5173');
      await expect(page.locator('h1')).toContainText('ERP');
    });
    ```

---

## 🚀 How to Execute Tests

### Unified Runner (Recommended)
This is the easiest way to verify the entire system before a push. It starts the services, runs all suites, and cleans up.
-   **Windows:** `testing
un_tests.bat`
-   **Linux/Mac:** `testing/run_tests.sh`

### Individual Suites
You can run specific tests using the dedicated testing compose file:
-   **Backend:** `docker-compose -f testing/docker-compose-testing.yaml run --rm backend-test`
-   **Frontend:** `docker-compose -f testing/docker-compose-testing.yaml run --rm frontend-test`
-   **Admin:** `docker-compose -f testing/docker-compose-testing.yaml run --rm admin-test`
-   **E2E:** `docker-compose -f testing/docker-compose-testing.yaml run --rm e2e-test`

---

## 🔓 E2E Auth Bypass System

~~Auth bypass was removed in the spoofing lockdown (2026-03-22).~~

E2E testing now requires real Firebase authentication. Options:
- **Firebase Auth Emulator:** Run the Firebase emulator suite for local testing without real credentials.
- **Service Account Token:** Generate a custom token via Firebase Admin SDK for test users.
- **Playwright Firebase Plugin:** Use a Playwright helper to programmatically sign in via Firebase.

### Shared Test Helpers
Located in `testing/helpers/`:
| File | Exports |
|------|---------|
| `auth.ts` | `loginAsTestUser(page)`, `loginAsAdmin(page)`, `bypassOnboarding(page)` |
| `navigation.ts` | `navigateToTab(page, tab)`, `navigateToAdminPage(page, path)`, `waitForContentLoad(page)`, `captureConsoleErrors(page)` |
| `api-mocks.ts` | `mockStripeCheckout(page)`, `mockSubscriptionCreate(page)`, `mockActiveSubscription(page)`, `mockNoSubscription(page)`, `mockDonationCreate(page)`, `mockAllStripe(page)` |

### DB Backup/Restore
Before destructive E2E testing, create a backup:
```bash
python tools/db_dump_restore.py dump     # Creates timestamped dump in ../db-backups/
python tools/db_dump_restore.py list     # List available backups
python tools/db_dump_restore.py restore <file>  # Restore from backup
```

---

## 💳 Stripe Testing

### Mocked Tests (No Stripe Keys Required)
The Playwright specs in `testing/` use `page.route()` to intercept Stripe API calls. This allows testing the full checkout UI flow without real Stripe keys. Use the helpers in `testing/helpers/api-mocks.ts`:
```typescript
import { mockStripeCheckout } from './helpers/api-mocks';

test('buy shards', async ({ page }) => {
  await mockStripeCheckout(page);  // Intercepts /api/payments/create-checkout
  // ... click buy button, verify redirect
});
```

### Live Stripe Tests (Test Keys Required)
For integration tests that verify real Stripe API calls, webhook delivery, and payment processing:

1. **Prerequisites:**
   - Stripe test keys in `backend/.env` (see `docs/how-to/INIT_INFRA.md` §5.1)
   - Stripe CLI running: `stripe listen --forward-to localhost:8000/api/webhooks/stripe`
   - Docker stack running: `docker-compose up --build -d`

2. **Trigger test events:**
   ```bash
   stripe trigger checkout.session.completed
   stripe trigger customer.subscription.created
   stripe trigger charge.dispute.created
   ```

3. **Test cards:** Use `4242 4242 4242 4242` for success, `4000 0000 0000 9995` for insufficient funds. See `INIT_INFRA.md` §5.1 for the full list.

---

## 📋 Playwright Config

The Playwright config at `testing/playwright.config.ts` defines two projects:

| Project | Base URL | Test Pattern | Description |
|---------|----------|--------------|-------------|
| `frontend` | `http://localhost:5173` | Everything except `admin-*.spec.ts` | Player-facing app tests |
| `admin` | `http://localhost:5174` | `admin-*.spec.ts` | Admin dashboard tests |

Override URLs with env vars: `PLAYWRIGHT_FRONTEND_URL`, `PLAYWRIGHT_ADMIN_URL`.

### Current Spec Files (119 tests across 19 files)
| Spec | Tests | Coverage |
|------|-------|----------|
| `smoke.spec.ts` | 10 | Backend health, frontend statics, admin bypass |
| `onboarding.spec.ts` | 7 | Splash, terms, about, auth bypass, support |
| `story-mode.spec.ts` | 8 | Map, combat, narrative, post-battle |
| `idle_training.spec.ts` | 6 | Skills, training, active mode |
| `character_progression.spec.ts` | 5 | Stats, prerequisites, items, equipment |
| `audio.spec.ts` | 8 | Settings, volume, mute, AudioContext |
| `economy_discovery.spec.ts` | 5 | Chat, codex, reduce-motion |
| `home-base.spec.ts` | 6 | Akashic Log, collections, leaderboard |
| `shop-shards.spec.ts` | 5 | Packages, checkout mock |
| `subscription.spec.ts` | 6 | Promo, cancel/reactivate |
| `emporium.spec.ts` | 5 | Cosmetics, item cards |
| `donations.spec.ts` | 5 | Tiers, checkout mock |
| `marketplace.spec.ts` | 6 | Browse, listings, salvage |
| `admin-players.spec.ts` | 6 | Player list, detail, edit/ban |
| `admin-content.spec.ts` | 6 | World builder, atmosphere, SFX, artifacts |
| `admin-scaling.spec.ts` | 6 | Game configs, tabs |
| `admin-audit.spec.ts` | 6 | Audit log, dev audit |
| `admin-assets.spec.ts` | 7 | Asset registry, categories, pagination |
| `admin-finance.spec.ts` | 5 | Finance dashboard, player widget |

---

## 📈 Coverage Requirements
-   **API Endpoints:** 100% of public and authenticated endpoints must have at least one integration test covering the "Happy Path".
-   **Bug Fixes:** Every bug fix must be accompanied by a regression test that reproduces the failure before the fix is applied.
-   **UI Components:** Major layout components and all forms must have a basic rendering smoke test.
-   **Critical Paths:** Login and Onboarding flows must be covered by E2E tests.
-   **Payment Flows:** All Stripe-integrated flows must have both mocked E2E tests (no keys needed) and live integration tests (test keys required).
