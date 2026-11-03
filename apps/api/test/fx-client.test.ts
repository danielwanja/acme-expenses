// apps/api/test/fx-client.test.ts
// Unit tests: a fake fetch replays responses recorded from the provider.
import { readdirSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, test, vi } from "vitest";
import { configureFx, FxError, getRates } from "../src/services/fx-client";
import { RatesResponse } from "../src/services/fx-schemas";

const fixtures = new URL("./fixtures/rates-provider/", import.meta.url);
const weekday = readFileSync(new URL("eur-weekday.json", fixtures), "utf8");

/** ky hands fetch a Request; the fake records each one and replays. */
function useFake(...responses: Response[]): Request[] {
  const calls: Request[] = [];
  configureFx({
    baseUrl: () => "https://api.rates.example/v2/",
    apiKey: () => "test-key",
    retryDelayMs: 0,
    fetch: async (request) => {
      calls.push(request);
      return responses.shift() ?? new Response(null, { status: 500 });
    },
  });
  return calls;
}

const status = (code: number, headers?: Record<string, string>) =>
  new Response(null, { status: code, headers });
const ok = (body: string) => new Response(body, { status: 200 });

async function fxError(p: Promise<unknown>): Promise<FxError> {
  const err = await p.then(() => null, (e: unknown) => e);
  expect(err).toBeInstanceOf(FxError);
  return err as FxError;
}

afterEach(() => vi.useRealTimers());

test("retries one 503, then parses the recorded response", async () => {
  const calls = useFake(new Response(null, { status: 503 }),
    new Response(weekday, { status: 200 }));
  const fx = await getRates("2026-10-30", "EUR");
  expect(fx.rates["USD"]).toBeGreaterThan(0);
  expect(calls).toHaveLength(2);
});

test("calls only the spec's operation, with the key header", async () => {
  const calls = useFake(ok(weekday));
  await getRates("2026-10-30", "EUR");
  expect(calls[0]?.url).toBe("https://api.rates.example/v2/rates/2026-10-30?base=EUR");
  expect(calls[0]?.headers.get("X-Api-Key")).toBe("test-key");
});

test("a 400 is not retried", async () => {
  const calls = useFake(status(400), ok(weekday));
  expect((await fxError(getRates("2026-10-30", "EUR"))).code).toBe("rejected");
  expect(calls).toHaveLength(1);
});

test("a 429 waits for Retry-After before retrying", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout"] });
  const calls = useFake(status(429, { "Retry-After": "2" }), ok(weekday));
  const pending = getRates("2026-10-30", "EUR");
  await vi.advanceTimersByTimeAsync(1_999);
  expect(calls).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(1);
  await expect(pending).resolves.toMatchObject({ base: "EUR" });
  expect(calls).toHaveLength(2);
});

test("gives up after three attempts", async () => {
  const calls = useFake(status(503), status(503), status(503), ok(weekday));
  expect((await fxError(getRates("2026-10-30", "EUR"))).code).toBe("unavailable");
  expect(calls).toHaveLength(3);
});

test("a 429 that persists is reported as rate_limited", async () => {
  useFake(status(429), status(429), status(429));
  expect((await fxError(getRates("2026-10-30", "EUR"))).code).toBe("rate_limited");
});

test("network errors are retried, then reported as unavailable", async () => {
  let attempts = 0;
  configureFx({
    baseUrl: () => "https://api.rates.example/v2/",
    apiKey: () => "test-key",
    retryDelayMs: 0,
    fetch: async () => {
      attempts++;
      throw new TypeError("fetch failed");
    },
  });
  expect((await fxError(getRates("2026-10-30", "EUR"))).code).toBe("unavailable");
  expect(attempts).toBe(3);
});

test("a provider that never answers times out after three attempts", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  let attempts = 0;
  configureFx({
    baseUrl: () => "https://api.rates.example/v2/",
    apiKey: () => "test-key",
    retryDelayMs: 0,
    fetch: () => {
      attempts++;
      return new Promise<Response>(() => {}); // hangs
    },
  });
  const err = fxError(getRates("2026-10-30", "EUR"));
  await vi.advanceTimersByTimeAsync(10_000); // 3 s per attempt, 10 s in all
  expect((await err).code).toBe("timeout");
  expect(attempts).toBe(3);
});

test("a response missing rates throws bad_response", async () => {
  useFake(ok(JSON.stringify({ base: "EUR", date: "2026-10-30" })));
  const err = await fxError(getRates("2026-10-30", "EUR"));
  expect(err.code).toBe("bad_response");
  expect(err.message).toContain("rates");
});

test("an HTML page with a 200 throws bad_response", async () => {
  useFake(ok("<html>maintenance</html>"));
  expect((await fxError(getRates("2026-10-30", "EUR"))).code).toBe("bad_response");
});

describe("recorded fixtures", () => {
  const files = readdirSync(fixtures).filter((f) => f.endsWith(".json"));
  test.each(files)("%s parses with RatesResponse", (file) => {
    const body = JSON.parse(readFileSync(new URL(file, fixtures), "utf8"));
    expect(RatesResponse.safeParse(body).success).toBe(true);
  });
});
