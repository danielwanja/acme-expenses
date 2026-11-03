// Runs inside the emulators: npm run test:emu
import { readFileSync } from "node:fs";
import { ApiError, SubmitResult } from "@acme/shared";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { app } from "../src/app.js";
import { configureSpotCheck } from "../src/routes/expenses.js";
import { configureFx } from "../src/services/fx-client.js";

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
  configureSpotCheck(() => 0.5); // no spot check unless a test asks for one
});

test("submitting a USD draft over $75 stores amountBase and waits for the manager", async () => {
  await getFirestore().doc("expenses/d1")
    .update({ amount: 12_000, receiptPath: "receipts/erin/lunch.jpg" });
  const res = await request(app).post("/api/v1/expenses/d1/submit")
    .set("Authorization", "Bearer erin").expect(200);
  expect(SubmitResult.parse(res.body))
    .toMatchObject({ status: "submitted", amountBase: 12_000, fxRate: 1 });
  const after = await getFirestore().doc("expenses/d1").get();
  expect(after.get("status")).toBe("submitted");
  expect(after.get("amountBase")).toBe(12_000);
  expect(after.get("approvedBy")).toBeUndefined();
});

describe("up to $75 is approved automatically at submission", () => {
  test("$42.50 goes straight to approved, by auto, with approvedAt", async () => {
    const res = await request(app).post("/api/v1/expenses/d1/submit")
      .set("Authorization", "Bearer erin").expect(200);
    expect(SubmitResult.parse(res.body))
      .toMatchObject({ status: "approved", approvedBy: "auto", amountBase: 4_250 });
    const after = await getFirestore().doc("expenses/d1").get();
    expect(after.get("status")).toBe("approved");
    expect(after.get("approvedBy")).toBe("auto");
    expect(after.get("approvedAt")).toBeDefined();
    expect(after.get("spotCheck")).toBe(false);
  });

  test("exactly 7,500 cents is still automatic", async () => {
    await getFirestore().doc("expenses/d1").update({ amount: 7_500 });
    await request(app).post("/api/v1/expenses/d1/submit")
      .set("Authorization", "Bearer erin").expect(200);
    const after = await getFirestore().doc("expenses/d1").get();
    expect(after.get("status")).toBe("approved");
  });

  test("a sampled expense is flagged for the manager's spot check", async () => {
    configureSpotCheck(() => 0.01); // under 1 in 20
    await request(app).post("/api/v1/expenses/d1/submit")
      .set("Authorization", "Bearer erin").expect(200);
    const after = await getFirestore().doc("expenses/d1").get();
    expect(after.get("spotCheck")).toBe(true);
  });
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

describe("receipt required over $75 (amountBase, USD cents)", () => {
  test("7,500 cents without a receipt can be submitted", async () => {
    await getFirestore().doc("expenses/d1").update({ amount: 7_500 });
    await request(app).post("/api/v1/expenses/d1/submit")
      .set("Authorization", "Bearer erin").expect(200);
  });

  test("7,501 cents without a receipt is rejected and stays a draft", async () => {
    await getFirestore().doc("expenses/d1").update({ amount: 7_501 });
    const res = await request(app).post("/api/v1/expenses/d1/submit")
      .set("Authorization", "Bearer erin").expect(422);
    expect(ApiError.parse(res.body).error.code).toBe("receipt_required");
    const after = await getFirestore().doc("expenses/d1").get();
    expect(after.get("status")).toBe("draft");
  });

  test("7,501 cents with a receipt can be submitted", async () => {
    await getFirestore().doc("expenses/d1")
      .update({ amount: 7_501, receiptPath: "receipts/erin/dinner.jpg" });
    await request(app).post("/api/v1/expenses/d1/submit")
      .set("Authorization", "Bearer erin").expect(200);
  });
});

describe("foreign currency: converted to USD at submission", () => {
  const weekend = readFileSync(
    new URL("./fixtures/rates-provider/eur-weekend.json", import.meta.url), "utf8");

  function provider(...responses: Response[]) {
    configureFx({
      baseUrl: () => "https://api.rates.example/v2/",
      apiKey: () => "test-key",
      retryDelayMs: 0,
      fetch: async () => responses.shift() ?? new Response(null, { status: 503 }),
    });
  }

  // Today's rates are cached in fxRates/{date}_{base} for an hour.
  const today = new Date().toISOString().slice(0, 10);
  beforeEach(() => Promise.all(["EUR", "GBP"].map((c) =>
    getFirestore().doc(`fxRates/${today}_${c}`).delete())));

  test("stores amountBase, the rate and the provider's date", async () => {
    provider(new Response(weekend, { status: 200 }));
    await getFirestore().doc("expenses/d1").update({ currency: "EUR" });
    const res = await request(app).post("/api/v1/expenses/d1/submit")
      .set("Authorization", "Bearer erin").expect(200);
    // 42.50 EUR x 1.0842 = 46.0785 USD -> 4,608 cents (half up)
    expect(SubmitResult.parse(res.body)).toMatchObject({
      amountBase: 4_608, fxRate: 1.0842, fxRateDate: "2026-10-30",
    });
    const after = await getFirestore().doc("expenses/d1").get();
    expect(after.get("fxRateDate")).toBe("2026-10-30");
  });

  test("the next submit today reads the rate from fxRates, not the provider", async () => {
    provider(new Response(weekend, { status: 200 })); // then 503s
    await getFirestore().doc("expenses/d1").update({ currency: "EUR" });
    await request(app).post("/api/v1/expenses/d1/submit")
      .set("Authorization", "Bearer erin").expect(200);
    const cached = await getFirestore().doc(`fxRates/${today}_EUR`).get();
    expect(cached.get("rates")).toMatchObject({ USD: 1.0842 });
    expect(cached.get("fetchedAt")).toBeDefined();
    await getFirestore().doc("expenses/d2").set({ ...draft, currency: "EUR" });
    const res = await request(app).post("/api/v1/expenses/d2/submit")
      .set("Authorization", "Bearer erin").expect(200);
    expect(SubmitResult.parse(res.body)).toMatchObject({ fxRate: 1.0842 });
  });

  test("provider down: 503 fx_unavailable and the draft is unchanged", async () => {
    provider(); // every call returns 503
    await getFirestore().doc("expenses/d1").update({ currency: "GBP" });
    const res = await request(app).post("/api/v1/expenses/d1/submit")
      .set("Authorization", "Bearer erin").expect(503);
    expect(ApiError.parse(res.body).error.code).toBe("fx_unavailable");
    const after = await getFirestore().doc("expenses/d1").get();
    expect(after.get("status")).toBe("draft");
    expect(after.get("amountBase")).toBeUndefined();
  });
});
