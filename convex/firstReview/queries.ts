import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { query, type QueryCtx } from "../_generated/server";
import { fullName } from "../employees/access";
import { demoActor, resolveActor, type ResolvedActor } from "../lib/demoRole";
import { todayIso } from "../reviews/context";
import {
  canRecordForEmployee,
  canViewFirstReview,
  isFirstReviewEvaluator,
  isFirstReviewed,
} from "./access";
import { STAGE_LABELS, hasSigned, stageOf } from "./flow";
import {
  FIRST_REVIEW_RULES,
  computeFirstReviewWindow,
  timingWarning,
} from "./rules";

export async function startableNewEmployees(
  ctx: Pick<QueryCtx, "db">,
  actor: ResolvedActor,
): Promise<Doc<"employees">[]> {
  const me = actor.employee;
  const canStart = actor.role === "supervisor" || canRecordForEmployee(actor);
  if (!canStart) return [];
  const all = await ctx.db.query("employees").collect();
  const open = new Set(
    (await ctx.db.query("firstReviews").collect())
      .filter((r) => r.stage !== "closed")
      .map((r) => r.employeeId),
  );
  return all.filter(
    (e) =>
      e.isNewToCivilService === true &&
      e.archivedAt === undefined &&
      e.supervisorId !== undefined &&
      !open.has(e._id) &&
      (actor.role !== "supervisor" || e.supervisorId === me?._id),
  );
}

export const candidates = query({
  args: { actor: demoActor },
  handler: async (ctx, { actor }) => {
    const resolved = await resolveActor(ctx, actor);
    const rows = await startableNewEmployees(ctx, resolved);
    return rows.map((e) => ({
      _id: e._id,
      name: fullName(e),
      position: e.position,
      employmentStart: e.indefiniteEmploymentSince ?? null,
    }));
  },
});

export const list = query({
  args: { actor: demoActor },
  handler: async (ctx, { actor }) => {
    const resolved = await resolveActor(ctx, actor);
    const all = await ctx.db.query("firstReviews").collect();
    const visible = all.filter((r) => canViewFirstReview(resolved, r));
    return Promise.all(
      visible.map(async (r) => {
        const employee = await ctx.db.get(r.employeeId);
        return {
          _id: r._id,
          employeeName: employee ? fullName(employee) : "?",
          stage: r.stage,
          stageLabel: STAGE_LABELS[stageOf(r)],
          dueDate: r.dueDate ?? null,
          result: r.result ?? null,
        };
      }),
    );
  },
});

export const get = query({
  args: { actor: demoActor, firstReviewId: v.id("firstReviews") },
  handler: async (ctx, { actor, firstReviewId }) => {
    const resolved = await resolveActor(ctx, actor);
    const row = await ctx.db.get(firstReviewId);
    if (!row || !canViewFirstReview(resolved, row)) return null;
    const employee = await ctx.db.get(row.employeeId);
    const stage = stageOf(row);
    const window =
      row.startDate !== undefined
        ? { ...computeFirstReviewWindow(row.startDate), latest: row.dueDate }
        : null;
    const rules = FIRST_REVIEW_RULES;
    return {
      _id: row._id,
      employeeName: employee ? fullName(employee) : "?",
      position: employee?.position ?? "",
      stage,
      stageLabel: STAGE_LABELS[stage],
      startDate: row.startDate ?? null,
      dueDate: row.dueDate ?? null,
      window,
      warning: window ? (timingWarning(todayIso(), window) ?? null) : null,
      result: row.result ?? null,
      effect: row.result ? rules.effects[row.result] : null,
      elements: rules.elements,
      effectsSource: rules.sources.effects,
      signatures: (row.signatures ?? []).map((s) => ({
        role: s.role,
        signedAt: s.signedAt,
        place: s.place ?? null,
        onBehalf: s.deemedById !== undefined,
      })),
      you: {
        isEvaluator: isFirstReviewEvaluator(resolved, row),
        isReviewed: isFirstReviewed(resolved, row),
        canRecordForEmployee: canRecordForEmployee(resolved),
        evaluatorSigned: hasSigned(row, "evaluator"),
        employeeSigned: hasSigned(row, "employee"),
      },
    };
  },
});
