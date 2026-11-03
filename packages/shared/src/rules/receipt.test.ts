// packages/shared/src/rules/receipt.test.ts
import { describe, expect, test } from "vitest";
import { isReceiptRequired } from "./receipt";

describe("isReceiptRequired", () => {
  test.each([
    [7_499, false],
    [7_500, false], // exactly $75: no receipt needed
    [7_501, true],
    [250_000, true],
  ])("amountBase %i -> %s", (cents, expected) => {
    expect(isReceiptRequired(cents)).toBe(expected);
  });
});
