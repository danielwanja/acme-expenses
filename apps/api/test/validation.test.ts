// Input validation happens before any Firestore call, so these run in npm test.
import { ApiError } from "@acme/shared";
import request from "supertest";
import { expect, test, vi } from "vitest";
import { app } from "../src/app.js";

// Mock the boundary (token checks), not the routes under test.
vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({ verifyIdToken: async (t: string) => ({ uid: t }) }),
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
