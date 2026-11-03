import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { parse } from "yaml";
import { buildOpenApiDocument } from "../src/openapi/build.js";

test("committed openapi.yaml matches the Zod schemas", () => {
  const file = new URL("../openapi.yaml", import.meta.url);
  const committed = parse(readFileSync(file, "utf8"));
  expect(committed).toEqual(buildOpenApiDocument());
});
