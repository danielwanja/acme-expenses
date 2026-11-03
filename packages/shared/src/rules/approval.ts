import type { DenyReason } from "../schemas/approval.js";
import type { Expense } from "../schemas/expense.js";

/** The person trying to approve, and the employees who report to them. */
export type Approver = { uid: string; team: string[] };

export type ApprovalDecision =
  | { ok: true }
  | { ok: false; reason: DenyReason };

const deny = (reason: DenyReason): ApprovalDecision => ({ ok: false, reason });

export function checkApproval(
  approver: Approver,
  expense: Pick<Expense, "ownerId" | "status">,
): ApprovalDecision {
  if (approver.uid === expense.ownerId) return deny("cannot_self_approve");
  if (expense.status !== "submitted") return deny("not_pending");
  if (!approver.team.includes(expense.ownerId)) return deny("not_your_report");
  return { ok: true };
}

export function canApprove(
  approver: Approver,
  expense: Pick<Expense, "ownerId" | "status">,
): boolean {
  return checkApproval(approver, expense).ok;
}
