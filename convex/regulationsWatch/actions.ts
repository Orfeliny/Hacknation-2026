import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action, internalAction, type ActionCtx } from "../_generated/server";
import { demoActor } from "../lib/demoRole";
import { WATCHED_ACTS, loadMetadata } from "./eli";

export type CheckResult = {
  eliId: string;
  ok: boolean;
  changed?: boolean;
  error?: string;
};

async function checkAll(ctx: ActionCtx): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  for (const act of WATCHED_ACTS) {
    try {
      const meta = await loadMetadata(act.eliId);
      const { changed } = await ctx.runMutation(
        internal.regulationsWatch.mutations.record,
        {
          eliId: act.eliId,
          title: act.title,
          changeDate: meta.changeDate,
        },
      );
      results.push({ eliId: act.eliId, ok: true, changed });
    } catch (error) {
      // A failed check keeps the last known state; the next run tries again.
      results.push({
        eliId: act.eliId,
        ok: false,
        error: error instanceof Error ? error.message : "Nieznany błąd",
      });
    }
  }
  return results;
}

// Daily from convex/crons.ts.
export const check = internalAction({
  args: {},
  handler: (ctx) => checkAll(ctx),
});

// "Sprawdź teraz" for HR and the admin.
export const checkNow = action({
  args: { actor: demoActor },
  handler: async (ctx, { actor }): Promise<CheckResult[]> => {
    const role = await ctx.runQuery(
      internal.regulationsWatch.queries.actorRole,
      { actor },
    );
    if (role !== "hr" && role !== "admin") {
      throw new Error(
        "Sprawdzenie przepisów uruchamiają kadry albo administrator.",
      );
    }
    return checkAll(ctx);
  },
});

// Demo: pretend an amendment was published, so the banner and acknowledgement can be shown
// without waiting for the real one. Works in any REGULATIONS_SOURCE mode.
export const simulateAmendment = action({
  args: { actor: demoActor, eliId: v.string() },
  handler: async (ctx, { actor, eliId }): Promise<{ changed: boolean }> => {
    const role = await ctx.runQuery(
      internal.regulationsWatch.queries.actorRole,
      { actor },
    );
    if (role !== "hr" && role !== "admin") {
      throw new Error(
        "Symulację zmiany przepisów uruchamiają kadry albo administrator.",
      );
    }
    const act = WATCHED_ACTS.find((a) => a.eliId === eliId);
    if (!act) throw new Error("Ten akt nie jest obserwowany.");
    await ctx.runMutation(internal.regulationsWatch.mutations.record, {
      eliId,
      title: act.title,
      changeDate: (await loadMetadata(eliId)).changeDate,
    });
    return await ctx.runMutation(internal.regulationsWatch.mutations.record, {
      eliId,
      title: act.title,
      changeDate: `symulacja-${new Date().toISOString()}`,
    });
  },
});
