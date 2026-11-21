# Contract: domain data model and shared files (Asystent + Kompas)

Issue: #9 · Branch: `chore/9-contract-domain` · Status: draft, spec review round 2; requirements
update 2026-11-21 (D4-D9, "Requirements trace")

## Goal

Land every shared file that wave 1 (#10-#21, #26-#30) and the follow-up issues (#36-#39, #41, #42)
need, in one contract PR, so module PRs only add files in their own directories: tables, shared
validators, rule types, a demo actor, a per-module AI mock fixture and a demo role switcher.

## Scope

- In: 15 tables in 14 `convex/<module>/tables.ts` files wired into `convex/schema.ts`; shared validators
  `convex/lib/validators.ts`; types-only `convex/rules/types.ts` (made hot); demo actor
  `convex/lib/demoRole.ts` with `resolveActor`; `mockFixture` in the AI layer; `src/lib/demoRole.ts`
  plus a switcher in `src/app/Layout.tsx`; contract tests; regenerated `convex/_generated`; notes in
  `docs/ai-providers.md` and `docs/architecture.md`.
- Out: any query, mutation, action, seed or page of a module; rule data (#10); competency model
  data (#19); guardrails (#28); challenge profile (#29); real authentication (OIDC login is #42,
  this PR only reserves `employees.authSubject`); new npm dependencies.

## Decisions

- D1 (Q1, user): backend demo actor in `convex/lib/demoRole.ts`, extended with `resolveActor`.
- D2 (Q2, user after review finding 3): employee self-notes get their own `selfNotes` table in
  `convex/me/tables.ts`; `observations` stays the evaluator's journal. Who reads which notes is settled in D11.
- D3: `reviews.developmentPlan` (structured IPRZ conclusions) is the source of truth, written by
  #12. `drafts` hold only AI suggestions that #15 lets the evaluator copy into it.
- D4 (requirements update): `positionKind` literal `senior` becomes `office_head`. Sheet A is only
  for the head of the office when that post is in the civil service (§ 3 ust. 2). Other senior
  posts ("wyższe stanowiska", e.g. dyrektor departamentu) that manage people use sheet B (§ 3 ust.
  3), as in the filled example `13-arkusz-oceny-b-dyrektor-dep.md`.
- D5: one `signature` shape covers both confirmations on the sheet: part I after the opening
  conversation (§ 6 ust. 2) and the assessment (§ 12, starts the art. 83 objection window). It also
  carries the "miejscowość" field, the deemed acknowledgement from the use cases ("fikcja
  zapoznania z oceną", recorded by someone other than the employee) and an uploaded signed file
  (#38).
- D6: `reviews.dueDate` ("termin sporządzenia oceny", part I) is separate from `periodStart` /
  `periodEnd` ("okres, w którym oceniany podlegał ocenie", part II), as on the sheet. Every change
  of `dueDate` is a `deadlineChange` entry: art. 81 ust. 7 extension, the four art. 81 ust. 8
  reasons, and the employee's request, which needs the evaluator's decision.
- D7: an objection has three outcomes (art. 83 ust. 4): `amend` (the evaluator changes the
  assessment), `redo` (the review goes back to `evaluation` with `round: 2`) and `rejected`. New stage
  `objection_window`: the 7 days after the employee's assessment signature.
- D8: tables for issues filed after spec round 2: `audit/` (#39), `mail/` (#37), `regulationsWatch/`
  (#41). `employees.authSubject` (OIDC `sub`) is reserved for #42, so login needs no contract PR.
- D10 (after PR #44 materials): `demoRole` gains `admin`, the BPMN "ADMIN" lane (creates users)
  and the "korekta błędów przez administratora" mode from the sheet field schemas.
  `reviews.previousReviewId` links consecutive cycles (BPMN step 32, "koniec cyklu oceny i początek
  następnego"). `mailMessages.kind` gains `cycle_started`, `assessment_ready` and `review_changed`
  for the BPMN notifications.
- D11 (organizer interviews, `docs/wyzwanie/wywiady-2026-11-21.md`, access settled by the team):
  notes are official records. Observations are readable by their author and HR, never by the
  employee; `observations.handover` records the author's consent to hand them to the next
  evaluator (index `by_handover_to`). Self-notes are readable by the employee and HR, never by the
  supervisor, so `selfNotes.sharedAt` is removed. Access is enforced in module queries, not in the
  schema. `reminders.kind` gains `feedback_nudge`, a recommendation to
  give ongoing feedback, not a deadline. `reviews.endReason` tells a normal close from a cycle HR
  cut by hand (`restarted`) or a court annulment (`annulled`). The departing evaluator's opinion
  for the successor goes into `staffingSituation.note` of the `evaluator_change` entry.
- D9: the office name printed on the sheet ("NAZWA URZĘDU") comes from deployment config, not from a
  table: one deployment serves one office (#23).

## Assumptions

1. Table owners are the module directories from the wave-1 issues: `employees/` #11, `reviews/` #12,
   `observations/` #13, `conversations/` #14, `drafting/` (drafts) #15, `hrPartner/` (hrSignals)
   #16, `hrDashboard/` (reminders) #17, `competencies/` (competencyAssessments) #19, `knowledge/`
   (knowledgeChunks) #20, `firstReview/` #21, `me/` (selfNotes) #30, `mail/` (mailMessages) #37,
   `audit/` (auditLog, aiInteractions) #39, `regulationsWatch/` (regulationWatch) #41.
2. Required means a row is meaningless without it. Everything else is `v.optional`, because after
   merge the schema only grows (new optional fields, new union literals).
3. Calendar dates are `YYYY-MM-DD` strings (`isoDate`), so deadline math has no time-zone drift.
   `v.string()` cannot check the format, so every mutation that writes a date calls
   `assertIsoDate(value, field)` from `convex/lib/validators.ts`, which rejects non-dates such as
   `2026-02-30`.
   Event timestamps are epoch ms numbers.
4. `PositionKind` has three values: kierownik urzędu (`office_head`), stanowisko z bezpośrednim
   kierowaniem pracownikami (`managerial`), pozostałe (`non_managerial`). #10 maps them to sheets
   A/B/C (§ 3). The `reviews` fields were compared field by field with the field schemas of sheets
   A, B and C and with the use-case boundary conditions (PR #44: `docs/materialy_md/04-formularze/`,
   `docs/materialy_md/02-przypadki-uzycia/`). Which field is editable at which stage is behaviour
   for #12, not schema.
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
  v.literal("office_head"), // sheet A, § 3 ust. 2
  v.literal("managerial"), // sheet B, § 3 ust. 3
  v.literal("non_managerial"), // sheet C, § 3 ust. 4
);
reviewStage = v.union(
  setup,
  opening,
  observation,
  evaluation,
  writing,
  signing,
  objection_window,
  objection,
  closed,
); // literals
demoRole = v.union(
  v.literal("supervisor"),
  v.literal("employee"),
  v.literal("hr"),
  v.literal("director"),
  v.literal("admin"),
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
  scope: v.optional(v.union(v.literal("part_one"), v.literal("assessment"))), // § 6 ust. 2 | § 12
  place: v.optional(v.string()), // "miejscowość" on the sheet
  deemedById: v.optional(v.id("employees")), // deemed acknowledgement, recorded by this person
  method: v.optional(v.union(v.literal("in_app"), v.literal("signed_file"))),
  fileId: v.optional(v.id("_storage")), // signed PDF (#38)
  signatureDetected: v.optional(v.boolean()),
});
deadlineChange = v.object({
  reason: v.union(
    absence_extension, // art. 81 ust. 7
    evaluator_change, // art. 81 ust. 8 pkt 1
    employee_absence, // pkt 2
    evaluator_absence, // pkt 3
    employee_request, // pkt 4
  ), // literals
  status: v.union(requested, approved, rejected), // literals
  previousDate: isoDate,
  newDate: isoDate,
  createdAt: v.number(),
  requestedById: v.optional(v.id("employees")),
  decidedAt: v.optional(v.number()),
  noticeSentAt: v.optional(v.number()), // written notice, § 8
});
stageEntry = v.object({ stage: v.string(), at: v.number() });
```

`convex/rules/types.ts` holds plain types only: `SheetType`, `PositionKind`, `ReviewStage`,
`StaffingSituation`, `DeadlineChange` (equal to `Infer<>` of the validators above), plus `Criterion { id, name,
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
`<directory>Tables`, for example `draftingTables`, `hrDashboardTables`, `meTables` and
`regulationsWatchTables`.

| Table (file)                              | Required                                                                                                                                                                                                                                                                             | Optional                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Indexes                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `employees` (`employees/`)                | firstName, lastName, position, unit: string; createdAt: number                                                                                                                                                                                                                       | positionKind; corpsRole: `official`\|`employee`; contractTerm: `indefinite`\|`fixed_term` (for `employee`; only indefinite is reviewed, art. 81 ust. 1); indefiniteEmploymentSince: isoDate; email: string; supervisorId: id(employees); substitution: {substituteId: id(employees), from: isoDate, to?: isoDate}; serviceGrade: number (1-9); serviceGradeSince: isoDate; appointmentYear: number; isNewToCivilService: boolean; demoPersona: demoRole; authSubject: string (OIDC `sub`, #42); seedKey: string; staffingEvents: staffingSituation[]; archivedAt: number                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | by_supervisor, by_demoPersona, by_seedKey, by_authSubject                                          |
| `reviews` (`reviews/`)                    | employeeId, evaluatorId: id(employees); stage: reviewStage; createdAt                                                                                                                                                                                                                | sheet; rulesVersion: string; previousReviewId: id(reviews); round: number (2 = drawn up again, art. 83 ust. 4); dueDate, periodStart, periodEnd, openingConversationDate, evaluationConversationDate: isoDate; deadlineChanges: deadlineChange[]; additionalCriteria: string[]; expectations: {criterionId, text}[]; ratings: {criterionId, levelId, justification?}[]; averageScore: number; overallResult: `positive`\|`negative`; overallLevelId: string; overallJustification: string; previousReview: {result: `positive`\|`negative`\|`none`, levelId?, date?: isoDate} (officials only); objection: {filedAt: number, text, addressee?, decision?: `amend`\|`redo`\|`rejected`, decidedAt?: number, decidedById?: id(employees)}; developmentPlan: {summary?, strengths?: string[], areas?: {id, criterionId?, text}[], actions?: {areaId?, kind?: `training`\|`mentoring`\|`task`\|`other`, text}[]}; promotionRequest: {requested: boolean, justification?, appointmentYear?: number, currentGrade?: number, currentGradeSince?: isoDate, decision?: `granted`\|`refused`, decidedAt?: number}; signatures: signature[]; staffingSituations: staffingSituation[]; stageHistory: stageEntry[]; closedAt, updatedAt: number; endReason: `completed`\|`restarted`\|`annulled` (D11) | by_employee, by_evaluator, by_stage                                                                |
| `observations` (`observations/`)          | employeeId, authorId: id(employees); date: isoDate; text: string; sentiment: `positive`\|`development`\|`neutral`; createdAt                                                                                                                                                         | criterionId: string; wellbeing: boolean; handover: {toEvaluatorId: id(employees), consentedAt: number, reviewId?: id(reviews)} (D11)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | by_employee_date [employeeId, date], by_author, by_handover_to [handover.toEvaluatorId]            |
| `selfNotes` (`me/`)                       | employeeId: id(employees); text: string; createdAt                                                                                                                                                                                                                                   | reviewId: id(reviews) (no sharing with the supervisor, D11)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | by_employee                                                                                        |
| `conversations` (`conversations/`)        | employeeId, authorId: id(employees); kind: `opening`\|`evaluation`\|`feedback`; createdAt                                                                                                                                                                                            | reviewId: id(reviews); heldOn: isoDate; plan: {goal?, agenda?: string[], questions?: {criterionId?, text}[], tips?: string[], difficultScenario?}; outcomes: string; scheduledAt: number; durationMinutes: number; location: string; icsUid: string; icsSequence: number (calendar invitations, #37); updatedAt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | by_review, by_employee, by_author                                                                  |
| `drafts` (`drafting/`)                    | reviewId: id(reviews); section: `criterion_justification`\|`strength`\|`development_area`\|`development_action`\|`feedback_tip`; text; status: `proposed`\|`accepted`\|`edited`\|`rejected`; createdAt                                                                               | criterionId: string; observationIds: id(observations)[]; noEvidence: boolean; inconsistency: string (warning text); relatedDraftId: id(drafts); updatedAt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | by_review                                                                                          |
| `hrSignals` (`hrPartner/`)                | employeeId, supervisorId: id(employees); kind: `duties_change`\|`workload`\|`no_recognition`\|`long_absence`\|`supervisor_change`\|`recognition_moment`; reason: string; detectedAt                                                                                                  | status: `open`\|`dismissed`\|`acted`; recommendations: {text, kind?: `wellbeing`\|`organizational`\|`preventive`\|`conversation`\|`recognition`}[]; resolvedAt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | by_employee, by_supervisor                                                                         |
| `reminders` (`hrDashboard/`)              | recipientId: id(employees); kind: `upcoming`\|`overdue`\|`manual`\|`feedback_nudge` (D11); dueDate: isoDate; message; createdAt                                                                                                                                                      | reviewId: id(reviews); firstReviewId: id(firstReviews); stage: string; sentAt, dismissedAt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | by_recipient, by_review_stage_kind, by_firstReview_stage_kind                                      |
| `competencyAssessments` (`competencies/`) | employeeId, assessorId: id(employees); competencyId, modelVersion: string; createdAt                                                                                                                                                                                                 | reviewId: id(reviews); firstReviewId: id(firstReviews); criterionId: string; indicatorChoices: {indicatorId, levelId?}[] (no levelId = not observed); suggestedLevel, finalLevel, deviationJustification: string; updatedAt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | by_employee, by_review, by_firstReview                                                             |
| `knowledgeChunks` (`knowledge/`)          | sourceId, sourceTitle, locator, text: string; order: number                                                                                                                                                                                                                          | contentHash: string                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | by_source [sourceId, order]; searchIndex `search_text` (searchField text, filterFields [sourceId]) |
| `firstReviews` (`firstReview/`)           | employeeId, evaluatorId: id(employees); stage: string (stages owned by #21); createdAt                                                                                                                                                                                               | rulesVersion: string; startDate, dueDate: isoDate; result: `positive`\|`negative`; signatures: signature[]; stageHistory: stageEntry[]; closedAt, updatedAt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | by_employee, by_evaluator                                                                          |
| `auditLog` (`audit/`)                     | actorRole: demoRole; action: `view`\|`create`\|`update`\|`stage_change`\|`sign`\|`export`\|`correction`; entity, entityId: string; at: number                                                                                                                                        | actorId: id(employees); reviewId: id(reviews); details: string                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | by_review, by_entity [entity, entityId]                                                            |
| `aiInteractions` (`audit/`)               | module, provider, model, sentPrompt (after pseudonymisation, #28), output: string; createdAt                                                                                                                                                                                         | actorId, employeeId: id(employees); reviewId: id(reviews); draftId: id(drafts); decision: `pending`\|`accepted`\|`edited`\|`rejected`; decidedAt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | by_review, by_employee                                                                             |
| `mailMessages` (`mail/`)                  | recipientId: id(employees); kind: `cycle_started`\|`meeting_invitation`\|`reminder`\|`deadline_notice`\|`assessment_ready`\|`review_changed`\|`objection`\|`promotion`\|`other`; subject, body: string; channel: `demo_inbox`\|`smtp`; status: `queued`\|`sent`\|`failed`; createdAt | reviewId: id(reviews); conversationId: id(conversations); reminderId: id(reminders); ics, dedupeKey, error: string; sentAt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | by_recipient, by_dedupeKey, by_review                                                              |
| `regulationWatch` (`regulationsWatch/`)   | eliId, title: string; checkedAt: number                                                                                                                                                                                                                                              | lastChangeDate: string; changeDetectedAt, acknowledgedAt: number                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | by_eliId                                                                                           |

`mockFixture`: `generateStructuredOutput` gains `mockFixture?: NoInfer<T>`. The mock provider
checks in this order: forced scenarios (`[mock:error]`, `[mock:timeout]`), then its own dictionary
entry for `schemaName`, then `mockFixture`, and otherwise a `config` error. Whichever fixture it
uses is parsed by `schema`, and a mismatch gives `bad_response`. A fixture is the schema's output
shape, so use schemas without transforms. The OpenAI-compatible adapter never sends the field. Any
provider wrapper (#28 guardrails) must forward it.

## Requirements trace

Sources: rozporządzenie PRM z 4.04.2016 (Dz.U. poz. 470), ustawa o służbie cywilnej (Dz.U. 2026 poz.
590), the sheet field schemas and use-case boundary conditions from PR #44, issues #36-#42.

| Requirement                                                                                    | Source                                | Where                                                               |
| ---------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| Only officials and employees on an indefinite contract are reviewed                            | art. 81 ust. 1                        | `employees.corpsRole`, `contractTerm`                               |
| Sheet A only for the head of the office; B for posts that manage people; C for the rest        | § 3                                   | `positionKind` (D4)                                                 |
| Opening within 30 days of the last review or of indefinite employment; 7 days after a negative | § 7, use cases                        | `employees.indefiniteEmploymentSince`, review history               |
| Part I states the due date; both sides confirm the opening conversation with place and date    | § 5 ust. 3, § 6 ust. 2, sheet part I  | `reviews.dueDate`, `signature.scope: part_one`, `place`             |
| Due date moves by a long absence or for one of four reasons, with written notice               | art. 81 ust. 7-8, § 8, use cases      | `reviews.deadlineChanges` (D6)                                      |
| Evaluation period from-to, evaluation conversation date                                        | sheet part II                         | `periodStart`, `periodEnd`, `evaluationConversationDate`            |
| Average, level, positive or negative; justification required for a negative                    | § 11 ust. 1-3                         | `ratings`, `averageScore`, `overallLevelId`, `overallJustification` |
| IPRZ conclusions are required                                                                  | § 11 ust. 1 pkt 5, art. 81 ust. 5     | `developmentPlan.summary` + structured fields (D3)                  |
| Previous review of an official (result, level, date) is printed on the sheet                   | sheet part II                         | `reviews.previousReview`                                            |
| Part III: appointment year, current grade, grade date, motivated request                       | § 11 ust. 5, art. 89 ust. 1, sheet    | `promotionRequest`, `employees.serviceGrade*`                       |
| Mandatory next grade after two consecutive top-two-level positives                             | art. 89 ust. 2                        | `employees.serviceGradeSince`, review history, `reminders`          |
| Employee acknowledges the assessment, or a deemed acknowledgement is recorded                  | § 12, use cases ("fikcja zapoznania") | `signature.scope: assessment`, `deemedById` (D5)                    |
| Objection in 7 days, decision in 14; amend, redo or reject; addressee filled on sheet A        | art. 83, sheet A                      | `objection_window`, `objection`, `round` (D7)                       |
| Substitutions and archiving of employee data                                                   | use cases (general)                   | `employees.substitution`, `archivedAt`                              |
| Invitations and notifications                                                                  | use cases, #37                        | `conversations.scheduledAt`, `icsUid`, `mailMessages`               |
| Accountability and AI register                                                                 | KRI, RODO, AI Act, #39                | `auditLog`, `aiInteractions`                                        |
| Signed PDF                                                                                     | #38                                   | `signature.method`, `fileId`, `signatureDetected`                   |
| Notes are official: author and HR read them; next evaluator only with the author's consent     | interviews, team decision (D11)       | `observations.handover`, `by_handover_to`                           |
| Self-notes: employee and HR read them, the supervisor never does                               | team decision (D11)                   | `selfNotes` without `sharedAt`                                      |
| Reminders about ongoing feedback, as a recommendation                                          | HR standards, interviews (D11)        | `reminders.kind: feedback_nudge`                                    |
| Cycle cut by HR or annulled by a court                                                         | interviews, art. 83 (D11)             | `reviews.endReason`                                                 |

Deadline arithmetic (month ends, weekends and holidays, continuity of absences across days off) is
rule logic for #10 (`docs/materialy_md/06-materialy-dodatkowe/liczenie-terminow.md`), not schema.

Implementation status: tasks 1-7 (validators, rule types, 15 tables, schema tests, `_generated`, demo actor `resolveActor`, `mockFixture`) are implemented on this branch, together with the `/dev/model-domain` page (interactive relation graph, `src/features/devtools/`). Task 8 (role switcher in the header, `src/lib/demoRole.ts`) and task 9 (`docs/architecture.md`) are done as well.

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
5. Accountability, mail and regulation-watch tables, after task 4 because `mailMessages` references
   `reminders` and `conversations` (files: `convex/{audit,mail,regulationsWatch}/tables.ts`,
   `convex/schema.ts`, `convex/schema.test.ts`).
6. Demo actor (files: `convex/lib/demoRole.ts`, `convex/lib/demoRole.test.ts`).
7. `mockFixture` (files: `convex/ai/types.ts`, `convex/ai/mock.ts`, `convex/ai/mock.test.ts`,
   `convex/ai/openaiCompatible.ts` only if the type requires it, `convex/ai/openaiCompatible.test.ts`,
   `docs/ai-providers.md`).
8. Demo role switcher (files: `src/lib/demoRole.ts`, `src/lib/demoRole.test.ts`,
   `src/app/Layout.tsx`, `src/app/app.test.tsx`).
9. Wrap-up (files: `docs/architecture.md`): `codegen:check`, `verify`, and the PR.

`convex/_generated/**` is exempt from the hot-file rule. `docs/` and `specs/` are not hot. All other
files are hot, so the PR template's shared-files box is ticked.

## Acceptance criteria

- [ ] `.github/hot-files.txt` lists `convex/rules/types.ts`.
- [ ] `convex/rules/types.ts` exports the eight types above and contains no runtime values.
- [ ] `npm run typecheck` fails if `SheetType`, `PositionKind`, `ReviewStage`, `StaffingSituation`
      or `DeadlineChange` drifts from `Infer<>` of its validator (`expectTypeOf` in
      `convex/lib/validators.test.ts`).
- [ ] `convex/schema.ts` spreads all 14 table groups next to `notesTables`; notes tests pass
      unchanged.
- [ ] `convex/schema.test.ts` inserts a minimal valid row (required fields only) into each new table
      with `convex-test` and reads it back through every declared index; a `knowledgeChunks` row is
      found via `search_text`; a row with an unknown union literal is rejected (one case).
- [ ] `convex/schema.test.ts` also stores one `reviews` row with every optional shape from D5-D7:
      a `part_one` and an `assessment` signature (one deemed, one with `fileId`), an approved and a
      requested `deadlineChange`, an `objection` with decision `redo` and `round: 2`.
- [ ] `positionKind` has no `senior` literal; a test documents `office_head` → sheet A (§ 3 ust. 2).
- [ ] `resolveActor` returns the seeded persona for a role, `employee: null` when none is seeded,
      and throws for a duplicated persona (tests in `convex/lib/demoRole.test.ts`).
- [ ] Mock: unknown `schemaName` + `mockFixture` returns the parsed fixture; fixture failing the
      schema gives `bad_response`; known `schemaName` ignores `mockFixture`; neither gives `config`;
      `[mock:error]` still wins (tests in `convex/ai/mock.test.ts`).
- [ ] OpenAI-compatible: a call with `mockFixture` sends a body without it (stubbed `fetch`).
- [ ] Header has a labelled "Rola (demo)" select with 5 Polish role labels. Choosing one updates
      `useDemoRole()` in another component and survives a remount with the same `localStorage`.
      Broken or missing storage falls back to "przełożony" (tests).
- [ ] `docs/ai-providers.md` describes `mockFixture` (order, output shape, wrapper must forward it);
      `docs/architecture.md` describes the demo actor as an auth stand-in, lists table owners and
      notes that wave-1 modules whose `tables.ts` already exists skip the `feature:new` contract step.
- [ ] `convex/_generated` regenerated; `npm run codegen:check` and `npm run verify` green.
- [ ] PR body has `Closes #9`, the ticked shared-files box and the unblocked issues
      (#10-#21, #26-#30, #36-#39, #41, #42).
