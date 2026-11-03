## Always check
- No hand-written retry loops, backoff, sleeps or Retry-After
  parsing, and no data fetching in useEffect. ky and TanStack
  Query own that (House libraries in CLAUDE.md)
