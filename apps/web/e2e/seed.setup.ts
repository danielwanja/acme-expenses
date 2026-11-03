import { test as setup } from "@playwright/test";
import { seed } from "./seed";

// The Hosting emulator, as in playwright.config.ts (baseURL and webServer.url).
const HEALTH_URL = "http://127.0.0.1:5000/api/health";

/** Fails fast when something other than our API answers on port 5000. */
async function checkHostingEmulator(): Promise<void> {
  const body: unknown = await fetch(HEALTH_URL)
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null);
  if ((body as { ok?: unknown } | null)?.ok !== true) {
    throw new Error("Port 5000 is answered by another app, not the Hosting emulator. "
      + "On macOS this is usually AirPlay Receiver: turn it off in System Settings > "
      + "General > AirDrop & Handoff, or stop the other app, then run npm run test:e2e again.");
  }
}

setup("seed users in the emulators", async () => {
  await checkHostingEmulator();
  await seed();
});
