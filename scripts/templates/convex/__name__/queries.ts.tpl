import { query } from "../_generated/server";

const MAX_ENTRIES = 50;

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("__name__")
      .withIndex("by_createdAt")
      .order("desc")
      .take(MAX_ENTRIES);
  },
});
