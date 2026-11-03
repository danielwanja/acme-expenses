import { SchemaValidationError } from "ky";
import { afterEach, expect, test, vi } from "vitest";
import { approveExpense, rejectExpense } from "./api";
import { ApiCallError } from "./http";
import { fakeFetch } from "./test/render";

vi.mock("./firebase", async () => (await import("./test/render")).fakeFirebase);
afterEach(() => vi.unstubAllGlobals());

const decision = { expenseId: "e1", status: "approved" };

test("sends the ID token to /api/v1 and parses the shared schema", async () => {
  const stub = fakeFetch(() => Response.json(decision));
  vi.stubGlobal("fetch", stub.fetch);
  await expect(approveExpense("e1")).resolves.toEqual(decision);
  const [request] = stub.requests;
  expect(request?.method).toBe("POST");
  expect(request?.url).toBe("http://localhost:3000/api/v1/expenses/e1/approve");
  expect(request?.headers.get("Authorization")).toBe("Bearer test-token");
});

test("sends the body as JSON", async () => {
  const stub = fakeFetch(() => Response.json({ ...decision, status: "rejected" }));
  vi.stubGlobal("fetch", stub.fetch);
  await rejectExpense("e1", "No receipt");
  expect(await stub.requests[0]?.json()).toEqual({ reason: "No receipt" });
});

test("an Acme error body becomes an ApiCallError with its code and hint", async () => {
  vi.stubGlobal("fetch", fakeFetch(() => Response.json({
    error: {
      code: "not_pending", message: "Expense e1 is approved.",
      hint: "Reload the list.", requestId: "r1",
    },
  }, { status: 409 })).fetch);
  const err = await approveExpense("e1").catch((e: unknown) => e);
  expect(err).toBeInstanceOf(ApiCallError);
  expect(err).toMatchObject({
    status: 409, code: "not_pending", message: "Expense e1 is approved.",
    hint: "Reload the list.",
  });
});

test("an error without the Acme body is still an ApiCallError", async () => {
  vi.stubGlobal("fetch", fakeFetch(() =>
    new Response("<html>Bad gateway</html>", { status: 502 })).fetch);
  await expect(approveExpense("e1")).rejects
    .toMatchObject({ status: 502, code: "internal" });
});

test("a 200 that doesn't match the schema is rejected", async () => {
  vi.stubGlobal("fetch", fakeFetch(() => Response.json({ expenseId: 1 })).fetch);
  await expect(approveExpense("e1")).rejects.toBeInstanceOf(SchemaValidationError);
});
