import { ConvexError, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { demoActor, resolveActor } from "../lib/demoRole";
import { STAGE_LABELS } from "../reviews/stages";
import type { ReviewStage } from "../rules/types";
import { canReadSelfNotes, requireEmployee } from "./access";

const EXPECTATION_STAGES: ReviewStage[] = [
  "opening",
  "observation",
  "evaluation",
  "writing",
  "signing",
  "objection_window",
  "objection",
  "closed",
];
const ASSESSMENT_STAGES: ReviewStage[] = [
  "signing",
  "objection_window",
  "objection",
  "closed",
];

const summary = (review: Doc<"reviews">) => ({
  _id: review._id,
  sheet: review.sheet ?? null,
  stage: review.stage,
  stageLabel: STAGE_LABELS[review.stage],
  periodStart: review.periodStart ?? null,
  periodEnd: review.periodEnd ?? null,
  dueDate: review.dueDate ?? null,
  createdAt: review.createdAt,
});

export const list = query({
  args: { actor: demoActor },
  handler: async (ctx, { actor }) => {
    const me = requireEmployee(await resolveActor(ctx, actor));
    const rows = await ctx.db
      .query("reviews")
      .withIndex("by_employee", (q) => q.eq("employeeId", me._id))
      .collect();
    return rows.map(summary).sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Only fields the reviewed person may see at the review's current stage; drafts of the evaluator stay out.
export const get = query({
  args: { actor: demoActor, reviewId: v.id("reviews") },
  handler: async (ctx, { actor, reviewId }) => {
    const me = requireEmployee(await resolveActor(ctx, actor));
    const review = await ctx.db.get(reviewId);
    if (!review || review.employeeId !== me._id) {
      throw new ConvexError("Nie masz dostępu do tej oceny.");
    }
    const evaluator = await ctx.db.get(review.evaluatorId);
    const showExpectations = EXPECTATION_STAGES.includes(review.stage);
    const showAssessment = ASSESSMENT_STAGES.includes(review.stage);
    return {
      ...summary(review),
      evaluatorName: evaluator
        ? `${evaluator.firstName} ${evaluator.lastName}`
        : null,
      expectations: showExpectations ? (review.expectations ?? []) : [],
      assessment: showAssessment
        ? {
            ratings: review.ratings ?? [],
            averageScore: review.averageScore ?? null,
            overallResult: review.overallResult ?? null,
            overallLevelId: review.overallLevelId ?? null,
            overallJustification: review.overallJustification ?? null,
            developmentPlan: review.developmentPlan ?? null,
          }
        : null,
    };
  },
});

export const selfNotes = query({
  args: { actor: demoActor, employeeId: v.optional(v.id("employees")) },
  handler: async (ctx, { actor, employeeId }) => {
    const resolved = await resolveActor(ctx, actor);
    if (!canReadSelfNotes(resolved)) {
      throw new ConvexError("Notatki własne są prywatne.");
    }
    const owner =
      resolved.role === "employee" ? resolved.employee?._id : employeeId;
    if (!owner) throw new ConvexError("Wskaż pracownika.");
    if (resolved.role === "employee" && employeeId && employeeId !== owner) {
      throw new ConvexError("Nie masz dostępu do tych notatek.");
    }
    const notes = await ctx.db
      .query("selfNotes")
      .withIndex("by_employee", (q) => q.eq("employeeId", owner))
      .collect();
    return notes.sort((a, b) => b.createdAt - a.createdAt);
  },
});
