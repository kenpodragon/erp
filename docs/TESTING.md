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
| **Backend** | `pytest` | `/backend/tests/` | `docker-compose run --rm backend-test` |
| **Frontend** | `Vitest` + `RTL` | `/frontend/src/**/*.test.tsx` | `docker-compose run --rm frontend-test` |
| **Admin** | `Vitest` + `RTL` | `/admin/src/**/*.test.tsx` | `docker-compose run --rm admin-test` |
| **E2E** | `Playwright` | `/testing/*.spec.ts` | `docker-compose run --rm e2e-test` |

---

## ✍️ How to Write Tests

### 1. Backend (Python)
-   Files must start with `test_` (e.g., `test_auth.py`).
-   Use the `client` and `session` fixtures provided in `conftest.py` or existing test files to interact with a temporary SQLite database.
-   **Example:**
    ```python
    def test_hello(client):
        response = client.get("/hello")
        assert response.status_code == 200
    ```

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
-   **Windows:** `testingun_tests.bat`
-   **Linux/Mac:** `testing/run_tests.sh`

### Individual Suites
You can run specific tests using Docker Compose without starting the whole stack:
-   **Backend:** `docker-compose run --rm backend-test`
-   **Frontend:** `docker-compose run --rm frontend-test`
-   **Admin:** `docker-compose run --rm admin-test`
-   **E2E:** `docker-compose run --rm e2e-test`

---

## 📈 Coverage Requirements
-   **API Endpoints:** 100% of public and authenticated endpoints must have at least one integration test covering the "Happy Path".
-   **Bug Fixes:** Every bug fix must be accompanied by a regression test that reproduces the failure before the fix is applied.
-   **UI Components:** Major layout components and all forms must have a basic rendering smoke test.
-   **Critical Paths:** Login and Onboarding flows must be covered by E2E tests.
