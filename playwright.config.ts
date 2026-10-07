import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — runs against `npm run preview` on a fixed port.
 * Mobile + desktop projects to validate responsive layout.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:4321/boomerang/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-safari',    use: { ...devices['iPhone 14'] } },
  ],

  webServer: {
    command: 'npm run preview -- --port 4321 --host',
    url: 'http://localhost:4321/boomerang/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
