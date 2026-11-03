# Brief: Finance dashboard

## End state
A /finance area for Finance users that matches docs/designs/finance/:
- queue.png: expenses in awaiting_finance, oldest first. Approve or
  reject through the existing approval route (Chapter 6).
- report.png and report-empty.png: spend by category for one month,
  approved and exported expenses only, in USD from amountBase.
- CSV export of the report month, one row per expense.

## Validation
- npm run typecheck, lint, test, test:emu and test:e2e exit 0.
- One Playwright spec per design. Screenshot each screen and list
  every difference from its design in the report file.
- Report totals equal the seeded expenses to the cent, per category.
  CSV totals equal report totals.

## Scope limits
Out: charts beyond the designs, date ranges, scheduled or emailed
reports, PDF, editing expenses, any change to manager approval.

## Guardrails
- Money is integer cents. Sum amountBase, never amount.
- Don't edit packages/shared/src/rules or any existing test.
- No new npm dependencies. New routes live under /api/v1/finance,
  use requireAuth, check the finance claim, and update openapi.yaml.
- firestore.rules: no changes. Finance reads go through the API.

## Cap and sign-off
Stop after 150 turns. Never push, deploy or touch main. Finish with
docs/briefs/finance-dashboard.report.md: what you built, what you
assumed, what differs from the designs. A human reviews the branch.
