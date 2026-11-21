import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import {
  ADVICE_LIMITS,
  getAdviceContract,
  listAdviceContract,
} from "../lib/contracts/advice";
import { matchesSearch } from "./optionsSearch";

// Public: every role and anonymous callers. Only published articles; entries hold no personal data.

function listItem(row: Doc<"adviceArticles">) {
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    topic: row.topic,
    readingMinutes: row.readingMinutes,
    sourceRef: row.sourceRef,
    isDemo: row.source === "demo",
  };
}

// The list carries no `sections`. `topic` and `search` (title and summary, ignoring case and
// diacritics) are combined with AND. Sorted by title.
export const listAdvice = query({
  ...listAdviceContract,
  handler: async (ctx, { topic, search }) => {
    if (search !== undefined && search.length > ADVICE_LIMITS.search) {
      throw new ConvexError(
        `Szukana fraza może mieć najwyżej ${ADVICE_LIMITS.search} znaków.`,
      );
    }
    const rows = await ctx.db.query("adviceArticles").collect();
    return rows
      .filter(
        (row) =>
          row.published &&
          (topic === undefined || row.topic === topic) &&
          matchesSearch([row.title, row.summary], search ?? ""),
      )
      .sort(
        (a, b) =>
          a.title.localeCompare(b.title, "pl") || a.slug.localeCompare(b.slug),
      )
      .map(listItem);
  },
});

// One whole article, or null when the slug is unknown, too long to exist or the article is not published.
export const getAdvice = query({
  ...getAdviceContract,
  handler: async (ctx, { slug }) => {
    if (slug.length > ADVICE_LIMITS.slug) return null;
    const row = await ctx.db
      .query("adviceArticles")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!row?.published) return null;
    return { ...listItem(row), sections: row.sections };
  },
});
