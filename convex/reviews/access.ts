import type { Doc } from "../_generated/dataModel";
import type { ResolvedActor } from "../lib/demoRole";

type Review = Pick<Doc<"reviews">, "employeeId" | "evaluatorId">;

const isOversight = (actor: ResolvedActor) =>
  actor.role === "hr" || actor.role === "director" || actor.role === "admin";

// The reviewed person, their evaluator, HR, the director and the admin may read a review.
export function canViewReview(actor: ResolvedActor, review: Review): boolean {
  if (isOversight(actor)) return true;
  const me = actor.employee?._id;
  return (
    me !== undefined && (me === review.employeeId || me === review.evaluatorId)
  );
}

export function isEvaluator(actor: ResolvedActor, review: Review): boolean {
  const me = actor.employee?._id;
  return (
    me !== undefined && me === review.evaluatorId && actor.role !== "employee"
  );
}

export function isReviewed(actor: ResolvedActor, review: Review): boolean {
  const me = actor.employee?._id;
  return (
    me !== undefined && me === review.employeeId && actor.role === "employee"
  );
}
