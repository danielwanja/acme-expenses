// packages/shared/src/rules/money.test.ts
import { describe, expect, test } from "vitest";
import { convertToUsd, formatMoney, minorDigits, parseAmountInput } from "./money.js";

// rate: USD per one major unit of the source currency
// Rounding (Finance decision): half a cent rounds up.
test.each([
  { amount: 1_000, currency: "EUR", rate: 1.0825, usd: 1_083 }, // half
  { amount: 1_999, currency: "EUR", rate: 1.0825, usd: 2_164 },
  { amount: 1_000, currency: "JPY", rate: 0.0067, usd: 670 },
  { amount: 4_250, currency: "USD", rate: 1, usd: 4_250 },
])("$amount $currency at $rate -> $usd cents", (row) => {
  const out = convertToUsd(row, row.rate);
  expect(out).toEqual({ amount: row.usd, currency: "USD" });
  expect(Number.isInteger(out.amount)).toBe(true);
});

describe("convertToUsd edge cases", () => {
  test("zero stays zero", () => {
    expect(convertToUsd({ amount: 0, currency: "EUR" }, 1.0825).amount).toBe(0);
  });

  test("three minor digits: 1,000 fils (KWD) is 1 KWD", () => {
    expect(convertToUsd({ amount: 1_000, currency: "KWD" }, 3.25).amount).toBe(325);
  });

  test.each([-1, 1.5])("rejects amount %d (not non-negative integer minor units)", (a) => {
    expect(() => convertToUsd({ amount: a, currency: "USD" }, 1)).toThrow(RangeError);
  });

  test("rejects a zero or negative rate", () => {
    expect(() => convertToUsd({ amount: 100, currency: "EUR" }, 0)).toThrow(RangeError);
  });
});

describe("minorDigits", () => {
  test.each([["USD", 2], ["EUR", 2], ["JPY", 0], ["KWD", 3]])("%s -> %i", (c, d) => {
    expect(minorDigits(c)).toBe(d);
  });
});

describe("parseAmountInput", () => {
  test.each([
    { text: "42.50", currency: "USD", cents: 4_250 },
    { text: "42.5", currency: "USD", cents: 4_250 },
    { text: "19.99", currency: "USD", cents: 1_999 }, // no float drift
    { text: "1,234.56", currency: "USD", cents: 123_456 },
    { text: "1000", currency: "JPY", cents: 1_000 },
    { text: "10.5", currency: "JPY", cents: null },
    { text: "4.255", currency: "USD", cents: null },
    { text: "-5", currency: "USD", cents: null },
    { text: "abc", currency: "USD", cents: null },
  ])("$text $currency -> $cents", ({ text, currency, cents }) => {
    expect(parseAmountInput(text, currency)).toBe(cents);
  });
});

describe("formatMoney", () => {
  test.each([
    [{ amount: 4_250, currency: "USD" }, "$42.50"],
    [{ amount: 5, currency: "USD" }, "$0.05"],
    [{ amount: 1_000, currency: "JPY" }, "¥1,000"],
    [{ amount: 250_000, currency: "USD" }, "$2,500.00"],
  ])("%j -> %s", (money, text) => {
    expect(formatMoney(money)).toBe(text);
  });
});
