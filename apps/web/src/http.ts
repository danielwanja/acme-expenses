// apps/web/src/http.ts
// The one HTTP client for Acme's API. ky sends; TanStack Query retries.
import { ApiError } from "@acme/shared";
import ky, { HTTPError } from "ky";
import { auth } from "./firebase";

/** A non-2xx answer from Acme's API, with the code the screens explain. */
export class ApiCallError extends Error {
  readonly status: number;
  readonly code: string;
  readonly hint?: string;
  constructor(status: number, code: string, message: string, hint?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.hint = hint;
  }
}

/** ky's HTTPError + the Acme error body -> ApiCallError. Others pass. */
export function toApiCallError(error: Error): Error {
  if (!(error instanceof HTTPError)) return error;
  const { status } = error.response;
  const body = ApiError.safeParse(error.data); // ky already read the body
  if (!body.success) {
    return new ApiCallError(status, "internal", `HTTP ${status}`);
  }
  const { code, message, hint } = body.data.error;
  return new ApiCallError(status, code, message, hint);
}

export const http = ky.create({
  // Absolute, because Node's Request (in tests) rejects relative URLs.
  // Call it with relative paths ("v1/..."): "/v1" would drop the /api.
  baseUrl: new URL("/api/", location.origin).href,
  retry: 0, // TanStack Query owns retries, so they don't stack
  timeout: 15_000, // above the API's own 10 s limit for the rates provider
  hooks: {
    beforeRequest: [
      async ({ request }) => {
        await auth.authStateReady(); // currentUser is null until settled
        const token = await auth.currentUser?.getIdToken(); // refreshes
        if (token) request.headers.set("Authorization", `Bearer ${token}`);
      },
    ],
    beforeError: [({ error }) => toApiCallError(error)],
  },
});
