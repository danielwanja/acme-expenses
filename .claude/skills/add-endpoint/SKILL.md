---
name: add-endpoint
description: Add or change an Acme /v1 API endpoint, schema to tests.
---
Add this endpoint: $ARGUMENTS

1. Read apps/api/src/routes/expenses.ts and its tests for patterns.
2. Define request and response Zod schemas in packages/shared.
3. Add the route; validate input with the shared schema.
4. Add supertest cases: success, invalid input, no token, not allowed.
5. Run npm run typecheck and npm run test:emu. Paste the output.
