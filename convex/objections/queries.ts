import { ConvexError, v } from "convex/values";
import { query } from "../_generated/server";
import { fullName } from "../employees/access";
import { demoActor, resolveActor } from "../lib/demoRole";
import { canViewReview, isReviewed } from "../reviews/access";
import { todayIso } from "../reviews/context";
import { compareDates } from "../rules/dates";
import { RULES_2016 } from "../rules/pack2016";
import {
  acknowledgedAt,
  canFile,
  COURT_APPEAL_DAYS,
  decisionDeadline,
  filingDeadline,
} from "./rules";

export const forReview = query({
  args: { actor: demoActor, reviewId: v.id("reviews") },
  handler: async (ctx, { actor, reviewId }) => {
    const resolved = await resolveActor(ctx, actor);
    const review = await ctx.db.get(reviewId);
    if (!review || !canViewReview(resolved, review)) return null;
    const today = todayIso();
    const acknowledged = acknowledgedAt(review);
    const filing = canFile(review, today);
    const employeeHere = isReviewed(resolved, review);
    const objection = review.objection ?? null;
    const decided = objection?.decision !== undefined;
    const filedDeadline = objection
      ? decisionDeadline(objection.filedAt)
      : null;
    return {
      stage: review.stage,
      round: review.round ?? 1,
      acknowledgedAt: acknowledged ?? null,
      filingDeadline: acknowledged ? filingDeadline(acknowledged) : null,
      decisionDeadline: filedDeadline,
      objection,
      courtAppealDays:
        objection?.decision === "rejected" ? COURT_APPEAL_DAYS : null,
      can: {
        file: employeeHere && filing.allowed,
        fileBlockedReason:
          employeeHere && !filing.allowed && review.stage === "objection_window"
            ? filing.reason
            : null,
        decide:
          resolved.role === "director" &&
          review.stage === "objection" &&
          !decided,
      },
    };
  },
});

export const listForDirector = query({
  args: { actor: demoActor },
  handler: async (ctx, { actor }) => {
    const resolved = await resolveActor(ctx, actor);
    if (
      resolved.role !== "director" &&
      resolved.role !== "hr" &&
      resolved.role !== "admin"
    ) {
      throw new ConvexError(
        "Lista sprzeciwów jest dostępna dla dyrektora generalnego, kadr i administratora.",
      );
    }
    const today = todayIso();
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_stage", (q) => q.eq("stage", "objection"))
      .collect();
    const rows = await Promise.all(
      reviews
        .filter((r) => r.objection !== undefined)
        .map(async (r) => {
          const employee = await ctx.db.get(r.employeeId);
          const evaluator = await ctx.db.get(r.evaluatorId);
          const objection = r.objection!;
          const deadline = decisionDeadline(objection.filedAt);
          return {
            reviewId: r._id,
            employeeName: employee ? fullName(employee) : "?",
            position: employee?.position ?? "",
            unit: employee?.unit ?? "",
            evaluatorName: evaluator ? fullName(evaluator) : "",
            acknowledgedAt: acknowledgedAt(r) ?? null,
            round: r.round ?? 1,
            averageScore: r.averageScore ?? null,
            overallLevelLabel:
              RULES_2016.overallLevels.find((l) => l.id === r.overallLevelId)
                ?.label ?? null,
            overallJustification: r.overallJustification ?? null,
            text: objection.text,
            filedAt: objection.filedAt,
            decisionDeadline: deadline,
            overdue: compareDates(today, deadline) > 0,
          };
        }),
    );
    return rows.sort(
      (a, b) =>
        compareDates(a.decisionDeadline, b.decisionDeadline) ||
        a.filedAt - b.filedAt,
    );
  },
});
