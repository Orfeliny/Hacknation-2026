import type { Doc } from "../_generated/dataModel";
import type { ResolvedActor } from "../lib/demoRole";

// D11: author and HR read observations; the next evaluator only after the author's consent;
// the employee never does.
export function canReadObservation(
  actor: ResolvedActor,
  observation: Doc<"observations">,
): boolean {
  if (actor.role === "hr") return true;
  const me = actor.employee?._id;
  if (!me) return false;
  return (
    observation.authorId === me || observation.handover?.toEvaluatorId === me
  );
}

export function forbidEmployee(actor: ResolvedActor): void {
  if (actor.role === "employee") {
    throw new Error("Obserwacje przełożonego nie są dostępne dla ocenianego.");
  }
}
