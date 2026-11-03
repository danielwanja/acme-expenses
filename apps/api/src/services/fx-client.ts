// apps/api/src/services/fx-client.ts
// The only module that talks to the rates provider (docs/fx-api/openapi.yaml).
// ky owns timeouts, retries and Retry-After. This file configures it.
import ky, {
  HTTPError, NetworkError, SchemaValidationError, TimeoutError,
  type KyInstance,
} from "ky";
import type { paths } from "./fx-api.js";
import { RatesResponse, type Rates } from "./fx-schemas.js";

export type FxErrorCode =
  | "timeout" | "rate_limited" | "unavailable" | "rejected"
  | "bad_response";

export class FxError extends Error {
  readonly code: FxErrorCode;
  constructor(code: FxErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

type FxConfig = {
  baseUrl: () => string; // "https://api.rates.example/v2/"
  apiKey: () => string;
  fetch?: (request: Request) => Promise<Response>; // tests pass a fake
  retryDelayMs?: number; // caps ky's backoff; tests pass 0
};

let config: FxConfig | undefined;
let client: KyInstance | undefined;

export function configureFx(c: FxConfig): void {
  config = c;
  client = undefined;
}

// Built on first use: Firebase params can't be read at load time.
// Worst case: 3 attempts and their waits, cut off at 10 s, well under
// Firebase Hosting's 60-second timeout for the /api/** rewrite.
function fx(c: FxConfig): KyInstance {
  client ??= ky.create({
    baseUrl: c.baseUrl(), // trailing slash + relative paths keep /v2
    fetch: c.fetch,
    timeout: 3_000, // per attempt
    totalTimeout: 10_000, // all attempts and waits together
    retry: {
      limit: 2, // 3 attempts in total; GET is safe to retry
      statusCodes: [429, 500, 502, 503, 504], // and network errors
      afterStatusCodes: [429, 503], // wait for their Retry-After
      maxRetryAfter: 5_000,
      retryOnTimeout: true,
      jitter: true,
      backoffLimit: c.retryDelayMs,
    },
  });
  return client;
}

/** ky's errors, mapped to the FxError codes the routes and the UI use. */
export function toFxError(err: unknown): unknown {
  if (err instanceof TimeoutError) return new FxError("timeout", err.message);
  if (err instanceof HTTPError) {
    const { status } = err.response;
    const code = status === 429 ? "rate_limited"
      : status >= 500 ? "unavailable" : "rejected";
    return new FxError(code, `rates provider: HTTP ${status}`);
  }
  if (err instanceof SchemaValidationError) {
    const where = err.issues.map((i) => (i.path ?? []).map(String).join("."));
    const fields = where.join(", ");
    return new FxError("bad_response", `rates provider: bad ${fields}`);
  }
  // An HTML error page with a 200 is a bad response, not a crash.
  if (err instanceof SyntaxError) {
    return new FxError("bad_response", "rates provider: body is not JSON");
  }
  if (err instanceof NetworkError) {
    return new FxError("unavailable", String(err.cause ?? err));
  }
  return err; // a bug, not the provider: let it surface as a 500
}

// Only a path that exists in the provider's spec type-checks here.
const RATES_PATH: keyof paths = "/rates/{date}";

export async function getRates(date: string, base: string): Promise<Rates> {
  if (!config) throw new Error("configureFx() was not called");
  const path = RATES_PATH.replace("{date}", date).slice(1);
  try {
    return await fx(config).get(path, {
      headers: { "X-Api-Key": config.apiKey() }, // read per call
      searchParams: { base },
    }).json(RatesResponse);
  } catch (err) {
    throw toFxError(err);
  }
}
