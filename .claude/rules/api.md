---
paths:
  - "apps/api/src/**/*.ts"
---
- Validate every request body with the shared Zod schema.
- Keep app.ts free of firebase-functions imports.
- Bind secrets with defineSecret in index.ts only.
