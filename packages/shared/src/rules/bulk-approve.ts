// packages/shared/src/rules/bulk-approve.ts
import { checkApproval, type Approver } from "./approval";
import type { Expense } from "../schemas/expense";
import type { BulkApproveResult } from "../schemas/bulk-approve";

export function planBulkApproval(
  approver: Approver,
  found: Map<string, Expense>,
  ids: string[],
): BulkApproveResult[] {
  return ids.map((expenseId) => {
    const expense = found.get(expenseId);
    if (!expense) {
      return { expenseId, outcome: "skipped", reason: "not_found" };
    }
    const check = checkApproval(approver, expense);
    return check.ok
      ? { expenseId, outcome: "approved" }
      : { expenseId, outcome: "skipped", reason: check.reason };
  });
}
