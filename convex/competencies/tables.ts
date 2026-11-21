import { defineTable } from "convex/server";
import { v } from "convex/values";

export const competenciesTables = {
  competencyAssessments: defineTable({
    employeeId: v.id("employees"),
    assessorId: v.id("employees"),
    competencyId: v.string(),
    modelVersion: v.string(),
    createdAt: v.number(),
    reviewId: v.optional(v.id("reviews")),
    firstReviewId: v.optional(v.id("firstReviews")),
    criterionId: v.optional(v.string()),
    // No levelId means the behaviour was not observed.
    indicatorChoices: v.optional(
      v.array(
        v.object({ indicatorId: v.string(), levelId: v.optional(v.string()) }),
      ),
    ),
    suggestedLevel: v.optional(v.string()),
    finalLevel: v.optional(v.string()),
    deviationJustification: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_employee", ["employeeId"])
    .index("by_review", ["reviewId"])
    .index("by_firstReview", ["firstReviewId"]),
};
