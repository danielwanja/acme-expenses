# Slice: <short name>

## Outcome
<One sentence from the user's point of view.>

## Acceptance criteria
- Given <state>, when <action>, then <result>.
- Edge cases: limits, empty input, wrong role, errors.

## Layers touched
- [ ] Data   - [ ] Access rules   - [ ] Shared logic (schemas, rules)
- [ ] API    - [ ] Client and UI  - [ ] Contract and docs

## Changes per layer
Data, rules, API (method, path, shapes, errors, retries), or "None".

## UI states
Empty, loading, success, partial success, error, not allowed.

## Tests
Unit (boundaries), API (each error), access rules (allowed and
denied), end to end (the main flow).

## Out of scope
<What this slice won't do, even with time to spare.>
