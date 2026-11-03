// Helpers for tests that run inside the emulators (npm run test:emu).
export const PROJECT_ID = "demo-acme";

/** Deletes every document in the Firestore emulator (emulator-only REST endpoint). */
export async function clearFirestore(): Promise<void> {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (!host) throw new Error("FIRESTORE_EMULATOR_HOST is not set: run npm run test:emu");
  const url = `http://${host}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error(`clearFirestore: HTTP ${res.status}`);
}
