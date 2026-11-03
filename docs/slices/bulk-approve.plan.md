# Plan: bulk-approve (approved)

Saved from plan mode so a fresh session can resume from the spec and this
plan instead of from memory. Each step: tests first, then code, then the proof.

| Step | Layer | Files | Proof |
| --- | --- | --- | --- |
| 1 | Shared schema and rule | packages/shared/src/schemas/bulk-approve.ts, src/rules/bulk-approve.ts (+ tests), test/schemas.test.ts | `npm test`, `npm run typecheck` |
| 2 | Rules test: clients can't approve | tests/rules/expenses.rules.test.ts | `npm run test:emu` |
| 3 | API service, route, openapi.yaml | apps/api/src/services/approvals.ts, src/routes/expenses.ts, test/bulk-approve.test.ts, test/validation.test.ts | `npm run test:emu` |
| 4 | Web client call | apps/web/src/api.ts | `npm run typecheck` |
| 5 | Pending approvals screen states | apps/web/src/approvals/ (PendingApprovals, BulkApproveSummary, selection + test) | `npm test`, a look in `npm run dev` |
| 6 | End-to-end flow | apps/web/e2e/bulk-approve.spec.ts | `npm run test:e2e` |

## Acceptance criteria -> tests
- 1 to 20, one confirmation: e2e bulk-approve.spec.ts; selection.test.ts
- Same rule as single: bulk-approve.test.ts (shared) "approves what a single approval would approve"
- Skipped, not fatal, with reasons: bulk-approve.test.ts (api) "mixed results"
- Over 20 / duplicates: schemas.test.ts; validation.test.ts "21 ids", "duplicate ids"
- Repeat approves nothing twice: bulk-approve.test.ts (api) "sending the same request twice"
- 403 / 401: validation.test.ts

## Decisions
- One bad id skips that id; it never fails the batch (spec: "skipped, not fatal").
- One Firestore transaction for the batch: all approvals land, or none.
