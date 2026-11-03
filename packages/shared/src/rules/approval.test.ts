// packages/shared/src/rules/approval.test.ts
import { describe, expect, test } from "vitest";
import type { ApprovalStep } from "../schemas/approval.js";
import type { Expense } from "../schemas/expense.js";
import { convertToUsd } from "./money.js";
import {
  canApprove, checkApproval, FAIL_CLOSED_SETTINGS, isAutoApproved,
  readApprovalSettings, requiredSteps, type Approver,
} from "./approval.js";

const settings = { financeThresholdBase: 250_000, financeStep: true };
const flagOff = { ...settings, financeStep: false };

const max: Approver = { uid: "max", team: ["erin"], isFinance: false };
const fran: Approver = { uid: "fran", team: [], isFinance: true };
const managerInFinance: Approver = { uid: "mia", team: ["erin"], isFinance: true };

type E = Pick<Expense, "ownerId" | "status" | "amountBase">;
const expense = (e: Partial<E> = {}): E =>
  ({ ownerId: "erin", status: "submitted", amountBase: 12_000, ...e });
const approvalBy = (a: Approver, step: ApprovalStep) => ({ approverId: a.uid, step });

describe("isAutoApproved (up to $75, the receipt line)", () => {
  test.each([
    { cents: 0, expected: true },
    { cents: 7_499, expected: true },
    { cents: 7_500, expected: true }, // exactly $75: no receipt, auto
    { cents: 7_501, expected: false }, // receipt and a manager
  ])("$cents cents -> $expected", ({ cents, expected }) => {
    expect(isAutoApproved(cents)).toBe(expected);
  });
});

describe("canApprove (manager step)", () => {
  test.each([
    { who: "max", team: ["erin"], status: "submitted", ok: true },
    { who: "erin", team: ["erin"], status: "submitted", ok: false },
    { who: "max", team: [], status: "submitted", ok: false },
    { who: "max", team: ["erin"], status: "draft", ok: false },
    { who: "max", team: ["erin"], status: "approved", ok: false },
  ] as const)("$who, $status -> $ok", ({ who, team, status, ok }) => {
    const approver = { uid: who, team: [...team], isFinance: false };
    expect(canApprove({ approver, expense: expense({ status }), approvals: [], settings }))
      .toBe(ok);
  });
});

describe("requiredSteps: none up to $75, Finance over $2,500", () => {
  test.each([
    [7_500, []], // auto-approved at submission
    [7_501, ["manager"]],
    [249_999, ["manager"]],
    [250_000, ["manager"]], // exactly $2,500.00: "over" means the manager is enough
    [250_001, ["manager", "finance"]],
  ])("amountBase %i needs %j", (amountBase, steps) => {
    const e = { amountBase, status: "submitted" as const };
    expect(requiredSteps(e, settings)).toEqual(steps);
  });

  test("uses amountBase (USD), not amount: EUR 2,400 crosses after conversion", () => {
    const usd = convertToUsd({ amount: 240_000, currency: "EUR" }, 1.0842).amount;
    expect(usd).toBe(260_208);
    expect(requiredSteps({ amountBase: usd, status: "submitted" }, settings))
      .toEqual(["manager", "finance"]);
  });

  test("flag off: new expenses skip Finance", () => {
    expect(requiredSteps({ amountBase: 300_000, status: "submitted" }, flagOff))
      .toEqual(["manager"]);
  });

  test("an auto-approved expense is already approved: not_pending, not a step", () => {
    expect(checkApproval({
      approver: max,
      expense: expense({ amountBase: 4_250, status: "approved" }),
      approvals: [],
      settings,
    })).toEqual({ ok: false, reason: "not_pending" });
  });

  test("no amountBase fails closed", () => {
    expect(requiredSteps({ status: "submitted" }, settings)).toEqual(["manager", "finance"]);
  });
});

describe("checkApproval with a Finance step", () => {
  const big = expense({ amountBase: 300_000 });

  test("the manager's approval moves it to awaiting_finance", () => {
    expect(checkApproval({ approver: max, expense: big, approvals: [], settings }))
      .toEqual({ ok: true, step: "manager", nextStatus: "awaiting_finance" });
  });

  test("Finance's approval after the manager's makes it approved", () => {
    expect(checkApproval({
      approver: fran,
      expense: expense({ amountBase: 300_000, status: "awaiting_finance" }),
      approvals: [approvalBy(max, "manager")],
      settings,
    })).toEqual({ ok: true, step: "finance", nextStatus: "approved" });
  });

  test("one person can't give both approvals", () => {
    const result = checkApproval({
      approver: managerInFinance,
      expense: expense({ amountBase: 300_000, status: "awaiting_finance" }),
      approvals: [approvalBy(managerInFinance, "manager")],
      settings,
    });
    expect(result).toEqual({ ok: false, reason: "already_approved_by_you" });
  });

  test("Finance can't go before the manager", () => {
    expect(checkApproval({ approver: fran, expense: big, approvals: [], settings }))
      .toEqual({ ok: false, reason: "not_your_report" });
  });

  test("a manager can't give the Finance step", () => {
    expect(checkApproval({
      approver: { uid: "lee", team: ["erin"], isFinance: false },
      expense: expense({ amountBase: 300_000, status: "awaiting_finance" }),
      approvals: [approvalBy(max, "manager")],
      settings,
    })).toEqual({ ok: false, reason: "not_finance" });
  });

  test("Finance can't approve their own expense", () => {
    expect(checkApproval({
      approver: fran,
      expense: expense({ ownerId: "fran", amountBase: 300_000, status: "awaiting_finance" }),
      approvals: [approvalBy(max, "manager")],
      settings,
    })).toEqual({ ok: false, reason: "cannot_self_approve" });
  });

  test("flag turned off mid-flight: Finance can still approve what's waiting", () => {
    expect(checkApproval({
      approver: fran,
      expense: expense({ amountBase: 300_000, status: "awaiting_finance" }),
      approvals: [approvalBy(max, "manager")],
      settings: flagOff,
    })).toEqual({ ok: true, step: "finance", nextStatus: "approved" });
  });

  test("records for every step, but still pending, is already_approved", () => {
    expect(checkApproval({
      approver: { uid: "lee", team: ["erin"], isFinance: true },
      expense: expense({ status: "submitted" }),
      approvals: [approvalBy(max, "manager")],
      settings,
    })).toEqual({ ok: false, reason: "already_approved" });
  });
});

describe("readApprovalSettings", () => {
  test("valid settings pass through", () => {
    expect(readApprovalSettings(settings)).toEqual(settings);
  });

  test.each([
    ["missing", undefined],
    ["a float threshold", { financeThresholdBase: 2500.5, financeStep: true }],
    ["a zero threshold", { financeThresholdBase: 0, financeStep: true }],
    ["no flag", { financeThresholdBase: 250_000 }],
  ])("%s fails closed (Finance required)", (_name, data) => {
    expect(readApprovalSettings(data)).toEqual(FAIL_CLOSED_SETTINGS);
    expect(requiredSteps({ amountBase: 12_000, status: "submitted" }, readApprovalSettings(data)))
      .toEqual(["manager", "finance"]);
  });
});
