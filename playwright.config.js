// Playwright config — runs the smoke suite against the static HTML over file://.
// No dev server needed: the prototype is a single self-contained HTML file
// that loads React + Babel from a CDN at runtime.
const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: './tests',
  // Babel-standalone takes a moment to compile JSX on first paint, and CI
  // runners are slow. 30s of headroom is enough without hiding real hangs.
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'file://' + path.resolve(__dirname) + '/',
    headless: true,
    viewport: { width: 1280, height: 800 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
