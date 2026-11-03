// Seeds the Auth and Firestore emulators with Acme's test users, over the
// emulators' REST APIs. No firebase-admin here: Playwright loads this file,
// and firebase-admin's dependencies don't load under its ESM loader on Node 24.
// Emulator only: the project id is demo-acme, which has no live resources.
import { PASSWORD } from "./helpers";

const PROJECT_ID = "demo-acme";
const AUTH = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099"}`;
const FIRESTORE = `http://${process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080"}`;
const ACCOUNTS = `${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts`;
const DOCUMENTS = `/projects/${PROJECT_ID}/databases/(default)/documents`;

type SeedUser = {
  uid: string;
  displayName: string;
  role: "employee" | "manager";
  managerId?: string;
  finance?: boolean;
};

export const USERS: SeedUser[] = [
  { uid: "erin", displayName: "Erin", role: "employee", managerId: "max" },
  { uid: "max", displayName: "Max", role: "manager" },
];

/** One emulator call. "Bearer owner" is the emulators' admin token: it bypasses rules. */
async function call(method: string, url: string, body?: unknown): Promise<void> {
  const res = await fetch(url, {
    method,
    headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch((err: unknown) => {
    const name = url.startsWith(FIRESTORE) ? "Firestore" : "Auth";
    const host = new URL(url).host;
    throw new Error(`The ${name} emulator isn't running on ${host}. Start the emulators `
      + "(npm run test:e2e starts them), then run the tests again.", { cause: err });
  });
  if (!res.ok) throw new Error(`${method} ${url}: HTTP ${res.status} ${await res.text()}`);
}

type Plain = string | number | boolean | null | Date;

/** A plain object as Firestore REST fields: integers stay integers (cents). */
function toFields(data: Record<string, Plain>) {
  const value = (v: Plain) =>
    v === null ? { nullValue: null }
    : v instanceof Date ? { timestampValue: v.toISOString() }
    : typeof v === "boolean" ? { booleanValue: v }
    : typeof v === "number"
      ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
    : { stringValue: v };
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, value(v)]));
}

/** Creates or replaces one document, as the Admin SDK would. */
const setDoc = (path: string, data: Record<string, Plain>) =>
  call("PATCH", `${FIRESTORE}/v1${DOCUMENTS}/${path}`, { fields: toFields(data) });

export async function seed(): Promise<void> {
  // Start from empty emulators so every run sees the same state.
  await call("DELETE", `${FIRESTORE}/emulator/v1${DOCUMENTS}`);
  await call("DELETE", `${AUTH}/emulator/v1/projects/${PROJECT_ID}/accounts`);

  for (const u of USERS) {
    await call("POST", ACCOUNTS, {
      localId: u.uid, email: `${u.uid}@acme.test`, password: PASSWORD,
      displayName: u.displayName,
    });
    // The same claims firestore.rules and the API read.
    await call("POST", `${ACCOUNTS}:update`, {
      localId: u.uid,
      customAttributes: JSON.stringify({ role: u.role, finance: u.finance === true }),
    });
    await setDoc(`users/${u.uid}`, {
      displayName: u.displayName, role: u.role, managerId: u.managerId ?? null,
    });
  }
}
