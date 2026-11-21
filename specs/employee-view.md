# Employee view: my assessment and development plan (#30)

Issue: #30 · Branch: `feat/30-employee-view` · Status: IN PROGRESS

## Goal

The reviewed person sees their own review cycles, reads the assessment and development plan once it is
handed over, signs through the existing signing mutation, and keeps private self-notes. Desktop only.

## Scope

- In: `convex/me/**` (access, limits, queries, mutations, tests), `src/features/me/**`, this spec, and the
  generated API typings for the new `convex/me` files.
- Out: a second signing implementation (the page calls `api.reviews.mutations.sign`), objection filing,
  changes to `convex/me/tables.ts` (`selfNotes` already exists), the router, the layout.

## Decisions

- D1: `me.queries.list` and `me.queries.get` serve the role `employee` only and only that person's own
  reviews. Another role, or someone else's review, throws a `ConvexError` (the page shows it).
- D2: what the employee sees depends on the stage. Expectations from `opening`; ratings, overall result,
  justification and the development plan from `signing` onward (the evaluator's drafts stay hidden while the
  assessment is being written, art. 80-81 service-law sequence). This is an assumption to confirm with the team.
- D3: supervisor observations (`observations`) and HR partner signals (`hrSignals`) are never returned by
  `me.*` (tested).
- D4: self-notes (D11): readable by the employee and HR only. `me.queries.selfNotes` throws for supervisor,
  director and admin. Writing is for the employee only, max length in `convex/me/limits.ts`.
- D5: signing buttons come from the same rule as `reviews.queries.get` (`can.signPartOne`,
  `can.signAssessment`), read through that query, so no signing rule is copied.
- D6: route `/moja-ocena`, menu label "Moja ocena". Below 1024 px the page shows "Otwórz na komputerze".

## Acceptance criteria

- [ ] The employee role sees only own data; reading someone else's review returns an error (query test).
- [ ] Supervisor observations and HR partner signals are not visible (test).
- [ ] Signing calls the mutation from #12; there is no second implementation.
- [ ] The layout works from 1024 px; narrower shows an "open on a computer" message.
- [ ] The supervisor role cannot read selfNotes, HR can (query test).
- [ ] Tests pass and `npm run verify` is green.
