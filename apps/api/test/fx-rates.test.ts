// apps/api/test/fx-rates.test.ts
// The Firestore read-through cache and the in-flight dedupe, in npm test:
// an in-memory stand-in replaces Firestore (the Admin SDK bypasses rules).
import { readFileSync } from "node:fs";
import { Timestamp } from "firebase-admin/firestore";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { configureFx } from "../src/services/fx-client";
import { ratesFor } from "../src/services/fx-rates";
import { fakeFirestore } from "./fake-firestore";

vi.mock("firebase-admin/firestore", async (importOriginal) => ({
  ...await importOriginal<typeof import("firebase-admin/firestore")>(),
  getFirestore: () => fakeFirestore,
}));

const weekday = readFileSync(
  new URL("./fixtures/rates-provider/eur-weekday.json", import.meta.url), "utf8");
const ok = () => new Response(weekday, { status: 200 });

function provider(...responses: Response[]): Request[] {
  const calls: Request[] = [];
  configureFx({
    baseUrl: () => "https://api.rates.example/v2/",
    apiKey: () => "test-key",
    retryDelayMs: 0,
    fetch: async (request) => {
      calls.push(request);
      return responses.shift() ?? new Response(null, { status: 503 });
    },
  });
  return calls;
}

const minutes = (n: number) => n * 60_000;
const clockAt = (iso: string) => vi.setSystemTime(new Date(iso));

beforeEach(() => {
  fakeFirestore.docs.clear();
  vi.useFakeTimers({ toFake: ["Date"] }); // the clock only, not timers
  clockAt("2026-11-02T15:00:00Z");
});
afterEach(() => vi.useRealTimers());

test("a past day is fetched once, then read from fxRates/{date}_{base}", async () => {
  const calls = provider(ok(), ok());
  await ratesFor("2026-10-30", "EUR");
  const stored = fakeFirestore.docs.get("fxRates/2026-10-30_EUR");
  expect(stored).toMatchObject({ base: "EUR", date: "2026-10-30" });
  expect(stored?.["fetchedAt"]).toBeInstanceOf(Timestamp); // serverTimestamp()
  clockAt("2026-12-25T09:00:00Z"); // weeks later: still final
  await expect(ratesFor("2026-10-30", "EUR")).resolves
    .toMatchObject({ rates: { USD: 1.0842 } });
  expect(calls).toHaveLength(1);
});

test("today's rates are cached for under an hour", async () => {
  const calls = provider(ok(), ok());
  await ratesFor("2026-11-02", "EUR");
  expect(fakeFirestore.docs.has("fxRates/2026-11-02_EUR")).toBe(true);
  vi.advanceTimersByTime(minutes(59));
  await ratesFor("2026-11-02", "EUR");
  expect(calls).toHaveLength(1);
});

test("after an hour, today's rates are fetched again and overwritten", async () => {
  const calls = provider(ok(), ok());
  await ratesFor("2026-11-02", "EUR");
  const first = fakeFirestore.docs.get("fxRates/2026-11-02_EUR")?.["fetchedAt"];
  vi.advanceTimersByTime(minutes(60));
  await ratesFor("2026-11-02", "EUR");
  expect(calls).toHaveLength(2);
  const second = fakeFirestore.docs.get("fxRates/2026-11-02_EUR")?.["fetchedAt"];
  expect((second as Timestamp).toMillis() - (first as Timestamp).toMillis())
    .toBe(minutes(60));
});

test("concurrent calls on one instance share one provider call", async () => {
  const calls = provider(ok(), ok());
  await Promise.all([ratesFor("2026-11-02", "GBP"), ratesFor("2026-11-02", "GBP")]);
  expect(calls).toHaveLength(1);
});

test("a failure is not kept: the next call asks again", async () => {
  const calls = provider(new Response(null, { status: 400 }), ok());
  await expect(ratesFor("2026-10-30", "EUR")).rejects.toMatchObject({ code: "rejected" });
  await expect(ratesFor("2026-10-30", "EUR")).resolves.toMatchObject({ base: "EUR" });
  expect(calls).toHaveLength(2);
});
