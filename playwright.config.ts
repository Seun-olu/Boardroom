import { defineConfig } from "@playwright/test";

const PORT = 3100;

/**
 * End-to-end journeys against the boardroom-dev Supabase project, using the
 * locally installed Google Chrome (no browser download). Test users are
 * created and deleted per run by e2e/global-setup.ts.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    // `next dev` loads .env.development.local → boardroom-dev, never production.
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}` },
  },
});
