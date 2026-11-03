import type { Expense } from "../schemas/expense.js";

/** Only drafts can be edited (and submitting is the last edit). */
export function canEdit(expense: Pick<Expense, "status">): boolean {
  return expense.status === "draft";
}
