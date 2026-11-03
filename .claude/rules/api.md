---
paths:
  - "apps/api/src/**/*.ts"
---
- Validate every request body with the shared Zod schema.
- Keep app.ts free of firebase-functions imports.
- Bind secrets with defineSecret in index.ts only.
- Check auth in every route: requireAuth (requireFreshAuth for
  approvals, requirePartnerKey for partner routes).
- Throw HttpError (the shared error shape), never a raw Error.
