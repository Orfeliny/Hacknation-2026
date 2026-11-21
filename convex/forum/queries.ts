import type { Doc } from "../_generated/dataModel";
import { query, type QueryCtx } from "../_generated/server";
import { fullName } from "../employees/access";
import { getThreadContract, listThreadsContract } from "../lib/contracts/forum";
import { requireMember } from "./access";
import { excerptOf } from "./validation";

const UNKNOWN_AUTHOR = { name: "Nieznany autor", unit: "" };

async function authorsOf(
  ctx: Pick<QueryCtx, "db">,
  ids: Doc<"employees">["_id"][],
) {
  const authors = new Map<string, { name: string; unit: string }>();
  for (const id of new Set(ids)) {
    const employee = await ctx.db.get(id);
    authors.set(
      id,
      employee
        ? { name: fullName(employee), unit: employee.unit }
        : UNKNOWN_AUTHOR,
    );
  }
  return authors;
}

// Newest first. `kind` and `criterionId` are combined with AND.
export const listThreads = query({
  ...listThreadsContract,
  handler: async (ctx, { actor, kind, criterionId }) => {
    await requireMember(ctx, actor);
    const threads = (await ctx.db.query("forumThreads").collect())
      .filter(
        (t) =>
          (kind === undefined || t.kind === kind) &&
          (criterionId === undefined || t.criterionId === criterionId),
      )
      .sort(
        (a, b) =>
          b.createdAt - a.createdAt || b._creationTime - a._creationTime,
      );
    const authors = await authorsOf(
      ctx,
      threads.map((t) => t.authorId),
    );
    return threads.map((t) => {
      const author = authors.get(t.authorId) ?? UNKNOWN_AUTHOR;
      return {
        threadId: t._id,
        kind: t.kind,
        title: t.title,
        excerpt: excerptOf(t.body),
        authorName: author.name,
        authorUnit: author.unit,
        criterionId: t.criterionId,
        createdAt: t.createdAt,
        replyCount: t.replyCount,
        reported: t.reportedAt !== undefined,
      };
    });
  },
});

// Replies oldest first. `null` when the thread does not exist.
export const getThread = query({
  ...getThreadContract,
  handler: async (ctx, { actor, threadId }) => {
    await requireMember(ctx, actor);
    const thread = await ctx.db.get(threadId);
    if (!thread) return null;
    const replies = (
      await ctx.db
        .query("forumReplies")
        .withIndex("by_thread", (q) => q.eq("threadId", threadId))
        .collect()
    ).sort(
      (a, b) => a.createdAt - b.createdAt || a._creationTime - b._creationTime,
    );
    const authors = await authorsOf(ctx, [
      thread.authorId,
      ...replies.map((r) => r.authorId),
    ]);
    const author = authors.get(thread.authorId) ?? UNKNOWN_AUTHOR;
    return {
      thread: {
        threadId: thread._id,
        kind: thread.kind,
        title: thread.title,
        body: thread.body,
        authorName: author.name,
        authorUnit: author.unit,
        criterionId: thread.criterionId,
        createdAt: thread.createdAt,
        reported: thread.reportedAt !== undefined,
      },
      replies: replies.map((r) => ({
        replyId: r._id,
        body: r.body,
        authorName: (authors.get(r.authorId) ?? UNKNOWN_AUTHOR).name,
        createdAt: r.createdAt,
      })),
    };
  },
});
