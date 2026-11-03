// apps/api/test/fx-rate.test.ts
// GET /api/v1/fx/rate with supertest. Token checks and Firestore are
// stand-ins; the route and the cache are real.
import { readFileSync } from "node:fs";
import { ApiError, FxRate } from "@acme/shared";
import request from "supertest";
import { beforeEach, expect, test, vi } from "vitest";
import { app } from "../src/app.js";
import { configureFx } from "../src/services/fx-client.js";
import { fakeFirestore } from "./fake-firestore.js";

vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({ verifyIdToken: async (t: string) => ({ uid: t }) }),
}));
vi.mock("firebase-admin/firestore", async (importOriginal) => ({
  ...await importOriginal<typeof import("firebase-admin/firestore")>(),
  getFirestore: () => fakeFirestore,
}));

const weekend = readFileSync(
  new URL("./fixtures/rates-provider/eur-weekend.json", import.meta.url), "utf8");

function provider(...responses: Response[]): number[] {
  const calls: number[] = [];
  configureFx({
    baseUrl: () => "https://api.rates.example/v2/",
    apiKey: () => "test-key",
    retryDelayMs: 0,
    fetch: async () => {
      calls.push(1);
      return responses.shift() ?? new Response(null, { status: 503 });
    },
  });
  return calls;
}

const rate = (query: string) =>
  request(app).get(`/api/v1/fx/rate?${query}`).set("Authorization", "Bearer erin");

beforeEach(() => fakeFirestore.docs.clear());

test("returns the USD rate and the provider's date", async () => {
  provider(new Response(weekend, { status: 200 }));
  const res = await rate("currency=EUR&date=2026-10-31").expect(200);
  // Saturday: the provider answers with Friday's rates and says so.
  expect(FxRate.parse(res.body)).toEqual({
    currency: "EUR", base: "USD", date: "2026-10-30", rate: 1.0842,
  });
});

test("USD is 1 and never calls the provider", async () => {
  const calls = provider();
  const res = await rate("currency=USD&date=2026-10-31").expect(200);
  expect(res.body).toEqual({
    currency: "USD", base: "USD", date: "2026-10-31", rate: 1,
  });
  expect(calls).toHaveLength(0);
});

test("needs a signed-in user", async () => {
  await request(app).get("/api/v1/fx/rate?currency=EUR&date=2026-10-31").expect(401);
});

test.each([
  "currency=euro&date=2026-10-31",
  "currency=EUR&date=31-10-2026",
  "currency=EUR",
])("rejects %s with invalid_query", async (query) => {
  const res = await rate(query).expect(400);
  expect(ApiError.parse(res.body).error.code).toBe("invalid_query");
});

test("provider down: 503 fx_unavailable, the same error as at submit", async () => {
  provider(); // every call returns 503
  const res = await rate("currency=GBP&date=2026-10-31").expect(503);
  expect(ApiError.parse(res.body).error.code).toBe("fx_unavailable");
});
