# Kompas: competency model and suggested level (#19)

Issue: #19 · Branch: `feat/19-competency-model` · Status: part 1 of 2 implemented (backend); the
screen in `src/features/competencies/` follows in part 2 against the UI contract below.

## Goal

The evaluator rates a competency through observable behaviour: for each behavioural indicator they
pick the description closest to what they saw, the system shows a suggested level with the full
calculation, and the evaluator chooses the final level (Kompas, sections 3 and 6). AI never
computes a level.

## Scope

- `convex/competencies/modelData.ts`: the model as plain data (competency → indicators → behaviour
  description per level, `modelVersion`, `source`). `model.ts` validates it with Zod on load.
- `convex/competencies/suggest.ts`: pure, deterministic suggestion with an explanation.
- Queries `model`, `get`, `listForEmployee`, `forReview`, `observations`; mutations `open`,
  `saveChoices`, `setFinal`. Rows live in `competencyAssessments` (table from #9, unchanged).
- An assessment belongs to a periodic review (`reviewId`), a first review (`firstReviewId`, the
  second Kompas path) or neither (ongoing feedback).
- Out: the UI (part 2), copying a final level into `reviews.ratings` (the review module decides
  when to use it), a criterion list for the first review (the regulation sets none, so any model
  competency may be assessed there).

## Decisions

- D1, demo data: the organizer's competency model is not in the repo. The 14 criteria and their
  indicators are quoted from annex 1 of the 2016 regulation (a test keeps them equal to
  `RULES_2016.catalog`); the per-level behaviour descriptions are written by the team and marked
  `source: "demo"`. The API returns `isDemo`, and the UI must label them "dane demonstracyjne".
  They are never presented as official.
- D2, replaceable data: replacing `MODEL_DATA` (descriptions, indicators, levels, the minimum share
  or the anchor level) needs no code change; the Zod schema rejects a model with a missing level
  description, unknown anchor, duplicate ids or a criterion outside annex 1. Tested in
  `model.test.ts` and, through the API, in `replace.test.ts`. Rows saved under an older
  `modelVersion` are shown with `modelOutdated: true`; choices the new model does not know are
  ignored, and `setFinal` asks to save the choices again first.
- D3, levels: the demo model uses the five levels of the § 11 partial scale with the same ids
  (`1`, `3`, `5`, `7`, `9`), so a final level is directly a `reviews.ratings[].levelId`.
- D4, suggestion rule (`median`): order the levels chosen for observed indicators by their position
  in the model (not by id) and take the median.
  - No suggestion unless at least `max(1, ceil(minObservedShare × indicators))` indicators are
    observed (demo: 50%, so 1 of 2, 2 of 4, 3 of 6). The explanation names the shortfall.
  - Even count: equal middle levels give that level; when the midpoint of the two middle levels
    is a level, that level (`3`,`7` → `5`); when it falls between two levels (`3`,`5` or `1`,`7`)
    it is a tie, resolved towards the anchor level `5` ("na poziomie oczekiwań"), the starting
    point the KPRM guide sets for a partial rating (poradnik 6.2.5.1). The two candidates are
    adjacent, so they are never equally far from the anchor.
  - The result lists per-indicator levels, the ordered values, the middle values, the rule that
    fired and Polish steps; a spread of two or more levels adds a note.
- D5, final level: `setFinal` recomputes the suggestion from the saved choices (a client cannot
  pass its own). A final level other than the suggestion, or one chosen when there is no
  suggestion, needs a justification (1-1000 characters after trimming, Zod, `limits.ts`). Equal
  to the suggestion: no justification is stored. Saving different choices withdraws the final
  level, so the decision is always made on the current basis.
- D6, access: within a review or first review its evaluator writes; outside one the direct
  supervisor. Writes stop once the review leaves the editable stages (periodic: `opening` to
  `writing`; first review: `report`, `assessment`). HR reads drafts and explanations but never
  writes. The employee reads only their own final levels (no choices, suggestion or
  justification), and within a review only after it left the editable stages, i.e. when the level
  is on the sheet they sign. Nobody reads the working material of their own assessment, whatever
  demo role they hold. Other roles (director, admin) get nothing.
- D7, observations (D11): the preview shows notes on the competency's criterion from the review
  period (first review: from `startDate`) that `canReadObservation` allows (author, HR, the next
  evaluator after consent; never the employee, never notes about oneself). Notes are tagged per
  criterion, not per indicator, so the preview is per competency; `wellbeing` notes are about
  workload, not behaviour, and are left out.
- D8: every write calls `logAudit` (`competencyAssessment`, ids and level ids only). Refusals are
  `ConvexError`s whose data is a Polish sentence, as in `reviews` and `firstReview`.

## UI contract

All functions are `api.competencies.*`. Every call except `model` takes `actor` (pass through
`useActorQuery` / `useActorMutation`). Errors: `ConvexError` with a Polish string in `error.data`.

Shared shape `AssessmentView` (returned by `get`, `listForEmployee`, `forReview`):
`_id, employeeId, reviewId | null, firstReviewId | null, competencyId, competencyName,
criterionId | null, modelVersion, modelOutdated, status: "draft" | "final", finalLevel | null,
finalLabel | null, updatedAt, assessorId | null, indicatorChoices: {indicatorId, levelId?}[],
suggestedLevel | null, suggestedLabel | null, deviationJustification | null, suggestion |
null`. For the employee, `assessorId`, `suggestion`, `suggested*` and `deviationJustification`
are null and `indicatorChoices` is empty.

`Suggestion`: `levelId | null, rule: "insufficient_observations" | "median_odd" |
"median_even_equal" | "median_even_midpoint" | "median_even_tie_to_anchor", observed, total,
required, indicators: {indicatorId, levelId | null}[], ordered: string[], middle: string[],
steps: string[] (Polish, show as the calculation), notes: string[] (Polish warnings)`.

| Function                  | Args                                                                | Returns                                                                                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `queries.model`           | `{}`                                                                | `{modelVersion, name, source, isDemo, sourceNote, levels: {id, label, description?}[] (lowest first), rule: string[] (Polish rule description), competencies: {id, criterionId?, name, indicators: {id, text, levels: Record<levelId, description>}[]}[]}` |
| `queries.get`             | `{assessmentId}`                                                    | `null` or `{model: <model without competencies>, competency, assessment: AssessmentView, audience: "assessor" \| "hr" \| "employee", can: {edit}}`                                                                                                         |
| `queries.listForEmployee` | `{employeeId, reviewId?, firstReviewId?}`                           | `{audience, isDemo, can: {edit}, finalsVisible, assessments: AssessmentView[]}`; throws for other roles                                                                                                                                                    |
| `queries.forReview`       | `{reviewId}`                                                        | `null` or `{reviewId, modelVersion, isDemo, audience, finalsVisible, criteria: {criterionId, competencyId \| null, assessment: AssessmentView \| null}[]}` (criteria of the sheet in order)                                                                |
| `queries.observations`    | `{assessmentId}`                                                    | `null` or `{criterionId, from, to, items: {_id, date, text, sentiment}[] (newest first), untaggedCount}`; throws for the employee                                                                                                                          |
| `mutations.open`          | `{employeeId, competencyId, reviewId?, firstReviewId?}`             | assessment id (idempotent: the existing one when already started)                                                                                                                                                                                          |
| `mutations.saveChoices`   | `{assessmentId, choices: {indicatorId, levelId?}[]}` (the full set) | `{suggestion: Suggestion, finalWithdrawn: boolean}`                                                                                                                                                                                                        |
| `mutations.setFinal`      | `{assessmentId, finalLevel, deviationJustification?}`               | `{finalLevel, suggestedLevel \| null, deviation: boolean}`                                                                                                                                                                                                 |

The form can mirror the justification rule with `justificationRequired(suggestedLevel,
finalLevel)` from `suggest.ts` and `justificationSchema` / `JUSTIFICATION_MAX_LENGTH` from
`limits.ts` (pure modules, no server imports).

## Acceptance criteria (issue #19)

- [x] Competency model loaded as data; changing a description needs no code change (D1, D2).
- [ ] After choosing behaviours the suggested level and the calculation are visible: backend
      returns both (`get`, `saveChoices`; D4); the screen is part 2.
- [x] The evaluator chooses the final level; a deviation needs a justification (D5, enforced in
      the backend).
- [x] The result is stored in `competencyAssessments` and readable by the review module
      (`forReview`; D3).
- [ ] Algorithm tests incl. tie and no answers (done); `npm run verify` green: CI runs it, e2e
      was not run locally.
