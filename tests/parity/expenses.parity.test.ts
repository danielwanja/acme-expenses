// tests/parity/expenses.parity.test.ts
import { readdirSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { callLegacy, callNew } from "./clients";
import { fromLegacy } from "./normalize";

const dir = "tests/parity/cases";
const cases = readdirSync(dir).map((file) =>
  JSON.parse(readFileSync(`${dir}/${file}`, "utf8")),
);

test.each(cases)("$name: legacy still matches recording", async (c) => {
  expect(await callLegacy(c.request)).toEqual(c.recorded);
});

test.each(cases)("$name: new app matches legacy", async (c) => {
  expect(await callNew(c.request)).toEqual(fromLegacy(c.recorded));
});
