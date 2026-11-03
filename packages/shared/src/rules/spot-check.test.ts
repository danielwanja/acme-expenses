import { describe, expect, test } from "vitest";
import { isSpotChecked, SPOT_CHECK_RATE } from "./approval.js";

describe(`isSpotChecked (rate ${SPOT_CHECK_RATE})`, () => {
  test.each([
    { random: 0, expected: true },
    { random: 0.0499, expected: true },
    { random: 0.05, expected: false },
    { random: 0.9999, expected: false },
  ])("random $random -> $expected", ({ random, expected }) => {
    expect(isSpotChecked(random)).toBe(expected);
  });
});
