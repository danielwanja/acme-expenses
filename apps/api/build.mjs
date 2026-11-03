// Bundles src/index.ts into lib/index.js for the Functions runtime.
// Runtime dependencies stay external (installed from package.json at deploy);
// the @acme/shared workspace package is bundled into the function build.
import { readFileSync } from "node:fs";
import { build } from "esbuild";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const external = Object.keys(pkg.dependencies).flatMap((name) => [name, `${name}/*`]);

await build({
  entryPoints: ["src/index.ts"],
  outfile: "lib/index.js",
  bundle: true,
  platform: "node",
  target: "node24",
  format: "cjs",
  sourcemap: true,
  external,
  logLevel: "info",
});
