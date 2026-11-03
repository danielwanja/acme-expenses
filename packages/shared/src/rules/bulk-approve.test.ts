import { describe, expect, test } from "vitest";
import type { Approver } from "./approval.js";
import { planBulkApproval, type BulkCandidate } from "./bulk-approve.js";

const max: Approver = { uid: "max", team: ["erin", "sam"], isFinance: false };
const settings = { financeThresholdBase: 250_000, financeStep: true };
const candidate = (
  ownerId: string, status: BulkCandidate["expense"]["status"] = "submitted",
  amountBase = 12_000,
): BulkCandidate => ({ expense: { ownerId, status, amountBase }, approvals: [] });
const results = (ids: string[], found: Map<string, BulkCandidate>) =>
  planBulkApproval(max, found, ids, settings).map((p) => p.result);

describe("planBulkApproval", () => {
  test("approves what a single approval would approve", () => {
    const found = new Map([["e1", candidate("erin")], ["e2", candidate("sam")]]);
    expect(results(["e1", "e2"], found)).toEqual([
      { expenseId: "e1", outcome: "approved" },
      { expenseId: "e2", outcome: "approved" },
    ]);
  });

  test("skips, with the reason, everything a single approval would refuse", () => {
    const found = new Map([
      ["own", candidate("max")],
      ["done", candidate("erin", "approved")],
      ["other", candidate("zoe")],
      ["ok", candidate("sam")],
    ]);
    expect(results(["own", "done", "other", "gone", "ok"], found)).toEqual([
      { expenseId: "own", outcome: "skipped", reason: "cannot_self_approve" },
      { expenseId: "done", outcome: "skipped", reason: "not_pending" },
      { expenseId: "other", outcome: "skipped", reason: "not_your_report" },
      { expenseId: "gone", outcome: "skipped", reason: "not_found" },
      { expenseId: "ok", outcome: "approved" },
    ]);
  });

  test("over $2,500 is sent to Finance, not approved", () => {
    const found = new Map([["big", candidate("erin", "submitted", 300_000)]]);
    const [plan] = planBulkApproval(max, found, ["big"], settings);
    expect(plan?.result).toEqual({ expenseId: "big", outcome: "sent_to_finance" });
    expect(plan?.decision).toEqual(
      { ok: true, step: "manager", nextStatus: "awaiting_finance" });
  });

  test("keeps the order of the request", () => {
    const found = new Map([["a", candidate("erin")], ["b", candidate("sam")]]);
    expect(results(["b", "a"], found).map((r) => r.expenseId)).toEqual(["b", "a"]);
  });
});
