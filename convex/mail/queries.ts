import { v } from "convex/values";
import { query } from "../_generated/server";
import { demoActor, resolveActor } from "../lib/demoRole";

// Demo inbox: what the current persona would have received by e-mail.
export const inbox = query({
  args: { actor: demoActor },
  handler: async (ctx, { actor }) => {
    const resolved = await resolveActor(ctx, actor);
    const me = resolved.employee?._id;
    if (!me) return [];
    const rows = await ctx.db
      .query("mailMessages")
      .withIndex("by_recipient", (q) => q.eq("recipientId", me))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// The .ics of a conversation for "Dodaj do kalendarza"; only its two participants may get it.
export const conversationIcs = query({
  args: { actor: demoActor, conversationId: v.id("conversations") },
  handler: async (ctx, { actor, conversationId }) => {
    const resolved = await resolveActor(ctx, actor);
    const conversation = await ctx.db.get(conversationId);
    const me = resolved.employee?._id;
    if (!conversation || !me) return null;
    if (conversation.authorId !== me && conversation.employeeId !== me)
      return null;
    const latest = await ctx.db
      .query("mailMessages")
      .withIndex("by_review", (q) => q.eq("reviewId", conversation.reviewId))
      .collect();
    const withIcs = latest
      .filter((m) => m.conversationId === conversationId && m.ics)
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    return withIcs?.ics ?? null;
  },
});
