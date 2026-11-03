# Port one AngularJS filter

Each run gets one filter from migration/filters.txt, such as
legacy/web/app/filters/shortDate.filter.js. The run uses `--bare`, so it
has no CLAUDE.md and no rules files: everything it needs is here.

1. Read .claude/rules/migration.md and follow it. legacy/ is the spec and
   is read-only.
2. Read the filter. List every input it handles, including null, empty
   and odd values, and what it returns for each. Keep its quirks.
3. Write apps/web/src/lib/format/<name>.ts, where <name> is the filter's
   name (shortDate.filter.js -> shortDate.ts). Export one typed function
   with the same name. Plain TypeScript: no AngularJS, no dependencies, no
   new Date() on legacy dates. If the filter injects another filter (money
   uses currencySymbol), import the ported function from its file; if that
   file doesn't exist yet, stop and reply FAIL.
4. Write apps/web/src/lib/format/<name>.test.ts: a Vitest test.each table
   of inputs and the outputs the legacy filter returns for them, with at
   least one row per branch of the filter.
5. Run npm test. If a row fails, fix the port, never the expected legacy
   output. Mark anything you are unsure about with // TODO(port): <reason>.
6. When npm test passes, git add the two files and
   git commit -m "port(filters): <name>". Edit no other file.

Reply with OK, or FAIL and one line saying why.
