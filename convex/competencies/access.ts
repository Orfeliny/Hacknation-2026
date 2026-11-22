import type { Doc, Id } from "../_generated/dataModel";
import type { DatabaseReader } from "../_generated/server";
import type { ResolvedActor } from "../lib/demoRole";
import { EDITABLE_STAGES } from "../reviews/stages";
import { refusal } from "./errors";

// An assessment belongs to a periodic review, a first review, or neither (ongoing feedback).
export type Link = {
  reviewId?: Id<"reviews">;
  firstReviewId?: Id<"firstReviews">;
};

export type Context =
  | { kind: "review"; doc: Doc<"reviews"> }
  | { kind: "firstReview"; doc: Doc<"firstReviews"> }
  | null;

export type Scope = { employee: Doc<"employees">; context: Context };

// assessor: writes and reads drafts; hr: reads drafts; employee: reads own final levels only.
export type Audience = "assessor" | "hr" | "employee";

const FIRST_REVIEW_EDITABLE = ["report", "assessment"];

export async function loadScope(
  db: DatabaseReader,
  employeeId: Id<"employees">,
  { reviewId, firstReviewId }: Link,
): Promise<Scope> {
  const employee = await db.get(employeeId);
  if (!employee) throw refusal("Nie znaleziono pracownika.");
  if (reviewId && firstReviewId) {
    throw refusal(
      "Ocena kompetencji należy do jednej oceny: okresowej albo pierwszej.",
    );
  }
  if (reviewId) {
    const doc = await db.get(reviewId);
    if (!doc) throw refusal("Nie znaleziono oceny okresowej.");
    if (doc.employeeId !== employeeId) {
      throw refusal("Ta ocena okresowa nie dotyczy tego pracownika.");
    }
    return { employee, context: { kind: "review", doc } };
  }
  if (firstReviewId) {
    const doc = await db.get(firstReviewId);
    if (!doc) throw refusal("Nie znaleziono pierwszej oceny.");
    if (doc.employeeId !== employeeId) {
      throw refusal("Ta pierwsza ocena nie dotyczy tego pracownika.");
    }
    return { employee, context: { kind: "firstReview", doc } };
  }
  return { employee, context: null };
}

// Within a review the evaluator assesses (they may differ from the supervisor after a change);
// outside a review, the direct supervisor.
function isAssessor(me: Id<"employees">, scope: Scope): boolean {
  return scope.context
    ? scope.context.doc.evaluatorId === me
    : scope.employee.supervisorId === me;
}

export function audienceOf(
  actor: ResolvedActor,
  scope: Scope,
): Audience | null {
  const me = actor.employee?._id;
  // Nobody reads the working material of their own assessment, whatever demo role they hold.
  if (me && me === scope.employee._id) return "employee";
  if (actor.role === "employee") return null;
  if (actor.role === "hr") return "hr";
  return me && isAssessor(me, scope) ? "assessor" : null;
}

export function isEditable(context: Context): boolean {
  if (!context) return true;
  return context.kind === "review"
    ? EDITABLE_STAGES.includes(context.doc.stage)
    : FIRST_REVIEW_EDITABLE.includes(context.doc.stage);
}

export function requireAssessor(
  actor: ResolvedActor,
  scope: Scope,
): Id<"employees"> {
  const me = actor.employee?._id;
  if (audienceOf(actor, scope) !== "assessor" || !me) {
    throw refusal(
      scope.context
        ? "Kompetencje w tej ocenie ocenia jej oceniający."
        : "Kompetencje ocenia bezpośredni przełożony pracownika.",
    );
  }
  if (!isEditable(scope.context)) {
    throw refusal(
      "Na tym etapie oceny nie można już zmieniać oceny kompetencji.",
    );
  }
  return me;
}

const EMPLOYEE_VISIBLE_STAGES = [
  "signing",
  "objection_window",
  "objection",
  "closed",
];

// The employee sees a final level once the sheet reaches signing (it is then on the sheet they
// sign); a level set outside a review is visible at once. The `setup` stage stays hidden.
export function finalVisibleToEmployee(context: Context): boolean {
  if (!context) return true;
  return context.kind === "review"
    ? EMPLOYEE_VISIBLE_STAGES.includes(context.doc.stage)
    : !isEditable(context);
}
