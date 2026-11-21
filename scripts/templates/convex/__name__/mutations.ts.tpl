import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import { MAX_ENTRY_LENGTH, MIN_ENTRY_LENGTH } from "./limits";

export const add = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    const text = args.text.trim();
    if (text.length < MIN_ENTRY_LENGTH || text.length > MAX_ENTRY_LENGTH) {
      throw new ConvexError(
        `Entry text must be ${MIN_ENTRY_LENGTH}-${MAX_ENTRY_LENGTH} characters after trimming`,
      );
    }
    return await ctx.db.insert("__name__", { text, createdAt: Date.now() });
  },
});
