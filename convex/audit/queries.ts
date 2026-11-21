import { ConvexError, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { query, type QueryCtx } from "../_generated/server";
import { fullName } from "../employees/access";
import { demoActor, resolveActor } from "../lib/demoRole";
import { canSeeInteraction, requireHr } from "./access";
import { MAX_HISTORY } from "./limits";

async function nameOf(ctx: QueryCtx, id: Doc<"employees">["_id"] | undefined) {
  const person = id ? await ctx.db.get(id) : null;
  return person ? fullName(person) : null;
}

async function shape(ctx: QueryCtx, row: Doc<"aiInteractions">) {
  return {
    _id: row._id,
    module: row.module,
    provider: row.provider,
    model: row.model,
    sentPrompt: row.sentPrompt,
    output: row.output,
    createdAt: row.createdAt,
    decision: row.decision ?? "pending",
    actorName: await nameOf(ctx, row.actorId),
  };
}

export const accessHistory = query({
  args: { actor: demoActor, reviewId: v.id("reviews") },
  handler: async (ctx, { actor, reviewId }) => {
    requireHr(await resolveActor(ctx, actor));
    const rows = await ctx.db
      .query("auditLog")
      .withIndex("by_review", (q) => q.eq("reviewId", reviewId))
      .order("desc")
      .take(MAX_HISTORY);
    return await Promise.all(
      rows.map(async (row) => ({
        _id: row._id,
        at: row.at,
        action: row.action,
        entity: row.entity,
        actorRole: row.actorRole,
        actorName: await nameOf(ctx, row.actorId),
        details: row.details ?? null,
      })),
    );
  },
});

// HR sees every entry; anyone else only the calls they made themselves.
export const aiRegister = query({
  args: {
    actor: demoActor,
    reviewId: v.optional(v.id("reviews")),
    employeeId: v.optional(v.id("employees")),
  },
  handler: async (ctx, { actor, reviewId, employeeId }) => {
    const resolved = await resolveActor(ctx, actor);
    const source = reviewId
      ? ctx.db
          .query("aiInteractions")
          .withIndex("by_review", (q) => q.eq("reviewId", reviewId))
      : employeeId
        ? ctx.db
            .query("aiInteractions")
            .withIndex("by_employee", (q) => q.eq("employeeId", employeeId))
        : ctx.db.query("aiInteractions");
    const rows = (await source.order("desc").take(MAX_HISTORY)).filter((row) =>
      canSeeInteraction(resolved, row),
    );
    return await Promise.all(rows.map((row) => shape(ctx, row)));
  },
});

// One call, for the "Co wysłano do modelu" panel next to a suggestion.
export const aiInteraction = query({
  args: { actor: demoActor, interactionId: v.id("aiInteractions") },
  handler: async (ctx, { actor, interactionId }) => {
    const resolved = await resolveActor(ctx, actor);
    const row = await ctx.db.get(interactionId);
    if (!row || !canSeeInteraction(resolved, row)) {
      throw new ConvexError("Nie masz dostępu do tego wpisu.");
    }
    return await shape(ctx, row);
  },
});
