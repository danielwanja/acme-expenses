// Input validation happens before any Firestore call, so these run in npm test.
import { ApiError } from "@acme/shared";
import request from "supertest";
import { describe, expect, test, vi } from "vitest";
import { app } from "../src/app.js";

// Mock the boundary (token checks), not the routes under test.
// The token is the uid; "max" carries the manager claim.
vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({ verifyIdToken: async (t: string) =>
    ({ uid: t, role: t === "max" ? "manager" : "employee" }) }),
}));

const asMax = (req: request.Test) => req.set("Authorization", "Bearer max");

test("pending approvals: limit above 50 is invalid_query", async () => {
  const res = await asMax(request(app).get("/api/v1/approvals/pending?limit=51")).expect(400);
  expect(ApiError.parse(res.body).error.code).toBe("invalid_query");
});

test("pending approvals: an unknown view is invalid_query", async () => {
  const res = await asMax(request(app).get("/api/v1/approvals/pending?view=all")).expect(400);
  expect(ApiError.parse(res.body).error.code).toBe("invalid_query");
});

test("reject needs a reason", async () => {
  const res = await asMax(request(app).post("/api/v1/expenses/e1/reject").send({}))
    .expect(400);
  expect(ApiError.parse(res.body).error.code).toBe("invalid_body");
});

describe("POST /api/v1/expenses/bulk-approve", () => {
  const bulk = (token: string, body: unknown) =>
    request(app).post("/api/v1/expenses/bulk-approve")
      .set("Authorization", `Bearer ${token}`).send(body as object);
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `e${i}`);

  test("unauthenticated calls get a 401", async () => {
    await request(app).post("/api/v1/expenses/bulk-approve").send({}).expect(401);
  });

  test("non-managers get a 403", async () => {
    const res = await bulk("erin", { expenseIds: ["e1"] }).expect(403);
    expect(ApiError.parse(res.body).error.code).toBe("not_a_manager");
  });

  test.each([
    ["21 ids", { expenseIds: ids(21) }],
    ["no ids", { expenseIds: [] }],
    ["duplicate ids", { expenseIds: ["e1", "e1"] }],
  ])("%s is a 400", async (_name, body) => {
    const res = await bulk("max", body).expect(400);
    expect(ApiError.parse(res.body).error.code).toBe("invalid_body");
  });
});
