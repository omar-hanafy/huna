import { defineConfig, devices } from '@playwright/test';

/**
 * The app is served from a project sub-path on GitHub Pages, so `vite preview`
 * serves it at /huna/ too. baseURL carries the trailing slash so that relative
 * navigations such as `page.goto('#/alert')` resolve correctly.
 */
const PORT = 4173;
const baseURL = `http://localhost:${PORT}/huna/`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    locale: 'ar-EG',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 15'] } },
  ],
  webServer: {
    // The build is part of the command rather than a separate CI step, so the
    // suite can never run against a stale or missing dist.
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
