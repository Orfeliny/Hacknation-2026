import { defineTable } from "convex/server";
import { v } from "convex/values";

export const hrPartnerTables = {
  hrSignals: defineTable({
    employeeId: v.id("employees"),
    supervisorId: v.id("employees"),
    kind: v.union(
      v.literal("duties_change"),
      v.literal("workload"),
      v.literal("no_recognition"),
      v.literal("long_absence"),
      v.literal("supervisor_change"),
      v.literal("recognition_moment"),
    ),
    reason: v.string(),
    detectedAt: v.number(),
    status: v.optional(
      v.union(v.literal("open"), v.literal("dismissed"), v.literal("acted")),
    ),
    recommendations: v.optional(
      v.array(
        v.object({
          text: v.string(),
          kind: v.optional(
            v.union(
              v.literal("wellbeing"),
              v.literal("organizational"),
              v.literal("preventive"),
              v.literal("conversation"),
              v.literal("recognition"),
            ),
          ),
        }),
      ),
    ),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_employee", ["employeeId"])
    .index("by_supervisor", ["supervisorId"]),
};
