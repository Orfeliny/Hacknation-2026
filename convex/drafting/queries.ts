import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalQuery, query, type QueryCtx } from "../_generated/server";
import { demoActor, resolveActor, type ResolvedActor } from "../lib/demoRole";
import { canReadObservation } from "../observations/access";
import { criteriaForSheet, ratingScale } from "../rules/assessment";
import { requireEvaluator } from "./access";
import { denied, NO_RATINGS, ONLY_EVALUATOR } from "./errors";

export const MAX_OBSERVATIONS = 40;
const MAX_OBSERVATION_CHARS = 400;
const SNIPPET_CHARS = 300;

const cut = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

export function ratedCriteria(review: Doc<"reviews">) {
  const names = new Map(
    review.sheet
      ? criteriaForSheet(review.sheet).map((c) => [c.id, c.name])
      : [],
  );
  const scale = new Map(ratingScale().levels.map((l) => [l.id, l.label]));
  return (review.ratings ?? []).map((rating) => ({
    criterionId: rating.criterionId,
    name: names.get(rating.criterionId) ?? rating.criterionId,
    points: Number(rating.levelId),
    label: scale.get(rating.levelId) ?? rating.levelId,
  }));
}

// D11: only observations the evaluator may read, from the start of the review period, newest first.
async function readableObservations(
  ctx: Pick<QueryCtx, "db">,
  actor: ResolvedActor,
  review: Doc<"reviews">,
) {
  const rows = await ctx.db
    .query("observations")
    .withIndex("by_employee_date", (q) => q.eq("employeeId", review.employeeId))
    .collect();
  return rows
    .filter(
      (o) =>
        canReadObservation(actor, o) &&
        (!review.periodStart || o.date >= review.periodStart),
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_OBSERVATIONS);
}

async function loadReview(
  ctx: Pick<QueryCtx, "db">,
  actor: ResolvedActor,
  reviewId: Doc<"reviews">["_id"],
) {
  const review = await ctx.db.get(reviewId);
  if (!review) throw denied(ONLY_EVALUATOR);
  requireEvaluator(actor, review);
  return review;
}

// The page: the drafts of one review, the ratings they rest on and the observations they cite.
export const listForReview = query({
  args: { actor: demoActor, reviewId: v.id("reviews") },
  handler: async (ctx, { actor, reviewId }) => {
    const resolved = await resolveActor(ctx, actor);
    const review = await loadReview(ctx, resolved, reviewId);
    const employee = await ctx.db.get(review.employeeId);
    const drafts = (
      await ctx.db
        .query("drafts")
        .withIndex("by_review", (q) => q.eq("reviewId", reviewId))
        .collect()
    ).sort((a, b) => a.createdAt - b.createdAt);
    const cited = new Set(drafts.flatMap((d) => d.observationIds ?? []));
    const evidence = [];
    for (const id of cited) {
      const observation = await ctx.db.get(id);
      if (observation && canReadObservation(resolved, observation)) {
        evidence.push({
          id: observation._id,
          date: observation.date,
          sentiment: observation.sentiment,
          criterionId: observation.criterionId ?? null,
          text: cut(observation.text, SNIPPET_CHARS),
        });
      }
    }
    return {
      review: {
        id: review._id,
        stage: review.stage,
        sheet: review.sheet ?? null,
        employeeName: employee
          ? `${employee.firstName} ${employee.lastName}`
          : "",
      },
      ratings: ratedCriteria(review),
      drafts,
      evidence,
    };
  },
});

// For the generate action: authorises the evaluator and returns what the model may see. Refuses a
// review with no ratings, so a draft is never built before the evaluator chose them.
export const draftContext = internalQuery({
  args: { actor: demoActor, reviewId: v.id("reviews") },
  handler: async (ctx, { actor, reviewId }) => {
    const resolved = await resolveActor(ctx, actor);
    const review = await loadReview(ctx, resolved, reviewId);
    const ratings = ratedCriteria(review);
    if (ratings.length === 0) throw denied(NO_RATINGS);
    const employee = await ctx.db.get(review.employeeId);
    const evaluator = await ctx.db.get(review.evaluatorId);
    if (!employee || !evaluator) throw denied(ONLY_EVALUATOR);
    const observations = await readableObservations(ctx, resolved, review);
    return {
      reviewId: review._id,
      evaluatorId: review.evaluatorId,
      employeeId: review.employeeId,
      employee: { firstName: employee.firstName, lastName: employee.lastName },
      evaluator: {
        firstName: evaluator.firstName,
        lastName: evaluator.lastName,
      },
      ratings,
      observations: observations.map((o, index) => ({
        label: `O${index + 1}`,
        id: o._id,
        date: o.date,
        sentiment: o.sentiment,
        criterionId: o.criterionId ?? null,
        text: cut(o.text, MAX_OBSERVATION_CHARS),
      })),
    };
  },
});
