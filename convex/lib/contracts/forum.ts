import { v, type Infer } from "convex/values";
import { demoActor } from "../demoRole";
import { criterionId } from "../validators";

// B5 Forum. Backend: convex/forum/{queries,mutations}.ts. Tables: `forumThreads`, `forumReplies`
// (index `by_thread`). Access for the whole package: every role whose demo persona resolves to
// an employee may read, post, reply and report. Rows carry author name and unit, never an id the
// UI must resolve.

export const FORUM_LIMITS = {
  title: 150,
  body: 5000,
  reply: 3000,
  excerpt: 200,
} as const;

export const forumThreadKind = v.union(
  v.literal("question"),
  v.literal("recommendation"),
  v.literal("offer"),
  v.literal("seeking_mentor"),
);

export const forumThreadRow = v.object({
  threadId: v.id("forumThreads"),
  kind: forumThreadKind,
  title: v.string(),
  excerpt: v.string(),
  authorName: v.string(),
  authorUnit: v.string(),
  criterionId: v.optional(criterionId),
  createdAt: v.number(),
  replyCount: v.number(),
  reported: v.boolean(),
});

export const forumThreadDetail = v.object({
  threadId: v.id("forumThreads"),
  kind: forumThreadKind,
  title: v.string(),
  body: v.string(),
  authorName: v.string(),
  authorUnit: v.string(),
  criterionId: v.optional(criterionId),
  createdAt: v.number(),
  reported: v.boolean(),
  // Set only for a hidden thread, which `getThread` returns to the "hr" role alone.
  hidden: v.optional(v.boolean()),
});

export const forumReplyRow = v.object({
  replyId: v.id("forumReplies"),
  body: v.string(),
  authorName: v.string(),
  createdAt: v.number(),
});

// Access: all roles. Newest first.
export const listThreadsContract = {
  args: {
    actor: demoActor,
    kind: v.optional(forumThreadKind),
    criterionId: v.optional(criterionId),
  },
  returns: v.array(forumThreadRow),
};

// Access: all roles. Replies oldest first. `null` when the thread does not exist.
export const getThreadContract = {
  args: { actor: demoActor, threadId: v.id("forumThreads") },
  returns: v.union(
    v.object({
      thread: forumThreadDetail,
      replies: v.array(forumReplyRow),
    }),
    v.null(),
  ),
};

// Access: all roles. The author is the resolved actor.
export const createThreadContract = {
  args: {
    actor: demoActor,
    kind: forumThreadKind,
    title: v.string(),
    body: v.string(),
    criterionId: v.optional(criterionId),
  },
  returns: v.id("forumThreads"),
};

// Access: all roles. Increments `replyCount` in the same mutation.
export const replyContract = {
  args: { actor: demoActor, threadId: v.id("forumThreads"), body: v.string() },
  returns: v.id("forumReplies"),
};

// Access: all roles. Sets `reportedAt`; reporting twice is a no-op.
export const reportContract = {
  args: { actor: demoActor, threadId: v.id("forumThreads") },
  returns: v.null(),
};

// Moderation (#104). Backend: convex/forum/moderation.ts. Access: only the "hr" role; others get
// ConvexError({ code: "denied", message }). A hidden thread stays in the database but drops out of
// `listThreads` for every role and out of `getThread` for every role except "hr".

export const forumModerationRow = v.object({
  threadId: v.id("forumThreads"),
  kind: forumThreadKind,
  title: v.string(),
  excerpt: v.string(),
  authorName: v.string(),
  authorUnit: v.string(),
  createdAt: v.number(),
  replyCount: v.number(),
  reportedAt: v.optional(v.number()),
  hiddenAt: v.optional(v.number()),
});

// Access: hr. Threads that are reported or hidden; the oldest report (or hiding) first.
export const listReportedThreadsContract = {
  args: { actor: demoActor },
  returns: v.array(forumModerationRow),
};

// Access: hr. Sets `hiddenAt`; hiding twice keeps the first time.
export const hideThreadContract = {
  args: { actor: demoActor, threadId: v.id("forumThreads") },
  returns: v.null(),
};

// Access: hr. Clears `hiddenAt`; restoring a visible thread is a no-op.
export const restoreThreadContract = {
  args: { actor: demoActor, threadId: v.id("forumThreads") },
  returns: v.null(),
};

// Access: hr. Clears `reportedAt`; the thread stays as it is otherwise.
export const dismissReportContract = {
  args: { actor: demoActor, threadId: v.id("forumThreads") },
  returns: v.null(),
};

export type ForumThreadRow = Infer<typeof forumThreadRow>;
export type ForumModerationRow = Infer<typeof forumModerationRow>;
export type ForumThreadDetail = Infer<typeof forumThreadDetail>;
export type ForumReplyRow = Infer<typeof forumReplyRow>;
