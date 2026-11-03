---
paths:
  - "apps/web/src/screens/**"
  - "apps/api/src/routes/**"
  - "migration/**"
---

# Legacy migration rules

- legacy/ is the old app. Read it; never edit it.
- Old behavior is the spec. To change behavior, stop and add it to
  "Intentional differences" in migration/map.md first.
- Copy the patterns in apps/web/src/screens/expense-list/.
- Parse legacy amounts with migration/legacy-money.ts.
  Never multiply a float by 100.
- Legacy dates are calendar dates. Keep the YYYY-MM-DD string;
  never pass them through new Date().
- Mark anything you are unsure about with // TODO(port): <reason>.
