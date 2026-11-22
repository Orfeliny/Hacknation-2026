import type { Doc } from "../_generated/dataModel";
import type { ResolvedActor } from "../lib/demoRole";
import { isEvaluator } from "../reviews/access";
import { denied, ONLY_EVALUATOR } from "./errors";

// Drafts are working notes derived from the evaluator's observations (D11): nobody else reads them.
export function requireEvaluator(
  actor: ResolvedActor,
  review: Pick<Doc<"reviews">, "employeeId" | "evaluatorId">,
): void {
  if (!isEvaluator(actor, review)) throw denied(ONLY_EVALUATOR);
}
