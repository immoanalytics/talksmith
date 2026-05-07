// Playwright config — runs the smoke suite against the prototype served by
// a small static HTTP server (scripts/serve.cjs). We use http:// rather than
// file:// because file:// has no host, which breaks baseURL relative-path
// resolution, and CDN-loaded scripts behave more consistently from an http
// origin.
const { defineConfig, devices } = require('@playwright/test');

const PORT = 4321;

module.exports = defineConfig({
  testDir: './tests',
  // Babel-standalone takes a moment to compile JSX on first paint, and CI
  // runners are slow. 30s of headroom is enough without hiding real hangs.
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  webServer: {
    command: `node scripts/serve.cjs`,
    url: `http://localhost:${PORT}/Talksmith.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: { PORT: String(PORT) },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    headless: true,
    viewport: { width: 1280, height: 800 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
