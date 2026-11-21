# Audit log and AI usage register (#39)

Issue: #39 · Branch: `feat/39-audit-log` · Status: IN PROGRESS

## Goal

Assessments are personal data. Record who viewed and changed them, and what was sent to a model and what
the human decided, so HR can answer "who looked at this?" and the jury can see the AI is accountable.

## Scope

- In: `convex/audit/**` (not `tables.ts`, the tables come from #9), `src/features/audit/**`, this spec, and
  the smallest possible calls into existing code: `logAudit` in `convex/reviews/mutations.ts` and
  `convex/observations/mutations.ts`, `recordAiInteraction` in `convex/hrPartner/actions.ts`, the view and export
  hooks in `src/features/review`, `src/features/me` and `src/features/print`, and the prompt panel in
  `src/features/hr-partner`. The generated API typings for the new files.
- Out: new tables, changes to `convex/ai/**`, `convex/notes/actions.ts` (the starter example: no actor, no
  personal data), accept/reject buttons for AI drafts (#15 owns that UI; `decideAi` is ready for it).

## Decisions

- D1: `logAudit(ctx, entry)` in `convex/audit/log.ts` is the one writer of `auditLog`. Mutations call it after
  the write succeeded: review `start` (create), `save` (update), `sign` (sign), `advance` and `close`
  (stage_change); observation `add` (create), `update` and `remove` (update). `details` holds ids and stage
  names only, never free text of an assessment or an observation.
- D2: Convex queries cannot write, so `audit.mutations.recordView` is called by the UI when an assessment is
  opened, and by whoever opens an observation. It checks the same access rule as the read it records
  (`canViewReview`, `canReadObservation`). HR reading a supervisor's observation is a `view` (team decision
  of 21.11). `recordExport` logs a printed or exported sheet.
- D3: the AI register is written by `internal.audit.mutations.recordAiInteraction`. `sentPrompt` and `output`
  are stored after pseudonymisation (#28); as a second barrier the mutation replaces every employee name it
  finds with the #28 placeholder, whatever the caller passed. A call that fails before the model answers has
  no prompt/response pair and is not registered.
- D4: `audit.mutations.decideAi` records accepted / edited / rejected; only the person who made the call may
  decide.
- D5: access: the access history of an assessment and the whole register are for role `hr`. Everyone else sees
  only their own register entries (the panel next to their own suggestions). The log has no update or delete
  function.
- D6: UI: "Historia dostępu" in the assessment for HR, and a "Co wysłano do modelu" panel next to HR-partner
  suggestions and answers.

## Acceptance criteria

- [ ] Opening an assessment creates a `view` entry with role and time.
- [ ] Every AI call creates a register entry. The stored prompt contains no names (tested with the #28 helper).
- [ ] HR can see an assessment's access history. The assessed employee and the supervisor cannot see other
      people's register entries.
- [ ] Tests pass and `npm run verify` is green.
