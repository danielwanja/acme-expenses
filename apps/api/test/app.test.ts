// Fast tests of the Express app that never reach Firestore: no emulator needed.
import { ApiError } from "@acme/shared";
import request from "supertest";
import { expect, test } from "vitest";
import { app } from "../src/app.js";

test("GET /api/health", async () => {
  const res = await request(app).get("/api/health").expect(200);
  expect(res.body).toEqual({ ok: true });
});

test("a /v1 route without a token gets the documented 401", async () => {
  const res = await request(app).post("/api/v1/expenses/e1/submit").expect(401);
  expect(ApiError.parse(res.body).error.code).toBe("missing_token");
});

test("an unknown route gets a 404 in the standard error shape", async () => {
  const res = await request(app).get("/api/v1/nope").expect(404);
  expect(ApiError.parse(res.body).error.code).toBe("no_route");
});

test("a malformed JSON body is a 400, not a 500", async () => {
  const res = await request(app).post("/api/v1/expenses/e1/reject")
    .set("Content-Type", "application/json").send("{oops").expect(400);
  expect(ApiError.parse(res.body).error.code).toBe("invalid_json");
});
