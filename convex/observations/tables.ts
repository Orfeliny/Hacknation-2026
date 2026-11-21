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
  })
    .index("by_employee_date", ["employeeId", "date"])
    .index("by_author", ["authorId"]),
};
