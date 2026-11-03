// apps/api/test/approve.test.ts (runs in npm run test:emu)
import request from "supertest";
import { beforeAll, beforeEach, expect, test, vi } from "vitest";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { app } from "../src/app.js";

// Mock the boundary (token checks), not the route under test.
vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({ verifyIdToken: async (t: string) => ({ uid: t }) }),
}));

beforeAll(() => initializeApp({ projectId: "demo-acme" }));
beforeEach(async () => {
  const db = getFirestore();
  await db.recursiveDelete(db.doc("expenses/e1"));
  await db.doc("settings/approval").set({ financeThresholdBase: 250_000, financeStep: true });
  await db.doc("users/erin").set({ role: "employee", managerId: "max" });
  await db.doc("expenses/e1").set({ ownerId: "erin", amount: 12_000,
    currency: "USD", status: "submitted", amountBase: 12_000 });
});

test("an employee can't approve their own expense", async () => {
  const res = await request(app).post("/api/v1/expenses/e1/approve")
    .set("Authorization", "Bearer erin").expect(403);
  expect(res.body.error.code).toBe("cannot_self_approve");
  const after = await getFirestore().doc("expenses/e1").get();
  expect(after.get("status")).toBe("submitted");
});

test("their manager approves it, and the approver is recorded", async () => {
  const res = await request(app).post("/api/v1/expenses/e1/approve")
    .set("Authorization", "Bearer max").expect(200);
  expect(res.body.status).toBe("approved");
  const after = await getFirestore().doc("expenses/e1").get();
  expect(after.get("status")).toBe("approved");
  const record = await getFirestore().doc("expenses/e1/approvals/manager").get();
  expect(record.get("approverId")).toBe("max");
});

test("a manager from another team can't approve it", async () => {
  const res = await request(app).post("/api/v1/expenses/e1/approve")
    .set("Authorization", "Bearer lee").expect(403);
  expect(res.body.error.code).toBe("not_your_report");
  const after = await getFirestore().doc("expenses/e1").get();
  expect(after.get("status")).toBe("submitted");
});

test("an expense that isn't submitted can't be approved", async () => {
  await getFirestore().doc("expenses/e1").update({ status: "draft" });
  const res = await request(app).post("/api/v1/expenses/e1/approve")
    .set("Authorization", "Bearer max").expect(409);
  expect(res.body.error.code).toBe("not_pending");
});

test("rejecting records who and why", async () => {
  await request(app).post("/api/v1/expenses/e1/reject")
    .set("Authorization", "Bearer max").send({ reason: "No receipt" }).expect(200);
  const after = await getFirestore().doc("expenses/e1").get();
  expect(after.get("status")).toBe("rejected");
  expect(after.get("rejectionReason")).toBe("No receipt");
});

test("a missing expense is a 404", async () => {
  const res = await request(app).post("/api/v1/expenses/nope/approve")
    .set("Authorization", "Bearer max").expect(404);
  expect(res.body.error.code).toBe("expense_not_found");
});
