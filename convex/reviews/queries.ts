import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { query, type QueryCtx } from "../_generated/server";
import { fullName } from "../employees/access";
import { demoActor, resolveActor, type ResolvedActor } from "../lib/demoRole";
import {
  computeAssessment,
  criteriaForSheet,
  pickSheet,
  ratingScale,
} from "../rules/assessment";
import { daysBetween } from "../rules/dates";
import { RULES_2016 } from "../rules/pack2016";
import { isSubjectToReview } from "../rules/validateReview";
import { canViewReview, isEvaluator, isReviewed } from "./access";
import { reviewContext, todayIso } from "./context";
import {
  EDITABLE_STAGES,
  STAGE_LABELS,
  blockingGaps,
  expectedCriteria,
  warnings,
} from "./stages";

export const list = query({
  args: { actor: demoActor },
  handler: async (ctx, { actor }) => {
    const resolved = await resolveActor(ctx, actor);
    const me = resolved.employee;
    let rows: Doc<"reviews">[];
    if (resolved.role === "employee") {
      rows = me
        ? await ctx.db
            .query("reviews")
            .withIndex("by_employee", (q) => q.eq("employeeId", me._id))
            .collect()
        : [];
    } else if (resolved.role === "supervisor") {
      rows = me
        ? await ctx.db
            .query("reviews")
            .withIndex("by_evaluator", (q) => q.eq("evaluatorId", me._id))
            .collect()
        : [];
    } else {
      rows = await ctx.db.query("reviews").collect();
    }
    return await Promise.all(
      rows
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(async (r) => {
          const employee = await ctx.db.get(r.employeeId);
          return {
            _id: r._id,
            employeeName: employee ? fullName(employee) : "?",
            stage: r.stage,
            stageLabel: STAGE_LABELS[r.stage],
            sheet: r.sheet,
            dueDate: r.dueDate,
          };
        }),
    );
  },
});

export async function startableEmployees(
  ctx: QueryCtx,
  actor: ResolvedActor,
): Promise<Doc<"employees">[]> {
  let rows: Doc<"employees">[] = [];
  const me = actor.employee;
  if (actor.role === "hr" || actor.role === "admin") {
    rows = await ctx.db.query("employees").collect();
  } else if (actor.role !== "employee" && me) {
    rows = await ctx.db
      .query("employees")
      .withIndex("by_supervisor", (q) => q.eq("supervisorId", me._id))
      .collect();
  }
  const result: Doc<"employees">[] = [];
  for (const e of rows) {
    if (
      e.archivedAt !== undefined ||
      e.supervisorId === undefined ||
      !isSubjectToReview(e)
    ) {
      continue;
    }
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_employee", (q) => q.eq("employeeId", e._id))
      .collect();
    if (reviews.every((r) => r.stage === "closed")) result.push(e);
  }
  return result;
}

export const candidates = query({
  args: { actor: demoActor },
  handler: async (ctx, { actor }) => {
    const resolved = await resolveActor(ctx, actor);
    const rows = await startableEmployees(ctx, resolved);
    return rows.map((e) => ({
      _id: e._id,
      name: fullName(e),
      position: e.position,
      sheet: pickSheet(e.positionKind ?? "non_managerial"),
    }));
  },
});

export const get = query({
  args: { actor: demoActor, reviewId: v.id("reviews") },
  handler: async (ctx, { actor, reviewId }) => {
    const resolved = await resolveActor(ctx, actor);
    const review = await ctx.db.get(reviewId);
    if (!review || !canViewReview(resolved, review)) return null;
    const employee = await ctx.db.get(review.employeeId);
    const evaluator = await ctx.db.get(review.evaluatorId);
    if (!employee || !evaluator) return null;
    const today = todayIso();
    const context = await reviewContext(ctx, review, employee, today);
    const rules = RULES_2016;
    const expected = new Set(expectedCriteria(review, rules));
    const criteria = review.sheet
      ? criteriaForSheet(review.sheet, rules).map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          kind: c.kind,
          expected: expected.has(c.id),
        }))
      : [];
    const ratings = review.ratings ?? [];
    const allRated =
      expected.size > 0 &&
      [...expected].every((id) => ratings.some((r) => r.criterionId === id));
    const preview = allRated
      ? computeAssessment(
          ratings
            .filter((r) => expected.has(r.criterionId))
            .map((r) => Number(r.levelId)),
          { isOfficial: employee.corpsRole === "official" },
          rules,
        )
      : null;
    const evaluatorHere = isEvaluator(resolved, review);
    const employeeHere = isReviewed(resolved, review);
    const signed = (
      role: "evaluator" | "employee",
      scope: "part_one" | "assessment",
    ) =>
      (review.signatures ?? []).some(
        (s) => s.role === role && (s.scope ?? "assessment") === scope,
      );
    const editable = EDITABLE_STAGES.includes(review.stage);
    return {
      review,
      employee,
      evaluator,
      stageLabel: STAGE_LABELS[review.stage],
      criteria,
      scale: ratingScale(rules).levels,
      maxAdditional: rules.maxAdditionalCriteria,
      gaps: blockingGaps(review, employee, context, rules),
      warnings: warnings(review, employee, context, rules),
      preview: preview && {
        average: preview.average,
        result: preview.result,
        levelLabel:
          rules.overallLevels.find((l) => l.id === preview.levelId)?.label ??
          preview.levelId,
        promotionRequestAllowed: preview.promotionRequestAllowed,
      },
      daysLeft: review.dueDate ? daysBetween(today, review.dueDate) : null,
      can: {
        edit: evaluatorHere && editable,
        advance: evaluatorHere && editable,
        signPartOne:
          review.stage === "opening" &&
          ((evaluatorHere && !signed("evaluator", "part_one")) ||
            (employeeHere && !signed("employee", "part_one"))),
        signAssessment:
          review.stage === "signing" &&
          ((evaluatorHere && !signed("evaluator", "assessment")) ||
            (employeeHere &&
              signed("evaluator", "assessment") &&
              !signed("employee", "assessment"))),
        close:
          review.stage === "objection_window" &&
          (evaluatorHere ||
            resolved.role === "hr" ||
            resolved.role === "admin"),
        asEmployee: employeeHere,
      },
    };
  },
});
