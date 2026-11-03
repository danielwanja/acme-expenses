import { expect, test } from "vitest";
import { notificationFor } from "../src/services/notifications.js";

test.each([
  ["submitted", "awaiting_finance", { to: "finance", template: "finance_approval_needed" }],
  ["submitted", "approved", { to: "owner", template: "expense_approved" }],
  ["awaiting_finance", "approved", { to: "owner", template: "expense_approved" }],
  ["awaiting_finance", "rejected", { to: "owner", template: "expense_rejected" }],
  ["draft", "approved", { to: "owner", template: "expense_approved" }], // up to $75
  ["draft", "submitted", null],
  ["approved", "exported", null],
  ["approved", "approved", null], // e.g. the createdAt stamp: no status change
] as const)("%s -> %s", (before, after, expected) => {
  expect(notificationFor(before, after)).toEqual(expected);
});

test("the manager's approval of a $3,000 expense does not say 'approved'", () => {
  expect(notificationFor("submitted", "awaiting_finance")?.to).toBe("finance");
});
