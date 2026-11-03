# Impact: Finance second approval over $2,500

Every place that assumed "one manager approval means approved", from the
Explore search in Chapter 6, reviewed by a human. The PR reviewer ticks the
same list.

| File | What it assumed | What changed | Done |
| --- | --- | --- | --- |
| packages/shared/src/schemas/expense.ts | Status had no awaiting_finance | Added `awaiting_finance` | [x] |
| packages/shared/src/rules/approval.ts | One step, `(approver, expense)` | `requiredSteps()`; `checkApproval(input)` with approvals and settings | [x] |
| packages/shared/src/rules/bulk-approve.ts | Every success is "approved" | `sent_to_finance` outcome; plan carries the decision | [x] |
| apps/web/src/screens/expense-list/StatusBadge.tsx | Five statuses | Label for Awaiting Finance (compile error until added) | [x] |
| apps/web/src/approvals/BulkApproveSummary.tsx | Four reasons | Copy for the three new reasons (compile error until added) | [x] |
| apps/api/src/services/approvals.ts | approve = `status: approved`, approvedBy/approvedAt | `applyApproval(tx, ref, input, decision)` writes `approvals/{step}` with snapshots | [x] |
| apps/api/src/services/pending.ts | Pending = `submitted` from my team | Also `awaiting_finance`; Finance sees the Finance queue | [x] |
| firestore.rules | Managers only | `isFinance()`, approvals subcollection server-only, settings read-only | [x] |
| "Your expense was approved" message | Sent on the manager's approval | Sent from status transitions in `onExpenseUpdated` | [x] |
| Partner API / export | Not built yet (Chapter 8) | Must list only `approved` and `exported`, so `awaiting_finance` never leaves; its contract test pins that | [x] |
| packages/shared/openapi.yaml | Status enum without awaiting_finance | Regenerated; additive inside /v1 (new enum value: partners never see it) | [x] |
| Test fixtures | A "fully approved" expense in one step | Fixtures seed settings and amountBase | [x] |
| apps/api/test/approve.test.ts (Chapter 4) | No `settings/approval` document | Seeds the settings in `beforeEach` (missing settings fail closed) and deletes the expense's approvals between tests (`tx.create`) | [x] |
| Auto-approved tier (up to $75) | No approval steps | `requiredSteps()` returns `[]`; the backfill skips `approvedBy: "auto"` | [x] |
| Reports comparing `amount` with dollars | n/a in this repo | Rule uses `amountBase` (USD cents) only | [x] |
| Rejections | Not in the audit trail | Recorded on the expense (rejectedBy/At/Reason); approval-style records are a follow-up | [ ] |
| Old approved expenses | No approval records | scripts/backfill-approvals.ts (dry run by default) | [x] |

## Pre-merge checklist (paste into the PR)
- [ ] Rule implemented once in packages/shared/src/rules
- [ ] Boundary, currency and separation-of-duties tests pass
- [ ] Auto-approved tier (up to $75) still needs no steps
- [ ] All checkApproval() and canApprove() callers updated
- [ ] Single and bulk approval both call applyApproval()
- [ ] firestore.rules: no client writes to status or approvals
- [ ] Rules tests cover the Finance queue (npm run test:emu)
- [ ] UI explains the second step; server reasons have copy
- [ ] Emails and the trigger fire on the right status
- [ ] Export job and partner API still see only approved
- [ ] openapi.yaml regenerated; status enum change reviewed
- [ ] Settings validated with Zod; missing settings fail closed
- [ ] Flag tested on and off, including the flip mid-flight
- [ ] Backfill dry run reconciled; prod run done by a human
- [ ] End-to-end test: manager, then Finance (npm run test:e2e)
