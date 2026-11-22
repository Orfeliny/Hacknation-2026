# Deadline shift backend (#83)

Issue: #83 · Branch: `feat/83-deadline-shift` · Status: IN PROGRESS

## Goal

Replace the `NOT_IMPLEMENTED` stubs in `convex/deadlineShift/{queries,mutations}.ts` with real handlers.
Signatures and response shapes come from `convex/lib/contracts/deadlineShift.ts` and do not change.
No new table: `reviews.deadlineChanges` is the source of truth and is append-only.

## Decisions

- D1. `basis` is `optional` for `employee_request`, `mandatory` for the other reasons.
- D2. `shiftAllowed` and `shiftBlockedReason` come from `deadlineChangeAllowed` (art. 81 ust. 8) for
  optional entries; mandatory entries are always allowed. `decide` rejects `accepted` with the same text.
- D3. `decide` works only on a `requested` entry, for the supervisor who is the review's evaluator. An
  accepted decision needs `newDate` after `previousDate`; a rejected one keeps the proposed `newDate`.
- D4. `markNoticeSent` (HR) sets `noticeSentAt` once and, for an approved entry, moves
  `reviews.dueDate` to `newDate`. Rejected entries leave the date alone.
- D5. Fallback for a review without `dueDate`: the latest approved entry's `newDate`, else the first
  entry's `previousDate`.
- D6. Queries return `[]` (or `null` for `get`) when the role has no access; mutations throw a
  `ConvexError` with a Polish message.
- D7. Each decision and each notice writes an audit entry (`update`, entity `deadlineChange`).
- D8. The stub test in `convex/lib/contracts/contracts.test.ts` goes in a separate contract PR (hot file).
- D9. Entries for mandatory reasons are created elsewhere; this issue does not add a creating mutation.

## Acceptance criteria

- [ ] Tests cover submission (an existing `requested` entry), decision and the recalculated date,
      including absences above the threshold.
- [ ] Access follows the demo roles: the supervisor decides, HR sends the notice.
- [ ] Each decision creates an audit entry.
- [ ] The response shape matches the contract and `npm run verify` is green.
