# Book map

Where each chapter's result lives in this repository, for *Coding with
Claude: A Developer's Playbook* v2.0. Each chapter ends on a tag (`ch04`,
`ch07`, ...); `git checkout <tag>` shows the repo as that chapter leaves it.
The "See the result" column says how to look at it or run it. Later chapters
may extend a file; the tag column is where it first appears.

Every code or config excerpt the book quotes from a file matches the file at
the chapter's tag, or is marked as an excerpt.

## Part 1. The loop

### Chapters 1-3: the loop, the workflow, and context (`ch01-03`, `ch02`)

| Result | Where | Tag | See the result |
| --- | --- | --- | --- |
| The starting app: draft, submit (USD only), approve, reject | apps/web, apps/api, packages/shared | ch01-03 | `npm run dev`; `npm test` |
| The checks Claude runs | package.json scripts; CLAUDE.md `## Commands` | ch01-03 | `npm run typecheck && npm run lint && npm test` |
| Receipt required over $75 (the Chapter 2 example): rule, 7,499 / 7,500 / 7,501 table, API 422, form hint, OpenAPI | packages/shared/src/rules/receipt.ts (+ test), apps/api/src/routes/expenses.ts, apps/web/src/screens/expense-edit/ExpenseForm.tsx | ch02 | `git diff ch01-03 ch02`; `npx vitest run packages/shared/src/rules/receipt.test.ts` |
| CLAUDE.md as Chapter 3 shows it (Commands with the one-test-file command, Rules, House libraries, Gotchas) | CLAUDE.md | ch01-03 | `git show ch01-03:CLAUDE.md` |
| API rules file with `paths` | .claude/rules/api.md (+ web.md) | ch01-03 | `git show ch01-03:.claude/rules/api.md` |
| `add-endpoint` Skill | .claude/skills/add-endpoint/SKILL.md | ch01-03 | `/add-endpoint GET /v1/expenses/{id}/history` |
| `test-runner` subagent (read-only, haiku) | .claude/agents/test-runner.md | ch01-03 | Ask Claude to "use the test-runner subagent" |
| Firebase and Playwright MCP servers | .mcp.json (`mcp__firebase` asks first) | ch01-03 | `/mcp` |
| House libraries: ky client, TanStack Query, key factories and hooks | apps/web/src/http.ts, queryClient.ts, queries/ (+ tests) | ch01-03 | `npx vitest run apps/web/src/http.test.ts` |
| `Money` as a Zod schema in a neutral file | packages/shared/src/schemas/money.ts | ch01-03 | Imported by `pending.ts` (ch06-slice) and `partner.ts` (ch08) |

### Chapter 4: Give Claude a check it can run (`ch04`)

