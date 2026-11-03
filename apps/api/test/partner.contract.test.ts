// apps/api/test/partner.contract.test.ts (runs in npm run test:emu)
// Every body, success or error, is parsed with the shared contract schema.
import { createHash } from "node:crypto";
import { ApiError, ExpensePage, ExportResult } from "@acme/shared";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { app } from "../src/app.js";
import { clearFirestore } from "./emulator.js";

const TEST_PARTNER_KEY = "test-partner-key-1";
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

function approved(id: string, minute: number) {
  return getFirestore().doc(`expenses/${id}`).set({
    ownerId: "erin", amount: 4_250, currency: "EUR", category: "Meals",
    spentOn: "2026-10-14", note: "", receiptPath: null, status: "approved",
    amountBase: 4_608, baseCurrency: "USD", fxRate: 1.0842, fxRateDate: "2026-10-14",
    approvedAt: Timestamp.fromMillis(Date.UTC(2026, 9, 20, 9, minute)),
  });
}

beforeAll(() => initializeApp({ projectId: "demo-acme" }));
beforeEach(async () => {
  await clearFirestore();
  const db = getFirestore();
  await db.doc(`partnerKeys/${sha256(TEST_PARTNER_KEY)}`).set({ partnerId: "ledgerco" });
  await db.doc(`partnerKeys/${sha256("revoked-key")}`)
    .set({ partnerId: "ledgerco", revoked: true });
  await db.doc("users/erin").set({ displayName: "Erin", role: "employee", managerId: "max" });
  await approved("a1", 1);
  await approved("a2", 2);
  await approved("a3", 3);
  await db.doc("expenses/s1").set({ ownerId: "erin", amount: 100, currency: "USD",
    category: "Meals", spentOn: "2026-10-14", note: "", receiptPath: null,
    status: "submitted" });
  // Manager-approved, waiting for Finance (Chapter 6): not approved yet.
  await db.doc("expenses/f1").set({ ownerId: "erin", amount: 300_000, currency: "USD",
    category: "Travel", spentOn: "2026-10-14", note: "", receiptPath: "receipts/erin/f1.jpg",
    status: "awaiting_finance", amountBase: 300_000, baseCurrency: "USD", fxRate: 1,
    fxRateDate: "2026-10-14" });
});

describe("GET /api/v1/expenses", () => {
  test("list returns a valid ExpensePage", async () => {
    const res = await request(app).get("/api/v1/expenses?limit=2")
      .set("X-Api-Key", TEST_PARTNER_KEY).expect(200);
    const page = ExpensePage.parse(res.body);
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).not.toBeNull();
  });

  test("a bad limit returns the documented error", async () => {
    const res = await request(app).get("/api/v1/expenses?limit=500")
      .set("X-Api-Key", TEST_PARTNER_KEY).expect(400);
    expect(ApiError.parse(res.body).error.code).toBe("invalid_query");
  });

  test("paging with nextCursor sees every approved expense once, in order", async () => {
    const ids: string[] = [];
    let cursor: string | null = null;
    do {
      const url = `/api/v1/expenses?limit=2${cursor ? `&cursor=${cursor}` : ""}`;
      const res = await request(app).get(url).set("X-Api-Key", TEST_PARTNER_KEY).expect(200);
      const page = ExpensePage.parse(res.body);
      ids.push(...page.items.map((i) => i.id));
      cursor = page.nextCursor;
    } while (cursor);
    expect(ids).toEqual(["a1", "a2", "a3"]); // never the submitted one
  });

  test("an expense awaiting Finance is never listed", async () => {
    for (const status of ["approved", "exported"]) {
      const res = await request(app).get(`/api/v1/expenses?status=${status}&limit=100`)
        .set("X-Api-Key", TEST_PARTNER_KEY).expect(200);
      expect(ExpensePage.parse(res.body).items.map((i) => i.id)).not.toContain("f1");
    }
  });

  test("items carry names and integer money", async () => {
    const res = await request(app).get("/api/v1/expenses?limit=1")
      .set("X-Api-Key", TEST_PARTNER_KEY).expect(200);
    expect(ExpensePage.parse(res.body).items[0]).toMatchObject({
      employeeId: "erin", employeeName: "Erin",
      original: { amount: 4_250, currency: "EUR" },
      converted: { amount: 4_608, currency: "USD" },
    });
  });

  test("a forged cursor is a 400, not a 500", async () => {
    const res = await request(app).get("/api/v1/expenses?cursor=not-ours")
      .set("X-Api-Key", TEST_PARTNER_KEY).expect(400);
    expect(ApiError.parse(res.body).error.code).toBe("invalid_cursor");
  });

  test("a revoked key gets 401 invalid_api_key", async () => {
    const res = await request(app).get("/api/v1/expenses")
      .set("X-Api-Key", "revoked-key").expect(401);
    expect(ApiError.parse(res.body).error.code).toBe("invalid_api_key");
  });
});

describe("POST /api/v1/expenses/{id}/export", () => {
  const exportAs = (id: string, key: string) =>
    request(app).post(`/api/v1/expenses/${id}/export`)
      .set("X-Api-Key", TEST_PARTNER_KEY).set("Idempotency-Key", key);

  test("the same key twice exports once and returns the same response", async () => {
    const first = await exportAs("a1", "key-0001-abc").expect(200);
    const second = await exportAs("a1", "key-0001-abc").expect(200);
    expect(ExportResult.parse(second.body)).toEqual(ExportResult.parse(first.body));
    const after = await getFirestore().doc("expenses/a1").get();
    expect(after.get("status")).toBe("exported");
    expect(after.get("exportedBy")).toBe("ledgerco");
  });

  test("the same key for a different expense is 422 idempotency_key_reused", async () => {
    await exportAs("a1", "key-0002-abc").expect(200);
    const res = await exportAs("a2", "key-0002-abc").expect(422);
    expect(ApiError.parse(res.body).error.code).toBe("idempotency_key_reused");
    const a2 = await getFirestore().doc("expenses/a2").get();
    expect(a2.get("status")).toBe("approved");
  });

  test("only approved expenses can be exported", async () => {
    const res = await exportAs("s1", "key-0003-abc").expect(409);
    expect(ApiError.parse(res.body).error.code).toBe("not_approved");
  });

  test("an expense awaiting Finance can't be exported", async () => {
    const res = await exportAs("f1", "key-0004-abc").expect(409);
    expect(ApiError.parse(res.body).error.code).toBe("not_approved");
    const f1 = await getFirestore().doc("expenses/f1").get();
    expect(f1.get("status")).toBe("awaiting_finance");
  });

  test("a missing Idempotency-Key is a 400", async () => {
    const res = await request(app).post("/api/v1/expenses/a1/export")
      .set("X-Api-Key", TEST_PARTNER_KEY).expect(400);
    expect(ApiError.parse(res.body).error.code).toBe("missing_idempotency_key");
  });
});
