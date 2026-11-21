import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { ResolvedActor } from "../lib/demoRole";

// The access history and the whole AI register are for HR; others see only their own AI entries.
export function requireHr(actor: ResolvedActor): void {
  if (actor.role !== "hr") {
    throw new ConvexError("Historia dostępu jest dostępna tylko dla kadr.");
  }
}

export function canSeeInteraction(
  actor: ResolvedActor,
  interaction: Pick<Doc<"aiInteractions">, "actorId">,
): boolean {
  if (actor.role === "hr") return true;
  const me = actor.employee?._id;
  return me !== undefined && interaction.actorId === me;
}