| Result | Where | Tag | See the result |
| --- | --- | --- | --- |
| The inline `Stop` hook (`npm test --silent 1>&2 \|\| exit 2`) | .claude/settings.json | ch04 | `/hooks`; ask Claude for a change that breaks a test |
| Lock tests for a team: `lock-tests.sh` and its list | .claude/hooks/lock-tests.sh, .claude/locked-tests.txt | ch04 | Try it 2 (deny rule, then `git diff --exit-code <tag>`) |
| Auto-approval up to $75, spot checks | packages/shared/src/rules/approval.ts, apps/api/src/routes/expenses.ts | ch04 | `npx vitest run packages/shared/src/rules/approval.test.ts` |
| Table tests: `isAutoApproved`, `canApprove`, `convertToUsd`, `isSpotChecked` | packages/shared/src/rules/*.test.ts | ch04 | `npm test` |
| API tests against the emulator | apps/api/test/approve.test.ts, expenses.test.ts | ch04 | `npm run test:emu` |
| Security Rules tests (an allow and a near miss each) | tests/rules/expenses.rules.test.ts | ch04 | `npm run test:emu` |
| Playwright: employee submits $120, manager approves | apps/web/e2e/submit-and-approve.spec.ts, playwright.config.ts | ch04 | `npm run test:e2e` |
| Planted bug for "Fix bugs by reproducing them first" | branch `exercise/ch04-receipt-bug` | ch04 + 1 | `git switch exercise/ch04-receipt-bug`, then the chapter's bug prompt |

### Chapter 5: Enforce what can't have exceptions (`ch05`)

| Result | Where | Tag | See the result |
| --- | --- | --- | --- |
| Team permissions: allow the inner loop, ask before push/install/Firebase MCP, deny secrets and deploys | .claude/settings.json | ch05 | `/permissions` |
| `protect-files.sh`, registered with `"onFailure": "block"` | .claude/hooks/protect-files.sh, .claude/settings.json | ch05 | `echo '{"tool_input":{"file_path":"apps/api/.env"}}' \| .claude/hooks/protect-files.sh; echo $?` (2) |
| Strict sandbox (`failIfUnavailable`, `allowUnsandboxedCommands: false`) | .claude/settings.json | ch05 | `/sandbox` |
| The emulator-only secret file to try to read | apps/api/.secret.local.example | ch05 | Copy it to `.secret.local`, then the chapter's sandbox prompt |

## Part 2. Building features

### Chapter 6: Ship a feature as one slice (`ch06-slice`, `ch06`)

| Result | Where | Tag | See the result |
| --- | --- | --- | --- |
| Prerequisite: task-shaped `GET /api/v1/approvals/pending` (`view=summary\|full`) behind the Pending approvals screen | apps/api/src/routes/approvals.ts, services/pending.ts, packages/shared/src/schemas/pending.ts, apps/web/src/queries/approvals.ts | ch06-slice | `npm run test:emu` (pending.test.ts) |
| Slice template, bulk-approve spec and saved plan | docs/slices/TEMPLATE.md, bulk-approve.md, bulk-approve.plan.md | ch06-slice | Read the spec, then `git log --stat ch05..ch06-slice` |
| Bulk approve through every layer: schema, `planBulkApproval`, rules pin, service, route, `useBulkApprove`, screen, e2e | packages/shared/src/{schemas,rules}/bulk-approve.ts, apps/api/src/services/approvals.ts, apps/web/src/approvals/, apps/web/e2e/bulk-approve.spec.ts | ch06-slice | `npm test`; `npm run test:e2e` |
| `Record<SkipReason, string>` copy map | apps/web/src/approvals/BulkApproveSummary.tsx | ch06-slice | Add a reason to the schema; `npm run typecheck` fails |
| Specialist rules file for Security Rules | .claude/rules/security-rules.md | ch06-slice | Edit firestore.rules and check `/context` |
| Impact checklist for the Finance rule | docs/rules/finance-approval-impact.md | ch06 | Read it next to the diff `git diff ch06-slice ch06` |
| `requiredSteps()` and `checkApproval(input)`, boundary tests at $2,500.00 / $2,500.01 | packages/shared/src/rules/approval.ts (+ test) | ch06 | `npx vitest run packages/shared/src/rules/approval.test.ts` |
| Audit records, settings document and `financeStep` flag, admin route, notifications trigger | apps/api/src/services/approvals.ts, routes/settings.ts, index.ts, services/notifications.ts | ch06 | `npm run test:emu` (finance-approval.test.ts, flag flip mid-flight) |
| Finance in the rules; the Finance queue on the same pending endpoint | firestore.rules, apps/api/src/services/pending.ts | ch06 | `npm run test:emu`; `npm run test:e2e` (finance-approval.spec.ts) |
| Backfill, dry run by default | scripts/backfill-approvals.ts | ch06 | Run it against the emulator |

### Chapter 7: Integrate an API you don't own (`ch07`)

| Result | Where | Tag | See the result |
| --- | --- | --- | --- |
| The provider's spec and notes | docs/fx-api/openapi.yaml, notes.md | ch07 | The read-back prompt |
| Rates provider rules file | .claude/rules/fx-api.md | ch07 | Edit fx-client.ts and check `/context` |
| Generated provider types | apps/api/src/services/fx-api.d.ts | ch07 | `npm run gen:fx-types -w @acme/api` |
| The library decision | docs/decisions/http-client.md | ch07 | Read it |
| The client: one ky instance holds the policy, `toFxError` | apps/api/src/services/fx-client.ts | ch07 | Set `limit: 0`; `npx vitest run apps/api/test/fx-client.test.ts` fails |
| Rates cache in Firestore (past days for good, today for an hour) | apps/api/src/services/fx-rates.ts; firestore.rules denies `fxRates` | ch07 | `npx vitest run apps/api/test/fx-rates.test.ts`; `npm run test:emu` |
| Conversion at submission, `GET /v1/fx/rate`, the form's USD preview | apps/api/src/routes/expenses.ts, routes/fx.ts, apps/web/src/queries/fx.ts | ch07 | `npm run dev`, enter 42.50 EUR |
| Recorded fixtures and a live contract test | apps/api/test/fixtures/rates-provider/, test/contract/ | ch07 | `FX_CONTRACT=1 npx vitest run --project api contract` (needs a sandbox key) |
| Lint rule against a second HTTP client | eslint.config.js (`no-restricted-imports`) | ch07 | Import axios anywhere; `npm run lint` fails |
| `defineSecret` only in index.ts | apps/api/src/index.ts, .claude/rules/api.md | ch07 | Read the rules file |

### Chapter 8: Design the contract, then let Claude build to it (`ch08`)

| Result | Where | Tag | See the result |
| --- | --- | --- | --- |
| Schema-first contract and the generated spec | packages/shared/src/schemas/, src/openapi/, openapi.yaml | ch01-03 / ch08 | Try it 2: change a schema, `npm test` fails the drift test |
| Partner contract: `PartnerExpense`, cursor pagination, Idempotency-Key | packages/shared/src/schemas/partner.ts | ch08 | `git diff ch07 ch08 -- packages/shared/openapi.yaml` |
| Partner routes, partner keys, idempotent export, composite index | apps/api/src/routes/partner.ts, middleware/partner-key.ts, services/export.ts, services/partner-expenses.ts, firestore.indexes.json | ch08 | `npm run test:emu` (partner.contract.test.ts) |
| `## API versioning` | CLAUDE.md | ch08 | `git show ch08:CLAUDE.md` |
| API rules: auth in every route, throw `HttpError` | .claude/rules/api.md | ch08 | `git show ch08:.claude/rules/api.md` |
| `approvals_list_pending` MCP server, and its allow rule | tools/approvals-mcp/server.ts (+ test), .claude/settings.json | ch08 | `claude mcp add ... acme-approvals -- node tools/approvals-mcp/server.ts` |

### Chapter 9: Modernize legacy code without changing what it does (`ch09`)

| Result | Where | Tag | See the result |
| --- | --- | --- | --- |
| The old app, runnable, with hidden rules H3 (approve.php, approvals.html:41) and H5 (save.php:88) | legacy/ (web, api, db) | ch09 | `npm run legacy`, then http://localhost:8081/web/ |
| Migration map: slices, hidden rules H1-H9, intentional differences | migration/map.md | ch09 | Try it 2: check each rule against the PHP |
| Parity harness and a recorded case | tests/parity/ | ch09 | `npm run legacy` + `npm run test:parity` |
| Legacy money parser | migration/legacy-money.ts (+ test) | ch09 | `npx vitest run migration/legacy-money.test.ts` |
| Migration rules file and the `Edit(/legacy/**)` deny | .claude/rules/migration.md, .claude/settings.json | ch09 | Ask Claude to edit a legacy file |
| Fan-out loop inputs: the filter list and the per-file instruction | migration/filters.txt, migration/port-filter.md | ch09 | The chapter's `claude -p` loop, on two filters first |
| Files copied into new worktrees | .worktreeinclude | ch09 | `claude --worktree <name>` |

### Chapter 10: Ship the whole pie (`ch10`)

| Result | Where | Tag | See the result |
| --- | --- | --- | --- |
| The brief | docs/briefs/finance-dashboard.md | ch10 | The open-questions prompt |
| The goal on one line, for a headless run with a cap | docs/briefs/finance-goal.txt | ch10 | `claude -p "$(cat docs/briefs/finance-goal.txt)" --max-turns 200 ...` |
| The three designs | docs/designs/finance/queue.png, report.png, report-empty.png | ch10 | Open them |
| `SessionStart` hook that re-injects PROGRESS.md after compaction | .claude/settings.json | ch10 | `/hooks` |

The run's output (the features file, the report, the code) is yours: the
chapter lands it as slices on your branch.

## Part 3. The team

### Chapter 11: Review what Claude writes (`ch11`)

| Result | Where | Tag | See the result |
| --- | --- | --- | --- |
| Read-only reviewer subagent (Read, Grep, Glob) | .claude/agents/acme-reviewer.md | ch11 | "Use the acme-reviewer subagent to check this branch against docs/slices/bulk-approve.md" |
| Review Skill, started by you | .claude/skills/review-branch/SKILL.md | ch11 | `/review-branch main` |
| Review-only rules | REVIEW.md | ch11 | Read it; the managed Code Review service reads it from the base branch |
| Acme's version of Appendix A's "Before you merge" | docs/pre-merge-checklist.md | ch11 | Paste it into a PR |
| A pending expense whose note carries an instruction | scripts/seed-injected-note.ts | ch11 | Seed the emulator, then the chapter's pending-approvals prompt |

### Chapter 12: Scale it to the team and CI (`ch12`)

| Result | Where | Tag | See the result |
| --- | --- | --- | --- |
| CI: checks, emulator suites, e2e | .github/workflows/ci.yml | ch12 | Push a branch to your fork |
| `@claude` in issue comments | .github/workflows/claude.yml | ch12 | `/install-github-app` |
| Nightly: FX contract test, headless routes-without-tests check | .github/workflows/nightly.yml, scripts/untested-routes.schema.json | ch12 | Try it 2 (needs an API key) |
| Project plugin | .claude/settings.json `enabledPlugins` | ch12 | `/plugin` |
| Install command for new worktrees; `/api` mount as a Gotcha | CLAUDE.md | ch12 | Try it 3: two worktrees |
| Acme's filled-in Appendix C templates | CLAUDE.md, .claude/settings.json, .claude/hooks/protect-files.sh, .claude/agents/acme-reviewer.md, .claude/skills/add-endpoint/SKILL.md | ch12 | Compare with Appendix C |

## Not in the repo

`migration/reconcile.ts` (Chapter 9 asks Claude to write it against your
data), the ported filters in `apps/web/src/lib/format/` (the Chapter 9 loop
writes them), `PROGRESS.md` (a session hand-off file),
`.claude/settings.local.json` (personal; Chapter 4's deny-rule lock goes
there), and the Chapter 10 run's output. Generated client types for
`openapi.yaml` are for partners to make in their own repo (Chapter 8);
Acme's web app uses the shared Zod schemas instead.

## Gaps the book leaves open, filled in code

1. **Backfill and auto-approved expenses.** The Chapter 6 backfill reads
   every `approved` expense's `approvedBy` into a manager record.
   Auto-approved expenses have `approvedBy: "auto"` and no manager step, so
   the script skips and counts them.
2. **Spot checks.** About 1 in 20 auto-approved expenses gets
   `spotCheck: true` through `isSpotChecked()` with an injectable random
   source; there is no manager review screen yet. The employee's list shows
   "Approved automatically".
3. **`SubmitResult`.** Its `status` is `submitted` or `approved`, with
   `approvedBy: "auto"` when approved automatically.
4. **Receipt images.** The form records `receiptPath`; uploading the file to
   Cloud Storage is out of scope.
5. **Fixtures and parity cases** are examples: the rates provider is
   fictional, and the legacy app is a small stub of the one the book
   describes.
6. **Emails.** Notifications are queued as `notifications/{id}` documents;
   sending them is out of scope.
7. **TypeScript 6.** `typescript-eslint` (peer `<6.1`) doesn't support 7 yet,
   and `openapi-typescript` (peer `^5`) runs through `npx`.
8. **The pending endpoint comes first.** Bulk approve and the Finance queue
   (Chapter 6) build on `GET /api/v1/approvals/pending`, so it arrives at the
   start of `ch06-slice`, with both views; Chapter 8 adds the MCP tool on
   top of it.
