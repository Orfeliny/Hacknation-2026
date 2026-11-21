import { internalMutation } from "../_generated/server";
import { SEED_OPTIONS } from "./optionsSeedData";

// Starter catalog for the demo. Idempotent: an entry whose title is already stored is skipped.
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const stored = new Set(
      (await ctx.db.query("developmentOptions").collect()).map((o) => o.title),
    );
    let inserted = 0;
    for (const option of SEED_OPTIONS) {
      if (stored.has(option.title)) continue;
      await ctx.db.insert("developmentOptions", option);
      inserted += 1;
    }
    return { inserted, total: SEED_OPTIONS.length };
  },
});
