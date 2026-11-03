// scripts/backfill-approvals.ts
// Gives expenses approved before Chapter 6 a manager approval record, built
// from their old approvedBy / approvedAt fields. Auto-approved expenses
// (approvedBy "auto", up to $75) had no manager step, so they get none.
// Against the emulator first (FIRESTORE_EMULATOR_HOST=127.0.0.1:8080):
//   npx tsx scripts/backfill-approvals.ts           # dry run (default)
//   npx tsx scripts/backfill-approvals.ts --apply   # write the records
// Safe to run twice: the step is the record id. A human runs it in production.
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? "demo-acme" });
const db = getFirestore();

const apply = process.argv.includes("--apply");
const snap = await db.collection("expenses")
  .where("status", "in", ["approved", "exported"]).get();

let created = 0;
let skipped = 0;
let auto = 0;
for (const doc of snap.docs) {
  const e = doc.data();
  if (e["approvedBy"] === "auto") { auto++; continue; } // requiredSteps() is []
  const ref = doc.ref.collection("approvals").doc("manager");
  if ((await ref.get()).exists) { skipped++; continue; }
  if (apply) {
    await ref.create({ step: "manager", approverId: e.approvedBy,
      decidedAt: e.approvedAt, via: "backfill" });
  }
  created++;
}
console.log({ apply, scanned: snap.size, created, skipped, auto });
