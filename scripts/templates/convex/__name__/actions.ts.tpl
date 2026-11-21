import { api } from "../_generated/api";
import { action } from "../_generated/server";

export const count = action({
  args: {},
  handler: async (ctx): Promise<{ total: number }> => {
    const entries = await ctx.runQuery(api.__name__.queries.list, {});
    return { total: entries.length };
  },
});
