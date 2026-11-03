# Acme legacy migration map

Example map from Chapter 9. Claude drafts it from `legacy/`; a human reviews
every line against the legacy source before any slice is converted. Run the
legacy app with `npm run legacy` (see legacy/README.md).

## Slices
| # | Screen (AngularJS)  | Endpoints (PHP)          | Status   |
| - | ------------------- | ------------------------ | -------- |
| 1 | ExpenseListCtrl     | expenses.php             | done     |
| 2 | ExpenseEditCtrl     | expense.php, save.php    | in work  |
| 3 | SubmitCtrl          | submit.php, fx_rates.php | todo     |
| 4 | ApprovalQueueCtrl   | queue.php, approve.php   | todo     |
| 5 | ExportCtrl          | export.php               | todo     |

## Hidden rules
- H1 submit.php:14: the receipt check compares the amount in its own
  currency with 75, so 80 EUR needs a receipt and 70 GBP doesn't.
  DECISION: change (USD amountBase over $75). See Intentional differences.
- H2 queue.php:12 and db/seed.sql:4: top managers have manager_id set to
  their own id, so their own expenses land in their own queue.
  DECISION: fix the data before migrating; H3 covers the approval itself.
- H3 approve.php: no check that approver != owner. Only the UI
  hides the button (approvals.html:41). DECISION: block on server.
- H4 approve.php:35-38: foreign amounts convert at approval with the rate
  for the expense's month, as a float rounded to 2 places.
  DECISION: change. See Intentional differences.
- H5 save.php:88: saving a rejected expense resets it to draft.
  DECISION: keep. Parity case: rejected-then-edited.
- H6 save.php:19: amounts may carry thousands separators ("1,234.50").
  DECISION: keep in the form; parse with migration/legacy-money.ts.
- H7 save.php:39-46: any date is accepted, including future dates.
  DECISION: keep. A new "no future dates" check would be a silent change.
- H8 expenses.amount is FLOAT. expense.php formats it with
  number_format($amount, 2), e.g. "1,234.50". DECISION: parse
  that string with migration/legacy-money.ts; never use the float.
- H9 expense_date is DATETIME in server local time. DECISION: keep the
  calendar date as YYYY-MM-DD; never pass it through new Date().

## Intentional differences
- H3 (self-approval blocked). Approved by product.
- H1: receipts are required over $75 in USD (amountBase), the rule in
  packages/shared/src/rules/receipt.ts. Approved by Finance.
- FX (H4): legacy converts at approval from a monthly table. New app
  converts at submission from the rates provider (Chapter 7).

## Filters
The AngularJS filters in legacy/web/app/filters/ are listed in
migration/filters.txt. Each becomes a typed function in
apps/web/src/lib/format/, one `claude -p` run per file, following
migration/port-filter.md.
