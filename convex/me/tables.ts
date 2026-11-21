import { defineTable } from "convex/server";
import { v } from "convex/values";

export const meTables = {
  // Readable by the employee and HR only, never by the supervisor (D11).
  selfNotes: defineTable({
    employeeId: v.id("employees"),
    text: v.string(),
    createdAt: v.number(),
    reviewId: v.optional(v.id("reviews")),
  }).index("by_employee", ["employeeId"]),
};
