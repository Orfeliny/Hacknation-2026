import { defineTable } from "convex/server";
import { v } from "convex/values";
import { forumThreadKind } from "../lib/contracts/forum";
import { criterionId } from "../lib/validators";

export const forumTables = {
  forumThreads: defineTable({
    kind: forumThreadKind,
    title: v.string(),
    body: v.string(),
    authorId: v.id("employees"),
    criterionId: v.optional(criterionId),
    createdAt: v.number(),
    replyCount: v.number(),
    reportedAt: v.optional(v.number()),
    hiddenAt: v.optional(v.number()),
    moderatedById: v.optional(v.id("employees")),
    moderatedAt: v.optional(v.number()),
  }),
  forumReplies: defineTable({
    threadId: v.id("forumThreads"),
    body: v.string(),
    authorId: v.id("employees"),
    createdAt: v.number(),
  }).index("by_thread", ["threadId"]),
};
