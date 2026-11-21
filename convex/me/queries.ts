import { ConvexError, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { query, type QueryCtx } from "../_generated/server";
import { fullName } from "../employees/access";
import { demoActor, resolveActor, type ResolvedActor } from "../lib/demoRole";

const ASSESSMENT_STAGES = ["signing", "objection_window", "closed"];

// Null when the deployment has no employee with the "employee" demo persona (e.g. unseeded).
function employeeOf(actor: ResolvedActor): Doc<"employees"> | null {
  if (actor.role !== "employee") {
    throw new ConvexError("Ten widok jest dla pracownika oceniany.");
  }
  return actor.employee;
}

async function toView(ctx: QueryCtx, review: Doc<"reviews">) {
  const showAssessment = ASSESSMENT_STAGES.includes(review.stage);
  return {
    _id: review._id,
    stage: review.stage,
    round: review.round ?? 1,
    periodStart: review.periodStart,
    periodEnd: review.periodEnd,
    dueDate: review.dueDate,
    openingConversationDate: review.openingConversationDate,
    evaluationConversationDate: review.evaluationConversationDate,
    expectations: review.expectations ?? [],
    developmentPlan: review.developmentPlan
      ? {
          summary: review.developmentPlan.summary,
          strengths: review.developmentPlan.strengths ?? [],
          areas: (review.developmentPlan.areas ?? []).map((a) => ({
            id: a.id,
            text: a.text,
          })),
          actions: (review.developmentPlan.actions ?? []).map((a) => ({
            kind: a.kind,
            text: a.text,
          })),
        }
      : null,
    assessment: showAssessment
      ? {
          overallResult: review.overallResult,
          overallLevelId: review.overallLevelId,
          overallJustification: review.overallJustification,
          ratings: (review.ratings ?? []).map((r) => ({
            criterionId: r.criterionId,
            levelId: r.levelId,
            justification: r.justification,
          })),
        }
      : null,
    signatures: (review.signatures ?? []).map((s) => ({
      role: s.role,
      scope: s.scope ?? "assessment",
      signedAt: s.signedAt,
      place: s.place,
    })),
    objection: review.objection
      ? {
          filedAt: review.objection.filedAt,
          decision: review.objection.decision,
          decidedAt: review.objection.decidedAt,
        }
      : null,
    endReason: review.endReason,
    evaluatorName: await evaluatorName(ctx, review.evaluatorId),
  };
}

async function evaluatorName(
  ctx: QueryCtx,
  evaluatorId: Doc<"reviews">["evaluatorId"],
): Promise<string | null> {
  const evaluator = await ctx.db.get(evaluatorId);
  return evaluator ? fullName(evaluator) : null;
}

export const myReviews = query({
  args: { actor: demoActor },
  handler: async (ctx, { actor }) => {
    const me = employeeOf(await resolveActor(ctx, actor));
    if (!me) return [];
    const rows = await ctx.db
      .query("reviews")
      .withIndex("by_employee", (q) => q.eq("employeeId", me._id))
      .collect();
    return Promise.all(rows.map((r) => toView(ctx, r)));
  },
});

export const myReview = query({
  args: { actor: demoActor, reviewId: v.id("reviews") },
  handler: async (ctx, { actor, reviewId }) => {
    const me = employeeOf(await resolveActor(ctx, actor));
    const review = await ctx.db.get(reviewId);
    if (!review || !me || review.employeeId !== me._id) {
      throw new ConvexError("Tej oceny nie widzisz.");
    }
    return toView(ctx, review);
  },
});

export const myNotes = query({
  args: { actor: demoActor },
  handler: async (ctx, { actor }) => {
    const me = employeeOf(await resolveActor(ctx, actor));
    if (!me) return [];
    const rows = await ctx.db
      .query("selfNotes")
      .withIndex("by_employee", (q) => q.eq("employeeId", me._id))
      .collect();
    return rows
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((n) => ({
        _id: n._id,
        text: n.text,
        createdAt: n.createdAt,
        reviewId: n.reviewId,
      }));
  },
});
