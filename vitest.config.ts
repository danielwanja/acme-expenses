import { defineConfig } from "vitest/config";

// Files in apps/api/test that need the Firestore emulator (npm run test:emu).
// Everything else in apps/api/test runs in plain npm test.
const apiEmulatorTests = [
  "test/approve.test.ts",
  "test/expenses.test.ts",
  "test/pending.test.ts",
];

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: "shared",
          root: "packages/shared",
          include: ["src/**/*.test.ts", "test/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "api",
          root: "apps/api",
          include: ["test/**/*.test.ts"],
          exclude: apiEmulatorTests,
        },
      },
      {
        test: {
          name: "api-emu",
          root: "apps/api",
          include: apiEmulatorTests,
          fileParallelism: false, // one emulator, shared documents
        },
      },
      {
        test: {
          name: "web",
          root: "apps/web",
          include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["src/test/setup.ts"],
        },
      },
      {
        test: {
          name: "rules",
          include: ["tests/rules/**/*.test.ts"],
          fileParallelism: false,
        },
      },
    ],
  },
});
