import { MAX_BULK_APPROVE } from "@acme/shared";
import { describe, expect, test } from "vitest";
import { bulkBlocker, summarize, toggle } from "./selection";

describe("bulkBlocker", () => {
  test.each([
    { count: 0, blocked: true },
    { count: 1, blocked: false },
    { count: MAX_BULK_APPROVE, blocked: false },
    { count: MAX_BULK_APPROVE + 1, blocked: true },
  ])("$count selected -> blocked: $blocked", ({ count, blocked }) => {
    expect(bulkBlocker(count) !== null).toBe(blocked);
  });

  test("over the limit says why, using the shared limit", () => {
    expect(bulkBlocker(21)).toBe("You can approve up to 20 at once.");
  });
});

test("toggle adds and removes without mutating", () => {
  const empty = new Set<string>();
  const one = toggle(empty, "e1");
  expect([...one]).toEqual(["e1"]);
  expect([...toggle(one, "e1")]).toEqual([]);
  expect(empty.size).toBe(0);
});

test("summarize mentions Finance only when something went there", () => {
  expect(summarize([
    { expenseId: "a", outcome: "approved" },
    { expenseId: "b", outcome: "sent_to_finance" },
  ])).toBe("1 approved, 0 skipped, 1 sent to Finance");
});

test("summarize counts approved and skipped", () => {
  expect(summarize([
    { expenseId: "a", outcome: "approved" },
    { expenseId: "b", outcome: "skipped", reason: "not_pending" },
  ])).toBe("1 approved, 1 skipped");
});
