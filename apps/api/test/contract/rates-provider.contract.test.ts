// apps/api/test/contract/rates-provider.contract.test.ts
// Calls the provider's live sandbox. Skipped unless FX_CONTRACT=1
// (the nightly CI workflow sets it, with the sandbox key from CI secrets).
import { expect, test } from "vitest";
import { configureFx, getRates } from "../../src/services/fx-client";

const live = process.env.FX_CONTRACT === "1";

test.skipIf(!live)("rates provider still honors our contract", async () => {
  configureFx({
    baseUrl: () => process.env.FX_BASE_URL ?? "",
    apiKey: () => process.env.FX_SANDBOX_KEY ?? "",
  });
  const day = new Date(Date.now() - 86_400_000).toISOString();
  const fx = await getRates(day.slice(0, 10), "EUR");
  expect(fx.base).toBe("EUR");
  expect(fx.rates["USD"]).toBeGreaterThan(0);
});
