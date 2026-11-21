import { defineTable } from "convex/server";
import { v } from "convex/values";
import { isoDate } from "../lib/validators";

export const observationsTables = {
  observations: defineTable({
    employeeId: v.id("employees"),
    authorId: v.id("employees"),
    date: isoDate,
    text: v.string(),
    sentiment: v.union(
      v.literal("positive"),
      v.literal("development"),
      v.literal("neutral"),
    ),
    createdAt: v.number(),
    criterionId: v.optional(v.string()),
    wellbeing: v.optional(v.boolean()),
    // Only the author sees an observation; handing it to the next evaluator needs the author's consent.
    handover: v.optional(
      v.object({
        toEvaluatorId: v.id("employees"),
        consentedAt: v.number(),
        reviewId: v.optional(v.id("reviews")),
      }),
    ),
  })
    .index("by_employee_date", ["employeeId", "date"])
    .index("by_author", ["authorId"])
    .index("by_handover_to", ["handover.toEvaluatorId"]),
};
