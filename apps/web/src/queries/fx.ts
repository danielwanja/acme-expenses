// apps/web/src/queries/fx.ts
import { useQuery } from "@tanstack/react-query";
import { getFxRate } from "../api";
import { ApiCallError } from "../http";
import { shouldRetry } from "../queryClient";

export const fxKeys = {
  all: ["fx"] as const,
  rate: (currency: string, date: string) =>
    [...fxKeys.all, "rate", currency, date] as const,
};

type RateInput = { currency: string; date: string };

/** fx_unavailable means the API already tried the provider 3 times. */
export const retryFxRate = (failureCount: number, error: unknown) =>
  !(error instanceof ApiCallError && error.code === "fx_unavailable")
  && shouldRetry(failureCount, error);

/** One rate per currency and day. The amount isn't in the key, so typing
 *  never refetches; the form converts with the shared rule. */
export function useFxRate({ currency, date }: RateInput) {
  return useQuery({
    queryKey: fxKeys.rate(currency, date),
    queryFn: ({ signal }) => getFxRate({ currency, date }, signal),
    enabled: currency !== "USD", // USD is 1: nothing to ask
    retry: retryFxRate, // don't stack retries on the server's
  });
}
