# Slice: Bulk-approve expenses

## Outcome
A manager approves up to 20 pending expenses from their team in one
action, instead of opening each one.

## Acceptance criteria
- On Pending approvals, a manager selects 1 to 20 expenses and
  approves them with one click and one confirmation.
- Each expense goes through the same approval rule as a single
  approval. Nothing is approved that a single approval would refuse.
- Expenses that fail the rule are skipped, not fatal. The manager
  sees which ones and why.
- Over 20 selected: the button is disabled and says why. The API
  rejects more than 20 IDs, or duplicate IDs, with a 400.
- Sending the same request twice approves nothing twice.
- Non-managers get a 403. Unauthenticated calls get a 401.

## Layers touched
shared (schema, rule), firestore.rules (tests only), api (route,
service), openapi.yaml, web (client call, Pending approvals), e2e.

## Changes per layer
Data: add approvedVia: "single" | "bulk" to approved expenses. Old
documents have no value; read them as "single". No backfill.
Rules: approval logic unchanged. Add MAX_BULK_APPROVE = 20 and
planBulkApproval(), which runs the existing checkApproval() on
each expense and keeps its reason for every skip.
API: POST /api/v1/expenses/bulk-approve, body { expenseIds: string[] }.
200: { results: [{ expenseId, outcome, reason? }] }, where outcome
is "approved" or "skipped". Errors use the standard error shape.

## UI states
Empty, selecting (count shown), over limit, confirming, submitting,
done ("12 approved, 1 skipped" plus reasons), error (nothing
changed, retry).

## Tests
Unit: planBulkApproval cases; schema at 0, 1, 20, 21, duplicates.
Rules: a manager's client can't set status to approved.
API (emulator): happy path, mixed results, 21 IDs, 401, 403, repeat.
E2E: a manager selects three, approves, and sees the summary.

## Out of scope
Bulk reject. Select-all across pages. Finance second approval
(separate slice). Email notifications for bulk actions.
