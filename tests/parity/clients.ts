// Clients for the parity suite. Run it with the legacy app up and the
// emulators running: npm run test:parity
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { ExpenseView, LegacyExpense, LegacyRequest } from "./types";

const LEGACY_URL = process.env.LEGACY_URL ?? "http://localhost:8081";

export async function callLegacy(req: LegacyRequest): Promise<LegacyExpense> {
  // Adapt the auth header to however your legacy app identifies the user.
  const res = await fetch(`${LEGACY_URL}/api/${req.endpoint}?id=${req.id}`, {
    headers: { "X-Legacy-User": req.as },
  });
  if (!res.ok) throw new Error(`legacy ${req.endpoint}: HTTP ${res.status}`);
  return (await res.json()) as LegacyExpense;
}

/** Reads the migrated document, which keeps the legacy id: expenses/legacy-<id>. */
export async function callNew(req: LegacyRequest): Promise<ExpenseView> {
  if (getApps().length === 0) initializeApp({ projectId: "demo-acme" });
  const snap = await getFirestore().doc(`expenses/legacy-${req.id}`).get();
  if (!snap.exists) throw new Error(`not migrated yet: legacy-${req.id}`);
  return {
    id: snap.id,
    amount: snap.get("amount"),
    currency: snap.get("currency"),
    status: snap.get("status"),
    date: snap.get("spentOn"),
  };
}
