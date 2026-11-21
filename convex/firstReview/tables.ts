import { defineTable } from "convex/server";
import { v } from "convex/values";
import { isoDate, signature, stageEntry } from "../lib/validators";

export const firstReviewTables = {
  firstReviews: defineTable({
    employeeId: v.id("employees"),
    evaluatorId: v.id("employees"),
    // Stages are owned by #21.
    stage: v.string(),
    createdAt: v.number(),
    rulesVersion: v.optional(v.string()),
    startDate: v.optional(isoDate),
    dueDate: v.optional(isoDate),
    result: v.optional(v.union(v.literal("positive"), v.literal("negative"))),
    signatures: v.optional(v.array(signature)),
    stageHistory: v.optional(v.array(stageEntry)),
    closedAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_employee", ["employeeId"])
    .index("by_evaluator", ["evaluatorId"]),
};
