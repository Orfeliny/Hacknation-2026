import { v } from "convex/values";
import { query } from "../_generated/server";
import { criterionId } from "../lib/validators";
import { developmentLevel } from "./constants";
import { matchOptions } from "./suggestCore";

// The interface for the IPRZ (#15) and HR partner (#16) modules. Open to every role: entries hold no
// personal data. Active entries only, each with the criteria it matched and a reason.
export const suggestForArea = query({
  args: {
    criterionIds: v.array(criterionId),
    level: v.optional(developmentLevel),
  },
  handler: async (ctx, { criterionIds, level }) => {
    const rows = await ctx.db.query("developmentOptions").collect();
    return matchOptions(rows, criterionIds, level);
  },
});
