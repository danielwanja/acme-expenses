---
paths:
  - "firestore.rules"
  - "tests/rules/**/*.ts"
---

# Security Rules
- Clients never write status, approvedBy or approvedAt.
- Every rules change comes with a test in tests/rules/.
