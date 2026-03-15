import { defineConfig, devices } from '@playwright/test';

const FRONTEND_URL = process.env.PLAYWRIGHT_FRONTEND_URL || 'http://localhost:5173';
const ADMIN_URL = process.env.PLAYWRIGHT_ADMIN_URL || 'http://localhost:5174';

export default defineConfig({
  testDir: './',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'frontend',
      use: { ...devices['Desktop Chrome'], baseURL: FRONTEND_URL },
      testIgnore: /admin-.*\.spec\.ts/,
    },
    {
      name: 'admin',
      use: { ...devices['Desktop Chrome'], baseURL: ADMIN_URL },
      testMatch: /admin-.*\.spec\.ts/,
    },
  ],
});
