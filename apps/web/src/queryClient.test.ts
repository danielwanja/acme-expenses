import { FirebaseError } from "firebase/app";
import { describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { ApiCallError } from "./http";
import { shouldRetry } from "./queryClient";

vi.mock("./firebase", async () => (await import("./test/render")).fakeFirebase);

const apiError = (status: number) => new ApiCallError(status, "x", "x");
const firestoreError = (code: string) => new FirebaseError(code, code);

describe("shouldRetry: the retry policy for every query", () => {
  test.each([400, 401, 403, 404, 409, 422, 429])("never retries a %i", (status) => {
    expect(shouldRetry(0, apiError(status))).toBe(false);
  });

  test.each([500, 502, 503])("retries a %i up to 3 times", (status) => {
    expect(shouldRetry(0, apiError(status))).toBe(true);
    expect(shouldRetry(2, apiError(status))).toBe(true);
    expect(shouldRetry(3, apiError(status))).toBe(false);
  });

  test("retries network errors and other failures up to 3 times", () => {
    const offline = new TypeError("Failed to fetch");
    expect(shouldRetry(0, offline)).toBe(true);
    expect(shouldRetry(3, offline)).toBe(false);
  });

  test.each(["permission-denied", "unauthenticated", "invalid-argument", "not-found"])(
    "never retries a Firestore %s", (code) => {
      expect(shouldRetry(0, firestoreError(code))).toBe(false);
    });

  test("retries a Firestore error that can pass, such as unavailable", () => {
    expect(shouldRetry(0, firestoreError("unavailable"))).toBe(true);
  });

  test("never retries data that fails its schema", () => {
    const bad = z.object({ amount: z.number() }).safeParse({ amount: "1" });
    expect(bad.success).toBe(false);
    expect(shouldRetry(0, bad.error)).toBe(false);
  });
});
