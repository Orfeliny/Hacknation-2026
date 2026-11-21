import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { demoActor, resolveActor } from "../lib/demoRole";

export const dismiss = mutation({
  args: { actor: demoActor, reminderId: v.id("reminders") },
  handler: async (ctx, { actor, reminderId }) => {
    const resolved = await resolveActor(ctx, actor);
    const reminder = await ctx.db.get(reminderId);
    if (!reminder || reminder.recipientId !== resolved.employee?._id) {
      throw new Error("To przypomnienie nie należy do Ciebie.");
    }
    await ctx.db.patch(reminderId, { dismissedAt: Date.now() });
  },
});

// HR nudges the evaluator of a review by hand.
export const sendManual = mutation({
  args: {
    actor: demoActor,
    reviewId: v.id("reviews"),
    message: v.string(),
    dueDate: v.string(),
  },
  handler: async (ctx, { actor, reviewId, message, dueDate }) => {
    const resolved = await resolveActor(ctx, actor);
    if (resolved.role !== "hr" && resolved.role !== "admin") {
      throw new Error("Ręczne przypomnienia wysyłają kadry.");
    }
    if (!message.trim())
      throw new Error("Treść przypomnienia nie może być pusta.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate))
      throw new Error("Oczekiwano daty RRRR-MM-DD.");
    const review = await ctx.db.get(reviewId);
    if (!review) throw new Error("Nie znaleziono oceny.");
    return await ctx.db.insert("reminders", {
      recipientId: review.evaluatorId,
      reviewId,
      kind: "manual",
      stage: review.stage,
      dueDate,
      message: message.trim(),
      createdAt: Date.now(),
      sentAt: Date.now(),
    });
  },
});
