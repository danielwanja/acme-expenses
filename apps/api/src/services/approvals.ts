import {
  checkApproval, planBulkApproval, type Approver, type BulkApproveResult,
  type DenyReason, type Expense,
} from "@acme/shared";
import type { DecodedIdToken } from "firebase-admin/auth";
import {
  FieldValue, getFirestore, type DocumentReference, type Transaction,
} from "firebase-admin/firestore";
import { HttpError } from "../errors.js";

// HTTP status and wording for each reason the shared rule can give.
const DENIED: Record<DenyReason, [number, string]> = {
  cannot_self_approve: [403, "You can't approve or reject your own expense."],
  not_your_report: [403, "This expense belongs to someone outside your team."],
  not_pending: [409, "This expense isn't waiting for approval."],
  not_found: [404, "No such expense."],
};

export function deniedError(reason: DenyReason): HttpError {
  const [status, message] = DENIED[reason];
  return new HttpError(status, reason, message);
}

export function expenseNotFound(id: string): HttpError {
  return new HttpError(404, "expense_not_found", `No expense with id ${id}.`);
}

/** The users who report to `uid` (users.managerId), read in `tx` if given. */
export function reportsOf(uid: string, tx?: Transaction) {
  const q = getFirestore().collection("users").where("managerId", "==", uid);
  return tx ? tx.get(q) : q.get();
}

/** The approver and the people who report to them. */
export async function loadApprover(tx: Transaction | undefined, uid: string): Promise<Approver> {
  const reports = await reportsOf(uid, tx);
  return { uid, team: reports.docs.map((d) => d.id) };
}

/** The one write an approval makes, for single and bulk alike. */
export function applyApproval(
  tx: Transaction, ref: DocumentReference, approver: Approver, via: "single" | "bulk",
): void {
  tx.update(ref, {
    status: "approved",
    approvedBy: approver.uid,
    approvedAt: FieldValue.serverTimestamp(),
    approvedVia: via, // documents without it were approved one at a time
  });
}

export async function approveOne(user: DecodedIdToken, expenseId: string): Promise<void> {
  const db = getFirestore();
  const ref = db.doc(`expenses/${expenseId}`);
  await db.runTransaction(async (tx) => {
    const [snap, approver] = await Promise.all([tx.get(ref), loadApprover(tx, user.uid)]);
    if (!snap.exists) throw expenseNotFound(expenseId);
    const decision = checkApproval(approver, snap.data() as Expense);
    if (!decision.ok) throw deniedError(decision.reason);
    applyApproval(tx, ref, approver, "single");
  });
}

/** One transaction: every approval in the batch lands, or none does. */
export async function bulkApprove(
  approver: Approver, ids: string[],
): Promise<BulkApproveResult[]> {
  const db = getFirestore();
  const refs = ids.map((id) => db.doc(`expenses/${id}`));
  return db.runTransaction(async (tx) => {
    const snaps = await tx.getAll(...refs);
    const found = new Map(
      snaps.filter((s) => s.exists)
        .map((s) => [s.id, s.data() as Expense]),
    );
    const results = planBulkApproval(approver, found, ids);
    for (const r of results) {
      if (r.outcome !== "approved") continue;
      const ref = db.doc(`expenses/${r.expenseId}`);
      applyApproval(tx, ref, approver, "bulk"); // same write as single
    }
    return results;
  });
}

/** Rejecting takes the same permission as approving. */
export async function rejectOne(
  user: DecodedIdToken, expenseId: string, reason: string,
): Promise<void> {
  const db = getFirestore();
  const ref = db.doc(`expenses/${expenseId}`);
  await db.runTransaction(async (tx) => {
    const [snap, approver] = await Promise.all([tx.get(ref), loadApprover(tx, user.uid)]);
    if (!snap.exists) throw expenseNotFound(expenseId);
    const decision = checkApproval(approver, snap.data() as Expense);
    if (!decision.ok) throw deniedError(decision.reason);
    tx.update(ref, {
      status: "rejected",
      rejectedBy: approver.uid,
      rejectedAt: FieldValue.serverTimestamp(),
      rejectionReason: reason,
    });
  });
}
