import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import { demoActor, resolveActor } from "../lib/demoRole";

// A changed changeDate after the first check marks the act as changed until HR acknowledges it.
export const record = internalMutation({
  args: { eliId: v.string(), title: v.string(), changeDate: v.string() },
  handler: async (ctx, { eliId, title, changeDate }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("regulationWatch")
      .withIndex("by_eliId", (q) => q.eq("eliId", eliId))
      .unique();
    if (!existing) {
      await ctx.db.insert("regulationWatch", {
        eliId,
        title,
        checkedAt: now,
        lastChangeDate: changeDate,
      });
      return { changed: false };
    }
    const changed =
      existing.lastChangeDate !== undefined &&
      existing.lastChangeDate !== changeDate;
    await ctx.db.patch(existing._id, {
      title,
      checkedAt: now,
      lastChangeDate: changeDate,
      ...(changed && { changeDetectedAt: now, acknowledgedAt: undefined }),
    });
    return { changed };
  },
});

export const acknowledge = mutation({
  args: { actor: demoActor, eliId: v.string() },
  handler: async (ctx, { actor, eliId }) => {
    const resolved = await resolveActor(ctx, actor);
    if (resolved.role !== "hr" && resolved.role !== "admin") {
      throw new Error(
        "Zmianę przepisów potwierdzają kadry albo administrator.",
      );
    }
    const row = await ctx.db
      .query("regulationWatch")
      .withIndex("by_eliId", (q) => q.eq("eliId", eliId))
      .unique();
    if (!row) throw new Error("Ten akt nie jest obserwowany.");
    await ctx.db.patch(row._id, { acknowledgedAt: Date.now() });
  },
});
