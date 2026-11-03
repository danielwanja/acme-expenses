# legacy/

A small, runnable stand-in for the old Acme expense tool: an AngularJS 1.8
front end (legacy/web), a PHP back end (legacy/api) and a MySQL schema
(legacy/db). Chapter 9 maps it, records parity cases against it and ports it.
It is deliberately old-fashioned, hidden rules included: see
migration/map.md, and check each rule against the PHP yourself.

It is read-only: `.claude/rules/migration.md` says so, and the
`Edit(/legacy/**)` deny rule in `.claude/settings.json` backs it up.

## Run it

Needs PHP 8 with pdo_sqlite (macOS: `brew install php`).

```bash
npm run legacy        # php -S 127.0.0.1:8081 -t legacy
```

- Screens: http://localhost:8081/web/ (pick a user in the header; the
  AngularJS files load from cdnjs).
- API: http://localhost:8081/api/expense.php?id=1042 with an
  `X-Legacy-User: erin` header, the way the old corporate proxy sent it.
- Users: erin and sam report to max; zoe reports to lee; max and lee are
  managers.

The stub keeps its data in SQLite, in your temp directory (set LEGACY_DB to
choose the file), seeded from db/schema.sql and db/seed.sql. Production ran
the same schema on MySQL. Restore the seed before you record or replay
parity cases:

```bash
curl -X POST http://localhost:8081/api/reset.php
```

Parity suite (also needs the emulators): `npm run test:parity`.
