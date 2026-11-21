# First review in the civil service (#21)

Issue: #21 · Branch: `feat/21-first-review` · Status: IN PROGRESS

## Goal

A separate path for the first review of a new civil service employee (art. 37-38 of the Civil Service
Act), next to the periodic review. Visible only in the `kompas` profile (#29), per the KPRM jurors'
note on the issue. The periodic review wizard (`src/features/review`, `convex/reviews`) is not touched.

## Decisions

- D1. Rules are data: `convex/firstReview/rules.ts` holds the window (earliest = 8 months after the
  employment starts, latest = 1 month before the contract ends), the required elements and the effect
  of each result, each with its legal basis.
- D2. The 8-month rule is a warning, not a block, so the path stays completable on demo data (the demo
  employee started on 2026-09-01). The earliest date is shown with its basis.
- D3. Stages: `report` (the employee's report on the tasks, art. 38 ust. 2 pkt 3) → `assessment`
  (evaluator, in agreement with the head of the unit, art. 38 ust. 2) → `signing` → `closed`.
- D4. Moving on from `report` and `assessment` needs an explicit confirmation of the required element
  (report received; agreed with the unit head). The stage history records it.
- D5. No change to `convex/firstReview/tables.ts` (hot file). The report text, the exam result and the
  justification have nowhere to be stored yet; a follow-up contract PR can add optional fields.
- D6. The path starts for an employee with `isNewToCivilService`; the evaluator is the direct
  supervisor. HR and admin can start it too.
- D7. Signing: the evaluator first, then the employee. The employee's signature closes the review.

## Acceptance criteria

- [ ] The first review can be completed from start to signature on demo data.
- [ ] Deadlines and required elements come from the rules data, with the legal basis shown.
- [ ] The periodic review wizard code is unchanged.
- [ ] Rule and wizard tests pass and `npm run verify` is green.
