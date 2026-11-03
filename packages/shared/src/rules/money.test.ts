import { describe, expect, test } from "vitest";
import { formatMoney, minorDigits, parseAmountInput } from "./money.js";

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
