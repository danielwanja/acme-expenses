import {
  checkApproval, planBulkApproval, readApprovalSettings,
  type ApprovalRecord, type ApprovalSettings, type ApprovedDecision, type Approver,
  type BulkApproveResult, type BulkCandidate, type DenyReason, type Expense,
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
  not_finance: [403, "This step needs an approver from Finance."],
  not_pending: [409, "This expense isn't waiting for approval."],
  already_approved_by_you: [409, "You already approved this expense; "
    + "the second approval must come from someone else."],
  already_approved: [409, "Every required approval is already recorded."],
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

/** Display names for these users (users/{uid}.displayName), keyed by uid. */
export async function employeeNames(uids: string[]): Promise<Map<string, string>> {
  const db = getFirestore();
  const unique = [...new Set(uids)];
  if (unique.length === 0) return new Map();
  const snaps = await db.getAll(...unique.map((uid) => db.doc(`users/${uid}`)));
  return new Map(snaps.map((s) => [s.id, String(s.get("displayName") ?? s.id)]));
}

/** The approver: their reports, and the Finance custom claim the rules also use. */
export async function loadApprover(
  tx: Transaction | undefined, user: DecodedIdToken,
): Promise<Approver> {
  const reports = await reportsOf(user.uid, tx);
  const team = reports.docs.map((d) => d.id);
  return { uid: user.uid, team, isFinance: user["finance"] === true };
}

/** settings/approval, validated on every read. Missing or invalid fails closed. */
export async function loadSettings(tx?: Transaction): Promise<ApprovalSettings> {
  const ref = getFirestore().doc("settings/approval");
  const snap = tx ? await tx.get(ref) : await ref.get();
  return readApprovalSettings(snap.data());
}

export async function loadApprovals(
  ref: DocumentReference, tx?: Transaction,
): Promise<ApprovalRecord[]> {
  const q = ref.collection("approvals");
  const snap = tx ? await tx.get(q) : await q.get();
  return snap.docs.map((d) => d.data() as ApprovalRecord);
}

type ApplyInput = {
  approver: Approver;
  expense: Pick<Expense, "amountBase">;
  settings: ApprovalSettings;
  via: "single" | "bulk";
};

/** The one write an approval makes, for single and bulk alike. */
export function applyApproval(
  tx: Transaction,
  ref: DocumentReference,
  { approver, expense, settings, via }: ApplyInput,
  decision: ApprovedDecision,
): void {
  // The step is the document id, and create() fails if it exists:
  // two racing approvers can't both give the same step.
  tx.create(ref.collection("approvals").doc(decision.step), {
    step: decision.step,
    approverId: approver.uid,
    decidedAt: FieldValue.serverTimestamp(),
    amountBase: expense.amountBase ?? null, // Firestore rejects undefined
    financeThresholdBase: settings.financeThresholdBase,
    via, // "single" | "bulk"
  });
  tx.update(ref, {
    status: decision.nextStatus,
    // The partner API (Chapter 8) lists approved expenses by approvedAt.
    ...(decision.nextStatus === "approved"
      ? { approvedAt: FieldValue.serverTimestamp() } : {}),
  });
}

/** Reads the expense, its approvals and the settings; decides; writes, in one transaction. */
async function decide(
  user: DecodedIdToken, expenseId: string,
  write: (tx: Transaction, ref: DocumentReference, ctx: ApplyInput,
    decision: ApprovedDecision) => void,
): Promise<ApprovedDecision> {
  const db = getFirestore();
  const ref = db.doc(`expenses/${expenseId}`);
  return db.runTransaction(async (tx) => {
    const [snap, approver, settings, approvals] = await Promise.all([
      tx.get(ref), loadApprover(tx, user), loadSettings(tx), loadApprovals(ref, tx),
    ]);
    if (!snap.exists) throw expenseNotFound(expenseId);
    const expense = snap.data() as Expense;
    const decision = checkApproval({ approver, expense, approvals, settings });
    if (!decision.ok) throw deniedError(decision.reason);
    write(tx, ref, { approver, expense, settings, via: "single" }, decision);
    return decision;
  });
}

export function approveOne(user: DecodedIdToken, expenseId: string) {
  return decide(user, expenseId, applyApproval);
}

/** Rejecting takes the same permission as approving the current step. */
export function rejectOne(user: DecodedIdToken, expenseId: string, reason: string) {
  return decide(user, expenseId, (tx, ref, { approver }) => {
    tx.update(ref, {
      status: "rejected",
      rejectedBy: approver.uid,
      rejectedAt: FieldValue.serverTimestamp(),
      rejectionReason: reason,
    });
  });
}

/** One transaction: every approval in the batch lands, or none does. */
export async function bulkApprove(
  approver: Approver, ids: string[],
): Promise<BulkApproveResult[]> {
  const db = getFirestore();
  const refs = ids.map((id) => db.doc(`expenses/${id}`));
  return db.runTransaction(async (tx) => {
    const [snaps, settings] = await Promise.all([tx.getAll(...refs), loadSettings(tx)]);
    const found = new Map<string, BulkCandidate>();
    for (const s of snaps.filter((x) => x.exists)) {
      const approvals = await loadApprovals(s.ref, tx);
      found.set(s.id, { expense: s.data() as Expense, approvals });
    }
    const plans = planBulkApproval(approver, found, ids, settings);
    for (const { result, decision } of plans) {
      if (!decision) continue;
      const ref = db.doc(`expenses/${result.expenseId}`);
      const expense = found.get(result.expenseId)?.expense ?? {};
      // Same write as a single approval:
      applyApproval(tx, ref, { approver, expense, settings, via: "bulk" }, decision);
    }
    return plans.map((p) => p.result);
  });
}
