import { defineTable } from "convex/server";
import { v } from "convex/values";
import { isoDate } from "../lib/validators";

export const hrDashboardTables = {
  reminders: defineTable({
    recipientId: v.id("employees"),
    kind: v.union(
      v.literal("upcoming"),
      v.literal("overdue"),
      v.literal("manual"),
      // A recommendation to give ongoing feedback, not a deadline (HR standards, not the regulation).
      v.literal("feedback_nudge"),
    ),
    dueDate: isoDate,
    message: v.string(),
    createdAt: v.number(),
    reviewId: v.optional(v.id("reviews")),
    firstReviewId: v.optional(v.id("firstReviews")),
    stage: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    dismissedAt: v.optional(v.number()),
  })
    .index("by_recipient", ["recipientId"])
    .index("by_review_stage_kind", ["reviewId", "stage", "kind"])
    .index("by_firstReview_stage_kind", ["firstReviewId", "stage", "kind"]),
};
