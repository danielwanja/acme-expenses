# Acme Expenses

Companion code for *Coding with Claude: A Developer's Playbook* (v2.0) by
Daniel Wanja. Acme is a fictional company; this is teaching code, small on
purpose.

- **The book** (free PDF and EPUB) and its companion, *Architecting with
  Claude: The Principles*:
  [github.com/danielwanja/claude-architect-and-code](https://github.com/danielwanja/claude-architect-and-code)
- **The story behind it:** [n-so.com/blog](https://n-so.com/blog/)
- **License:** MIT (see `LICENSE`). Independent work, not affiliated with
  Anthropic.

Employees create an expense (amount, currency, category, date, note,
receipt) and submit it. It is converted to USD at submission. Up to $75 it
is approved automatically (and about 1 in 20 is flagged for a spot check);
otherwise their manager approves or rejects it, and over $2,500 Finance
approves second. Accounting partners list approved expenses and mark them
exported through a versioned partner API. Managers can ask an AI agent
"what's waiting for me?" through a one-tool MCP server. Its ancestor, an
AngularJS + PHP app, waits in `legacy/` to be migrated.

The tags follow the book's twelve chapters: check out a tag to see the repo
as a chapter leaves it. `docs/BOOK-MAP.md` says where each chapter's result
lives and how to see it.

## Chapter tags

```bash
git checkout ch07     # the repo at the end of Chapter 7
```

| Tag | Chapter | What the tag adds |
| --- | --- | --- |
| `ch01-03` | 1-3: Understand the Loop; Explore, Plan, Build, Verify, Commit; Tell Claude What It Can't See | Monorepo and base flow (draft, USD submit, approve, reject). The context kit as the book shows it: `CLAUDE.md` (with the one-test-file command and the House libraries), `.claude/rules/api.md` and `web.md`, the `add-endpoint` Skill, the `test-runner` subagent, permissions, `.mcp.json`. ky client (`http.ts`), TanStack Query (`queryClient.ts`, `queries/`) |
| `ch02` | 2 (the receipt-rule example) | Receipt required over $75: shared rule, API, form hint, OpenAPI |
| `ch04` | 4: Give Claude a Check It Can Run | Auto-approval up to $75 with spot checks; table tests at 7,499 / 7,500 / 7,501, emulator API tests, Security Rules tests, Playwright ($120 USD with a receipt); the inline `Stop` hook and the lock-tests hook |
| `ch05` | 5: Enforce What Can't Have Exceptions | Team permissions (allow / ask / deny), `protect-files.sh` with `onFailure: block`, the strict sandbox, `.secret.local.example` |
| `ch06-slice` | 6, first half | The task-shaped `GET /api/v1/approvals/pending` (a prerequisite), then managers bulk-approve up to 20 expenses through every layer (`docs/slices/`) |
| `ch06` | 6: Ship a Feature as One Slice | Finance second approval over $2,500: impact file, rule, audit records, settings and flag, rules, trigger, backfill |
| `ch07` | 7: Integrate an API You Don't Own | Exchange-rate client on ky from the provider's spec, the Firestore rates cache, conversion at submission, `GET /v1/fx/rate` and the form preview, the decision record and lint rule |
| `ch08` | 8: Design the Contract, Then Let Claude Build to It | Partner API (pagination, idempotent export, partner keys), the approvals MCP server, `## API versioning`, auth and error lines in the API rules |
| `ch09` | 9: Modernize Legacy Code Without Changing What It Does | Runnable legacy stub on :8081 (hidden rules H3 and H5), migration map, `legacy-money.ts`, parity harness, migration rules and the `Edit(/legacy/**)` deny, `migration/filters.txt` and `port-filter.md` |
| `ch10` | 10: Ship the Whole Pie | The brief, `finance-goal.txt`, the three designs, the `SessionStart` re-inject hook |
| `ch11` | 11: Review What Claude Writes | Read-only `acme-reviewer`, `review-branch` Skill, `REVIEW.md`, `docs/pre-merge-checklist.md`, a seed script for the injection exercise |
| `ch12` | 12: Scale It to the Team and CI | CI, the `@claude` workflow, the nightly FX contract and untested-routes checks, the plugin; `CLAUDE.md` names the install command. Acme's filled-in Appendix C templates |

`main` adds this README, `docs/BOOK-MAP.md` and the license on top of `ch12`.

### Exercise branches

| Branch | Chapter | What's planted |
| --- | --- | --- |
| `exercise/ch04-receipt-bug` | 4, "Fix bugs by reproducing them first" | The expense form checks `amount >= 7500` instead of calling `isReceiptRequired()`, so exactly $75.00 asks for a receipt. Reproduce it with a failing test, then fix it. |

## Business rules

All of them live once, in `packages/shared/src/rules/`; the API and the UI
import them. Amounts are compared on `amountBase`, the USD cents fixed at
submission.

| Rule | Function | Introduced |
| --- | --- | --- |
| Money is integer minor units; conversion rounds half up | `convertToUsd()` (`money.ts`) | `ch01-03` |
| Only drafts can be edited or submitted | `canEdit()` (`drafts.ts`) | `ch01-03` |
| No one approves their own expense; managers approve their reports | `checkApproval()`, `canApprove()` (`approval.ts`) | `ch01-03` |
| Over $75 needs a receipt to submit | `isReceiptRequired()`, `RECEIPT_REQUIRED_ABOVE_CENTS` (`receipt.ts`) | `ch02` |
| Up to $75 is approved at submission (`approvedBy: "auto"`, `approvedAt`); about 1 in 20 gets `spotCheck: true` | `isAutoApproved()`, `isSpotChecked()` (`approval.ts`) | `ch04` |
| Bulk approval applies the single-approval rule to each of up to 20 | `planBulkApproval()`, `MAX_BULK_APPROVE` | `ch06-slice` |
| $75 to $2,500: the manager; over $2,500: the manager, then Finance (`settings/approval`, fails closed) | `requiredSteps()` (`approval.ts`) | `ch06` |

Until `ch07`, submission accepts USD only (`unsupported_currency` otherwise).

## Stack

- npm-workspaces monorepo, Node.js 24 LTS, strict TypeScript, ES modules.
- `apps/web`: Vite + React SPA, served by Firebase Hosting. A Hosting rewrite
  sends `/api/**` to one Cloud Functions for Firebase (2nd gen) function, `api`.
  Server state goes through TanStack Query v5 and HTTP through ky.
- `apps/api`: a plain Express 5 app (`src/app.ts`) wrapped by `src/index.ts`:
  `onRequest(app)`, `onDocumentCreated` / `onDocumentUpdated` triggers and
  `defineSecret("FX_API_KEY")`. Firebase ID tokens are verified with
  `verifyIdToken`. The exchange-rate provider is called with ky; daily rates
  are cached in Firestore (`fxRates/{date}_{base}`).
- `packages/shared` (`@acme/shared`): Zod 4 schemas and types, business rules
  in `src/rules/`, and the generator for the committed OpenAPI 3.1
  `openapi.yaml` (`@asteasolutions/zod-to-openapi` + `yaml`).
- Firestore, with `firestore.rules` and `firestore.indexes.json`.
- Tests: Vitest (jsdom and Testing Library for the web app), supertest,
  `@firebase/rules-unit-testing`, Playwright.
- `tools/approvals-mcp`: a local stdio MCP server (`@modelcontextprotocol/sdk`).
- `legacy/`: the old app, AngularJS 1.8 + PHP 8 on SQLite (MySQL schema),
  run with `php -S`.
- Claude Code setup: `CLAUDE.md`, `.claude/` (settings, hooks, Skills,
  subagents, path-scoped rules), `.mcp.json` (Firebase + Playwright MCP),
  `REVIEW.md`, `.github/workflows/`.

```text
acme-expenses/
├── .claude/                 # settings.json, hooks/, skills/, agents/, rules/
├── .github/workflows/       # ci.yml, claude.yml, nightly.yml
├── .mcp.json  .nvmrc  CLAUDE.md  REVIEW.md  .worktreeinclude
├── firebase.json  .firebaserc  firestore.rules  firestore.indexes.json
├── apps/
│   ├── web/                 # src/, e2e/ (Playwright), playwright.config.ts
│   └── api/                 # src/{index,app,errors}.ts, middleware/, routes/,
│                            # services/, test/, .env, .secret.local.example
├── packages/shared/         # src/{schemas,rules,openapi}/, test/, openapi.yaml
├── tools/approvals-mcp/     # server.ts (+ test)
├── tests/rules/             # Security Rules tests
├── tests/parity/            # legacy parity harness (Chapter 9)
├── legacy/                  # the old app: web/ (AngularJS), api/ (PHP), db/
├── migration/               # map.md, legacy-money.ts, filters.txt, port-filter.md
├── scripts/                 # backfill-approvals.ts, seed-injected-note.ts,
│                            # untested-routes.schema.json
└── docs/                    # BOOK-MAP.md, fx-api/, decisions/, slices/, rules/,
                             # briefs/, designs/, pre-merge-checklist.md
```

## House libraries

The app hand-writes its rules, not its plumbing. `CLAUDE.md` says the same
in its `## House libraries` section.

| Concern | Library | Where |
| --- | --- | --- |
| HTTP calls: timeout, retry, `Retry-After`, JSON validated with Zod | [ky](https://github.com/sindresorhus/ky) 2.x | `apps/api/src/services/fx-client.ts` (the rates provider), `apps/web/src/http.ts` (Acme's own API) |
| React server state: caching, dedupe, retries, loading and error states, invalidation | [TanStack Query](https://tanstack.com/query) v5 | `apps/web/src/queryClient.ts`, key factories and hooks in `apps/web/src/queries/` |
| Validation and types | Zod schemas from `@acme/shared` | everywhere (`.json(Schema)` with ky) |
| Rates shared by every Cloud Functions instance | Firestore `fxRates/{date}_{base}` | `apps/api/src/services/fx-rates.ts` |

- **Retries live in one place per side.** On the server, the ky instance
  retries the provider (3 attempts on network errors, timeouts, 429 and 5xx;
  `Retry-After` capped at 5 s). In the browser, ky has `retry: 0` and TanStack
  Query retries queries up to 3 times, never on a 4xx, a final Firestore
  error or a schema failure. The rate preview doesn't retry `fx_unavailable`,
  because the API already tried the provider. Mutations aren't retried.
- **No fetching in `useEffect`.** Screens use the hooks in `src/queries/`; a
  queryFn can be any promise, so the Firestore reads go through them too.
  The one `useEffect` left (`auth.ts`) is the Firebase auth subscription.
- **Rates cache.** Past days are cached for good; today's rates for an hour.
  The in-memory map in `fx-rates.ts` only dedupes calls in flight on one
  instance. Clients can't read or write `fxRates` (`firestore.rules`).
- **Enforced, not only requested.** ESLint's `no-restricted-imports` turns
  away axios, got and node-fetch, and `REVIEW.md` asks the reviewer to flag
  hand-written retries and fetching in `useEffect`. The research behind ky
  is in `docs/decisions/http-client.md`.
- **Not used here:** axios + axios-retry (fine if you're on axios already;
  timeouts need a custom `retryCondition`), RTK Query (if the app uses
  Redux), openapi-fetch / openapi-react-query (for a client in another repo
  that only has `openapi.yaml`, such as a Chapter 8 partner).

## Prerequisites

- Node.js 24 (`nvm use` reads `.nvmrc`; `engines` asks for 24.12 or later,
  which `@firebase/rules-unit-testing` needs).
- JDK 21 or later, for the Firebase Local Emulator Suite (`test:emu`,
  `test:e2e`, `test:parity`, `dev`).
- The Firebase CLI. It is a dev dependency here (`npx firebase ...`); a global
  install works too. You don't need a live Firebase project: everything runs
  against the emulators with the `demo-acme` project id. `.firebaserc` names a
  placeholder project, `acme-expenses-demo`, for when you create a real one.
- `jq`, for the Claude Code hook scripts.
- PHP 8 with `pdo_sqlite`, only for the legacy app in Chapter 9.

## Setup

```bash
npm ci
cp apps/api/.secret.local.example apps/api/.secret.local   # emulator-only secret
npm run dev        # builds the api, starts the emulators, runs Vite on :5173
```

`npm run dev` serves the app at http://localhost:5173 (Vite proxies `/api` to
the Hosting emulator on :5000, which rewrites to the function) and the
Emulator UI at http://127.0.0.1:4000. Create users in the Auth emulator and
give them custom claims (`role: "manager"`, `finance: true`, `admin: true`),
or run the Playwright seed (`apps/web/e2e/seed.ts`) against running emulators.
Exchange rates come from a fictional provider (`api.rates.example`); USD
expenses work without it.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | web + api against the Firebase emulators |
| `npm test` | unit tests (Vitest): shared rules, money, schemas, OpenAPI drift, FX client and rates cache, API validation, web client, hooks and screens (jsdom), MCP server, legacy money |
| `npx vitest run <file>` | one test file |
| `npm run test:emu` | API (supertest + Firestore) and Security Rules tests inside `firebase emulators:exec` |
| `npm run test:e2e` | Playwright: builds, starts the emulators, seeds users, runs the flows |
| `npm run test:parity` | Chapter 9 parity suite (needs `npm run legacy` and the emulators) |
| `npm run legacy` | the legacy app on http://localhost:8081 (`php -S`) |
| `npm run typecheck` | `tsc` for every workspace, tests and scripts |
| `npm run lint` | ESLint (typescript-eslint, 100-column lines) |
| `npm run build` | api bundle (`apps/api/lib`, shared bundled in) and web (`apps/web/dist`) |
| `npm run openapi` | regenerates `packages/shared/openapi.yaml` from the Zod schemas |
| `npm run gen:fx-types -w @acme/api` | regenerates the provider types with `openapi-typescript` |

`openapi-typescript` declares a TypeScript 5 peer, so it runs through `npx`
instead of being installed next to TypeScript 6. The repo uses TypeScript 6
because `typescript-eslint` doesn't support 7 yet; the code itself is not
version-specific.

## Troubleshooting

- **Port 5000 and AirPlay Receiver (macOS).** The Hosting emulator uses port
  5000, and so does AirPlay Receiver. Playwright then sees a server already
  answering, doesn't start the emulators, and the seed step stops with "Port
  5000 is answered by another app". Turn AirPlay Receiver off in System
  Settings > General > AirDrop & Handoff, or stop the other app, then run
  `npm run test:e2e` again.
- **Node 24 and a JDK.** The emulators need Java: without a JDK (21 or
  later), `npm run test:emu` and `test:e2e` stop before any test runs. Use
  Node 24 (`nvm use`): Cloud Functions runs `nodejs24` (`firebase.json`), and
  `@firebase/rules-unit-testing` needs 24.12 or later. npm warns about the
  `engines` field on older versions.
- **Emulator ports.** Auth 9099, Firestore 8080, Functions 5001, Hosting
  5000, Emulator UI 4000 (`firebase.json`); the legacy app uses 8081 and Vite
  5173. The suites share these ports and the `demo-acme` project, so run one
  emulator suite at a time, and only one per machine across worktrees. If a
  port is taken, find the process (`lsof -i :8080`) and stop it.
- **An emulator left running after e2e.** `playwright.config.ts` stops the
  Firebase CLI with `gracefulShutdown: { signal: "SIGINT" }`, so every
  emulator exits. If you kill a run with SIGKILL, the Firestore emulator can
  keep port 8080; stop it before the next run.
- **The e2e seed uses no `firebase-admin`.** `apps/web/e2e/seed.ts` talks to
  the Auth and Firestore emulators over their REST APIs (`Bearer owner`),
  because `firebase-admin`'s dependencies don't load under Playwright's ESM
  loader on Node 24 (`request for './jwe/compact/decrypt.js' is not in cache`).
- **The legacy app.** It needs PHP 8 with `pdo_sqlite`, keeps its data in
  your temp directory, and loads AngularJS from cdnjs. Restore its seed with
  `curl -X POST http://localhost:8081/api/reset.php` before you record or
  replay parity cases.

## What was verified, and what to run on your machine

The repository was rebuilt for book v2 in a container with Node 22, PHP 8.3
and access to the npm registry only, so the Firebase emulators (which
download from Google Storage) could not start there.

| Check | Status |
| --- | --- |
| `npm ci`, `npm run typecheck`, `npm run lint` | Verified at every tag, from a clean checkout |
| `npm test` (the live FX contract test is skipped unless `FX_CONTRACT=1`, by design) | Verified at every tag |
| `npm run build`, and loading the bundled function (`require("apps/api/lib")`) | Verified at every tag |
| `openapi.yaml` up to date (the drift test, and `npm run openapi` leaves no diff) | Verified at every tag |
| Emulator and Playwright suites typecheck | Verified at every tag |
| MCP server over stdio against a fake API (in `npm test`) | Verified (Node 22 type stripping) |
| Hook scripts (`lock-tests.sh`, `protect-files.sh`) | Exercised with sample hook input |
| Legacy app: the H3 and H5 flows, and the recorded parity case against it | Verified with `php -S` (the "new app" half needs the emulators) |
| `npm run test:emu` (API + Security Rules tests) | **Run on your machine**: written against the documented APIs, not run |
| `npm run test:e2e` (Playwright) | **Run on your machine**: `npx playwright install chromium` first |
| `npm run dev`, Firebase MCP, Playwright MCP | **Run on your machine** |
| GitHub Actions workflows | YAML parsed only; not run |

Nothing here deploys anything. `.claude/settings.json` denies `firebase deploy`
and the Firebase MCP deploy tool on purpose.

## Secrets

No secrets are committed. `apps/api/.secret.local` (emulator-only) is
git-ignored; copy `apps/api/.secret.local.example`. In production the
exchange-rate key lives in Secret Manager: `firebase functions:secrets:set FX_API_KEY`.
