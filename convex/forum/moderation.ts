import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx } from "../_generated/server";
import { logAudit } from "../audit/log";
import {
  dismissReportContract,
  hideThreadContract,
  listReportedThreadsContract,
  restoreThreadContract,
} from "../lib/contracts/forum";
import type { DemoActor } from "../lib/demoRole";
import { requireModerator } from "./moderationAccess";
import { authorsOf, UNKNOWN_AUTHOR } from "./queries";
import { excerptOf } from "./validation";

const NO_THREAD = "Nie znaleziono wątku.";

type Patch = Partial<Pick<Doc<"forumThreads">, "hiddenAt" | "reportedAt">>;

// Applies `change` only when it returns a patch, so repeating an action is a no-op without a
// second audit entry.
async function moderate(
  ctx: MutationCtx,
  actor: DemoActor,
  threadId: Id<"forumThreads">,
  action: "hide" | "restore" | "dismiss_report",
  change: (thread: Doc<"forumThreads">, now: number) => Patch | null,
) {
  const moderator = await requireModerator(ctx, actor);
  const thread = await ctx.db.get(threadId);
  if (!thread) throw new ConvexError(NO_THREAD);
  const now = Date.now();
  const patch = change(thread, now);
  if (!patch) return null;
  await ctx.db.patch(threadId, {
    ...patch,
    moderatedById: moderator.employee?._id,
    moderatedAt: now,
  });
  await logAudit(ctx, {
    actor: moderator,
    action: "update",
    entity: "forumThreads",
    entityId: threadId,
    details: `moderation:${action}`,
  });
  return null;
}

// Reported or hidden threads, the oldest report (or hiding, when not reported) first.
export const listReportedThreads = query({
  ...listReportedThreadsContract,
  handler: async (ctx, { actor }) => {
    await requireModerator(ctx, actor);
    const since = (t: Doc<"forumThreads">) =>
      t.reportedAt ?? t.hiddenAt ?? t.createdAt;
    const threads = (await ctx.db.query("forumThreads").collect())
      .filter((t) => t.reportedAt !== undefined || t.hiddenAt !== undefined)
      .sort((a, b) => since(a) - since(b) || a._creationTime - b._creationTime);
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
        createdAt: t.createdAt,
        replyCount: t.replyCount,
        reportedAt: t.reportedAt,
        hiddenAt: t.hiddenAt,
      };
    });
  },
});

export const hideThread = mutation({
  ...hideThreadContract,
  handler: (ctx, { actor, threadId }) =>
    moderate(ctx, actor, threadId, "hide", (thread, now) =>
      thread.hiddenAt === undefined ? { hiddenAt: now } : null,
    ),
});

export const restoreThread = mutation({
  ...restoreThreadContract,
  handler: (ctx, { actor, threadId }) =>
    moderate(ctx, actor, threadId, "restore", (thread) =>
      thread.hiddenAt !== undefined ? { hiddenAt: undefined } : null,
    ),
});

export const dismissReport = mutation({
  ...dismissReportContract,
  handler: (ctx, { actor, threadId }) =>
    moderate(ctx, actor, threadId, "dismiss_report", (thread) =>
      thread.reportedAt !== undefined ? { reportedAt: undefined } : null,
    ),
});
