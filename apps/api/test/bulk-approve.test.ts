// POST /api/v1/expenses/bulk-approve against the emulator (npm run test:emu)
import { BulkApproveResponse } from "@acme/shared";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import request from "supertest";
import { beforeAll, beforeEach, expect, test, vi } from "vitest";
import { app } from "../src/app.js";
import { clearFirestore } from "./emulator.js";

// The token is the uid; "max" carries the manager claim.
vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({ verifyIdToken: async (t: string) =>
    ({ uid: t, role: t === "max" ? "manager" : "employee" }) }),
}));

const submitted = (ownerId: string) => ({
  ownerId, amount: 12_000, currency: "USD", category: "Meals", spentOn: "2026-10-14",
  note: "", receiptPath: `receipts/${ownerId}/lunch.jpg`, status: "submitted", amountBase: 12_000,
});

beforeAll(() => initializeApp({ projectId: "demo-acme" }));
beforeEach(async () => {
  await clearFirestore();
  const db = getFirestore();
  await db.doc("users/erin").set({ managerId: "max" });
  await db.doc("users/sam").set({ managerId: "max" });
  await db.doc("users/zoe").set({ managerId: "lee" });
  await db.doc("expenses/b1").set(submitted("erin"));
  await db.doc("expenses/b2").set(submitted("sam"));
  await db.doc("expenses/b3").set(submitted("zoe"));
  await db.doc("expenses/b4").set(submitted("max"));
});

const bulk = (expenseIds: string[]) => request(app).post("/api/v1/expenses/bulk-approve")
  .set("Authorization", "Bearer max").send({ expenseIds });

test("happy path: every expense is approved, marked as bulk", async () => {
  const res = await bulk(["b1", "b2"]).expect(200);
  expect(BulkApproveResponse.parse(res.body).results.map((r) => r.outcome))
    .toEqual(["approved", "approved"]);
  const b1 = await getFirestore().doc("expenses/b1").get();
  expect(b1.get("status")).toBe("approved");
  expect(b1.get("approvedVia")).toBe("bulk");
  expect(b1.get("approvedBy")).toBe("max");
});

test("mixed results: refused ones are skipped with a reason, not fatal", async () => {
  const res = await bulk(["b1", "b3", "b4", "missing"]).expect(200);
  expect(BulkApproveResponse.parse(res.body).results).toEqual([
    { expenseId: "b1", outcome: "approved" },
    { expenseId: "b3", outcome: "skipped", reason: "not_your_report" },
    { expenseId: "b4", outcome: "skipped", reason: "cannot_self_approve" },
    { expenseId: "missing", outcome: "skipped", reason: "not_found" },
  ]);
  const b3 = await getFirestore().doc("expenses/b3").get();
  expect(b3.get("status")).toBe("submitted");
});

test("sending the same request twice approves nothing twice", async () => {
  await bulk(["b1", "b2"]).expect(200);
  const again = await bulk(["b1", "b2"]).expect(200);
  expect(BulkApproveResponse.parse(again.body).results).toEqual([
    { expenseId: "b1", outcome: "skipped", reason: "not_pending" },
    { expenseId: "b2", outcome: "skipped", reason: "not_pending" },
  ]);
});
