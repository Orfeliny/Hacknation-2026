import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { ResolvedActor } from "../lib/demoRole";

export type AuditEntry = {
  actor: ResolvedActor;
  action: Doc<"auditLog">["action"];
  entity: string;
  entityId: string;
  reviewId?: Id<"reviews">;
  // Ids and stage names only; never the text of an assessment or an observation.
  details?: string;
};

export async function logAudit(
  ctx: Pick<MutationCtx, "db">,
  entry: AuditEntry,
): Promise<void> {
  await ctx.db.insert("auditLog", {
    actorRole: entry.actor.role,
    actorId: entry.actor.employee?._id,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    reviewId: entry.reviewId,
    details: entry.details,
    at: Date.now(),
  });
}
