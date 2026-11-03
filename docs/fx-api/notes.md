# Rates provider: notes Acme relies on

Saved from the provider's prose docs (fictional provider for the book).
Each item links back to its source page in your real copy.

## Limits
- 60 requests per minute per key. Over the limit: HTTP 429 with a
  `Retry-After` header in seconds.

## Errors and retries
- 5xx responses and timeouts are safe to retry: `GET /rates/{date}` is a read.
- 400 means a bad date or base currency; 401/403 means a bad or expired key.
  Never retry those.

## Weekends and holidays
- For a date with no published rates, the provider returns the previous
  business day's rates. The `date` field in the response says which day.

## Keys
- One key per environment (sandbox, production). Rotate on any leak.
