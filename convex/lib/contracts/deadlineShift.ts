import { v, type Infer } from "convex/values";
import { demoActor } from "../demoRole";
import { deadlineChange, isoDate } from "../validators";

// B2 Deadline shift (#83). Backend: convex/deadlineShift/{queries,mutations}.ts. No new table:
// `reviews.deadlineChanges` is the single source of truth (contract-domain D6).
//
// Flow (A10):
//   1. requested: the employee's request (reason employee_request, employeeReason, proposedDate;
//      newDate starts equal to proposedDate).
//   2. approved / rejected: the supervisor decides (decisionJustification, decidedById,
//      decidedAt, final newDate; proposedDate is kept), then hands over to HR.
//   3. HR sends the letter (noticeSentAt). Only then, and only when approved, does
//      `reviews.dueDate` become `newDate`. Mandatory reasons (absence_extension, employee_absence,
//      evaluator_absence, evaluator_change) enter at `approved` and also wait for the letter.
//
// An entry is addressed by `{ reviewId, changeIndex }`, its position in `reviews.deadlineChanges`.
// The array is append-only: no function may remove or reorder entries, or the addresses break.

export const SHIFT_LIMITS = {
  justification: 2000,
  employeeReason: 2000,
} as const;

export const shiftRequest = v.object({
  reviewId: v.id("reviews"),
  changeIndex: v.number(),
  createdAt: v.number(),
  employeeId: v.id("employees"),
  employeeName: v.string(),
  employeePosition: v.string(),
  supervisorName: v.string(),
  // `reviews.dueDate` is optional; an entry's review always has a date in practice, and when it
  // does not, the backend falls back to the latest entry's `newDate`.
  currentDueDate: isoDate,
  reason: deadlineChange.fields.reason,
  basis: v.union(v.literal("mandatory"), v.literal("optional")),
  status: deadlineChange.fields.status,
  previousDate: isoDate,
  proposedDate: v.optional(isoDate),
  newDate: isoDate,
  employeeReason: v.optional(v.string()),
  decisionJustification: v.optional(v.string()),
  decidedByName: v.optional(v.string()),
  decidedAt: v.optional(v.number()),
  noticeSentAt: v.optional(v.number()),
  // Computed by the backend with `deadlineChangeAllowed` (convex/rules/deadlines.ts), so the UI
  // and `decide` agree.
  shiftAllowed: v.boolean(),
  shiftBlockedReason: v.optional(v.string()),
});

const entryAddress = {
  reviewId: v.id("reviews"),
  changeIndex: v.number(),
};

// Access: supervisor. Only `employee_request` entries, all statuses, of reviews where the actor
// is the evaluator.
export const listForSupervisorContract = {
  args: { actor: demoActor },
  returns: v.array(shiftRequest),
};

// Access: hr. All reasons, status approved or rejected, no noticeSentAt yet.
export const listAwaitingNoticeContract = {
  args: { actor: demoActor },
  returns: v.array(shiftRequest),
};

// Access: the employee themselves, their evaluator, hr. All reasons, all statuses, newest first
// by `createdAt` (it spans several reviews).
export const listForEmployeeContract = {
  args: { actor: demoActor, employeeId: v.id("employees") },
  returns: v.array(shiftRequest),
};

// Access: the employee of the review, its evaluator, hr. `null` when the entry does not exist.
export const getContract = {
  args: { actor: demoActor, ...entryAddress },
  returns: v.union(shiftRequest, v.null()),
};

// Access: supervisor who is the evaluator of the review. Only on a `requested` entry; `newDate`
// is required when `accepted`. Must reject `accepted` when `deadlineChangeAllowed` fails, with the
// same text `shiftBlockedReason` returns.
export const decideContract = {
  args: {
    actor: demoActor,
    ...entryAddress,
    accepted: v.boolean(),
    justification: v.string(),
    newDate: v.optional(isoDate),
  },
  returns: v.null(),
};

// Access: hr. Sets `noticeSentAt` and, for an approved entry, `reviews.dueDate`. Returns the
// review's due date after the call (unchanged for a rejected entry; same fallback as
// `currentDueDate` when the review has none).
export const markNoticeSentContract = {
  args: { actor: demoActor, ...entryAddress },
  returns: v.object({ dueDate: isoDate }),
};

export type ShiftRequest = Infer<typeof shiftRequest>;
