import { describe, expect, test } from "vitest";
import { BulkApproveRequest, MAX_BULK_APPROVE } from "../src/schemas/bulk-approve.js";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `e${i + 1}`);

describe("BulkApproveRequest", () => {
  test.each([
    { n: 0, ok: false },
    { n: 1, ok: true },
    { n: MAX_BULK_APPROVE, ok: true },
    { n: MAX_BULK_APPROVE + 1, ok: false },
  ])("$n ids -> $ok", ({ n, ok }) => {
    expect(BulkApproveRequest.safeParse({ expenseIds: ids(n) }).success).toBe(ok);
  });

  test("duplicate ids are rejected", () => {
    const r = BulkApproveRequest.safeParse({ expenseIds: ["e1", "e2", "e1"] });
    expect(r.success).toBe(false);
  });
});
