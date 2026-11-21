import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import { demoActor, resolveActor } from "../lib/demoRole";
import { requireEmployee } from "./access";
import { SELF_NOTE_MAX_LENGTH } from "./limits";

export const addSelfNote = mutation({
  args: {
    actor: demoActor,
    text: v.string(),
    reviewId: v.optional(v.id("reviews")),
  },
  handler: async (ctx, { actor, text, reviewId }) => {
    const me = requireEmployee(await resolveActor(ctx, actor));
    const trimmed = text.trim();
    if (!trimmed) throw new ConvexError("Notatka jest pusta.");
    if (trimmed.length > SELF_NOTE_MAX_LENGTH) {
      throw new ConvexError(
        `Notatka może mieć najwyżej ${SELF_NOTE_MAX_LENGTH} znaków.`,
      );
    }
    if (reviewId) {
      const review = await ctx.db.get(reviewId);
      if (!review || review.employeeId !== me._id) {
        throw new ConvexError("Nie masz dostępu do tej oceny.");
      }
    }
    return ctx.db.insert("selfNotes", {
      employeeId: me._id,
      text: trimmed,
      createdAt: Date.now(),
      ...(reviewId ? { reviewId } : {}),
    });
  },
});
