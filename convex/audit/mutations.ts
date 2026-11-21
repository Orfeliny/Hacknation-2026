import { ConvexError, v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import { createPseudonymizer } from "../ai/guardrails";
import { demoActor, resolveActor } from "../lib/demoRole";
import { canReadObservation } from "../observations/access";
import { canViewReview } from "../reviews/access";
import { logAudit } from "./log";

// Queries cannot write, so the UI calls this when an assessment or an observation is opened.
export const recordView = mutation({
  args: {
    actor: demoActor,
    reviewId: v.optional(v.id("reviews")),
    observationId: v.optional(v.id("observations")),
  },
  handler: async (ctx, { actor, reviewId, observationId }) => {
    if ((reviewId === undefined) === (observationId === undefined)) {
      throw new ConvexError("Podaj ocenę albo obserwację.");
    }
    const resolved = await resolveActor(ctx, actor);
    if (reviewId) {
      const review = await ctx.db.get(reviewId);
      if (!review || !canViewReview(resolved, review)) {
        throw new ConvexError("Nie masz dostępu do tej oceny.");
      }
      await logAudit(ctx, {
        actor: resolved,
        action: "view",
        entity: "review",
        entityId: reviewId,
        reviewId,
      });
      return;
    }
    const observation = observationId && (await ctx.db.get(observationId));
    if (!observation || !canReadObservation(resolved, observation)) {
      throw new ConvexError("Nie masz dostępu do tej obserwacji.");
    }
    await logAudit(ctx, {
      actor: resolved,
      action: "view",
      entity: "observation",
      entityId: observation._id,
    });
  },
});

export const recordExport = mutation({
  args: { actor: demoActor, reviewId: v.id("reviews") },
  handler: async (ctx, { actor, reviewId }) => {
    const resolved = await resolveActor(ctx, actor);
    const review = await ctx.db.get(reviewId);
    if (!review || !canViewReview(resolved, review)) {
      throw new ConvexError("Nie masz dostępu do tej oceny.");
    }
    await logAudit(ctx, {
      actor: resolved,
      action: "export",
      entity: "review",
      entityId: reviewId,
      reviewId,
      details: "sheet",
    });
  },
});

// The caller passes text that is already pseudonymised (#28). As a second barrier every employee name is
// replaced again here, so a caller that forgot cannot put a name in the register.
export const recordAiInteraction = internalMutation({
  args: {
    module: v.string(),
    provider: v.string(),
    model: v.string(),
    sentPrompt: v.string(),
    output: v.string(),
    actorId: v.optional(v.id("employees")),
    employeeId: v.optional(v.id("employees")),
    reviewId: v.optional(v.id("reviews")),
    draftId: v.optional(v.id("drafts")),
  },
  handler: async (ctx, args) => {
    const people = await ctx.db.query("employees").collect();
    const pseudo = createPseudonymizer(
      people.map((p) => `${p.firstName} ${p.lastName}`),
    );
    return await ctx.db.insert("aiInteractions", {
      ...args,
      sentPrompt: pseudo.pseudonymize(args.sentPrompt),
      output: pseudo.pseudonymize(args.output),
      createdAt: Date.now(),
      decision: "pending",
    });
  },
});

export const decideAi = mutation({
  args: {
    actor: demoActor,
    interactionId: v.id("aiInteractions"),
    decision: v.union(
      v.literal("accepted"),
      v.literal("edited"),
      v.literal("rejected"),
    ),
  },
  handler: async (ctx, { actor, interactionId, decision }) => {
    const resolved = await resolveActor(ctx, actor);
    const interaction = await ctx.db.get(interactionId);
    const me = resolved.employee?._id;
    if (!interaction || !me || interaction.actorId !== me) {
      throw new ConvexError("Decyzję podejmuje osoba, która zadała pytanie.");
    }
    await ctx.db.patch(interactionId, { decision, decidedAt: Date.now() });
  },
});
