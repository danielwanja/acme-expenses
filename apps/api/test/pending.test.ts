// GET /api/v1/approvals/pending (runs in npm run test:emu)
import { ApiError, PendingPage } from "@acme/shared";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import request from "supertest";
import { beforeAll, beforeEach, expect, test, vi } from "vitest";
import { app } from "../src/app.js";
import { clearFirestore } from "./emulator.js";

// The token is the uid; "fran" carries the finance claim.
vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({ verifyIdToken: async (t: string) => ({ uid: t, finance: t === "fran" }) }),
}));

const daysAgo = (n: number) => Timestamp.fromMillis(Date.now() - n * 86_400_000);

function expense(id: string, ownerId: string, status: string, age: number) {
  return getFirestore().doc(`expenses/${id}`).set({
    ownerId, amount: 12_000, currency: "USD", category: "Meals", spentOn: "2026-10-14",
    note: `note for ${id}`, receiptPath: `receipts/${ownerId}/${id}.jpg`, status,
    amountBase: 12_000, baseCurrency: "USD", fxRate: 1, fxRateDate: "2026-10-14",
    submittedAt: daysAgo(age),
  });
}

beforeAll(() => initializeApp({ projectId: "demo-acme" }));
beforeEach(async () => {
  await clearFirestore();
  const db = getFirestore();
  await db.doc("settings/approval").set({ financeThresholdBase: 250_000, financeStep: true });
  await db.doc("users/erin").set({ displayName: "Erin", managerId: "max" });
  await db.doc("users/sam").set({ displayName: "Sam", managerId: "max" });
  await db.doc("users/zoe").set({ displayName: "Zoe", managerId: "other" });
  await db.doc("users/max").set({ displayName: "Max", managerId: "boss" });
  await expense("e1", "erin", "submitted", 3);
  await expense("e2", "sam", "submitted", 5);
  await expense("e3", "zoe", "submitted", 9); // not Max's report
  await expense("e4", "erin", "draft", 0); // not submitted
  await expense("e5", "max", "submitted", 7); // Max's own
});

const pending = (query = "") => request(app).get(`/api/v1/approvals/pending${query}`)
  .set("Authorization", "Bearer max");

test("only expenses routed to the caller, oldest first, in summary view", async () => {
  const page = PendingPage.parse((await pending().expect(200)).body);
  expect(page.items.map((i) => i.expenseId)).toEqual(["e2", "e1"]);
  expect(page.totalPending).toBe(2);
  expect(Object.keys(page.items[0]!).sort())
    .toEqual(["ageDays", "amountDisplay", "category", "employeeName", "expenseId"]);
  expect(page.items[0]).toMatchObject({ employeeName: "Sam", amountDisplay: "$120.00",
    ageDays: 5 });
});

test("view=full adds dates, amounts and the note", async () => {
  const page = PendingPage.parse((await pending("?view=full").expect(200)).body);
  expect(page.items[0]).toMatchObject({ status: "submitted", note: "note for e2",
    converted: { amount: 12_000, currency: "USD" } });
});

test("pages with nextCursor, then cursor_invalid for a stale cursor", async () => {
  const first = PendingPage.parse((await pending("?limit=1").expect(200)).body);
  expect(first.nextCursor).not.toBeNull();
  const second = PendingPage.parse(
    (await pending(`?limit=1&cursor=${first.nextCursor}`).expect(200)).body);
  expect(second.items.map((i) => i.expenseId)).toEqual(["e1"]);
  expect(second.nextCursor).toBeNull();
  const bad = await pending("?cursor=garbage").expect(400);
  expect(ApiError.parse(bad.body).error.code).toBe("cursor_invalid");
});

test("Finance sees what awaits Finance; the manager no longer does", async () => {
  const db = getFirestore();
  await db.doc("users/fran").set({ displayName: "Fran", managerId: "boss" });
  await db.doc("expenses/e2").update({ status: "awaiting_finance", amountBase: 300_000 });
  await db.doc("expenses/e2/approvals/manager")
    .set({ step: "manager", approverId: "max", via: "single" });
  const asFran = await request(app).get("/api/v1/approvals/pending")
    .set("Authorization", "Bearer fran").expect(200);
  expect(PendingPage.parse(asFran.body).items.map((i) => i.expenseId)).toEqual(["e2"]);
  const asMax = PendingPage.parse((await pending().expect(200)).body);
  expect(asMax.items.map((i) => i.expenseId)).toEqual(["e1"]);
});
