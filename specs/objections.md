# Objection to a periodic assessment (#36)

Issue: #36 · Branch: `feat/36-objections` · Status: implemented on this branch

## Goal

After the reviewed person acknowledges the assessment they have 7 days to file an objection with the
Director General; the Director General decides within 14 days (art. 83 of the Civil Service Act).
This feature adds the filing, the decision and the outcomes that the wizard (#12) leaves open.

## Scope

- In: `convex/objections/**` (limits, rules, queries, mutations, tests), `src/features/objections/**`
  (director page, shared panel), this spec, the generated API typings for the new `convex/objections` files.
- Small hooks in finished features: the panel in `src/features/me/ReviewDetail.tsx` (employee files),
  and in `src/features/review/ReviewWizard.tsx` (evaluator sees the state; stage `objection` highlights
  step 6).
- Out: `convex/*/tables.ts` and `convex/schema.ts` (the contract already has `reviews.objection`,
  `round`, stage `objection`), the router, the layout, a court-case workflow (only the information),
  editing the assessment (done in the existing wizard after the decision).

## Decisions

- D1: the acknowledgement date is the day of the employee's assessment signature
  (`signatures` with `role: "employee"`, scope `assessment`; a deemed acknowledgement is stored the same
  way). The filing deadline is `computeDeadlines(...).objection` (7 days, next working day), so the term
  comes from `convex/rules`, not from this module.
- D2: only the reviewed person (demo role `employee`, own review) files, only in stage `objection_window`
  and not after the deadline. Filing moves the review to stage `objection`. The text is required and
  limited by `MAX_OBJECTION_LENGTH`. The addressee is the Director General's name.
- D3: only the demo role `director` decides, only in stage `objection`. A decision after the 14-day term
  is allowed and marked as late (the term is an instruction for the director, not a bar).
- D4: outcomes follow `contract-domain.md` D7. `rejected`: the review closes (`endReason: "completed"`)
  and the employee sees that a labour court appeal is possible within 14 days. `amend`: the review goes
  back to `writing`; `redo`: back to `evaluation` with `round + 1`. Both upheld outcomes clear the
  assessment signatures, so the assessment is signed again; part I signatures stay.
- D5: a new objection is possible only after `redo` (the assessment was drawn up again). After `amend`
  or `rejected` the single stored `objection` stands. `reviews.objection` holds one objection, so refiling
  after `redo` replaces it; the earlier one stays in the audit log (decision and times, no text).
- D6: the existing `reviews.mutations.close` stays as it is: it closes a review in `objection_window`
  without waiting 7 days, which the demo needs. Real deadline expiry is not enforced there.
- D7: read access follows `canViewReview`. The director list shows only reviews in stage `objection` (and
  nothing for other roles except HR and admin, who read only).
- D8: the court appeal period (14 days) is a constant in `convex/objections/rules.ts`, shown as plain
  text without a legal citation, until the rules pack (#10) carries it.

## Tasks

1. `rules.ts`: acknowledgement date, filing window, decision deadline, who may file and decide (pure, tested).
2. `queries.ts`: `forReview` (state, permissions, dates, appeal note), `listForDirector`.
3. `mutations.ts`: `file`, `decide` with audit entries and a mail notice to the director.
4. Frontend: `ObjectionPanel` (employee form, evaluator/HR state, director decision), page `/sprzeciwy`.
5. Tests for each; regenerate `convex/_generated`; reviewer subagent; `npm run verify`; PR.

## Acceptance criteria

- [ ] An objection can be filed only within 7 days of the acknowledgement (test, fake date).
- [ ] The director's objection list shows only reviews with an objection (test). The director keeps the read access to all reviews that `canViewReview` already gives (D7).
- [ ] After `redo` the new round can be objected to again (test).
- [ ] After `rejected` the employee sees the labour court appeal term (test and UI).
- [ ] Wrong role, wrong stage, empty text and a second objection after `amend` are rejected (tests).
- [ ] Tests pass and `npm run verify` is green.
