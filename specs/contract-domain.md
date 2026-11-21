# Contract: domain data model and shared files (Asystent + Kompas)

Issue: #9 · Branch: `chore/9-contract-domain` · Status: draft, spec review round 2

## Goal

Land every shared file that wave 1 (#10-#21, #26-#30) needs, in one contract PR, so module PRs
only add files in their own directories: tables, shared validators, rule types, a demo actor,
a per-module AI mock fixture and a demo role switcher.

## Scope

- In: 11 tables in `convex/<module>/tables.ts` wired into `convex/schema.ts`; shared validators
  `convex/lib/validators.ts`; types-only `convex/rules/types.ts` (made hot); demo actor
  `convex/lib/demoRole.ts` with `resolveActor`; `mockFixture` in the AI layer; `src/lib/demoRole.ts`
  plus a switcher in `src/app/Layout.tsx`; contract tests; regenerated `convex/_generated`; notes in
  `docs/ai-providers.md` and `docs/architecture.md`.
- Out: any query, mutation, action, seed or page of a module; rule data (#10); competency model
  data (#19); guardrails (#28); challenge profile (#29); real authentication; new npm dependencies.

## Decisions

- D1 (Q1, user): backend demo actor in `convex/lib/demoRole.ts`, extended with `resolveActor`.
- D2 (Q2, user after review finding 3): employee self-notes get their own `selfNotes` table in
  `convex/me/tables.ts`; `observations` stays the evaluator's private journal.
- D3: `reviews.developmentPlan` (structured IPRZ conclusions) is the source of truth, written by
  #12. `drafts` hold only AI suggestions that #15 lets the evaluator copy into it.

## Assumptions

1. Table owners are the module directories from the wave-1 issues: `employees/` #11, `reviews/` #12,
   `observations/` #13, `conversations/` #14, `drafting/` (drafts) #15, `hrPartner/` (hrSignals)
   #16, `hrDashboard/` (reminders) #17, `competencies/` (competencyAssessments) #19, `knowledge/`
   (knowledgeChunks) #20, `firstReview/` #21, `me/` (selfNotes) #30.
2. Required means a row is meaningless without it. Everything else is `v.optional`, because after
   merge the schema only grows (new optional fields, new union literals).
3. Calendar dates are `YYYY-MM-DD` strings (`isoDate`), so deadline math has no time-zone drift.
   Event timestamps are epoch ms numbers.
4. `PositionKind` has three values: wyższe stanowisko, kierujące zespołem, pozostałe. #10 maps
   them to sheets A/B/C with a legal source. The `reviews` fields were not compared field by field
   with the official sheet template (organizer's Discord materials). Missing fields are added later
   as optional ones.
5. Consumers of `ReviewStage` and other unions must have a default branch, because new literals
   may be added.
6. Level ids (rating, competency) are strings defined by rule/model data (#10, #19), not unions.
7. `useDemoRole()` is a `useSyncExternalStore` store over `localStorage` (reads and writes inside
   try/catch, falls back to `supervisor`). No change to `Providers.tsx`.

## Contract

Shared validators live in `convex/lib/validators.ts`. Tables import them, and so does `resolveActor`.
`src/` imports only `import type { DemoRole }`.

```ts
isoDate = v.string(); // YYYY-MM-DD
sheetType = v.union(v.literal("A"), v.literal("B"), v.literal("C"));
positionKind = v.union(
  v.literal("senior"),
  v.literal("managerial"),
  v.literal("non_managerial"),
);
reviewStage = v.union(
  setup,
  opening,
  observation,
  evaluation,
  writing,
  signing,
  objection,
  closed,
); // literals
demoRole = v.union(
  v.literal("supervisor"),
  v.literal("employee"),
  v.literal("hr"),
  v.literal("director"),
);
staffingSituation = v.object({
  kind: v.union(evaluator_change, duties_change, long_absence),
  from: isoDate,
  to: v.optional(isoDate),
  previousEvaluatorId: v.optional(v.id("employees")),
  note: v.optional(v.string()),
});
signature = v.object({
  role: v.union(v.literal("evaluator"), v.literal("employee")),
  signerId: v.id("employees"),
  signedAt: v.number(),
  remarks: v.optional(v.string()),
});
stageEntry = v.object({ stage: v.string(), at: v.number() });
```

`convex/rules/types.ts` holds plain types only: `SheetType`, `PositionKind`, `ReviewStage`,
`StaffingSituation` (equal to `Infer<>` of the validators above), plus `Criterion { id, name,
description, kind: "mandatory" | "additional", sheets: SheetType[], source }`, `RatingLevel { id,
label, value }` and `RatingScale { id, levels: RatingLevel[] }`.

`DemoRole` is exported from `convex/lib/validators.ts` as `Infer<typeof demoRole>`.

`convex/lib/demoRole.ts`: `demoActor = v.object({ role: demoRole })`. It also has
`resolveActor(ctx: { db: DatabaseReader }, actor): Promise<{ role, employee: Doc<"employees"> | null }>`,
so both queries and mutations can call it. It looks the role up through `by_demoPersona` with
`.unique()`, returns `employee: null` when no persona is seeded, and throws when two employees
share a persona. Module queries and mutations take `actor: demoActor` and call it. Actions have
no `db`, so they resolve the actor through a query. This is a demo stand-in for real auth.

Tables. Fields marked `?` are `v.optional`. `id(x)` is `v.id("x")`. Each `tables.ts` exports
`<directory>Tables`, for example `draftingTables`, `hrDashboardTables` and `meTables`.

| Table (file)                              | Required                                                                                                                                                                                               | Optional                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Indexes                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `employees` (`employees/`)                | firstName, lastName, position, unit: string; createdAt: number                                                                                                                                         | positionKind; corpsRole: `official`\|`employee`; supervisorId: id(employees); isNewToCivilService: boolean; demoPersona: demoRole; seedKey: string; staffingEvents: staffingSituation[]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | by_supervisor, by_demoPersona, by_seedKey                                                          |
| `reviews` (`reviews/`)                    | employeeId, evaluatorId: id(employees); stage: reviewStage; createdAt                                                                                                                                  | sheet; rulesVersion: string; periodStart, periodEnd, openingConversationDate, evaluationConversationDate: isoDate; additionalCriteria: string[]; expectations: {criterionId, text}[]; ratings: {criterionId, levelId, justification?}[]; overallResult: `positive`\|`negative`; overallLevelId: string; objection: {filedAt: number, text, decision?: `upheld`\|`rejected`, decidedAt?: number}; developmentPlan: {strengths?: string[], areas?: {id, criterionId?, text}[], actions?: {areaId?, kind?: `training`\|`mentoring`\|`task`\|`other`, text}[]}; promotionRequest: {requested: boolean, justification?}; signatures: signature[]; staffingSituations: staffingSituation[]; stageHistory: stageEntry[]; closedAt, updatedAt: number | by_employee, by_evaluator, by_stage                                                                |
| `observations` (`observations/`)          | employeeId, authorId: id(employees); date: isoDate; text: string; sentiment: `positive`\|`development`\|`neutral`; createdAt                                                                           | criterionId: string; wellbeing: boolean                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | by_employee_date [employeeId, date], by_author                                                     |
| `selfNotes` (`me/`)                       | employeeId: id(employees); text: string; createdAt                                                                                                                                                     | reviewId: id(reviews); sharedAt: number                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | by_employee                                                                                        |
| `conversations` (`conversations/`)        | employeeId, authorId: id(employees); kind: `opening`\|`evaluation`\|`feedback`; createdAt                                                                                                              | reviewId: id(reviews); heldOn: isoDate; plan: {goal?, agenda?: string[], questions?: {criterionId?, text}[], tips?: string[], difficultScenario?}; outcomes: string; updatedAt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | by_review, by_employee, by_author                                                                  |
| `drafts` (`drafting/`)                    | reviewId: id(reviews); section: `criterion_justification`\|`strength`\|`development_area`\|`development_action`\|`feedback_tip`; text; status: `proposed`\|`accepted`\|`edited`\|`rejected`; createdAt | criterionId: string; observationIds: id(observations)[]; noEvidence: boolean; inconsistency: string (warning text); relatedDraftId: id(drafts); updatedAt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | by_review                                                                                          |
| `hrSignals` (`hrPartner/`)                | employeeId, supervisorId: id(employees); kind: `duties_change`\|`workload`\|`no_recognition`\|`long_absence`\|`supervisor_change`\|`recognition_moment`; reason: string; detectedAt                    | status: `open`\|`dismissed`\|`acted`; recommendations: {text, kind?: `wellbeing`\|`organizational`\|`preventive`\|`conversation`\|`recognition`}[]; resolvedAt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | by_employee, by_supervisor                                                                         |
| `reminders` (`hrDashboard/`)              | recipientId: id(employees); kind: `upcoming`\|`overdue`\|`manual`; dueDate: isoDate; message; createdAt                                                                                                | reviewId: id(reviews); firstReviewId: id(firstReviews); stage: string; sentAt, dismissedAt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | by_recipient, by_review_stage_kind, by_firstReview_stage_kind                                      |
| `competencyAssessments` (`competencies/`) | employeeId, assessorId: id(employees); competencyId, modelVersion: string; createdAt                                                                                                                   | reviewId: id(reviews); firstReviewId: id(firstReviews); criterionId: string; indicatorChoices: {indicatorId, levelId?}[] (no levelId = not observed); suggestedLevel, finalLevel, deviationJustification: string; updatedAt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | by_employee, by_review, by_firstReview                                                             |
| `knowledgeChunks` (`knowledge/`)          | sourceId, sourceTitle, locator, text: string; order: number                                                                                                                                            | contentHash: string                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | by_source [sourceId, order]; searchIndex `search_text` (searchField text, filterFields [sourceId]) |
| `firstReviews` (`firstReview/`)           | employeeId, evaluatorId: id(employees); stage: string (stages owned by #21); createdAt                                                                                                                 | rulesVersion: string; startDate, dueDate: isoDate; result: `positive`\|`negative`; signatures: signature[]; stageHistory: stageEntry[]; closedAt, updatedAt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | by_employee, by_evaluator                                                                          |

`mockFixture`: `generateStructuredOutput` gains `mockFixture?: NoInfer<T>`. The mock provider
checks in this order: forced scenarios (`[mock:error]`, `[mock:timeout]`), then its own dictionary
entry for `schemaName`, then `mockFixture`, and otherwise a `config` error. Whichever fixture it
uses is parsed by `schema`, and a mismatch gives `bad_response`. A fixture is the schema's output
shape, so use schemas without transforms. The OpenAI-compatible adapter never sends the field. Any
provider wrapper (#28 guardrails) must forward it.

## Tasks

Each task regenerates `convex/_generated` in the same commit when it adds a file under `convex/`.
Tasks run sequentially; they share `convex/schema.ts`.

1. Shared validators and rule types (files: `convex/lib/validators.ts`,
   `convex/lib/validators.test.ts`, `convex/rules/types.ts`, `.github/hot-files.txt`,
   `specs/contract-domain.md`).
2. Asystent core tables (files: `convex/{employees,reviews,observations,conversations,drafting}/tables.ts`,
   `convex/schema.ts`, `convex/schema.test.ts`).
3. Kompas tables (files: `convex/{competencies,knowledge,firstReview}/tables.ts`,
   `convex/schema.ts`, `convex/schema.test.ts`).
4. HR and self-service tables, after Kompas because `reminders` references `firstReviews`
   (files: `convex/{hrPartner,hrDashboard,me}/tables.ts`, `convex/schema.ts`,
   `convex/schema.test.ts`).
5. Demo actor (files: `convex/lib/demoRole.ts`, `convex/lib/demoRole.test.ts`).
6. `mockFixture` (files: `convex/ai/types.ts`, `convex/ai/mock.ts`, `convex/ai/mock.test.ts`,
   `convex/ai/openaiCompatible.ts` only if the type requires it, `convex/ai/openaiCompatible.test.ts`,
   `docs/ai-providers.md`).
7. Demo role switcher (files: `src/lib/demoRole.ts`, `src/lib/demoRole.test.ts`,
   `src/app/Layout.tsx`, `src/app/app.test.tsx`).
8. Wrap-up (files: `docs/architecture.md`): `codegen:check`, `verify`, and the PR.

`convex/_generated/**` is exempt from the hot-file rule. `docs/` and `specs/` are not hot. All other
files are hot, so the PR template's shared-files box is ticked.

## Acceptance criteria

- [ ] `.github/hot-files.txt` lists `convex/rules/types.ts`.
- [ ] `convex/rules/types.ts` exports the seven types above and contains no runtime values.
- [ ] `npm run typecheck` fails if `SheetType`, `PositionKind`, `ReviewStage` or
      `StaffingSituation` drifts from `Infer<>` of its validator (`expectTypeOf` in
      `convex/lib/validators.test.ts`).
- [ ] `convex/schema.ts` spreads all 11 table groups next to `notesTables`; notes tests pass
      unchanged.
- [ ] `convex/schema.test.ts` inserts a minimal valid row (required fields only) into each new table
      with `convex-test` and reads it back through every declared index; a `knowledgeChunks` row is
      found via `search_text`; a row with an unknown union literal is rejected (one case).
- [ ] `resolveActor` returns the seeded persona for a role, `employee: null` when none is seeded,
      and throws for a duplicated persona (tests in `convex/lib/demoRole.test.ts`).
- [ ] Mock: unknown `schemaName` + `mockFixture` returns the parsed fixture; fixture failing the
      schema gives `bad_response`; known `schemaName` ignores `mockFixture`; neither gives `config`;
      `[mock:error]` still wins (tests in `convex/ai/mock.test.ts`).
- [ ] OpenAI-compatible: a call with `mockFixture` sends a body without it (stubbed `fetch`).
- [ ] Header has a labelled "Rola (demo)" select with 4 Polish role labels. Choosing one updates
      `useDemoRole()` in another component and survives a remount with the same `localStorage`.
      Broken or missing storage falls back to "przełożony" (tests).
- [ ] `docs/ai-providers.md` describes `mockFixture` (order, output shape, wrapper must forward it);
      `docs/architecture.md` describes the demo actor as an auth stand-in, lists table owners and
      notes that wave-1 modules whose `tables.ts` already exists skip the `feature:new` contract step.
- [ ] `convex/_generated` regenerated; `npm run codegen:check` and `npm run verify` green.
- [ ] PR body has `Closes #9`, the ticked shared-files box and the unblocked issues
      (#10-#21, #26-#30).
