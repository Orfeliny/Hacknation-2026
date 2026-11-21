import { internalMutation } from "../_generated/server";
import { SEED_ADVICE } from "./adviceSeedData";

// Starter articles for the demo. Idempotent: an article whose slug is already stored is skipped.
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    for (const article of SEED_ADVICE) {
      const stored = await ctx.db
        .query("adviceArticles")
        .withIndex("by_slug", (q) => q.eq("slug", article.slug))
        .first();
      if (stored) continue;
      await ctx.db.insert("adviceArticles", article);
      inserted += 1;
    }
    return { inserted, total: SEED_ADVICE.length };
  },
});
