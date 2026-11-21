import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { fullName } from "../employees/access";
import type { ResolvedActor } from "../lib/demoRole";
import { shiftRequest } from "../lib/contracts/deadlineShift";
import { reviewContext, todayIso } from "../reviews/context";
import { addDays } from "../rules/dates";
import { deadlineChangeAllowed } from "../rules/deadlines";
import type { Infer } from "convex/values";

export type ShiftRequest = Infer<typeof shiftRequest>;
type Entry = NonNullable<Doc<"reviews">["deadlineChanges"]>[number];

export const isMandatory = (entry: Pick<Entry, "reason">) =>
  entry.reason !== "employee_request";

export const isHr = (actor: ResolvedActor) => actor.role === "hr";

export function isEvaluatorOf(
  actor: ResolvedActor,
  review: Pick<Doc<"reviews">, "evaluatorId">,
): boolean {
  return (
    actor.role === "supervisor" &&
    actor.employee !== null &&
    actor.employee._id === review.evaluatorId
  );
}

export function isEmployeeOf(
  actor: ResolvedActor,
  review: Pick<Doc<"reviews">, "employeeId">,
): boolean {
  return (
    actor.role === "employee" &&
    actor.employee !== null &&
    actor.employee._id === review.employeeId
  );
}

export function canViewReviewShifts(
  actor: ResolvedActor,
  review: Doc<"reviews">,
): boolean {
  return (
    isHr(actor) || isEvaluatorOf(actor, review) || isEmployeeOf(actor, review)
  );
}

// A review without `dueDate`: the date the last approved shift set, else where the first entry started.
export function currentDueDate(review: Doc<"reviews">): string {
  if (review.dueDate) return review.dueDate;
  const entries = review.deadlineChanges ?? [];
  const approved = entries.filter((e) => e.status === "approved");
  const last = approved[approved.length - 1];
  return last?.newDate ?? entries[0]?.previousDate ?? todayIso();
}

export function shiftCondition(
  cycleStart: string,
  today: string,
): { allowed: boolean; reason?: string } {
  const check = deadlineChangeAllowed(cycleStart, today);
  if (check.allowed) return { allowed: true };
  return {
    allowed: false,
    reason: `Termin oceny można przesunąć dopiero po upływie 6 miesięcy od początku cyklu (od ${addDays(check.from, 1)}). Podstawa: ${check.source}.`,
  };
}

export async function toShiftRequest(
  ctx: Pick<QueryCtx, "db">,
  review: Doc<"reviews">,
  changeIndex: number,
  today: string = todayIso(),
): Promise<ShiftRequest | null> {
  const entry = review.deadlineChanges?.[changeIndex];
  if (!entry) return null;
  const [employee, evaluator, decider] = await Promise.all([
    ctx.db.get(review.employeeId),
    ctx.db.get(review.evaluatorId),
    entry.decidedById ? ctx.db.get(entry.decidedById) : null,
  ]);
  if (!employee) return null;
  const mandatory = isMandatory(entry);
  const condition = mandatory
    ? { allowed: true as const, reason: undefined }
    : shiftCondition(
        (await reviewContext(ctx, review, employee, today)).cycleStart,
        today,
      );
  return {
    reviewId: review._id,
    changeIndex,
    createdAt: entry.createdAt,
    employeeId: employee._id,
    employeeName: fullName(employee),
    employeePosition: employee.position,
    supervisorName: evaluator ? fullName(evaluator) : "",
    currentDueDate: currentDueDate(review),
    reason: entry.reason,
    basis: mandatory ? "mandatory" : "optional",
    status: entry.status,
    previousDate: entry.previousDate,
    proposedDate: entry.proposedDate,
    newDate: entry.newDate,
    employeeReason: entry.employeeReason,
    decisionJustification: entry.decisionJustification,
    decidedByName: decider ? fullName(decider) : undefined,
    decidedAt: entry.decidedAt,
    noticeSentAt: entry.noticeSentAt,
    shiftAllowed: condition.allowed,
    shiftBlockedReason: condition.reason,
  };
}

export async function toShiftRequests(
  ctx: Pick<QueryCtx, "db">,
  reviews: Doc<"reviews">[],
  keep: (entry: Entry) => boolean,
): Promise<ShiftRequest[]> {
  const today = todayIso();
  const rows = await Promise.all(
    reviews.flatMap((review) =>
      (review.deadlineChanges ?? []).flatMap((entry, index) =>
        keep(entry) ? [toShiftRequest(ctx, review, index, today)] : [],
      ),
    ),
  );
  return rows.filter((r): r is ShiftRequest => r !== null);
}
