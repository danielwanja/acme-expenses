// packages/shared/src/rules/approval.test.ts
import { describe, expect, test } from "vitest";
import { canApprove, isAutoApproved } from "./approval.js";

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

describe("canApprove", () => {
  test.each([
    { who: "max", team: ["erin"], status: "submitted", ok: true },
    { who: "erin", team: ["erin"], status: "submitted", ok: false },
    { who: "max", team: [], status: "submitted", ok: false },
    { who: "max", team: ["erin"], status: "draft", ok: false },
    { who: "max", team: ["erin"], status: "approved", ok: false },
  ] as const)("$who, $status -> $ok", ({ who, team, status, ok }) => {
    const expense = { ownerId: "erin", status };
    expect(canApprove({ uid: who, team: [...team] }, expense)).toBe(ok);
  });
});
