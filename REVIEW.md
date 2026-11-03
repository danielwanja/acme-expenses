## Always check
- New /v1 routes have a supertest test and an openapi.yaml entry
- Money stays in integer cents; no parseFloat on amounts
- Approval logic is imported from packages/shared/src/rules
- No hand-written retry loops, backoff, sleeps or Retry-After
  parsing, and no data fetching in useEffect. ky and TanStack
  Query own that (House libraries in CLAUDE.md)

## Do not report
- Anything CI already enforces: lint, formatting, type errors
