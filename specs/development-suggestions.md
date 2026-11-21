# Development suggestions from the growth catalog (#59)

Issue: #59 · Branch: `feat/59-growth-suggestions` · Status: IN PROGRESS

## Goal

For a development area (one or more criteria of the review) suggest forms of development from the catalog of
#57: first by rules, and, when there are many candidates, ranked by AI that may only choose from that list.
The AI never invents a training.

## Scope

- In: `convex/growth/suggest*.ts`, `convex/growth/rankOptions.ts` and their tests,
  `src/features/growth/components/DevelopmentSuggestions.tsx` and its test, this spec, the generated API typings.
- Out: wiring the component into the IPRZ (#15) and HR partner (#16) modules (a separate small PR after they merge),
  `convex/ai/**`, pseudonymisation of names (#28): the model gets catalog entries and criterion names, no person.

## Decisions

- D1: `growth.suggest.suggestForArea({ criterionIds, level? })` is a query open to every role (the catalog holds no
  personal data). It returns active entries that share at least one criterion with the area, each with the matched
  criteria and a Polish reason ("Pasuje do kryterium: Komunikacja"). Order: more matched criteria first, then an
  entry of the requested `level`, then title. `level` ranks, it does not filter, so a catalog with no entry at that
  level still answers.
- D2: `growth.rankOptions.rankOptions({ criterionIds, level? })` is an action. With at most `RANK_THRESHOLD` (5)
  candidates it returns the rule result and does not call a model. With more it asks the model to pick up to
  `MAX_RANKED` (5) ids with a short rationale each.
- D3: the model answer is validated with Zod and against the candidate list. One id outside the list, or a repeated
  id, rejects the whole answer, because a model that invents an entry is not trusted for the others.
- D4: the rule result is the fallback. On an AI error, a rejected answer or the `mock` provider the action returns
  the rule result with `ranking: "rules"` and a note "Bez rankingu AI". The UI stays usable.
- D5: `DevelopmentSuggestions` shows the rule result at once (query) and offers "Uporządkuj z AI" only when there are
  more than `RANK_THRESHOLD` candidates, so a model is never called without a click. Each entry shows the match reason
  and, for `demo` entries, the label "Dane demonstracyjne".
- D6: an empty catalog (no entry for the area) shows "Brak wpisów w katalogu dla tego obszaru" and a general tip, never
  an invented entry.

## Acceptance criteria

- [ ] `suggestForArea` returns only active entries with a matching criterion (criterion with entries, without, several).
- [ ] `rankOptions` rejects ids not in the input list (a `fetch` stub with invented ids) and works in `mock` mode
      without network.
- [ ] An AI error returns the rule result labelled "bez rankingu AI" and the UI stays usable (tested).
- [ ] `DevelopmentSuggestions` shows the match reason and the "demo data" label (component test).
- [ ] A comment on #15 and #16 documents the interface. Their files are not changed in this PR.
- [ ] `npm run verify` passes.
