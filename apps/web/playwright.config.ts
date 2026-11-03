// apps/web/playwright.config.ts
// npm run test:e2e builds web + api, starts the emulators, seeds users, and
// drives the app through the Hosting emulator, the same path production uses.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1, // one emulator suite; each spec uses its own seeded employee
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:5000", // Hosting emulator
    trace: "retain-on-failure",
  },
  projects: [
    { name: "seed", testMatch: /seed\.setup\.ts/ },
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, dependencies: ["seed"] },
  ],
  webServer: {
    command: "npm run build && npx firebase emulators:start --project demo-acme",
    cwd: "../..",
    // Ready only once the api function answers through the Hosting rewrite.
    url: "http://127.0.0.1:5000/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Ctrl-C the Firebase CLI so it stops every emulator. The default SIGKILL
    // can leave the Firestore emulator holding port 8080 for the next run.
    gracefulShutdown: { signal: "SIGINT", timeout: 20_000 },
  },
});
