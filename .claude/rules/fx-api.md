---
paths:
  - "apps/api/src/services/fx-*.ts"
  - "apps/api/test/**"
---

# Rates provider rules

- The contract is docs/fx-api/openapi.yaml. Call only operations
  defined there. If you need another one, stop and ask.
- Call the provider only through the ky instance in fx-client.ts.
  Configure retries there; never hand-roll a loop or a backoff.
- Validate every response with the schemas in fx-schemas.ts, and
  map every provider failure to FxError in toFxError.
- Cloud Functions memory is per instance and lost on cold starts.
  A Map may dedupe calls in flight; it is never a cache. Cache
  rates in Firestore, through fx-rates.ts.
- Fixtures in apps/api/test/fixtures/rates-provider/ are recorded
  from the provider's sandbox. Never hand-edit or invent one.
