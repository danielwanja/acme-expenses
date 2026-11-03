import {
  ApprovalSettings, type ApprovalRecord, type ApprovalStep, type DenyReason,
} from "../schemas/approval.js";
import type { Expense, Status } from "../schemas/expense.js";
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

/** The person trying to approve, their reports, and whether they are Finance. */
export type Approver = { uid: string; team: string[]; isFinance: boolean };

export const PENDING: readonly Status[] = ["submitted", "awaiting_finance"];

/** Used when settings/approval is missing or invalid: require Finance for everything. */
export const FAIL_CLOSED_SETTINGS: ApprovalSettings = {
  financeThresholdBase: 0,
  financeStep: true,
};

/** Validates the settings document on every read, and fails closed. */
export function readApprovalSettings(data: unknown): ApprovalSettings {
  const parsed = ApprovalSettings.safeParse(data);
  return parsed.success ? parsed.data : FAIL_CLOSED_SETTINGS;
}

export type ApprovalInput = {
  approver: Approver;
  expense: Pick<Expense, "ownerId" | "status" | "amountBase">;
  approvals: Pick<ApprovalRecord, "step" | "approverId">[];
  settings: ApprovalSettings;
};

export type ApprovalDecision =
  | { ok: true; step: ApprovalStep; nextStatus: "approved" | "awaiting_finance" }
  | { ok: false; reason: DenyReason };
export type ApprovedDecision = Extract<ApprovalDecision, { ok: true }>;

const deny = (reason: DenyReason): ApprovalDecision => ({ ok: false, reason });

/**
 * Up to $75 needs no steps: it was approved at submission. Over the threshold
 * ("over", not "at"), Finance approves after the manager. Anything already
 * awaiting Finance keeps the step, so turning the flag off mid-flight strands
 * nothing.
 */
export function requiredSteps(
  e: Pick<Expense, "amountBase" | "status">, s: ApprovalSettings,
): ApprovalStep[] {
  // No amountBase yet (not submitted): fail closed, as if over the line.
  const amountBase = e.amountBase ?? Number.POSITIVE_INFINITY;
  if (isAutoApproved(amountBase)) return []; // approved at submission
  const needsFinance = e.status === "awaiting_finance" ||
    (s.financeStep && amountBase > s.financeThresholdBase);
  return needsFinance ? ["manager", "finance"] : ["manager"];
}

export function checkApproval(input: ApprovalInput): ApprovalDecision {
  const { approver, expense, approvals, settings } = input;
  if (approver.uid === expense.ownerId) return deny("cannot_self_approve");
  if (!PENDING.includes(expense.status)) return deny("not_pending");
  if (approvals.some((a) => a.approverId === approver.uid)) {
    return deny("already_approved_by_you");
  }
  const steps = requiredSteps(expense, settings);
  const done = new Set(approvals.map((a) => a.step));
  const step = steps.find((s) => !done.has(s));
  if (!step) return deny("already_approved");
  if (step === "manager" && !approver.team.includes(expense.ownerId)) {
    return deny("not_your_report");
  }
  if (step === "finance" && !approver.isFinance) return deny("not_finance");
  const last = step === steps[steps.length - 1];
  return { ok: true, step, nextStatus: last ? "approved" : "awaiting_finance" };
}

export function canApprove(input: ApprovalInput): boolean {
  return checkApproval(input).ok;
}
