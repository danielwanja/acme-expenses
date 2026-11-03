import {
  checkApproval, type Approver, type DenyReason, type Expense,
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
export async function loadApprover(tx: Transaction, uid: string): Promise<Approver> {
  const reports = await reportsOf(uid, tx);
  return { uid, team: reports.docs.map((d) => d.id) };
}

/** The one write an approval makes. */
export function applyApproval(
  tx: Transaction, ref: DocumentReference, approver: Approver,
): void {
  tx.update(ref, {
    status: "approved",
    approvedBy: approver.uid,
    approvedAt: FieldValue.serverTimestamp(),
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
    applyApproval(tx, ref, approver);
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
