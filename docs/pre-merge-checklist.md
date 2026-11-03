# Pre-merge checklist

Acme's version of the book's Appendix A ("Before you merge"), filled in for
this repo. Run through it before you approve any pull request, whoever
wrote it. Reviewer sessions and subagents read this file too.

## Scope

- [ ] The pull request delivers one user outcome, as described in its slice spec.
- [ ] Every changed file is needed for that outcome.
- [ ] The diff is small enough to review properly in under an hour.

## Correctness

- [ ] Business rules are imported from `packages/shared/src/rules`, not re-implemented.
- [ ] Money is integer cents plus a currency code everywhere it is touched.
- [ ] Every library call and external endpoint exists in its docs or saved spec.
- [ ] No `catch` block hides a failure or returns a made-up default.

## Tests

- [ ] Read the test changes first: any changed expected value is a behavior change.
- [ ] New behavior has tests at the right layer: unit, API, rules or end to end.
- [ ] No existing expected value changed without a stated reason.
- [ ] No tests were deleted, skipped or weakened to make the suite pass.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` and `npm run test:emu` pass.
- [ ] `npm run test:e2e` passes for flows this change touches.

## API and security

- [ ] API changes are reflected in `openapi.yaml` and its contract tests.
- [ ] Every new `/v1` route uses `requireAuth` (`requireFreshAuth` for approvals, `requirePartnerKey` for partners) and validates input with Zod.
- [ ] `firestore.rules` is no looser than before, or a specialist approved the change.
- [ ] No secrets, tokens or `.env` values appear in code, tests, fixtures or logs.
- [ ] New dependencies were discussed and are actually used.

## Merge

- [ ] The full check suite ran once, from the top, after the last change.
- [ ] A fresh context reviewed the change: `/code-review` for bugs, plus the read-only
      `acme-reviewer` subagent pointed at the spec. A human judged each finding.
- [ ] The pull request description matches the diff, not only the commits, and says
      how the change was verified.
- [ ] A named human approves and merges.
