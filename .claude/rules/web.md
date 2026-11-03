---
paths:
  - "apps/web/src/**/*.tsx"
---

# UI rules

- The UI explains rules; the server enforces them. Import rules and limits
  from @acme/shared; never retype a number such as 7500 or 20.
- Every server error code the screen can receive needs words on screen.
- Copy the loading, empty and error states of screens/expense-list/.
