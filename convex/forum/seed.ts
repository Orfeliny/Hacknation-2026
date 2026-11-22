import { internalMutation } from "../_generated/server";
import { SEED_THREADS } from "./seedData";

const DAY = 24 * 60 * 60 * 1000;

// Demo threads written by the demo employees (run employees/seed:run first). Idempotent: a thread
// whose title is already stored is skipped, and a thread whose author is missing is left out.
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const byLastName = new Map(
      (await ctx.db.query("employees").collect()).map((e) => [e.lastName, e]),
    );
    const titles = new Set(
      (await ctx.db.query("forumThreads").collect()).map((t) => t.title),
    );
    const now = Date.now();
    let inserted = 0;
    for (const seed of SEED_THREADS) {
      const author = byLastName.get(seed.author);
      if (!author || titles.has(seed.title)) continue;
      const replies = seed.replies.flatMap((r) => {
        const replyAuthor = byLastName.get(r.author);
        return replyAuthor ? [{ ...r, authorId: replyAuthor._id }] : [];
      });
      const threadId = await ctx.db.insert("forumThreads", {
        kind: seed.kind,
        title: seed.title,
        body: seed.body,
        authorId: author._id,
        criterionId: seed.criterionId,
        createdAt: now - seed.daysAgo * DAY,
        replyCount: replies.length,
      });
      for (const r of replies) {
        await ctx.db.insert("forumReplies", {
          threadId,
          body: r.body,
          authorId: r.authorId,
          createdAt: now - r.daysAgo * DAY,
        });
      }
      inserted += 1;
    }
    return { inserted, total: SEED_THREADS.length };
  },
});
