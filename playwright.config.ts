import { defineConfig } from "@playwright/test";

const baseURL = process.env.TEST_BASE_URL || "http://localhost:3000";
const port = new URL(baseURL).port || "3000";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 90000,
  workers: 1,
  use: {
    baseURL,
    headless: true,
    reducedMotion: "reduce",
    actionTimeout: 15000,
    viewport: { width: 1440, height: 1000 },
  },
  reporter: "list",
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      WORLDMONITOR_SOURCE:
        process.env.WORLDMONITOR_SOURCE ||
        `${process.cwd()}/tests/fixtures/target-source`,
    },
  },
});
