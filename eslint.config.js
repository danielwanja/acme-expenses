import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**", "**/dist/**", "**/lib/**",
      "**/*.d.ts", "playwright-report/**", "test-results/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "max-len": ["error", { code: 100, ignoreUrls: true }],
      // House libraries (CLAUDE.md): one HTTP client, configured once.
      "no-restricted-imports": ["error", {
        paths: ["axios", "got", "node-fetch"].map((name) => ({
          name, message: "Use ky (CLAUDE.md, House libraries).",
        })),
      }],
    },
  },
);
