# AI draft of the review text and IPRZ conclusions (#15)

Status: IMPLEMENTED, see the PR for #15 · Issue: #15 · Branch: `feat/15-ai-drafting`

## Goal

Help the evaluator write the hardest part of a review: the justification for each criterion, strengths,
areas to develop, development actions (IPRZ) and tips for constructive feedback. The assistant orders the
evaluator's own observations and points out what the regulation asks for; it never picks a rating and
never writes anything into the sheet by itself.

## Scope

- In: a draft generated from the ratings the evaluator already chose plus their readable observations;
  every fragment links to the observations behind it or says there is none; deterministic checks for
  rating vs observation mismatches; accept, edit, reject and add by hand; copy to the clipboard; the
  page `/projekt?ocena=<id>` (the review wizard already links there).
- Out: choosing or proposing ratings; writing into the sheet (the wizard, #12, owns the sheet);
  recommending real trainings (the development catalogue, #56-#59); conversation preparation (#14).

## Assumptions

1. **Only the review's evaluator** reads and changes its drafts: they are working notes derived from
   observations, and observations are not shared with the employee or the director (D11). Anyone else
   gets a refusal.
2. **Ratings first.** The draft is built only for criteria that already have a rating; with no ratings
   the action refuses with a clear message. Ratings reach the model as facts to justify, never as a
   question. The system prompt forbids naming a level; the shared guardrails (#28) block any answer
   that does.
3. **Observations** are the ones the evaluator may read (their own, or handed over to them, via
   `canReadObservation`), dated from `periodStart` when it is set. At most 40, newest first, each cut to
   400 characters, labelled `O1`, `O2`, ... in the prompt. The model cites labels; the server maps them
   back to observation ids and drops labels it did not issue. A fragment with no valid label is stored
   with `noEvidence: true` and shown as "brak podstawy w obserwacjach".
4. **Names.** The employee and the evaluator are pseudonymised with `createPseudonymizer` before the call
   and restored in the result. Names of other people typed inside an observation are not covered (known
   limit; the evaluator reviews every fragment anyway).
5. **Inconsistencies are rules, not AI** (`convex/drafting/rules.ts`), so they are explainable and
   testable. For a rated criterion, looking only at observations tagged with that criterion: a high
   rating (7 or 9) while all of them are `development` ones; a low rating (1 or 3) while all of them
   are `positive` ones; a rating with no tagged observation at all ("brak obserwacji do kryterium").
   Observations without a criterion tag cannot be attributed and are not counted.
6. **Statuses.** Fresh AI fragments are `proposed`. The evaluator marks them `accepted`, edits them
   (`edited`) or rejects them (`rejected`). Generating again replaces only the `proposed` fragments and
   keeps everything the evaluator already decided. Fragments added by hand are stored as `accepted`, so
   a failing model never blocks writing.
7. **Development actions are linked to an area** (`relatedDraftId`): an action whose area is missing or
   unknown is dropped.
8. Refusals are `ConvexError` with a code (Convex hides the text of a plain `Error` from the client in
   production). Provider errors, including the `guardrail` code, come back as typed results.

## Tasks

1. Rules (files: `convex/drafting/rules.ts`, `rules.test.ts`): `findInconsistencies`.
2. Backend (files: `convex/drafting/{access,errors,queries,mutations}.ts`, tests, `convex/_generated/**`):
   `listForReview`, internal `draftContext`, `setStatus`, `edit`, `addManual`, internal `replaceProposed`.
3. AI (files: `convex/drafting/{prompts,actions}.ts`, tests): `generate` with `mockFixture`.
4. Page (files: `src/features/drafting/**`): sections, evidence, accept/edit/reject, manual add, copy.
5. Review by a separate agent, `npm run verify`, PR.

## Acceptance criteria

- [x] A draft is created only when the evaluator has chosen ratings; with none the action refuses and
      the model is not called; the model never receives a request to pick a rating (test on a stubbed
      `fetch`).
- [x] Every generated fragment carries at least one valid observation link or `noEvidence: true`; a label
      the model invented is dropped (test).
- [x] At least one rating vs observation mismatch is detected, each of the three rules is tested, and the
      result is stored on the fragment (`inconsistency`).
- [x] Development actions are linked to an area through `relatedDraftId`; an action with an unknown area
      is dropped (test).
- [x] Works in `mock` mode; a provider error returns a typed result and manual editing still works
      (tests).
- [x] Only the evaluator reads or changes drafts; the employee, HR, director and another supervisor are
      refused (convex-test).
- [x] The prompt contains no employee or evaluator name; the names return in the stored text (stubbed
      `fetch`).
- [x] Regenerating keeps accepted, edited and rejected fragments and replaces only proposed ones (test).
- [x] The page shows that the draft is a proposal and never a rating, shows the evidence and the
      inconsistency of each fragment, offers accept, edit, reject, add by hand and copy, and shows a notice
      offline (component tests).
- [x] No change to `package.json` and no hot file in the diff.
- [ ] `npm run verify` passes. `test:e2e` does not run locally (no Playwright browser); CI runs it.

Evidence: `npx vitest run --project frontend --project backend src/features/drafting convex/drafting`; checked live against a local backend with demo data (draft generated in mock mode, two mismatches flagged).
