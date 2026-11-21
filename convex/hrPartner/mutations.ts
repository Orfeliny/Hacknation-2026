import { v } from "convex/values";
import { internalMutation, mutation } from "../_generated/server";
import { demoActor, resolveActor } from "../lib/demoRole";
import { isSupervisorOf, requireSupervisor } from "./access";
import { recommendation, signalKind } from "./kinds";
import { findRow, signalsFor } from "./signals";
import { todayIso } from "./time";

// The supervisor dismisses a signal or marks it as acted on ("docenione", "porozmawiane"). The row
// keeps the reason, so the signal stays hidden until new evidence changes the reason.
export const setStatus = mutation({
  args: {
    actor: demoActor,
    employeeId: v.id("employees"),
    kind: signalKind,
    reason: v.string(),
    status: v.union(v.literal("dismissed"), v.literal("acted")),
  },
  handler: async (ctx, { actor, employeeId, kind, reason, status }) => {
    const resolved = await resolveActor(ctx, actor);
    const me = requireSupervisor(resolved);
    const employee = await ctx.db.get(employeeId);
    if (!employee || !isSupervisorOf(resolved, employee)) {
      throw new Error("Sygnały widzi przełożony pracownika.");
    }
    const current = (
      await signalsFor(ctx, employee, todayIso(Date.now()))
    ).find((signal) => signal.kind === kind && signal.reason === reason);
    if (!current) throw new Error("Sygnał jest już nieaktualny.");
    const now = Date.now();
    const row = await findRow(ctx, employeeId, kind, reason);
    if (row) {
      await ctx.db.patch(row._id, { status, resolvedAt: now });
    } else {
      await ctx.db.insert("hrSignals", {
        employeeId,
        supervisorId: me._id,
        kind,
        reason,
        detectedAt: now,
        status,
        resolvedAt: now,
      });
    }
  },
});

// Called by the recommend action after the model answered.
export const saveRecommendations = internalMutation({
  args: {
    supervisorId: v.id("employees"),
    employeeId: v.id("employees"),
    kind: signalKind,
    reason: v.string(),
    recommendations: v.array(recommendation),
  },
  handler: async (
    ctx,
    { supervisorId, employeeId, kind, reason, recommendations },
  ) => {
    const row = await findRow(ctx, employeeId, kind, reason);
    if (row) {
      await ctx.db.patch(row._id, { recommendations });
      return row._id;
    }
    return await ctx.db.insert("hrSignals", {
      employeeId,
      supervisorId,
      kind,
      reason,
      detectedAt: Date.now(),
      status: "open",
      recommendations,
    });
  },
});
