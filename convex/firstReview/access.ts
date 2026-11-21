import type { Doc } from "../_generated/dataModel";
import type { ResolvedActor } from "../lib/demoRole";

type Row = Pick<Doc<"firstReviews">, "employeeId" | "evaluatorId">;

const isOversight = (actor: ResolvedActor) =>
  actor.role === "hr" || actor.role === "director" || actor.role === "admin";

export const canRecordForEmployee = (actor: ResolvedActor) =>
  actor.role === "hr" || actor.role === "admin";

export function canViewFirstReview(actor: ResolvedActor, row: Row): boolean {
  if (isOversight(actor)) return true;
  const me = actor.employee?._id;
  return me !== undefined && (me === row.employeeId || me === row.evaluatorId);
}

export function isFirstReviewEvaluator(
  actor: ResolvedActor,
  row: Row,
): boolean {
  const me = actor.employee?._id;
  return (
    me !== undefined && me === row.evaluatorId && actor.role !== "employee"
  );
}

export function isFirstReviewed(actor: ResolvedActor, row: Row): boolean {
  const me = actor.employee?._id;
  return me !== undefined && me === row.employeeId && actor.role === "employee";
}
