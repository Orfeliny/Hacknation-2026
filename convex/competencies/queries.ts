import { v } from "convex/values";
import { query } from "../_generated/server";
import { demoActor, resolveActor } from "../lib/demoRole";
import { canReadObservation } from "../observations/access";
import { expectedCriteria } from "../reviews/stages";
import {
  audienceOf,
  finalVisibleToEmployee,
  isEditable,
  loadScope,
} from "./access";
import { refusal } from "./errors";
import { COMPETENCY_MODEL, findCompetency } from "./model";
import { linkOf, rowsFor, visibleRows } from "./rows";
import { assessmentView, modelSummary } from "./view";

// The model is reference data with no personal data, so every role may read it.
export const model = query({
  args: {},
  handler: () => ({
    ...modelSummary(),
    competencies: COMPETENCY_MODEL.competencies,
  }),
});

// One assessment: the competency with its indicators, the draft, the live suggestion and its
// explanation. Null when it does not exist or the caller may not see it.
export const get = query({
  args: { actor: demoActor, assessmentId: v.id("competencyAssessments") },
  handler: async (ctx, { actor, assessmentId }) => {
    const row = await ctx.db.get(assessmentId);
    if (!row) return null;
    const resolved = await resolveActor(ctx, actor);
    const scope = await loadScope(ctx.db, row.employeeId, linkOf(row));
    const audience = audienceOf(resolved, scope);
    if (!audience || visibleRows([row], audience, scope.context).length === 0) {
      return null;
    }
    return {
      model: modelSummary(),
      competency: findCompetency(row.competencyId) ?? null,
      assessment: assessmentView(row, audience),
      audience,
      can: { edit: audience === "assessor" && isEditable(scope.context) },
    };
  },
});

// Assessments of one employee within a periodic review, a first review, or outside any review.
export const listForEmployee = query({
  args: {
    actor: demoActor,
    employeeId: v.id("employees"),
    reviewId: v.optional(v.id("reviews")),
    firstReviewId: v.optional(v.id("firstReviews")),
  },
  handler: async (ctx, { actor, employeeId, reviewId, firstReviewId }) => {
    const resolved = await resolveActor(ctx, actor);
    const link = { reviewId, firstReviewId };
    const scope = await loadScope(ctx.db, employeeId, link);
    const audience = audienceOf(resolved, scope);
    if (!audience) {
      throw refusal(
        "Ocenę kompetencji widzi oceniający, kadry albo sam pracownik (tylko poziom końcowy).",
      );
    }
    const rows = await rowsFor(ctx.db, employeeId, link);
    return {
      audience,
      isDemo: COMPETENCY_MODEL.source === "demo",
      can: { edit: audience === "assessor" && isEditable(scope.context) },
      finalsVisible:
        audience !== "employee" || finalVisibleToEmployee(scope.context),
      assessments: visibleRows(rows, audience, scope.context).map((r) =>
        assessmentView(r, audience),
      ),
    };
  },
});

// For the review module: one entry per criterion of the review, with the final level the
// evaluator chose. The final level ids are the § 11 partial-scale ids of the model levels.
export const forReview = query({
  args: { actor: demoActor, reviewId: v.id("reviews") },
  handler: async (ctx, { actor, reviewId }) => {
    const review = await ctx.db.get(reviewId);
    if (!review) return null;
    const resolved = await resolveActor(ctx, actor);
    const scope = await loadScope(ctx.db, review.employeeId, { reviewId });
    const audience = audienceOf(resolved, scope);
    if (!audience) return null;
    const rows = visibleRows(
      await rowsFor(ctx.db, review.employeeId, { reviewId }),
      audience,
      scope.context,
    );
    return {
      reviewId,
      modelVersion: COMPETENCY_MODEL.modelVersion,
      isDemo: COMPETENCY_MODEL.source === "demo",
      audience,
      finalsVisible:
        audience !== "employee" || finalVisibleToEmployee(scope.context),
      criteria: expectedCriteria(review).map((criterionId) => {
        const row = rows.find((r) => r.criterionId === criterionId);
        return {
          criterionId,
          competencyId:
            COMPETENCY_MODEL.competencies.find(
              (c) => c.criterionId === criterionId,
            )?.id ?? null,
          assessment: row ? assessmentView(row, audience) : null,
        };
      }),
    };
  },
});

// The notes on the criterion behind the competency, under the D11 rules: the author and HR, the
// next evaluator after consent, never the employee and never notes about oneself. Observations
// are tagged per criterion, not per indicator, so the preview is per competency.
export const observations = query({
  args: { actor: demoActor, assessmentId: v.id("competencyAssessments") },
  handler: async (ctx, { actor, assessmentId }) => {
    const row = await ctx.db.get(assessmentId);
    if (!row) return null;
    const resolved = await resolveActor(ctx, actor);
    const scope = await loadScope(ctx.db, row.employeeId, linkOf(row));
    const audience = audienceOf(resolved, scope);
    if (audience !== "assessor" && audience !== "hr") {
      throw refusal("Obserwacje przełożonego nie są dostępne dla ocenianego.");
    }
    const context = scope.context;
    const from =
      context?.kind === "review"
        ? context.doc.periodStart
        : context?.doc.startDate;
    const to = context?.kind === "review" ? context.doc.periodEnd : undefined;
    const readable = (
      await ctx.db
        .query("observations")
        .withIndex("by_employee_date", (q) => {
          const byEmployee = q.eq("employeeId", row.employeeId);
          if (from && to) return byEmployee.gte("date", from).lte("date", to);
          if (from) return byEmployee.gte("date", from);
          if (to) return byEmployee.lte("date", to);
          return byEmployee;
        })
        .order("desc")
        .collect()
    ).filter((o) => canReadObservation(resolved, o) && !o.wellbeing);
    const criterionId = row.criterionId;
    return {
      criterionId: criterionId ?? null,
      from: from ?? null,
      to: to ?? null,
      items: readable
        .filter(
          (o) => criterionId !== undefined && o.criterionId === criterionId,
        )
        .map((o) => ({
          _id: o._id,
          date: o.date,
          text: o.text,
          sentiment: o.sentiment,
        })),
      untaggedCount: readable.filter((o) => o.criterionId === undefined).length,
    };
  },
});
