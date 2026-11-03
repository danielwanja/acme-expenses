import { QueryClient } from "@tanstack/react-query";
import { waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ApiCallError } from "../http";
import { fakeFetch, renderHookWithClient } from "../test/render";
import { retryFxRate, useFxRate } from "./fx";

vi.mock("../firebase", async () => (await import("../test/render")).fakeFirebase);
afterEach(() => vi.unstubAllGlobals());

const down = (code: string) => () => Response.json({
  error: { code, message: "Down.", requestId: "r" },
}, { status: 503 });
// The hook's own retry option wins over the client's; no waits in tests.
const client = () =>
  new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });

test("fx_unavailable is final: the API already retried the provider", () => {
  const fx = new ApiCallError(503, "fx_unavailable", "Exchange rate unavailable.");
  expect(retryFxRate(0, fx)).toBe(false);
  expect(retryFxRate(0, new ApiCallError(503, "internal", "x"))).toBe(true);
  expect(retryFxRate(0, new ApiCallError(401, "invalid_token", "x"))).toBe(false);
  expect(retryFxRate(3, new TypeError("Failed to fetch"))).toBe(false);
});

test("useFxRate asks once when the API says fx_unavailable", async () => {
  const stub = fakeFetch(down("fx_unavailable"));
  vi.stubGlobal("fetch", stub.fetch);
  const { result } = renderHookWithClient(
    () => useFxRate({ currency: "EUR", date: "2026-11-02" }), client());
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(stub.requests).toHaveLength(1);
});

test("other 5xx answers are retried up to 3 times", async () => {
  const stub = fakeFetch(down("internal"));
  vi.stubGlobal("fetch", stub.fetch);
  const { result } = renderHookWithClient(
    () => useFxRate({ currency: "EUR", date: "2026-11-02" }), client());
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(stub.requests).toHaveLength(4);
});
