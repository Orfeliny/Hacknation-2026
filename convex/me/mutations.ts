import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import { demoActor, resolveActor } from "../lib/demoRole";

export const MAX_NOTE_LENGTH = 1000;

export const addNote = mutation({
  args: {
    actor: demoActor,
    text: v.string(),
    reviewId: v.optional(v.id("reviews")),
  },
  handler: async (ctx, { actor, text, reviewId }) => {
    const resolved = await resolveActor(ctx, actor);
    if (resolved.role !== "employee" || !resolved.employee) {
      throw new ConvexError("Notatki dodaje pracownik oceniany.");
    }
    const me = resolved.employee._id;
    const trimmed = text.trim();
    if (trimmed.length < 1 || trimmed.length > MAX_NOTE_LENGTH) {
      throw new ConvexError(
        `Notatka musi mieć 1–${MAX_NOTE_LENGTH} znaków po przycięciu.`,
      );
    }
    if (reviewId) {
      const review = await ctx.db.get(reviewId);
      if (!review || review.employeeId !== me) {
        throw new ConvexError("Tej oceny nie widzisz.");
      }
    }
    return await ctx.db.insert("selfNotes", {
      employeeId: me,
      text: trimmed,
      createdAt: Date.now(),
      reviewId,
    });
  },
});
