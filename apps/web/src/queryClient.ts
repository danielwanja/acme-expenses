// apps/web/src/queryClient.ts
import { QueryClient } from "@tanstack/react-query";
import { FirebaseError } from "firebase/app";
import { ZodError } from "zod";
import { ApiCallError } from "./http";

// Firestore codes that mean "this request is wrong", like an HTTP 4xx.
const FINAL_FIRESTORE_CODES = new Set([
  "permission-denied", "unauthenticated", "invalid-argument", "not-found",
]);

/** Asking again won't help: a 4xx, a Firestore refusal, or bad data. */
export const isFinalError = (error: unknown): boolean =>
  (error instanceof ApiCallError && error.status >= 400 && error.status < 500)
  || (error instanceof FirebaseError && FINAL_FIRESTORE_CODES.has(error.code))
  || error instanceof ZodError;

/** Up to 3 retries for network errors and 5xx; never for a final error. */
export const shouldRetry = (failureCount: number, error: unknown): boolean =>
  !isFinalError(error) && failureCount < 3;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: shouldRetry },
    // Mutations keep TanStack's default: no retries.
  },
});
