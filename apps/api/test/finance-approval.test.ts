// Chapter 6: over $2,500 needs a second approval from Finance (npm run test:emu)
import { ApiError, ApprovalSettings, DecisionResult } from "@acme/shared";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { app } from "../src/app.js";
import { clearFirestore } from "./emulator.js";

// The token is the uid. fran is Finance; mia manages ivy and is also in Finance.
vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({ verifyIdToken: async (t: string) => ({
    uid: t, finance: t === "fran" || t === "mia", admin: t === "root" }) }),
}));

const ON = { financeThresholdBase: 250_000, financeStep: true };
const db = () => getFirestore();

function submitted(id: string, ownerId: string, amountBase: number) {
  return db().doc(`expenses/${id}`).set({
    ownerId, amount: amountBase, currency: "USD", category: "Travel",
    spentOn: "2026-10-14", note: "", receiptPath: "receipts/x.jpg",
    status: "submitted", amountBase,
  });
}
const approve = (id: string, as: string) =>
  request(app).post(`/api/v1/expenses/${id}/approve`).set("Authorization", `Bearer ${as}`);
const status = async (id: string) => (await db().doc(`expenses/${id}`).get()).get("status");

beforeAll(() => initializeApp({ projectId: "demo-acme" }));
beforeEach(async () => {
  await clearFirestore();
  await db().doc("settings/approval").set(ON);
  await db().doc("users/erin").set({ managerId: "max" });
  await db().doc("users/ivy").set({ managerId: "mia" });
  await submitted("big", "erin", 300_000);
  await submitted("edge", "erin", 250_000);
});

test("a $3,000 approval lands in awaiting_finance", async () => {
  const res = await approve("big", "max").expect(200);
  expect(DecisionResult.parse(res.body).status).toBe("awaiting_finance");
  expect(await status("big")).toBe("awaiting_finance");
  const record = await db().doc("expenses/big/approvals/manager").get();
  expect(record.data()).toMatchObject({ step: "manager", approverId: "max",
    amountBase: 300_000, financeThresholdBase: 250_000, via: "single" });
});

test("Finance's approval moves it to approved, and two records exist", async () => {
  await approve("big", "max").expect(200);
  const res = await approve("big", "fran").expect(200);
  expect(DecisionResult.parse(res.body).status).toBe("approved");
  const records = await db().collection("expenses/big/approvals").get();
  expect(records.docs.map((d) => d.id).sort()).toEqual(["finance", "manager"]);
  expect((await db().doc("expenses/big").get()).get("approvedAt")).toBeDefined();
});

test("exactly $2,500.00 needs only the manager", async () => {
  await approve("edge", "max").expect(200);
  expect(await status("edge")).toBe("approved");
});

test("Finance can't go before the manager", async () => {
  const res = await approve("big", "fran").expect(403);
  expect(ApiError.parse(res.body).error.code).toBe("not_your_report");
  expect(await status("big")).toBe("submitted");
});

test("one person can't give both approvals", async () => {
  await submitted("ivy-big", "ivy", 300_000);
  await approve("ivy-big", "mia").expect(200);
  const res = await approve("ivy-big", "mia").expect(409);
  expect(ApiError.parse(res.body).error.code).toBe("already_approved_by_you");
  expect(await status("ivy-big")).toBe("awaiting_finance");
});

describe("rollout flag and settings", () => {
  test("flag off: new expenses skip Finance", async () => {
    await db().doc("settings/approval").set({ ...ON, financeStep: false });
    await approve("big", "max").expect(200);
    expect(await status("big")).toBe("approved");
  });

  test("flag turned off mid-flight: Finance can still approve what's waiting", async () => {
    await approve("big", "max").expect(200);
    await db().doc("settings/approval").set({ ...ON, financeStep: false });
    await approve("big", "fran").expect(200);
    expect(await status("big")).toBe("approved");
  });

  test("missing settings fail closed: even $10 needs Finance", async () => {
    await db().doc("settings/approval").delete();
    await submitted("small", "erin", 1_000);
    await approve("small", "max").expect(200);
    expect(await status("small")).toBe("awaiting_finance");
  });

  test("only admins change settings, and each change is recorded", async () => {
    const next = { financeThresholdBase: 300_000, financeStep: true };
    await request(app).put("/api/v1/settings/approval")
      .set("Authorization", "Bearer max").send(next).expect(403);
    const res = await request(app).put("/api/v1/settings/approval")
      .set("Authorization", "Bearer root").send(next).expect(200);
    expect(ApprovalSettings.parse(res.body)).toEqual(next);
    const history = await db().collection("settings/approval/history").get();
    expect(history.docs[0]?.data()).toMatchObject({ before: ON, after: next, changedBy: "root" });
  });

  test("invalid settings are refused", async () => {
    await request(app).put("/api/v1/settings/approval")
      .set("Authorization", "Bearer root")
      .send({ financeThresholdBase: 2500.5, financeStep: true }).expect(400);
  });
});
