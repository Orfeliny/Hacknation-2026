# Advice for employees: audience field and starter articles (#103)

Issue: #103 · Status: implemented in three stacked PRs

## Goal

Advice (#58) is written for supervisors. An employee gets short articles of their own, and the list can
be filtered by audience.

## Scope and PR split (hot-files rule)

1. `chore/103-audience-constants`: `ADVICE_AUDIENCES`, labels and the validator in `convex/growth/constants.ts`
   (not a hot file, so it goes first on its own).
2. `chore/103-advice-audience-contract`: optional `audience` in `convex/growth/tables.ts` and in
   `listAdviceContract` (hot files only, plus the test of the table).
3. `feat/103-advice-employee`: the filter in `listAdvice`, 4 articles for employees in `adviceSeedData.ts`,
   tests, this spec.

Out: any view (the advice screen and the "Blog rozwoju" page), the `audience` field in the HR form of #60
(#60 should take it up), any npm dependency.

## Decisions

- D1: `audience` is `przelozony | pracownik | wszyscy`, optional. A stored article without it counts as
  `przelozony`, so the change is additive and existing rows need no migration.
- D2: `listAdvice({ audience })` returns the articles written for that audience plus those for `wszyscy`.
  Without `audience` it returns everything, so current callers keep working.
- D3: the response shape is unchanged (no `audience` in the list item); views that need to label an
  article can ask for it in a later contract change.
- D4: the four articles are `material_kprm`, each with a `sourceRef`, at most 400 words, and every statement
  comes from `poradnik-oceny-okresowe.md` (pkt 6.2.1, 6.2.4, 6.2.5.x, 7, 8) and art. 83 of the act.
  They are: how to prepare for the evaluation interview, how to read your evaluation, how to plan your own
  development (IPRZ), objection to the evaluation.

## Acceptance criteria

- [x] `codegen` and `codegen:check` pass; old rows without `audience` count as `przelozony` (test).
- [x] `listAdvice({ audience })` returns only that audience's articles; `wszyscy` is in both (test).
- [x] The seed has at least 4 employee articles within 400 words, each with a source (test).
- [x] Search ignores case and diacritics for the new articles (test).
- [x] No new npm dependency; `npm run verify` is green.
