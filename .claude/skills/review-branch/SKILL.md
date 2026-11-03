---
name: review-branch
description: Review the current branch against main with Acme's pre-merge checklist. Read-only.
disable-model-invocation: true
---
# Review this branch

Base: $ARGUMENTS (default: main)

Run this in a fresh session, never the one that wrote the code.

1. Run `git diff --stat <base>...HEAD`, then read the diff. Don't edit anything.
2. Check it against CLAUDE.md and docs/pre-merge-checklist.md.
3. For each finding give the file, line, evidence and severity:
   blocker, should-fix or nit.
4. List every test whose expected value changed and explain why.
5. List every catch block in the diff and what it returns.
6. If firestore.rules, apps/api/src/middleware/ or
   packages/shared/src/rules/money.ts changed, say which specialist
   must review it.
7. Rank findings by severity. Don't invent issues to fill the list.
