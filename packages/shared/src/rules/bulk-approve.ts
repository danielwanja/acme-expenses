// packages/shared/src/rules/bulk-approve.ts
import {
  checkApproval, type ApprovalInput, type ApprovedDecision, type Approver,
} from "./approval";
import type { ApprovalSettings } from "../schemas/approval";
import type { BulkApproveResult } from "../schemas/bulk-approve";

/** What the service read for one id: the expense and its approval records. */
export type BulkCandidate = Pick<ApprovalInput, "expense" | "approvals">;

/** The public result, plus the decision the service needs to write it. */
export type BulkPlan = { result: BulkApproveResult; decision?: ApprovedDecision };

export function planBulkApproval(
  approver: Approver,
  found: Map<string, BulkCandidate>,
  ids: string[],
  settings: ApprovalSettings,
): BulkPlan[] {
  return ids.map((expenseId) => {
    const candidate = found.get(expenseId);
    if (!candidate) {
      return { result: { expenseId, outcome: "skipped", reason: "not_found" } };
    }
    const check = checkApproval({ approver, settings, ...candidate });
    if (!check.ok) {
      return { result: { expenseId, outcome: "skipped", reason: check.reason } };
    }
    // "approved" would be a lie for an expense that still needs Finance.
    const outcome = check.nextStatus === "approved" ? "approved" : "sent_to_finance";
    return { result: { expenseId, outcome }, decision: check };
  });
}
