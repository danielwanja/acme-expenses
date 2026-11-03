# Decision: ky for calls to the rates provider

- **Date:** 2026-11-02. Versions and dates are from the npm registry on that day.
- **Status:** accepted, and recorded in `CLAUDE.md` under House libraries.
- **Scope:** `apps/api/src/services/fx-client.ts`. The web app's client
  (`apps/web/src/http.ts`) uses the same library.

## What we needed

GET only, with an API-key header. A timeout per attempt, and retries only on
network errors, timeouts, 429 and 5xx. Honor `Retry-After`. Validate every
response with Zod. Run on Node 24 as an ES module, inside Cloud Functions.

## Candidates

| Package | Latest (date) | Retry built in | `Retry-After` | Deps |
| --- | --- | --- | --- | --- |
| axios + axios-retry | 1.21.0 (2026-10-27) + 4.5.0 (**2024-08-02**) | via plugin | via plugin | 4 + 1 |
| **ky** | 2.2.0 (2026-10-09) | yes | yes (`afterStatusCodes`, `maxRetryAfter`) | 0 |
| got | 16.2.0 (2026-10-30), Node only | yes | yes (`maxRetryAfter`) | 10 |
| ofetch | 1.5.1 (2025-11-01) | count + fixed delay | not found | 3 |
| undici `RetryAgent` | 8.12.3 (2026-10-19) | yes | yes | 0 |
| p-retry / cockatiel | 9.0.0 / 4.0.0 | generic | write it yourself | 1 / 0 |

## Why ky

1. **Configuration, not code.** It retries network errors and a list of
   statuses, and honors `Retry-After` (seconds or HTTP-date) up to a cap.
   Backoff and jitter can be capped too. It has a timeout per attempt and a
   `totalTimeout` for the whole call, which suits a function's deadline.
2. **Zod is the type.** `.json(RatesResponse)` validates at runtime, and the
   return type is inferred from the schema (Standard Schema; Zod 4 qualifies).
3. **Small and current.** Zero dependencies, fetch-based, ESM, Node 22 or
   later, released last month. got is from the same maintainers, who point to
   ky instead.

These were tested against a mock server:
- a 503 with `Retry-After: 1` waited 1 s, then succeeded;
- a dropped socket was retried with jittered backoff;
- a 404 was not retried (`HTTPError`);
- a bad body raised `SchemaValidationError`.

## Caveats we accepted

- ky retries a status only if it would throw for it. `throwHttpErrors: false`
  quietly turns status retries off.
- `baseUrl` needs a trailing slash and relative paths (`rates/...`), or the
  `/v2` segment is lost.
- ky's default `statusCodes` include 408 and 413. We list ours explicitly:
  429, 500, 502, 503 and 504.
- ky is ESM only. The CommonJS function bundle loads it through Node's
  `require(esm)` (Node 22.12 or later; we run 24).

## Why not axios

axios is fine, and a team already on it can record axios + axios-retry here
instead. Two things tipped it:
- axios-retry hasn't had a release since 2024-08-02.
- It doesn't retry timeouts (`ECONNABORTED`) unless you add them to
  `retryCondition`, plus `shouldResetTimeout: true` for a timeout per attempt.

A typed `get<T>()` is a cast, not validation, so Zod would still be needed.

## If the provider ships an OpenAPI spec

openapi-fetch (0.17.0) gives typed paths over a ky instance used as its
`fetch`. Data is still not validated at runtime, so keep the Zod parse.

## Sources

- npm registry pages: [axios](https://www.npmjs.com/package/axios),
  [axios-retry](https://www.npmjs.com/package/axios-retry),
  [ky](https://www.npmjs.com/package/ky), [got](https://www.npmjs.com/package/got),
  [ofetch](https://www.npmjs.com/package/ofetch),
  [undici](https://www.npmjs.com/package/undici),
  [p-retry](https://www.npmjs.com/package/p-retry),
  [cockatiel](https://www.npmjs.com/package/cockatiel)
- ky README and `distribution/core/Ky.js` in ky@2.2.0:
  https://github.com/sindresorhus/ky#readme
- axios-retry README and `dist/esm/index.js` in 4.5.0:
  https://github.com/softonic/axios-retry#readme
- got retry docs: https://github.com/sindresorhus/got/blob/main/documentation/7-retry.md
- undici RetryAgent: https://github.com/nodejs/undici/blob/main/docs/docs/api/RetryAgent.md
- openapi-fetch: https://openapi-ts.dev/openapi-fetch/
- Firebase secrets at call time: https://firebase.google.com/docs/functions/config-env
