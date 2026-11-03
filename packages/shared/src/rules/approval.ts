import type { DenyReason } from "../schemas/approval.js";
import type { Expense } from "../schemas/expense.js";
import { RECEIPT_REQUIRED_ABOVE_CENTS } from "./receipt";

/**
 * Up to $75 (amountBase, USD cents) is approved automatically at submission.
 * Same constant as the receipt rule: an expense that needs no receipt needs no manager.
 */
export function isAutoApproved(amountBase: number): boolean {
  return amountBase <= RECEIPT_REQUIRED_ABOVE_CENTS;
}

/** About 1 in 20 auto-approved expenses is flagged for the manager to review afterwards. */
export const SPOT_CHECK_RATE = 1 / 20;

/** `random` is a number in [0, 1), such as Math.random(); passed in so tests pick it. */
export function isSpotChecked(random: number): boolean {
  return random < SPOT_CHECK_RATE;
}

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
