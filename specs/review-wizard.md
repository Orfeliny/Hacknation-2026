# Review wizard (periodic assessment, step by step)

Issue: #12 · Branch: `feat/12-review-wizard` · Depends on #9 (contract), #10 (rules), #11 (employees)

## Goal

Walk one periodic review from start to both signatures in the browser, on demo data, with no formal
gaps: the wizard blocks every step the rules do not allow and says in Polish what is missing.

## Scope

- In: `convex/reviews/{queries,mutations,stages,access}.ts` + tests; `src/features/review/**`
  (route `/oceny`, selected review in `?ocena=<id>`).
- Out: `convex/reviews/tables.ts` and other shared files; AI modules #14/#15 (only links to
  `/rozmowy?ocena=<id>` and `/projekt?ocena=<id>`, no imports); print #18 (plain link to
  `/druk?ocena=<id>`); objection handling (#36), e-signature (#38), audit log (#39).

## Decisions

- Stages follow `ReviewStage`: `opening` (part I: opening conversation date, expectations per
  criterion, additional criteria, both part-one signatures) → `observation` (evaluation period) →
  `evaluation` (evaluation conversation date) → `writing` (ratings, justification, IPRZ
  conclusions, optional promotion request) → `signing` (evaluator, then employee, signs the
  assessment) → `objection_window` (#36 takes over) → `closed`.
- Advancing runs `validateReview` on the target stage plus step fields. `overdue` is a warning, not
  a blocker. Entering `signing` ignores `missing_assessment_evaluator` (that signature is given
  there); the employee's assessment signature moves the review to `objection_window` once clean.
- Only the review's evaluator edits and advances. The employee (demo role `employee`, own review)
  reads and signs. HR, director and admin read only.
- A staffing situation of kind `evaluator_change` needs the departing evaluator's opinion
  (`note`) before the review leaves `observation` (interviews W2 21:44); rule gaps such as
  `requires_hr_decision` and the absence extension come from `validateReview`.
- Dates are checked with `assertIsoDate`; ratings use partial-scale ids; average, result and
  level are recomputed with `computeAssessment` on every save.

## Tasks

1. `stages.ts`: step gaps, blocking filter, next stage (pure, tested).
2. `queries.ts`: `list`, `get` (review, people, criteria, scale, gaps, permissions), `candidates`.
3. `mutations.ts`: `start`, `save` (staffing situations only in `observation`; seeded ones cannot be removed or retyped, only annotated or extended), `sign`, `advance`, `close` (interim: allowed right after both signatures; #36 owns the objection window).
4. Frontend: list/start page, wizard with step forms, gap list, AI links, print link.
5. Tests for each; regenerate `convex/_generated`; reviewer subagent; `npm run verify`; PR.

## Acceptance criteria

- [ ] A full review runs start → both part-one signatures → period → evaluation date → ratings →
      both assessment signatures, ending in `objection_window` (convex-test).
- [ ] `advance` from any step with formal gaps throws a Polish list of the gaps and leaves the stage.
- [ ] A fourth additional criterion is rejected by `save` and disabled in the UI.
- [ ] The employee role can read their own review and sign, but `save` and `advance` throw; another
      employee cannot read it.
- [ ] An `evaluator_change` situation without the departing evaluator's opinion blocks leaving
      `observation`; with it, the review advances.
- [ ] A negative result without justification and missing IPRZ conclusions block `signing`.
- [ ] The wizard shows the gap list, the AI-module links and the print link.
- [ ] `npm run codegen:check` and `npm run verify` pass (e2e only where a browser exists).
