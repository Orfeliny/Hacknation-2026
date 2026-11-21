import { defineTable } from "convex/server";
import { v } from "convex/values";

export const draftingTables = {
  drafts: defineTable({
    reviewId: v.id("reviews"),
    section: v.union(
      v.literal("criterion_justification"),
      v.literal("strength"),
      v.literal("development_area"),
      v.literal("development_action"),
      v.literal("feedback_tip"),
    ),
    text: v.string(),
    status: v.union(
      v.literal("proposed"),
      v.literal("accepted"),
      v.literal("edited"),
      v.literal("rejected"),
    ),
    createdAt: v.number(),
    criterionId: v.optional(v.string()),
    observationIds: v.optional(v.array(v.id("observations"))),
    noEvidence: v.optional(v.boolean()),
    inconsistency: v.optional(v.string()),
    relatedDraftId: v.optional(v.id("drafts")),
    updatedAt: v.optional(v.number()),
  }).index("by_review", ["reviewId"]),
};
