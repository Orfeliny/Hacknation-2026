import { ConvexError } from "convex/values";
import { mutation } from "../_generated/server";
import {
  createThreadContract,
  replyContract,
  reportContract,
} from "../lib/contracts/forum";
import { requireMember } from "./access";
import { parseReplyInput, parseThreadInput } from "./validation";

const NO_THREAD = "Nie znaleziono wątku.";

// The author is the resolved actor.
export const createThread = mutation({
  ...createThreadContract,
  handler: async (ctx, { actor, kind, title, body, criterionId }) => {
    const author = await requireMember(ctx, actor);
    const input = parseThreadInput({ title, body });
    return await ctx.db.insert("forumThreads", {
      kind,
      title: input.title,
      body: input.body,
      authorId: author._id,
      criterionId,
      createdAt: Date.now(),
      replyCount: 0,
    });
  },
});

// Inserts the reply and increments `replyCount` in the same mutation.
export const reply = mutation({
  ...replyContract,
  handler: async (ctx, { actor, threadId, body }) => {
    const author = await requireMember(ctx, actor);
    const input = parseReplyInput({ body });
    const thread = await ctx.db.get(threadId);
    if (!thread) throw new ConvexError(NO_THREAD);
    const replyId = await ctx.db.insert("forumReplies", {
      threadId,
      body: input.body,
      authorId: author._id,
      createdAt: Date.now(),
    });
    await ctx.db.patch(threadId, { replyCount: thread.replyCount + 1 });
    return replyId;
  },
});

// Sets `reportedAt` once; reporting twice keeps the first time and succeeds.
export const report = mutation({
  ...reportContract,
  handler: async (ctx, { actor, threadId }) => {
    await requireMember(ctx, actor);
    const thread = await ctx.db.get(threadId);
    if (!thread) throw new ConvexError(NO_THREAD);
    if (thread.reportedAt === undefined) {
      await ctx.db.patch(threadId, { reportedAt: Date.now() });
    }
    return null;
  },
});
