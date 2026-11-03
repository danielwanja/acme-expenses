import type { PendingPage } from "@acme/shared";
import { act, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { fakeFetch, renderHookWithClient } from "../test/render";
import { approvalKeys, useBulkApprove, usePendingApprovals } from "./approvals";

vi.mock("../firebase", async () => (await import("../test/render")).fakeFirebase);
afterEach(() => vi.unstubAllGlobals());

const item = (expenseId: string) => ({
  expenseId, employeeName: "Sam", amountDisplay: "$120.00",
  category: "Meals", ageDays: 2,
});
const page = (...ids: string[]) =>
  ({ items: ids.map(item), nextCursor: null, totalPending: ids.length });

test("bulk approve refetches the pending list before it settles", async () => {
  let waiting = ["e1", "e2", "e3"];
  const stub = fakeFetch((request) => {
    if (request.method === "GET") return Response.json(page(...waiting));
    waiting = ["e3"]; // the server approved e1 and e2
    return Response.json({ results: [
      { expenseId: "e1", outcome: "approved" },
      { expenseId: "e2", outcome: "approved" },
    ] });
  });
  vi.stubGlobal("fetch", stub.fetch);
  const query = { view: "full", limit: 50 } as const;
  const { result, client } = renderHookWithClient(() => ({
    pending: usePendingApprovals(query),
    bulk: useBulkApprove(),
  }));
  await waitFor(() => expect(result.current.pending.data?.items).toHaveLength(3));

  let cachedWhenSettled: PendingPage | undefined;
  await act(async () => {
    await result.current.bulk.mutateAsync(["e1", "e2"]);
    cachedWhenSettled = client.getQueryData(approvalKeys.pending(query));
  });

  // onSuccess returned the invalidation, so the refetch had already landed.
  expect(cachedWhenSettled?.items.map((e) => e.expenseId)).toEqual(["e3"]);
  await waitFor(() => expect(result.current.pending.data?.items).toHaveLength(1));
  const sent = stub.requests.map((r) => `${r.method} ${new URL(r.url).pathname}`);
  expect(sent).toEqual([
    "GET /api/v1/approvals/pending",
    "POST /api/v1/expenses/bulk-approve",
    "GET /api/v1/approvals/pending",
  ]);
  expect(await stub.requests[1]?.json()).toEqual({ expenseIds: ["e1", "e2"] });
});

test("a failed bulk approve leaves the list alone and isn't retried", async () => {
  const stub = fakeFetch((request) => request.method === "GET"
    ? Response.json(page("e1"))
    : new Response(null, { status: 503 }));
  vi.stubGlobal("fetch", stub.fetch);
  const { result } = renderHookWithClient(() => ({
    pending: usePendingApprovals({ view: "full", limit: 50 }),
    bulk: useBulkApprove(),
  }));
  await waitFor(() => expect(result.current.pending.isSuccess).toBe(true));
  await act(async () => {
    await result.current.bulk.mutateAsync(["e1"]).catch(() => {});
  });
  await waitFor(() => expect(result.current.bulk.isError).toBe(true));
  expect(stub.requests.filter((r) => r.method === "POST")).toHaveLength(1);
  expect(stub.requests.filter((r) => r.method === "GET")).toHaveLength(1);
});
