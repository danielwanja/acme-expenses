import { describe, expect, test } from "vitest";
import { canApprove, checkApproval } from "./approval.js";

describe("checkApproval", () => {
  const max = { uid: "max", team: ["erin"] };

  test("a manager approves a submitted expense from their team", () => {
    expect(checkApproval(max, { ownerId: "erin", status: "submitted" }))
      .toEqual({ ok: true });
  });

  test("nobody approves their own expense", () => {
    expect(checkApproval({ uid: "erin", team: ["erin"] },
      { ownerId: "erin", status: "submitted" }))
      .toEqual({ ok: false, reason: "cannot_self_approve" });
  });

  test("only submitted expenses can be approved", () => {
    expect(canApprove(max, { ownerId: "erin", status: "draft" })).toBe(false);
  });
});
