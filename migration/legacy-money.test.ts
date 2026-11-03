import { expect, test } from "vitest";
import { legacyAmountToCents } from "./legacy-money";

test.each([
  ["129.99", 12_999],
  ["19.99", 1_999], // 19.99 * 100 as a float would truncate to 1998
  ["1,234.50", 123_450],
  ["1,234,567.05", 123_456_705],
  ["0.5", 50],
  ["42", 4_200],
  ["-5.25", -525],
])("%s -> %i cents", (raw, cents) => {
  expect(legacyAmountToCents(raw)).toBe(cents);
});

test.each(["", "abc", "1,23.00", "12.345", "1.234,50", "$5.00"])(
  "fails loudly on %j",
  (raw) => {
    expect(() => legacyAmountToCents(raw)).toThrow(/Unparseable legacy amount/);
  },
);
