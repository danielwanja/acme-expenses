// tests/rules/expenses.rules.test.ts (runs in npm run test:emu)
// Security Rules, not business rules: what a client SDK may read and write.
// For every allow, at least one near miss that must fail.
import { readFileSync } from "node:fs";
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";

let testEnv: RulesTestEnvironment;

const draft = (ownerId: string, extra: Record<string, unknown> = {}) => ({
  ownerId, amount: 4_250, currency: "USD", category: "Meals", spentOn: "2026-10-14",
  note: "", receiptPath: null, status: "draft", ...extra,
});

/** Seeds documents as the Admin SDK would: rules don't apply. */
async function seed(path: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data);
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-acme",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});
beforeEach(() => testEnv.clearFirestore());
afterAll(() => testEnv.cleanup());

describe("creating expenses", () => {
  test("an employee can create their own draft", async () => {
    const erin = testEnv.authenticatedContext("erin").firestore();
    await assertSucceeds(setDoc(doc(erin, "expenses/e1"), draft("erin")));
  });

  test("an employee can't create an expense for someone else", async () => {
    const erin = testEnv.authenticatedContext("erin").firestore();
    await assertFails(setDoc(doc(erin, "expenses/e2"), { ownerId: "sam",
      amount: 4_250, currency: "USD", status: "draft" }));
  });

  test("a new expense must be a draft", async () => {
    const erin = testEnv.authenticatedContext("erin").firestore();
    await assertFails(setDoc(doc(erin, "expenses/e3"),
      draft("erin", { status: "submitted" })));
  });

  test("a client can't set server-owned fields such as amountBase", async () => {
    const erin = testEnv.authenticatedContext("erin").firestore();
    await assertFails(setDoc(doc(erin, "expenses/e4"),
      draft("erin", { amountBase: 1 })));
  });

  test("a client can't approve its own draft automatically", async () => {
    const erin = testEnv.authenticatedContext("erin").firestore();
    await assertFails(setDoc(doc(erin, "expenses/e6"),
      draft("erin", { approvedBy: "auto", spotCheck: false })));
  });

  test("money must be integer minor units", async () => {
    const erin = testEnv.authenticatedContext("erin").firestore();
    await assertFails(setDoc(doc(erin, "expenses/e5"), draft("erin", { amount: 42.5 })));
  });

  test("an anonymous user can't create anything", async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(anon, "expenses/e6"), draft("erin")));
  });
});

describe("reading expenses", () => {
  beforeEach(() => seed("expenses/e1", draft("erin")));

  test("an employee reads their own expense", async () => {
    const erin = testEnv.authenticatedContext("erin").firestore();
    await assertSucceeds(getDoc(doc(erin, "expenses/e1")));
  });

  test("an employee can't read a colleague's expense", async () => {
    const sam = testEnv.authenticatedContext("sam").firestore();
    await assertFails(getDoc(doc(sam, "expenses/e1")));
  });

  test("a manager reads their reports' expenses", async () => {
    const max = testEnv.authenticatedContext("max", { role: "manager" }).firestore();
    await assertSucceeds(getDoc(doc(max, "expenses/e1")));
  });

  test("anonymous user cannot read expenses", async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, "expenses/e1")));
  });
});

describe("changing expenses", () => {
  test("no client can approve, not even a manager", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "expenses/e1"),
        { ownerId: "erin", amount: 4_250, currency: "USD",
          status: "submitted" });
    });
    const max = testEnv.authenticatedContext("max", { role: "manager" });
    await assertFails(updateDoc(doc(max.firestore(), "expenses/e1"),
      { status: "approved" }));
  });

  test("a manager's client can't set status, approvedBy or approvedVia", async () => {
    await seed("expenses/e1", draft("erin", { status: "submitted" }));
    const max = testEnv.authenticatedContext("max", { role: "manager" }).firestore();
    await assertFails(updateDoc(doc(max, "expenses/e1"),
      { status: "approved", approvedBy: "max", approvedVia: "bulk" }));
  });

  test("even the owner edits a draft through the API, not directly", async () => {
    await seed("expenses/e1", draft("erin"));
    const erin = testEnv.authenticatedContext("erin").firestore();
    await assertFails(updateDoc(doc(erin, "expenses/e1"), { note: "edited" }));
  });
});

describe("server-only data", () => {
  test("nobody can give themselves a role through users/{uid}", async () => {
    await seed("users/erin", { role: "employee", managerId: "max" });
    const erin = testEnv.authenticatedContext("erin").firestore();
    await assertSucceeds(getDoc(doc(erin, "users/erin")));
    await assertFails(updateDoc(doc(erin, "users/erin"), { role: "manager" }));
  });
});
