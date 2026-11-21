import { defineTable } from "convex/server";
import { v } from "convex/values";

export const meTables = {
  selfNotes: defineTable({
    employeeId: v.id("employees"),
    text: v.string(),
    createdAt: v.number(),
    reviewId: v.optional(v.id("reviews")),
    sharedAt: v.optional(v.number()),
  }).index("by_employee", ["employeeId"]),
};
