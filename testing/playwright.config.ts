import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'frontend',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5173' },
    },
    {
      name: 'admin',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5174' },
    },
  ],
});
