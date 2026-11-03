// npm run openapi: writes packages/shared/openapi.yaml from the Zod schemas.
import { writeFileSync } from "node:fs";
import { stringify } from "yaml";
import { buildOpenApiDocument } from "./build.js";

const out = new URL("../../openapi.yaml", import.meta.url);
const header = "# Generated from the Zod schemas by `npm run openapi`. Don't edit.\n";
writeFileSync(out, header + stringify(buildOpenApiDocument()));
console.log(`wrote ${out.pathname}`);
