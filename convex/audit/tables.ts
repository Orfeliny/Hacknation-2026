import { defineTable } from "convex/server";
import { v } from "convex/values";
import { demoRole } from "../lib/validators";

export const auditTables = {
  auditLog: defineTable({
    actorRole: demoRole,
    action: v.union(
      v.literal("view"),
      v.literal("create"),
      v.literal("update"),
      v.literal("stage_change"),
      v.literal("sign"),
      v.literal("export"),
      v.literal("correction"),
    ),
    entity: v.string(),
    entityId: v.string(),
    at: v.number(),
    actorId: v.optional(v.id("employees")),
    reviewId: v.optional(v.id("reviews")),
    details: v.optional(v.string()),
  })
    .index("by_review", ["reviewId"])
    .index("by_entity", ["entity", "entityId"]),
  aiInteractions: defineTable({
    module: v.string(),
    provider: v.string(),
    model: v.string(),
    // Stored after pseudonymisation (#28), never with names.
    sentPrompt: v.string(),
    output: v.string(),
    createdAt: v.number(),
    actorId: v.optional(v.id("employees")),
    employeeId: v.optional(v.id("employees")),
    reviewId: v.optional(v.id("reviews")),
    draftId: v.optional(v.id("drafts")),
    decision: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("edited"),
        v.literal("rejected"),
      ),
    ),
    decidedAt: v.optional(v.number()),
  })
    .index("by_review", ["reviewId"])
    .index("by_employee", ["employeeId"]),
};
