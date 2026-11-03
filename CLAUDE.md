## Commands
- npm test                 # unit tests (Vitest), all workspaces
- npx vitest run <file>    # one test file
- npm run test:emu         # API + rules tests inside the emulators
- npm run typecheck
- npm run lint

## Rules
- Money is integer cents + currency code. Never floats.
- Business rules live only in packages/shared/src/rules.
- Every API change updates openapi.yaml and its contract tests.

## House libraries
- HTTP: ky, configured on the instance. No hand-written retry loops.
- React server state: TanStack Query. No fetching in useEffect.
- Validation: the shared Zod schemas.
- Ask before adding a dependency that overlaps one of these.

## Gotchas
- packages/shared/openapi.yaml is generated from Zod. Don't hand-edit.
- Emulator suites share ports: run one at a time.
