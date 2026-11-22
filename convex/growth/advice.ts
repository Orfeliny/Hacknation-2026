import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import {
  ADVICE_LIMITS,
  getAdviceContract,
  listAdviceContract,
} from "../lib/contracts/advice";
import type { AdviceAudience } from "./constants";
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

// An article stored without an audience is written for supervisors. "wszyscy" reaches every audience.
function reaches(row: Doc<"adviceArticles">, audience: AdviceAudience) {
  const own = row.audience ?? "przelozony";
  return own === "wszyscy" || own === audience;
}

// The list carries no `sections`. `topic`, `audience` and `search` (title and summary, ignoring case and
// diacritics) are combined with AND. Sorted by title.
export const listAdvice = query({
  ...listAdviceContract,
  handler: async (ctx, { topic, audience, search }) => {
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
          (audience === undefined || reaches(row, audience)) &&
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
