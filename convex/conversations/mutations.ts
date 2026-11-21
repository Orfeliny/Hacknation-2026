import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import { demoActor, resolveActor } from "../lib/demoRole";
import { assertIsoDate, isoDate } from "../lib/validators";
import { RULES_2016 } from "../rules/pack2016";
import { isEvaluatorOf } from "./access";

const plan = v.object({
  goal: v.optional(v.string()),
  agenda: v.optional(v.array(v.string())),
  questions: v.optional(
    v.array(
      v.object({ criterionId: v.optional(v.string()), text: v.string() }),
    ),
  ),
  tips: v.optional(v.array(v.string())),
  difficultScenario: v.optional(v.string()),
});

export const create = mutation({
  args: {
    actor: demoActor,
    employeeId: v.id("employees"),
    kind: v.union(
      v.literal("opening"),
      v.literal("evaluation"),
      v.literal("feedback"),
    ),
    reviewId: v.optional(v.id("reviews")),
  },
  handler: async (ctx, { actor, employeeId, kind, reviewId }) => {
    const me = (await resolveActor(ctx, actor)).employee?._id;
    if (!(await isEvaluatorOf(ctx, me, employeeId))) {
      throw new Error(
        "Rozmowę przygotowuje przełożony albo oceniający pracownika.",
      );
    }
    if (reviewId && (await ctx.db.get(reviewId))?.employeeId !== employeeId) {
      throw new Error("Ta ocena nie dotyczy tego pracownika.");
    }
    return await ctx.db.insert("conversations", {
      employeeId,
      authorId: me!,
      kind,
      reviewId,
      createdAt: Date.now(),
    });
  },
});

// The evaluator edits the plan by hand, with or without an AI proposal (AI failures never block).
export const savePlan = mutation({
  args: { actor: demoActor, conversationId: v.id("conversations"), plan },
  handler: async (ctx, { actor, conversationId, plan }) => {
    const me = (await resolveActor(ctx, actor)).employee?._id;
    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.authorId !== me) {
      throw new Error("Plan rozmowy zmienia jej autor.");
    }
    for (const q of plan.questions ?? []) {
      if (
        q.criterionId &&
        !RULES_2016.catalog.some((c) => c.id === q.criterionId)
      ) {
        throw new Error(`Nieznane kryterium: ${q.criterionId}.`);
      }
    }
    await ctx.db.patch(conversationId, { plan, updatedAt: Date.now() });
  },
});

export const saveOutcomes = mutation({
  args: {
    actor: demoActor,
    conversationId: v.id("conversations"),
    heldOn: isoDate,
    outcomes: v.string(),
  },
  handler: async (ctx, { actor, conversationId, heldOn, outcomes }) => {
    const me = (await resolveActor(ctx, actor)).employee?._id;
    const conversation = await ctx.db.get(conversationId);
    if (!conversation || conversation.authorId !== me) {
      throw new Error("Ustalenia z rozmowy zapisuje jej autor.");
    }
    assertIsoDate(heldOn, "heldOn");
    await ctx.db.patch(conversationId, {
      heldOn,
      outcomes: outcomes.trim(),
      updatedAt: Date.now(),
    });
  },
});

export const storePlan = internalMutation({
  args: { conversationId: v.id("conversations"), plan },
  handler: async (ctx, { conversationId, plan }) => {
    await ctx.db.patch(conversationId, { plan, updatedAt: Date.now() });
  },
});
