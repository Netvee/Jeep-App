import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
// Use the pre-installed Chromium when available (offline sandboxes); falls back to Playwright's default.
const executablePath = process.env.CHROMIUM_PATH ?? (process.env.CI ? undefined : "/opt/pw-browsers/chromium-1194/chrome-linux/chrome");
const launchOptions = executablePath ? { executablePath } : {};

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, locale: "he-IL", timezoneId: "Asia/Jerusalem", trace: "retain-on-failure", launchOptions },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 }, launchOptions } },
    { name: "phone", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, launchOptions } },
    { name: "ipad", use: { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, launchOptions } },
  ],
  webServer: {
    // Requires `npm run build` first. Uses an isolated embedded database.
    command: `rm -rf .data/e2e && PGLITE_DIR=.data/e2e SEED_DEMO_DATA=true REGISTER_RATE_LIMIT=1000 npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/register`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
