import { internalQuery, query } from "../_generated/server";
import { demoActor, resolveActor } from "../lib/demoRole";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("regulationWatch").collect();
    return rows.map((row) => ({
      ...row,
      changed:
        row.changeDetectedAt !== undefined && row.acknowledgedAt === undefined,
    }));
  },
});

export const actorRole = internalQuery({
  args: { actor: demoActor },
  handler: async (ctx, { actor }) => (await resolveActor(ctx, actor)).role,
});
