// Notifications react to the rule; they never apply it. They read the status
// the server wrote and never recompute the threshold.
import type { Status } from "@acme/shared";

export type Notification =
  | { to: "finance"; template: "finance_approval_needed" }
  | { to: "owner"; template: "expense_approved" | "expense_rejected" };

export function notificationFor(
  before: Status | undefined, after: Status | undefined,
): Notification | null {
  if (!after || before === after) return null;
  if (after === "awaiting_finance") return { to: "finance", template: "finance_approval_needed" };
  if (after === "approved") return { to: "owner", template: "expense_approved" };
  if (after === "rejected") return { to: "owner", template: "expense_rejected" };
  return null;
}
