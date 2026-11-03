import { describe, expect, test } from "vitest";
import type { Expense } from "../schemas/expense.js";
import { planBulkApproval } from "./bulk-approve.js";

const max = { uid: "max", team: ["erin", "sam"] };
const expense = (ownerId: string, status: Expense["status"] = "submitted"): Expense => ({
  ownerId, amount: 12_000, currency: "USD", category: "Meals", spentOn: "2026-10-14",
  note: "", receiptPath: `receipts/${ownerId}/lunch.jpg`, status, amountBase: 12_000,
});

describe("planBulkApproval", () => {
  test("approves what a single approval would approve", () => {
    const found = new Map([["e1", expense("erin")], ["e2", expense("sam")]]);
    expect(planBulkApproval(max, found, ["e1", "e2"])).toEqual([
      { expenseId: "e1", outcome: "approved" },
      { expenseId: "e2", outcome: "approved" },
    ]);
  });

  test("skips, with the reason, everything a single approval would refuse", () => {
    const found = new Map([
      ["own", expense("max")],
      ["done", expense("erin", "approved")],
      ["other", expense("zoe")],
      ["ok", expense("sam")],
    ]);
    expect(planBulkApproval(max, found, ["own", "done", "other", "gone", "ok"])).toEqual([
      { expenseId: "own", outcome: "skipped", reason: "cannot_self_approve" },
      { expenseId: "done", outcome: "skipped", reason: "not_pending" },
      { expenseId: "other", outcome: "skipped", reason: "not_your_report" },
      { expenseId: "gone", outcome: "skipped", reason: "not_found" },
      { expenseId: "ok", outcome: "approved" },
    ]);
  });

  test("keeps the order of the request", () => {
    const found = new Map([["a", expense("erin")], ["b", expense("sam")]]);
    expect(planBulkApproval(max, found, ["b", "a"]).map((r) => r.expenseId))
      .toEqual(["b", "a"]);
  });
});
