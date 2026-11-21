import { defineTable } from "convex/server";
import { v } from "convex/values";

export const mailTables = {
  mailMessages: defineTable({
    recipientId: v.id("employees"),
    kind: v.union(
      v.literal("cycle_started"),
      v.literal("meeting_invitation"),
      v.literal("reminder"),
      v.literal("deadline_notice"),
      v.literal("assessment_ready"),
      v.literal("review_changed"),
      v.literal("objection"),
      v.literal("promotion"),
      v.literal("other"),
    ),
    subject: v.string(),
    body: v.string(),
    channel: v.union(v.literal("demo_inbox"), v.literal("smtp")),
    status: v.union(
      v.literal("queued"),
      v.literal("sent"),
      v.literal("failed"),
    ),
    createdAt: v.number(),
    reviewId: v.optional(v.id("reviews")),
    conversationId: v.optional(v.id("conversations")),
    reminderId: v.optional(v.id("reminders")),
    ics: v.optional(v.string()),
    dedupeKey: v.optional(v.string()),
    error: v.optional(v.string()),
    sentAt: v.optional(v.number()),
  })
    .index("by_recipient", ["recipientId"])
    .index("by_dedupeKey", ["dedupeKey"])
    .index("by_review", ["reviewId"]),
};
