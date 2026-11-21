import { v } from "convex/values";
import { query } from "../_generated/server";
import { criterionId } from "../lib/validators";
import { adviceTopic } from "./constants";
import { matchesSearch } from "./optionsSearch";

// Open to every role; articles hold no personal data. Only published articles are returned.

// The list carries no `sections`, so it stays light. Filters are combined with AND; sorted by title.
export const listAdvice = query({
  args: {
    topic: v.optional(adviceTopic),
    criterionId: v.optional(criterionId),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("adviceArticles").collect();
    return rows
      .filter(
        (row) =>
          row.published &&
          (args.topic === undefined || row.topic === args.topic) &&
          (args.criterionId === undefined ||
            (row.criterionIds ?? []).includes(args.criterionId)) &&
          matchesSearch([row.title, row.summary], args.search ?? ""),
      )
      .sort((a, b) => a.title.localeCompare(b.title, "pl"))
      .map((row) => ({
        _id: row._id,
        slug: row.slug,
        title: row.title,
        summary: row.summary,
        topic: row.topic,
        criterionIds: row.criterionIds ?? [],
        readingMinutes: row.readingMinutes,
        source: row.source,
        sourceRef: row.sourceRef,
      }));
  },
});

// One whole article, or null when it does not exist or is not published.
export const getAdvice = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const row = await ctx.db
      .query("adviceArticles")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    return row?.published ? row : null;
  },
});
