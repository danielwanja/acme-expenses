// Runs inside the emulators: npm run test:emu
import { ApiError, SubmitResult } from "@acme/shared";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import request from "supertest";
import { beforeAll, beforeEach, expect, test, vi } from "vitest";
import { app } from "../src/app.js";

// Mock the boundary (token checks), not the route under test.
vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({ verifyIdToken: async (t: string) => ({ uid: t }) }),
}));

const draft = {
  ownerId: "erin", amount: 4_250, currency: "USD", category: "Meals",
  spentOn: "2026-10-14", note: "", receiptPath: null, status: "draft",
};

beforeAll(() => initializeApp({ projectId: "demo-acme" }));
beforeEach(async () => {
  await getFirestore().doc("expenses/d1").set(draft);
});

test("submitting a USD draft stores amountBase and the rate", async () => {
  const res = await request(app).post("/api/v1/expenses/d1/submit")
    .set("Authorization", "Bearer erin").expect(200);
  expect(SubmitResult.parse(res.body)).toMatchObject({ amountBase: 4_250, fxRate: 1 });
  const after = await getFirestore().doc("expenses/d1").get();
  expect(after.get("status")).toBe("submitted");
  expect(after.get("amountBase")).toBe(4_250);
});

test("only the owner can submit", async () => {
  const res = await request(app).post("/api/v1/expenses/d1/submit")
    .set("Authorization", "Bearer max").expect(403);
  expect(ApiError.parse(res.body).error.code).toBe("not_owner");
  const after = await getFirestore().doc("expenses/d1").get();
  expect(after.get("status")).toBe("draft");
});

test("a submitted expense can't be submitted or edited again", async () => {
  await getFirestore().doc("expenses/d1").update({ status: "submitted" });
  await request(app).post("/api/v1/expenses/d1/submit")
    .set("Authorization", "Bearer erin").expect(409);
  const res = await request(app).patch("/api/v1/expenses/d1")
    .set("Authorization", "Bearer erin").send({ note: "changed" }).expect(409);
  expect(ApiError.parse(res.body).error.code).toBe("not_draft");
});

test("the owner can edit a draft", async () => {
  await request(app).patch("/api/v1/expenses/d1")
    .set("Authorization", "Bearer erin").send({ note: "Team lunch" }).expect(204);
  const after = await getFirestore().doc("expenses/d1").get();
  expect(after.get("note")).toBe("Team lunch");
});
