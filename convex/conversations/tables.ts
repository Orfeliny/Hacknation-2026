import { defineTable } from "convex/server";
import { v } from "convex/values";
import { isoDate } from "../lib/validators";

export const conversationsTables = {
  conversations: defineTable({
    employeeId: v.id("employees"),
    authorId: v.id("employees"),
    kind: v.union(
      v.literal("opening"),
      v.literal("evaluation"),
      v.literal("feedback"),
    ),
    createdAt: v.number(),
    reviewId: v.optional(v.id("reviews")),
    heldOn: v.optional(isoDate),
    plan: v.optional(
      v.object({
        goal: v.optional(v.string()),
        agenda: v.optional(v.array(v.string())),
        questions: v.optional(
          v.array(
            v.object({
              criterionId: v.optional(v.string()),
              text: v.string(),
            }),
          ),
        ),
        tips: v.optional(v.array(v.string())),
        difficultScenario: v.optional(v.string()),
      }),
    ),
    outcomes: v.optional(v.string()),
    // Calendar invitation (#37); a reschedule keeps icsUid and bumps icsSequence.
    scheduledAt: v.optional(v.number()),
    durationMinutes: v.optional(v.number()),
    location: v.optional(v.string()),
    icsUid: v.optional(v.string()),
    icsSequence: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_review", ["reviewId"])
    .index("by_employee", ["employeeId"])
    .index("by_author", ["authorId"]),
};
