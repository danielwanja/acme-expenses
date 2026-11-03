import { describe, expect, test } from "vitest";
import { BulkApproveRequest, MAX_BULK_APPROVE } from "../src/schemas/bulk-approve.js";
import { ListExpensesQuery } from "../src/schemas/partner.js";

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

describe("ListExpensesQuery", () => {
  test("defaults to approved, 25 per page", () => {
    expect(ListExpensesQuery.parse({})).toEqual({ status: "approved", limit: 25 });
  });

  test.each(["0", "101", "abc"])("limit=%s is invalid", (limit) => {
    expect(ListExpensesQuery.safeParse({ limit }).success).toBe(false);
  });
});
